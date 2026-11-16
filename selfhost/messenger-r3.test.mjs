import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {messengerFilterKey,readMessengerFilter,messengerDraftKey,messengerComposerTarget,ownProjectCopies} from '../studio/messenger-state.ts';
import {buildFileTree} from '../app/file-tree-model.ts';
import {readRoomRoute,roomResumeURL,agentExecutionStatus} from '../studio/room-model.ts';

const room={members:[{id:'alice',name:'Alice'},{id:'removed',removed:true}],agents:[{id:'mara',active:true},{id:'archived',active:false}],tasks:[{id:'task-1'}]};

test('R3: conversation URLs validate both syntax and current project membership',()=>{
 for(const filter of [{kind:'all'},{kind:'handoffs'},{kind:'member',id:'alice'},{kind:'agent',id:'mara'},{kind:'topic',taskId:'task-1'}]){
  assert.deepEqual(readMessengerFilter('?chat='+encodeURIComponent(messengerFilterKey(filter)),room),filter);
 }
 for(const value of ['member:removed','agent:archived','agent:foreign','topic:foreign','https://example.invalid','agent:../../secrets','member:alice:extra']){
  assert.deepEqual(readMessengerFilter('?chat='+encodeURIComponent(value),room),{kind:'all'});
 }
});

test('R3: composer view transitions reset recipient and task together',()=>{
 assert.deepEqual(messengerComposerTarget({kind:'agent',id:'mara'}),{recipient:'mara',topicTask:''});
 assert.deepEqual(messengerComposerTarget({kind:'member',id:'alice'}),{recipient:'alice',topicTask:''});
 assert.deepEqual(messengerComposerTarget({kind:'topic',taskId:'task-1'}),{recipient:'',topicTask:'task-1'});
 for(const kind of ['all','handoffs'])assert.deepEqual(messengerComposerTarget({kind}),{recipient:'',topicTask:''});
});

test('R3: drafts are separate by user, project and conversation view; existing group drafts survive',()=>{
 assert.equal(messengerDraftKey('u1','p1',{kind:'all'}),'room-chat:u1:p1');
 const keys=new Set();
 for(const user of ['u1','u2'])for(const project of ['p1','p2'])for(const filter of [{kind:'all'},{kind:'handoffs'},{kind:'agent',id:'mara'},{kind:'member',id:'alice'},{kind:'topic',taskId:'task-1'}])keys.add(messengerDraftKey(user,project,filter));
 assert.equal(keys.size,20);
});

test('R3: bookmark and login restoration preserve inspector and addressed view safely',()=>{
 for(const tab of ['files','activity','knowledge','tasks','connect','overview']){
  const url='?room=project-1&tab='+tab+'&chat=agent%3Amara';
  assert.equal(readRoomRoute(url).tab,tab);
  assert.equal(new URL('https://fixture.invalid'+roomResumeURL(url)).searchParams.get('chat'),'agent:mara');
 }
 assert.equal(roomResumeURL('?room=../bad&chat=agent:mara'),'/');
 assert.equal(new URL('https://fixture.invalid'+roomResumeURL('?room=project-1&chat=javascript:bad')).searchParams.has('chat'),false);
});

test('R3: file selection excludes foreign, archived, revoked and unfinished copies',()=>{
 const good={id:'good',owner:'u1',project:'p1',status:'completed'};
 const copies=[good,{...good,id:'foreign',owner:'u2'},{...good,id:'other-project',project:'p2'},{...good,id:'archived',archived:1},{...good,id:'revoked',revoked:true},{...good,id:'queued',status:'queued'}];
 assert.deepEqual(ownProjectCopies(copies,'u1','p1').map(c=>c.id),['good']);
 assert.equal(copies.length,6,'selection must not mutate the original response');
});

