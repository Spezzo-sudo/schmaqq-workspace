import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {jobUnitArgs} from './deploy/worker/job-launcher.mjs';

test('live preview unit keeps the job sandbox and opens only the preview source',()=>{
 const args=jobUnitArgs({unit:'schmaqq-live-x',dir:'/var/lib/schmaqq-worker/state/worktrees/p-1',argv:['/usr/bin/node','server.mjs'],timeoutMs:1800000,serve:{port:3000}});
 const props=args.filter((a,i)=>args[i-1]==='-p'),env=args.filter((a,i)=>args[i-1]==='-E');
 assert.ok(!args.includes('--wait'),'A live preview keeps running');
 assert.ok(props.includes('User=schmaqq-job')&&props.includes('IPAddressDeny=any'));
 assert.ok(props.includes('IPAddressAllow=127.0.0.60/32 127.0.0.71/32'),'Only the proxy and the preview source');
 assert.ok(props.includes('RuntimeMaxSec=1800'),'Stops by itself');
 assert.ok(env.includes('HOST=127.0.0.70')&&env.includes('PORT=3000'));
});

test('a live preview from the server worker becomes a secret link that proxies to the running app',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-live-')),origin='http://127.0.0.1:44601',previewOrigin='http://127.0.0.1:44602';
 // Stand-in for the isolated app on the live address.
 const app=http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/plain'});res.end(`app ${req.method} ${req.url} cookie=${req.headers.cookie??''}`);});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const studio=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin,seedProjects:true,liveHost:'127.0.0.1',liveSource:'127.0.0.1'});
 await new Promise(r=>studio.server.listen(44601,'127.0.0.1',r));await new Promise(r=>studio.previewServer.listen(44602,'127.0.0.1',r));
 t.after(async()=>{app.close();await new Promise(r=>studio.server.close(r));studio.previewServer.close();studio.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const owner=await request('/api/auth/register',{invite:createInvite(studio.db,'o@fixture.invalid','owner'),name:'O',password:'fixture-password-1234'});
 const host={models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled',development:[{id:'website',setupVersion:1,check:true,preview:true,allowCodex:false,publish:false}]};
 async function worker(kind){
  const d=(await request('/api/development',{action:'device',name:kind},owner.cookie)).data;
  await request('/api/runner/capabilities',{...host,host:{kind,os:'linux',arch:'x64',node:'v24',cpus:1,memoryMb:2048}},null,d.token);
  await request('/api/runner/poll',{},null,d.token);
  const prepared=(await request('/api/development',{action:'job',device:d.id,project:'website',operation:'prepare'},owner.cookie)).data;
  let job=(await request('/api/runner/poll',{},null,d.token)).data.job;await request('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result:{path:'x',branch:'studio/x',commit:'a'.repeat(40)}},null,d.token);
  const queued=(await request('/api/development',{action:'job',device:d.id,project:'website',operation:'preview',worktree:prepared.id},owner.cookie)).data;
  job=(await request('/api/runner/poll',{},null,d.token)).data.job;
  return {d,job,queued};
 }
 const server=await worker('server');
 const report=await request('/api/runner/report',{id:server.job.id,lease:server.job.lease,ok:true,result:{live:{port:app.address().port,expires:Date.now()+600000}}},null,server.d.token);
 assert.equal(report.status,200,JSON.stringify(report.data));
 const result=(await request('/api/development/job?id='+server.queued.id,null,owner.cookie)).data.job.result;
 assert.equal(result.scope,'live');assert.ok(result.url.startsWith(previewOrigin+'/'));
 const entry=await fetch(result.url+'dashboard?x=1',{redirect:'manual'});
 assert.equal(entry.status,302);assert.equal(entry.headers.get('location'),'/dashboard');
 const previewCookie=entry.headers.get('set-cookie').split(';')[0];assert.match(entry.headers.get('set-cookie'),/HttpOnly/);
 const page=await (await fetch(previewOrigin+'/api/items',{headers:{Cookie:previewCookie+'; app_session=abc'}})).text();
 assert.equal(page,'app GET /api/items cookie=app_session=abc','Absolute paths reach the app; the preview cookie is not forwarded');
 assert.equal((await fetch(previewOrigin+'/api/items')).status,404,'Without the secret link nothing is proxied');
 const pc=await worker('pc');
 assert.equal((await request('/api/runner/report',{id:pc.job.id,lease:pc.job.lease,ok:true,result:{live:{port:app.address().port,expires:Date.now()+600000}}},null,pc.d.token)).status,403,'Only the server worker may report a live preview');
});
