import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {openStore,digest,passwordHash} from './store.mjs';
import {ensureAgentRunSchema} from './agent-run-store.mjs';

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
  const create=await post('/api/room',{action:'create',id:randomUUID(),title,description:'Nur isolierte Testdaten',members:members.filter(m=>m.id!==account.id).map(m=>m.id)},{cookie:account.cookie});assert.equal(create.status,200);
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
 assert.equal((await f.post('/api/agent-runs',request,{cookie:bob.cookie})).status,400,'Nobody can make an agent answer another person\'s message');
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
 assert.equal(claim.data.job.effort,'low','agents think briefly unless Studio is told otherwise');
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
 assert.deepEqual(followUp.history,[{from:'person',name:'Alice',body:'Prüfe bitte den mobilen Messenger.'},{from:'agent',name:'Mara',body:'Die Liste ist zu eng.'},{from:'person',name:'Alice',body:'Nachricht an alle, nicht an den Agenten.'}],'addressed in the group chat, the agent hears the group chat');
 assert.equal(followUp.place,'group');
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
 const db=openStore(filename,{seedProjects:false});
 const put=(key,value)=>db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?)').run(key,JSON.stringify(value));
 put('hermes:v1:run:r1',{id:'r1',owner:'o1',project:'p1',agent:'a1',source_message:'m1',model:'x',status:'completed',created:10,updated:20,claimed:12,
  tool_policy:['task.propose'],completed_message:'m2',tool_calls:[{callId:'call-0001',tool:'task.propose',fingerprint:'f',at:15,proposal:'pr1'}]});
 put('hermes:v1:proposal:pr1',{id:'pr1',run:'r1',owner:'o1',project:'p1',agent:'a1',source_message:'m1',title:'Titel',description:'',kind:'general',status:'accepted',message:'m2',task:'t1',decidedBy:'o1',decided:21,created:15,updated:21});
 t.after(()=>db.close());
 assert.equal(db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE name LIKE 'agent_%'").get().n,0,'No agent tables before agents are switched on');
 ensureAgentRunSchema(db);ensureAgentRunSchema(db);
 const run=db.prepare('SELECT * FROM agent_runs WHERE id=?').get('r1');
 assert.equal(run.status,'completed');assert.equal(run.finished,20);assert.equal(run.tool_policy,'["task.propose"]');
 assert.equal(db.prepare('SELECT tool FROM agent_run_steps WHERE run=?').get('r1').tool,'task.propose');
 assert.equal(db.prepare('SELECT task FROM agent_proposals WHERE id=?').get('pr1').task,'t1');
 assert.ok(db.prepare("SELECT 1 FROM workspace_meta WHERE key='hermes:v1:run:r1'").get(),'Old records stay for a rollback');
});

test('agent queue: a failed or stopped request can be tried again for the same message, only on request',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets;
 const request=await f.createAgentMessage();
 const first=await f.post('/api/agent-runs',request,{cookie:alice.cookie});
 const job=(await f.post('/api/agent-worker/claim',{},{token:worker.token})).data.job;
 await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'failed',errorCode:'timeout'},{token:worker.token});
 const same=await f.post('/api/agent-runs',request,{cookie:alice.cookie});
 assert.deepEqual([same.data.status,same.data.reused],['failed',true],'A repeated request alone starts nothing');
 const again=await f.post('/api/agent-runs',{...request,retry:true},{cookie:alice.cookie});
 assert.deepEqual([again.data.run,again.data.status],[first.data.run,'queued']);
 const second=(await f.post('/api/agent-worker/claim',{},{token:worker.token})).data.job;
 assert.equal(second.run,first.data.run);assert.notEqual(second.lease,job.lease);
 assert.equal((await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Alt'},{token:worker.token})).status,403,'The old attempt cannot answer');
 const done=await f.post('/api/agent-worker/finish',{run:second.run,lease:second.lease,status:'completed',output:'Jetzt klappt es.'},{token:worker.token});
 assert.equal(done.data.status,'completed');
 assert.equal((await f.post('/api/agent-runs',{...request,retry:true},{cookie:alice.cookie})).data.reused,true,'An answered message is not answered twice');
});

