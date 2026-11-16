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

test('agent queue: reject wrong source/recipient; further requests queue up to a limit',async t=>{
 const f=await fixture(t),[alice]=f.members;
 const {project,agent,message}=await f.createAgentMessage();
 assert.equal((await f.post('/api/agent-runs',{project,agent,message:'missing-id'},{cookie:alice.cookie})).status,400);
 const second=await f.createAgentMessage(alice,'Eule','Another');
 assert.equal((await f.post('/api/agent-runs',{project,agent,message:second.message},{cookie:alice.cookie})).status,400,'No cross-project source');
 const started=await f.post('/api/agent-runs',{project,agent,message},{cookie:alice.cookie});assert.equal(started.status,202);
 const queued=await f.post('/api/agent-runs',{project:second.project,agent:second.agent,message:second.message},{cookie:alice.cookie});
 assert.equal(queued.status,202,'A second request waits in the queue');
 const list=(await f.get('/api/agent-runs?project='+second.project,{cookie:alice.cookie})).data;
 assert.equal(list.runs[0].position,2);
 for(const n of [3,4,5]){
  const extra=await f.createAgentMessage(alice,'Agent '+n,'Projekt '+n);
  assert.equal((await f.post('/api/agent-runs',extra,{cookie:alice.cookie})).status,202);
 }
 const sixth=await f.createAgentMessage(alice,'Agent 6','Projekt 6');
 assert.equal((await f.post('/api/agent-runs',sixth,{cookie:alice.cookie})).status,409,'The queue is bounded');
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

test('agent queue: a waiting worker gets new work at once, one answer at a time, in order',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets;
 const first=await f.createAgentMessage(),second=await f.createAgentMessage(alice,'Eule','Zweites');
 const before=Date.now();
 const pending=f.post('/api/agent-worker/claim',{wait:20},{token:worker.token});
 await new Promise(resolve=>setTimeout(resolve,150));
 const online=(await f.get('/api/agent-runs?project='+first.project,{cookie:alice.cookie})).data;
 assert.equal(online.online,true,'A worker that asks for work counts as reachable');
 const run1=await f.post('/api/agent-runs',first,{cookie:alice.cookie});
 const run2=await f.post('/api/agent-runs',second,{cookie:alice.cookie});
 const job=(await pending).data.job;
 assert.equal(job.run,run1.data.run);
 assert.ok(Date.now()-before<5000,'No polling delay');
 assert.equal((await f.post('/api/agent-worker/claim',{},{token:worker.token})).data.job,null,'Second request waits for the first');
 const active=(await f.get('/api/agent-runs',{cookie:alice.cookie})).data.runs;
 assert.deepEqual(active.map(r=>[r.id,r.status,r.position]),[[run1.data.run,'running',null],[run2.data.run,'queued',1]]);
 assert.ok(active[0].started);
 await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Erste Antwort.'},{token:worker.token});
 assert.equal((await f.post('/api/agent-worker/claim',{},{token:worker.token})).data.job.run,run2.data.run);
});

test('agent queue: the worker receives the earlier exchange with this agent',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets;
 const {project,agent,message}=await f.createAgentMessage();
 await f.post('/api/agent-runs',{project,agent,message},{cookie:alice.cookie});
 const job=(await f.post('/api/agent-worker/claim',{},{token:worker.token})).data.job;
 assert.deepEqual(job.history,[]);
 await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Die Liste ist zu eng.'},{token:worker.token});
 const next=randomUUID();
 await f.post('/api/room',{action:'message',id:randomUUID(),project,body:'Nachricht an alle, nicht an den Agenten.'},{cookie:alice.cookie});
 await f.post('/api/room',{action:'message',id:next,project,recipient:agent,body:'Und was schlägst du vor?'},{cookie:alice.cookie});
 await f.post('/api/agent-runs',{project,agent,message:next},{cookie:alice.cookie});
 const followUp=(await f.post('/api/agent-worker/claim',{},{token:worker.token})).data.job;
 assert.deepEqual(followUp.history,[{from:'person',body:'Prüfe bitte den mobilen Messenger.'},{from:'agent',body:'Die Liste ist zu eng.'}]);
 assert.equal(followUp.prompt,'Und was schlägst du vor?');
});

test('agent queue: a worker request that came through a proxy or tunnel is refused',async t=>{
 const f=await fixture(t),[worker]=f.secrets;
 const host='http://127.0.0.1:'+f.app.server.address().port;
 for(const header of ['X-Forwarded-For','CF-Connecting-IP']){
  const r=await fetch(host+'/api/agent-worker/claim',{method:'POST',headers:{Origin:'http://127.0.0.1:49151','Content-Type':'application/json',Authorization:'Bearer '+worker.token,[header]:'203.0.113.9'},body:'{}'});
  assert.equal(r.status,403,header);
 }
});

test('agent queue: runs and proposals of the first pilot are taken over from the old storage',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-agent-migrate-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const filename=path.join(dir,'pilot.sqlite');
 let db=openStore(filename,{seedProjects:false});
 db.prepare("DELETE FROM workspace_meta WHERE key LIKE 'agent-runs:%'").run();
 const put=(key,value)=>db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?)').run(key,JSON.stringify(value));
 put('hermes:v1:run:r1',{id:'r1',owner:'o1',project:'p1',agent:'a1',source_message:'m1',model:'x',status:'completed',created:10,updated:20,claimed:12,
  tool_policy:['task.propose'],completed_message:'m2',tool_calls:[{callId:'call-0001',tool:'task.propose',fingerprint:'f',at:15,proposal:'pr1'}]});
 put('hermes:v1:proposal:pr1',{id:'pr1',run:'r1',owner:'o1',project:'p1',agent:'a1',source_message:'m1',title:'Titel',description:'',kind:'general',status:'accepted',message:'m2',task:'t1',decidedBy:'o1',decided:21,created:15,updated:21});
 db.close();
 db=openStore(filename,{seedProjects:false});
 t.after(()=>db.close());
 const run=db.prepare('SELECT * FROM agent_runs WHERE id=?').get('r1');
 assert.equal(run.status,'completed');assert.equal(run.finished,20);assert.equal(run.tool_policy,'["task.propose"]');
 assert.equal(db.prepare('SELECT tool FROM agent_run_steps WHERE run=?').get('r1').tool,'task.propose');
 assert.equal(db.prepare('SELECT task FROM agent_proposals WHERE id=?').get('pr1').task,'t1');
 assert.ok(db.prepare("SELECT 1 FROM workspace_meta WHERE key='hermes:v1:run:r1'").get(),'Old records stay for a rollback');
});
