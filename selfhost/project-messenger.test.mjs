import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {filterMessengerMessages,memberRoleSummary} from '../studio/room-model.ts';

async function fixture(t){
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-messenger-'));
 const origin='http://127.0.0.1:44891';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'test.sqlite'),origin,previewOrigin:'http://127.0.0.1:44892',resetMailer:null});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const host='http://127.0.0.1:'+app.server.address().port;
 async function post(body,cookie,route='/api/room'){
  const r=await fetch(host+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 async function get(route,cookie){
  const r=await fetch(host+route,{headers:cookie?{Cookie:cookie}:{}});
  return {status:r.status,data:await r.json()};
 }
 const people=[];
 for(const [index,name] of ['Marco Fixture','Markus Fixture','Gast Fixture'].entries()){
  const email=`person${index}@fixture.invalid`,invite=createInvite(app.db,email,index===0?'owner':'member');
  const result=await post({invite,name,password:'isolated-fixture-password-2026'},null,'/api/auth/register');
  assert.equal(result.status,200);
  const member=app.db.prepare('SELECT id FROM members WHERE email=?').get(email);
  people.push({...member,cookie:result.cookie,name});
 }
 const [marco,markus,viewer]=people;
 return {app,post,get,marco,markus,viewer};
}

test('project messenger: AI team members, addressed messages, task topics, coordinator handoffs, and role boundaries',async t=>{
 const {post,get,marco,markus,viewer}=await fixture(t);

 const created=await post({action:'create',id:'op-room-1',title:'Mobile Messenger',description:'Gemeinsame Projektsteuerung'},marco.cookie);
 assert.equal(created.status,200);
 const project=created.data.project;

 // Set Gast to viewer-only in this project
 const roleRes=await post({action:'roles',project,member:viewer.id,roles:['viewer']},marco.cookie,'/api/project-roles');
 assert.equal(roleRes.status,200);

 // Viewer cannot create project AI agents
 const deniedAgent=await post({action:'agent',id:'op-agent-denied',project,name:'Unbefugt',role:'developer',model:'gpt-5-codex'},viewer.cookie);
 assert.equal(deniedAgent.status,403);

 // Marco creates a Coordinator agent (idempotent replay + conflict detection verified)
 const coordPayload={
  action:'agent',
  id:'op-agent-coord',
  project,
  name:'Koordinator-Agent',
  avatar:'KO',
  role:'coordinator',
  model:'gpt-5-codex',
  purpose:'Zerlegt Projektziele und delegiert Teilaufgaben begrenzt an Spezial-Agenten',
  capabilities:['chat','task-plan']
 };
 const coordRes=await post(coordPayload,marco.cookie);
 assert.equal(coordRes.status,200);
 const coordId=coordRes.data.agentId;
 assert.ok(coordId);

 const coordReplay=await post(coordPayload,marco.cookie);
 assert.equal(coordReplay.status,200);
 assert.equal(coordReplay.data.agentId,coordId);

 const coordConflict=await post({...coordPayload,name:'Anderer Name'},marco.cookie);
 assert.equal(coordConflict.status,409);

 // Markus creates a Reviewer specialist agent
 const revAgentRes=await post({
  action:'agent',
  id:'op-agent-rev',
  project,
  name:'Prüf-Agent',
  avatar:'PR',
  role:'reviewer',
  model:'gpt-4.1',
  purpose:'Prüft Änderungen auf mobile Bedienbarkeit und Tests',
  capabilities:['chat','review-support']
 },markus.cookie);
 assert.equal(revAgentRes.status,200);
 const revAgentId=revAgentRes.data.agentId;

 // Create a task to serve as a conversation topic
 const taskRes=await post({
  action:'task',
  id:'op-task-1',
  project,
  title:'Messenger-Header auf dem Smartphone optimieren',
  description:'Kein horizontaler Überlauf'
 },marco.cookie);
 assert.equal(taskRes.status,200);
 const taskId=taskRes.data.task;

 // Marco sends a message addressed to Markus and linked to the task topic
 const msg1=await post({
  action:'message',
  id:'msg-1',
  project,
  body:'@Markus schaust du dir die Kontaktliste auf dem Smartphone an?',
  topicTask:taskId,
  recipient:markus.id
 },marco.cookie);
 assert.equal(msg1.status,200);

 // Non-coordinator agent cannot delegate via handoff
 const deniedHandoff=await post({
  action:'message',
  id:'msg-denied-handoff',
  project,
  body:'Versuch einer Übergabe durch Prüf-Agent',
  senderAgent:revAgentId,
  handoff:{toAgent:coordId,summary:'Darf nicht delegieren'}
 },markus.cookie);
 assert.equal(deniedHandoff.status,403);

 // Coordinator agent cannot delegate to itself
 const selfHandoff=await post({
  action:'message',
  id:'msg-self-handoff',
  project,
  body:'Selbstübergabe',
  senderAgent:coordId,
  handoff:{toAgent:coordId,summary:'Nicht an sich selbst'}
 },marco.cookie);
 assert.equal(selfHandoff.status,400);

 // Coordinator delegates a bounded review check to the Reviewer agent on the task topic
 const handoffMsg=await post({
  action:'message',
  id:'msg-handoff-1',
  project,
  body:'Bitte prüfe die mobilen Abstände und Kontraste für diese Aufgabe.',
  replyTo:'msg-1',
  topicTask:taskId,
  senderAgent:coordId,
  handoff:{toAgent:revAgentId,summary:'Mobile Viewport-Prüfung (<=650px) für Messenger-Header',status:'delegated'}
 },marco.cookie);
 assert.equal(handoffMsg.status,200);

 // Verify room state returns agents, enriched member roles, and linked message metadata
 const roomState=await get(`/api/room?project=${encodeURIComponent(project)}`,markus.cookie);
 assert.equal(roomState.status,200);
 assert.equal(roomState.data.agents.length,2);
 const coord=roomState.data.agents.find(a=>a.id===coordId);
 assert.equal(coord.name,'Koordinator-Agent');
 assert.ok(coord.capabilities.includes('task-delegate'),'coordinator automatically receives task-delegate');

 const m1=roomState.data.messages.find(m=>m.id==='msg-1');
 assert.equal(m1.topicTask,taskId);
 assert.equal(m1.taskId,taskId);
 assert.equal(m1.recipient,markus.id);
 assert.equal(m1.recipientKind,'member');

 const mh=roomState.data.messages.find(m=>m.id==='msg-handoff-1');
 assert.equal(mh.kind,'agent-handoff');
 assert.equal(mh.senderAgent,coordId);
 assert.equal(mh.recipient,revAgentId);
 assert.equal(mh.recipientKind,'agent');
 assert.equal(mh.topicTask,taskId);
 assert.equal(mh.replyTo,'msg-1');
 assert.equal(mh.handoff.toAgent,revAgentId);
 assert.equal(mh.handoff.summary,'Mobile Viewport-Prüfung (<=650px) für Messenger-Header');

 // Verify pure filter helpers on the returned messages
 assert.equal(filterMessengerMessages(roomState.data.messages,{kind:'all'}).length,2);
 assert.equal(filterMessengerMessages(roomState.data.messages,{kind:'handoffs'}).length,1);
 assert.equal(filterMessengerMessages(roomState.data.messages,{kind:'member',id:markus.id}).length,1);
 assert.equal(filterMessengerMessages(roomState.data.messages,{kind:'agent',id:revAgentId}).length,1);
 assert.equal(filterMessengerMessages(roomState.data.messages,{kind:'topic',taskId}).length,2);
 assert.equal(filterMessengerMessages(roomState.data.messages,{kind:'all'},'Viewport-Prüfung').length,0);
 assert.equal(filterMessengerMessages(roomState.data.messages,{kind:'all'},'mobilen Abstände').length,1);

 const guestMember=roomState.data.members.find(m=>m.id===viewer.id);
 assert.equal(memberRoleSummary(guestMember),'Zuschauer');
});