test('project lead: every new project starts with one; whoever asks pays with their own access',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,[aWorker,bWorker]=f.secrets;
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Neues Projekt',description:'',members:[bob.id]},{cookie:alice.cookie})).data.project;
 const agents=(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data.agents;
 assert.equal(agents.length,1);
 const lead=agents[0];
 assert.deepEqual([lead.name,lead.avatarPresetId,lead.role,lead.lead,lead.active],['Herr Grau','herr-grau','coordinator',true,true]);
 // Bob is in the project and asks the same lead: his worker answers, not Alice's.
 const message=randomUUID();
 const sent=await f.post('/api/room',{action:'message',id:message,project,recipient:lead.id,direct:true,body:'Womit fangen wir an?'},{cookie:bob.cookie});
 assert.deepEqual([sent.status,sent.data.ask],[200,lead.id]);
 assert.equal((await f.post('/api/agent-runs',{project,agent:lead.id,message},{cookie:alice.cookie})).status,400,'Alice cannot trigger an answer to Bob\'s message');
 assert.equal((await f.post('/api/agent-runs',{project,agent:lead.id,message},{cookie:bob.cookie})).status,202);
 assert.equal((await f.post('/api/agent-worker/claim',{},{token:aWorker.token})).data.job,null,'Alice\'s access is not spent');
 const job=(await f.post('/api/agent-worker/claim',{},{token:bWorker.token})).data.job;
 assert.deepEqual([job.owner,job.profile.name,job.place],[bob.id,'Herr Grau','direct']);
 const done=await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Mit der Startseite.'},{token:bWorker.token});
 const forBob=(await f.get('/api/room?project='+project,{cookie:bob.cookie})).data.messages;
 assert.equal(forBob.find(m=>m.id===done.data.message).scope,'agent:'+lead.id);
 const forAlice=(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data.messages;
 assert.equal(forAlice.length,0,'Bob\'s private chat with the lead stays private, question and answer');
});

test('project lead: fully editable but never removed; an older project promotes its Herr Grau or gets a new lead',async t=>{
 const f=await fixture(t),[alice]=f.members;
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Firma',description:''},{cookie:alice.cookie})).data.project;
 const room=async()=>(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data;
 const lead=(await room()).agents[0];
 const save=extra=>f.post('/api/room',{action:'agent',id:randomUUID(),project,name:'Herr Grau',role:'coordinator',model:'x',...extra},{cookie:alice.cookie});
 assert.equal((await save({agentId:lead.id,active:false})).status,409,'cannot be removed');
 assert.equal((await save({agentId:lead.id,name:'Frau Boss',avatarPresetId:'nova',model:'anderes-modell',personality:'Direkt'})).status,200,'name, face, model and character are free');
 const edited=(await room()).agents.find(a=>a.id===lead.id);
 assert.deepEqual([edited.name,edited.avatarPresetId,edited.model,edited.lead],['Frau Boss','nova','anderes-modell',true]);
 assert.equal((await save({avatarPresetId:'herr-grau'})).status,200,'the face alone makes nobody a lead');
 for(const role of ['creative','hr','allrounder'])assert.equal((await save({name:'Neu '+role,role,avatarPresetId:'nova'})).status,200,role);
 assert.equal((await room()).agents.filter(a=>a.lead).length,1);
 // Older project: no lead flag anywhere. The agent with the default face is promoted.
 const strip=()=>{for(const row of f.app.db.prepare("SELECT key,value FROM workspace_meta WHERE key LIKE ?").all('room:v1:agent:'+project+':%')){const a=JSON.parse(row.value);delete a.lead;f.app.db.prepare('UPDATE workspace_meta SET value=? WHERE key=?').run(JSON.stringify(a),row.key);}};
 strip();
 const promoted=(await room()).agents.filter(a=>a.lead);
 assert.deepEqual(promoted.map(a=>a.avatarPresetId),['herr-grau']);
 // No such agent either: a new lead is created.
 strip();
 f.app.db.prepare("DELETE FROM workspace_meta WHERE key=?").run('room:v1:agent:'+project+':'+promoted[0].id);
 const created=(await room()).agents.filter(a=>a.lead);
 assert.equal(created.length,1);assert.equal(created[0].name,'Herr Grau');
 assert.equal((await room()).agents.filter(a=>a.lead).length,1,'opening again adds no second one');
});

test('planning: the lead proposes a few tasks in one run; accepting the plan creates exactly those, once',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Plan',description:'',members:[bob.id]},{cookie:alice.cookie})).data.project;
 const room=async(member=alice)=>(await f.get('/api/room?project='+project,{cookie:member.cookie})).data;
 const lead=(await room()).agents[0];
 const mara=(await f.post('/api/room',{action:'agent',id:randomUUID(),project,name:'Mara',role:'frontend',avatarPresetId:'mara',model:'x',permissions:{readProject:true,writeMessages:true,manageTasks:true,editCode:false,prepareReviews:false,delegateAgents:false}},{cookie:alice.cookie})).data.agentId;
 const ask=async(agent,body)=>{const message=randomUUID();await f.post('/api/room',{action:'message',id:message,project,recipient:agent,direct:true,body},{cookie:alice.cookie});await f.post('/api/agent-runs',{project,agent,message},{cookie:alice.cookie});return (await f.post('/api/agent-worker/claim',{},w)).data.job;};
 const call=(job,tool,args)=>f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool,args},w);
 const plan={goal:'Startseite verständlicher machen',tasks:[
  {title:'Überschrift kürzen',done_when:'Die Überschrift passt bei 390 px in zwei Zeilen.',kind:'code',who:'Mara'},
  {title:'Nutzen in drei Punkten festlegen',done_when:'Drei Sätze stehen im Wissen.',kind:'general',who:'Mensch'}],
  hire:[{role:'Texter',why:'Niemand im Team schreibt Werbetexte.'}]};
 // An ordinary agent may propose a task but not a plan.
 const other=await ask(mara,'Mach einen Plan.');
 assert.ok(!other.toolPolicy.allowed.includes('plan.propose'));
 assert.equal((await call(other,'plan.propose',plan)).status,403);
 await f.post('/api/agent-worker/finish',{run:other.run,lease:other.lease,status:'completed',output:'Das plant Herr Grau.'},w);
 // Even a lead whose profile lacks the planning permission (promoted from an older agent) can plan.
 assert.equal((await f.post('/api/room',{action:'agent',id:randomUUID(),project,agentId:lead.id,name:lead.name,role:'reviewer',avatarPresetId:'herr-grau',model:'x',permissions:{readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:true,delegateAgents:false}},{cookie:alice.cookie})).status,200);
 const job=await ask(lead.id,'Ich will die Startseite verständlicher machen. Mach einen Plan.');
 assert.ok(job.toolPolicy.allowed.includes('plan.propose'));
 assert.deepEqual(job.team.map(m=>[m.name,m.lead]),[['Herr Grau',true],['Mara',false]],'the lead knows who is in the team');
 assert.equal((await call(job,'plan.propose',{...plan,tasks:plan.tasks.slice(0,1)})).status,400,'a plan has at least two tasks');
 assert.equal((await call(job,'plan.propose',{...plan,tasks:Array(7).fill(plan.tasks[0])})).status,400,'and at most six');
 assert.equal((await call(job,'plan.propose',plan)).status,200);
 assert.equal((await call(job,'plan.propose',plan)).status,429,'one plan per run');
 assert.equal((await room()).tasks.length,0,'proposing creates nothing');
 const done=await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Erst die Punkte, dann die Überschrift.'},w);
 const card=(await room()).messages.find(m=>m.id===done.data.message).proposalCard;
 assert.deepEqual([card.kind,card.title,card.status,card.plan.tasks.length,card.plan.hire[0].role],['plan','Startseite verständlicher machen','pending',2,'Texter']);
 assert.equal((await f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'accept'},{cookie:bob.cookie})).status,403);
 const [a,b]=await Promise.all([1,2].map(()=>f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'accept'},{cookie:alice.cookie})));
 assert.deepEqual(a.data.tasks,b.data.tasks,'a double tap creates the tasks once');
 const state=await room(bob);
 assert.deepEqual(state.tasks.map(t=>t.title).sort(),['Nutzen in drei Punkten festlegen','Überschrift kürzen'],'the tasks belong to the project, whoever asked');
 const accepted=(await room()).messages.find(m=>m.id===done.data.message).proposalCard;
 assert.deepEqual([accepted.status,accepted.tasks.length],['accepted',2]);
 // Herr Grau distributes: the colleague named for a task starts on it; the task for "Mensch" waits for a person.
 assert.equal(a.data.started.length,1,'one colleague starts, once');
 const started=f.app.db.prepare('SELECT agent,status FROM agent_runs WHERE id=?').get(a.data.started[0]);
 assert.deepEqual([started.agent,started.status],[mara,'queued']);
 const thread=(await f.get('/api/collaboration/task?id='+state.tasks.find(t=>t.title==='Überschrift kürzen').id,{cookie:alice.cookie})).data.thread;
 assert.ok(thread.some(m=>/^@Mara bitte übernimm: Überschrift kürzen/.test(m.body)),'the hand-over is in the task conversation');
});

