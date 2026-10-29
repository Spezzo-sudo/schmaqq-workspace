import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,mkdirSync,symlinkSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createStudioServer} from './server.mjs';
import {createInvite,openStore,digest} from './store.mjs';
import {LocalRunner} from './runner.mjs';
import {aiCapabilities} from './local-ai.mjs';
import {runtimeInventory} from './runtime-package.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..');
const unit=readFileSync(path.join(here,'deploy','worker','schmaqq-studio-worker.service'),'utf8');
const values=key=>unit.split('\n').filter(line=>line.startsWith(key+'=')).map(line=>line.slice(key.length+1));

test('server worker unit keeps jobs unprivileged, out of other services and inside resource limits',()=>{
 assert.deepEqual(values('User'),['schmaqq-worker']);
 assert.equal(values('SupplementaryGroups').length,0,'No docker or other groups');
 for(const [key,value] of [['NoNewPrivileges','yes'],['ProtectSystem','strict'],['ProtectHome','yes'],['PrivateTmp','yes'],['PrivateDevices','yes'],['RestrictSUIDSGID','yes'],['CapabilityBoundingSet','']])assert.deepEqual(values(key),[value],key);
 assert.deepEqual(values('ReadWritePaths'),['/var/lib/schmaqq-worker'],'Only the worker volume is writable');
 for(const hidden of ['/opt:ro','/var/lib:ro','/srv:ro','/var/backups:ro','/run:ro'])assert.ok(values('TemporaryFileSystem')[0].split(' ').includes(hidden),hidden);
 for(const path_ of ['/var/run/docker.sock','/etc/schmaqq-studio.env'])assert.ok(values('InaccessiblePaths')[0].includes(path_),path_);
 // No direct network: everything denied, only the egress proxy allowed; no unix sockets at all.
 assert.deepEqual(values('IPAddressDeny'),['any']);
 assert.deepEqual(values('IPAddressAllow'),['127.0.0.60/32'],'An allow entry wins over deny in systemd; only the proxy may be allowed');
 assert.deepEqual(values('RestrictAddressFamilies'),['AF_INET AF_INET6'],'No AF_UNIX: local service sockets stay unreachable');
 const env=values('Environment').join(' ');
 for(const variable of ['HTTPS_PROXY=http://127.0.0.60:3128','https_proxy=http://127.0.0.60:3128','NODE_USE_ENV_PROXY=1'])assert.ok(env.includes(variable),variable);
 assert.ok(values('Wants')[0].includes('schmaqq-worker-egress.service'));
 for(const key of ['MemoryMax','CPUQuota','TasksMax','MemorySwapMax'])assert.equal(values(key).length,1,key);
 assert.match(values('ExecStart')[0],/^\/usr\/local\/lib\/schmaqq-worker\/node\/bin\/node \/usr\/local\/lib\/schmaqq-worker\/current\/selfhost\/runner\.mjs /);
});

test('runtime release contains the runner and the worker deployment files',()=>{
 const files=runtimeInventory(root).files;
 for(const file of ['selfhost/runner.mjs','selfhost/placement.mjs','selfhost/deploy/worker/schmaqq-studio-worker.service','selfhost/deploy/worker/schmaqq-worker-egress.service','selfhost/deploy/worker/egress-proxy.mjs','selfhost/deploy/worker/install-worker.sh','selfhost/deploy/worker/probe-sandbox.mjs','selfhost/deploy/worker/register-worker.mjs','selfhost/deploy/worker/pilot-job.mjs'])assert.ok(files.includes(file),file);
});

