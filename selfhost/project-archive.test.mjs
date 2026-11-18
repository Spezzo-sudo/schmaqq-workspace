// Archiving a project: admin only, reversible, hides it from all lists, refused while work is running.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('project archive: admin only, reversible, hidden from lists, not while a job runs',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-archive-')),origin='http://127.0.0.1:44701';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44702'});
 await new Promise((r,j)=>{app.server.once('error',j);app.server.listen(0,'127.0.0.1',r);});const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{app.server.closeAllConnections?.();await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,data:await r.json().catch(()=>({})),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const a=(await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'A',password:'fixture-password-1234'})).cookie;
 const b=(await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'B',password:'fixture-password-1234'})).cookie;
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Probeprojekt',description:'',members:[app.db.prepare("SELECT id FROM members WHERE name='B'").get().id]},a)).data.project;
 assert.equal((await request('/api/room',{action:'task',id:randomUUID(),project,title:'Offene Testaufgabe'},a)).status,200);
 const state=async()=>(await request('/api/room?project='+project,null,a)).data;
 const archive=async(cookie,archived)=>{const s=await state();return request('/api/team',{action:'project',project,revision:s.meta.revision,title:s.project.title,description:s.project.description,archived,base:'main',workflow:'pull-request'},cookie);};

 assert.equal((await archive(b,true)).status,403,'a developer cannot archive');
 // A running job blocks archiving.
 const dev=app.db.prepare('SELECT id FROM devices LIMIT 1').get()??(await request('/api/development',{action:'device',name:'PC'},a)).data;
 const job=randomUUID();
 app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(job,app.db.prepare("SELECT id FROM members WHERE email='a@fixture.invalid'").get().id,dev.id,project,'inspect','{}','running',Date.now());
 assert.equal((await archive(a,true)).status,409);
 app.db.prepare("UPDATE jobs SET status='completed' WHERE id=?").run(job);

 // Open tasks no longer block: nothing is deleted.
 assert.equal((await archive(a,true)).status,200);
 for(const cookie of [a,b]){
  assert.ok(!(await request('/api/rooms',null,cookie)).data.rooms.some(r=>r.id===project),'hidden from the project list');
  assert.ok(!(await request('/api/team',null,cookie)).data.tasks.some(t=>t.project===project),'tasks hidden from overall lists');
 }
 assert.equal((await request('/api/room?project='+project,null,a)).data.tasks.length,1,'data kept');
 assert.deepEqual((await request('/api/rooms?archived=1',null,a)).data.rooms.map(r=>r.id),[project]);
 assert.deepEqual((await request('/api/rooms?archived=1',null,b)).data.rooms,[],'only admins see what they can restore');
 assert.equal((await archive(b,false)).status,403,'a developer cannot restore');
 assert.equal((await archive(a,false)).status,200);
 assert.ok((await request('/api/rooms',null,b)).data.rooms.some(r=>r.id===project),'back for everyone');
});
