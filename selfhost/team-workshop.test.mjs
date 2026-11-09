import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {storeMetadata,metadata} from './team-model.mjs';

const capabilities=(kind,projects)=>({models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled',host:{kind,os:'linux',arch:'x64',node:'v24.22.0',cpus:2,memoryMb:2048},development:projects.map(id=>({id,setupVersion:1,check:true,preview:true,allowCodex:false,publish:true}))});

test('team workshop: developers of a project work on the admin\'s server worker, viewers and PCs stay private',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-team-workshop-')),origin='http://127.0.0.1:44593';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44594'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const a=await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'A',password:'fixture-password-1234'});
 const b=await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'B',password:'fixture-password-1234'});
 const bId=app.db.prepare("SELECT id FROM members WHERE email='b@fixture.invalid'").get().id;
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Team',description:''},a.cookie)).data.project;
 const server=(await request('/api/development',{action:'device',name:'VPS-Worker'},a.cookie)).data;
 const pc=(await request('/api/development',{action:'device',name:'A-PC'},a.cookie)).data;
 assert.equal((await request('/api/runner/capabilities',capabilities('server',[project]),null,server.token)).status,200);
 assert.equal((await request('/api/runner/capabilities',capabilities('pc',[project]),null,pc.token)).status,200);
 for(const d of [server,pc])await request('/api/runner/poll',{},null,d.token);
 const job=(cookie,device)=>request('/api/development',{action:'job',device,project,operation:'inspect'},cookie);

 // B develops in A's project: the server worker is the team workshop, A's PC stays private.
 const ai=(await request('/api/ai',null,b.cookie)).data.resources;
 const team=ai.find(r=>r.device===server.id);
 assert.ok(team?.team,'the server worker appears as team workshop');assert.deepEqual(team.development.map(p=>p.id),[project]);
 assert.ok(!ai.some(r=>r.device===pc.id),'PCs are never shared');
 assert.deepEqual((await request('/api/development',null,b.cookie)).data.teamDevices,{[server.id]:[project]});
 const run=await job(b.cookie,server.id);assert.equal(run.status,200);
 assert.equal(app.db.prepare('SELECT owner FROM jobs WHERE id=?').get(run.data.id).owner,bId,'the work belongs to B, not to the device owner');
 assert.equal((await job(b.cookie,pc.id)).status,403);

 // A viewer in the project cannot use it.
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:bId,roles:['viewer']},a.cookie)).status,200);
 assert.equal((await job(b.cookie,server.id)).status,403);
 assert.deepEqual((await request('/api/development',null,b.cookie)).data.teamDevices,{});

 // The project admin can switch the team workshop off.
 await request('/api/project-roles',{action:'roles',project,member:bId,roles:['developer']},a.cookie);
 assert.equal((await job(b.cookie,server.id)).status,200);
 storeMetadata(app.db,'room:v1:project:'+project,{...metadata(app.db,'room:v1:project:'+project),teamWorkshop:false});
 assert.equal((await job(b.cookie,server.id)).status,403);
});
