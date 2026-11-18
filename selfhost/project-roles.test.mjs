import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite,openStore} from './store.mjs';
import {rolesOf,startRoles} from './project-roles.mjs';
import {storeMetadata} from './team-model.mjs';

test('project roles: admin sets roles and the review rule; viewers read, developers change, only reviewers approve',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-project-roles-'));
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin:'http://127.0.0.1:44810',previewOrigin:'http://127.0.0.1:44811',resetMailer:null});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:'http://127.0.0.1:44810'}:{}),...(cookie?{Cookie:cookie}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const people={};
 for(const [i,name] of ['Marco','Markus','Lena'].entries()){
  const email=`roles${i}@fixture.invalid`;const r=await request('/api/auth/register',{invite:createInvite(app.db,email,i?'member':'owner'),name,password:'synthetic-fixture-password-2026'});assert.equal(r.status,200);
  people[name]={cookie:r.cookie,id:app.db.prepare('SELECT id FROM members WHERE email=?').get(email).id};
 }
 const {Marco,Markus,Lena}=people;
 // Markus creates a project with no additional people.
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Markus Projekt',description:''},Markus.cookie)).body.project;
 const rolePath='/api/project-roles?project='+project;
 const roles=(await request(rolePath,null,Markus.cookie)).body;
 assert.deepEqual(roles.mine,['admin']);assert.equal(roles.review,'second');
 assert.deepEqual(roles.members.filter(m=>m.roles.length).map(m=>m.id),[Markus.id]);
 assert.equal((await request(rolePath,null,Lena.cookie)).status,403);
 assert.equal((await request('/api/room?project='+project,null,Marco.cookie)).status,403);
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:Markus.id,roles:[]},Markus.cookie)).status,409);
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:Markus.id,roles:['viewer']},Lena.cookie)).status,403);
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:Lena.id,roles:['viewer']},Markus.cookie)).status,200);

 // A viewer reads the project but cannot write or change it.
 assert.equal((await request('/api/room?project='+project,null,Lena.cookie)).status,200);
 assert.equal((await request('/api/room',{action:'message',id:randomUUID(),project,body:'Gute Idee'},Lena.cookie)).status,403);
 assert.equal((await request('/api/room',{action:'task',id:randomUUID(),project,title:'Nein',kind:'general'},Lena.cookie)).status,403);
 assert.equal((await request('/api/workspace',{action:'task',project,title:'Nein',description:'',priority:'Normal',assignee:null},Lena.cookie)).status,403,'the former view follows the same roles');

 // Markus (admin) builds a general result; Lena may not approve.
 const task=(await request('/api/room',{action:'task',id:randomUUID(),project,title:'Ergebnis',kind:'general',criteria:'Nachvollziehbar'},Markus.cookie)).body.task;
 assert.equal((await request('/api/collaboration/task',{action:'claim',task},Lena.cookie)).status,403);
 assert.equal((await request('/api/collaboration/task',{action:'claim',task},Markus.cookie)).status,200);
 await request('/api/team',{action:'contract',task,revision:0,kind:'general',criteria:'Nachvollziehbar',requiresReview:true},Markus.cookie);
 const result=randomUUID();assert.equal((await request('/api/team',{action:'result',task,id:result,body:'Fertig.',revision:1},Markus.cookie)).status,200);
 assert.equal((await request('/api/team',{action:'vote',task,result,decision:'approved',body:''},Lena.cookie)).status,403,'viewer cannot approve');
 assert.equal((await request('/api/team',{action:'vote',task,result,decision:'approved',body:''},Markus.cookie)).status,403,'no self approval by default');

 // The admin allows approving alone: now Markus may approve his own result.
 assert.equal((await request('/api/project-roles',{action:'review',project,review:'admin-alone'},Lena.cookie)).status,403);
 assert.equal((await request('/api/project-roles',{action:'review',project,review:'admin-alone'},Markus.cookie)).status,200);
 assert.equal((await request('/api/team',{action:'vote',task,result,decision:'approved',body:''},Markus.cookie)).status,200);

 const selected=(await request('/api/room',{action:'create',id:randomUUID(),title:'Mit Lena',members:[Lena.id]},Marco.cookie)).body.project;
 assert.deepEqual((await request('/api/project-roles?project='+selected,null,Lena.cookie)).body.mine,['developer','reviewer']);
 assert.equal((await request('/api/room?project='+selected,null,Markus.cookie)).status,403);
 assert.equal((await request('/api/room',{action:'create',id:randomUUID(),title:'Ungültig',members:['missing']},Marco.cookie)).status,400);
});

test('existing project roles are preserved exactly once and never granted to later accounts',t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-project-migration-')),filename=path.join(dir,'studio.sqlite');
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=openStore(filename,{seedProjects:false});
 const person=(id,role='member')=>({id,role});
 const add=(db,m)=>db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(m.id,m.id,m.id+'@fixture.invalid','fixture',m.role,Date.now());
 const owner=person('owner','owner'),creator=person('creator'),old=person('old'),later=person('later');
 for(const member of [owner,creator,old])add(db,member);
 for(const project of ['implicit','explicit'])db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(project,project,'','sage','Im Aufbau',project==='implicit'?0:Date.now());
 storeMetadata(db,'room:v1:project:implicit',{createdBy:creator.id});
 storeMetadata(db,'room:v1:roles:explicit',{members:{creator:['admin'],old:['reviewer']},review:'admin-alone'});
 db.close();

 const first=createStudioServer({filename,resetMailer:null});
 assert.deepEqual(rolesOf(first.db,owner,'implicit'),['admin']);
 assert.deepEqual(rolesOf(first.db,owner,'explicit'),['admin']);
 assert.deepEqual(rolesOf(first.db,creator,'implicit'),['admin']);
 assert.deepEqual(rolesOf(first.db,old,'implicit'),['developer','reviewer']);
 assert.deepEqual(rolesOf(first.db,old,'explicit'),['reviewer']);
 add(first.db,later);
 startRoles(first.db,'new',later.id);
 first.db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('new','New','','sage','Im Aufbau',Date.now());
 first.db.close();
 const second=createStudioServer({filename,resetMailer:null});
 try{
  for(const project of ['implicit','explicit'])assert.deepEqual(rolesOf(second.db,later,project),[]);
  assert.deepEqual(rolesOf(second.db,owner,'new'),[]);
 }finally{second.db.close();}
});
