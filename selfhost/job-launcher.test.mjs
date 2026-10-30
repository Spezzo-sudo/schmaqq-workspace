import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,symlinkSync} from 'node:fs';
import {spawn} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {createJobLauncher,checkJobDirectory,checkArgv,jobUnitArgs} from './deploy/worker/job-launcher.mjs';
import {launcherCommand,launcherPrograms} from './job-client.mjs';
import {LocalRunner} from './runner.mjs';

const KEY='k'.repeat(48);

test('launcher accepts only direct children of the job area and resolves programs itself',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'launcher-root-')),outside=mkdtempSync(path.join(os.tmpdir(),'launcher-outside-'));
 try{
  mkdirSync(path.join(root,'project-copy'));mkdirSync(path.join(root,'project-copy','nested'));
  symlinkSync(outside,path.join(root,'escape'),process.platform==='win32'?'junction':'dir');
  assert.ok(checkJobDirectory(root,path.join(root,'project-copy')));
  for(const dir of [path.join(root,'project-copy','nested'),outside,path.join(root,'escape'),root,'relative/dir',path.join(root,'missing')])
   assert.throws(()=>checkJobDirectory(root,dir),undefined,dir);
  const exists=p=>p.replaceAll('\\','/').endsWith('/node/bin/node');
  assert.equal(checkArgv(['node','--test'],exists)[0],'/usr/local/lib/schmaqq-worker/node/bin/node');
  assert.throws(()=>checkArgv(['missing-program'],()=>false));
  assert.throws(()=>checkArgv(['../node'],exists));
  assert.throws(()=>checkArgv([]));
 }finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});

test('job unit runs as the job user and sees only its own copy',()=>{
 const args=jobUnitArgs({unit:'schmaqq-job-x',dir:'/var/lib/schmaqq-worker/state/worktrees/p-1',argv:['/usr/bin/true'],timeoutMs:600000});
 const props=args.filter((a,i)=>args[i-1]==='-p');
 assert.ok(props.includes('User=schmaqq-job')&&props.includes('Group=schmaqq-jobs'));
 const tmpfs=props.find(p=>p.startsWith('TemporaryFileSystem=')).split(/[= ]/);
 for(const hidden of ['/var/lib:ro','/etc/schmaqq-worker:ro','/run:ro','/opt:ro'])assert.ok(tmpfs.includes(hidden),hidden);
 assert.ok(props.includes('BindPaths=/var/lib/schmaqq-worker/state/worktrees/p-1'));
 assert.ok(props.includes('IPAddressDeny=any')&&props.includes('IPAddressAllow=127.0.0.60/32'),'Only the egress proxy');
 assert.ok(props.includes('RestrictAddressFamilies=AF_INET AF_INET6'),'No unix sockets');
 assert.ok(props.includes('RuntimeMaxSec=600')&&props.includes('MemoryMax=2G'));
 assert.ok(props.includes('NoNewPrivileges=yes')&&props.includes('CapabilityBoundingSet='));
 assert.deepEqual(args.slice(-2),['--','/usr/bin/true']);
});

async function startLauncher(t,{root,run,stop=()=>{},prepare=async()=>{}}){
 const server=createJobLauncher({root,key:KEY,run,prepare,stop,log:()=>{}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 return 'http://127.0.0.1:'+server.address().port;
}
// Stand-in for systemd-run: runs the requested program directly on this machine.
const localRun=(file,args)=>{const argv=args.slice(args.indexOf('--')+1);return spawn(process.execPath,argv.slice(1),{stdio:['ignore','pipe','pipe']});};

test('launcher program discovery is authenticated, bounded, and starts no job',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'launcher-probe-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const keyFile=path.join(root,'key');writeFileSync(keyFile,KEY);
 const url=await startLauncher(t,{root,run:()=>assert.fail('Presence lookup must not execute code')});
 const post=(programs,auth='Bearer '+KEY)=>fetch(url+'/programs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify({programs})});
 assert.equal((await post(['node'],'wrong')).status,401);
 for(const invalid of [['../script'],['/tmp/script'],Array(31).fill('node'),null])assert.equal((await post(invalid)).status,400);
 const tools=await launcherPrograms({url,keyFile},['studio-test-absent-program']);
 assert.deepEqual(tools,[{program:'studio-test-absent-program',available:false}]);
});

test('launcher authenticates, streams output, reports failures and stops jobs whose caller left',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'launcher-api-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const copy=path.join(root,'copy');mkdirSync(copy);const keyFile=path.join(root,'..',path.basename(root)+'.key');writeFileSync(keyFile,KEY);t.after(()=>rmSync(keyFile,{force:true}));
 const stopped=[];const url=await startLauncher(t,{root,run:localRun,stop:u=>stopped.push(u)});
 const post=(body,auth='Bearer '+KEY)=>fetch(url+'/run',{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:JSON.stringify(body)});
 assert.equal((await post({dir:copy,argv:[process.execPath,'-e','1']},'Bearer wrong')).status,401);
 assert.equal((await post({dir:root,argv:[process.execPath,'-e','1']})).status,403,'The job area itself is not a copy');
 const out=await launcherCommand({url,keyFile},[process.execPath,'-e','console.log("pass 1")'],copy,{timeout:20000});
 assert.equal(out,'pass 1');
 await assert.rejects(launcherCommand({url,keyFile},[process.execPath,'-e','console.log("broken");process.exit(3)'],copy,{timeout:20000}),/Befehl fehlgeschlagen \(3\)\. broken/);
 const controller=new AbortController();
 const pending=launcherCommand({url,keyFile},[process.execPath,'-e','setTimeout(()=>{},5000)'],copy,{timeout:20000,signal:controller.signal});
 setTimeout(()=>controller.abort(),300);
 await assert.rejects(pending,{name:'AbortError'});
 await new Promise(r=>setTimeout(r,200));assert.equal(stopped.length,1,'The launcher stops the job unit when the caller leaves');
 assert.throws(()=>launcherCommand({url:'http://example.com:3129',keyFile},['node'],copy),/local address/);
});

test('launcher restores group access after a job, also when it fails, before reporting the end',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'launcher-settle-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const copy=path.join(root,'copy');mkdirSync(copy);const keyFile=path.join(root,'..',path.basename(root)+'.key');writeFileSync(keyFile,KEY);t.after(()=>rmSync(keyFile,{force:true}));
 const calls=[];const url=await startLauncher(t,{root,run:localRun,prepare:async dir=>{calls.push(dir);}});
 assert.equal(await launcherCommand({url,keyFile},[process.execPath,'-e','console.log("built")'],copy,{timeout:20000}),'built');
 assert.deepEqual(calls,[copy,copy],'Before and after the job');
 await assert.rejects(launcherCommand({url,keyFile},[process.execPath,'-e','process.exit(2)'],copy,{timeout:20000}),/Befehl fehlgeschlagen \(2\)/);
 assert.equal(calls.length,4,'A failed job is settled too');
});

