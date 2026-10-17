import {spawn} from 'node:child_process';
import {StringDecoder} from 'node:string_decoder';

// Only terminate the process tree created by this runner, never a shared shell.
function terminate(child){
 if(!child.pid)return;
 if(process.platform==='win32'){
  const killer=spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
  killer.on('error',()=>child.kill());
 }else{try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}
}
export async function command(argv,cwd,{input='',timeout=600000,env=process.env,signal,onStdout,onOutput}={}){
 if(!Array.isArray(argv)||!argv.length||!argv.every(x=>typeof x==='string'))throw new Error('Lokaler Befehl muss ein Argument-Array sein.');
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  let output='',expired=false;
  const child=spawn(argv[0],argv.slice(1),{cwd,env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['pipe','pipe','pipe']});
  const stdout=new StringDecoder('utf8'),stderr=new StringDecoder('utf8');
  const collect=text=>{if(!text)return;output=(output+text).slice(-60000);onOutput?.(text);};
  child.stdout.on('data',b=>{collect(stdout.write(b));onStdout?.(b);});child.stderr.on('data',b=>collect(stderr.write(b)));
  const abort=()=>terminate(child),timer=setTimeout(()=>{expired=true;terminate(child);},timeout);
  signal?.addEventListener('abort',abort,{once:true});
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
  child.on('error',e=>{cleanup();reject(e);});child.stdin.on('error',()=>{});
  child.on('close',code=>{collect(stdout.end());collect(stderr.end());cleanup();if(signal?.aborted){const e=new Error('Auftrag abgebrochen. Bereits geschriebene Änderungen bleiben in der Arbeitskopie.');e.name='AbortError';reject(e);}else if(code===0&&!expired)resolve(output.trim());else reject(new Error((expired?'Zeitlimit erreicht. ':`Befehl fehlgeschlagen (${code}). `)+output));});
  child.stdin.end(input);
 });
}
