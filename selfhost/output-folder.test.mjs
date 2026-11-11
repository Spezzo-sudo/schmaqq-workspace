import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {command} from './process.mjs';
import {LocalRunner} from './runner.mjs';
import {outputDirectories,outputDirectoryOf,gitAddMessage} from './project-plan.mjs';

test('output folders are recognised as places where sources cannot live',()=>{
 const p={preview:{build:['make'],directory:'site/'},generated:['build/gen']};
 assert.deepEqual(outputDirectories(p),['site','build/gen']);
 assert.equal(outputDirectoryOf('site/index.html',p),'site');
 assert.equal(outputDirectoryOf('build/gen/a.js',p),'build/gen');
 assert.equal(outputDirectoryOf('sitemap.xml',p),null);
 assert.equal(outputDirectoryOf('website/index.html',p),null);
 assert.deepEqual(outputDirectories({}),[]);
 const ignored=gitAddMessage('x/a.txt','The following paths are ignored by one of your .gitignore files:\nx\nhint: Use -f if you really want to add them.');
 assert.match(ignored,/Ausschlussliste/);assert.doesNotMatch(ignored,/Use -f|hint:/);
});

test('runner explains blocked file creation in German and leaves no stray file behind',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-output-')),state=path.join(dir,'runner'),repo=path.join(state,'worktrees','website-copy');mkdirSync(repo,{recursive:true});
 try{
  const git=(...args)=>command(['git',...args],repo);
  await git('init','-b','studio/copy');await git('config','user.name','Fixture');await git('config','user.email','fixture@invalid.local');
  writeFileSync(path.join(repo,'.gitignore'),'private/\n');writeFileSync(path.join(repo,'readme.txt'),'x');
  await git('add','.');await git('commit','-m','fixture');
  const runner=new LocalRunner({stateDir:state,projects:{website:{repo,check:[process.execPath,'-e','0'],preview:{build:[process.execPath,'-e','0'],directory:'site'}}}});
  const create=file=>runner.run({id:'create-'+file.replace(/\W/g,'-'),project:'website',action:'create-file',payload:{worktree:'copy',file,content:'<h1>Hallo</h1>'}});
  await assert.rejects(create('site/index.html'),e=>/Ausgabeordner/.test(e.message)&&/„site\/“/.test(e.message));
  assert.equal(existsSync(path.join(repo,'site','index.html')),false);
  await assert.rejects(create('private/notes.txt'),e=>/Ausschlussliste/.test(e.message)&&!/Use -f/.test(e.message));
  assert.equal(existsSync(path.join(repo,'private','notes.txt')),false);
  const created=await create('pages/index.html');assert.equal(created.file,'pages/index.html');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('readiness check fails when the preview output folder already holds project files',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-output-inspect-')),seed=path.join(dir,'seed'),origin=path.join(dir,'origin.git'),repo=path.join(dir,'repo');
 try{
  mkdirSync(path.join(seed,'site'),{recursive:true});writeFileSync(path.join(seed,'site','index.html'),'<h1>Quelle</h1>');
  const at=cwd=>(...args)=>command(['git',...args],cwd);
  await at(seed)('init','-b','main');await at(seed)('config','user.name','Fixture');await at(seed)('config','user.email','fixture@invalid.local');
  await at(seed)('add','.');await at(seed)('commit','-m','fixture');
  await command(['git','clone','--bare',seed,origin],dir);await command(['git','clone',origin,repo],dir);
  await at(repo)('config','user.name','Fixture');await at(repo)('config','user.email','fixture@invalid.local');
  const inspect=async directory=>{const runner=new LocalRunner({stateDir:path.join(dir,'state-'+directory),projects:{website:{repo,base:'main',check:[process.execPath,'-e','0'],preview:{build:[process.execPath,'-e','0'],directory}}}});return runner.run({id:'inspect-'+directory,project:'website',action:'inspect',payload:{}});};
  const clash=await inspect('site'),item=clash.checks.find(c=>c.label==='Vorschau-Ausgabeordner getrennt von Projektdateien');
  assert.equal(item.ok,false);assert.match(item.hint,/site\/index\.html/);assert.equal(clash.ready,false);
  const separate=await inspect('dist');assert.equal(separate.checks.find(c=>c.label==='Vorschau-Ausgabeordner getrennt von Projektdateien').ok,true);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('submitting a working copy without any change stops before tests and upload',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-empty-submit-')),seed=path.join(dir,'seed'),origin=path.join(dir,'origin.git'),repo=path.join(dir,'repo');
 try{
  mkdirSync(seed,{recursive:true});writeFileSync(path.join(seed,'readme.txt'),'x');
  const at=cwd=>(...args)=>command(['git',...args],cwd);
  await at(seed)('init','-b','main');await at(seed)('config','user.name','Fixture');await at(seed)('config','user.email','fixture@invalid.local');
  await at(seed)('add','.');await at(seed)('commit','-m','fixture');
  await command(['git','clone','--bare',seed,origin],dir);await command(['git','clone',origin,repo],dir);
  await at(repo)('config','user.name','Fixture');await at(repo)('config','user.email','fixture@invalid.local');
  let checks=0;const runner=new LocalRunner({stateDir:path.join(dir,'state'),projects:{website:{repo,base:'main',publish:true,check:[process.execPath,'-e','0']}}});
  const check=runner.check.bind(runner);runner.check=async(...a)=>{checks++;return check(...a);};
  await runner.run({id:'copy',project:'website',action:'prepare',payload:{}});
  await assert.rejects(runner.run({id:'submit',project:'website',action:'submit',payload:{worktree:'copy'}}),/noch keine Änderung/);
  assert.equal(checks,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
