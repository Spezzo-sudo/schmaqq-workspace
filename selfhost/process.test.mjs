import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync,existsSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {command} from './process.mjs';
import {runCodex} from './codex-run.mjs';

test('split UTF-8 bytes remain readable in command results and code review',async()=>{
 const expected='Grüße aus Zürich 🛠';
 const source="const bytes=Buffer.from(process.argv[1]);let i=0;const timer=setInterval(()=>{if(i===bytes.length){clearInterval(timer);return;}process.stdout.write(bytes.subarray(i,i+1));i++;},2);";
 assert.equal(await command([process.execPath,'-e',source,expected],process.cwd()),expected);
});

test('abort stops an owned process and its descendant before delayed writes',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-abort-')),controller=new AbortController();
 try{
  writeFileSync(path.join(dir,'child.cjs'),"console.log('ready');setTimeout(()=>require('fs').writeFileSync('unexpected.txt','bad'),1500);setInterval(()=>{},1000);");
  const parent="const c=require('child_process').spawn(process.execPath,['child.cjs'],{stdio:['ignore','pipe','inherit']});c.stdout.on('data',b=>process.stdout.write(b));setInterval(()=>{},1000);";
  const start=Date.now();
  await assert.rejects(command([process.execPath,'-e',parent],dir,{signal:controller.signal,onStdout:()=>controller.abort()}),{name:'AbortError'});
  assert.ok(Date.now()-start<10000);
  await new Promise(r=>setTimeout(r,1700));assert.equal(existsSync(path.join(dir,'unexpected.txt')),false);
 }finally{assert.ok(dir.startsWith(path.join(os.tmpdir(),'schmaqq-abort-')));rmSync(dir,{recursive:true,force:true});}
});

test('Codex JSON stream keeps UTF-8, emits useful events and resumes only its saved session',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-session-')),sessionFile=path.join(dir,'own.session');
 const session='12345678-1234-1234-1234-123456789abc',calls=[],events=[];
 try{
  const execute=async(argv,cwd,options)=>{
   calls.push(argv);assert.equal(cwd,dir);assert.equal(options.env.OPENAI_API_KEY,undefined);
   if(argv[1]==='login')return 'Logged in using ChatGPT';
   assert.equal(options.input,'Weiter');assert.ok(argv.includes('sandbox_mode="workspace-write"'));
   const bytes=Buffer.from(JSON.stringify({type:'thread.started',thread_id:session})+'\n'+JSON.stringify({type:'item.completed',item:{type:'agent_message',text:'Grüße aus Zürich'}})+'\n');
   for(const byte of bytes)options.onStdout(Buffer.from([byte]));return '';
  };
  const first=await runCodex({executable:'local-codex',cwd:dir,prompt:'Weiter',sessionFile,onEvent:e=>events.push(e),execute});
  assert.equal(first.resumed,false);assert.equal(first.output,'Grüße aus Zürich');assert.equal(readFileSync(sessionFile,'utf8'),session);assert.equal(events.at(-1).text,'Grüße aus Zürich');
  const second=await runCodex({executable:'local-codex',cwd:dir,prompt:'Weiter',sessionFile,execute});
  assert.equal(second.resumed,true);assert.ok(calls.at(-1).includes('resume'));assert.ok(calls.at(-1).includes(session));assert.ok(!calls.at(-1).includes('--last'));
  writeFileSync(sessionFile,'--last');await assert.rejects(runCodex({executable:'local-codex',cwd:dir,prompt:'Weiter',sessionFile,execute}),/Sitzung ungültig/);
 }finally{assert.ok(dir.startsWith(path.join(os.tmpdir(),'schmaqq-session-')));rmSync(dir,{recursive:true,force:true});}
});
