import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LocalRunner,githubGitEnv} from './runner.mjs';
import {command} from './process.mjs';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {storeMetadata} from './team-model.mjs';

const TOKEN='ghs_fixtureToken1234567890abcdef';

test('GitHub token reaches only the server worker\'s own Git commands, through the environment',async t=>{
 assert.equal(githubGitEnv(undefined,'server'),undefined);
 assert.equal(githubGitEnv({repository:'o/r',token:TOKEN},'pc'),undefined,'personal PCs keep their own GitHub access');
 assert.throws(()=>githubGitEnv({repository:'o/r',token:'bad token\n'},'server'),/ungültig/);
 const env=githubGitEnv({repository:'o/r',token:TOKEN},'server');
 const header='AUTHORIZATION: basic '+Buffer.from('x-access-token:'+TOKEN).toString('base64');
 const start=Number(process.env.GIT_CONFIG_COUNT??0);
 assert.equal(env.GIT_CONFIG_COUNT,String(start+2),'existing Git settings from the environment are kept');
 assert.equal(env[`GIT_CONFIG_VALUE_${start}`],header);
 assert.equal(env.GIT_TERMINAL_PROMPT,'0');

 const dir=mkdtempSync(path.join(os.tmpdir(),'github-app-worker-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const repo=path.join(dir,'repo');mkdirSync(repo);
 await command(['git','init','-q'],repo);await command(['git','remote','add','origin','git@github.com:owner/site'],repo);
 const runner=new LocalRunner({stateDir:path.join(dir,'state'),projects:{},kind:'server',launcher:{url:'http://127.0.0.62:3129',keyFile:'x'}});
 t.after(()=>runner.close?.());
 runner.gitEnv=env;
 assert.equal(await runner.git(repo,'ls-remote','--get-url','origin'),'https://github.com/owner/site','earlier SSH remotes use HTTPS with the token');
 assert.equal(await runner.git(repo,'config','--get','http.https://github.com/.extraheader'),header);
 // Nothing is written into the repository's own configuration.
 await assert.rejects(command(['git','config','--local','--get','http.https://github.com/.extraheader'],repo));
 // Other commands of the runner (project tests, builds) do not inherit the token.
 await assert.rejects(runner.execute(['git','config','--get','http.https://github.com/.extraheader'],repo));
 runner.gitEnv=undefined;
 assert.equal(await runner.git(repo,'ls-remote','--get-url','origin'),await command(['git','ls-remote','--get-url','origin'],repo),'without a token nothing changes');
 await assert.rejects(runner.git(repo,'config','--get','http.https://github.com/.extraheader'));
});

test('Studio hands a repository token only to the server worker and never stores it',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'github-app-poll-')),origin='http://127.0.0.1:44621';
 const asked=[];
 const githubApp={configured:()=>true,repositoryToken:async repository=>{asked.push(repository);return TOKEN;},status:()=>({configured:true,canCreate:false,installations:[]})};
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44622',seedProjects:true,githubApp});
 await new Promise(r=>app.server.listen(44621,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const owner=await request('/api/auth/register',{invite:createInvite(app.db,'o@fixture.invalid','owner'),name:'O',password:'fixture-password-1234'});
 const base={models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled'};
 const pc=(await request('/api/development',{action:'device',name:'PC'},owner.cookie)).data,srv=(await request('/api/development',{action:'device',name:'Server'},owner.cookie)).data;
 await request('/api/runner/capabilities',{...base,host:{kind:'pc',os:'win32',arch:'x64',node:'v24',cpus:4,memoryMb:8000}},null,pc.token);
 await request('/api/runner/capabilities',{...base,host:{kind:'server',os:'linux',arch:'x64',node:'v24',cpus:1,memoryMb:2048}},null,srv.token);
 storeMetadata(app.db,'room:v1:project:website',{repository:'https://github.com/owner/site',base:'main',teamShared:true,revision:1});

 for(const [device,expected] of [[srv,true],[pc,false]]){
  const queued=await request('/api/development',{action:'job',device:device.id,project:'website',operation:'inspect'},owner.cookie);
  assert.equal(queued.status,200,JSON.stringify(queued.data));
  const job=(await request('/api/runner/poll',{},null,device.token)).data.job;
  assert.equal(job.action,'inspect');
  if(expected)assert.deepEqual(job.github,{repository:'owner/site',token:TOKEN});else assert.equal(job.github,undefined);
  const stored=app.db.prepare('SELECT payload,result FROM jobs WHERE id=?').get(job.id);
  assert.equal(JSON.stringify(stored).includes(TOKEN),false,'the token is not stored with the job');
  await request('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result:{ready:false,checks:[]}},null,device.token);
 }
 assert.deepEqual(asked,['owner/site']);

 // An old Werkstatt profile without upload: on the server worker the app shares, so the share button is enabled;
 // on a personal PC the old rule still shows.
 const development=[{id:'website',check:true,preview:true,allowCodex:false,publish:false}];
 await request('/api/runner/capabilities',{...base,development,host:{kind:'server',os:'linux',arch:'x64',node:'v24',cpus:1,memoryMb:2048}},null,srv.token);
 await request('/api/runner/capabilities',{...base,development,host:{kind:'pc',os:'win32',arch:'x64',node:'v24',cpus:4,memoryMb:8000}},null,pc.token);
 const readiness=(await request('/api/development',null,owner.cookie)).data.readiness;
 const cap=device=>readiness.reports.find(r=>r.device===device.id).projects.find(p=>p.id==='website');
 assert.equal(cap(srv).publish,true,'the server worker shares through the GitHub App');
 assert.equal(cap(pc).publish,false,'a personal PC keeps its own setting');

 // Background jobs that never reach GitHub get no token.
 const status=await request('/api/development',{action:'job',device:srv.id,project:'website',operation:'deploy-key'},owner.cookie);
 assert.equal(status.status,200);
 const job=(await request('/api/runner/poll',{},null,srv.token)).data.job;
 assert.equal(job.action,'deploy-key');assert.equal(job.github,undefined);
});

test('with a GitHub App token the server worker may share a task branch despite an old profile without upload',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'github-app-publish-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const repo=path.join(dir,'repo');mkdirSync(repo);await command(['git','init','-q'],repo);
 const runner=new LocalRunner({stateDir:path.join(dir,'state'),projects:{website:{repo,base:'main',check:['true'],publish:false,workflow:'pull-request'}},kind:'server',launcher:{url:'http://127.0.0.62:3129',keyFile:'x'}});
 t.after(()=>runner.close?.());
 const job={id:'job-1',action:'submit',project:'website',payload:{worktree:'copy-1'}};
 await assert.rejects(runner.run(job),/noch gesperrt/,'without the app the old profile still blocks');
 await assert.rejects(runner.run({...job,github:{repository:'owner/site',token:TOKEN}}),e=>!/noch gesperrt/.test(e.message),'with the app token the profile no longer blocks (later steps may still fail here)');
 // A personal PC keeps its own rule even if a token were passed.
 const pc=new LocalRunner({stateDir:path.join(dir,'pc'),projects:{website:{repo,base:'main',check:['true'],publish:false,workflow:'pull-request'}}});
 t.after(()=>pc.close?.());
 await assert.rejects(pc.run({...job,github:{repository:'owner/site',token:TOKEN}}),/noch gesperrt/);
});
