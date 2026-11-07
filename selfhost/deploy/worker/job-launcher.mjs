/** Job launcher for the server worker (stage 1: isolation per job).
 * Runs as root, reachable only from the worker on loopback and only with the
 * launcher key (readable by the worker account, not by jobs). For each request
 * it starts exactly one transient systemd unit as the separate user
 * `schmaqq-job` that sees only the one working copy it works in: the worker
 * configuration, its device token, other copies and the runner state are not
 * mounted. Callers choose the copy and the command, never the user or the
 * sandbox. Output is streamed back as NDJSON; closing the request stops the job.
 */
import http from 'node:http';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync,realpathSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {findPrograms} from '../../project-plan.mjs';

export const JOB_USER='schmaqq-job',JOB_GROUP='schmaqq-jobs';
const NODE_DIR='/usr/local/lib/schmaqq-worker/node/bin';
const PROXY='http://127.0.0.60:3128';
const fail=(status,message)=>Object.assign(new Error(message),{status});

/** The copy must be a direct child of the worktrees root (after resolving links). */
export function checkJobDirectory(root,dir){
 if(typeof dir!=='string'||!path.isAbsolute(dir)||dir.length>400)throw fail(400,'invalid directory');
 let real;try{real=realpathSync(dir);}catch{throw fail(404,'directory missing');}
 const base=realpathSync(root);
 if(path.dirname(real)!==base||!/^[\w.-]{1,160}$/.test(path.basename(real))||!statSync(real).isDirectory())throw fail(403,'directory outside the job area');
 return real;
}
export function checkArgv(argv,exists=existsSync){
 if(!Array.isArray(argv)||!argv.length||argv.length>30||!argv.every(a=>typeof a==='string'&&a.length<=4096&&!a.includes('\0')))throw fail(400,'invalid command');
 // systemd does not search the job's PATH; resolve bare program names in the job's PATH order.
 if(path.isAbsolute(argv[0]))return argv;
 if(!/^[\w.+-]{1,100}$/.test(argv[0]))throw fail(400,'invalid program');
 const found=[NODE_DIR,'/usr/bin','/bin'].map(d=>d+'/'+argv[0]).find(p=>exists(p));
 if(!found)throw fail(400,'program not found: '+argv[0]);
 return [found,...argv.slice(1)];
}

/** Live previews: the app listens on LIVE_HOST; only LIVE_SOURCE (used by Studio's
 * preview proxy and the readiness check) may connect. Nothing listens on LIVE_SOURCE,
 * so the app cannot reach any local service from there. */
export const LIVE_HOST='127.0.0.70',LIVE_SOURCE='127.0.0.71';

/** systemd-run arguments: fixed sandbox, only the copy is visible and writable.
 * With `serve`, the unit keeps running (no --wait) as a live preview on LIVE_HOST:port.
 * network 'private' (tests, builds): an own network namespace with only its own loopback,
 * so test servers on 127.0.0.1 work while Studio, the proxy and the internet stay unreachable. */
