import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {filterMessengerMessages,memberRoleSummary,agentEffectivePermissions,agentExecutionStatus} from '../studio/room-model.ts';
import {FIELD_GUILD_R2_PRESETS,filterAvatarPresets,findAvatarPreset,resolveAgentAvatar} from '../studio/avatar-catalog.ts';

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
 return {app,host,post,get,marco,markus,viewer};
}

test('Field Guild R2 avatar catalog: 12 stable presets, human/animal filters, asset files, and fallback resolution',async t=>{
 const {host}=await fixture(t);
 const expectedIds=['leitwolf','herr-grau','mara','frau-kern','otto','nova','dachs','fuchs','baer','rabe','schaefer','eule'];
 assert.deepEqual(FIELD_GUILD_R2_PRESETS.map(p=>p.id),expectedIds);
 assert.equal(filterAvatarPresets('all').length,12);
 assert.equal(filterAvatarPresets('human').length,6);
 assert.equal(filterAvatarPresets('animal').length,6);
 assert.deepEqual(filterAvatarPresets('human').map(p=>p.id),['leitwolf','herr-grau','mara','frau-kern','otto','nova']);
 assert.deepEqual(filterAvatarPresets('animal').map(p=>p.id),['dachs','fuchs','baer','rabe','schaefer','eule']);
 assert.equal(filterAvatarPresets('all','Security').length,1);
 assert.equal(filterAvatarPresets('all','Security')[0].id,'rabe');

 for(const preset of FIELD_GUILD_R2_PRESETS){
  const pngRes=await fetch(host+preset.assetPath);
  assert.equal(pngRes.status,200,`PNG asset missing for ${preset.id}`);
  assert.equal(pngRes.headers.get('content-type'),'image/png');
  const webpRes=await fetch(host+preset.webpPath);
  assert.equal(webpRes.status,200,`WebP asset missing for ${preset.id}`);
  assert.equal(webpRes.headers.get('content-type'),'image/webp');
  const thumbRes=await fetch(host+preset.thumbWebpPath);
  assert.equal(thumbRes.status,200,`Thumbnail WebP asset missing for ${preset.id}`);
  assert.equal(thumbRes.headers.get('content-type'),'image/webp');
 }

 const missingRes=await fetch(host+'/avatars/field-guild-r2/unbekannt.png');
 assert.equal(missingRes.status,404);

 const grau=findAvatarPreset('herr-grau');
 assert.ok(grau);
 assert.equal(grau.assetPath,'/avatars/field-guild-r2/herr-grau.png');
 assert.equal(grau.fallbackCode,'HG');

 const resolvedPreset=resolveAgentAvatar({name:'Architekt Grau',avatarPresetId:'herr-grau',avatar:''});
 assert.equal(resolvedPreset.assetPath,'/avatars/field-guild-r2/herr-grau.png');
 assert.equal(resolvedPreset.webpPath,'/avatars/field-guild-r2/herr-grau.webp');
 assert.equal(resolvedPreset.thumbWebpPath,'/avatars/field-guild-r2/herr-grau-sm.webp');
 assert.equal(resolvedPreset.fallbackCode,'HG');

 const resolvedCustom=resolveAgentAvatar({name:'Eigener Kollege',avatarPresetId:'',avatar:'EK'});
 assert.equal(resolvedCustom.assetPath,null);
 assert.equal(resolvedCustom.fallbackCode,'EK');
});

