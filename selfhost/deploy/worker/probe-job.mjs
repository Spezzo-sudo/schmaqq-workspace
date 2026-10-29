/** Runs as a job through the launcher (installation check). Proves what project
 * code sees: only its own copy, no worker configuration or token, no other
 * copies, no direct network, no launcher; Studio only through the proxy. */
import {readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import net from 'node:net';
import dns from 'node:dns/promises';
import os from 'node:os';
import path from 'node:path';

const own=process.cwd(),results=[];
const check=async(label,expectAllowed,attempt)=>{
 let allowed=true,detail='';
 try{const v=await attempt();detail=v===undefined?'':String(v).slice(0,80);}catch(e){allowed=false;detail=e.code??e.message.slice(0,80);}
 results.push({label,ok:allowed===expectAllowed,expected:expectAllowed?'allowed':'blocked',actual:allowed?'allowed':'blocked',detail});
};
const connect=(host,port)=>new Promise((resolve,reject)=>{const s=net.connect({host,port,timeout:3000},()=>{s.destroy();resolve('connected');});s.on('timeout',()=>{s.destroy();reject(Object.assign(new Error('timeout'),{code:'TIMEOUT'}));});s.on('error',reject);});

await check('Runs as the separate job user',true,()=>{const name=os.userInfo().username;if(name!=='schmaqq-job')throw new Error(name);return name;});
await check('Write own copy',true,()=>{writeFileSync(own+'/.job-probe','x');rmSync(own+'/.job-probe');});
await check('Read worker configuration and token',false,()=>readFileSync('/etc/schmaqq-worker/runner.json'));
await check('Read launcher key',false,()=>readFileSync('/etc/schmaqq-worker/launcher.key'));
await check('See other copies',false,()=>{const others=readdirSync(path.dirname(own)).filter(n=>n!==path.basename(own));if(!others.length)throw new Error('only own copy');return others.join(',');});
await check('See runner state and repositories',false,()=>readdirSync('/var/lib/schmaqq-worker/repos'));
await check('Connect job launcher',false,()=>connect('127.0.0.62',3129));
await check('Connect internet directly',false,()=>connect('1.1.1.1',443));
await check('Resolve DNS directly',false,async()=>(await dns.lookup('studio.schmaqq.com')).address);
await check('Reach Studio via proxy',true,async()=>{const r=await fetch('https://studio.schmaqq.com/healthz',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('status '+r.status);return r.status;});

for(const r of results)console.log(`${r.ok?'PASS':'FAIL'} | job: ${r.label} | expected ${r.expected}, ${r.actual}${r.detail?' | '+r.detail:''}`);
const failed=results.filter(r=>!r.ok).length;console.log(JSON.stringify({jobChecks:results.length,failed}));
process.exitCode=failed?1:0;