test('models: an agent set to a model nobody can use answers with the default one; the list is offered to the app',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets;
 const {project,agent,message}=await f.createAgentMessage(); // the fixture profile says "pilot-codex"
 const list=(await f.get('/api/agent-runs?project='+project,{cookie:alice.cookie})).data;
 assert.deepEqual(list.models,['gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna']);
 await f.post('/api/agent-runs',{project,agent,message},{cookie:alice.cookie});
 const job=(await f.post('/api/agent-worker/claim',{},{token:worker.token})).data.job;
 assert.equal(job.model,'gpt-5.6-sol');
 const failed=await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'failed',errorCode:'model-unavailable'},{token:worker.token});
 assert.equal(failed.data.status,'failed');
 assert.equal((await f.get('/api/agent-runs?project='+project,{cookie:alice.cookie})).data.runs[0].errorCode,'model-unavailable');
 const {agentModels}=await import('./agent-run-http.mjs');
 assert.deepEqual(agentModels('a-1, b.2 ,bad model,,a-1'),['a-1','b.2']);
 assert.deepEqual(agentModels(''),['gpt-5.6-sol']);
 // Names of routed providers carry a vendor and a variant; paths and options still do not pass.
 assert.deepEqual(agentModels('openai/gpt-5.6-sol,meta-llama/llama-4:free,/etc/x,-x,a b'),['openai/gpt-5.6-sol','meta-llama/llama-4:free']);
});

test('cards: asked inside a task, the agent works with that task and answers in its conversation',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Karten',description:'',members:[bob.id]},{cookie:alice.cookie})).data.project;
 const room=async(member=alice)=>(await f.get('/api/room?project='+project,{cookie:member.cookie})).data;
 const lead=(await room()).agents[0];
 const task=(await f.post('/api/room',{action:'task',id:randomUUID(),project,title:'Startseite kürzen',description:'Weniger Text oben',kind:'general'},{cookie:alice.cookie})).data.task;
 await f.post('/api/room',{action:'message',id:randomUUID(),project,body:'Ein Gedanke im Projektchat.'},{cookie:bob.cookie});
 await f.post('/api/room',{action:'message',id:randomUUID(),project,topicTask:task,body:'Ich fange oben an.'},{cookie:bob.cookie});
 const question=randomUUID();
 const sent=await f.post('/api/room',{action:'message',id:question,project,topicTask:task,body:'@Herr Grau was fehlt noch?'},{cookie:alice.cookie});
 assert.equal(sent.data.ask,lead.id,'"@Name" in the task addresses exactly that agent');
 assert.equal((await f.post('/api/agent-runs',{project,agent:lead.id,message:question},{cookie:alice.cookie})).status,202);
 const job=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 assert.equal(job.place,'task');
 assert.match(job.context,/AUFGABE \([^)]+\): Startseite kürzen/,'the task, its goal and "Fertig, wenn" come with the run');
 assert.deepEqual(job.history.map(h=>h.body),['Ich fange oben an.'],'history is this task\'s conversation, not the project chat');
 const done=await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Ein Satz zum Nutzen fehlt.'},w);
 const state=await room(bob);
 const answer=state.messages.find(m=>m.id===done.data.message);
 assert.equal(answer.inTask,task,'the answer stays in the task conversation');
 const detail=(await f.get('/api/collaboration/task?id='+task,{cookie:bob.cookie})).data;
 assert.deepEqual(detail.thread.map(m=>[m.body,m.senderAgent]),[['Ich fange oben an.',null],['@Herr Grau was fehlt noch?',null],['Ein Satz zum Nutzen fehlt.',lead.id]]);
 assert.ok(!detail.thread.some(m=>m.body==='Ein Gedanke im Projektchat.'));
});

test('cards: work from a direct chat appears as a card in the project chat; an answer can be shared',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Direkt',description:'',members:[bob.id]},{cookie:alice.cookie})).data.project;
 const room=async(member=alice)=>(await f.get('/api/room?project='+project,{cookie:member.cookie})).data;
 const lead=(await room()).agents[0];
 const ask=async body=>{const message=randomUUID();await f.post('/api/room',{action:'message',id:message,project,recipient:lead.id,direct:true,body},{cookie:alice.cookie});await f.post('/api/agent-runs',{project,agent:lead.id,message},{cookie:alice.cookie});return (await f.post('/api/agent-worker/claim',{},w)).data.job;};
 const job=await ask('Halte fest: Logo tauschen.');
 assert.equal((await f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool:'task.propose',args:{title:'Logo tauschen'}},w)).status,200);
 const done=await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Vorschlag steht.'},w);
 const proposal=(await room()).messages.find(m=>m.id===done.data.message).proposalCard;
 assert.equal((await room(bob)).messages.length,0,'the direct chat stays private');
 const accepted=await f.post('/api/agent-proposals/decide',{proposal:proposal.id,decision:'accept'},{cookie:alice.cookie});
 const cards=(await room(bob)).messages.filter(m=>m.kind==='card');
 assert.equal(cards.length,1,'the new work is visible to everyone');
 assert.deepEqual(cards[0].card.tasks,[accepted.data.task]);
 assert.match(cards[0].body,/Logo tauschen.*Alices Gespräch mit Herr Grau/);
 // Sharing an answer: only my own agent answer, once, word for word.
 assert.equal((await f.post('/api/room',{action:'share',id:randomUUID(),project,message:done.data.message},{cookie:bob.cookie})).status,400);
 const shareId=randomUUID();
 assert.equal((await f.post('/api/room',{action:'share',id:shareId,project,message:done.data.message},{cookie:alice.cookie})).status,200);
 const again=await f.post('/api/room',{action:'share',id:randomUUID(),project,message:done.data.message},{cookie:alice.cookie});
 assert.equal(again.data.message,shareId,'sharing twice posts once');
 const shared=(await room(bob)).messages.find(m=>m.id===shareId);
 assert.deepEqual([shared.body,shared.senderAgent,shared.sharedBy,shared.scope],['Vorschlag steht.',lead.id,alice.id,'group']);
});

