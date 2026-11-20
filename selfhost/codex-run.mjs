import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {StringDecoder} from 'node:string_decoder';
import {command} from './process.mjs';

// Session identifiers stay on the owning PC and are bound to one worktree.
export async function runCodex({executable,cwd,prompt,sessionFile,signal,onEvent=()=>{},execute=command}){
 const env={...process.env};delete env.OPENAI_API_KEY;
 const auth=await execute([executable,'login','status'],cwd,{env,timeout:20000,signal});
 if(!/chatgpt/i.test(auth))throw new Error('Bitte Codex auf diesem PC mit deinem ChatGPT-Konto anmelden.');
 let session=existsSync(sessionFile)?readFileSync(sessionFile,'utf8').trim():'';
 if(session&&!/^[a-f0-9-]{36}$/i.test(session))throw new Error('Gespeicherte Codex-Sitzung ungültig.');
 const resumed=!!session,decoder=new StringDecoder('utf8');let buffer='',answer='';
 const usage={turns:0,input:0,cached:0,output:0,reasoning:0};
 function line(value){
  let event;try{event=JSON.parse(value);}catch{return;}
  if(event.type==='thread.started'&&/^[a-f0-9-]{36}$/i.test(event.thread_id)){
   session=event.thread_id;writeFileSync(sessionFile,session,{mode:0o600});
   onEvent({type:'session',text:resumed?'Codex-Arbeit fortgesetzt.':'Codex-Arbeit gestartet.'});
  }
  // At the end of every turn Codex reports what it used. Studio keeps the sum of the run (new input, cache, output).
  if(event.type==='turn.completed'&&event.usage&&typeof event.usage==='object'){
   const n=v=>Number.isFinite(v)&&v>=0?Math.floor(v):0;
   usage.turns+=1;usage.input+=n(event.usage.input_tokens);usage.cached+=n(event.usage.cached_input_tokens);
   usage.output+=n(event.usage.output_tokens);usage.reasoning+=n(event.usage.reasoning_output_tokens);
  }
  const item=event.item;
  if(item?.type==='agent_message'&&event.type==='item.completed'){answer=item.text??'';onEvent({type:'message',text:answer.slice(-4000)});}
  else if(item?.type==='command_execution')onEvent({type:'command',text:[item.command,item.status,item.aggregated_output].filter(Boolean).join('\n').slice(-4000)});
  else if(item?.type==='file_change')onEvent({type:'files',text:JSON.stringify(item.changes??[]).slice(-4000)});
  else if(event.type==='turn.started')onEvent({type:'status',text:'Codex bearbeitet deinen Auftrag.'});
  else if(event.type==='error'||event.type==='turn.failed')onEvent({type:'error',text:String(event.message??event.error?.message??'Codex-Auftrag fehlgeschlagen.').slice(-4000)});
 }
 const common=['-c','forced_login_method="chatgpt"','-c','approval_policy="never"','-c','sandbox_mode="workspace-write"'];
 const argv=resumed?[executable,'exec',...common,'resume','--json',session,'-']:[executable,'exec',...common,'--json','-C',cwd,'-'];
 await execute(argv,cwd,{input:prompt,env,timeout:1800000,signal,onStdout:b=>{
  buffer+=decoder.write(b);let end;while((end=buffer.indexOf('\n'))>=0){line(buffer.slice(0,end));buffer=buffer.slice(end+1);}if(buffer.length>1000000)buffer='';
 }});
 buffer+=decoder.end();if(buffer.trim())line(buffer);
 return {output:answer,sessionAvailable:!!session,resumed,...(usage.turns?{usage}:{})};
}