test('R3: folder tree keeps exact paths, deduplicates files and rejects unsafe display paths',()=>{
 const tree=buildFileTree(['src/app.ts','src/ui/chat.tsx','README.md','src/app.ts','../secret','/etc/passwd','src//bad','src/./bad','src\\bad','src/evil\u0000']);
 assert.equal(tree.length,2);
 assert.equal(tree[0].kind,'directory');assert.equal(tree[0].path,'src');
 assert.equal(tree[0].children[0].path,'src/ui');
 assert.equal(tree[0].children[0].children[0].path,'src/ui/chat.tsx');
 assert.equal(tree[0].children[1].path,'src/app.ts');
 assert.equal(tree[1].path,'README.md');
 assert.deepEqual(buildFileTree([]),[]);
});

test('R3: a shared model must not make unrelated personas appear to be working',()=>{
 const agent={id:'mara',model:'fixture-model',capabilities:[]};
 const run={id:'run-1',model:'fixture-model',status:'running',device:'device-1',deviceName:'Test worker'};
 assert.equal(agentExecutionStatus(agent,[run],[]).state,'idle');
 assert.equal(agentExecutionStatus(agent,[{...run,agentId:'another-agent'}],[]).state,'idle');
 assert.equal(agentExecutionStatus(agent,[{...run,agentId:'mara'}],[]).state,'running');
});

test('R5: a bound model worker shows ready-on-request and only a run for this exact agent as working',()=>{
 const agent={id:'mara',model:'fixture-model',capabilities:[]};
 const hermesRun={id:'h1',agent:'mara',status:'running',model:'fixture-model'};
 assert.equal(agentExecutionStatus(agent,[],[],null).state,'idle');
 assert.equal(agentExecutionStatus(agent,[],[],{configured:false,runs:[]}).state,'idle');
 const ready=agentExecutionStatus(agent,[],[],{configured:true,runs:[]});
 assert.deepEqual([ready.state,ready.via,ready.label],['ready','hermes','Bereit']);
 assert.equal(agentExecutionStatus(agent,[],[],{configured:true,runs:[{...hermesRun,agent:'other'}]}).state,'ready');
 assert.equal(agentExecutionStatus(agent,[],[],{configured:true,runs:[{...hermesRun,status:'completed'}]}).state,'ready');
 const busy=agentExecutionStatus(agent,[],[],{configured:true,runs:[hermesRun]});
 assert.deepEqual([busy.state,busy.via],['running','hermes']);
});

