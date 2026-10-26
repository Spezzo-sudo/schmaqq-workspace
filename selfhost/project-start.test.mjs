import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync,mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {aiCapabilities} from './local-ai.mjs';
import {setupProject} from './project-setup.mjs';
import {LocalRunner,command} from './runner.mjs';

test('project start is idempotent and personal readiness never reveals another runner or config contents',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-start-api-')),origin='http://127.0.0.1:44351',app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin});await new Promise(r=>app.server.listen(44351,'127.0.0.1',r));
 const request=async(route,value,cookie,token,from=origin)=>{const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{Origin:from,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  const a=await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'A',password:'fixture-password-1234'}),b=await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'B',password:'fixture-password-1234'});
  const payload={id:randomUUID(),title:'Gemeinsames Projekt',description:'Prüfbares Ergebnis',mode:'new'};
  assert.equal((await request('/api/project-start',payload)).status,401);assert.equal((await request('/api/project-start',payload,a.cookie,null,'https://foreign.invalid')).status,403);
  const started=await request('/api/project-start',payload,a.cookie);assert.equal(started.status,200);assert.equal((await request('/api/project-start',payload,a.cookie)).data.project,started.data.project);
  assert.equal((await request('/api/project-start',{...payload,title:'Changed'},a.cookie)).status,409);assert.equal((await request('/api/project-start',payload,b.cookie)).status,409);
  const device=(await request('/api/development',{action:'device',name:'Personal PC'},a.cookie)).data;
  const foreignDevice=(await request('/api/development',{action:'device',name:'Other PC'},b.cookie)).data;
  assert.equal((await request('/api/runner/project-setup-verify',{project:started.data.project},null,device.token)).status,200);
  assert.equal((await request('/api/runner/project-setup-verify',{project:started.data.project},null,foreignDevice.token)).status,403);
  const another=await request('/api/project-start',{id:randomUUID(),title:'Projekt B',description:'Privates Projekt von B',mode:'github'},b.cookie);
  assert.equal(another.status,200);
  assert.equal((await request('/api/runner/project-setup-verify',{project:another.data.project},null,device.token)).status,403,'Global owner must not import another account\'s private project');
  assert.equal((await request('/api/runner/project-setup-verify',{project:'website'},null,device.token)).status,200,'Legacy projects remain accessible to the studio owner');
  assert.equal((await request('/api/runner/project-setup-verify',{project:'does-not-exist'},null,device.token)).status,403);
  assert.equal((await request('/api/runner/project-setup-verify',{project:started.data.project})).status,401);
  const capabilities=await aiCapabilities({projects:{[started.data.project]:{repo:'/not-transmitted',check:['node','--test'],publish:false,allowCodex:false,preview:{build:['node','build.mjs'],directory:'dist'}}}});
  assert.equal(JSON.stringify(capabilities).includes('/not-transmitted'),false);
  assert.equal((await request('/api/runner/capabilities',capabilities,null,device.token)).status,200);
  const own=(await request('/api/development',null,a.cookie)).data.readiness,foreign=(await request('/api/development',null,b.cookie)).data.readiness;
  assert.equal(own.reports[0].projects[0].id,started.data.project);assert.equal(own.reports[0].projects[0].allowCodex,false);assert.equal(own.reports[0].codex,'disabled');assert.equal(foreign.reports.length,1);assert.equal(foreign.reports[0].projects,null);assert.ok(!JSON.stringify(own).includes('/not-transmitted'));
  const {development,...legacy}=capabilities;await request('/api/runner/capabilities',legacy,null,device.token);
  assert.equal((await request('/api/development',null,a.cookie)).data.readiness.reports[0].projects,null);
 }finally{await new Promise(r=>app.server.close(r));app.db.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'studio-start-api-')));rmSync(dir,{recursive:true,force:true});}
});

