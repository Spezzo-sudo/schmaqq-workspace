import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {hostInfo} from './local-ai.mjs';

const capabilities=(kind,projects)=>({models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled',host:{kind,os:'linux',arch:'x64',node:'v24.22.0',cpus:2,memoryMb:2048,label:kind==='server'?'VPS':undefined},development:projects.map(id=>({id,setupVersion:1,check:true,preview:false,allowCodex:false,publish:false}))});

test('placement v1 follows the project rule, prefers reachable servers and never crosses the own-device boundary',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-placement-')),origin='http://127.0.0.1:44583',app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44584'});
 await new Promise(r=>app.server.listen(44583,'127.0.0.1',r));
 const request=async(route,value,cookie,token)=>{const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  const a=await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'A',password:'fixture-password-1234'});
  const b=await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'B',password:'fixture-password-1234'});
  const pc=(await request('/api/development',{action:'device',name:'Laptop'},a.cookie)).data;
  const server=(await request('/api/development',{action:'device',name:'VPS-Worker'},a.cookie)).data;
  const foreign=(await request('/api/development',{action:'device',name:'B-PC'},b.cookie)).data;
  assert.equal((await request('/api/runner/capabilities',capabilities('pc',['website']),null,pc.token)).status,200);
  assert.equal((await request('/api/runner/capabilities',capabilities('server',['website']),null,server.token)).status,200);
  assert.equal((await request('/api/runner/capabilities',capabilities('server',['website']),null,foreign.token)).status,200);
  assert.equal((await request('/api/runner/capabilities',{...capabilities('server',[]),host:{kind:'root'}},null,server.token)).status,400,'Unknown executor kinds are rejected');
  for(const d of [pc,server,foreign])await request('/api/runner/poll',{},null,d.token);

  let view=(await request('/api/executors?project=website',null,a.cookie)).data;
  assert.equal(view.mode,'auto');assert.equal(view.canEdit,true);assert.equal(view.executors.length,2,'Only own executors are listed');
  assert.equal(view.recommendation.device,server.id);assert.match(view.recommendation.reason,/VPS-Worker \(Server\)/);
  assert.equal(view.executors.find(e=>e.id===server.id).host.memoryMb,2048);

  const first=await request('/api/development',{action:'job',device:'auto',project:'website',operation:'inspect'},a.cookie);
  assert.equal(first.status,200);assert.equal(first.data.device,server.id);assert.equal(first.data.placement.kind,'server');
  const stored=(await request('/api/development/job?id='+first.data.id,null,a.cookie)).data.job;
  assert.equal(stored.device,server.id);assert.match(stored.payload.placement.reason,/Server/);

  assert.equal((await request('/api/executors',{project:'website',mode:'pc'},b.cookie)).status,403,'Only the responsible person changes the rule');
  view=(await request('/api/executors',{project:'website',mode:'pc'},a.cookie)).data;assert.equal(view.mode,'pc');assert.equal(view.recommendation.device,pc.id);
  assert.equal((await request('/api/development',{action:'job',device:'auto',project:'website',operation:'inspect'},a.cookie)).data.device,pc.id);
  const blocked=await request('/api/development',{action:'job',device:server.id,project:'website',operation:'inspect'},a.cookie);
  assert.equal(blocked.status,409,'An explicit choice cannot bypass the project rule');assert.match(blocked.data.error,/Nur eigener PC/);

  app.db.prepare('UPDATE devices SET seen=0 WHERE id=?').run(pc.id);
  const offline=await request('/api/development',{action:'job',device:'auto',project:'website',operation:'inspect'},a.cookie);
  assert.equal(offline.status,409,'No silent fallback to the server under a PC-only rule');assert.match(offline.data.error,/Laptop \(PC\)/);

  await request('/api/executors',{project:'website',mode:'server'},a.cookie);
  const prepared=await request('/api/development',{action:'job',device:'auto',project:'website',operation:'prepare',title:'Server-Kopie'},a.cookie);
  assert.equal(prepared.data.device,server.id);
  app.db.prepare("UPDATE jobs SET status='completed' WHERE device=?").run(server.id);
  const copies=(await request('/api/development/workspaces?project=website',null,a.cookie)).data.workspaces;
  assert.equal(copies.length,1);assert.equal(copies[0].id,prepared.data.id);assert.equal(copies[0].title,'Server-Kopie');assert.equal(copies[0].deviceKind,'server');
  assert.deepEqual((await request('/api/development/workspaces?project=website',null,b.cookie)).data.workspaces,[],'Copies of another member are not listed');
  assert.equal((await request('/api/development/workspaces?project=website')).status,401);
  const inCopy=await request('/api/development',{action:'job',device:'auto',project:'website',operation:'check',worktree:prepared.data.id},a.cookie);
  assert.equal(inCopy.status,200);assert.equal(inCopy.data.device,server.id);assert.match(inCopy.data.placement.reason,/Arbeitskopie/);

  assert.equal((await request('/api/development',{action:'job',device:server.id,project:'website',operation:'inspect'},b.cookie)).status,403,'Another member cannot use this server worker');
  assert.equal((await request('/api/development',{action:'job',device:'auto',project:'website',operation:'check',worktree:prepared.data.id},b.cookie)).status,403,'Another member cannot reach a copy through auto');
  assert.equal((await request('/api/development',{action:'job',device:'auto',project:'bewertungen',operation:'inspect'},a.cookie)).status,409,'Unconfigured projects are not placed');

  app.db.prepare('UPDATE devices SET seen=0').run();
  assert.equal((await request('/api/executors?project=website',null,a.cookie)).data.recommendation.error.includes('erreichbar'),true);
  const listed=(await request('/api/development',null,a.cookie)).data.devices;
  assert.equal(listed.find(d=>d.id===server.id).kind,'server');assert.equal(listed.find(d=>d.id===pc.id).kind,'pc');
 }finally{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});}
});

test('runner host facts are bounded, non-secret and default to a personal PC',()=>{
 const pc=hostInfo({}),server=hostInfo({kind:'server',label:' VPS ',cpus:1,repo:'/secret/path'});
 assert.equal(pc.kind,'pc');assert.equal(server.kind,'server');assert.equal(server.label,'VPS');assert.equal(server.cpus,1);
 assert.ok(server.memoryMb>0);assert.ok(!JSON.stringify(server).includes('/secret/path'));
});
