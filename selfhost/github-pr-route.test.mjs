import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('authenticated read-only GitHub PR route: owner-safe studio job, no mutations and no provider calls',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'studio-r23-gh-route-')),origin='http://127.0.0.1:44582';
 let called=0;
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44583',
  pullRequestReader:async job=>{
   called++;assert.equal(job.id,'r23-pr-job');assert.equal(job.project,'website');return {state:'matched',mergeReady:false,ci:'not_verified',reviews:'not_verified'};
  }});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(44582,'127.0.0.1',resolve);});
 const request=(route,cookie)=>fetch(origin+route,{headers:cookie?{Cookie:cookie}:{}});
 const send=(route,payload,cookie)=>fetch(origin+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(payload)});
 try{
  const register=await send('/api/auth/register',{invite:createInvite(app.db,'r23-test@fixture.invalid','owner'),name:'R23 Fixture',password:'test-password-r23'});
  assert.equal(register.status,200);
  const cookie=register.headers.get('set-cookie')?.split(';')[0];
  const user=app.db.prepare("SELECT id FROM members WHERE email='r23-test@fixture.invalid'").get();
  const device=await (await send('/api/development',{action:'device',name:'Fixture PC'},cookie)).json();
  app.db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)")
   .run('r23-pr-job',user.id,device.id,'website','submit','{}','completed',Date.now(),
   JSON.stringify({workflow:'pull-request',published:true,commit:'a'.repeat(40),branch:'studio/qa-r23'}));
  const before=app.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n;
  assert.equal((await request('/api/development/github-pr?job=r23-pr-job')).status,401);
  const result=await request('/api/development/github-pr?job=r23-pr-job',cookie);
  assert.equal(result.status,200);assert.deepEqual(await result.json(),{state:'matched',mergeReady:false,ci:'not_verified',reviews:'not_verified'});
  assert.equal(called,1);
  assert.equal((await request('/api/development/github-pr?job=no-such-job',cookie)).status,404);
  assert.equal((await send('/api/development/github-pr?job=r23-pr-job',{anything:true},cookie)).status,405);
  assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,before);
 }finally{
  await new Promise(r=>app.server.close(r));app.db.close();
  assert.ok(dir.startsWith(path.join(tmpdir(),'studio-r23-gh-route-')));
  rmSync(dir,{recursive:true,force:true});
 }
});
