import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('project roles: admin sets roles and the review rule; viewers talk, developers change, only reviewers approve',async t=>{
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
 // Markus creates a project: he is its admin, the others develop and review.
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Markus Projekt',description:''},Markus.cookie)).body.project;
 const roles=(await request('/api/project-roles?project='+project,null,Lena.cookie)).body;
 assert.deepEqual(roles.mine,['developer','reviewer']);assert.equal(roles.review,'second');
 assert.deepEqual(roles.members.find(m=>m.id===Markus.id).roles,['admin']);
 assert.deepEqual(roles.members.find(m=>m.id===Marco.id).roles,['admin'],'the Studio owner is always admin');

 // Only an admin changes roles; the owner cannot be demoted.
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:Markus.id,roles:['viewer']},Lena.cookie)).status,403);
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:Marco.id,roles:['viewer']},Markus.cookie)).status,400);
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:Lena.id,roles:['viewer']},Markus.cookie)).status,200);

 // A viewer talks but changes nothing.
 assert.equal((await request('/api/room',{action:'message',id:randomUUID(),project,body:'Gute Idee'},Lena.cookie)).status,200);
 assert.equal((await request('/api/room',{action:'task',id:randomUUID(),project,title:'Nein',kind:'general'},Lena.cookie)).status,403);
 assert.equal((await request('/api/workspace',{action:'task',project,title:'Nein',description:'',priority:'Normal',assignee:null},Lena.cookie)).status,403,'the former view follows the same roles');

 // Markus (admin) builds a general result; Lena may not approve, Marco may.
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

 // Projects from before roles keep working for everyone (legacy rule).
 const old=(await request('/api/room',{action:'create',id:randomUUID(),title:'Alt',description:''},Marco.cookie)).body.project;
 app.db.prepare('DELETE FROM workspace_meta WHERE key=?').run('room:v1:roles:'+old);
 assert.deepEqual((await request('/api/project-roles?project='+old,null,Lena.cookie)).body.mine,['developer','reviewer']);
 assert.equal((await request('/api/room',{action:'task',id:randomUUID(),project:old,title:'Geht',kind:'general'},Lena.cookie)).status,200);
});
