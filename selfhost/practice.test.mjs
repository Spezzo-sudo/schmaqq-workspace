import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('practice round: personal, invisible to others, can be walked alone and deleted without traces',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-practice-'));
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin:'http://127.0.0.1:44820',previewOrigin:'http://127.0.0.1:44821',resetMailer:null});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:'http://127.0.0.1:44820'}:{}),...(cookie?{Cookie:cookie}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const people=[];
 for(const [i,name] of ['Marco','Markus'].entries()){const r=await request('/api/auth/register',{invite:createInvite(app.db,`p${i}@fixture.invalid`,i?'member':'owner'),name,password:'synthetic-fixture-password-2026'});people.push(r.cookie);}
 const [marco,markus]=people;
 const project=(await request('/api/practice',{action:'start'},markus)).body.project;
 assert.equal((await request('/api/practice',{action:'start'},markus)).body.project,project,'one practice per person');
 assert.ok((await request('/api/rooms',null,markus)).body.rooms.some(r=>r.id===project&&r.practice));
 assert.ok(!(await request('/api/rooms',null,marco)).body.rooms.some(r=>r.id===project),'invisible to others, even the owner of Studio');
 assert.equal((await request('/api/room?project='+project,null,marco)).status,404);
 const task=(await request('/api/team',null,markus)).body.tasks.find(x=>x.project===project).id;
 assert.ok(!(await request('/api/team',null,marco)).body.tasks.some(x=>x.project===project));
 // The whole way alone: start, write the result, approve it (allowed in practice), finish.
 assert.equal((await request('/api/collaboration/task',{action:'status',task,status:'doing'},markus)).status,200);
 const result=randomUUID();assert.equal((await request('/api/team',{action:'result',task,id:result,body:'Klimafinder hilft beim Kühlen.',revision:0},markus)).status,200);
 assert.equal((await request('/api/team',{action:'vote',task,result,decision:'approved',body:''},markus)).status,200);
 assert.equal((await request('/api/collaboration/task',{action:'status',task,status:'done'},markus)).status,200);
 // Delete: everything of the practice is gone.
 assert.equal((await request('/api/practice',{action:'delete'},markus)).status,200);
 assert.equal(app.db.prepare('SELECT count(*) AS n FROM projects WHERE id=?').get(project).n,0);
 assert.equal(app.db.prepare('SELECT count(*) AS n FROM tasks WHERE project=?').get(project).n,0);
 assert.equal(app.db.prepare('SELECT count(*) AS n FROM messages WHERE channel=?').get(project).n,0);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM workspace_meta WHERE key LIKE ?").get('%'+project).n,0);
 assert.equal((await request('/api/practice',null,markus)).body.project,null);
});
