import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,statSync,chmodSync,symlinkSync,linkSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {pilotProject,restrictedConfiguration,readConfiguration} from './pilot-runner.mjs';

test('pilot starter confines origin, project and Git remote; replaces untrusted commands and disables publishing and AI',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-pilot-policy-'));
 try{
  execFileSync('git',['init','-b','main',dir],{stdio:'ignore',windowsHide:true});
  execFileSync('git',['-C',dir,'remote','add','origin','https://github.com/Spezzo-sudo/schmaqq-studio-pilot.git'],{windowsHide:true});
  const input={server:'https://studio.schmaqq.com',token:'a'.repeat(43),projects:{[pilotProject]:{repo:dir,check:['dangerous-command'],publish:true}}};
  const state=path.join(os.tmpdir(),'separate-pilot-state');
  const config=restrictedConfiguration(input,dir,state),project=config.projects[pilotProject];
  assert.deepEqual(project.check,[process.execPath,'--test']);assert.deepEqual(project.preview.build,[process.execPath,'scripts/build.mjs']);
  assert.equal(project.allowCodex,false);assert.equal(project.publish,false);assert.equal(project.workflow,'pull-request');
  for(const server of ['http://studio.schmaqq.com','https://foreign.invalid','https://studio.schmaqq.com/','https://user:pass@studio.schmaqq.com'])assert.throws(()=>restrictedConfiguration({...input,server},dir,state));
  assert.throws(()=>restrictedConfiguration({...input,projects:{...input.projects,other:{repo:dir}}},dir,state));
  assert.throws(()=>restrictedConfiguration({...input,projects:{[pilotProject]:{allowCodex:true}}},dir,state));
  assert.throws(()=>restrictedConfiguration({...input,ai:{ollama:{enabled:true}}},dir,state));
  assert.throws(()=>restrictedConfiguration(input,dir,path.join(dir,'state')));
  execFileSync('git',['-C',dir,'remote','set-url','origin','https://github.com/Spezzo-sudo/NetzKontor.git'],{windowsHide:true});
  assert.throws(()=>restrictedConfiguration(input,dir,state));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('pilot configuration reader rejects linked, oversized and malformed files without leaking contents',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-pilot-file-'));
 try{
  const file=path.join(dir,'runner.private.json');writeFileSync(file,JSON.stringify({token:'fixture-only'}),{mode:0o600});
  assert.equal(readConfiguration(file).token,'fixture-only');
  linkSync(file,path.join(dir,'hardlink'));assert.throws(()=>readConfiguration(file));
  const bad=path.join(dir,'invalid.json');writeFileSync(bad,'sensitive-fixture-content',{mode:0o600});
  assert.throws(()=>readConfiguration(bad),e=>!e.message.includes('sensitive-fixture-content'));
  const large=path.join(dir,'large.json');writeFileSync(large,' '.repeat(65537),{mode:0o600});assert.throws(()=>readConfiguration(large));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('POSIX permissions: reject shared config and symlink, secure an owned downloaded config',{skip:process.platform==='win32'},()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-pilot-posix-'));
 try{
  const file=path.join(dir,'download.json');writeFileSync(file,'{}',{mode:0o644});chmodSync(file,0o644);
  assert.throws(()=>readConfiguration(file));assert.deepEqual(readConfiguration(file,{privateOnly:false}),{});assert.equal(statSync(file).mode&0o777,0o600);
  symlinkSync(file,path.join(dir,'link'));assert.throws(()=>readConfiguration(path.join(dir,'link'),{privateOnly:false}));
  assert.equal(readFileSync(file,'utf8'),'{}');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
