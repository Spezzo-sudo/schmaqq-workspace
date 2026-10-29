import http from 'node:http';
import {readFileSync} from 'node:fs';

/** Client for the server worker's job launcher. Project code (tests, preview
 * builds) then runs as a separate user that sees only this one copy. Same
 * contract as command(): resolves with the bounded output on exit code 0,
 * rejects with the output otherwise; aborting closes the request, which makes
 * the launcher stop the job.
 */
function launcherTarget({url,keyFile}){
 const target=new URL(url);
 if(target.protocol!=='http:'||!['127.0.0.1','127.0.0.62','localhost'].includes(target.hostname))throw new Error('Job launcher must be a local address.');
 return {target,key:readFileSync(keyFile,'utf8').trim()};
}
/** Start (or replace) the live preview of a copy: the app runs isolated like a job,
 * listens on the launcher's live address and stops by itself after ttlSeconds. */
export function launcherServe(launcher,argv,cwd,{port,ttlSeconds=1800,timeout=120000}={}){
 const {target,key}=launcherTarget(launcher);
 return new Promise((resolve,reject)=>{
  const req=http.request({hostname:target.hostname,port:target.port,path:'/serve',method:'POST',agent:new http.Agent(),timeout,headers:{'Content-Type':'application/json',Authorization:'Bearer '+key}},res=>{
   let text='';res.setEncoding('utf8');res.on('data',d=>text+=d);
   res.on('end',()=>{let body;try{body=JSON.parse(text);}catch{body={};}
    if(res.statusCode===200)resolve(body);else reject(new Error('Live-Vorschau startet nicht: '+(body.error??res.statusCode)+(body.output?'\n'+body.output:'')));});
  });
  req.on('timeout',()=>req.destroy(new Error('Zeitlimit beim Start der Live-Vorschau.')));
  req.on('error',e=>reject(new Error('Job-Starter nicht erreichbar: '+e.message)));
  req.end(JSON.stringify({dir:cwd,argv,port,ttlSeconds}));
 });
}
export function launcherCommand(launcher,argv,cwd,{timeout=600000,signal,onOutput}={}){
 const {target,key}=launcherTarget(launcher);
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  let output='',buffer='',exit=null,settled=false;
  const finish=(fn,value)=>{if(!settled){settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);fn(value);}};
  // The agent setting keeps the local launcher out of any configured HTTP proxy.
  const req=http.request({hostname:target.hostname,port:target.port,path:'/run',method:'POST',agent:new http.Agent(),headers:{'Content-Type':'application/json',Authorization:'Bearer '+key}},res=>{
   if(res.statusCode!==200){let text='';res.on('data',d=>text+=d);res.on('end',()=>finish(reject,new Error('Job-Starter lehnt ab ('+res.statusCode+'): '+text.slice(0,200))));return;}
   res.setEncoding('utf8');
   res.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let event;try{event=JSON.parse(line);}catch{continue;}
    if(event.type==='output'){output=(output+event.text).slice(-60000);onOutput?.(event.text);}if(event.type==='exit')exit=event;}});
   res.on('end',()=>{
    if(signal?.aborted)return;
    if(exit?.code===0)finish(resolve,output.trim());
    else finish(reject,new Error((exit?`Befehl fehlgeschlagen (${exit.code}). `:'Verbindung zum Job-Starter abgebrochen. ')+output));
   });
  });
  const abort=()=>{req.destroy();const e=new Error('Auftrag abgebrochen. Bereits geschriebene Änderungen bleiben in der Arbeitskopie.');e.name='AbortError';finish(reject,e);};
  const timer=setTimeout(()=>{req.destroy();finish(reject,new Error('Zeitlimit erreicht. '+output));},timeout+5000);
  signal?.addEventListener('abort',abort,{once:true});
  req.on('error',e=>finish(reject,new Error('Job-Starter nicht erreichbar: '+e.message)));
  req.end(JSON.stringify({dir:cwd,argv,timeoutMs:timeout}));
 });
}