test('runner starts when launched through a symlinked release directory',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-runner-link-')),link=path.join(dir,'current');
 try{
  symlinkSync(here,link,process.platform==='win32'?'junction':'dir');
  const started=spawnSync(process.execPath,[path.join(link,'runner.mjs')],{encoding:'utf8'});
  assert.match(started.stderr,/Aufruf: node selfhost\/runner\.mjs/,'The entry point ran instead of silently exiting');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('worker registration creates one hashed owner device and refuses duplicates or ambiguous owners',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-worker-register-')),script=path.join(here,'deploy','worker','register-worker.mjs');
 try{
  const db=openStore(path.join(dir,'studio.sqlite'),{seedProjects:false});
  db.prepare("INSERT INTO members VALUES('owner-1','Owner','owner@fixture.invalid','x','owner',0)").run();db.close();
  const run=()=>spawnSync(process.execPath,[script,'SCHMAQQ-VPS Server-Worker'],{env:{...process.env,STUDIO_DATA_DIR:dir},encoding:'utf8'});
  const first=run();assert.equal(first.status,0,first.stderr);
  const {device,token}=JSON.parse(first.stdout),check=openStore(path.join(dir,'studio.sqlite'),{seedProjects:false});
  const row=check.prepare('SELECT * FROM devices WHERE id=?').get(device);
  assert.equal(row.owner,'owner-1');assert.equal(row.hash,digest(token));assert.notEqual(row.hash,token);
  assert.notEqual(run().status,0,'A second active worker with the same name is refused');
  check.prepare("INSERT INTO members VALUES('owner-2','Second','second@fixture.invalid','x','owner',0)").run();
  check.prepare('UPDATE devices SET revoked=1').run();check.close();
  assert.notEqual(run().status,0,'Ambiguous ownership is refused');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('a server-kind runner receives auto-placed jobs and really executes prepare and check',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-worker-e2e-')),origin='http://127.0.0.1:44591';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44592'});
 await new Promise(r=>app.server.listen(44591,'127.0.0.1',r));
 const request=async(route,value,cookie,token)=>{const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const git=(cwd,...args)=>execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@fixture.invalid',...args],{cwd,encoding:'utf8'});
 try{
  const seed=path.join(dir,'seed');mkdirSync(path.join(seed,'test'),{recursive:true});
  writeFileSync(path.join(seed,'package.json'),'{"type":"module"}');
  // A plain script: node --test inside this test process would skip itself.
  writeFileSync(path.join(seed,'test','check.mjs'),'import assert from "node:assert/strict";import {readFileSync} from "node:fs";assert.equal(JSON.parse(readFileSync("package.json","utf8")).type,"module");console.log("pass 1");');
  git(seed,'init','-q','-b','main');git(seed,'add','-A');git(seed,'commit','-q','-m','seed');
  git(dir,'clone','-q','--bare','seed','origin.git');git(dir,'clone','-q','origin.git','repo');
  const owner=await request('/api/auth/register',{invite:createInvite(app.db,'owner@fixture.invalid','owner'),name:'Owner',password:'fixture-password-1234'});
  const device=(await request('/api/development',{action:'device',name:'Server-Worker'},owner.cookie)).data;
  const config={stateDir:path.join(dir,'state'),kind:'server',label:'Fixture-VPS',projects:{website:{repo:path.join(dir,'repo'),base:'main',check:[process.execPath,'test/check.mjs'],publish:false,workflow:'direct',allowCodex:false}}};
  const runner=new LocalRunner(config);
  assert.equal((await request('/api/runner/capabilities',await aiCapabilities(config),null,device.token)).status,200);
  const work=async()=>{const job=(await request('/api/runner/poll',{},null,device.token)).data.job;assert.ok(job,'job is delivered to the server worker');
   let ok=true,result;try{result=await runner.run(job,{});}catch(e){ok=false;result={error:e.message};}
   assert.equal((await request('/api/runner/report',{id:job.id,lease:job.lease,ok,result},null,device.token)).status,200);return {job,ok,result};};
  await request('/api/runner/poll',{},null,device.token);
  const prepared=await request('/api/development',{action:'job',device:'auto',project:'website',operation:'prepare',title:'Worker-Kopie'},owner.cookie);
  assert.equal(prepared.data.device,device.id);assert.equal(prepared.data.placement.kind,'server');
  const copy=await work();assert.equal(copy.ok,true,JSON.stringify(copy.result));
  const checked=await request('/api/development',{action:'job',device:'auto',project:'website',operation:'check',worktree:prepared.data.id},owner.cookie);
  assert.equal(checked.data.device,device.id);
  const run=await work();assert.equal(run.ok,true,JSON.stringify(run.result));assert.match(String(run.result.checks),/pass 1/);
  const stored=(await request('/api/development/job?id='+checked.data.id,null,owner.cookie)).data.job;
  assert.equal(stored.status,'completed');assert.equal(stored.payload.placement.kind,'server');
  runner.close();
 }finally{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});}
});
