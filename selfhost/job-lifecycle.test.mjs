import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {expireStaleJobs,HEARTBEAT_LIMIT_MS,QUEUE_LIMIT_MS} from './job-lifecycle.mjs';

const capabilities=projects=>({models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled',host:{kind:'server',os:'linux',arch:'x64',node:'v24.22.0',cpus:2,memoryMb:2048},development:projects.map(id=>({id,setupVersion:1,check:true,preview:true,allowCodex:false,publish:true}))});

test('two people on one Werkstatt: other work only queues, silent jobs end on the server clock, the admin can stop them',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-job-lifecycle-')),origin='http://127.0.0.1:44693';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44694'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const a=await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'A',password:'fixture-password-1234'});
 const b=await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'B',password:'fixture-password-1234'});
 const id=email=>app.db.prepare('SELECT id FROM members WHERE email=?').get(email).id,aId=id('a@fixture.invalid'),bId=id('b@fixture.invalid');
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Team',description:''},a.cookie)).data.project;
 await request('/api/project-roles',{action:'roles',project,member:bId,roles:['developer']},a.cookie);
 const worker=(await request('/api/development',{action:'device',name:'VPS-Worker'},a.cookie)).data;
 assert.equal((await request('/api/runner/capabilities',capabilities([project]),null,worker.token)).status,200);
 await request('/api/runner/poll',{},null,worker.token);
 const insert=(jid,owner,action,status,payload={},extra={})=>app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,started,heartbeat,result) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(jid,owner,worker.id,project,action,JSON.stringify(payload),status,extra.created??Date.now(),extra.started??null,extra.heartbeat??null,JSON.stringify(extra.result??{branch:'studio/'+jid}));
 for(const [copy,owner] of [['copy-a',aId],['copy-b',bId]]){insert(copy,owner,'prepare','completed');app.db.prepare("INSERT INTO workspaces(job,title,scope,task,archived,revision) VALUES(?,'Kopie','',NULL,0,1)").run(copy);}

 // A's tests run on the shared Werkstatt; B can still open files and submit – the work queues.
 insert('test-a',aId,'check','running',{worktree:'copy-a'},{started:Date.now(),heartbeat:Date.now()});
 const read=await request('/api/development',{action:'job',device:'auto',project,operation:'read-file',worktree:'copy-b',file:'site/index.html'},b.cookie);
 assert.equal(read.status,200);
 app.db.prepare("UPDATE jobs SET status='completed' WHERE id=?").run(read.data.id);
 const submit=await request('/api/development',{action:'job',device:'auto',project,operation:'submit',worktree:'copy-b'},b.cookie);
 assert.equal(submit.status,200);
 assert.equal(app.db.prepare('SELECT device FROM jobs WHERE id=?').get(submit.data.id).device,worker.id,'auto follows the copy');
 // The same copy stays locked while its own job is active.
 assert.equal((await request('/api/development',{action:'job',device:'auto',project,operation:'submit',worktree:'copy-b'},b.cookie)).status,409);

 // A's runner goes silent: the job ends without that runner asking again.
 app.db.prepare('UPDATE jobs SET heartbeat=? WHERE id=?').run(Date.now()-HEARTBEAT_LIMIT_MS-1000,'test-a');
 assert.equal(expireStaleJobs(app.db).lost,1);
 const ended=app.db.prepare('SELECT status,result FROM jobs WHERE id=?').get('test-a');
 assert.equal(ended.status,'interrupted');assert.match(JSON.parse(ended.result).error,/Verbindung zur Werkstatt/);

 // A queued job on an unreachable Werkstatt ends after the waiting limit.
 const old=Date.now()-QUEUE_LIMIT_MS-60000;
 app.db.prepare('UPDATE devices SET seen=? WHERE id=?').run(old,worker.id);app.db.prepare('UPDATE jobs SET created=? WHERE id=?').run(old,submit.data.id);
 assert.equal(expireStaleJobs(app.db).waiting,1);

 // A hanging Git step of another person: the project admin can stop it once the runner is silent.
 insert('hang-b',bId,'submit','running',{worktree:'copy-b'},{started:Date.now(),heartbeat:Date.now()});
 assert.equal((await request('/api/development',{action:'cancel',id:'hang-b'},a.cookie)).status,409,'a live Git step still finishes first');
 app.db.prepare('UPDATE jobs SET heartbeat=? WHERE id=?').run(Date.now()-HEARTBEAT_LIMIT_MS-1000,'hang-b');
 assert.equal((await request('/api/development',{action:'cancel',id:'hang-b'},a.cookie)).status,200);
 assert.equal(app.db.prepare('SELECT status FROM jobs WHERE id=?').get('hang-b').status,'interrupted');
 assert.equal((await request('/api/development',{action:'cancel',id:'test-a'},b.cookie)).status,404,'others cannot stop the admin\'s job');
});
