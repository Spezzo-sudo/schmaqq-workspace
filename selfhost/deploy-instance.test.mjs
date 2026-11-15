// Staging and production must never touch each other's service, data, locks or worker.
// Runs the real deploy script: `config` for resolved settings, and `live` against stubs
// (logging systemctl, local health server, temporary folders). Nothing outside a temp folder is changed
// except two lock files under /run named after the stubbed service.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,symlinkSync,chmodSync,existsSync,accessSync,constants} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';

const script=path.join(path.dirname(fileURLToPath(import.meta.url)),'deploy','studio-deploy.sh');
const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('STUDIO_')));
const run=(args,env={})=>spawnSync('bash',[script,...args],{env:{...clean,...env},encoding:'utf8'});
const config=env=>{const r=run(['config'],env);assert.equal(r.status,0,r.stdout+r.stderr);return Object.fromEntries(r.stdout.trim().split('\n').map(l=>[l.slice(0,l.indexOf('=')),l.slice(l.indexOf('=')+1)]));};
const staging={STUDIO_INSTANCE:'staging',STUDIO_PUBLIC_URL:'https://staging.example.invalid',STUDIO_SOURCE_BRANCH:'feat/studio-messenger-r3-20261115'};

test('without STUDIO_INSTANCE the production settings are exactly the previous defaults',()=>{
 assert.deepEqual(config({}),{
  INSTANCE:'production',SERVICE:'schmaqq-studio',SOURCE_BRANCH:'main',BASE:'/opt/schmaqq-studio',DATA:'/var/lib/schmaqq-studio',
  ENV_FILE:'/etc/schmaqq-studio.env',CACHE:'/var/cache/schmaqq-studio-build',STATE:'/root/.schmaqq-deploy',PUBLIC:'https://studio.schmaqq.com',
  LOCAL:'http://127.0.0.1:4310',SERVICE_USER:'schmaqq-studio',PROBE_PORT:'4390',PROBE_PREVIEW_PORT:'4391',
  LOCK_DEPLOY:'/run/schmaqq-studio-deploy.lock',LOCK_SWITCH:'/run/schmaqq-studio-switch.lock',WORKER:'managed'});
 assert.notEqual(run(['config'],{STUDIO_SOURCE_BRANCH:'feat/x'}).status,0,'production only deploys main');
});

test('staging resolves to its own service, data, user, locks and ports and leaves the worker alone',()=>{
 const c=config(staging);
 assert.equal(c.SERVICE,'schmaqq-studio-staging');assert.equal(c.SOURCE_BRANCH,'feat/studio-messenger-r3-20261115');
 assert.equal(c.DATA,'/var/lib/schmaqq-studio-staging');assert.equal(c.SERVICE_USER,'schmaqq-studio-staging');
 assert.equal(c.LOCAL,'http://127.0.0.1:4330');assert.equal(c.PROBE_PORT,'4392');assert.equal(c.WORKER,'untouched');
 assert.equal(c.LOCK_SWITCH,'/run/schmaqq-studio-staging-switch.lock');
});

test('staging refuses missing settings and anything shared with production',()=>{
 const refused=(env,why)=>{const r=run(['config'],{...staging,...env});assert.notEqual(r.status,0,why);return r.stdout;};
 refused({STUDIO_PUBLIC_URL:''},'no own address');
 refused({STUDIO_SOURCE_BRANCH:''},'no branch');
 refused({STUDIO_SOURCE_BRANCH:'feat/../main'},'path tricks in branch');
 refused({STUDIO_SOURCE_BRANCH:'-x'},'option-like branch');
 refused({STUDIO_DATA:'/var/lib/schmaqq-studio'},'production data');
 refused({STUDIO_DATA:'/var/lib/schmaqq-studio/'},'production data with slash');
 assert.match(refused({STUDIO_DATA:'/var/lib/schmaqq-studio/staging'},'inside production data'),/DATA/);
 refused({STUDIO_BASE:'/opt/schmaqq-studio'},'production releases');
 refused({STUDIO_ENV_FILE:'/etc/schmaqq-studio.env'},'production secrets');
 refused({STUDIO_USER:'schmaqq-studio'},'production user');
 refused({STUDIO_PUBLIC_URL:'https://studio.schmaqq.com/'},'production address');
 refused({STUDIO_LOCAL_URL:'http://127.0.0.1:4310'},'production port');
 refused({STUDIO_INSTANCE:'prod'},'unknown instance');
});

