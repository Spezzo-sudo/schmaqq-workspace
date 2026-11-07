import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {LocalRunner,command} from './runner.mjs';
import {createStudioMcp} from './studio-mcp.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createMutationLedger} from './studio-mcp-ledger.mjs';

test('MCP code tools: real two-person HTTP/Git/test/build/preview with own-device and stale-write boundaries',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-mcp-'));
 const origin='http://127.0.0.1:44962',previewOrigin='http://127.0.0.1:44963';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin,resetMailer:null});
 let runner;
 const ledgerDb=new DatabaseSync(path.join(dir,'plugin-mutations.sqlite'));
 t.after(async()=>{runner?.close();await new Promise(r=>app.server.close(r));await new Promise(r=>app.previewServer.close(r));app.db.close();ledgerDb.close();rmSync(dir,{recursive:true,force:true});});
 await new Promise(r=>app.server.listen(44962,'127.0.0.1',r));
 await new Promise(r=>app.previewServer.listen(44963,'127.0.0.1',r));
 async function request(route,value,cookie,token){
  const res=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});
  return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
 }
 const people=[];
 for(const name of ['Marco','Markus']){
  const res=await request('/api/auth/register',{invite:createInvite(app.db,name+'@fixture.invalid',people.length?'member':'owner'),name,password:'synthetic-password-2026'});
  assert.equal(res.status,200);people.push(res.cookie);
 }
 const [marco,markus]=people;
 const makeFirst=()=>createStudioMcp({request:(route,value)=>request(route,value,marco),mutationLedger:createMutationLedger(ledgerDb,{memberId:'marco',grantId:'synthetic-plugin-grant'})});
 const first=makeFirst();
 const second=createStudioMcp({request:(route,value)=>request(route,value,markus)});
 const unwrap=reply=>JSON.parse(reply.content[0].text);
 const list=await first.dispatch({jsonrpc:'2.0',id:1,method:'tools/list'});
 assert.ok(list.result.tools.some(tool=>tool.name==='start_code_job'));
 assert.ok(!JSON.stringify(list).includes(marco));
 assert.ok(unwrap(await first.call('list_projects',{})).rooms.some(p=>p.id==='website'));
 assert.equal((await first.call('project_context',{project:'website'})).isError,undefined);
 const device=(await request('/api/development',{action:'device',name:'Isolated local prototype worker'},marco)).data;
 const repo=path.join(dir,'repo'),bare=path.join(dir,'remote.git');mkdirSync(repo);
 const git=(cwd,...args)=>command(['git',...args],cwd);
 await git(dir,'init','--bare',bare);await git(repo,'init','-b','main');await git(repo,'config','core.autocrlf','false');
 await git(repo,'config','user.name','Synthetic');await git(repo,'config','user.email','synthetic@fixture.invalid');
 writeFileSync(path.join(repo,'value.txt'),'original\n');
 const large='const produkt = "Wärmepumpe 🌍";\n'.repeat(6000);writeFileSync(path.join(repo,'products.v1.json'),large);
 writeFileSync(path.join(repo,'check.cjs'),"const a=require('node:assert/strict');a.equal(require('node:fs').readFileSync('value.txt','utf8'),'Chat code works\\n');console.log('actual assertion passed');");
 writeFileSync(path.join(repo,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html','<h1>'+fs.readFileSync('value.txt','utf8')+'</h1>');");
 await git(repo,'add','.');await git(repo,'commit','-m','synthetic baseline');await git(repo,'remote','add','origin',bare);await git(repo,'push','-u','origin','main');
 const initial=await git(dir,'--git-dir',bare,'rev-parse','main');
 runner=new LocalRunner({stateDir:path.join(dir,'runner'),projects:{website:{repo,base:'main',publish:false,check:[process.execPath,'check.cjs'],preview:{build:[process.execPath,'build.cjs'],directory:'dist'}}}});
 let sequence=0;
 async function execute(operation,extra={}){
  const args={requestId:'request-'+(++sequence),device:device.id,project:'website',operation,...extra};
  const queued=await first.call('start_code_job',args);assert.equal(queued.isError,undefined,JSON.stringify(queued));
  const queuedId=unwrap(queued).id;
  assert.deepEqual(await first.call('start_code_job',args),queued,'retry must not queue another job');
  assert.deepEqual(await makeFirst().call('start_code_job',args),queued,'reconnected client must reuse the actual queued Studio job');
  const job=(await request('/api/runner/poll',{},undefined,device.token)).data.job;assert.equal(job.id,queuedId);
  let result,error;
  try{result=await runner.run(job);}catch(e){error=e;result={error:e.message};}
  const report=await request('/api/runner/report',{id:job.id,lease:job.lease,ok:!error,result},undefined,device.token);assert.equal(report.status,200,JSON.stringify(report.data));
  const saved=unwrap(await first.call('get_code_job',{id:job.id})).job;
  return {job:saved,error};
 }
 const prepared=await execute('prepare');assert.equal(prepared.job.status,'completed');
 const worktree=prepared.job.id;
 const read=await execute('read-file',{worktree,file:'value.txt'});assert.equal(read.job.result.content,'original\n');
 const denied=await second.call('start_code_job',{requestId:'foreign',device:device.id,project:'website',operation:'files',worktree});assert.equal(denied.isError,true);assert.equal(unwrap(denied).status,403);
 assert.equal((await second.call('get_code_job',{id:read.job.id})).isError,true);
 const saved=await execute('save-file',{worktree,file:'value.txt',revision:read.job.result.revision,content:'Chat code works\n'});assert.equal(saved.job.status,'completed');
 const stale=await execute('save-file',{worktree,file:'value.txt',revision:read.job.result.revision,content:'must not overwrite'});assert.equal(stale.job.status,'failed');
 assert.equal(readFileSync(path.join(prepared.job.result.path,'value.txt'),'utf8'),'Chat code works\n');
 const escape=await execute('read-file',{worktree,file:'../secret.txt'});assert.equal(escape.job.status,'failed');
 // Files over 64 KB: whole read fails with a hint; sections through the same job contract rebuild it exactly.
 const whole=await execute('read-file',{worktree,file:'products.v1.json'});assert.equal(whole.job.status,'failed');assert.match(whole.job.result.error,/abschnittsweise/);
 let offset=0,revision,joined='';
 while(offset!==null){const part=(await execute('read-file',{worktree,file:'products.v1.json',offset,...(revision?{revision}:{})})).job.result;revision??=part.revision;joined+=part.content;offset=part.nextOffset;}
 assert.equal(joined,large);
 const tooBig=await execute('save-file',{worktree,file:'products.v1.json',revision,content:'x'});assert.equal(tooBig.job.status,'failed');
 assert.equal((await first.call('start_code_job',{requestId:'offset-save',device:device.id,project:'website',operation:'save-file',worktree,file:'value.txt',revision,content:'x',offset:0})).isError,true);
 const checked=await execute('check',{worktree});assert.equal(checked.job.status,'completed');assert.match(checked.job.result.checks,/actual assertion passed/);
 const preview=await execute('preview',{worktree});assert.equal(preview.job.status,'completed');
 // Current backend uses a capability link, not a new account-protected preview.
 const viewed=await fetch(preview.job.result.url);assert.equal(viewed.status,200);assert.match(await viewed.text(),/Chat code works/);
 const secondView=await fetch(preview.job.result.url,{headers:{Cookie:markus}});assert.match(await secondView.text(),/Chat code works/);
 assert.equal(await git(dir,'--git-dir',bare,'rev-parse','main'),initial,'no remote code publication');
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM jobs WHERE status='queued'").get().n,0);
 await assert.rejects(first.call('start_code_job',{requestId:'publish',device:device.id,project:'website',operation:'submit',worktree}),/Invalid tool/);
});

