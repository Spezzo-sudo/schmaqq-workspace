import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createMutationLedger} from './studio-mcp-ledger.mjs';
import {createStudioMcp} from './studio-mcp.mjs';

test('persistent request identity survives new adapters and reopening SQLite without storing code arguments',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-mcp-ledger-')),file=path.join(dir,'private.sqlite');let db;
 try{
  let calls=0;
  const request=async()=>{calls++;return {status:200,data:{id:'actual-job'}};};
  const args={requestId:'once',device:'own',project:'private',operation:'create-file',worktree:'copy',file:'example.txt',content:'private-content-never-in-ledger'};
  db=new DatabaseSync(file);
  const factory=(memberId='marco',grantId='grant')=>createStudioMcp({request,mutationLedger:createMutationLedger(db,{memberId,grantId})});
  const first=await factory().call('start_code_job',args);
  assert.deepEqual(await factory().call('start_code_job',args),first);assert.equal(calls,1);
  db.close();db=new DatabaseSync(file);
  assert.deepEqual(await factory().call('start_code_job',args),first);assert.equal(calls,1);
  await assert.rejects(factory().call('start_code_job',{...args,content:'changed'}),/different arguments/);
  await factory('markus').call('start_code_job',args);assert.equal(calls,2,'person scope is independent');
  await factory('marco','another-grant').call('start_code_job',args);assert.equal(calls,3,'new grant is explicitly a new deduplication domain');
  assert.ok(!readFileSync(file).includes(Buffer.from(args.content)));
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});

test('interruption never releases pending claim; competing connections cannot execute twice',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-mcp-claim-')),file=path.join(dir,'private.sqlite');
 const a=new DatabaseSync(file),b=new DatabaseSync(file),scope={memberId:'person',grantId:'connection'};
 try{
  const first=createMutationLedger(a,scope),second=createMutationLedger(b,scope),hash='a'.repeat(64);let calls=0,finish;
  const active=first.run('start_code_job:once',hash,async()=>{calls++;await new Promise(r=>finish=r);return {content:[{type:'text',text:'{"id":"job"}'}]};});
  const competing=await second.run('start_code_job:once',hash,async()=>{calls++;});assert.equal(competing.isError,true);assert.equal(calls,1);
  finish();await active;assert.equal((await second.run('start_code_job:once',hash,async()=>{calls++;})).isError,undefined);assert.equal(calls,1);
  await assert.rejects(first.run('start_code_job:crashed',hash,async()=>{throw new Error('crash after possible backend mutation');}),/crash/);
  const resumed=createMutationLedger(b,scope);
  const blocked=await resumed.run('start_code_job:crashed',hash,async()=>{calls++;});assert.equal(blocked.isError,true);assert.match(blocked.content[0].text,/unknown outcome/);assert.equal(calls,1);
  const capped=createMutationLedger(a,{memberId:'limited',grantId:'grant',maxEntries:1});
  await capped.run('one',hash,async()=>({content:[]}));
  await assert.rejects(capped.run('two',hash,async()=>{calls++;}),/limit/);
  assert.equal(calls,1);
 }finally{a.close();b.close();rmSync(dir,{recursive:true,force:true});}
});

test('ledger storage failure stops a mutation and is not misreported as bad user input',async()=>{
 let called=false;
 const bridge=createStudioMcp({request:async()=>{called=true;},mutationLedger:{run:async()=>{throw new Error('private sqlite path and disk failure');}}});
 const result=await bridge.dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'start_code_job',arguments:{requestId:'one',device:'own',project:'project',operation:'prepare'}}});
 assert.equal(called,false);assert.equal(result.error,undefined);assert.equal(result.result.isError,true);assert.ok(!JSON.stringify(result).includes('private sqlite'));
});
