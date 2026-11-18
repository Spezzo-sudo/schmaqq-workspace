// End-to-end: real Studio server, two real runner processes, real Git with a shared origin.
// Everything is driven through the same HTTP API the browser uses; after each step the
// database and the Git repositories are checked directly, not only what the API answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync,readFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite,token,digest} from './store.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test('code chain end to end: probe, copy, empty submit refused, save, submit, approve, merge, parallel work, conflict, roles',{timeout:240000},async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-chain-')),origin='http://127.0.0.1:44993';
 const app=createStudioServer({seedProjects:false,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44994'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 const children=[];
 t.after(async()=>{for(const c of children)c.kill('SIGKILL');await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,data:await r.json()};};
 const ok=async(route,value,cookie)=>{const r=await request(route,value,cookie);assert.equal(r.status,200,route+' '+JSON.stringify(r.data));return r.data;};
 const join=async(email,role,name)=>{const r=await fetch(host+'/api/auth/register',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({invite:createInvite(app.db,email,role),name,password:'fixture-password-1234'})});return r.headers.get('set-cookie').split(';')[0];};
 const marco=await join('marco@fixture.invalid','owner','Marco'),markus=await join('markus@fixture.invalid','member','Markus');
 const id=email=>app.db.prepare('SELECT id FROM members WHERE email=?').get(email).id,marcoId=id('marco@fixture.invalid'),markusId=id('markus@fixture.invalid');
 const project=(await ok('/api/room',{action:'create',id:randomUUID(),title:'Website',description:'',members:[markusId]},marco)).project;

 // Shared origin and one real runner per person (their own PC), like the real setup.
 const git=(cwd,...args)=>execFileSync('git',['-c','commit.gpgsign=false',...args],{cwd,encoding:'utf8',stdio:'pipe'}).trim();
 const seed=path.join(dir,'seed'),remote=path.join(dir,'origin.git');mkdirSync(path.join(seed,'site'),{recursive:true});
 writeFileSync(path.join(seed,'.gitignore'),'dist/\n');
 writeFileSync(path.join(seed,'site/index.html'),'<!doctype html>\n<h1>Start</h1>\n<p>Text</p>\n');
 writeFileSync(path.join(seed,'check.mjs'),"import{readFileSync}from'node:fs';import assert from'node:assert/strict';assert.match(readFileSync('site/index.html','utf8'),/<h1>/);console.log('HTML-Pruefung bestanden.');\n");
 writeFileSync(path.join(seed,'build.mjs'),"import{cpSync}from'node:fs';cpSync('site','dist',{recursive:true});\n");
 git(dir,'init','--bare',remote);git(seed,'init','-b','main');git(seed,'config','user.name','Seed');git(seed,'config','user.email','seed@fixture.invalid');git(seed,'add','.');git(seed,'commit','-m','start');git(seed,'remote','add','origin',remote);git(seed,'push','-u','origin','main');
 const devices={};
 for(const [person,memberId] of [['marco',marcoId],['markus',markusId]]){
  const repo=path.join(dir,person+'-repo'),runnerToken=token(),device=person+'-pc';
  git(dir,'clone','--branch','main',remote,repo);git(repo,'config','user.name',person);git(repo,'config','user.email',person+'@fixture.invalid');
  app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(device,memberId,person+' PC',digest(runnerToken),Date.now());
  const config={server:host,token:runnerToken,stateDir:path.join(dir,person+'-runner'),projects:{[project]:{repo,base:'main',workflow:'direct',publish:true,allowCodex:false,check:[process.execPath,'check.mjs'],preview:{build:[process.execPath,'build.mjs'],directory:'dist'}}}};
  const file=path.join(dir,person+'.runner.json');writeFileSync(file,JSON.stringify(config));
  const child=spawn(process.execPath,[path.join(here,'runner.mjs'),file],{stdio:'ignore'});children.push(child);devices[person]=device;
 }
 const job=async(cookie,body)=>{const {id:jid}=await ok('/api/development',{action:'job',device:'auto',project,...body},cookie);
  for(let i=0;i<300;i++){const {job:j}=await ok('/api/development/job?id='+jid,null,cookie);if(!['queued','running','cancelling'].includes(j.status))return {...j,id:jid};await sleep(200);}
  throw Error('job did not finish: '+body.operation);};
 const originMain=()=>git(remote,'rev-parse','main');
 const readiness=async(cookie,device)=>(await ok('/api/ai',null,cookie)).resources.find(r=>r.device===device)?.development?.find(p=>p.id===project)?.readiness;
 for(let i=0;i<100&&!(await readiness(marco,devices.marco));i++)await sleep(200);

 // 1. Startklar only after a passed trial run.
 assert.equal((await readiness(marco,devices.marco)).ready,false);
 const probe=await job(marco,{device:devices.marco,operation:'probe'});
 assert.equal(probe.status,'completed',JSON.stringify(probe.result));
 assert.equal((await readiness(marco,devices.marco)).ready,true);
 assert.equal(git(path.join(dir,'marco-repo'),'branch','--list','studio/probe-*'),'','trial branch removed');

 // 2. Marco: task, copy, empty submit is refused and the failure survives a reload.
 const task=(await ok('/api/room',{action:'task',id:randomUUID(),project,title:'Überschrift',kind:'code',mine:true},marco)).task;
 const copy=await job(marco,{operation:'prepare',task,title:'Überschrift',scope:'site/index.html'});
 assert.equal(copy.status,'completed');
 const copyDir=path.join(dir,'marco-runner','worktrees',project+'-'+copy.id);assert.ok(existsSync(copyDir),'real worktree on disk');
 let detail=await ok('/api/collaboration/task?id='+task,null,marco);
 assert.equal(detail.workspaces[0].changed,false);
 const empty=await job(marco,{operation:'submit',worktree:copy.id});
 assert.equal(empty.status,'failed');
 detail=await ok('/api/collaboration/task?id='+task,null,marco);
 assert.equal(detail.lastFailure.action,'submit');assert.match(detail.lastFailure.detail,/noch keine Änderung/);
 assert.equal(git(remote,'branch','--list','studio/*'),'','nothing was pushed');

 // 3. Save a change, submit: real tests, real branch on origin, approval only approves.
 const opened=await job(marco,{operation:'read-file',worktree:copy.id,file:'site/index.html'});
 const saved=await job(marco,{operation:'save-file',worktree:copy.id,file:'site/index.html',revision:opened.result.revision,content:'<!doctype html>\n<h1>Willkommen</h1>\n<p>Text</p>\n'});
 assert.equal(saved.status,'completed',JSON.stringify(saved.result));
 assert.match(readFileSync(path.join(copyDir,'site/index.html'),'utf8'),/Willkommen/,'file really changed on disk');
 const submitted=await job(marco,{operation:'submit',worktree:copy.id});
 assert.equal(submitted.status,'completed',JSON.stringify(submitted.result));
 assert.equal(git(remote,'rev-parse','studio/'+copy.id),submitted.result.commit,'branch really pushed to origin');
 detail=await ok('/api/collaboration/task?id='+task,null,marco);
 assert.equal(detail.lastFailure,null,'the earlier failure is gone after success');
 const before=originMain();
 assert.equal((await request('/api/development/reviews',{id:randomUUID(),job:submitted.id,commit:submitted.result.commit,decision:'approved',body:''},marco)).status,403,'no self approval');
 await ok('/api/development/reviews',{id:randomUUID(),job:submitted.id,commit:submitted.result.commit,decision:'approved',body:''},markus);
 assert.equal(originMain(),before,'approval did not merge anything');

 // 4. Meanwhile Markus works in parallel on another file and merges first.
 const task2=(await ok('/api/room',{action:'task',id:randomUUID(),project,title:'Über uns',kind:'code',mine:true},markus)).task;
 assert.equal((await request('/api/development',{action:'job',device:'auto',project,operation:'prepare',task:task2,title:'Über uns',scope:'site'},markus)).status,409,'overlapping areas are refused');
 const copy2=await job(markus,{operation:'prepare',task:task2,title:'Über uns',scope:'site/about.html'});
 await job(markus,{operation:'create-file',worktree:copy2.id,file:'site/about.html',content:'<h1>Über uns</h1>\n'});
 const submitted2=await job(markus,{operation:'submit',worktree:copy2.id});assert.equal(submitted2.status,'completed',JSON.stringify(submitted2.result));
 await ok('/api/development/reviews',{id:randomUUID(),job:submitted2.id,commit:submitted2.result.commit,decision:'approved',body:''},marco);
 const merged2=await job(markus,{operation:'integrate',source:submitted2.id});assert.equal(merged2.status,'completed',JSON.stringify(merged2.result));
 assert.ok(git(remote,'ls-tree','--name-only','main','site/').includes('site/about.html'),'Markus change is on origin main');

 // 5. Marco merges his approved change on top: different files, no conflict, both end up on main.
 const merged=await job(marco,{operation:'integrate',source:submitted.id});assert.equal(merged.status,'completed',JSON.stringify(merged.result));
 assert.match(git(remote,'show','main:site/index.html'),/Willkommen/);assert.match(git(remote,'show','main:site/about.html'),/Über uns/);

 // 6. Conflict: both change the same line; Markus merges first, Marco's merge stops with an explanation.
 const task3=(await ok('/api/room',{action:'task',id:randomUUID(),project,title:'Titel A',kind:'code',mine:true},marco)).task;
 const copy3=await job(marco,{operation:'prepare',task:task3,title:'Titel A',scope:''});
 const task4=(await ok('/api/room',{action:'task',id:randomUUID(),project,title:'Titel B',kind:'code',mine:true},markus)).task;
 const copy4=await job(markus,{operation:'prepare',task:task4,title:'Titel B',scope:''});
 const edit=async(cookie,copyId,heading)=>{const f=await job(cookie,{operation:'read-file',worktree:copyId,file:'site/index.html'});const s=await job(cookie,{operation:'save-file',worktree:copyId,file:'site/index.html',revision:f.result.revision,content:f.result.content.replace(/<h1>.*<\/h1>/,'<h1>'+heading+'</h1>')});assert.equal(s.status,'completed');};
 await edit(marco,copy3.id,'Hallo von Marco');await edit(markus,copy4.id,'Hallo von Markus');
 const s3=await job(marco,{operation:'submit',worktree:copy3.id}),s4=await job(markus,{operation:'submit',worktree:copy4.id});
 await ok('/api/development/reviews',{id:randomUUID(),job:s3.id,commit:s3.result.commit,decision:'approved',body:''},markus);
 await ok('/api/development/reviews',{id:randomUUID(),job:s4.id,commit:s4.result.commit,decision:'approved',body:''},marco);
 assert.equal((await job(markus,{operation:'integrate',source:s4.id})).status,'completed');
 const mainBefore=originMain();
 const conflict=await job(marco,{operation:'integrate',source:s3.id});
 assert.equal(conflict.status,'failed');assert.equal(originMain(),mainBefore,'main untouched');
 detail=await ok('/api/collaboration/task?id='+task3,null,marco);
 assert.equal(detail.lastFailure.action,'integrate');assert.match(detail.lastFailure.detail,/an denselben Stellen.*site\/index\.html/);
 const status=await job(marco,{operation:'status',worktree:copy3.id});
 await job(marco,{operation:'update',worktree:copy3.id}).then(u=>{assert.equal(u.status,'failed');assert.match(u.result.error,/dieselben Stellen.*site\/index\.html/);});
 assert.ok(status.result.behind>=0);
 assert.match(readFileSync(path.join(dir,'marco-runner','worktrees',project+'-'+copy3.id,'site/index.html'),'utf8'),/Hallo von Marco/,'own work untouched after the failed update');

 // 7. Roles: Markus loses the reviewer role; his approval of an open version no longer counts, and he reads nothing anymore once removed.
 const task5=(await ok('/api/room',{action:'task',id:randomUUID(),project,title:'Text',kind:'code',mine:true},marco)).task;
 const copy5=await job(marco,{operation:'prepare',task:task5,title:'Text',scope:''});
 await job(marco,{operation:'create-file',worktree:copy5.id,file:'site/text.html',content:'<p>x</p>\n'});
 const s5=await job(marco,{operation:'submit',worktree:copy5.id});
 await ok('/api/development/reviews',{id:randomUUID(),job:s5.id,commit:s5.result.commit,decision:'approved',body:''},markus);
 await ok('/api/project-roles',{action:'roles',project,member:markusId,roles:['developer']},marco);
 const review=(await ok('/api/collaboration/task?id='+task5,null,marco)).reviews[0];
 assert.equal(review.state,'pending');assert.deepEqual(review.dropped,['Markus']);
 assert.equal((await request('/api/development',{action:'job',device:'auto',project,operation:'integrate',source:s5.id},marco)).status,409,'without a valid approval nothing is merged');
 await ok('/api/project-roles',{action:'roles',project,member:markusId,roles:[]},marco);
 assert.equal((await request('/api/room?project='+project,null,markus)).status,403);
 assert.equal((await request('/api/collaboration/task?id='+task5,null,markus)).status,403);
});
