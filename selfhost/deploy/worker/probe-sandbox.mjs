/** Runs inside schmaqq-studio-worker-probe.service, which carries exactly the
 * worker's sandbox settings. Every check states what a job must NOT be able to
 * do (or must be able to do) and fails the unit if the expectation is wrong.
 */
import {readFileSync,writeFileSync,readdirSync,statSync,statfsSync,rmSync} from 'node:fs';
import net from 'node:net';
import dns from 'node:dns/promises';

const results=[];
const check=async(label,expectAllowed,attempt)=>{
 let allowed=true,detail='';
 try{const value=await attempt();detail=value===undefined?'':String(value).slice(0,80);}catch(e){allowed=false;detail=e.code??e.message.slice(0,80);}
 results.push({label,expected:expectAllowed?'allowed':'blocked',actual:allowed?'allowed':'blocked',ok:allowed===expectAllowed,detail});
};
const connect=(host,port)=>new Promise((resolve,reject)=>{const s=net.connect({host,port,timeout:3000},()=>{s.destroy();resolve('connected');});s.on('timeout',()=>{s.destroy();reject(Object.assign(new Error('timeout'),{code:'TIMEOUT'}));});s.on('error',reject);});

await check('Runs without root',true,()=>{if(process.getuid()===0)throw new Error('root');return 'uid '+process.getuid();});
await check('No docker group',true,()=>{const groups=process.getgroups();if(groups.length>1)throw new Error('groups '+groups);return 'gid '+groups;});
await check('Write worker volume',true,()=>{writeFileSync('/var/lib/schmaqq-worker/.probe','x');rmSync('/var/lib/schmaqq-worker/.probe');});
await check('Write system files',false,()=>writeFileSync('/usr/local/lib/schmaqq-worker/.probe','x'));
await check('Write /etc',false,()=>writeFileSync('/etc/.schmaqq-probe','x'));
await check('Read Studio database',false,()=>readFileSync('/var/lib/schmaqq-studio/studio.sqlite'));
await check('Read Studio secrets',false,()=>readFileSync('/etc/schmaqq-studio.env'));
await check('See other services in /opt',false,()=>{const entries=readdirSync('/opt');if(!entries.length)throw new Error('empty');return entries.join(',');});
await check('See /srv',false,()=>{const entries=readdirSync('/srv');if(!entries.length)throw new Error('empty');return entries.join(',');});
await check('Reach docker socket',false,()=>statSync('/var/run/docker.sock'));
await check('Read /root',false,()=>readdirSync('/root'));
await check('Connect Studio port on loopback',false,()=>connect('127.0.0.1',4310));
await check('Connect other loopback service (SSH)',false,()=>connect('127.0.0.1',22));
await check('Connect docker bridge',false,()=>connect('172.17.0.1',80));
await check('Connect cloud metadata address',false,()=>connect('169.254.169.254',80));
await check('Resolve public DNS',true,async()=>(await dns.lookup('studio.schmaqq.com')).address);
await check('Reach Studio over HTTPS',true,async()=>{const r=await fetch('https://studio.schmaqq.com/healthz',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('status '+r.status);return r.status;});
await check('Memory limit applied',true,()=>{const v=readFileSync('/sys/fs/cgroup/memory.max','utf8').trim();if(v==='max')throw new Error('unlimited');return Math.round(Number(v)/1048576)+' MB';});
await check('Process limit applied',true,()=>{const v=readFileSync('/sys/fs/cgroup/pids.max','utf8').trim();if(v==='max')throw new Error('unlimited');return v;});
await check('CPU quota applied',true,()=>{const v=readFileSync('/sys/fs/cgroup/cpu.max','utf8').trim();if(v.startsWith('max'))throw new Error('unlimited');return v;});
await check('Worker volume is size-limited',true,()=>{const s=statfsSync('/var/lib/schmaqq-worker'),total=s.blocks*s.bsize;if(total>5*1024**3)throw new Error('volume too large: '+total);return Math.round(total/1048576)+' MB total, '+Math.round(s.bavail*s.bsize/1048576)+' MB free';});

for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} | ${r.label} | expected ${r.expected}, ${r.actual}${r.detail?' | '+r.detail:''}`);
const failed=results.filter(r=>!r.ok).length;
console.log(JSON.stringify({checks:results.length,failed}));
process.exitCode=failed?1:0;