test('marking: the agent reads exactly the marked messages; marks only go to one agent',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Markieren',description:'',members:[bob.id]},{cookie:alice.cookie})).data.project;
 const lead=(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data.agents[0];
 const ids=[];
 for(const [who,body] of [[bob,'Farbe Blau gefällt mir nicht.'],[alice,'Was anderes.'],[bob,'Lieber Grün.']]){const id=randomUUID();ids.push(id);await f.post('/api/room',{action:'message',id,project,body},{cookie:who.cookie});}
 assert.equal((await f.post('/api/room',{action:'message',id:randomUUID(),project,body:'Fass zusammen',marked:[ids[0]]},{cookie:alice.cookie})).status,400,'marks need an agent');
 const ask=randomUUID();
 const sent=await f.post('/api/room',{action:'message',id:ask,project,recipient:lead.id,body:'Fass zusammen, was gewünscht ist.',marked:[ids[0],ids[2]]},{cookie:alice.cookie});
 assert.equal(sent.status,200);assert.equal(sent.data.ask,lead.id);
 const msg=(await f.get('/api/room?project='+project,{cookie:bob.cookie})).data.messages.find(m=>m.id===ask);
 assert.deepEqual([msg.marked,msg.markColor],[[ids[0],ids[2]],0],'everyone sees which messages were marked, in which colour');
 await f.post('/api/agent-runs',{project,agent:lead.id,message:ask},{cookie:alice.cookie});
 const job=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 assert.equal(job.place,'marked');
 assert.deepEqual(job.history.map(h=>h.body),['Farbe Blau gefällt mir nicht.','Lieber Grün.']);
});

test('agent ↔ agent: only in a task, one level, counted, stoppable, and paid by whoever started',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Kette',description:'',members:[bob.id]},{cookie:alice.cookie})).data.project;
 const room=async(member=alice)=>(await f.get('/api/room?project='+project,{cookie:member.cookie})).data;
 const lead=(await room()).agents[0];
 const perms={readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:true};
 const mara=(await f.post('/api/room',{action:'agent',id:randomUUID(),project,name:'Mara',role:'frontend',avatarPresetId:'mara',model:'x',permissions:perms},{cookie:alice.cookie})).data.agentId;
 const task=(await f.post('/api/room',{action:'task',id:randomUUID(),project,title:'Farben',description:'',kind:'general'},{cookie:alice.cookie})).data.task;
 const call=(job,tool,args)=>f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool,args},w);
 // In the project chat (no task) there is no asking other agents.
 const plain=randomUUID();await f.post('/api/room',{action:'message',id:plain,project,body:'@Herr Grau Hallo'},{cookie:alice.cookie});
 await f.post('/api/agent-runs',{project,agent:lead.id,message:plain},{cookie:alice.cookie});
 const j0=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 assert.ok(!j0.toolPolicy.allowed.includes('agent.ask'));
 await f.post('/api/agent-worker/finish',{run:j0.run,lease:j0.lease,status:'completed',output:'Hallo.'},w);
 // In a task the lead may ask Mara.
 const q=randomUUID();await f.post('/api/room',{action:'message',id:q,project,topicTask:task,body:'@Herr Grau welche Farbe?'},{cookie:alice.cookie});
 await f.post('/api/agent-runs',{project,agent:lead.id,message:q},{cookie:alice.cookie});
 const a=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 assert.ok(a.toolPolicy.allowed.includes('agent.ask'));
 assert.equal((await call(a,'agent.ask',{agent:'Herr Grau',question:'Selbst?'})).status,400,'not itself');
 assert.equal((await call(a,'agent.ask',{agent:'mara',question:'Welche Farbe passt zum Logo?'})).status,200);
 await f.post('/api/agent-worker/finish',{run:a.run,lease:a.lease,status:'completed',output:'Ich habe Mara gefragt.'},w);
 const thread=(await f.get('/api/collaboration/task?id='+task,{cookie:bob.cookie})).data.thread;
 assert.deepEqual(thread.map(m=>[m.body,m.senderAgent]).slice(-2),[['@Mara Welche Farbe passt zum Logo?',lead.id],['Ich habe Mara gefragt.',lead.id]],'the question is readable for everyone in the task');
 const b=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 assert.equal(b.agent,mara);assert.equal(b.owner,alice.id,'whoever started pays for the passed-on step');
 assert.equal(b.place,'task');
 assert.ok(!b.toolPolicy.allowed.includes('agent.ask'),'B does not pass on (two levels at most)');
 const runs=(await f.get('/api/agent-runs?project='+project,{cookie:alice.cookie})).data.runs;
 const chain=runs.find(r=>r.id===b.run).chain;
 assert.deepEqual([chain.used,chain.limit,chain.depth,chain.active],[2,6,1,true],'counter "2 von 6"');
 // Stop: the whole chain ends, a late answer is not posted.
 assert.equal((await f.post('/api/agent-chains',{run:b.run,action:'stop'},{cookie:bob.cookie})).status,404);
 assert.equal((await f.post('/api/agent-chains',{run:b.run,action:'stop'},{cookie:alice.cookie})).data.stopped,true);
 const late=await f.post('/api/agent-worker/finish',{run:b.run,lease:b.lease,status:'completed',output:'Grün.'},w);
 assert.equal(late.data.status,'cancelled');
 const after=(await f.get('/api/agent-runs?project='+project,{cookie:alice.cookie})).data.runs.find(r=>r.id===a.run).chain;
 assert.equal(after.stopped,true);
 assert.equal((await f.post('/api/agent-chains',{run:a.run,action:'continue'},{cookie:alice.cookie})).data.limit,7,'"Weitermachen?" opens another round');
});

