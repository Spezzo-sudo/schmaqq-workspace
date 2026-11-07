import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,symlinkSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {proposeProjectPlan,validateProjectPlan,findPrograms,PLAN_FILE} from './project-plan.mjs';
import {LocalRunner,command} from './runner.mjs';
import {managedProjects} from './managed-projects.mjs';

function temporary(t){const dir=mkdtempSync(path.join(os.tmpdir(),'studio-plan-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
const base={version:1,prepare:[],check:['node','--test'],requires:[],generated:[]};

test('project detection reads configuration and Make/Python/Node metadata without executing it',t=>{
 const dir=temporary(t),marker=path.join(dir,'EXECUTED');
 writeFileSync(path.join(dir,'Makefile'),`PYTHON ?= python3\nbuild-bootstrap:\n\tpython3 -c 'open("${marker}","w")'\nbuild:\n\tpython3 tools/build.py --output "$(CURDIR)/build/site"\nbuild-check: build\n\tpython3 tests/check.py\n`);
 const make=proposeProjectPlan(dir);
 assert.equal(make.source,'make');assert.deepEqual(make.configuration.check,['make','build-check']);assert.deepEqual(make.configuration.prepare,[['make','build-bootstrap']]);
 assert.deepEqual(make.configuration.preview,{build:['make','build'],directory:'build/site'});assert.equal(existsSync(marker),false);
 writeFileSync(path.join(dir,PLAN_FILE),JSON.stringify({...base,check:['python3','-m','unittest']}));
 assert.equal(proposeProjectPlan(dir).source,PLAN_FILE,'Explicit configuration takes priority');
 rmSync(path.join(dir,PLAN_FILE));rmSync(path.join(dir,'Makefile'));
 writeFileSync(path.join(dir,'pyproject.toml'),'[tool.pytest.ini_options]\ntestpaths=["tests"]\n');
 assert.deepEqual(proposeProjectPlan(dir).configuration.check,['python3','-m','pytest']);
 rmSync(path.join(dir,'pyproject.toml'));
 writeFileSync(path.join(dir,'package.json'),JSON.stringify({scripts:{test:'node --test',build:'vite build'}}));
 writeFileSync(path.join(dir,'package-lock.json'),'{}');
 const node=proposeProjectPlan(dir);assert.deepEqual(node.configuration.prepare,[['npm','ci','--no-audit','--no-fund']]);assert.equal(node.configuration.preview.directory,'dist');
});

test('unknown projects return actionable incomplete plans and changed inputs invalidate approval',t=>{
 const dir=temporary(t),unknown=proposeProjectPlan(dir);assert.equal(unknown.state,'needs_configuration');assert.equal(unknown.configuration,null);
 assert.match(unknown.notes.join(' '),/studio.project.json/);
 const first=proposeProjectPlan(dir,{configuration:base,head:'a'});
 assert.notEqual(first.revision,proposeProjectPlan(dir,{configuration:{...base,check:['node','other.mjs']},head:'a'}).revision);
 assert.notEqual(first.revision,proposeProjectPlan(dir,{configuration:base,head:'b'}).revision);
 writeFileSync(path.join(dir,'requirements.txt'),'example==1');
 assert.notEqual(first.revision,proposeProjectPlan(dir,{configuration:base,head:'a'}).revision);
});

test('configuration rejects path escapes, unknown fields, malformed commands and linked metadata',t=>{
 const dir=temporary(t);
 for(const generated of [['../outside'],['/outside'],['.git/hooks'],['C:/outside'],['a\\b']])assert.throws(()=>validateProjectPlan({...base,generated}));
 for(const check of [[],['node',null],['node','bad\0arg'],'node --test'])assert.throws(()=>validateProjectPlan({...base,check}));
 assert.throws(()=>validateProjectPlan({...base,requires:['../script']}));assert.throws(()=>validateProjectPlan({...base,privileged:true}));
 assert.throws(()=>validateProjectPlan({...base,preview:{serve:{argv:['node','app.mjs'],port:80}}}));
 assert.throws(()=>validateProjectPlan({...base,version:2}));
 const linked=path.join(dir,'linked');mkdirSync(linked);writeFileSync(path.join(linked,'data'),'{}');
 try{symlinkSync(path.join(linked,'data'),path.join(dir,PLAN_FILE));}catch(e){if(e.code==='EPERM')return;throw e;}
 assert.throws(()=>proposeProjectPlan(dir),/reguläre Datei/);
});

test('program preflight is presence only, uses explicit PATH and never executes project scripts',t=>{
 const dir=temporary(t),marker=path.join(dir,'marker');writeFileSync(path.join(dir,'fake.cmd'),`echo X > ${marker}`);
 assert.deepEqual(findPrograms(['fake','missing'],{directories:[dir],platform:'win32'}),[{program:'fake',available:true},{program:'missing',available:false}]);
 assert.equal(existsSync(marker),false);assert.throws(()=>findPrograms(['../fake']));
 assert.equal(findPrograms(['fake'],{directories:['.'],platform:'win32'})[0].available,false);
});

test('plan then confirmation reuses clone, rejects stale plans and preserves permissions on missing tools',async t=>{
 const root=temporary(t),runner=new LocalRunner({stateDir:root,projects:{}});t.after(()=>runner.close());let clones=0;
 runner.git=async(cwd,...args)=>{
  if(args[0]==='clone'){clones++;mkdirSync(args.at(-1));writeFileSync(path.join(args.at(-1),PLAN_FILE),JSON.stringify(base));return '';}
  return args[0]==='rev-parse'?'a'.repeat(40):'https://github.com/fixture/project.git';
 };
 runner.untrusted=async()=>assert.fail('Planning/configuration must not execute project code');
 const payload={repository:'https://github.com/fixture/project',base:'main',mode:'plan',automatic:true,publish:true,allowCodex:true};
 const result=await runner.run({action:'connect-project',project:'test',payload});assert.equal(result.setupPlan.state,'proposed');
 assert.equal(managedProjects(root).test.publish,false);assert.deepEqual(managedProjects(root).test.check,[]);
 const apply={...payload,mode:'apply',expectedPlan:result.setupPlan.revision};
 writeFileSync(path.join(runner.config.projects.test.repo,'requirements.txt'),'changed');
 await assert.rejects(runner.run({action:'connect-project',project:'test',payload:apply}),/geändert/);
 const retry=await runner.run({action:'connect-project',project:'test',payload});
 await runner.run({action:'connect-project',project:'test',payload:{...apply,expectedPlan:retry.setupPlan.revision}});
 assert.equal(clones,1);assert.equal(managedProjects(root).test.publish,true);assert.equal(managedProjects(root).test.projectPlanVersion,1);
 const missing={...base,requires:['studio-test-program-that-does-not-exist']};
 const blocked=await runner.run({action:'connect-project',project:'test',payload:{...payload,configuration:missing}});
 assert.equal(blocked.setupPlan.state,'missing_tools');
 await assert.rejects(runner.run({action:'connect-project',project:'test',payload:{...apply,configuration:missing,expectedPlan:blocked.setupPlan.revision}}),/nicht vollständig/);
 assert.equal(managedProjects(root).test.publish,true,'Failed replanning preserves the existing explicit grant');
 await runner.run({action:'connect-project',project:'test',payload:{repository:payload.repository,base:'main',check:['node','--test'],publish:false,allowCodex:false}});
 assert.deepEqual(managedProjects(root).test.prepare,[]);assert.equal(managedProjects(root).test.projectPlanVersion,undefined,'Legacy reconfiguration must not retain old preparation');
});

test('relative project executables support leading dot while rejecting traversal for PC and server',async t=>{
 const root=temporary(t),runner=new LocalRunner({stateDir:root,projects:{}});t.after(()=>runner.close());
 let called;runner.execute=async argv=>{called=argv;return 'ok';};
 assert.equal(await runner.untrusted(['./scripts/test.sh'],root),'ok');assert.equal(called[0],path.join(root,'scripts','test.sh'));
 assert.equal(await runner.untrusted(['.venv/bin/python','-m','pytest'],root),'ok');
 for(const name of ['../escape','./../escape','./a/../../escape'])await assert.rejects(runner.untrusted([name],root),/innerhalb/);
});

async function repository(t,files){
 const root=temporary(t),repo=path.join(root,'repo');mkdirSync(repo);
 const git=(...args)=>command(['git',...args],repo);
 await git('init','-b','main');await git('config','user.name','Setup Fixture');await git('config','user.email','setup@fixture.invalid');
 for(const [name,body] of Object.entries(files))writeFileSync(path.join(repo,name),body);
 await git('add','.');await git('commit','-m','Synthetic project');
 return {root,repo,git};
}

for(const language of ['node','python'])test(`real ${language} preparation and tests run in separate copies; generated environment stays outside source`,async t=>{
 const bundled=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../.local-tools/python/python.exe');
 const python=process.env.STUDIO_TEST_PYTHON??(existsSync(bundled)?bundled:'/usr/bin/python3');
 if(language==='python'&&!existsSync(python)){t.skip('No installed Python executable for this local fixture');return;}
 const executable=language==='node'?process.execPath:python;
 const files=language==='node'?{
  'prepare.mjs':`import {mkdirSync,writeFileSync} from 'node:fs';mkdirSync('.prepared',{recursive:true});writeFileSync('.prepared/ready','yes');`,
  'test.mjs':`import {readFileSync} from 'node:fs';if(readFileSync('.prepared/ready','utf8')!=='yes')process.exit(1);console.log('node test passed');`,
  'build.mjs':`import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';if(readFileSync('.prepared/ready','utf8')!=='yes')process.exit(1);mkdirSync('dist',{recursive:true});writeFileSync('dist/index.html','<h1>Node preview</h1>');`
 }:{
  'prepare.py':`from pathlib import Path\nPath('.prepared').mkdir(exist_ok=True)\nPath('.prepared/ready').write_text('yes')\n`,
  'test.py':`from pathlib import Path\nassert Path('.prepared/ready').read_text() == 'yes'\nprint('python test passed')\n`,
  'build.py':`from pathlib import Path\nassert Path('.prepared/ready').read_text() == 'yes'\nPath('dist').mkdir(exist_ok=True)\nPath('dist/index.html').write_text('<h1>Python preview</h1>')\n`
 };
 const f=await repository(t,files),p={repo:f.repo,base:'main',check:[executable,language==='node'?'test.mjs':'test.py'],prepare:[[executable,language==='node'?'prepare.mjs':'prepare.py']],requires:[],generated:['.prepared'],projectPlanVersion:1,publish:false,preview:{build:[executable,language==='node'?'build.mjs':'build.py'],directory:'dist'}};
 const runner=new LocalRunner({stateDir:path.join(f.root,'state'),projects:{project:p}});t.after(()=>runner.close());
 for(const id of ['first','second']){
  const dir=path.join(runner.state,'worktrees','project-'+id);await f.git('worktree','add','-b','studio/'+id,dir,'HEAD');
  const result=await runner.run({id:'check-'+id,action:'check',project:'project',payload:{worktree:id}});
  assert.match(result.checks,new RegExp(language+' test passed'));assert.ok(result.source.revision);
  const preview=await runner.run({id:'preview-'+id,action:'preview',project:'project',payload:{worktree:id}});
  assert.match(Buffer.from(preview.previewBundle['index.html'],'base64').toString(),/preview/);assert.ok(preview.source.revision);
  assert.equal(await command(['git','status','--porcelain'],dir),'');assert.equal(existsSync(path.join(dir,'.prepared','ready')),true);
 }
 assert.equal(existsSync(path.join(f.repo,'.prepared')),false,'Repository clone was never prepared');
});

test('preparation failure, cancellation and source mutation stop before tests or publication',async t=>{
 const f=await repository(t,{'source.txt':'original'}),runner=new LocalRunner({stateDir:path.join(f.root,'state'),projects:{}});t.after(()=>runner.close());
 const config={projectPlanVersion:1,check:[process.execPath,'-e','throw Error("test must not execute")'],requires:[],generated:[],prepare:[[process.execPath,'-e','process.exit(9)']]};
 await assert.rejects(runner.check(f.repo,config),/Projektvorbereitung fehlgeschlagen/);
 await assert.rejects(runner.check(f.repo,{...config,prepare:[[process.execPath,'-e',`require('fs').writeFileSync('source.txt','changed')`]]}),/Quelldateien verändert/);
 await f.git('restore','source.txt');
 const controller=new AbortController();runner.control={signal:controller.signal};
 const waiting=runner.check(f.repo,{...config,prepare:[[process.execPath,'-e','setTimeout(()=>{},10000)']]});setTimeout(()=>controller.abort(),250);
 await assert.rejects(waiting,{name:'AbortError'});assert.equal(readFileSync(path.join(f.repo,'source.txt'),'utf8'),'original');
});

test('a preparation that rewrites tracked code prevents submit from pushing the branch',async t=>{
 const f=await repository(t,{'source.txt':'original'});await f.git('remote','add','origin',f.repo);
 const p={repo:f.repo,base:'main',publish:true,projectPlanVersion:1,generated:[],requires:[],prepare:[[process.execPath,'-e',`require('fs').writeFileSync('source.txt','changed')`]],check:[process.execPath,'-e','console.log("test")']};
 const runner=new LocalRunner({stateDir:path.join(f.root,'state'),projects:{project:p}});t.after(()=>runner.close());
 const git=runner.git.bind(runner);let pushes=0;
 runner.git=async(dir,...args)=>{if(args[0]==='push'){pushes++;throw Error('No push expected');}return git(dir,...args);};
 await runner.run({id:'copy',project:'project',action:'prepare',payload:{}});
 await assert.rejects(runner.run({id:'submit',project:'project',action:'submit',payload:{worktree:'copy'}}),/Quelldateien verändert/);
 assert.equal(pushes,0);assert.equal(readFileSync(path.join(f.repo,'source.txt'),'utf8'),'original');
});
