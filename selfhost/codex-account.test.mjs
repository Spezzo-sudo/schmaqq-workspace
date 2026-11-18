// Each member's own ChatGPT sign-in on the server worker: strictly separated, owner-only, phone-friendly.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {spawn} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createJobLauncher,jobUnitArgs,codexHome,codexModes} from './deploy/worker/job-launcher.mjs';
import {defaultAllow} from './deploy/worker/egress-proxy.mjs';
import {LocalRunner} from './runner.mjs';
import {deviceLoginPrompt,accountState} from './codex-account.mjs';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

const KEY='k'.repeat(48),MARCO='11111111-1111-4111-8111-111111111111',MARKUS='22222222-2222-4222-8222-222222222222';
const DEVICE_OUTPUT='Welcome to Codex\n\u001b[1mFollow these steps\u001b[0m\n1. Open https://auth.openai.com/codex/device\n2. Enter this one-time code ABCD-12345\n';

test('a sign-in unit sees exactly its member\'s folder, nothing else',()=>{
 const home='/var/lib/schmaqq-worker/codex/'+MARCO;
 const args=jobUnitArgs({unit:'schmaqq-job-c',dir:home,argv:['/usr/local/lib/schmaqq-worker/codex/codex','login','status'],timeoutMs:30000,codexHome:home}).join('\n');
 assert.match(args,new RegExp('BindPaths='+home+'$','m'));assert.match(args,new RegExp('ReadWritePaths='+home+'$','m'));
 assert.match(args,new RegExp('CODEX_HOME='+home+'$','m'));assert.match(args,/--working-directory=\/var\/lib\/schmaqq-worker\/codex\//);
 assert.match(args,/TemporaryFileSystem=.*\/var\/lib:ro.*\/etc\/schmaqq-worker:ro/,'all other worker data and the device token stay hidden');
 assert.ok(!args.includes(MARKUS)&&!args.includes('worktrees'),'no other member and no project copy');
 assert.match(args,/User=schmaqq-job/);
 // Normal jobs are unchanged: no Codex folder, no CODEX_HOME.
 const job=jobUnitArgs({unit:'schmaqq-job-x',dir:'/var/lib/schmaqq-worker/state/worktrees/p-1',argv:['/usr/bin/true'],timeoutMs:600000}).join('\n');
 assert.ok(!job.includes('CODEX_HOME')&&!job.includes('/codex'));
});

test('member folders: only well-formed member ids, never paths',()=>{
 const root='/var/lib/schmaqq-worker/codex';
 assert.equal(codexHome(root,MARCO),root+'/'+MARCO);
 for(const bad of ['../etc','..',MARCO+'/x','','x'.repeat(36),null,'AAAAAAAA-1111-4111-8111-111111111111','/'+MARCO])assert.throws(()=>codexHome(root,bad),undefined,String(bad));
 assert.deepEqual(Object.keys(codexModes).sort(),['exec','login','status']);
 assert.deepEqual(codexModes.login.args,['login','--device-auth']);
});

test('egress allows the ChatGPT sign-in and Codex hosts, nothing broader',()=>{
 for(const h of ['auth.openai.com','chatgpt.com','api.openai.com'])assert.ok(defaultAllow.includes(h),h);
 assert.ok(!defaultAllow.some(h=>h.includes('*')||h==='openai.com'));
});

test('sign-in link and code are read only from OpenAI/ChatGPT output',()=>{
 assert.deepEqual(deviceLoginPrompt(DEVICE_OUTPUT),{url:'https://auth.openai.com/codex/device',code:'ABCD-12345'});
 assert.equal(deviceLoginPrompt('Open https://evil.example/device and enter ABCD-12345'),null);
 assert.equal(deviceLoginPrompt('Open https://auth.openai.com.evil.example/x code ABCD-12345'),null);
 assert.equal(deviceLoginPrompt('https://auth.openai.com/codex/device without code'),null);
});

test('state: last finished step decides, a failed check keeps the last known connection',()=>{
 const j=(id,status,mode,result,created)=>({id,status,payload:JSON.stringify({mode}),result:result&&JSON.stringify(result),created});
 assert.equal(accountState([]).connected,false);
 assert.equal(accountState([j('2','completed','status',{connected:true},2)]).connected,true);
 assert.equal(accountState([j('3','completed','logout',{connected:false},3),j('2','completed','login',{connected:true},2)]).connected,false);
 const failed=accountState([j('3','failed','status',{error:'x'},3),j('2','completed','login',{connected:true},2)]);
 assert.equal(failed.connected,true);assert.equal(failed.error,'x');
 const pending=accountState([j('4','running','login',null,4)],new Map([['4',{url:'https://auth.openai.com/d',code:'AB12-CD34'}]]));
 assert.equal(pending.pending.mode,'login');assert.equal(pending.pending.login.code,'AB12-CD34');
});

async function launcher(t,{root,run,bin=true,prepare=async()=>{}}){
 const codexRoot=path.join(root,'codex');mkdirSync(codexRoot,{recursive:true});
 const server=createJobLauncher({root:path.join(root,'worktrees'),key:KEY,run,prepare,stop:()=>{},log:()=>{},codexRoot,codexBin:'/fixture/codex',exists:p=>p==='/fixture/codex'?bin:existsSync(p)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 return {url:'http://127.0.0.1:'+server.address().port,codexRoot};
}
const post=(url,body,auth='Bearer '+KEY)=>fetch(url+'/codex',{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify(body)});

test('launcher: fixed Codex commands in the member\'s own folder; logout removes only that folder',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'codex-launcher-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const calls=[];
 const run=(file,args)=>{calls.push(args);return spawn(process.execPath,['-e',`process.stdout.write(${JSON.stringify(DEVICE_OUTPUT)})`],{stdio:['ignore','pipe','pipe']});};
 const {url,codexRoot}=await launcher(t,{root,run});
 assert.equal((await post(url,{member:MARCO,mode:'status'},'Bearer wrong')).status,401);
 for(const bad of [{member:'../x',mode:'status'},{member:MARCO,mode:'constructor'},{member:MARCO}])assert.equal((await post(url,bad)).status,400,JSON.stringify(bad));
 assert.equal((await post(url,{member:MARCO,mode:'exec',dir:'/tmp',prompt:'x'})).status,409,'no code run without the member\'s own sign-in');
 const r=await post(url,{member:MARCO,mode:'login',argv:['/bin/sh'],dir:'/etc'});assert.equal(r.status,200);
 const text=await r.text();assert.match(text,/ABCD-12345/);assert.match(text,/"type":"exit","code":0/);
 const args=calls.at(-1);
 assert.deepEqual(args.slice(args.indexOf('--')+1),['/fixture/codex','login','--device-auth'],'caller cannot choose the command');
 assert.ok(args.includes('BindPaths='+path.join(codexRoot,MARCO))&&!args.join(' ').includes(MARKUS));
 assert.ok(existsSync(path.join(codexRoot,MARCO)));
 // Markus has a folder too; Marco's logout must leave it alone.
 mkdirSync(path.join(codexRoot,MARKUS));writeFileSync(path.join(codexRoot,MARKUS,'auth.json'),'{}');
 assert.equal((await (await post(url,{member:MARCO,mode:'logout'})).text()).trim(),'{"type":"exit","code":0}');
 assert.ok(!existsSync(path.join(codexRoot,MARCO)));assert.ok(existsSync(path.join(codexRoot,MARKUS,'auth.json')));
});

test('launcher refuses when Codex is not installed',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'codex-launcher-nobin-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const {url}=await launcher(t,{root,bin:false,run:()=>assert.fail('must not start')});
 const r=await post(url,{member:MARCO,mode:'login'});assert.equal(r.status,503);
});

test('runner: sign-in for the job owner only, link and code as one event, no raw output; no Codex code jobs on the server',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'codex-runner-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const calls=[];
 const run=(file,args)=>{calls.push(args);return spawn(process.execPath,['-e',`process.stdout.write(${JSON.stringify(DEVICE_OUTPUT)})`],{stdio:['ignore','pipe','pipe']});};
 const {url,codexRoot}=await launcher(t,{root,run});
 const keyFile=path.join(root,'key');writeFileSync(keyFile,KEY);
 const runner=new LocalRunner({stateDir:path.join(root,'state'),projects:{},kind:'server',launcher:{url,keyFile}});t.after(()=>runner.close?.());
 const events=[];
 const result=await runner.run({id:'j1',owner:MARKUS,project:'p',action:'codex-account',payload:{mode:'login',member:MARCO}},{onEvent:e=>events.push(e)});
 assert.deepEqual(result,{connected:true});
 assert.ok(calls.at(-1).includes('BindPaths='+path.join(codexRoot,MARKUS)),'the owner decides the folder, never the payload');
 assert.ok(!calls.at(-1).join(' ').includes(MARCO));
 const session=events.filter(e=>e.type==='session');assert.equal(session.length,1);
 assert.deepEqual(JSON.parse(session[0].text),{url:'https://auth.openai.com/codex/device',code:'ABCD-12345'});
 assert.ok(!events.some(e=>e.type==='output'),'raw Codex output is never forwarded');
 const pc=new LocalRunner({stateDir:path.join(root,'state-pc'),projects:{}});
 await assert.rejects(pc.run({id:'j3',owner:MARKUS,project:'p',action:'codex-account',payload:{mode:'status'}},{}),/nur auf dem Server-Worker/);
});