test('agent ↔ agent: what the colleague delivers is the task\'s result; a person\'s own question is not',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Ergebnis',description:''},{cookie:alice.cookie})).data.project;
 const lead=(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data.agents[0];
 const perms={readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:true};
 const mara=(await f.post('/api/room',{action:'agent',id:randomUUID(),project,name:'Mara',role:'frontend',avatarPresetId:'mara',model:'x',permissions:perms},{cookie:alice.cookie})).data.agentId;
 const task=(await f.post('/api/room',{action:'task',id:randomUUID(),project,title:'Farben',description:'',kind:'general'},{cookie:alice.cookie})).data.task;
 const view=async()=>(await f.get('/api/team',{cookie:alice.cookie})).data.tasks.find(x=>x.id===task);
 // A person asks Mara in the task: her answer is just an answer.
 const own=randomUUID();await f.post('/api/room',{action:'message',id:own,project,topicTask:task,body:'@Mara magst du Blau?'},{cookie:alice.cookie});
 await f.post('/api/agent-runs',{project,agent:mara,message:own},{cookie:alice.cookie});
 const j=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 await f.post('/api/agent-worker/finish',{run:j.run,lease:j.lease,status:'completed',output:'Ja.'},w);
 assert.equal((await view()).completion.ready,false,'no result from a plain answer');
 // The lead hands the task to Mara: her delivery is the result and the task waits for approval.
 const q=randomUUID();await f.post('/api/room',{action:'message',id:q,project,topicTask:task,body:'@Herr Grau welche Farbe?'},{cookie:alice.cookie});
 await f.post('/api/agent-runs',{project,agent:lead.id,message:q},{cookie:alice.cookie});
 const a=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 await f.post('/api/agent-worker/tool',{run:a.run,lease:a.lease,callId:randomUUID().slice(0,16),tool:'agent.ask',args:{agent:'mara',question:'Welche Farbe?'}},w);
 await f.post('/api/agent-worker/finish',{run:a.run,lease:a.lease,status:'completed',output:'Ich frage Mara.'},w);
 assert.equal((await view()).completion.ready,false,'the lead\'s own answer is no result');
 const b=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 await f.post('/api/agent-worker/finish',{run:b.run,lease:b.lease,status:'completed',output:'Ein ruhiges Blau.'},w);
 const done=await view();
 assert.equal(done.completion.result.body,'Ein ruhiges Blau.','her delivery is the result');assert.equal(done.assignee,alice.id);
 assert.equal(done.status,'review','"Zum Freigeben": the project\'s approval rule decides who may close it');
});

test('reply: answering an agent\'s message asks that agent without "@"; answering a person does not',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Antwort',description:''},{cookie:alice.cookie})).data.project;
 const lead=(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data.agents[0];
 const q=randomUUID();await f.post('/api/room',{action:'message',id:q,project,body:'@Herr Grau Hallo'},{cookie:alice.cookie});
 await f.post('/api/agent-runs',{project,agent:lead.id,message:q},{cookie:alice.cookie});
 const j=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 const done=(await f.post('/api/agent-worker/finish',{run:j.run,lease:j.lease,status:'completed',output:'Guten Tag.'},w)).data;
 const reply=await f.post('/api/room',{action:'message',id:randomUUID(),project,body:'Und weiter?',replyTo:done.message},{cookie:alice.cookie});
 assert.equal(reply.data.ask,lead.id,'the reply goes to the agent whose message it answers');
 const plain=await f.post('/api/room',{action:'message',id:randomUUID(),project,body:'Nur so',replyTo:q},{cookie:alice.cookie});
 assert.equal(plain.data.ask??null,null,'a reply to a person asks nobody');
 const none=await f.post('/api/room',{action:'message',id:randomUUID(),project,body:'Ohne Bezug'},{cookie:alice.cookie});
 assert.equal(none.data.ask??null,null,'without reply or @ agents stay quiet');
});

