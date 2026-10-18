import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {publishLocalBundle} from './publisher-local.mjs';
const run=(dir,...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function fixture(){
 const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-publisher-fixture-'));
 const bare=path.join(root,'remote.git'),seed=path.join(root,'seed'),incoming=path.join(root,'incoming');
 mkdirSync(seed);mkdirSync(incoming);
 run(root,'init','--bare',bare);run(seed,'init','-b','main');run(seed,'config','user.name','Fixture');run(seed,'config','user.email','fixture@example.invalid');
 writeFileSync(path.join(seed,'file.txt'),'base');run(seed,'add','file.txt');run(seed,'commit','-m','base');
 const base=run(seed,'rev-parse','HEAD');run(seed,'remote','add','origin',bare);run(seed,'push','origin','HEAD:refs/heads/main');
 run(seed,'switch','-c','studio/feature-a');writeFileSync(path.join(seed,'file.txt'),'feature');run(seed,'commit','-am','feature');
 const commit=run(seed,'rev-parse','HEAD'),bundle=path.join(incoming,'approved.bundle');
 run(seed,'bundle','create',bundle,'refs/heads/studio/feature-a','^main');
 const binding={internalProjectId:'studio',githubRepositoryId:'12345',owner:'Spezzo-sudo',name:'schmaqq-workspace',defaultBranch:'main',allowedToPublish:true};
 const request={projectId:'studio',githubRepositoryId:'12345',branch:'studio/feature-a',commit,expectedBaseCommit:base,idempotencyKey:'fixture-submission-000001'};
 writeFileSync(path.join(root,'fixture.json'),JSON.stringify({mode:'local-test-only',internalProjectId:'studio',githubRepositoryId:'12345',defaultBranch:'main'}));
 return {root,bare,seed,bundle,binding,request,base,commit};
}
test('offline bundle publisher creates only feature ref and replay is idempotent',()=>{
 const f=fixture();try{
  const first=publishLocalBundle({binding:f.binding,request:f.request,fixtureRoot:f.root,bundlePath:f.bundle});
  assert.equal(first.created,true);assert.equal(first.replayed,false);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/studio/feature-a'),f.commit);
  const replay=publishLocalBundle({binding:f.binding,request:f.request,fixtureRoot:f.root,bundlePath:f.bundle});
  assert.equal(replay.created,false);assert.equal(replay.replayed,true);
  assert.throws(()=>publishLocalBundle({binding:f.binding,request:{...f.request,idempotencyKey:'fixture-submission-000001',branch:'studio/feature-b'},fixtureRoot:f.root,bundlePath:f.bundle}));
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('offline publisher denies main, wrong repository, changed base, escape bundle and existing feature',()=>{
 const f=fixture();try{
  const submit=(request=f.request,binding=f.binding,bundle=f.bundle,root=f.root)=>publishLocalBundle({binding,request,fixtureRoot:root,bundlePath:bundle});
  assert.throws(()=>submit({...f.request,branch:'main'}));
  assert.throws(()=>submit(f.request,{...f.binding,githubRepositoryId:'54321'}));
  assert.throws(()=>submit({...f.request,expectedBaseCommit:'f'.repeat(40)}));
  assert.throws(()=>submit(f.request,f.binding,path.join(f.seed,'file.txt')));
  const other=path.join(f.root,'incoming','evil.bundle');symlinkSync(f.bundle,other);
  assert.throws(()=>submit(f.request,f.binding,other));
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
  assert.throws(()=>submit(f.request,f.binding,f.bundle,path.dirname(f.root)));
  run(f.root,'--git-dir',f.bare,'update-ref','refs/heads/studio/feature-a',f.base);
  assert.throws(()=>submit());
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});


test('journal resumes after interruption before Git ref creation, without modifying main',()=>{
 const f=fixture();
 try{
  const args={binding:f.binding,request:f.request,fixtureRoot:f.root,bundlePath:f.bundle};
  assert.throws(()=>publishLocalBundle({...args,onCheckpoint:stage=>{if(stage==='after-journal')throw Error('injected crash');}}),/injected crash/);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
  assert.throws(()=>run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/studio/feature-a'));
  const result=publishLocalBundle(args);
  assert.equal(result.recovered,true);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/studio/feature-a'),f.commit);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('journal resumes after committed Git ref without recreating it',()=>{
 const f=fixture();
 try{
  const args={binding:f.binding,request:f.request,fixtureRoot:f.root,bundlePath:f.bundle};
  assert.throws(()=>publishLocalBundle({...args,onCheckpoint:stage=>{if(stage==='after-ref')throw Error('injected crash after commit');}}),/injected crash/);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/studio/feature-a'),f.commit);
  const result=publishLocalBundle(args);
  assert.equal(result.recovered,true);
  assert.equal(result.created,false);
  assert.equal((publishLocalBundle(args)).replayed,true);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('pending journal fails closed if an unknown ref appears before recovery',()=>{
 const f=fixture();
 try{
  const args={binding:f.binding,request:f.request,fixtureRoot:f.root,bundlePath:f.bundle};
  assert.throws(()=>publishLocalBundle({...args,onCheckpoint:stage=>{if(stage==='after-journal')throw Error('crash');}}));
  run(f.root,'--git-dir',f.bare,'update-ref','refs/heads/studio/feature-a',f.base);
  assert.throws(()=>publishLocalBundle(args),/unsafe state/);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('quarantine refuses oversized Git blobs before writing a feature ref',()=>{
 const f=fixture();
 try{
  writeFileSync(path.join(f.seed,'too-big.txt'),'x'.repeat(2200000));
  run(f.seed,'add','too-big.txt');run(f.seed,'commit','--amend','--no-edit');
  const commit=run(f.seed,'rev-parse','HEAD');
  rmSync(f.bundle);run(f.seed,'bundle','create',f.bundle,'refs/heads/studio/feature-a','^main');
  assert.throws(()=>publishLocalBundle({binding:f.binding,request:{...f.request,commit},fixtureRoot:f.root,bundlePath:f.bundle}),/Oversized Git blob|Large tree blob|Expanded Git objects/);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
  assert.throws(()=>run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/studio/feature-a'));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('quarantine refuses Git trees containing symlinks',()=>{
 const f=fixture();
 try{
  symlinkSync('file.txt',path.join(f.seed,'symlink.txt'));
  run(f.seed,'add','symlink.txt');run(f.seed,'commit','--amend','--no-edit');
  const commit=run(f.seed,'rev-parse','HEAD');
  rmSync(f.bundle);run(f.seed,'bundle','create',f.bundle,'refs/heads/studio/feature-a','^main');
  assert.throws(()=>publishLocalBundle({binding:f.binding,request:{...f.request,commit},fixtureRoot:f.root,bundlePath:f.bundle}),/Unsupported tree entry/);
  assert.equal(run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/main'),f.base);
  assert.throws(()=>run(f.root,'--git-dir',f.bare,'rev-parse','refs/heads/studio/feature-a'));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