const capabilities=(kind,projects)=>({models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled',host:{kind,os:'linux',arch:'x64',node:'v24.22.0',cpus:2,memoryMb:2048},development:projects.map(id=>({id,setupVersion:1,check:true,preview:true,allowCodex:false,publish:false}))});

test('studio: each member starts and sees only their own sign-in; others get 403',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-codex-account-')),origin='http://127.0.0.1:44601';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44602'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(value?{body:JSON.stringify(value)}:{})});const data=await r.json().catch(()=>({}));return {status:r.status,data,cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const a=await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'A',password:'fixture-password-1234'});
 const b=await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'B',password:'fixture-password-1234'});
 const bId=app.db.prepare("SELECT id FROM members WHERE email='b@fixture.invalid'").get().id;
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Team',description:'',members:[bId]},a.cookie)).data.project;
 // Before any server worker exists, connecting is refused with a clear reason.
 assert.equal((await request('/api/codex-account',{action:'connect'},b.cookie)).status,409);
 const server=(await request('/api/development',{action:'device',name:'VPS-Worker'},a.cookie)).data;
 assert.equal((await request('/api/runner/capabilities',capabilities('server',[project]),null,server.token)).status,200);
 await request('/api/runner/poll',{},null,server.token);

 const before=(await request('/api/codex-account',null,b.cookie)).data;
 assert.equal(before.connected,false);assert.deepEqual(before.places.map(p=>p.device),[server.id]);
 const started=await request('/api/codex-account',{action:'connect'},b.cookie);assert.equal(started.status,200);
 const job=started.data.job,row=app.db.prepare('SELECT owner,device,action,payload FROM jobs WHERE id=?').get(job);
 assert.deepEqual({...row,payload:JSON.parse(row.payload)},{owner:bId,device:server.id,action:'codex-account',payload:{mode:'login'}});
 assert.equal((await request('/api/codex-account',{action:'check'},b.cookie)).status,409,'one step at a time');

 // The worker takes it, reports the sign-in link and code.
 const polled=(await request('/api/runner/poll',{},null,server.token)).data.job;
 assert.equal(polled.id,job);assert.equal(polled.owner,bId);
 assert.equal((await request('/api/runner/report',{id:job,lease:polled.lease,heartbeat:true,events:[{seq:1,type:'session',text:JSON.stringify({url:'https://auth.openai.com/codex/device',code:'ABCD-12345'})}]},null,server.token)).status,200);
 const mine=(await request('/api/codex-account',null,b.cookie)).data;
 assert.deepEqual(mine.pending.login,{url:'https://auth.openai.com/codex/device',code:'ABCD-12345'});

 // A (owner of the worker and of the project) sees nothing of it.
 const theirs=(await request('/api/codex-account',null,a.cookie)).data;
 assert.equal(theirs.pending,null);assert.equal(theirs.connected,false);
 assert.equal((await request('/api/development/job?id='+job,null,a.cookie)).status,403);
 assert.equal((await request('/api/development/events?job='+job,null,a.cookie)).status,403);
 assert.equal((await request('/api/development/events?job='+job,null,b.cookie)).status,200);

 assert.equal((await request('/api/runner/report',{id:job,lease:polled.lease,ok:true,result:{connected:true}},null,server.token)).status,200);
 assert.equal((await request('/api/codex-account',null,b.cookie)).data.connected,true);
 assert.equal((await request('/api/codex-account',null,a.cookie)).data.connected,false,'B\'s connection is not A\'s');

 // A viewer has no place to connect.
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:bId,roles:['viewer']},a.cookie)).status,200);
 assert.deepEqual((await request('/api/codex-account',null,b.cookie)).data.places,[]);
 assert.equal((await request('/api/codex-account',{action:'check'},b.cookie)).status,409);
});

