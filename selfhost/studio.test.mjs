import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,writeFileSync,mkdirSync,rmSync,readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite,digest} from './store.mjs';
import {LocalRunner,command} from './runner.mjs';

test('two members: private sessions, isolated devices, jobs, documents and shared preview',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-test-'));
 const studio=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin:'http://127.0.0.1:44310',previewOrigin:'http://127.0.0.1:44311'});
 await new Promise(r=>studio.server.listen(44310,'127.0.0.1',r));await new Promise(r=>studio.previewServer.listen(44311,'127.0.0.1',r));
 const base='http://127.0.0.1:44310';
 async function request(route,data,cookie,authorization){const r=await fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:base}:{}),...(cookie?{Cookie:cookie}:{}),...(authorization?{Authorization:`Bearer ${authorization}`}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  assert.equal((await request('/api/workspace')).status,401);
  const invite=createInvite(studio.db,'owner@test.invalid','owner');const owner=await request('/api/auth/register',{invite,name:'Marco',password:'fixture-password-12345'});assert.equal(owner.status,200);
  assert.equal((await request('/api/auth/register',{invite,name:'Duplicate',password:'fixture-password-12345'})).status,403);
  const secondInvite=await request('/api/invites',{email:'markus@test.invalid'},owner.cookie);const second=await request('/api/auth/register',{invite:new URL(secondInvite.data.link).searchParams.get('invite'),name:'Markus',password:'fixture-password-54321'});assert.equal(second.status,200);
  {const proposal=await request('/api/invites',{email:'other@test.invalid'},second.cookie);assert.equal(proposal.status,200);assert.equal(proposal.data.link,undefined);}
  const mine=await request('/api/development',{action:'device',name:'Marco-PC'},owner.cookie);const his=await request('/api/development',{action:'device',name:'Markus-PC'},second.cookie);
  assert.equal((await request('/api/development',{action:'job',device:his.data.id,project:'website',operation:'prepare'},owner.cookie)).status,403);
  const queued=await request('/api/development',{action:'job',device:mine.data.id,project:'website',operation:'prepare'},owner.cookie);assert.equal(queued.status,200);
  assert.equal((await request('/api/runner/poll',{},null,his.data.token)).data.job,null);
  const claimed=(await request('/api/runner/poll',{},null,mine.data.token)).data.job;assert.equal(claimed.id,queued.data.id);
  assert.equal((await request('/api/runner/poll',{},null,mine.data.token)).data.job,null);
  assert.equal((await request('/api/runner/report',{id:claimed.id,lease:'wrong',ok:true,result:{}},null,mine.data.token)).status,409);
  assert.equal((await request('/api/runner/report',{id:claimed.id,lease:claimed.lease,ok:true,result:{branch:'studio/'+claimed.id,output:'x'.repeat(60000)}},null,mine.data.token)).status,200);
  const compact=await request('/api/development',null,second.cookie);
  assert.equal(compact.data.jobs[0].result.output,undefined);
  assert.ok(JSON.stringify(compact.data).length<3000);
  assert.equal((await request('/api/development/job?id='+claimed.id)).status,401);
  const full=await request('/api/development/job?id='+claimed.id,null,second.cookie);
  assert.equal(full.data.job.result.output.length,60000);assert.ok(!('lease' in full.data.job));
  const docId=randomUUID();studio.db.prepare('INSERT INTO documents VALUES(?,?,?,?,?,?)').run(docId,'Briefing','Original',studio.db.prepare('SELECT id FROM members WHERE role=?').get('owner').id,1,Date.now());
  assert.equal((await request('/api/workspace',{action:'document',id:docId,title:'Briefing',body:'Aktuell',revision:1},owner.cookie)).status,200);
  assert.equal((await request('/api/workspace',{action:'document',id:docId,title:'Briefing',body:'Veraltet',revision:1},second.cookie)).status,409);
  const preview=await request('/api/development',{action:'job',device:mine.data.id,project:'website',operation:'preview',worktree:claimed.id},owner.cookie);
  const previewClaim=(await request('/api/runner/poll',{},null,mine.data.token)).data.job;
  const oversizedEvents=Array.from({length:41},(_,i)=>({seq:i+1,type:'message',text:'untrusted'}));
  const oversizedArray=await request('/api/runner/report',{id:preview.data.id,lease:previewClaim.lease,heartbeat:true,events:oversizedEvents},null,mine.data.token);
  assert.equal(oversizedArray.status,400,'Zod 4 must reject oversized event arrays');
  assert.equal(oversizedArray.data.error,'Bitte Eingaben prüfen.','Do not expose schema internals');
  const oversizedBundle=Object.fromEntries(Array.from({length:501},(_,i)=>['untrusted-'+i+'.txt','a']));
  oversizedBundle['index.html']='a';
  const tooManyFiles=await request('/api/runner/report',{id:preview.data.id,lease:previewClaim.lease,ok:true,result:{previewBundle:oversizedBundle}},null,mine.data.token);
  assert.equal(tooManyFiles.status,413,'Reject oversized record before Zod object traversal');
  assert.equal(studio.db.prepare('SELECT status FROM jobs WHERE id=?').get(preview.data.id).status,'running','Invalid reports must not write job state');
  const report=await request('/api/runner/report',{id:preview.data.id,lease:previewClaim.lease,ok:true,result:{previewBundle:{'index.html':Buffer.from('<h1>Gemeinsame Vorschau</h1>').toString('base64')}}},null,mine.data.token);assert.equal(report.status,200);
  const state=await request('/api/development',null,second.cookie),url=state.data.jobs.find(j=>j.id===preview.data.id).result.url;
  assert.equal(new URL(url).origin,'http://127.0.0.1:44311');assert.match(await (await fetch(url)).text(),/Gemeinsame Vorschau/);
  assert.equal((await fetch('http://127.0.0.1:44311/api/workspace')).status,404);
  const waiting=await request('/api/development',{action:'job',device:mine.data.id,project:'website',operation:'check',worktree:claimed.id},owner.cookie);
  assert.equal((await request('/api/development',{action:'cancel',id:waiting.data.id},second.cookie)).status,404);
  assert.equal((await request('/api/development',{action:'cancel',id:waiting.data.id},owner.cookie)).status,200);
  assert.equal((await request('/api/runner/poll',{},null,mine.data.token)).data.job,null);
  const running=await request('/api/development',{action:'job',device:mine.data.id,project:'website',operation:'codex',worktree:claimed.id,prompt:'Test only'},owner.cookie);
  const live=(await request('/api/runner/poll',{},null,mine.data.token)).data.job;
  const progress={id:live.id,lease:live.lease,heartbeat:true,events:[{seq:1,type:'message',text:'Laufende Antwort'}]};
  assert.equal((await request('/api/runner/report',progress,null,his.data.token)).status,409);
  assert.equal((await request('/api/runner/report',progress,null,mine.data.token)).status,200);
  await request('/api/runner/report',progress,null,mine.data.token);
  assert.equal((await request('/api/development/events?job='+live.id)).status,401);
  const events=await request('/api/development/events?job='+live.id,null,second.cookie);
  assert.equal((await request('/api/development/events?job='+live.id+'&after=1',null,second.cookie)).data.events.length,0);
  assert.equal(events.data.events.length,1);assert.equal(events.data.events[0].text,'Laufende Antwort');
  const publicState=(await request('/api/development',null,second.cookie)).data;
  assert.ok(publicState.jobs.every(j=>!('prompt' in j.payload)));
  const inspection=await request('/api/development',{action:'job',device:mine.data.id,project:'website',operation:'inspect'},owner.cookie);assert.equal(inspection.status,200);
  assert.ok(!('lease' in publicState.jobs[0]));
  assert.equal((await request('/api/development',{action:'cancel',id:running.data.id},owner.cookie)).status,200);
  assert.equal((await request('/api/runner/report',{...progress,events:[]},null,mine.data.token)).data.cancel,true);
  assert.equal((await request('/api/runner/poll',{},null,mine.data.token)).data.job,null);
  await request('/api/runner/report',{id:live.id,lease:live.lease,ok:false,result:{error:'Stopped'}},null,mine.data.token);
  assert.equal(studio.db.prepare('SELECT status FROM jobs WHERE id=?').get(live.id).status,'cancelled');
  assert.equal((await request('/api/development',{action:'revoke',id:mine.data.id},owner.cookie)).status,200);
  assert.equal((await request('/api/runner/poll',{},null,mine.data.token)).status,401);
 }finally{await new Promise(r=>studio.server.close(r));await new Promise(r=>studio.previewServer.close(r));studio.db.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'schmaqq-test-')));rmSync(dir,{recursive:true,force:true});}
});

