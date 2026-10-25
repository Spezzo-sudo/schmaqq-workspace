import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,symlinkSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {githubRepository,importDestination} from './github-import.mjs';

test('GitHub import permits only credential-free HTTPS and GitHub SSH remotes',()=>{
 for(const url of ['https://github.com/Spezzo-sudo/schmaqq-studio-pilot','https://github.com/Spezzo-sudo/schmaqq-studio-pilot.git','git@github.com:Spezzo-sudo/schmaqq-studio-pilot.git']){
  const {owner,repository}=githubRepository(url);
  assert.deepEqual({owner,repository},{owner:'Spezzo-sudo',repository:'schmaqq-studio-pilot'});
 }
 for(const url of ['https://user:secret@github.com/owner/repo','https://github.com/owner/repo?secret=x','https://github.com/owner/repo#token','https://github.com.evil.org/owner/repo','http://github.com/owner/repo','file:///tmp/repo','git@evil.org:owner/repo','--upload-pack=bad','https://github.com/owner/../repo','git@github.com:owner/repo\nGIT_CONFIG=secret']){
  assert.throws(()=>githubRepository(url),/GitHub/);
 }
});

test('import target is explicit, fresh and outside all existing profiles',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-import-path-'));
 try{
  const work=path.join(root,'work'),existing=path.join(root,'existing'),state=path.join(root,'state');
  mkdirSync(work);mkdirSync(existing);mkdirSync(state);
  const config={stateDir:state,projects:{old:{repo:existing}}},profile=path.join(root,'private.json');
  assert.equal(importDestination(path.join(work,'new'),config,profile),path.join(work,'new'));
  mkdirSync(path.join(work,'taken'));
  assert.throws(()=>importDestination(path.join(work,'taken'),config,profile),/existiert/);
  assert.throws(()=>importDestination(path.join(existing,'nested'),config,profile),/Arbeitskopie/);
  assert.throws(()=>importDestination(path.join(state,'nested'),config,profile),/Arbeitskopie/);
  const alias=path.join(root,'alias');symlinkSync(work,alias,'dir');
  assert.throws(()=>importDestination(path.join(alias,'new'),config,profile),/Verknüpfung/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

import {setupProject} from './project-setup.mjs';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';

test('offline Studio refuses the import before creating files or updating the runner profile',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-import-offline-'));
 try{
  const profile=path.join(root,'runner.private.json'),planFile=path.join(root,'plan.json'),destination=path.join(root,'new-clone');
  const config={server:'http://127.0.0.1:1',token:'offline-test-only',stateDir:path.join(root,'state'),projects:{legacy:{repo:path.join(root,'other')}}};
  writeFileSync(profile,JSON.stringify(config),{mode:0o600});
  const plan={schema:'schmaqq-project-setup-v1',server:config.server,project:'offline',mode:'github',
   directory:destination,repository:'https://github.com/Spezzo-sudo/schmaqq-studio-pilot',base:'main',check:['node','--test']};
  writeFileSync(planFile,JSON.stringify(plan),{mode:0o600});
  await assert.rejects(()=>setupProject(planFile,profile),/Studio ist nicht erreichbar/);
  assert.equal(existsSync(destination),false);
  assert.deepEqual(JSON.parse(readFileSync(profile,'utf8')),config);
 }finally{rmSync(root,{recursive:true,force:true});}
});