test('scope areas: two projects on one repository know each other; the area is the admin\'s; changes outside are named',async t=>{
 const {outsideScope}=await import('../studio/ui/diff.ts');
 const f=await fixture(t),[alice,bob]=f.members;
 const make=async title=>(await f.post('/api/room',{action:'create',id:randomUUID(),title,description:''},{cookie:alice.cookie})).data.project;
 const front=await make('Frontend'),back=await make('Backend');
 for(const p of [front,back]){const k='room:v1:project:'+p,v=JSON.parse(f.app.db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(k).value);f.app.db.prepare('UPDATE workspace_meta SET value=? WHERE key=?').run(JSON.stringify({...v,repository:'https://github.com/example/app'}),k);}
 const settings=async(p,scope,member=alice)=>{const r=(await f.get('/api/room?project='+p,{cookie:alice.cookie})).data;return f.post('/api/team',{action:'project',project:p,revision:r.meta.revision,title:r.project.title,description:'',archived:false,scope},{cookie:member.cookie});};
 assert.equal((await settings(front,['frontend'])).status,200);
 assert.equal((await settings(back,['backend/','../etc'])).status,400,'no paths that climb out');
 assert.equal((await settings(back,['backend/'])).status,200);
 const room=(await f.get('/api/room?project='+front,{cookie:alice.cookie})).data;
 assert.deepEqual(room.meta.scope,['frontend/']);
 assert.deepEqual(room.neighbours.map(n=>[n.title,n.scope]),[['Backend',['backend/']]]);
 const context=(await f.get('/api/room/context?project='+front,{cookie:alice.cookie})).data.text;
 assert.match(context,/ZUSTÄNDIGKEITSBEREICH DIESES PROJEKTS: frontend\//);
 assert.match(context,/NACHBARPROJEKT „Backend“ im selben Repository: backend\//);
 const diff='diff --git a/frontend/app.tsx b/frontend/app.tsx\n+x\ndiff --git a/backend/api.mjs b/backend/api.mjs\n+y\ndiff --git a/README.md b/README.md\n+z\n';
 assert.deepEqual(outsideScope(diff,room.meta.scope,room.neighbours),[{file:'backend/api.mjs',owner:'Backend'},{file:'README.md',owner:null}]);
 assert.deepEqual(outsideScope(diff,[],room.neighbours),[],'without an area nothing is outside');
 void bob;
});

test('company: the developer changes code in the asker\'s own copy; the lead hands work over and does not code himself',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Code',description:''},{cookie:alice.cookie})).data.project;
 const room=async()=>(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data;
 const lead=(await room()).agents[0];
 const otto=(await f.post('/api/room',{action:'agent',id:randomUUID(),project,name:'Otto',role:'developer',avatarPresetId:'otto',model:'x',permissions:{readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:false}},{cookie:alice.cookie})).data.agentId;
 const task=(await f.post('/api/room',{action:'task',id:randomUUID(),project,title:'Überschrift kürzen',description:'Oben zu lang',kind:'code',criteria:'Passt in zwei Zeilen'},{cookie:alice.cookie})).data.task;
 const general=(await f.post('/api/room',{action:'task',id:randomUUID(),project,title:'Texte sammeln',description:'',kind:'general'},{cookie:alice.cookie})).data.task;
 const ask=async(agent,name,topic,body)=>{const id=randomUUID();await f.post('/api/room',{action:'message',id,project,topicTask:topic,body:'@'+name+' '+body},{cookie:alice.cookie});await f.post('/api/agent-runs',{project,agent,message:id},{cookie:alice.cookie});return (await f.post('/api/agent-worker/claim',{},w)).data.job;};
 const finish=job=>f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'ok'},w);
 const call=(job,args)=>f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool:'code.change',args},w);
 let job=await ask(lead.id,'Herr Grau',task,'Mach die Überschrift kürzer.');
 assert.ok(!job.toolPolicy.allowed.includes('code.change'),'the lead does not code');
 assert.ok(job.toolPolicy.allowed.includes('agent.ask'),'he hands it to the team');
 assert.deepEqual(job.team.map(m=>[m.name,m.job]),[['Herr Grau','leitet, verteilt Arbeit, stellt ein'],['Otto','ändert Code']]);
 await finish(job);
 job=await ask(otto,'Otto',general,'Ändere Code.');assert.ok(!job.toolPolicy.allowed.includes('code.change'),'not in a task without code');await finish(job);
 job=await ask(otto,'Otto',task,'Mach die Überschrift kürzer.');assert.ok(job.toolPolicy.allowed.includes('code.change'));
 assert.equal((await call(job,{instruction:'Kürze die Überschrift in site/index.html.'})).status,409,'no Werkstatt yet');
 await finish(job);
 const device=randomUUID();
 f.app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(device,alice.id,'Alices PC',randomUUID(),Date.now()+3600000);
 f.app.db.prepare('INSERT INTO runner_project_state(device,projects,updated) VALUES(?,?,?)').run(device,JSON.stringify([{id:project,check:true}]),Date.now());
 job=await ask(otto,'Otto',task,'Mach die Überschrift kürzer.');
 const done=await call(job,{instruction:'Kürze die Überschrift in site/index.html.'});
 assert.equal(done.status,200,JSON.stringify(done.data));assert.equal(done.data.result.preparedCopy,true);
 assert.equal((await call(job,{instruction:'Noch mal.'})).status,429,'one code run per answer');
 await finish(job);
 const jobs=f.app.db.prepare('SELECT action,owner,device,payload,status FROM jobs WHERE project=? ORDER BY created').all(project);
 assert.deepEqual(jobs.map(j=>[j.action,j.owner,j.device,j.status]),[['prepare',alice.id,device,'queued'],['codex',alice.id,device,'queued']],'whoever asks pays, in their own copy');
 const payload=JSON.parse(jobs[1].payload);
 assert.match(payload.prompt,/Überschrift kürzen[\s\S]*Fertig, wenn: Passt in zwei Zeilen[\s\S]*Kürze die Überschrift in site\/index.html[\s\S]*Committe nicht, pushe nicht/);
 assert.equal(payload.agent.name,'Otto');
 assert.equal((await room()).tasks.find(t=>t.id===task).assignee,alice.id,'the person who asked takes the task');
 job=await ask(otto,'Otto',task,'Und noch die Farbe.');
 assert.equal((await call(job,{instruction:'Ändere die Farbe.'})).status,409,'the copy is busy');
 await finish(job);
});

