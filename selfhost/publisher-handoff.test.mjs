import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {LocalRunner,command} from './runner.mjs';

const git=(cwd,...args)=>command(['git',...args],cwd);
const endpoint='/api/runner/publisher-handoff';

test('reviewed handoff: two identities, owned runner, exact commit, local Git bundle, safe replay and denials',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-publisher-fixture-'));
 const bare=path.join(dir,'remote.git'),seed=path.join(dir,'seed'),incoming=path.join(dir,'incoming');
 mkdirSync(seed);mkdirSync(incoming);
 const origin='http://127.0.0.1:44641';
 const binding={internalProjectId:'studio',githubRepositoryId:'12345',owner:'Spezzo-sudo',name:'schmaqq-workspace',defaultBranch:'main',allowedToPublish:true};
 writeFileSync(path.join(dir,'fixture.json'),JSON.stringify({mode:'local-test-only',internalProjectId:'studio',githubRepositoryId:'12345',defaultBranch:'main'}));
 const app=createStudioServer({
  filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44642',
  publisherFixture:{binding,fixtureRoot:dir},
 });
 let runner;
 const request=async(route,value,cookie,bearer)=>{
  const r=await fetch(origin+route,{method:'POST',headers:{
   Origin:origin,'Content-Type':'application/json',
   ...(cookie?{Cookie:cookie}:{}),...(bearer?{Authorization:'Bearer '+bearer}:{}),
  },body:JSON.stringify(value)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 try{
  await git(dir,'init','--bare',bare);
  await git(seed,'init','-b','main');
  await git(seed,'config','user.name','Fixture');
  await git(seed,'config','user.email','fixture@example.invalid');
  writeFileSync(path.join(seed,'file.txt'),'baseline\n');
  writeFileSync(path.join(seed,'check.cjs'),"const assert=require('node:assert/strict');assert.ok(require('node:fs').existsSync('file.txt'));console.log('test passed');");
  await git(seed,'add','.');await git(seed,'commit','-m','baseline');
  const base=await git(seed,'rev-parse','HEAD');
  await git(seed,'remote','add','origin',bare);
  await git(seed,'push','origin','HEAD:refs/heads/main');
  app.db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('studio','Test Studio','Isolated','sage','Im Aufbau',Date.now());
  await new Promise(resolve=>app.server.listen(44641,'127.0.0.1',resolve));
  const a=await request('/api/auth/register',{invite:createInvite(app.db,'owner@fixture.invalid','owner'),name:'Owner A',password:'test-password-12345'});
  const b=await request('/api/auth/register',{invite:createInvite(app.db,'reviewer@fixture.invalid'),name:'Reviewer B',password:'test-password-54321'});
  assert.equal(a.status,200);assert.equal(b.status,200);
  const da=await request('/api/development',{action:'device',name:'A-device'},a.cookie);
  const db=await request('/api/development',{action:'device',name:'B-device'},b.cookie);
  assert.equal(da.status,200);assert.equal(db.status,200);
  runner=new LocalRunner({stateDir:path.join(dir,'runner-state'),projects:{studio:{repo:seed,base:'main',check:[process.execPath,'check.cjs'],publish:false}}});
  async function dispatch(operation,worktree){
   const queued=await request('/api/development',{action:'job',device:da.data.id,project:'studio',operation,...(worktree?{worktree}:{} )},a.cookie);
   assert.equal(queued.status,200,JSON.stringify(queued.data));
   const job=(await request('/api/runner/poll',{},null,da.data.token)).data.job;
   assert.equal(job.id,queued.data.id);
   const result=await runner.run(job);
   const reported=await request('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result},null,da.data.token);
   assert.equal(reported.status,200);
   return {job,result};
  }
  const prepared=await dispatch('prepare');
  writeFileSync(path.join(prepared.result.path,'file.txt'),'new feature\n');
  const reviewed=await dispatch('review',prepared.job.id);
  assert.equal(reviewed.result.branch,'studio/'+prepared.job.id);
  assert.equal(reviewed.result.base,base);
  assert.notEqual(reviewed.result.commit,base);
  const bundle=path.join(incoming,'work.bundle');
  await git(seed,'bundle','create',bundle,'refs/heads/'+reviewed.result.branch,'^main');
  const payload={
   reviewJob:reviewed.job.id,projectId:'studio',githubRepositoryId:'12345',
   branch:reviewed.result.branch,commit:reviewed.result.commit,expectedBaseCommit:reviewed.result.base,
   bundleBase64:readFileSync(bundle).toString('base64'),
  };
  const upload=(value=payload,bearer=da.data.token)=>request(endpoint,value,null,bearer);
  assert.equal((await upload()).status,409); // Review not approved.
  const unauthenticated=await upload(payload,null);
  assert.equal(unauthenticated.status,401);
  assert.equal((await upload(payload,db.data.token)).status,403); // Other device not owner.
  assert.equal((await upload({...payload,githubRepositoryId:'54321'})).status,403);
  assert.equal((await upload({...payload,commit:'a'.repeat(40)})).status,409);
  assert.equal((await upload({...payload,branch:'main'})).status,409);
  assert.equal((await upload({...payload,expectedBaseCommit:'b'.repeat(40)})).status,409);
  // Bundle format/size checks only execute after the independent review gate.
  const myReview=await request('/api/development/reviews',{id:randomUUID(),job:reviewed.job.id,commit:reviewed.result.commit,decision:'approved',body:'Selbstfreigabe'},a.cookie);
  assert.equal(myReview.status,403);
  const decisionId=randomUUID();
  const approved=await request('/api/development/reviews',{id:decisionId,job:reviewed.job.id,commit:reviewed.result.commit,decision:'approved',body:'Geprüft'},b.cookie);
  assert.equal(approved.status,200);
  assert.equal(approved.data.state,'approved');
  assert.equal((await upload({...payload,bundleBase64:'x'.repeat(256)})).status,400);
  assert.equal((await upload({...payload,bundleBase64:'A'.repeat(7000001)})).status,400); // Exceeds schema limit.

  assert.equal(await git(dir,'--git-dir',bare,'rev-parse','refs/heads/main'),base);
  const first=await upload();
  assert.equal(first.status,200,JSON.stringify(first.data));
  assert.equal(first.data.created,true);
  const second=await upload();
  assert.equal(second.status,200,JSON.stringify(second.data));
  assert.equal(second.data.replayed,true);
  assert.equal(second.data.created,false);
  assert.equal(await git(dir,'--git-dir',bare,'rev-parse','refs/heads/main'),base);
  assert.equal(await git(dir,'--git-dir',bare,'rev-parse','refs/heads/'+payload.branch),payload.commit);
  // Losing independent approval cannot be ignored even for idempotent replays.
  const takenBack=await request('/api/development/reviews',{id:randomUUID(),job:reviewed.job.id,commit:reviewed.result.commit,decision:'changes',body:'Weitere Änderung nötig'},b.cookie);
  assert.equal(takenBack.status,200);
  assert.equal(takenBack.data.state,'changes_requested');
  assert.equal((await upload()).status,409);
  // A separate valid device cannot brute-force another owner's review indefinitely.
  let throttled;
  for(let i=0;i<34;i++)throttled=await upload(payload,db.data.token);
  assert.equal(throttled.status,429);
  assert.equal((await upload(payload,db.data.token)).status,429);
  app.db.prepare('UPDATE devices SET revoked=1 WHERE id=?').run(da.data.id);
  assert.equal((await upload()).status,401);
  assert.equal(await git(dir,'--git-dir',bare,'rev-parse','refs/heads/main'),base);
 }finally{
  runner?.close();
  if(app.server.listening)await new Promise(resolve=>app.server.close(resolve));
  app.db.close();
  rmSync(dir,{recursive:true,force:true});
 }
});

test('publisher upload stays unavailable by default even with a valid device',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-publisher-disabled-'));
 const origin='http://127.0.0.1:44643';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44644'});
 try{
  await new Promise(resolve=>app.server.listen(44643,'127.0.0.1',resolve));
  const r=await fetch(origin+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  assert.equal(r.status,404);
 }finally{
  await new Promise(resolve=>app.server.close(resolve));app.db.close();
  rmSync(dir,{recursive:true,force:true});
 }
});
