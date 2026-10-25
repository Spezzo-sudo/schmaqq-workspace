import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite,digest} from './store.mjs';

async function fixture(t){
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-room-test-'));
 const origin='http://127.0.0.1:44891';
 const app=createStudioServer({filename:path.join(dir,'test.sqlite'),origin,previewOrigin:'http://127.0.0.1:44892',resetMailer:null});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const host='http://127.0.0.1:'+app.server.address().port;
 async function post(body,cookie,headers={},route='/api/room'){
  const r=await fetch(host+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},body:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 async function get(route,cookie){const r=await fetch(host+route,{headers:cookie?{Cookie:cookie}:{}});return {status:r.status,data:await r.json()};}
 const people=[];
 for(const [index,name] of ['Marco Fixture','Markus Fixture'].entries()){
  const email=`person${index}@fixture.invalid`,invite=createInvite(app.db,email,index===0?'owner':'member');
  const result=await post({invite,name,password:'isolated-fixture-password-2026'},null,{},'/api/auth/register');assert.equal(result.status,200);
  const member=app.db.prepare('SELECT id FROM members WHERE email=?').get(email);people.push({...member,cookie:result.cookie,name});
 }
 const [marco,markus]=people;
 const create=async(title='Klimafinder.ch')=>{const r=await post({action:'create',id:randomUUID(),title,description:'Gemeinsam eine nutzbare Suche entwickeln.'},marco.cookie);assert.equal(r.status,200);return r.data.project;};
 return {app,post,get,marco,markus,create};
}

test('room: project can be created from a phone without repo/path/device and retried without duplicates',async t=>{
 const f=await fixture(t);const request={action:'create',id:randomUUID(),title:'Mobile project',description:'Just an idea'};
 const first=await f.post(request,f.marco.cookie),retry=await f.post(request,f.marco.cookie);
 assert.equal(first.status,200);assert.deepEqual(retry.data,first.data);
 assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM projects WHERE title=?').get(request.title).n,1);
 const other=await f.post(request,f.markus.cookie);assert.equal(other.status,409);
 const room=await f.get('/api/room?project='+first.data.project,f.markus.cookie);
 assert.equal(room.status,200);assert.equal(room.data.meta.repository,null);assert.equal(room.data.messages.length,0);
 assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM devices').get().n,0,'No runner registration');
});

test('room: authenticated boundary, strict origin, method and input bounds remain enforced',async t=>{
 const f=await fixture(t);
 assert.equal((await f.get('/api/rooms')).status,401);
 assert.equal((await f.post({action:'create',id:randomUUID(),title:'Denied'},f.marco.cookie,{Origin:'https://attacker.invalid'})).status,403);
 assert.equal((await f.post({action:'create',id:randomUUID(),title:'x'.repeat(161)},f.marco.cookie)).status,400);
 assert.equal((await f.get('/api/room?project=missing',f.marco.cookie)).status,404);
 const p=await f.create();assert.equal((await f.post({action:'message',project:p,id:randomUUID(),body:'x'.repeat(4001)},f.marco.cookie)).status,400);
});

test('room: two people converse, source-bound task conversion is atomic and cross-project references rejected',async t=>{
 const f=await fixture(t),p=await f.create(),q=await f.create('Other room');
 const message={action:'message',project:p,id:randomUUID(),body:'Die Suche muss nach Region filtern.'};
 assert.equal((await f.post(message,f.marco.cookie)).status,200);
 assert.equal((await f.post(message,f.marco.cookie)).status,200);
 assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM messages WHERE id=?').get(message.id).n,1);
 const reply={action:'message',project:p,id:randomUUID(),body:'Ich uebernehme den ersten Entwurf.',replyTo:message.id};
 assert.equal((await f.post(reply,f.markus.cookie)).status,200);
 const cross=await f.post({...reply,id:randomUUID(),project:q},f.markus.cookie);assert.equal(cross.status,400);
 const a={action:'task',id:randomUUID(),project:p,title:'Regionalfilter',description:'',source:message.id};
 const first=await f.post(a,f.marco.cookie),second=await f.post({...a,id:randomUUID()},f.markus.cookie);
 assert.equal(first.status,200);assert.equal(second.data.task,first.data.task);assert.equal(second.data.reused,true);
 assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM tasks WHERE project=?').get(p).n,1);
 const room=(await f.get('/api/room?project='+p,f.markus.cookie)).data;
 assert.equal(room.messages.find(m=>m.id===message.id).taskId,first.data.task);
 assert.equal(room.messages.find(m=>m.id===reply.id).replyTo,message.id);
 const claim=await f.post({action:'claim',task:first.data.task},f.markus.cookie,{},'/api/collaboration/task');assert.equal(claim.status,200);
 assert.equal((await f.post({action:'claim',task:first.data.task},f.marco.cookie,{},'/api/collaboration/task')).status,409,'No silent takeover');
 assert.equal((await f.post({...a,id:randomUUID(),project:q},f.marco.cookie)).status,400);
});

test('room: decisions and notes retain project/source and are included in bounded context',async t=>{
 const f=await fixture(t),p=await f.create();const message={action:'message',project:p,id:randomUUID(),body:'Wir beginnen ohne neue Cloudkosten.'};
 await f.post(message,f.marco.cookie);
 const note={action:'note',id:randomUUID(),project:p,title:'Kostenrahmen',body:message.body,kind:'decision',source:message.id};
 assert.equal((await f.post(note,f.markus.cookie)).status,200);
 const state=(await f.get('/api/room?project='+p,f.marco.cookie)).data;
 assert.equal(state.notes.length,1);assert.equal(state.notes[0].source,message.id);assert.equal(state.notes[0].author,f.markus.id);
 const context=(await f.get('/api/room/context?project='+p,f.marco.cookie)).data;
 assert.ok(context.text.includes(message.body));assert.match(context.hash,/^[a-f0-9]{64}$/);assert.ok(context.text.length<=8000);
 assert.equal(context.scope,'shared-project-only');
});

test('room: unsafe links/credentials refused; repository is explicitly reference-only with revision conflict protection',async t=>{
 const f=await fixture(t),p=await f.create();
 for(const url of ['javascript:alert(1)','http://example.com','https://user:pass@github.com/a/b','https://example.com/?token=secret','https://example.com/?%74oken=secret','https://example.com/#access_token=secret']){
  assert.equal((await f.post({action:'link',id:randomUUID(),project:p,title:'Unsafe',url,kind:'reference'},f.marco.cookie)).status,400);
 }
 const ref=await f.post({action:'repository',project:p,url:'https://github.com/example/project.git',revision:0},f.marco.cookie);
 assert.equal(ref.status,200);assert.equal(ref.data.status,'reference-only');assert.equal(ref.data.repository,'https://github.com/example/project');
 assert.equal((await f.post({action:'repository',project:p,url:'https://github.com/example/other',revision:0},f.markus.cookie)).status,409);
 assert.equal((await f.post({action:'repository',project:p,url:'https://github.com/example/project/tree/main',revision:1},f.markus.cookie)).status,400);
 const link=await f.post({action:'link',id:randomUUID(),project:p,title:'Freigegebener Chat',url:'https://chatgpt.com/share/example-reference',kind:'chatgpt'},f.marco.cookie);
 assert.equal(link.status,200);
 assert.equal((await f.get('/api/room?project='+p,f.marco.cookie)).data.links[0].status,'linked-not-synced');
});

async function enableModel(f,project){
 const device=randomUUID();f.app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(device,f.markus.id,'Markus Fixture PC',digest('fixture-device-'+device),Date.now());
 f.app.db.prepare('INSERT INTO ai_resources VALUES(?,?,?,?,?,?,?)').run(device,JSON.stringify(['fixture-local-model']),'ready',1,JSON.stringify([project]),'disabled',Date.now());
 return device;
}

test('room: team compute is opt-in, context-bound, request-idempotent, private until explicit share',async t=>{
 const f=await fixture(t),p=await f.create();const device=await enableModel(f,p);
 const context=(await f.get('/api/room/context?project='+p,f.marco.cookie)).data;
 const request={action:'ai',id:randomUUID(),project:p,device,model:'fixture-local-model',prompt:'Welche Fragen fehlen?',contextHash:context.hash};
 assert.equal((await f.post(request,f.marco.cookie)).status,403,'Owner consent required');
 f.app.db.prepare('INSERT INTO ai_grants VALUES(?,?)').run(device,f.marco.id);
 const result=await f.post(request,f.marco.cookie);assert.equal(result.status,200);
 assert.equal((await f.post(request,f.marco.cookie)).data.job,result.data.job);
 const job=f.app.db.prepare('SELECT * FROM jobs WHERE id=?').get(result.data.job);
 assert.equal(job.owner,f.marco.id);assert.equal(job.device,device);assert.equal(job.action,'local-ai');
 assert.ok(JSON.parse(job.payload).prompt.includes('Klimafinder.ch'));
 f.app.db.prepare("UPDATE jobs SET status='completed',result=? WHERE id=?").run(JSON.stringify({output:'Synthetisches Modellergebnis; keine echte Inferenz.'}),job.id);
 assert.equal((await f.get('/api/room?project='+p,f.marco.cookie)).data.messages.length,0,'Never auto-publish private output');
 assert.equal((await f.post({action:'share-result',id:randomUUID(),project:p,job:job.id},f.markus.cookie)).status,403,'Device owner cannot publish another requester result');
 const published=await f.post({action:'share-result',id:randomUUID(),project:p,job:job.id},f.marco.cookie);assert.equal(published.status,200);
 const after=(await f.get('/api/room?project='+p,f.markus.cookie)).data;assert.equal(after.messages[0].kind,'ai-shared');assert.equal(after.messages[0].reviewed,false);
 assert.equal(after.messages[0].author,f.marco.id);
 const twice=await f.post({action:'share-result',id:randomUUID(),project:p,job:job.id},f.marco.cookie);assert.equal(twice.data.message,published.data.message);
});

test('room: stale context/offline/revoked model fail without queuing jobs',async t=>{
 const f=await fixture(t),p=await f.create();const device=await enableModel(f,p);f.app.db.prepare('INSERT INTO ai_grants VALUES(?,?)').run(device,f.marco.id);
 const old=(await f.get('/api/room/context?project='+p,f.marco.cookie)).data;
 await f.post({action:'message',id:randomUUID(),project:p,body:'Neue Anforderung'},f.markus.cookie);
 const request={action:'ai',id:randomUUID(),project:p,device,model:'fixture-local-model',prompt:'Bitte prüfen',contextHash:old.hash};
 assert.equal((await f.post(request,f.marco.cookie)).status,409);
 const current=(await f.get('/api/room/context?project='+p,f.marco.cookie)).data;
 f.app.db.prepare('UPDATE ai_resources SET updated=? WHERE device=?').run(Date.now()-120000,device);
 assert.equal((await f.post({...request,id:randomUUID(),contextHash:current.hash},f.marco.cookie)).status,403);
 f.app.db.prepare('UPDATE ai_resources SET updated=? WHERE device=?').run(Date.now(),device);f.app.db.prepare('UPDATE devices SET revoked=1 WHERE id=?').run(device);
 assert.equal((await f.post({...request,id:randomUUID(),contextHash:current.hash},f.marco.cookie)).status,403);
 assert.equal(f.app.db.prepare("SELECT count(*) AS n FROM jobs WHERE action='local-ai'").get().n,0);
});

test('room: the next older message page stays in this room and no message ID can be overwritten',async t=>{
 const f=await fixture(t),p=await f.create(),q=await f.create('Not this room');
 for(let i=0;i<103;i++)f.app.db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run('msg-'+String(i).padStart(3,'0'),p,f.marco.id,'Message '+i,1000+i);
 const page=(await f.get('/api/room?project='+p,f.markus.cookie)).data;assert.equal(page.messages.length,100);assert.equal(page.more,true);
 const older=(await f.get('/api/room?project='+p+'&before='+page.messages[0].id,f.markus.cookie)).data;assert.equal(older.messages.length,3);assert.equal(older.more,false);
 assert.equal((await f.get('/api/room?project='+q+'&before='+page.messages[0].id,f.markus.cookie)).status,400);
 assert.equal((await f.post({action:'message',id:'msg-000',project:p,body:'Overwrite'},f.markus.cookie)).status,409);
});

test('R26: clear task handoff is not a fake start; concurrent handoffs refuse stale ownership',async t=>{
 const f=await fixture(t),p=await f.create();
 const made=await f.post({action:'task',id:randomUUID(),project:p,title:'Designvorlage verwenden',description:'Bisherige Vorlage als Referenz',source:undefined},f.marco.cookie);
 assert.equal(made.status,200);const task=made.data.task;
 const assign=async(person,expectedAssignee,by=f.marco.cookie)=>f.post({action:'handoff',task,assignee:person,expectedAssignee},by,{},'/api/collaboration/task');
 assert.equal((await assign(f.markus.id,null)).status,200);
 const state=(await f.get('/api/collaboration/task?id='+task,f.markus.cookie)).data;
 assert.equal(state.task.assignee,f.markus.id);
 assert.equal(state.task.status,'todo','A handoff does NOT claim that code work has started');
 assert.equal(state.workspaces.length,0);
 assert.equal((await assign(f.marco.id,null)).status,409,'Stale reassignment rejected');
 assert.equal((await assign(f.marco.id,f.markus.id)).status,403,'Other person cannot unilaterally grab their task');
 assert.equal((await assign(f.marco.id,f.markus.id,f.markus.cookie)).status,200,'Assigned member may hand off');
 assert.equal((await assign(null,f.marco.id,f.marco.cookie)).status,200);
 assert.equal((await assign('not-a-member',null)).status,400);
 const [a,b]=await Promise.all([assign(f.marco.id,null),assign(f.markus.id,null)]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);
 assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM workspaces WHERE task=?').get(task).n,0);
});

test('R26: task brief revisions protect concurrent edits and survive reload; old task data preserved',async t=>{
 const f=await fixture(t),p=await f.create();
 const task=(await f.post({action:'task',id:randomUUID(),project:p,title:'Startentwurf',description:'Erstes Ziel'},f.marco.cookie)).data.task;
 const before=(await f.get('/api/collaboration/task?id='+task,f.markus.cookie)).data;
 assert.equal(before.brief.revision,0);
 const update={action:'brief',task,title:'SCHMAQQ Designreferenz',description:'Ergebnis: responsive Workspace-Oberfläche',revision:0};
 assert.equal((await f.post(update,f.marco.cookie,{},'/api/collaboration/task')).status,200);
 assert.equal((await f.post({...update,title:'Stale overwrite'},f.markus.cookie,{},'/api/collaboration/task')).status,409);
 const after=(await f.get('/api/collaboration/task?id='+task,f.markus.cookie)).data;
 assert.equal(after.brief.revision,1);
 assert.equal(after.task.title,update.title);
 assert.equal(after.task.description,update.description);
 assert.equal((await f.post({...update,revision:1,description:'Neu abgestimmt'},f.markus.cookie,{},'/api/collaboration/task')).status,200);
 assert.equal((await f.get('/api/collaboration/task?id='+task,f.marco.cookie)).data.brief.revision,2);
 assert.equal((await f.post({...update,revision:2,title:' '},f.marco.cookie,{},'/api/collaboration/task')).status,400);
 assert.equal(f.app.db.prepare('SELECT count(*) AS n FROM tasks WHERE id=?').get(task).n,1);
});