test('project messenger & Field Guild R2 profiles: configurable agent profiles, server-enforced permissions, and origin honesty',async t=>{
 const {app,post,get,marco,markus,viewer}=await fixture(t);

 const created=await post({action:'create',id:'op-room-1',title:'Mobile Messenger',description:'Gemeinsame Projektsteuerung'},marco.cookie);
 assert.equal(created.status,200);
 const project=created.data.project;

 // Set Gast to viewer-only in this project
 const roleRes=await post({action:'roles',project,member:viewer.id,roles:['viewer']},marco.cookie,'/api/project-roles');
 assert.equal(roleRes.status,200);

 // Viewer cannot create project AI agents
 const deniedAgent=await post({action:'agent',id:'op-agent-denied',project,name:'Unbefugt',role:'developer',model:'gpt-5-codex'},viewer.cookie);
 assert.equal(deniedAgent.status,403);

 // Marco creates a Coordinator agent with Field Guild R2 preset "leitwolf"
 const coordPayload={
  action:'agent',
  id:'op-agent-coord',
  project,
  name:'Leitwolf',
  nickname:'Taktgeber',
  avatar:'LW',
  avatarPresetId:'leitwolf',
  role:'coordinator',
  model:'gpt-5-codex',
  purpose:'Zerlegt Projektziele und delegiert Teilaufgaben begrenzt an Spezial-Agenten',
  personality:'Ruhig, verbindlich, behält Abhängigkeiten im Blick',
  responsibility:'Projektkoordination und strukturierte Übergaben',
  knowledgeScope:'Gesamtes Projekt, Aufgaben und Entscheidungen',
  contextSources:['messages','tasks','decisions','repository'],
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

 // Markus creates "Herr Grau" with full Field Guild R2 profile fields (character chosen independently of role/model)
 const grauRes=await post({
  action:'agent',
  id:'op-agent-grau',
  project,
  name:'Herr Grau',
  nickname:'Der Prüfer',
  avatar:'HG',
  avatarPresetId:'herr-grau',
  role:'advisor',
  model:'gpt-4.1',
  purpose:'Prüft Architektur, Systemgrenzen und mobile Bedienbarkeit',
  personality:'Trocken, präzise, skeptisch gegenüber unnötiger Komplexität',
  responsibility:'Architekturberatung und Review-Vorbereitung',
  knowledgeScope:'selfhost/, studio/, Architektur-Entscheidungen',
  contextSources:['messages','tasks','decisions','repository','runs'],
  capabilities:['chat','review-support'],
  permissions:{
   readProject:true,
   writeMessages:true,
   manageTasks:false,
   editCode:false,
   prepareReviews:true,
   delegateAgents:false
  }
 },markus.cookie);
 assert.equal(grauRes.status,200);
 const revAgentId=grauRes.data.agentId;

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

 // Agent without delegateAgents permission cannot delegate via handoff
 const deniedHandoff=await post({
  action:'message',
  id:'msg-denied-handoff',
  project,
  body:'Versuch einer Übergabe durch Herr Grau',
  senderAgent:revAgentId,
  handoff:{toAgent:coordId,summary:'Darf nicht delegieren'}
 },markus.cookie);
 assert.equal(deniedHandoff.status,403);

 // Security check: Avatar or role alone NEVER grants permission if permissions.delegateAgents is false
 const restrictedCoordRes=await post({
  action:'agent',
  id:'op-agent-restricted-coord',
  project,
  name:'Leitwolf Ohne Delegationsrecht',
  avatarPresetId:'leitwolf',
  role:'coordinator',
  model:'gpt-5-codex',
  capabilities:['chat','task-plan','task-delegate'],
  permissions:{
   readProject:true,
   writeMessages:true,
   manageTasks:false,
   editCode:false,
   prepareReviews:false,
   delegateAgents:false
  }
 },marco.cookie);
 assert.equal(restrictedCoordRes.status,200);
 const restrictedHandoff=await post({
  action:'message',
  id:'msg-restricted-handoff',
  project,
  body:'Trotz Rolle coordinator und Avatar leitwolf ist delegateAgents gesperrt',
  senderAgent:restrictedCoordRes.data.agentId,
  handoff:{toAgent:revAgentId,summary:'Muss serverseitig abgelehnt werden'}
 },marco.cookie);
 assert.equal(restrictedHandoff.status,403);

 // Security check: Agent with writeMessages=false cannot post messages
 const silentAgentRes=await post({
  action:'agent',
  id:'op-agent-silent',
  project,
  name:'Eule Nur-Lesen',
  avatarPresetId:'eule',
  role:'knowledge',
  model:'gpt-4.1',
  permissions:{
   readProject:true,
   writeMessages:false,
   manageTasks:false,
   editCode:false,
   prepareReviews:false,
   delegateAgents:false
  }
 },marco.cookie);
 assert.equal(silentAgentRes.status,200);
 const deniedWriteMsg=await post({
  action:'message',
  id:'msg-denied-write',
  project,
  body:'Darf nicht schreiben',
  senderAgent:silentAgentRes.data.agentId
 },marco.cookie);
 assert.equal(deniedWriteMsg.status,403);

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

 // Authorized Coordinator delegates a bounded review check to Herr Grau on the task topic
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

 // Verify room state returns agents, full R2 profile fields, and honest message origin
 const roomState=await get(`/api/room?project=${encodeURIComponent(project)}`,markus.cookie);
 assert.equal(roomState.status,200);
 const coord=roomState.data.agents.find(a=>a.id===coordId);
 assert.equal(coord.name,'Leitwolf');
 assert.equal(coord.nickname,'Taktgeber');
 assert.equal(coord.avatarPresetId,'leitwolf');
 assert.ok(coord.capabilities.includes('task-delegate'));
 assert.equal(agentEffectivePermissions(coord).delegateAgents,true);

 const grau=roomState.data.agents.find(a=>a.id===revAgentId);
 assert.equal(grau.name,'Herr Grau');
 assert.equal(grau.nickname,'Der Prüfer');
 assert.equal(grau.avatarPresetId,'herr-grau');
 assert.equal(grau.role,'advisor');
 assert.equal(grau.personality,'Trocken, präzise, skeptisch gegenüber unnötiger Komplexität');
 assert.deepEqual(grau.contextSources,['messages','tasks','decisions','repository','runs']);
 assert.equal(grau.permissions.prepareReviews,true);
 assert.equal(grau.permissions.delegateAgents,false);

 // Execution status never fakes model execution when no runner is online
 const execStatus=agentExecutionStatus(grau,roomState.data,[]);
 assert.equal(execStatus.state,'idle');
 assert.equal(execStatus.modelAvailable,false);

 const m1=roomState.data.messages.find(m=>m.id==='msg-1');
 assert.equal(m1.topicTask,taskId);
 assert.equal(m1.taskId,taskId);
 assert.equal(m1.recipient,markus.id);
 assert.equal(m1.recipientKind,'member');
 assert.equal(m1.origin,'human');

 const mh=roomState.data.messages.find(m=>m.id==='msg-handoff-1');
 assert.equal(mh.kind,'agent-handoff');
 assert.equal(mh.senderAgent,coordId);
 assert.equal(mh.recipient,revAgentId);
 assert.equal(mh.recipientKind,'agent');
 assert.equal(mh.topicTask,taskId);
 assert.equal(mh.replyTo,'msg-1');
 assert.equal(mh.origin,'human-authored','manual contribution in agent name is marked human-authored, never verified-run');
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

 // Members without project view permission are excluded from project room member list
 const revokeRes=await post({action:'roles',project,member:viewer.id,roles:[]},marco.cookie,'/api/project-roles');
 assert.equal(revokeRes.status,200);
 const roomAfterRevoke=await get(`/api/room?project=${encodeURIComponent(project)}`,markus.cookie);
 assert.equal(roomAfterRevoke.data.members.some(m=>m.id===viewer.id),false);
});