async function fixture(t){
 const directory=mkdtempSync(path.join(os.tmpdir(),'schmaqq-r3-'));
 const options={seedProjects:true,filename:path.join(directory,'r3.sqlite'),origin:'http://127.0.0.1:44911',previewOrigin:'http://127.0.0.1:44912',resetMailer:null};
 let app,host;
 async function start(){app=createStudioServer(options);await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});host='http://127.0.0.1:'+app.server.address().port;}
 async function stop(){await new Promise(resolve=>app.server.close(resolve));app.db.close();}
 await start();t.after(async()=>{await stop();rmSync(directory,{recursive:true,force:true});});
 async function post(body,cookie,route='/api/room'){
  const response=await fetch(host+route,{method:'POST',headers:{Origin:options.origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 async function get(route,cookie){const response=await fetch(host+route,{headers:cookie?{Cookie:cookie}:{}});return {status:response.status,data:await response.json()};}
 const people=[];
 for(const [index,name] of ['Alice','Bob','Visitor'].entries()){
  const email=`r3-${index}@fixture.invalid`,invite=createInvite(app.db,email,index===0?'owner':'member');
  const result=await post({invite,name,password:'isolated-r3-fixture-password'},null,'/api/auth/register');
  assert.equal(result.status,200);people.push({...app.db.prepare('SELECT id FROM members WHERE email=?').get(email),cookie:result.cookie});
 }
 return {get app(){return app;},people,post,get,restart:async()=>{await stop();await start();}};
}

test('R3 real SQLite: messages, replies, profiles and task references survive restart and reach another user',async t=>{
 const f=await fixture(t),[alice,bob,visitor]=f.people;
 const created=await f.post({action:'create',id:'r3-room',title:'R3 Test',description:'Isolated collaboration'},alice.cookie);
 assert.equal(created.status,200);const project=created.data.project;
 const task=await f.post({action:'task',id:'r3-task',project,title:'Review the messenger',description:'Fixture'},alice.cookie);
 assert.equal(task.status,200);
 const agent=await f.post({action:'agent',id:'r3-agent',project,name:'Mara',avatarPresetId:'mara',role:'frontend',model:'fixture-model',capabilities:['chat']},alice.cookie);
 assert.equal(agent.status,200);
 const payload={action:'message',id:'r3-message',project,body:'Persisted project message',recipient:agent.data.agentId,topicTask:task.data.task};
 assert.equal((await f.post(payload,alice.cookie)).status,200);
 assert.equal((await f.post(payload,alice.cookie)).status,200,'network retry is idempotent');
 assert.equal((await f.post({...payload,body:'Conflicting retry'},alice.cookie)).status,409);
 assert.equal((await f.post({action:'message',id:'r3-reply',project,body:'Reply from another account',replyTo:payload.id},bob.cookie)).status,200);
 await f.restart();
 const result=await f.get('/api/room?project='+project,bob.cookie);
 assert.equal(result.status,200);assert.equal(result.data.messages.length,2);
 assert.equal(result.data.messages.find(m=>m.id===payload.id).recipient,agent.data.agentId);
 assert.equal(result.data.messages.find(m=>m.id===payload.id).topicTask,task.data.task);
 assert.equal(result.data.messages.find(m=>m.id==='r3-reply').replyTo,payload.id);
 assert.deepEqual(result.data.agents.map(a=>a.avatarPresetId),['herr-grau','mara'],'the project lead plus the saved profile');
 assert.equal((await f.get('/api/room?project='+project)).status,401);
 assert.equal((await f.post({action:'roles',project,member:visitor.id,roles:[]},alice.cookie,'/api/project-roles')).status,200);
 assert.equal((await f.get('/api/room?project='+project,visitor.cookie)).status,403);
 assert.equal((await f.post({action:'message',id:'r3-revoked',project,body:'Not allowed'},visitor.cookie)).status,403);
});

test('R3 real backend: cross-project replies/tasks and conflicting handoff recipients are rejected atomically',async t=>{
 const f=await fixture(t),[alice,bob]=f.people;
 const project=(await f.post({action:'create',id:'r3-p1',title:'First',description:'Fixture'},alice.cookie)).data.project;
 const other=(await f.post({action:'create',id:'r3-p2',title:'Second',description:'Fixture'},alice.cookie)).data.project;
 await f.post({action:'message',id:'r3-other-message',project:other,body:'Other project'},alice.cookie);
 const foreignTask=(await f.post({action:'task',id:'r3-other-task',project:other,title:'Other task',description:'Fixture'},alice.cookie)).data.task;
 const coordinator=(await f.post({action:'agent',id:'r3-coordinator',project,name:'Coordinator',role:'coordinator',model:'fixture-model',capabilities:['chat','task-delegate']},alice.cookie)).data.agentId;
 const target=(await f.post({action:'agent',id:'r3-target',project,name:'Reviewer',role:'reviewer',model:'fixture-model',capabilities:['chat']},alice.cookie)).data.agentId;
 assert.equal((await f.post({action:'message',id:'r3-cross-reply',project,body:'Bad reply',replyTo:'r3-other-message'},alice.cookie)).status,400);
 assert.equal((await f.post({action:'message',id:'r3-cross-task',project,body:'Bad topic',topicTask:foreignTask},alice.cookie)).status,400);
 const handoff={action:'message',id:'r3-bad-handoff',project,body:'Review this',senderAgent:coordinator,recipient:bob.id,handoff:{toAgent:target,summary:'Review',status:'delegated'}};
 assert.equal((await f.post(handoff,alice.cookie)).status,400);
 assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM messages WHERE channel=?').get(project).n,0);
 const valid={...handoff,id:'r3-good-handoff',recipient:target};
 assert.equal((await f.post(valid,alice.cookie)).status,200);
 const messages=(await f.get('/api/room?project='+project,bob.cookie)).data.messages;
 assert.equal(messages.length,1);assert.equal(messages[0].recipient,messages[0].handoff.toAgent);
 assert.equal(messages[0].origin,'human-authored','manual UI handoff must not masquerade as an executed model job');
});