test('MCP validation, concurrent retry, changed request identity and bounded mutation memory',async()=>{
 let calls=0;
 const bridge=createStudioMcp({maxRequests:1,request:async()=>{calls++;return {status:200,data:{id:'job'}};}});
 const args={requestId:'once',device:'own',project:'test',operation:'prepare'};
 await Promise.all([bridge.call('start_code_job',args),bridge.call('start_code_job',args)]);assert.equal(calls,1);
 await assert.rejects(bridge.call('start_code_job',{...args,project:'different'}),/different arguments/);
 await assert.rejects(bridge.call('start_code_job',{...args,requestId:'next'}),/limit/);
 await assert.rejects(bridge.call('list_projects',{cookie:'not-allowed'}),/Invalid tool/);
 assert.equal((await bridge.dispatch({jsonrpc:'2.0',id:1,method:'unknown'})).error.code,-32601);
 assert.equal(await bridge.dispatch({jsonrpc:'2.0',method:'notifications/initialized'}),undefined);
 assert.equal((await bridge.dispatch({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'shell',arguments:{}}})).error.code,-32602);
});

test('transport failures are execution errors and an ambiguous mutation cannot execute again on retry',async()=>{
 let calls=0;
 const bridge=createStudioMcp({request:async()=>{calls++;throw new Error('sensitive connection details');}});
 const read=await bridge.dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'list_projects',arguments:{}}});
 assert.equal(read.error,undefined);assert.equal(read.result.isError,true);assert.match(read.result.content[0].text,/Check the connection/);assert.ok(!JSON.stringify(read).includes('sensitive'));
 const args={requestId:'ambiguous',device:'own',project:'test',operation:'prepare'};
 const failed=await bridge.call('start_code_job',args);assert.match(failed.content[0].text,/outcome is unknown/);
 await bridge.call('start_code_job',args);assert.equal(calls,2);
 assert.equal(bridge.tools.find(t=>t.name==='start_code_job').annotations.openWorldHint,true);
});
