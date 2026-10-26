import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite,openStore} from './store.mjs';
import {completion,metadata} from './team-model.mjs';
import {createSource} from './files.mjs';
import {parseCommand} from '../app/setup-command.ts';
async function fixture(t){
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-team-contract-'));
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin:'http://127.0.0.1:44800',previewOrigin:'http://127.0.0.1:44801',resetMailer:null});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{
  const response=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:'http://127.0.0.1:44800'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(value?{body:JSON.stringify(value)}:{})});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 };
 const members=[];
 for(const [i,name] of ['Marco','Markus'].entries()){
  const email=`team${i}@fixture.invalid`,invite=createInvite(app.db,email,i?'member':'owner');
  const r=await request('/api/auth/register',{invite,name,password:'synthetic-fixture-password-2026'});assert.equal(r.status,200);
  members.push({cookie:r.cookie,...app.db.prepare('SELECT id FROM members WHERE email=?').get(email)});
 }
 const [a,b]=members;
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Gemeinsames Projekt',description:'Zusammen arbeiten'},a.cookie)).body.project;
 const task=async(kind='general')=>(await request('/api/room',{action:'task',id:randomUUID(),project,title:'Ein Ergebnis',description:'Ein konkretes Ziel',kind,criteria:'Das Ergebnis ist nachvollziehbar.'},a.cookie)).body.task;
 const team=(person,action,extra)=>request('/api/team',{action,...extra},person.cookie);
 return {app,request,a,b,project,task,team};
}
test('new normal installations start empty; demo seeding remains explicit',async t=>{
 const f=await fixture(t);assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM projects').get().n,1);
 assert.equal(f.app.db.prepare("SELECT id FROM projects WHERE id='website'").get(),undefined);
});
test('general result: one responsible person, independent review, immutable version and guarded completion through both APIs',async t=>{
 const f=await fixture(t),task=await f.task();
 assert.equal((await f.request('/api/collaboration/task',{action:'claim',task},f.a.cookie)).status,200);
 assert.equal((await f.request('/api/collaboration/task',{action:'status',task,status:'done'},f.a.cookie)).status,409);
 assert.equal((await f.request('/api/workspace',{action:'status',id:task,status:'done'},f.b.cookie)).status,409);
 assert.equal((await f.team(f.a,'contract',{task,revision:0,kind:'general',criteria:'Drei Optionen dokumentiert',requiresReview:true})).status,200);
 const result=randomUUID();assert.equal((await f.team(f.a,'result',{task,id:result,body:'Drei Optionen mit Belegen.',revision:1})).status,200);
 assert.equal((await f.team(f.a,'vote',{task,result,decision:'approved',body:''})).status,403);
 assert.equal((await f.team(f.b,'vote',{task,result,decision:'changes',body:'Quellen ergänzen.'})).status,200);
 assert.equal(f.app.db.prepare('SELECT status FROM tasks WHERE id=?').get(task).status,'doing');
 const result2=randomUUID();await f.team(f.a,'result',{task,id:result2,body:'Drei Optionen mit vollständigen Quellen.',revision:1});
 assert.equal((await f.team(f.b,'vote',{task,result,decision:'approved',body:''})).status,409);
 assert.equal((await f.team(f.b,'vote',{task,result:result2,decision:'approved',body:'Nachvollziehbar'})).status,200);
 assert.equal((await f.request('/api/collaboration/task',{action:'status',task,status:'done'},f.a.cookie)).status,200);
 assert.equal(metadata(f.app.db,'team:v1:result-history:'+result).body,'Drei Optionen mit Belegen.');
 assert.equal(metadata(f.app.db,'team:v1:result-history:'+result).contractSnapshot.criteria,'Drei Optionen dokumentiert');
 assert.equal((await f.request('/api/team/results?task='+task,null,f.b.cookie)).body.history[0].id,result);
 assert.equal((await f.team(f.a,'reopen',{task,revision:1})).status,200);
 assert.equal((await f.request('/api/collaboration/task',{action:'status',task,status:'done'},f.a.cookie)).status,409,'Reopening requires a new result');
});
test('task edit is atomic and rejects stale descriptions without half-written completion rules',async t=>{
 const f=await fixture(t),task=await f.task();
 const r=await f.team(f.a,'contract',{task,revision:0,kind:'general',criteria:'New criteria',requiresReview:false,title:'New title',description:'New goal',briefRevision:7});
 assert.equal(r.status,409);assert.equal(metadata(f.app.db,'team:v1:task:'+task).revision,0);assert.equal(f.app.db.prepare('SELECT title FROM tasks WHERE id=?').get(task).title,'Ein Ergebnis');
});
test('knowledge editing preserves prior versions, rejects stale writes and removes archived entries from AI context',async t=>{
 const f=await fixture(t),created=await f.request('/api/room',{action:'note',id:randomUUID(),project:f.project,title:'Briefing',body:'Wichtiges Wissen',kind:'note'},f.a.cookie),note=created.body.note;
 const ctx=await f.request('/api/room/context?project='+f.project,null,f.b.cookie);assert.match(ctx.body.text,/Briefing: Wichtiges Wissen/);
 assert.equal((await f.team(f.a,'note',{project:f.project,note,revision:1,title:'Briefing',body:'Aktuelle Fassung',archived:false})).status,200);
 assert.equal((await f.team(f.b,'note',{project:f.project,note,revision:1,title:'Veraltet',body:'Darf nicht schreiben',archived:false})).status,409);
 assert.equal(metadata(f.app.db,`team:v1:note-version:${note}:1`).body,'Wichtiges Wissen');
 assert.equal((await f.team(f.a,'note',{project:f.project,note,revision:2,title:'Briefing',body:'Aktuelle Fassung',archived:true})).status,200);
 assert.doesNotMatch((await f.request('/api/room/context?project='+f.project,null,f.b.cookie)).body.text,/Aktuelle Fassung/);
});
test('shared project allows second personal runner, rejects an unrelated repository and never changes private project rules',async t=>{
 const f=await fixture(t),device=(await f.request('/api/development',{action:'device',name:'Markus PC'},f.b.cookie)).body;
 await f.request('/api/room',{action:'repository',project:f.project,url:'https://github.com/example/shared',revision:0},f.a.cookie);
 assert.equal((await f.request('/api/runner/project-setup-verify',{project:f.project,repository:'https://github.com/example/shared.git'},null,device.token)).status,200);
 assert.equal((await f.request('/api/runner/project-setup-verify',{project:f.project,repository:'https://github.com/example/other'},null,device.token)).status,409);
 const setup={project:f.project,device:device.id,check:['node','--test'],publish:true,allowCodex:false,workflow:'pull-request'};
 assert.equal((await f.request('/api/team/project-connect',{...setup,workflow:'direct'},f.b.cookie)).status,409);
 assert.equal((await f.request('/api/team/project-connect',setup,f.a.cookie)).status,403);
 const queued=await f.request('/api/team/project-connect',setup,f.b.cookie);assert.equal(queued.status,200);
 assert.equal(JSON.parse(f.app.db.prepare('SELECT payload FROM jobs WHERE id=?').get(queued.body.id).payload).repository,'https://github.com/example/shared');
});
test('archiving a personal copy keeps historical review diff accessible; code completion is still guarded',async t=>{
 const f=await fixture(t),task=await f.task('code'),device=(await f.request('/api/development',{action:'device',name:'Marco PC'},f.a.cookie)).body;
 const id='fixture-copy';f.app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(id,f.a.id,device.id,f.project,'prepare','{}','completed',1,'{}');
 f.app.db.prepare('INSERT INTO workspaces(job,title,scope,task,archived) VALUES(?,?,?,?,?)').run(id,'Bearbeitung','',task,1);
 f.app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run('fixture-review',f.a.id,device.id,f.project,'review',JSON.stringify({worktree:id}),'completed',2,JSON.stringify({commit:'a'.repeat(40),diff:'diff --git a/a b/a\n+new',checks:'Tests pass'}));
 assert.equal((await f.request(`/api/collaboration/task-diff?task=${task}&review=fixture-review`,null,f.b.cookie)).status,200);
 assert.equal(completion(f.app.db,f.app.db.prepare('SELECT * FROM tasks WHERE id=?').get(task)).ready,false);
});
test('explicit offline takeover preserves work, rejects active online execution and invalidates the old lease',async t=>{
 const f=await fixture(t),task=await f.task('code');await f.request('/api/collaboration/task',{action:'claim',task},f.a.cookie);
 const device=(await f.request('/api/development',{action:'device',name:'Marco PC'},f.a.cookie)).body;
 f.app.db.prepare('UPDATE devices SET seen=? WHERE id=?').run(Date.now(),device.id);
 f.app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run('old-copy',f.a.id,device.id,f.project,'prepare','{}','completed',1,'{}');
 f.app.db.prepare('INSERT INTO workspaces(job,title,scope,task) VALUES(?,?,?,?)').run('old-copy','Erhaltene Arbeit','',task);
 f.app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,lease,heartbeat) VALUES(?,?,?,?,?,?,?,?,?,?)').run('old-job',f.a.id,device.id,f.project,'codex',JSON.stringify({worktree:'old-copy'}),'running',2,'old-lease',Date.now());
 const request={task,expectedAssignee:f.a.id,reason:'Kollege ist abwesend'};
 assert.equal((await f.team(f.b,'takeover',request)).status,409);
 f.app.db.prepare('UPDATE devices SET seen=0 WHERE id=?').run(device.id);f.app.db.prepare('UPDATE jobs SET heartbeat=0 WHERE id=?').run('old-job');
 assert.equal((await f.team(f.b,'takeover',request)).status,200);
 assert.equal(f.app.db.prepare('SELECT assignee FROM tasks WHERE id=?').get(task).assignee,f.b.id);
 assert.equal(f.app.db.prepare('SELECT archived FROM workspaces WHERE job=?').get('old-copy').archived,1);
 assert.equal(f.app.db.prepare('SELECT lease FROM jobs WHERE id=?').get('old-job').lease,null);
 assert.equal(metadata(f.app.db,'team:v1:interrupted-job:old-job').id,'old-job');
});
test('new files cannot overwrite existing content, traverse, create secret paths or use Windows device names',t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-new-file-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const result=createSource(dir,'src/seite.ts','export const title="Hallo";');assert.match(result.content,/Hallo/);
 assert.throws(()=>createSource(dir,'src/seite.ts','overwrite'),/existiert/);
 for(const file of ['../outside','.git/config','.env','src/CON.txt','secret.key','src/aux','src/test.'])assert.throws(()=>createSource(dir,file,''));
 assert.match(readFileSync(path.join(dir,'src/seite.ts'),'utf8'),/Hallo/);
 assert.deepEqual(parseCommand('node --test "mein test.mjs"'),['node','--test','mein test.mjs']);
 assert.deepEqual(parseCommand('["npm","test"]'),['npm','test']);assert.throws(()=>parseCommand('npm test && other'),/Shell/);assert.throws(()=>parseCommand('node "open'),/offen/);
});
