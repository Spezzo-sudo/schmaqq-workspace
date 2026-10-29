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
import {spawn} from 'node:child_process';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {readFileSync,realpathSync,existsSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

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

/** systemd-run arguments: fixed sandbox, only the copy is visible and writable. */
export function jobUnitArgs({unit,dir,argv,timeoutMs}){
 const seconds=Math.max(1,Math.min(Math.ceil(timeoutMs/1000),3600));
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
  'RestrictAddressFamilies=AF_INET AF_INET6','IPAddressDeny=any','IPAddressAllow=127.0.0.60/32',
  'MemoryMax=2G','MemorySwapMax=0','CPUQuota=150%','TasksMax=256',`RuntimeMaxSec=${seconds}`
 ];
 const env=[`HOME=/tmp`,`PATH=${NODE_DIR}:/usr/bin:/bin`,'NODE_ENV=production',`HTTPS_PROXY=${PROXY}`,`HTTP_PROXY=${PROXY}`,`https_proxy=${PROXY}`,`http_proxy=${PROXY}`,'NODE_USE_ENV_PROXY=1','npm_config_cache=/tmp/.npm'];
 return ['--wait','--pipe','--quiet','--collect',`--unit=${unit}`,...p.flatMap(x=>['-p',x]),...env.flatMap(x=>['-E',x]),`--working-directory=${dir}`,'--',...argv];
}

export function createJobLauncher({root,key,run=(file,args)=>spawn(file,args,{stdio:['ignore','pipe','pipe']}),
 prepare=dir=>new Promise((resolve,reject)=>{
  // Group access for the job user; no symlink is followed (-P is chgrp's default with -R).
  const step=(cmd,args,next)=>{const c=spawn(cmd,args,{stdio:'ignore'});c.on('error',reject);c.on('close',code=>code===0?next():reject(new Error(cmd+' failed')));};
  step('chgrp',['-R',JOB_GROUP,dir],()=>step('chmod',['-R','g+rwX',dir],resolve));
 }),
 stop=unit=>spawn('systemctl',['stop',unit],{stdio:'ignore'}),maxBody=200000,log=m=>console.error(m)}={}){
 if(typeof key!=='string'||key.length<32)throw new Error('Launcher key missing.');
 const expected=Buffer.from(key);
 let busy=false;
 return http.createServer(async(req,res)=>{
  const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
  try{
   const given=Buffer.from(String(req.headers.authorization??'').replace(/^Bearer /,''));
   if(given.length!==expected.length||!timingSafeEqual(given,expected))throw fail(401,'unauthorized');
   if(req.method!=='POST'||req.url!=='/run')throw fail(404,'not found');
   let size=0;const parts=[];for await(const part of req){size+=part.length;if(size>maxBody)throw fail(413,'too large');parts.push(part);}
   let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw fail(400,'invalid json');}
   const dir=checkJobDirectory(root,body.dir),argv=checkArgv(body.argv);
   const timeoutMs=Number.isInteger(body.timeoutMs)?Math.min(Math.max(body.timeoutMs,1000),3600000):600000;
   // The worker runs one job at a time; refusing parallel requests keeps that true here.
   if(busy)throw fail(409,'another job is running');
   busy=true;
   const unit='schmaqq-job-'+randomBytes(8).toString('hex');
   try{await prepare(dir);}catch(e){busy=false;throw fail(500,'could not prepare copy');}
   res.writeHead(200,{'Content-Type':'application/x-ndjson'});
   const child=run('systemd-run',jobUnitArgs({unit,dir,argv,timeoutMs}));
   const send=obj=>{if(!res.writableEnded)res.write(JSON.stringify(obj)+'\n');};
   child.stdout.on('data',d=>send({type:'output',text:String(d)}));child.stderr.on('data',d=>send({type:'output',text:String(d)}));
   let finished=false;
   const end=(code,error)=>{if(finished)return;finished=true;busy=false;send({type:'exit',code,...(error?{error}:{})});res.end();};
   child.on('error',e=>end(-1,e.message));child.on('close',code=>end(code??-1));
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