test('launcher starts one live preview at a time, waits for its port and reports failures with logs',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'launcher-serve-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const copy=path.join(root,'copy');mkdirSync(copy);
 const stopped=[],started=[];let ready=true;
 const fakeRun=(file,args)=>{started.push(args.find(a=>a.startsWith('--unit=')));const c=spawn(process.execPath,['-e','0'],{stdio:['ignore','pipe','pipe']});return c;};
 const server=createJobLauncher({root,key:KEY,run:fakeRun,prepare:async()=>{},stop:u=>stopped.push(u),stopAllLive:async()=>stopped.push('all live units'),isActive:async()=>true,logs:async()=>'Error: Cannot find module server.mjs',waitPort:async()=>ready,log:()=>{}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const serve=body=>fetch('http://127.0.0.1:'+server.address().port+'/serve',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+KEY},body:JSON.stringify(body)});
 const first=await serve({dir:copy,argv:[process.execPath,'server.mjs'],port:3000});
 assert.equal(first.status,200);const live=await first.json();assert.equal(live.host,'127.0.0.70');assert.equal(live.port,3000);
 assert.equal((await serve({dir:copy,argv:[process.execPath,'server.mjs'],port:80})).status,400,'Only unprivileged ports');
 ready=false;
 const broken=await serve({dir:copy,argv:[process.execPath,'server.mjs'],port:3001});
 assert.equal(broken.status,502);assert.match((await broken.json()).output,/Cannot find module/,'The person sees why the app did not start');
 // Each start first stops every live unit (also orphans from before a launcher restart); the failed one is stopped too.
 assert.deepEqual(stopped,['all live units','all live units',started[1].slice('--unit='.length)]);
});

test('a runner with a launcher sends project code there and keeps git local',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'launcher-runner-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const copy=path.join(root,'copy');mkdirSync(copy);const keyFile=path.join(os.tmpdir(),path.basename(root)+'.key');writeFileSync(keyFile,KEY);t.after(()=>rmSync(keyFile,{force:true}));
 let calls=0;const url=await startLauncher(t,{root,run:(file,args)=>{calls++;return localRun(file,args);}});
 const runner=new LocalRunner({stateDir:path.join(root,'state'),projects:{},launcher:{url,keyFile}});
 assert.equal(await runner.check(copy,{check:[process.execPath,'-e','console.log("ok")']}),'ok');
 assert.equal(calls,1,'Tests ran through the launcher');
 const pc=new LocalRunner({stateDir:path.join(root,'state-pc'),projects:{}});
 assert.equal(await pc.check(copy,{check:[process.execPath,'-e','console.log("local")']}),'local');assert.equal(calls,1,'A PC without launcher runs locally as before');
 runner.close();pc.close();
});

test('versioned preparation and tests both use the launcher and the same job copy',async t=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'launcher-project-plan-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const copy=path.join(root,'copy');mkdirSync(copy);const keyFile=path.join(root,'key');writeFileSync(keyFile,KEY);
 const {command}=await import('./process.mjs');
 for(const args of [['init','-b','main'],['config','user.name','Fixture'],['config','user.email','fixture@invalid.local']])await command(['git',...args],copy);
 writeFileSync(path.join(copy,'tracked.txt'),'original');await command(['git','add','.'],copy);await command(['git','commit','-m','fixture'],copy);
 const calls=[];
 const url=await startLauncher(t,{root,run:(file,args)=>{
  const argv=args.slice(args.indexOf('--')+1),cwd=args.find(a=>a.startsWith('--working-directory=')).slice('--working-directory='.length);
  calls.push({argv,cwd});return spawn(argv[0],argv.slice(1),{cwd,stdio:['ignore','pipe','pipe']});
 }});
 const runner=new LocalRunner({stateDir:path.join(root,'state'),projects:{},launcher:{url,keyFile}});t.after(()=>runner.close());
 const p={projectPlanVersion:1,requires:[],generated:['.prepared'],prepare:[[process.execPath,'-e',`require('fs').mkdirSync('.prepared',{recursive:true});require('fs').writeFileSync('.prepared/ready','yes')`]],check:[process.execPath,'-e',`if(require('fs').readFileSync('.prepared/ready','utf8')!=='yes')process.exit(1);console.log('isolated sequence')`]};
 assert.equal(await runner.check(copy,p),'isolated sequence');assert.equal(calls.length,2);assert.ok(calls.every(c=>c.cwd===copy));
 assert.equal(await command(['git','status','--porcelain'],copy),'');
});
