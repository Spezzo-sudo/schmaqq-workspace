import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {LocalRunner} from './runner.mjs';
import {command} from './process.mjs';
import {managedProjects} from './managed-projects.mjs';

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