export function jobUnitArgs({unit,dir,argv,timeoutMs,serve,network='proxy'}){
 const seconds=Math.max(1,Math.min(Math.ceil(timeoutMs/1000),3600));
 const isolated=network==='private'&&!serve;
 const net=isolated?['PrivateNetwork=yes']:['IPAddressDeny=any',serve?`IPAddressAllow=127.0.0.60/32 ${LIVE_SOURCE}/32`:'IPAddressAllow=127.0.0.60/32'];
 const p=[
  `User=${JOB_USER}`,`Group=${JOB_GROUP}`,'UMask=0002',
  'NoNewPrivileges=yes','CapabilityBoundingSet=','RestrictSUIDSGID=yes','LockPersonality=yes','RestrictRealtime=yes','RestrictNamespaces=yes',
  'SystemCallArchitectures=native','SystemCallFilter=@system-service',
  'ProtectSystem=strict','ProtectHome=yes','PrivateTmp=yes','PrivateDevices=yes','ProtectKernelTunables=yes','ProtectKernelModules=yes',
  'ProtectKernelLogs=yes','ProtectControlGroups=yes','ProtectClock=yes','ProtectHostname=yes','ProtectProc=invisible',
  // Everything below /var/lib (including all worker data) and /etc/schmaqq-worker is replaced by empty
  // read-only tmpfs; then only this one copy is bound back in, writable.
  'TemporaryFileSystem=/opt:ro /srv:ro /var/lib:ro /var/backups:ro /mnt:ro /media:ro /run:ro /etc/schmaqq-worker:ro',
  `BindPaths=${dir}`,`ReadWritePaths=${dir}`,
  'RestrictAddressFamilies=AF_INET AF_INET6',...net,
  'MemoryMax=2G','MemorySwapMax=0','CPUQuota=150%','TasksMax=256',`RuntimeMaxSec=${seconds}`
 ];
 const proxy=isolated?['NO_PROXY=*']:[`HTTPS_PROXY=${PROXY}`,`HTTP_PROXY=${PROXY}`,`https_proxy=${PROXY}`,`http_proxy=${PROXY}`,'NODE_USE_ENV_PROXY=1'];
 const env=[`HOME=/tmp`,`PATH=${NODE_DIR}:/usr/bin:/bin`,'NODE_ENV=production',...proxy,'npm_config_cache=/tmp/.npm',
  ...(serve?[`HOST=${LIVE_HOST}`,`PORT=${serve.port}`,`NO_PROXY=${LIVE_HOST}`]:[])];
 return [...(serve?['--quiet','--collect']:['--wait','--pipe','--quiet','--collect']),`--unit=${unit}`,...p.flatMap(x=>['-p',x]),...env.flatMap(x=>['-E',x]),`--working-directory=${dir}`,'--',...argv];
}
const waitForPort=(port,ms,alive)=>new Promise(resolve=>{
 const until=Date.now()+ms;
 const attempt=()=>{const s=net.connect({host:LIVE_HOST,port,localAddress:LIVE_SOURCE});
  s.once('connect',()=>{s.destroy();resolve(true);});
  s.once('error',async()=>{s.destroy();if(Date.now()>until||!(await alive()))return resolve(false);setTimeout(attempt,500);});};
 attempt();
});