test('company: the developer reports in the task when his code run ends, and the reviewer is asked right away',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Kette',description:''},{cookie:alice.cookie})).data.project;
 const hire=(name,role)=>f.post('/api/room',{action:'agent',id:randomUUID(),project,name,role,avatarPresetId:'otto',model:'x',permissions:{readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:false}},{cookie:alice.cookie}).then(r=>r.data.agentId);
 const otto=await hire('Otto','developer'),kern=await hire('Frau Kern','reviewer');
 const task=(await f.post('/api/room',{action:'task',id:randomUUID(),project,title:'Überschrift kürzen',description:'',kind:'code',criteria:'Passt in zwei Zeilen'},{cookie:alice.cookie})).data.task;
 const devToken=randomUUID(),device=randomUUID();
 f.app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(device,alice.id,'Alices PC',digest(devToken),Date.now()+3600000);
 f.app.db.prepare('INSERT INTO runner_project_state(device,projects,updated) VALUES(?,?,?)').run(device,JSON.stringify([{id:project,check:true}]),Date.now());
 const thread=async()=>(await f.get('/api/collaboration/task?id='+task,{cookie:alice.cookie})).data.thread;
 const run=async instruction=>{
  const id=randomUUID();await f.post('/api/room',{action:'message',id,project,topicTask:task,body:'@Otto '+instruction},{cookie:alice.cookie});
  await f.post('/api/agent-runs',{project,agent:otto,message:id},{cookie:alice.cookie});
  const job=(await f.post('/api/agent-worker/claim',{},w)).data.job;
  assert.equal((await f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool:'code.change',args:{instruction}},w)).status,200);
  await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Ich lege los.'},w);
  // The Werkstatt: the copy is ready, then the code run is taken and reported.
  f.app.db.prepare("UPDATE jobs SET status='completed',result='{}' WHERE project=? AND action='prepare'").run(project);
  return (await f.post('/api/runner/poll',{},{token:devToken})).data.job;
 };
 // A failed run: Otto says why, nobody else is asked.
 let code=await run('Kürze die Überschrift.');
 assert.equal(code.action,'codex');
 await f.post('/api/runner/report',{id:code.id,lease:code.lease,ok:false,result:{error:'Für Programmierläufe zuerst unter Mein Konto die Anmeldung verbinden.'}},{token:devToken});
 let last=(await thread()).at(-1);
 assert.deepEqual([last.senderAgent,last.recipient],[otto,alice.id]);
 assert.match(last.body,/^Das hat nicht geklappt: Für Programmierläufe/);
 assert.equal((await f.post('/api/agent-worker/claim',{},w)).data.job,null,'no reviewer for a failed run');
 // A run that changed something: Otto reports what, and Frau Kern is asked in the same task.
 code=await run('Noch mal bitte.');
 const diff='diff --git a/site/index.html b/site/index.html\n-<h1>Sehr lange Überschrift</h1>\n+<h1>Kurz</h1>';
 await f.post('/api/runner/report',{id:code.id,lease:code.lease,ok:true,result:{output:'Überschrift auf ein Wort gekürzt.',status:' M site/index.html',diff,branch:'x'}},{token:devToken});
 last=(await thread()).at(-1);
 assert.deepEqual([last.senderAgent,last.recipient],[otto,kern]);
 assert.match(last.body,/^Fertig mit „Überschrift kürzen“\.\n\nÜberschrift auf ein Wort gekürzt\.\n\nGeändert: site\/index\.html\n\n@Frau Kern bitte prüf die Änderung\.$/);
 const review=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 assert.deepEqual([review.agent,review.place],[kern,'task']);
 assert.ok(review.toolPolicy.allowed.includes('change.read'));
 const read=await f.post('/api/agent-worker/tool',{run:review.run,lease:review.lease,callId:randomUUID().slice(0,16),tool:'change.read',args:{}},w);
 assert.equal(read.data.result.change,diff,'the reviewer reads exactly what Otto changed');
 await f.post('/api/agent-worker/finish',{run:review.run,lease:review.lease,status:'completed',output:'Passt, gerne freigeben.'},w);
 assert.deepEqual((await thread()).at(-1).body,'Passt, gerne freigeben.');
 // Reported once, however often the server looks again.
 await f.post('/api/runner/report',{id:code.id,lease:code.lease,ok:true,result:{}},{token:devToken});
 assert.equal((await thread()).filter(m=>m.body.startsWith('Fertig mit')).length,1);
});

test('company: the lead proposes a task for a colleague, who starts once it is accepted; the lead hires, capped and without duplicates',async t=>{
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Firma',description:''},{cookie:alice.cookie})).data.project;
 const room=async()=>(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data;
 const lead=(await room()).agents[0];
 const ask=async body=>{const id=randomUUID();await f.post('/api/room',{action:'message',id,project,body:'@Herr Grau '+body},{cookie:alice.cookie});await f.post('/api/agent-runs',{project,agent:lead.id,message:id},{cookie:alice.cookie});return (await f.post('/api/agent-worker/claim',{},w)).data.job;};
 const call=(job,tool,args)=>f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool,args},w);
 const finish=async job=>(await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'ok'},w)).data.message;
 // Hiring: proposed, accepted with one tap, the new colleague has the role's job.
 let job=await ask('Wir brauchen jemanden, der programmiert.');
 assert.ok(job.toolPolicy.allowed.includes('team.hire'));
 assert.equal((await call(job,'team.hire',{role:'developer',name:'Otto',why:'Niemand im Team ändert Code.'})).status,200);
 let message=await finish(job);
 const card=(await room()).messages.find(m=>m.id===message).proposalCard;
 assert.deepEqual([card.kind,card.title,card.hire.role],['hire','Otto','developer']);
 const hired=await f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'accept'},{cookie:alice.cookie});
 const otto=(await room()).agents.find(a=>a.id===hired.data.agent);
 assert.deepEqual([otto.name,otto.role,otto.lead],['Otto','developer',false]);
 job=await ask('Noch einen Entwickler bitte.');
 assert.equal((await call(job,'team.hire',{role:'developer',name:'Anna',why:'Mehr Leute.'})).status,409,'one per role');
 await finish(job);
 // Handing over: the lead proposes a task for Otto; accepting it starts Otto in the task, paid by Alice.
 job=await ask('Mach die README besser.');
 assert.equal((await call(job,'task.propose',{title:'README verbessern',description:'Ein Satz, wofür das Projekt ist.',kind:'code',who:'Otto'})).status,200);
 message=await finish(job);
 const proposal=(await room()).messages.find(m=>m.id===message).proposalCard;
 assert.equal(proposal.who,otto.id);
 const accepted=await f.post('/api/agent-proposals/decide',{proposal:proposal.id,decision:'accept'},{cookie:alice.cookie});
 assert.ok(accepted.data.started);
 const next=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 assert.deepEqual([next.agent,next.owner,next.place],[otto.id,alice.id,'task']);
 assert.match(next.prompt,/^@Otto bitte übernimm: README verbessern/);
 assert.ok(!next.toolPolicy.allowed.includes('agent.ask'),'Otto does not pass it on');
 await finish(next);
 // The team is capped.
 for(const [role,name] of [['researcher','Eule'],['reviewer','Kern'],['security','Dachs'],['strategy','Fuchs']]){
  job=await ask('Stell ein: '+name);
  const r=await call(job,'team.hire',{role,name,why:'Test'});
  const m=await finish(job);
  if(r.status===200){const c=(await room()).messages.find(x=>x.id===m).proposalCard;await f.post('/api/agent-proposals/decide',{proposal:c.id,decision:'accept'},{cookie:alice.cookie});}
 }
 assert.equal((await room()).agents.filter(a=>a.active!==false).length,6);
 job=await ask('Noch jemand?');
 assert.ok(!job.toolPolicy.allowed.includes('team.hire'),'a full team hires nobody');
 await finish(job);
});