test('local setup reuses registration, preserves profiles, and starts an actual isolated project without GitHub',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-start-local-')),configuration=path.join(dir,'runner.private.json'),planFile=path.join(dir,'plan.private.json'),destination=path.join(dir,'new-project');let runner;
 try{
  const original={server:'http://127.0.0.1:44351',token:'synthetic-personal-registration',stateDir:path.join(dir,'state'),projects:{legacy:{repo:path.join(dir,'unrelated'),allowCodex:true,publish:true}}};writeFileSync(configuration,JSON.stringify(original),{mode:0o600});
  const plan={schema:'schmaqq-project-setup-v1',server:original.server,project:'new-project',mode:'new',directory:destination,base:'main',check:['not-executed']};writeFileSync(planFile,JSON.stringify(plan),{mode:0o600});
  const result=await setupProject(planFile,configuration),updated=JSON.parse(readFileSync(configuration,'utf8'));
  assert.equal(updated.token,original.token);assert.deepEqual(updated.projects.legacy,original.projects.legacy);assert.deepEqual(JSON.parse(readFileSync(result.backup,'utf8')),original);assert.equal(updated.projects['new-project'].allowCodex,false);assert.equal(updated.projects['new-project'].publish,false);
  await command(['git','config','user.name','Fixture'],result.repository);await command(['git','config','user.email','fixture@invalid.local'],result.repository);
  runner=new LocalRunner(updated);const copy=await runner.run({id:'copy',project:'new-project',action:'prepare',payload:{}});assert.ok(existsSync(path.join(copy.path,'site/index.html')));
  // The fixture runner is embedded in node:test; real runner processes do not
  // inherit its recursion sentinel. Remove it only for this child test command.
  const testContext=process.env.NODE_TEST_CONTEXT;let check;
  try{delete process.env.NODE_TEST_CONTEXT;check=await runner.run({id:'test',project:'new-project',action:'check',payload:{worktree:'copy'}});}
  finally{if(testContext!==undefined)process.env.NODE_TEST_CONTEXT=testContext;}
  assert.match(check.checks,/pass 1/);
  const preview=await runner.run({id:'preview',project:'new-project',action:'preview',payload:{worktree:'copy'}});assert.ok(preview.previewBundle['index.html']);assert.equal(preview.source.revision,check.source.revision);
  await assert.rejects(()=>setupProject(planFile,configuration),/nicht überschrieben/);
  const planOther={...plan,project:'other'};writeFileSync(planFile,JSON.stringify(planOther));const before=readFileSync(configuration);await assert.rejects(()=>setupProject(planFile,configuration));assert.ok(readFileSync(configuration).equals(before));
  const existingPlan={...plan,project:'existing',mode:'existing',directory:result.repository,check:[process.execPath,'--test'],preview:{build:[process.execPath,'build.mjs'],directory:'dist'}};
  writeFileSync(planFile,JSON.stringify({...existingPlan,preview:{...existingPlan.preview,directory:'../outside'}}));await assert.rejects(()=>setupProject(planFile,configuration),/Vorschau/);assert.ok(readFileSync(configuration).equals(before));
  writeFileSync(planFile,JSON.stringify(existingPlan));const existing=await setupProject(planFile,configuration);assert.equal(existing.repository,result.repository);assert.deepEqual(JSON.parse(readFileSync(configuration,'utf8')).projects.existing.preview,existingPlan.preview);
  writeFileSync(planFile,JSON.stringify({...plan,project:'wrong-server',server:'https://wrong.invalid',directory:path.join(dir,'must-not-exist')}));await assert.rejects(()=>setupProject(planFile,configuration),/selben Studio/);assert.equal(existsSync(path.join(dir,'must-not-exist')),false);
  const noGit=path.join(dir,'not-git');mkdirSync(noGit);writeFileSync(planFile,JSON.stringify({...plan,mode:'existing',project:'no-git',directory:noGit,check:['node','--test']}));await assert.rejects(()=>setupProject(planFile,configuration),/Git-Einrichtung/);
 }finally{runner?.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'studio-start-local-')));rmSync(dir,{recursive:true,force:true});}
});
