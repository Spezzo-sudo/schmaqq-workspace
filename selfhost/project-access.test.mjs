import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {metadata} from './team-model.mjs';

test('project access follows the roles: removed people read nothing, an appointed admin decides, Werkstatt only for developers, dropped approvals are explained',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-access-')),origin='http://127.0.0.1:44793';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44794'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const join=async(email,role)=>(await request('/api/auth/register',{invite:createInvite(app.db,email,role),name:email[0].toUpperCase(),password:'fixture-password-1234'})).cookie;
 const a=await join('a@fixture.invalid','owner'),b=await join('b@fixture.invalid'),c=await join('c@fixture.invalid');
 const id=email=>app.db.prepare('SELECT id FROM members WHERE email=?').get(email).id,aId=id('a@fixture.invalid'),bId=id('b@fixture.invalid'),cId=id('c@fixture.invalid');
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Team',description:'',members:[cId]},a)).data.project;
 const roles=(member,list)=>request('/api/project-roles',{action:'roles',project,member,roles:list},a);
 app.db.prepare("INSERT INTO tasks VALUES('task-1',?,'Startseite','','review','Normal',?,0)").run(project,aId);

 // C is taken out of the project: no project in the list, no room, no task.
 assert.equal((await request('/api/room?project='+project,null,c)).status,200,'members read before');
 assert.equal((await roles(cId,[])).status,200);
 assert.ok(!(await request('/api/rooms',null,c)).data.rooms.some(r=>r.id===project));
 assert.equal((await request('/api/room?project='+project,null,c)).status,403);
 assert.equal((await request('/api/room/context?project='+project,null,c)).status,403,'also for connected AI assistants');
 assert.equal((await request('/api/collaboration/task?id=task-1',null,c)).status,403);
 assert.ok(!(await request('/api/team',null,c)).data.tasks.some(x=>x.project===project));
 assert.ok(!(await request('/api/development',null,c)).data.tasks.some(x=>x.project===project));
 for(const route of ['/api/project-roles','/api/team/knowledge','/api/room/tasks','/api/development/workspaces','/api/executors']){
  assert.equal((await request(route+'?project='+project,null,c)).status,403,route);
 }
 app.db.prepare("INSERT INTO messages VALUES('msg-1',?,?,'Nur fürs Projekt',?)").run(project,aId,Date.now());
 const older=(await request('/api/workspace',null,c)).data;
 assert.ok(!older.projects.some(p=>p.id===project)&&!older.tasks.some(x=>x.project===project)&&!older.messages.some(x=>x.channel===project),'the former view follows the same roles');
 assert.ok((await request('/api/workspace',null,a)).data.messages.some(x=>x.id==='msg-1'));

 // B as appointed admin decides the live path and the placement rule.
 await roles(bId,['admin']);
 const meta=metadata(app.db,'room:v1:project:'+project);
 assert.equal((await request('/api/team',{action:'live',project,revision:meta.revision,live:'manual'},b)).status,200);
 assert.equal((await request('/api/executors',{project,mode:'server'},b)).status,200);

 // A viewer does not set up a Werkstatt for the project.
 await roles(bId,['viewer']);
 const device=(await request('/api/development',{action:'device',name:'B-PC'},b)).data;
 const connect=await request('/api/team/project-connect',{device:device.id,project,automatic:true,publish:false,allowCodex:false,workflow:'pull-request'},b);
 assert.equal(connect.status,403);

 // B approves as reviewer, then loses the role: the approval no longer counts, and the task says why.
 await roles(bId,['reviewer']);
 const now=Date.now(),commit='a'.repeat(40);
 app.db.prepare("INSERT INTO devices(id,owner,name,hash,seen) VALUES('pc-a',?,'A-PC','hash-a',?)").run(aId,now);
 app.db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES('copy-1',?,'pc-a',?,'prepare','{}','completed',?,?)").run(aId,project,now,JSON.stringify({branch:'studio/copy-1'}));
 app.db.prepare("INSERT INTO workspaces(job,title,scope,task,archived,revision) VALUES('copy-1','Kopie','','task-1',0,1)").run();
 app.db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES('submit-1',?,'pc-a',?,'submit',?,'completed',?,?)").run(aId,project,JSON.stringify({worktree:'copy-1'}),now+1,JSON.stringify({commit,branch:'studio/copy-1',diff:'x',published:true,workflow:'direct'}));
 assert.equal((await request('/api/development/reviews',{id:randomUUID(),job:'submit-1',commit,decision:'approved',body:''},b)).status,200);
 let review=(await request('/api/collaboration/task?id=task-1',null,a)).data.reviews[0];
 assert.equal(review.state,'approved');assert.deepEqual(review.dropped,[]);
 await roles(bId,['viewer']);
 review=(await request('/api/collaboration/task?id=task-1',null,a)).data.reviews[0];
 assert.equal(review.state,'pending');assert.deepEqual(review.dropped,['B']);
});

test('#Allgemein: answer a message and turn it into a task of a chosen project',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-general-')),origin='http://127.0.0.1:44893';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44894'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const a=(await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'A',password:'fixture-password-1234'})).cookie;
 const b=(await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'B',password:'fixture-password-1234'})).cookie;
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Team',description:'',members:[app.db.prepare("SELECT id FROM members WHERE name='B'").get().id]},a)).data.project;
 assert.equal((await request('/api/workspace',{action:'message',id:'g1',channel:'general',body:'Wir sollten die Startseite ruhiger gestalten.'},a)).status,200);
 assert.equal((await request('/api/workspace',{action:'message',id:'g2',channel:'general',body:'Gute Idee, ich mache eine Aufgabe daraus.',replyTo:'g1'},b)).status,200);
 app.db.prepare("INSERT INTO messages VALUES('p1',?,(SELECT id FROM members WHERE name='A'),'Projekt',0)").run(project);
 assert.equal((await request('/api/workspace',{action:'message',id:'g3',channel:'general',body:'x',replyTo:'p1'},b)).status,400,'answers stay in the same conversation');
 const task=await request('/api/room',{action:'task',id:randomUUID(),project,title:'Startseite ruhiger gestalten',source:'g1'},b);
 assert.equal(task.status,200);
 const general=(await request('/api/workspace',null,b)).data.messages;
 assert.equal(general.find(m=>m.id==='g2').replyTo,'g1');
 const source=general.find(m=>m.id==='g1');assert.equal(source.taskId,task.data.task);assert.equal(source.taskProject,project);
 assert.equal((await request('/api/collaboration/task?id='+task.data.task,null,b)).data.source.id,'g1','the task shows where it came from');
});
