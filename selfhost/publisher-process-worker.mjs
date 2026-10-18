// Test-only child process for real SIGKILL and concurrent publisher access.
// Reads only a synthetic temporary fixture descriptor written by the test.
import {readFileSync,writeFileSync} from 'node:fs';
import {publishLocalBundle} from './publisher-local.mjs';

const [descriptor,checkpoint,resultPath,holdStage='none']=process.argv.slice(2);
if(!descriptor||!checkpoint||!resultPath)throw new Error('Synthetic test descriptor required.');
try{
 const options=JSON.parse(readFileSync(descriptor,'utf8'));
 const result=publishLocalBundle({...options,onCheckpoint(stage){
  if(stage!==holdStage)return;
  writeFileSync(checkpoint,stage,{flag:'wx'});
  // Deliberately stop only this disposable worker until the parent SIGKILLs it.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,20000);
 }});
 writeFileSync(resultPath,JSON.stringify({ok:true,result}));
}catch(e){
 writeFileSync(resultPath,JSON.stringify({ok:false,error:e.message}));
 process.exitCode=1;
}