const canLock=(()=>{try{accessSync('/run',constants.W_OK);return spawnSync('bash',['-c','command -v flock runuser curl']).status===0;}catch{return false;}})();

async function liveRun(env){
 const root=mkdtempSync(path.join(tmpdir(),'deploy-instance-')),sha='a'.repeat(40),base=path.join(root,'base'),state=path.join(root,'state');
 const alt=path.join(base,'releases','b'.repeat(40)),neu=path.join(base,'releases',sha);
 mkdirSync(alt,{recursive:true});mkdirSync(neu,{recursive:true});mkdirSync(state);symlinkSync(alt,path.join(base,'current'));
 writeFileSync(path.join(state,`prepared-${sha}.env`),`ALT=${alt}\nBACKUP=${root}/backup.sqlite\nWORKER=yes\nARCHIVE_SHA=x\n`);
 // A process whose working directory is the new release stands in for the restarted service.
 const fake=spawn('sleep',['30'],{cwd:neu,stdio:'ignore'});
 const log=path.join(root,'systemctl.log'),stub=path.join(root,'systemctl');
 writeFileSync(stub,`#!/bin/sh\necho "$*" >> '${log}'\ncase "$1 $2" in "show -p") [ "$3" = MainPID ] && echo ${fake.pid} || echo 0;; "is-active "*) echo active;; esac\n`);chmodSync(stub,0o755);
 const server=http.createServer((q,s)=>{s.setHeader('content-type','application/json');s.end(q.url==='/healthz'?'{"ok":true}':'{}');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const out=await new Promise(resolve=>{const c=spawn('bash',[script,'live',sha],{env:{...clean,...env,STUDIO_BASE:base,STUDIO_DEPLOY_STATE:state,STUDIO_DATA:path.join(root,'data'),
  STUDIO_SYSTEMCTL:stub,STUDIO_LOCAL_URL:url,STUDIO_PUBLIC_URL:url,STUDIO_WORKER_LIB:path.join(root,'worker')}});let o='';c.stdout.on('data',d=>o+=d);c.stderr.on('data',d=>o+=d);c.on('close',code=>resolve({code,o}));});
 fake.kill();server.close();
 return {...out,calls:existsSync(log)?readFileSync(log,'utf8').trim().split('\n'):[]};
}

test('live on staging restarts only the staging service and never the worker',{skip:!canLock&&'needs root-writable /run, flock, runuser and curl'},async()=>{
 const r=await liveRun({...staging,STUDIO_USER:'nobody'});
 assert.match(r.o,/RESULT=PASS/,r.o);
 assert.ok(r.calls.includes('restart schmaqq-studio-staging'),r.calls.join('\n'));
 for(const call of r.calls)assert.match(call,/schmaqq-studio-staging$/,'unexpected systemctl call: '+call);
 assert.match(r.o,/WORKER=unverändert/);assert.match(r.o,/WORKER_SERVICE=nicht verwendet/);
});

test('live on production keeps addressing the production service',{skip:!canLock&&'needs root-writable /run, flock, runuser and curl'},async()=>{
 // WORKER=yes in the prepared state would install the worker; the stub release has no installer, so this
 // run stops there on purpose, after proving the production service (not staging) was switched.
 const r=await liveRun({});
 assert.ok(r.calls.includes('restart schmaqq-studio'),r.calls.join('\n'));
 assert.ok(!r.calls.some(c=>c.includes('staging')),r.calls.join('\n'));
 assert.match(r.o,/SWITCH=PASS/,r.o);
});
