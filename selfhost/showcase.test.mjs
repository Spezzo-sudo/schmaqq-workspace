import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {openStore,digest,passwordHash} from './store.mjs';
import {command} from './process.mjs';
import {LocalRunner} from './runner.mjs';
import {showcaseSlug,queueShowcases} from './showcase.mjs';

// "Bei uns ansehen": the shared state of a project at a fixed, unguessable address on the preview domain.

test('the server step builds the shared state as a site and leaves no copy behind; without a build it says why',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-show-')),seed=path.join(dir,'seed'),origin=path.join(dir,'origin.git'),repo=path.join(dir,'repo');
 try{
  mkdirSync(seed,{recursive:true});writeFileSync(path.join(seed,'value.txt'),'Café Sonne');
  writeFileSync(path.join(seed,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',fs.readFileSync('value.txt'));");
  const at=cwd=>(...args)=>command(['git',...args],cwd);
  await at(seed)('init','-b','main');await at(seed)('config','user.name','Fixture');await at(seed)('config','user.email','fixture@invalid.local');
  await at(seed)('add','.');await at(seed)('commit','-m','fixture');
  await command(['git','clone','--bare',seed,origin],dir);await command(['git','clone',origin,repo],dir);
  const runner=preview=>new LocalRunner({stateDir:path.join(dir,'state'),projects:{website:{repo,base:'main',check:[process.execPath,'-e','0'],...(preview?{preview}:{})}}});
  const built=await runner({build:[process.execPath,'build.cjs'],directory:'dist'}).run({id:'show-1',project:'website',action:'showcase',payload:{}});
  assert.equal(Buffer.from(built.previewBundle['index.html'],'base64').toString(),'Café Sonne');
  assert.match(built.commit,/^[0-9a-f]{40}$/);
  assert.equal(existsSync(path.join(dir,'state','worktrees','website-preview-show-show-1')),false,'the build copy is removed');
  assert.equal(await at(repo)('branch','--list','studio/*'),'','the build branch is removed');
  await assert.rejects(runner(null).run({id:'show-2',project:'website',action:'showcase',payload:{}}),/braucht einen Build mit Ausgabeordner/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('the address is readable and unguessable',()=>{
 const a=showcaseSlug('Café Sonne & Söhne'),b=showcaseSlug('Café Sonne & Söhne');
 assert.match(a,/^cafe-sonne-soehne-[a-z2-9]{8}$/);assert.notEqual(a,b);
 assert.match(showcaseSlug('???'),/^projekt-/);
});

test('switched on, built after each take-over, shown at the fixed address; a new link retires the old one',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-showflow-')),filename=path.join(dir,'s.sqlite');
 const origin='http://127.0.0.1:44631',previewOrigin='http://127.0.0.1:44632';
 const store=openStore(filename,{seedProjects:false}),me=randomUUID(),session=randomBytes(32).toString('base64url'),deviceToken=randomUUID(),device=randomUUID();
 store.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(me,'Marco','marco@fixture.invalid',passwordHash('fixture-password-not-real'),'owner',Date.now());
 store.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(session),me,Date.now()+600000);
 store.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(device,me,'Server',digest(deviceToken),Date.now());store.close();
 const studio=createStudioServer({filename,origin,previewOrigin,resetMailer:null});
 await new Promise(r=>studio.server.listen(44631,'127.0.0.1',r));await new Promise(r=>studio.previewServer.listen(44632,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>studio.server.close(r));studio.previewServer.close();studio.db.close();rmSync(dir,{recursive:true,force:true});});
 const post=async(route,body,token)=>{const r=await fetch(origin+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{Cookie:'studio_session='+session})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const room=async project=>(await (await fetch(origin+'/api/room?project='+project,{headers:{Cookie:'studio_session='+session}})).json());
 const project=(await post('/api/room',{action:'create',id:randomUUID(),title:'Café Sonne',description:''})).data.project;
 // The project's workplace: its trial run passed on this server.
 studio.db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,'probe','{}','completed',?,'{}')").run(randomUUID(),me,device,project,Date.now()-5000);
 let r=await room(project);
 assert.equal(r.showcase,null,'nothing to see before it is switched on');
 assert.equal((await post('/api/team',{action:'live',project,revision:r.meta.revision,live:'show'})).status,200);
 const build=async html=>{
  const {job}=(await post('/api/runner/poll',{},deviceToken)).data;
  assert.equal(job?.action,'showcase');
  const report=await post('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result:{previewBundle:{'index.html':Buffer.from(html).toString('base64'),'style.css':Buffer.from('h1{}').toString('base64')},commit:'a'.repeat(40)}},deviceToken);
  assert.equal(report.status,200,JSON.stringify(report.data));
 };
 await build('<h1>Erste Fassung</h1>');
 r=await room(project);
 assert.match(r.showcase.url,new RegExp('^'+previewOrigin+'/ansehen/cafe-sonne-[a-z2-9]{8}/$'));
 assert.equal(r.showcase.building,false);
 const first=r.showcase.url,page=await fetch(first);
 assert.equal(await page.text(),'<h1>Erste Fassung</h1>');
 const cookie=page.headers.get('set-cookie').split(';')[0];
 assert.equal(await (await fetch(previewOrigin+'/style.css',{headers:{Cookie:cookie}})).text(),'h1{}','root paths of the site work');
 assert.equal((await fetch(first.slice(0,-1),{redirect:'manual'})).status,301);
 assert.equal((await fetch(previewOrigin+'/ansehen/cafe-sonne-xxxxxxxx/')).status,404,'a guessed address shows nothing');
 assert.equal((await post('/api/runner/poll',{},deviceToken)).data.job,null,'no new build without a change');
 // A take-over: the next request of anyone starts a new build of the shared state.
 studio.db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,'integrate','{}','completed',?,'{}')").run(randomUUID(),me,device,project,Date.now()+1000);
 assert.deepEqual(queueShowcases(studio.db),[project],'the server notices the take-over by itself');
 assert.deepEqual(queueShowcases(studio.db),[],'one build at a time');
 const previews=studio.db.prepare('SELECT count(*) AS n FROM previews').get().n;
 await build('<h1>Zweite Fassung</h1>');
 assert.equal(await (await fetch(first)).text(),'<h1>Zweite Fassung</h1>','same address, newest state');
 assert.equal(studio.db.prepare('SELECT count(*) AS n FROM previews').get().n,previews,'the previous build is dropped');
 // A new link: the old address stops working at once.
 assert.equal((await post('/api/team',{action:'showcase',project,op:'renew'})).status,200);
 const renewed=(await room(project)).showcase.url;
 assert.notEqual(renewed,first);
 assert.equal((await fetch(first)).status,404);
 assert.equal(await (await fetch(renewed)).text(),'<h1>Zweite Fassung</h1>');
 // "Neu bauen" builds again on request, also without a change.
 assert.equal((await post('/api/team',{action:'showcase',project,op:'rebuild'})).status,200);
 await build('<h1>Dritte Fassung</h1>');
 assert.equal(await (await fetch(renewed)).text(),'<h1>Dritte Fassung</h1>');
 // A task of such a project is done with the take-over; there is no separate "online" step.
 assert.equal(studio.db.prepare("SELECT json_extract(value,'$.live') AS live FROM workspace_meta WHERE key=?").get('room:v1:project:'+project).live,'show');
});
