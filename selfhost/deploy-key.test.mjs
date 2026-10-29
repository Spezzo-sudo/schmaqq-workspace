import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LocalRunner} from './runner.mjs';
import {connectManagedProject} from './managed-projects.mjs';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

const PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIA/APR8Kh+P9E7ksjYqhDzTvSr8+3H9A3Q/QAUa2v0G9 schmaqq-worker website';

test('only a server worker creates a deploy key, once, inside its private state',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'deploy-key-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const server=new LocalRunner({stateDir:path.join(dir,'server'),projects:{},kind:'server',launcher:{url:'http://127.0.0.62:3129',keyFile:'x'}});
 let keygen=0;server.execute=async argv=>{keygen++;assert.equal(argv[0],'ssh-keygen');const file=argv[argv.indexOf('-f')+1];writeFileSync(file,'private');writeFileSync(file+'.pub',PUB+'\n');return '';};
 const first=await server.run({action:'deploy-key',project:'website',payload:{}});
 assert.equal(first.publicKey,PUB);assert.ok(server.deployKey('website').startsWith(path.join(dir,'server','keys')));
 assert.equal((await server.run({action:'deploy-key',project:'website',payload:{}})).publicKey,PUB);assert.equal(keygen,1,'The key is created once');
 const cmd=server.deployKeyCommand('website');
 for(const part of ['env SHELL=/bin/sh ssh','-o IdentitiesOnly=yes','StrictHostKeyChecking=yes','HostKeyAlias=github.com','HostName=ssh.github.com','Port=443','ssh-connect-proxy.mjs %h %p','github_known_hosts'])assert.ok(cmd.includes(part),part);
 assert.equal(server.deployKeyCommand('other'),null);
 assert.throws(()=>server.deployKey('../x'));
 const pc=new LocalRunner({stateDir:path.join(dir,'pc'),projects:{}});
 await assert.rejects(pc.run({action:'deploy-key',project:'website',payload:{}}),/nur auf dem Server-Worker/);
 server.close();pc.close();
});

test('project setup on the server worker clones over SSH with the deploy key and keeps it for the repository',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'deploy-clone-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const runner=new LocalRunner({stateDir:path.join(dir,'state'),projects:{},kind:'server',launcher:{url:'http://127.0.0.62:3129',keyFile:'x'}});
 mkdirSync(path.dirname(runner.deployKey('website')),{recursive:true});writeFileSync(runner.deployKey('website'),'private');
 const calls=[];runner.git=async(cwd,...args)=>{calls.push(args);if(args.includes('clone'))mkdirSync(args.at(-1),{recursive:true});return '';};
 const result=await connectManagedProject(runner,{project:'website',payload:{repository:'https://github.com/owner/site',base:'main',check:['npm','test'],publish:true,allowCodex:false,workflow:'pull-request'}});
 assert.equal(result.configured,true);
 const clone=calls.find(a=>a.includes('clone'));
 assert.equal(clone.at(-1).endsWith(path.join('projects','website')),true);assert.equal(clone.at(-2),'git@github.com:owner/site','SSH URL instead of HTTPS');
 assert.ok(clone[0]==='-c'&&clone[1].startsWith('core.sshCommand=env SHELL=/bin/sh ssh -i '));
 const kept=calls.find(a=>a[0]==='config'&&a[1]==='core.sshCommand');assert.ok(kept,'Later git commands of the runner use the same key');
 // A rejected key gets a clear explanation.
 const other=new LocalRunner({stateDir:path.join(dir,'state2'),projects:{},kind:'server',launcher:{url:'http://127.0.0.62:3129',keyFile:'x'}});
 mkdirSync(path.dirname(other.deployKey('website')),{recursive:true});writeFileSync(other.deployKey('website'),'private');
 other.git=async()=>{throw new Error('git@ssh.github.com: Permission denied (publickey).');};
 await assert.rejects(connectManagedProject(other,{project:'website',payload:{repository:'https://github.com/owner/site',base:'main',check:['npm','test']}}),/Deploy keys/);
 assert.equal(existsSync(path.join(dir,'state2','connected-projects.private.json')),false);
 runner.close();other.close();
});

test('Studio queues deploy-key jobs only for the server worker',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'deploy-api-')),origin='http://127.0.0.1:44611';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44612',seedProjects:true});
 await new Promise(r=>app.server.listen(44611,'127.0.0.1',r));t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const owner=await request('/api/auth/register',{invite:createInvite(app.db,'o@fixture.invalid','owner'),name:'O',password:'fixture-password-1234'});
 const base={models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled'};
 const pc=(await request('/api/development',{action:'device',name:'PC'},owner.cookie)).data,srv=(await request('/api/development',{action:'device',name:'Server'},owner.cookie)).data;
 await request('/api/runner/capabilities',{...base,host:{kind:'pc',os:'win32',arch:'x64',node:'v24',cpus:4,memoryMb:8000}},null,pc.token);
 await request('/api/runner/capabilities',{...base,host:{kind:'server',os:'linux',arch:'x64',node:'v24',cpus:1,memoryMb:2048}},null,srv.token);
 assert.equal((await request('/api/development',{action:'job',device:pc.id,project:'website',operation:'deploy-key'},owner.cookie)).status,409);
 const queued=await request('/api/development',{action:'job',device:srv.id,project:'website',operation:'deploy-key'},owner.cookie);
 assert.equal(queued.status,200);const job=(await request('/api/runner/poll',{},null,srv.token)).data.job;assert.equal(job.action,'deploy-key');assert.deepEqual(Object.keys(job.payload),['placement']);
});
