import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {LocalRunner,command} from './runner.mjs';

test('two accounts review real Git snapshots: no self approval, SHA binding, feedback and merge gate',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-review-')),origin='http://127.0.0.1:44321';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin});
 await new Promise(r=>app.server.listen(44321,'127.0.0.1',r));
 const request=async(route,value,cookie,token)=>{
  const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 const git=(cwd,...args)=>command(['git',...args],cwd);let runner;
 try{
  const a=await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'Person A',password:'test-password-12345'});
  const b=await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'Person B',password:'test-password-54321'});
  const device=(await request('/api/development',{action:'device',name:'A-PC'},a.cookie)).data;
  const repo=path.join(dir,'repo'),bare=path.join(dir,'remote.git');mkdirSync(repo);
  await git(dir,'init','--bare',bare);await git(repo,'init','-b','main');await git(repo,'config','user.name','Test');await git(repo,'config','user.email','test@fixture.invalid');
  writeFileSync(path.join(repo,'value.txt'),'Original\n');writeFileSync(path.join(repo,'check.cjs'),"if(!require('fs').existsSync('value.txt'))process.exit(1);console.log('real check passed');");
  await git(repo,'add','.');await git(repo,'commit','-m','baseline');await git(repo,'remote','add','origin',bare);await git(repo,'push','-u','origin','main');
  const config={stateDir:path.join(dir,'runner'),projects:{website:{repo,base:'main',check:[process.execPath,'check.cjs'],publish:false}}};runner=new LocalRunner(config);
  async function dispatch(operation,worktree,source,extra={}){
   const queued=await request('/api/development',{action:'job',device:device.id,project:'website',operation,worktree,source,...extra},a.cookie);assert.equal(queued.status,200,JSON.stringify(queued.data));
   const job=(await request('/api/runner/poll',{},null,device.token)).data.job;assert.equal(job.id,queued.data.id);
   const events=[];const result=await runner.run(job,{onEvent:event=>events.push({...event,seq:events.length+1})});
   const heartbeat=await request('/api/runner/report',{id:job.id,lease:job.lease,heartbeat:true,events:events.slice(0,40)},null,device.token);assert.equal(heartbeat.status,200);
   const report=await request('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result},null,device.token);assert.equal(report.status,200);
   return {job,result};
  }
  const prepared=await dispatch('prepare');writeFileSync(path.join(prepared.result.path,'value.txt'),'Gemeinsam prüfen\n');
  writeFileSync(path.join(prepared.result.path,'new.txt'),'Neue Datei\n');
  const files=await dispatch('files',prepared.job.id);assert.ok(files.result.files.includes('value.txt'));assert.ok(!files.result.files.includes('new.txt'));
  const opened=await dispatch('read-file',prepared.job.id,undefined,{file:'value.txt'});assert.equal(opened.result.content,'Gemeinsam prüfen\n');
  assert.equal((await request('/api/development/job?id='+opened.job.id,null,b.cookie)).status,403);
  assert.equal((await request('/api/development',{action:'job',operation:'files',device:device.id,project:'website',worktree:prepared.job.id},b.cookie)).status,403);
  const saved=await dispatch('save-file',prepared.job.id,undefined,{file:'value.txt',revision:opened.result.revision,content:'Gemeinsam prüfen\n'});assert.equal(saved.result.saved,true);
  // File results and their real command logs have the same ownership boundary.
  for(const fileJob of [files,opened,saved]){
   const route='/api/development/events?job='+fileJob.job.id;
   assert.equal((await request(route)).status,401);
   const own=await request(route,null,a.cookie);assert.equal(own.status,200);
   const fileEvents=own.data.events.filter(event=>event.type==='files');
   assert.ok(fileEvents.some(event=>event.text.includes('value.txt')),'Dateioperation muss im eigenen Auditlog erkennbar sein.');
   assert.ok(fileEvents.every(event=>event.text.length<=4000),'Auditlogs müssen begrenzt bleiben.');
   assert.ok(!JSON.stringify(own.data.events).includes('Gemeinsam prüfen'),'Inhalte dürfen nie im Auditlog auftauchen.');
   assert.ok(!JSON.stringify(own.data.events).includes('Neue Datei'),'Ungespeicherte Dateien dürfen nicht im Auditlog auftauchen.');
   assert.equal((await request(route,null,b.cookie)).status,403);
  }
  const rejectedEvents=[];
  await assert.rejects(runner.run({...opened.job,action:'read-file',payload:{...opened.job.payload,file:'new.txt'}},{onEvent:e=>rejectedEvents.push(e)}),/Git erfasste/);
  assert.equal(rejectedEvents.some(event=>event.type==='files'),false,'Ungültiger Dateizugriff darf kein Erfolgsereignis erzeugen.');
  const first=await dispatch('review',prepared.job.id);
  assert.match(first.result.diff,/Gemeinsam prüfen/);assert.match(first.result.diff,/new.txt/);assert.equal(first.result.published,false);
  assert.equal(await git(dir,'--git-dir',bare,'rev-parse','main'),prepared.result.commit);
  const review=(cookie,decision,body='',target=first,commit=target.result.commit,id=randomUUID())=>request('/api/development/reviews',{id,job:target.job.id,commit,decision,body},cookie);
  assert.equal((await review(a.cookie,'approved')).status,403);
  assert.equal((await review(b.cookie,'approved','',first,'a'.repeat(40))).status,409);
  assert.equal((await review(b.cookie,'changes')).status,400);
  const commentId=randomUUID();assert.equal((await review(a.cookie,'comment','Bitte prüfen',first,first.result.commit,commentId)).status,200);
  assert.equal((await review(a.cookie,'comment','Bitte prüfen',first,first.result.commit,commentId)).status,200);
  assert.equal((await review(a.cookie,'comment','Anders',first,first.result.commit,commentId)).status,409);
  assert.equal((await review(b.cookie,'changes','Bitte Text ändern')).data.state,'changes_requested');
  assert.equal((await review(b.cookie,'comment','Zusätzliche Erklärung')).data.state,'changes_requested');
  writeFileSync(path.join(prepared.result.path,'value.txt'),'Gemeinsam verbessert\n');
  const second=await dispatch('review',prepared.job.id);assert.notEqual(second.result.commit,first.result.commit);
  assert.equal((await review(b.cookie,'approved')).data.state,'approved');
  assert.equal((await request('/api/development/reviews?job='+second.job.id,null,b.cookie)).data.state,'pending');
  assert.equal((await review(b.cookie,'approved','Passt',second)).data.state,'approved');
  config.projects.website.publish=true;
  const submitted=await dispatch('submit',prepared.job.id);
  const integrate=()=>request('/api/development',{action:'job',device:device.id,project:'website',operation:'integrate',source:submitted.job.id},a.cookie);
  assert.equal((await integrate()).status,409); // local snapshot approval cannot silently approve another job
  assert.equal((await review(b.cookie,'approved','Veröffentlichten Stand geprüft',submitted)).data.state,'approved');
  const waiting=await integrate();assert.equal(waiting.status,200);
  assert.equal((await review(b.cookie,'changes','Freigabe zurückgenommen',submitted)).data.state,'changes_requested');
  assert.equal((await request('/api/runner/poll',{},null,device.token)).data.job,null);
  assert.equal(app.db.prepare('SELECT status FROM jobs WHERE id=?').get(waiting.data.id).status,'failed');
  await review(b.cookie,'approved','Erneut geprüft',submitted);
  const merged=await dispatch('integrate',undefined,submitted.job.id);assert.equal(merged.result.integrated,true);
  assert.equal(await git(dir,'--git-dir',bare,'rev-parse','main'),merged.result.commit);
  const discussion=await request('/api/development/reviews?job='+first.job.id,null,a.cookie);
  assert.equal(discussion.data.entries.filter(e=>e.id===commentId).length,1);assert.equal(discussion.data.entries[0].name,'Person A');
  assert.equal((await request('/api/development/reviews?job='+first.job.id)).status,401);
  const large=await dispatch('prepare');writeFileSync(path.join(large.result.path,'large.txt'),'a sufficiently long line\n'.repeat(4000));
  const truncated=await dispatch('review',large.job.id);assert.equal(truncated.result.diffTruncated,true);
  assert.equal((await review(b.cookie,'approved','',truncated)).status,409);
 }finally{
  runner?.close();await new Promise(r=>app.server.close(r));app.db.close();
  assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep+'schmaqq-review-'));rmSync(dir,{recursive:true,force:true});
 }
});
