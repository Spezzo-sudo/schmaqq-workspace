import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {openStore,digest,passwordHash} from './store.mjs';

async function fixture(t,{configured=true}={}){
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-hermes-queue-'));
 const filename=path.join(dir,'pilot.sqlite'),origin='http://127.0.0.1:49151';
 const privateDb=openStore(filename,{seedProjects:false});
 const members=[{id:randomUUID(),email:'alice@fixture.invalid',name:'Alice'}, {id:randomUUID(),email:'bob@fixture.invalid',name:'Bob'}];
 for(const m of members){
  m.session=randomBytes(32).toString('base64url');
  privateDb.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(m.id,m.name,m.email,passwordHash('fixture-password-not-for-real'),m.name==='Alice'?'owner':'member',Date.now());
  privateDb.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(m.session),m.id,Date.now()+120000);
  m.cookie='studio_session='+m.session;
 }
 privateDb.close();
 const secrets=members.map(m=>({owner:m.id,token:randomBytes(32).toString('base64url')}));
 const app=createStudioServer({filename,origin,previewOrigin:'http://127.0.0.1:49152',resetMailer:null,hermesWorkers:configured?secrets:[]});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const host='http://127.0.0.1:'+app.server.address().port;
 async function post(route,body,{cookie,token,originHeader=origin}={}){
  const r=await fetch(host+route,{method:'POST',headers:{Origin:originHeader,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  return {status:r.status,data:await r.json()};
 }
 async function get(route,{cookie}={}){
  const r=await fetch(host+route,{headers:cookie?{Cookie:cookie}:{}});return {status:r.status,data:await r.json()};
 }
 async function createAgentMessage(account=members[0],name='Mara',title='Pilot'){
  const create=await post('/api/room',{action:'create',id:randomUUID(),title,description:'Nur isolierte Testdaten'},{cookie:account.cookie});assert.equal(create.status,200);
  const project=create.data.project;
  const agentResult=await post('/api/room',{action:'agent',id:randomUUID(),project,name,role:'frontend',avatarPresetId:'mara',model:'pilot-codex',capabilities:['chat']},{cookie:account.cookie});assert.equal(agentResult.status,200);
  const agent=agentResult.data.agentId;
  const messageId=randomUUID();
  assert.equal((await post('/api/room',{action:'message',id:messageId,project,recipient:agent,body:'Prüfe bitte den mobilen Messenger.'},{cookie:account.cookie})).status,200);
  return {project,agent,message:messageId};
 }
 return {app,members,secrets,post,get,createAgentMessage};
}

test('agent queue: disabled until a personally assigned backend worker exists; no pretend response',async t=>{
 const f=await fixture(t,{configured:false}),[alice]=f.members;
 const {project,agent,message}=await f.createAgentMessage();
 const result=await f.post('/api/agent-runs',{project,agent,message},{cookie:alice.cookie});
 assert.equal(result.status,503);
 const list=await f.get('/api/agent-runs?project='+project,{cookie:alice.cookie});
 assert.equal(list.data.configured,false);
 assert.deepEqual(list.data.runs,[]);
 assert.equal((await f.get('/api/room?project='+project,{cookie:alice.cookie})).data.messages.length,1);
});

test('agent queue: explicit project-scoped request, idempotent claim, signed completion and verified origin',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,[aWorker,bWorker]=f.secrets;
 const {project,agent,message}=await f.createAgentMessage();
 const request={project,agent,message};
 assert.equal((await f.post('/api/agent-runs',request)).status,401,'Cookie is mandatory');
 assert.equal((await f.post('/api/agent-runs',request,{cookie:alice.cookie,originHeader:'https://evil.invalid'})).status,403,'Origin check required');
 assert.equal((await f.post('/api/agent-runs',request,{cookie:bob.cookie})).status,403,'Agent belongs to another person');
 const started=await f.post('/api/agent-runs',request,{cookie:alice.cookie});
 assert.equal(started.status,202);assert.equal(started.data.status,'queued');
 const again=await f.post('/api/agent-runs',request,{cookie:alice.cookie});
 assert.equal(again.data.reused,true);assert.equal(again.data.run,started.data.run);
 assert.equal((await f.post('/api/hermes-worker/claim',{},{})).status,401);
 assert.equal((await f.post('/api/hermes-worker/claim',{}, {token:'x'.repeat(43)})).status,401);
 assert.equal((await f.post('/api/hermes-worker/claim',{}, {token:bWorker.token})).data.job,null,'Other worker cannot see this run');
 const claim=await f.post('/api/hermes-worker/claim',{}, {token:aWorker.token});
 assert.equal(claim.status,200);
 assert.equal(claim.data.job.owner,alice.id);
 assert.equal(claim.data.job.agent,agent);
 assert.equal(claim.data.job.prompt,'Prüfe bitte den mobilen Messenger.');
 assert.deepEqual(claim.data.job.toolPolicy,{mode:'no-tools',allowed:[]});
 assert.equal((await f.post('/api/hermes-worker/claim',{}, {token:aWorker.token})).data.job,null);
 const run=claim.data.job.run,lease=claim.data.job.lease;
 assert.equal((await f.post('/api/hermes-worker/finish',{run,lease:'Y'.repeat(43),status:'completed',output:'Falscher Lease'}, {token:aWorker.token})).status,403);
 assert.equal((await f.post('/api/hermes-worker/finish',{run,lease,status:'completed'}, {token:aWorker.token})).status,400,'No fake empty model results');
 const completed=await f.post('/api/hermes-worker/finish',{run,lease,status:'completed',output:'Der Test-Messenger ist übersichtlich.'}, {token:aWorker.token});
 assert.equal(completed.status,200);assert.equal(completed.data.status,'completed');
 assert.ok(completed.data.message);
 assert.equal((await f.post('/api/hermes-worker/finish',{run,lease,status:'completed',output:'Double'}, {token:aWorker.token})).status,403,'Replay cannot duplicate response');
 const room=await f.get('/api/room?project='+project,{cookie:bob.cookie});
 assert.equal(room.status,200);
 const answer=room.data.messages.find(m=>m.id===completed.data.message);
 assert.equal(answer.origin,'verified-run');
 assert.equal(answer.senderAgent,agent);
 assert.equal(answer.replyTo,message);
 assert.equal(answer.body,'Der Test-Messenger ist übersichtlich.');
 assert.equal(answer.runId,run);
 assert.equal((await f.get('/api/agent-runs?project='+project,{cookie:bob.cookie})).data.runs.length,0,'Other user cannot see private execution details');
 assert.equal((await f.get('/api/agent-runs?project='+project,{cookie:alice.cookie})).data.runs[0].status,'completed');
});

test('agent queue: reject wrong source/recipient and duplicate concurrent runs per owner',async t=>{
 const f=await fixture(t),[alice]=f.members;
 const {project,agent,message}=await f.createAgentMessage();
 assert.equal((await f.post('/api/agent-runs',{project,agent,message:'missing-id'},{cookie:alice.cookie})).status,400);
 const second=await f.createAgentMessage(alice,'Eule','Another');
 assert.equal((await f.post('/api/agent-runs',{project,agent,message:second.message},{cookie:alice.cookie})).status,400,'No cross-project source');
 const started=await f.post('/api/agent-runs',{project,agent,message},{cookie:alice.cookie});assert.equal(started.status,202);
 assert.equal((await f.post('/api/agent-runs',{project:second.project,agent:second.agent,message:second.message},{cookie:alice.cookie})).status,409);
});

test('agent queue: queued cancel cannot be claimed and running cancel rejects late model output',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets;
 const first=await f.createAgentMessage(),run1=await f.post('/api/agent-runs',first,{cookie:alice.cookie});
 assert.equal((await f.post('/api/agent-runs/cancel',{run:run1.data.run},{cookie:alice.cookie})).data.status,'cancelled');
 assert.equal((await f.post('/api/hermes-worker/claim',{}, {token:worker.token})).data.job,null);
 const second=await f.createAgentMessage(alice,'Herr Grau','Second'),run2=await f.post('/api/agent-runs',second,{cookie:alice.cookie});
 const job=(await f.post('/api/hermes-worker/claim',{}, {token:worker.token})).data.job;
 assert.equal(job.run,run2.data.run);
 assert.equal((await f.post('/api/agent-runs/cancel',{run:job.run},{cookie:alice.cookie})).data.status,'cancelling');
 assert.deepEqual((await f.post('/api/hermes-worker/heartbeat',{run:job.run,lease:job.lease},{token:worker.token})).data,{status:'cancelling',cancel:true});
 const finished=await f.post('/api/hermes-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Should never publish'}, {token:worker.token});
 assert.equal(finished.data.status,'cancelled');
 assert.equal(finished.data.message,null);
 assert.equal((await f.get('/api/room?project='+second.project,{cookie:alice.cookie})).data.messages.length,1);
});
