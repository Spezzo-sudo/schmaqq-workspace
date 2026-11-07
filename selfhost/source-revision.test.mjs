import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,linkSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {command,LocalRunner} from './runner.mjs';
import {sourceRevision,stableSource} from './source-revision.mjs';
import {sourceEvidence} from './source-evidence.mjs';

test('real runner binds tests and built previews to source snapshots, detecting external and during-run edits',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-source-')),state=path.join(dir,'runner'),repo=path.join(state,'worktrees','website-copy');mkdirSync(repo,{recursive:true});
 let runner;
 try{
  const git=(...args)=>command(['git',...args],repo);
  await git('init','-b','studio/copy');await git('config','user.name','Fixture');await git('config','user.email','fixture@invalid.local');
  writeFileSync(path.join(repo,'.gitignore'),'dist/\nignored.txt\n');writeFileSync(path.join(repo,'value.txt'),'first');
  writeFileSync(path.join(repo,'check.cjs'),"require('node:assert').ok(require('node:fs').readFileSync('value.txt','utf8'));console.log('passed');");
  writeFileSync(path.join(repo,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.writeFileSync('dist/index.html',fs.readFileSync('value.txt'));");
  await git('add','.');await git('commit','-m','fixture');
  const initial=await sourceRevision(repo);assert.match(initial.revision,/^[a-f0-9]{64}$/);
  writeFileSync(path.join(repo,'ignored.txt'),'ignored dependency fixture');assert.equal((await sourceRevision(repo)).revision,initial.revision);
  runner=new LocalRunner({stateDir:state,projects:{website:{repo,check:[process.execPath,'check.cjs'],preview:{build:[process.execPath,'build.cjs'],directory:'dist'}}}});
  const run=action=>runner.run({id:'run-'+action,project:'website',action,payload:{worktree:'copy'}});
  const checked=await run('check');assert.equal(checked.source.revision,initial.revision);
  writeFileSync(path.join(repo,'value.txt'),'external edit');
  const observed=await run('status');assert.notEqual(observed.source.revision,checked.source.revision);assert.equal(observed.commit,checked.commit);
  const rechecked=await run('check'),preview=await run('preview');assert.equal(preview.source.revision,rechecked.source.revision);assert.equal(Buffer.from(preview.previewBundle['index.html'],'base64').toString(),'external edit');
  writeFileSync(path.join(repo,'new.txt'),'untracked');assert.notEqual((await sourceRevision(repo)).revision,rechecked.source.revision);rmSync(path.join(repo,'new.txt'));
  rmSync(path.join(repo,'value.txt'));assert.match((await sourceRevision(repo)).revision,/^[a-f0-9]{64}$/);writeFileSync(path.join(repo,'value.txt'),'external edit');
  assert.equal((await sourceRevision(repo)).revision,rechecked.source.revision);
  writeFileSync(path.join(repo,'check.cjs'),"require('node:fs').writeFileSync('value.txt','changed by test');console.log('passed');");
  const unstable=await run('check');assert.equal(unstable.source.revision,null);assert.equal(unstable.source.reason,'changed_during_run');
  writeFileSync(path.join(repo,'.env'),'synthetic value');assert.equal((await sourceRevision(repo)).revision,null);rmSync(path.join(repo,'.env'));
  linkSync(path.join(repo,'value.txt'),path.join(repo,'linked.txt'));assert.equal((await sourceRevision(repo)).revision,null);rmSync(path.join(repo,'linked.txt'));
  writeFileSync(path.join(repo,'large.bin'),Buffer.alloc(8388609));assert.equal((await sourceRevision(repo)).reason,'limit');
  assert.equal(stableSource(initial,{revision:null,observedAt:1,reason:'limit'}).revision,null);
  assert.deepEqual(sourceEvidence({revision:'bad',observedAt:1,private:'not shared'}),{revision:null,observedAt:1});
 }finally{runner?.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'studio-source-')));rmSync(dir,{recursive:true,force:true});}
});
