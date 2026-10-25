import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createServer as httpServer} from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {setupProject} from './project-setup.mjs';
import {LocalRunner} from './runner.mjs';
import {command} from './process.mjs';

async function port(){const s=net.createServer();await new Promise(done=>s.listen(0,'127.0.0.1',done));const p=s.address().port;await new Promise(done=>s.close(done));return p;}
test('local Git transport fixture: a fresh GitHub-form import reaches inspect and prepare; failures preserve profiles',async()=>{
 const tmp=mkdtempSync(path.join(os.tmpdir(),'schmaqq-import-git-'));
 let daemon,server,runner;
 const envKeys=['GIT_CONFIG_COUNT','GIT_CONFIG_KEY_0','GIT_CONFIG_VALUE_0'];
 const oldEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
 try{
  const sitePort=await port(),origin='http://127.0.0.1:'+sitePort;
  server=httpServer(async(req,res)=>{
   const parts=[];for await(const b of req)parts.push(b);
   const body=JSON.parse(Buffer.concat(parts).toString());
   const ok=req.method==='POST'&&req.url==='/api/runner/project-setup-verify'&&req.headers.authorization==='Bearer local-fixture-token'&&['owned-project','owned-for-failure'].includes(body.project);
   res.writeHead(ok?200:403,{'Content-Type':'application/json'});res.end(JSON.stringify({ok}));
  });
  await new Promise(done=>server.listen(sitePort,'127.0.0.1',done));
  const dir=path.join(tmp,'git-served'),seed=path.join(tmp,'seed');
  mkdirSync(dir);
  const bare=path.join(dir,'pilot.git');
  await command(['git','init','--bare','--initial-branch=main',bare],tmp);
  await command(['git','init','-b','main',seed],tmp);
  writeFileSync(path.join(seed,'README.md'),'Local test fixture');
  await command(['git','add','.'],seed);
  await command(['git','-c','user.name=Fixture','-c','user.email=fixture@invalid.local','commit','-m','Fixture'],seed);
  await command(['git','remote','add','origin',bare],seed);
  await command(['git','push','origin','main'],seed);
  const gitPort=await port();
  daemon=spawn('git',['daemon','--listen=127.0.0.1','--port='+gitPort,'--base-path='+dir,'--export-all'],{stdio:'ignore'});
  await new Promise(done=>setTimeout(done,250));
  assert.equal(daemon.exitCode,null);
  process.env.GIT_CONFIG_COUNT='1';
  process.env.GIT_CONFIG_KEY_0='url.git://127.0.0.1:'+gitPort+'/pilot.git.insteadOf';
  process.env.GIT_CONFIG_VALUE_0='https://github.com/Spezzo-sudo/schmaqq-studio-pilot.git';
  const online=await command(['git','ls-remote',process.env.GIT_CONFIG_VALUE_0],tmp,{timeout:5000});
  assert.match(online,/refs\/heads\/main/);
  const configuration=path.join(tmp,'runner.private.json'),planFile=path.join(tmp,'plan.private.json');
  const existing={repo:path.join(tmp,'legacy'),allowCodex:true,publish:true};
  const original={server:origin,token:'local-fixture-token',stateDir:path.join(tmp,'state'),projects:{legacy:existing}};
  writeFileSync(configuration,JSON.stringify(original),{mode:0o600});
  const plan={schema:'schmaqq-project-setup-v1',server:origin,project:'owned-project',mode:'github',
   directory:path.join(tmp,'imported'),repository:'https://github.com/Spezzo-sudo/schmaqq-studio-pilot',base:'main',
   check:[process.execPath,'--test']};
  writeFileSync(planFile,JSON.stringify(plan),{mode:0o600});
  const setup=await setupProject(planFile,configuration);
  const config=JSON.parse(readFileSync(configuration,'utf8'));
  assert.ok(existsSync(path.join(setup.repository,'README.md')));
  assert.deepEqual(config.projects.legacy,existing);
  assert.equal(config.token,original.token);
  assert.deepEqual(JSON.parse(readFileSync(setup.backup,'utf8')),original);
  assert.equal(config.projects['owned-project'].allowCodex,false);
  assert.equal(config.projects['owned-project'].publish,false);
  await command(['git','config','user.name','Fixture'],setup.repository);
  await command(['git','config','user.email','fixture@invalid.local'],setup.repository);
  runner=new LocalRunner(config);
  const inspected=await runner.run({id:'inspection',project:'owned-project',action:'inspect',payload:{}});
  assert.equal(inspected.ready,true,JSON.stringify(inspected.checks));
  const prepared=await runner.run({id:'test-copy',project:'owned-project',action:'prepare',payload:{}});
  assert.ok(existsSync(path.join(prepared.path,'README.md')));
  assert.equal(prepared.branch,'studio/test-copy');
  const snapshot=readFileSync(configuration);
  await assert.rejects(()=>setupProject(planFile,configuration),/nicht überschrieben/);
  writeFileSync(planFile,JSON.stringify({...plan,project:'foreign-project',directory:path.join(tmp,'forbidden')}));
  await assert.rejects(()=>setupProject(planFile,configuration),/nicht gemeinsam freigegeben/);
  assert.equal(existsSync(path.join(tmp,'forbidden')),false);
  writeFileSync(planFile,JSON.stringify({...plan,project:'owned-for-failure',directory:path.join(tmp,'missing'),base:'nonexistent'}));
  await assert.rejects(()=>setupProject(planFile,configuration),/GitHub-Import fehlgeschlagen/);
  assert.ok(existsSync(path.join(tmp,'missing')));
  assert.ok(readFileSync(configuration).equals(snapshot));
 }finally{
  for(const key of envKeys){if(oldEnv[key]===undefined)delete process.env[key];else process.env[key]=oldEnv[key];}
  runner?.close();daemon?.kill('SIGTERM');
  if(server)await new Promise(done=>server.close(done));
  rmSync(tmp,{recursive:true,force:true});
 }
});
