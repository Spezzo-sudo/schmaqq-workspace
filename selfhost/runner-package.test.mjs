import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,cpSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
import {runnerSourceFiles} from './runner-package-files.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('released runner inventory includes every relative static runtime import',()=>{
 const inventory=new Set(runnerSourceFiles);
 for(const filename of inventory){
  const source=readFileSync(path.join(root,filename),'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)){
   const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(filename),match[1]));
   assert.ok(inventory.has(dependency),`${filename} imports unpackaged runtime ${dependency}`);
  }
 }
});

test('standalone runtime package imports, configures synthetic pilot and checks without developer checkout or server connection',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-package-'));
 try{
  const pkg=path.join(dir,'unpacked'),home=path.join(dir,'home'),repo=path.join(dir,'pilot');
  mkdirSync(path.join(pkg,'selfhost'),{recursive:true});mkdirSync(home);
  for(const file of runnerSourceFiles)cpSync(path.join(root,file),path.join(pkg,file),{errorOnExist:true,force:false});
  const files=runnerSourceFiles.map(file=>{const bytes=readFileSync(path.join(pkg,file));return {path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
  writeFileSync(path.join(pkg,'runner-manifest.json'),JSON.stringify({schema:1,source:'synthetic-test',files}));
  const env={...process.env,HOME:home,USERPROFILE:home};
  const run=(args)=>execFileSync(process.execPath,args,{cwd:pkg,env,encoding:'utf8',windowsHide:true,timeout:20000,stdio:['ignore','pipe','pipe']});
  const runtime=pathToFileURL(path.join(pkg,'selfhost/runner.mjs')).href;
  assert.match(run(['--input-type=module','-e',`const {LocalRunner}=await import(${JSON.stringify(runtime)});console.log(typeof LocalRunner);`]),/function/);
  execFileSync('git',['init','-b','main',repo],{stdio:'ignore',windowsHide:true});
  execFileSync('git',['-C',repo,'remote','add','origin','https://github.com/Spezzo-sudo/schmaqq-studio-pilot.git'],{windowsHide:true});
  const input=path.join(dir,'synthetic.private.json');
  writeFileSync(input,JSON.stringify({server:'https://studio.schmaqq.com',token:'synthetic'.repeat(6),projects:{'986b71a9-48e4-49d8-97bd-f2156bbf61c8':{repo}}}),{mode:0o600});
  assert.match(run(['selfhost/pilot-runner.mjs','--configure',input,repo]),/Konfiguration gespeichert/);
  assert.match(run(['selfhost/pilot-runner.mjs','--check']),/keine Verbindung und kein Auftrag gestartet/);
  const profile=JSON.parse(readFileSync(path.join(home,'.schmaqq-studio/pilot/runner.private.json'),'utf8'));
  assert.equal(Object.values(profile.projects)[0].allowCodex,false);
  assert.equal(Object.values(profile.projects)[0].publish,false);
  // An incomplete distribution must fail during a clean import, rather than
  // accidentally resolving against modules in the source checkout.
  rmSync(path.join(pkg,'selfhost/managed-projects.mjs'));
  assert.throws(()=>run(['--input-type=module','-e',`await import(${JSON.stringify(runtime)});`]),e=>String(e.stderr).includes('ERR_MODULE_NOT_FOUND'));
 }finally{
  assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));
  rmSync(dir,{recursive:true,force:true});
 }
});
