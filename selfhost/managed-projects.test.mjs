import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {LocalRunner} from './runner.mjs';
import {command} from './process.mjs';
import {managedProjects,detectProject} from './managed-projects.mjs';

test('failed metadata detection retains a clone for a safe guided retry',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-retry-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const runner=new LocalRunner({stateDir:root,projects:{}});let clones=0;
 runner.git=async(cwd,...args)=>{if(args[0]==='clone'){clones++;mkdirSync(args.at(-1));return '';}return 'https://github.com/fixture/project.git';};
 const payload={repository:'https://github.com/fixture/project',base:'main',automatic:true,publish:false,allowCodex:true};
 await assert.rejects(()=>runner.run({action:'connect-project',project:'retry',payload}),/nicht automatisch erkannt/);
 assert.equal(managedProjects(root).retry.allowCodex,false);assert.equal(managedProjects(root).retry.publish,false);
 await runner.run({action:'connect-project',project:'retry',payload:{...payload,automatic:false,check:['node','--test']}});
 assert.equal(clones,1);assert.equal(managedProjects(root).retry.allowCodex,true);
});

test('existing project settings change live and survive restart without registration or unrelated changes',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-settings-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const repo=path.join(root,'repo');mkdirSync(repo);writeFileSync(path.join(repo,'package.json'),JSON.stringify({scripts:{test:'node --test',build:'node scripts/build.mjs'}}));
 const original={repo,base:'main',check:['old'],publish:false,allowCodex:false,requireIssue:true};
 const config={stateDir:path.join(root,'state'),token:'unchanged',projects:{pilot:original,other:{...original}}};
 const runner=new LocalRunner(config);runner.git=async()=> 'https://github.com/fixture/project.git';
 const payload={repository:'https://github.com/fixture/project',base:'main',automatic:true,publish:false,allowCodex:true,workflow:'pull-request'};
 await runner.run({action:'connect-project',project:'pilot',payload});
 assert.deepEqual(runner.config.projects.pilot.check,['node','--test']);assert.equal(runner.config.projects.pilot.preview.directory,'dist');assert.equal(runner.config.projects.pilot.requireIssue,true);
 assert.equal(config.token,'unchanged');assert.equal(config.projects.other.allowCodex,false);
 const restarted=new LocalRunner({stateDir:config.stateDir,projects:{pilot:original,other:original}});
 assert.equal(restarted.config.projects.pilot.allowCodex,true);assert.equal(restarted.config.projects.pilot.publish,false);assert.equal(restarted.config.projects.other.allowCodex,false);
 await assert.rejects(()=>runner.run({action:'connect-project',project:'pilot',payload:{...payload,repository:'https://github.com/other/repo'}}),/anderen Repository/);
 assert.equal(runner.config.projects.pilot.publish,false);
});

test('detection reads bounded metadata and rejects unknown build output without executing scripts',t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-detect-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 writeFileSync(path.join(root,'package.json'),JSON.stringify({scripts:{test:'node --test',build:'next build'}}));
 assert.throws(()=>detectProject(root),/nicht automatisch erkannt/);
 writeFileSync(path.join(root,'package.json'),JSON.stringify({scripts:{test:'npm run custom',build:'vite build'}}));
 assert.deepEqual(detectProject(root),{check:['npm','test'],preview:{build:['npm','run','build'],directory:'dist'}});
});

test('guided personal setup persists managed repository without changing existing registrations or projects',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-managed-project-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const seed=path.join(root,'seed'),bare=path.join(root,'remote.git');mkdirSync(seed);
 const git=(cwd,...args)=>command(['git',...args],cwd);
 await git(root,'init','--bare',bare);await git(seed,'init','-b','main');await git(seed,'config','user.name','Fixture');await git(seed,'config','user.email','fixture@invalid.local');writeFileSync(path.join(seed,'README.md'),'Synthetic fixture\n');await git(seed,'add','.');await git(seed,'commit','-m','baseline');await git(seed,'remote','add','origin',bare);await git(seed,'push','-u','origin','main');
 const unrelated={repo:seed,check:[process.execPath,'--version']},config={stateDir:path.join(root,'runner'),token:'fixture-registration',projects:{existing:unrelated}},runner=new LocalRunner(config);
 t.after(()=>runner.close());const originalGit=runner.git.bind(runner);
 runner.git=async(repo,...args)=>{if(args[0]==='clone')return originalGit(repo,...args.map(a=>a==='https://github.com/fixture/project.git'?bare:a));return originalGit(repo,...args);};
 const payload={repository:'https://github.com/fixture/project',base:'main',check:[process.execPath,'--version'],publish:true,allowCodex:false,workflow:'pull-request'};
 const result=await runner.run({id:'setup',action:'connect-project',project:'shared',payload});assert.equal(result.configured,true);assert.equal(config.token,'fixture-registration');assert.deepEqual(config.projects.existing,unrelated);assert.equal(result.path,undefined);
 const restored=new LocalRunner({stateDir:config.stateDir,projects:{existing:unrelated}});t.after(()=>restored.close());assert.equal(restored.config.projects.shared.publish,true);assert.equal(restored.config.projects.shared.workflow,'pull-request');
 assert.equal(managedProjects(config.stateDir).shared.base,'main');
 await assert.rejects(()=>runner.run({id:'bad',action:'connect-project',project:'../escape',payload}),/ungültig/);
 await assert.rejects(()=>runner.run({id:'bad',action:'connect-project',project:'other',payload:{...payload,preview:{build:['node','build.mjs'],directory:'../outside'}}}),/Vorschau/);
 assert.equal(readFileSync(path.join(seed,'README.md'),'utf8'),'Synthetic fixture\n');
});