test('launcher: a code run binds exactly the member\'s sign-in and one job copy; the command and the place are fixed',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'codex-exec-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const calls=[],prepared=[];
 const run=(file,args)=>{calls.push(args);return spawn(process.execPath,['-e','process.stdout.write(JSON.stringify({type:"turn.started"})+"\\n")'],{stdio:['ignore','pipe','pipe']});};
 const {url,codexRoot}=await launcher(t,{root,run,prepare:async d=>{prepared.push(d);}});
 const copy=path.join(root,'worktrees','p-1');mkdirSync(copy,{recursive:true});mkdirSync(path.join(codexRoot,MARCO));
 assert.equal((await post(url,{member:MARCO,mode:'exec',dir:'/etc',prompt:'x'})).status,403,'only a copy in the job area');
 assert.equal((await post(url,{member:MARCO,mode:'exec',dir:copy,prompt:''})).status,400);
 assert.equal((await post(url,{member:MARCO,mode:'exec',dir:copy,prompt:'x'.repeat(16001)})).status,400);
 assert.equal((await post(url,{member:MARKUS,mode:'exec',dir:copy,prompt:'x'})).status,409,'Markus has not signed in');
 const r=await post(url,{member:MARCO,mode:'exec',dir:copy,prompt:'Ändere die Überschrift.',argv:['/bin/sh']});assert.equal(r.status,200);await r.text();
 const args=calls.at(-1),real=realpathSync(copy),home=path.join(codexRoot,MARCO);
 assert.deepEqual(args.slice(args.indexOf('--')+1),['/fixture/codex','exec','-c','forced_login_method="chatgpt"','-c','approval_policy="never"','-c','sandbox_mode="danger-full-access"','--skip-git-repo-check','--json','-C',real,'Ändere die Überschrift.']);
 assert.ok(args.includes(`BindPaths=${home} ${real}`)&&args.includes(`ReadWritePaths=${home} ${real}`));
 assert.ok(args.includes('CODEX_HOME='+home)&&args.includes('--working-directory='+real));
 assert.ok(args.includes('IPAddressAllow=127.0.0.60/32'),'network only through the egress proxy');
 assert.ok(!args.join(' ').includes(MARKUS));
 assert.ok(prepared.length&&prepared.every(d=>d===real),'only the copy is prepared, never the sign-in folder');
});
