import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {buildFileTree} from '../app/file-tree-model.ts';


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
 assert.equal(result.status,200);
 // The new task's card, the message and the reply.
 assert.deepEqual(result.data.messages.map(m=>m.kind),['card','human','human']);
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