test('web research: only public https pages, every address checked, redirects too; the page is data',async t=>{
 const {publicAddress,checkWebUrl,readWebPage,pageText}=await import('./web-read.mjs');
 for(const a of ['127.0.0.1','10.1.2.3','172.20.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','fe80::1','fd00::1','::ffff:127.0.0.1','2001:db8::1','64:ff9b::7f00:1'])assert.equal(publicAddress(a),false,a);
 for(const a of ['93.184.216.34','2606:2800:220:1:248:1893:25c8:1946'])assert.equal(publicAddress(a),true,a);
 for(const bad of ['http://example.com','https://127.0.0.1/','https://[::1]/','https://localhost/','https://user:pw@example.com/','https://example.com:8443/','https://intranet/','file:///etc/passwd'])assert.throws(()=>checkWebUrl(bad),undefined,bad);
 const lookup=table=>(host,o,cb)=>cb(null,(table[host]??[]).map(address=>({address,family:address.includes(':')?6:4})));
 await assert.rejects(readWebPage('https://evil.example/',{lookup:lookup({'evil.example':['93.184.216.34','10.0.0.1']}),request:()=>assert.fail('no request')}),/öffentliche Internet/,'one private address is enough to refuse');
 const pages={'https://a.example/':{redirect:'https://b.example/x'},'https://b.example/x':{body:'<html><title>B</title><script>steal()</script><p>Hallo &amp; Welt</p></html>',type:'text/html'}};
 const seen=[];
 const ok=await readWebPage('https://a.example/',{lookup:lookup({'a.example':['93.184.216.34'],'b.example':['93.184.216.35']}),request:async(url,address)=>{seen.push([url.toString(),address.address]);return pages[url.toString()];}});
 assert.deepEqual(seen,[['https://a.example/','93.184.216.34'],['https://b.example/x','93.184.216.35']],'connects to exactly the checked address');
 assert.deepEqual([ok.title,ok.text,ok.trust],['B','Hallo & Welt','untrusted-web-content']);
 await assert.rejects(readWebPage('https://a.example/',{lookup:lookup({'a.example':['93.184.216.34'],'b.example':['127.0.0.1']}),request:async url=>pages[url.toString()]}),/öffentliche Internet/,'a redirect into the server is refused');
 assert.equal(pageText('<style>x{}</style><b>fett</b>').text,'fett');
 // Research is the researcher's job: the lead and a developer do not get the tool.
 const f=await fixture(t),[alice]=f.members,[worker]=f.secrets,w={token:worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Web',description:''},{cookie:alice.cookie})).data.project;
 const lead=(await f.get('/api/room?project='+project,{cookie:alice.cookie})).data.agents[0];
 const perms={readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:false};
 const eule=(await f.post('/api/room',{action:'agent',id:randomUUID(),project,name:'Eule',role:'researcher',avatarPresetId:'eule',model:'x',permissions:perms},{cookie:alice.cookie})).data.agentId;
 const ask=async(agent,body)=>{const id=randomUUID();await f.post('/api/room',{action:'message',id,project,recipient:agent,body},{cookie:alice.cookie});await f.post('/api/agent-runs',{project,agent,message:id},{cookie:alice.cookie});return (await f.post('/api/agent-worker/claim',{},w)).data.job;};
 const lj=await ask(lead.id,'lies nach');assert.ok(!lj.toolPolicy.allowed.includes('web.read'),'the lead hands research to the team');
 await f.post('/api/agent-worker/finish',{run:lj.run,lease:lj.lease,status:'completed',output:'ok'},w);
 const job=await ask(eule,'lies nach');
 assert.ok(job.toolPolicy.allowed.includes('web.read'));
 assert.equal(job.search,true,'the researcher searches the web like ChatGPT');
 assert.equal(lj.search,false,'the lead does not');
 const local=await f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool:'web.read',args:{url:'https://localhost/admin'}},w);
 assert.equal(local.status,200);assert.match(local.data.result.error,/öffentliche Webseiten/,'refusal reaches the model as data');
 const mara=(await f.post('/api/room',{action:'agent',id:randomUUID(),project,name:'Mara',role:'frontend',avatarPresetId:'mara',model:'x',permissions:perms},{cookie:alice.cookie})).data.agentId;
 await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'ok'},w);
 const j2=await ask(mara,'lies nach');
 assert.ok(!j2.toolPolicy.allowed.includes('web.read'));
 assert.equal((await f.post('/api/agent-worker/tool',{run:j2.run,lease:j2.lease,callId:randomUUID().slice(0,16),tool:'web.read',args:{url:'https://example.com/'}},w)).status,403);
});

test('company: the app shows the same jobs the server enforces',async()=>{
 const {ROLE_JOBS:app,JOBS,TEAM_LIMIT:appLimit,jobOf:appJob}=await import('../studio/ui/model.ts');
 const {ROLE_JOBS:server,HIRABLE,TEAM_LIMIT,canCode,canResearch,canReview,canLead}=await import('./agent-roles.mjs');
 assert.deepEqual(JSON.parse(JSON.stringify(app)),JSON.parse(JSON.stringify(server)));
 assert.equal(appLimit,TEAM_LIMIT);
 assert.deepEqual(JOBS.map(j=>j.role).sort(),Object.keys(HIRABLE).sort(),'the app offers exactly the jobs the lead can hire for');
 for(const j of JOBS)assert.equal(j.face,HIRABLE[j.role].face,j.role);
 for(const role of ['developer','frontend','researcher','strategy','reviewer','security','advisor','coordinator'])for(const lead of [false,true]){
  const agent={role,lead,active:true,permissions:{readProject:true}},job=appJob(agent);
  assert.deepEqual([job.code,job.web,job.review,job.lead],[canCode(agent),canResearch(agent),canReview(agent),canLead(agent)],role+lead);
 }
});
