import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from './store.mjs';
import {command} from './process.mjs';
import {LocalRunner} from './runner.mjs';
import {workshopReadiness} from './workshop-readiness.mjs';

test('a Werkstatt is ready only with a test command and a passed trial run',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-readiness-')),db=openStore(path.join(dir,'studio.db'),{seedProjects:false});
 try{
  db.prepare("INSERT INTO members VALUES('a','Anna','a@x.invalid','x','owner',0)").run();
  db.prepare("INSERT INTO devices(id,owner,name,hash) VALUES('d','a','Werkstatt','h')").run();
  db.prepare("INSERT INTO projects VALUES('p','Projekt','','sage','Im Aufbau',0)").run();
  let clock=1;const probe=(id,status,result)=>db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,'a','d','p','probe','{}',?,?,?)").run(id,status,clock++,JSON.stringify(result));
  assert.match(workshopReadiness(db,'d',{id:'p',check:false}).missing,/kein Testbefehl/);
  const none=workshopReadiness(db,'d',{id:'p',check:true});assert.equal(none.ready,false);assert.match(none.missing,/Noch kein Probelauf/);
  probe('p1','failed',{error:'Die Vorschau wurde gebaut, aber im Ausgabeordner „site/“ liegt keine index.html.'});
  const failed=workshopReadiness(db,'d',{id:'p',check:true});assert.equal(failed.ready,false);assert.match(failed.missing,/index\.html/);
  probe('p2','running',{});assert.match(workshopReadiness(db,'d',{id:'p',check:true}).missing,/läuft gerade/);
  probe('p3','completed',{ready:true});assert.equal(workshopReadiness(db,'d',{id:'p',check:true}).ready,true);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});

test('the trial run tests and builds the preview on the main state and leaves no copy behind',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-probe-')),seed=path.join(dir,'seed'),origin=path.join(dir,'origin.git'),repo=path.join(dir,'repo');
 try{
  mkdirSync(seed,{recursive:true});writeFileSync(path.join(seed,'value.txt'),'hallo');
  writeFileSync(path.join(seed,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',fs.readFileSync('value.txt'));");
  const at=cwd=>(...args)=>command(['git',...args],cwd);
  await at(seed)('init','-b','main');await at(seed)('config','user.name','Fixture');await at(seed)('config','user.email','fixture@invalid.local');
  await at(seed)('add','.');await at(seed)('commit','-m','fixture');
  await command(['git','clone','--bare',seed,origin],dir);await command(['git','clone',origin,repo],dir);
  const make=directory=>new LocalRunner({stateDir:path.join(dir,'state-'+directory),projects:{website:{repo,base:'main',check:[process.execPath,'-e','0'],preview:{build:[process.execPath,'build.cjs'],directory}}}});
  const good=await make('dist').run({id:'probe-ok',project:'website',action:'probe',payload:{}});
  assert.equal(good.ready,true);assert.equal(good.preview,true);
  assert.equal(existsSync(path.join(dir,'state-dist','worktrees','website-probe-probe-ok')),false,'the trial copy is removed');
  assert.equal(await at(repo)('branch','--list','studio/probe-*'),'','the trial branch is removed');
  await assert.rejects(make('out').run({id:'probe-bad',project:'website',action:'probe',payload:{}}),/Ausgabeordner „out\/“ fehlt/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