test('two real Git workspaces: tests, reviewed merge, conflict stop and static preview bundle',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-git-'));const bare=path.join(dir,'remote.git'),seed=path.join(dir,'seed');mkdirSync(seed);let runnerA,runnerB;
 async function git(cwd,...args){return command(['git',...args],cwd);}
 try{
  await git(dir,'init','--bare',bare);await git(seed,'init','-b','main');await git(seed,'config','user.name','Test');await git(seed,'config','user.email','test@invalid.local');
  writeFileSync(path.join(seed,'value.txt'),'original\n');writeFileSync(path.join(seed,'check.cjs'),"const fs=require('fs');if(!fs.existsSync('value.txt'))process.exit(1);console.log('check passed');");
  writeFileSync(path.join(seed,'build.cjs'),"const fs=require('fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html','<h1>Schmaqq Test</h1>');");
  await git(seed,'add','.');await git(seed,'commit','-m','initial');await git(seed,'remote','add','origin',bare);await git(seed,'push','-u','origin','main');
  const configs=[];for(const name of ['a','b']){const repo=path.join(dir,name);await git(dir,'clone','--branch','main',bare,repo);await git(repo,'config','user.name',name);await git(repo,'config','user.email',`${name}@invalid.local`);configs.push({stateDir:path.join(dir,`runner-${name}`),projects:{website:{repo,base:'main',check:[process.execPath,'check.cjs'],preview:{build:[process.execPath,'build.cjs'],directory:'dist'}}}});}
  runnerA=new LocalRunner(configs[0]);runnerB=new LocalRunner(configs[1]);
  const before=await git(configs[0].projects.website.repo,'worktree','list','--porcelain');
  const logs=[];const inspection=await runnerA.run({id:randomUUID(),project:'website',action:'inspect',payload:{}},{onEvent:e=>logs.push(e)});
  assert.equal(inspection.ready,true);assert.equal(inspection.base,'main');assert.ok(!JSON.stringify(logs).includes(bare));
  assert.equal(await git(configs[0].projects.website.repo,'worktree','list','--porcelain'),before);
  const aid=randomUUID(),bid=randomUUID();const a=await runnerA.run({id:aid,project:'website',action:'prepare',payload:{}}),b=await runnerB.run({id:bid,project:'website',action:'prepare',payload:{}});
  assert.notEqual(a.path,b.path);assert.equal(readFileSync(path.join(configs[0].projects.website.repo,'value.txt'),'utf8').replaceAll('\r\n','\n'),'original\n');
  writeFileSync(path.join(a.path,'value.txt'),'Marco\n');writeFileSync(path.join(b.path,'value.txt'),'Markus\n');
  const submittedA=await runnerA.run({id:randomUUID(),project:'website',action:'submit',payload:{worktree:aid}}),submittedB=await runnerB.run({id:randomUUID(),project:'website',action:'submit',payload:{worktree:bid}});
  const merged=await runnerA.run({id:randomUUID(),project:'website',action:'integrate',payload:submittedA});assert.equal(merged.integrated,true);
  await assert.rejects(()=>runnerB.run({id:randomUUID(),project:'website',action:'integrate',payload:submittedB}),/an denselben Stellen geändert/);
  const remoteMain=await git(dir,'--git-dir',bare,'rev-parse','refs/heads/main');assert.equal(remoteMain,merged.commit);
  const reviewed=new LocalRunner({...configs[0],stateDir:path.join(dir,'review-runner'),projects:{website:{...configs[0].projects.website,workflow:'pull-request',requireIssue:true,publish:false}}});
  await assert.rejects(()=>reviewed.run({id:randomUUID(),project:'website',action:'prepare',payload:{}}),/GitHub-Issues/);
  await assert.rejects(()=>reviewed.run({id:randomUUID(),project:'website',action:'integrate',payload:submittedA}),/Pull Request/);
  await assert.rejects(()=>reviewed.run({id:randomUUID(),project:'website',action:'submit',payload:{worktree:aid,issue:113}}),/Veröffentlichen/);
  const issueCopy=await reviewed.run({id:randomUUID(),project:'website',action:'prepare',payload:{issue:113}});
  assert.match(issueCopy.branch,/^codex\/113-studio-/);reviewed.close();
  const preview=await runnerA.run({id:randomUUID(),project:'website',action:'preview',payload:{worktree:aid}});assert.match(Buffer.from(preview.previewBundle['index.html'],'base64').toString(),/Schmaqq Test/);
  await assert.rejects(()=>runnerA.run({id:randomUUID(),project:'unauthorized',action:'prepare',payload:{}}),/nicht freigegeben/);
  await assert.rejects(()=>runnerA.run({id:randomUUID(),project:'website',action:'codex',payload:{worktree:aid,prompt:'No live AI requests in tests'}}),/nicht freigegeben/);
 }finally{runnerA?.close();runnerB?.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'schmaqq-git-')));rmSync(dir,{recursive:true,force:true});}
});

test('first owner setup is one-time and origin protected',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-setup-'));
 const origin='http://127.0.0.1:44312',setup='fixture-setup-token-long-enough';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin});
 app.db.prepare("INSERT INTO workspace_meta VALUES('bootstrap',?)").run(digest(setup));
 await new Promise(r=>app.server.listen(44312,'127.0.0.1',r));
 try{
  const data=JSON.stringify({setup,email:'owner@fixture.invalid',name:'Owner',password:'test-password-12345'});
  const options={method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:data};
  assert.equal((await fetch(origin+'/api/auth/bootstrap',{...options,headers:{...options.headers,Origin:'https://wrong.invalid'}})).status,403);
  assert.equal((await fetch(origin+'/api/auth/bootstrap',options)).status,200);
  assert.equal((await fetch(origin+'/api/auth/bootstrap',options)).status,403);
  assert.equal(app.db.prepare("SELECT role FROM members WHERE email='owner@fixture.invalid'").get().role,'owner');
 }finally{await new Promise(r=>app.server.close(r));app.db.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'schmaqq-setup-')));rmSync(dir,{recursive:true,force:true});}
});