export function createJobLauncher({root,key,run=(file,args)=>spawn(file,args,{stdio:['ignore','pipe','pipe']}),
 prepare=dir=>new Promise((resolve,reject)=>{
  // Group access for the job user; no symlink is followed (-P is chgrp's default with -R).
  const step=(cmd,args,next)=>{const c=spawn(cmd,args,{stdio:'ignore'});c.on('error',reject);c.on('close',code=>code===0?next():reject(new Error(cmd+' failed')));};
  step('chgrp',['-R',JOB_GROUP,dir],()=>step('chmod',['-R','g+rwX',dir],resolve));
 }),
 stop=unit=>spawn('systemctl',['stop',unit],{stdio:'ignore'}),
 isActive=unit=>new Promise(r=>{const c=spawn('systemctl',['is-active','--quiet',unit],{stdio:'ignore'});c.on('close',code=>r(code===0));c.on('error',()=>r(false));}),
 logs=unit=>new Promise(r=>{let out='';const c=spawn('journalctl',['-u',unit,'-n','15','-o','cat','--no-pager'],{stdio:['ignore','pipe','ignore']});c.stdout.on('data',d=>out+=d);c.on('close',()=>r(out.slice(-2000)));c.on('error',()=>r(''));}),
 // All live preview units, also those started before a launcher restart (it keeps no state on disk).
 stopAllLive=()=>new Promise(r=>{const c=spawn('systemctl',['stop','schmaqq-live-*.service'],{stdio:'ignore'});c.on('close',()=>r());c.on('error',()=>r());}),
 waitPort=waitForPort,readyMs=90000,maxBody=200000,log=m=>console.error(m)}={}){
 if(typeof key!=='string'||key.length<32)throw new Error('Launcher key missing.');
 const expected=Buffer.from(key);
 let busy=false,live=null;
 /** One live preview at a time: starting a new one stops the previous. */
 async function serve(dir,argv,port,ttlSeconds){
  // Otherwise an older app could still hold the port and answer instead of the new code.
  live=null;await stopAllLive();
  const unit='schmaqq-live-'+randomBytes(8).toString('hex');
  await prepare(dir);
  const started=await new Promise(resolve=>{const c=run('systemd-run',jobUnitArgs({unit,dir,argv,timeoutMs:ttlSeconds*1000,serve:{port}}));c.on('close',code=>resolve(code===0));c.on('error',()=>resolve(false));});
  if(!started)throw fail(502,'preview could not start');
  if(!(await waitPort(port,readyMs,()=>isActive(unit)))){const output=await logs(unit);stop(unit);throw Object.assign(fail(502,'preview did not answer on its port'),{output});}
  live={unit,port,expires:Date.now()+ttlSeconds*1000};
  return {unit,host:LIVE_HOST,port,expires:live.expires};
 }
 return http.createServer(async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
  try{
   const given=Buffer.from(String(req.headers.authorization??'').replace(/^Bearer /,''));
   if(given.length!==expected.length||!timingSafeEqual(given,expected))throw fail(401,'unauthorized');
   if(req.method!=='POST'||!['/run','/serve','/stop-serve','/programs'].includes(req.url))throw fail(404,'not found');
   let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>maxBody)throw fail(413,'too large');parts.push(part);}
   let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw fail(400,'invalid json');}
   if(req.url==='/programs'){
    let tools;try{tools=findPrograms(body.programs,{directories:[NODE_DIR,'/usr/bin','/bin'],platform:'linux'});}catch{throw fail(400,'invalid program names');}
    reply(200,{tools});return;
   }
   if(req.url==='/stop-serve'){live=null;await stopAllLive();reply(200,{ok:true});return;}
   if(req.url==='/serve'){
    const dir=checkJobDirectory(root,body.dir),argv=checkArgv(body.argv);
    if(!Number.isInteger(body.port)||body.port<1024||body.port>65535)throw fail(400,'invalid port');
    const ttl=Number.isInteger(body.ttlSeconds)?Math.min(Math.max(body.ttlSeconds,60),3600):1800;
    try{reply(200,await serve(dir,argv,body.port,ttl));}catch(e){if(e.output!==undefined){reply(e.status,{error:e.message,output:e.output});return;}throw e;}
    return;
   }
   const dir=checkJobDirectory(root,body.dir),argv=checkArgv(body.argv);
   const timeoutMs=Number.isInteger(body.timeoutMs)?Math.min(Math.max(body.timeoutMs,1000),3600000):600000;
   if(body.network!==undefined&&!['proxy','private'].includes(body.network))throw fail(400,'invalid network');
   // The worker runs one job at a time; refusing parallel requests keeps that true here.
   if(busy)throw fail(409,'another job is running');
   busy=true;
   const unit='schmaqq-job-'+randomBytes(8).toString('hex');
   try{await prepare(dir);}catch(e){busy=false;throw fail(500,'could not prepare copy');}
   res.writeHead(200,{'Content-Type':'application/x-ndjson'});
   const child=run('systemd-run',jobUnitArgs({unit,dir,argv,timeoutMs,network:body.network}));
   const send=obj=>{if(!res.writableEnded)res.write(JSON.stringify(obj)+'\n');};
   child.stdout.on('data',d=>send({type:'output',text:String(d)}));child.stderr.on('data',d=>send({type:'output',text:String(d)}));
   let finished=false;
   const end=(code,error)=>{if(finished)return;finished=true;busy=false;send({type:'exit',code,...(error?{error}:{})});res.end();};
   // Project builds may create owner-only output (for example via mkdtemp). Restore group
   // access before reporting the end, so the worker can read results such as a preview.
   const settle=(code,error)=>prepare(dir).catch(()=>log('could not restore group access: '+unit)).then(()=>end(code,error));
   child.on('error',e=>settle(-1,e.message));child.on('close',code=>settle(code??-1));
   // Caller gone (cancel, timeout on its side, worker restart): stop the job unit.
   res.on('close',()=>{if(!finished){stop(unit);log('job stopped: '+unit);}});
  }catch(e){if(!res.headersSent)reply(e.status??500,{error:e.status?e.message:'launcher error'});else res.end();if(e.status!==409)log('launcher refused: '+(e.message??'error'));}
 });
}

if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(path.resolve(process.argv[1]))===realpathSync(fileURLToPath(import.meta.url))){
 const key=readFileSync(process.env.LAUNCHER_KEY_FILE??'/etc/schmaqq-worker/launcher.key','utf8').trim();
 const [host,port]=(process.env.LAUNCHER_LISTEN??'127.0.0.62:3129').split(':');
 createJobLauncher({root:process.env.LAUNCHER_ROOT??'/var/lib/schmaqq-worker/state/worktrees',key}).listen(Number(port),host,()=>console.log(`job launcher on ${host}:${port}`));
}
