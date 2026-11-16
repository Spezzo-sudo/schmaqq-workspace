import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

// The real SQLite/HTTP server is used. The port belongs to the test process (listen(0)).
test('R4: unread counts follow per-chat read positions, not polling or member presence',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-r4-'));
 const origin='http://127.0.0.1:44891';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44892'});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{app.server.closeAllConnections?.();await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const host='http://127.0.0.1:'+app.server.address().port;
 const post=async(body,cookie,route='/api/room')=>{
  const r=await fetch(host+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 const get=async(route,cookie)=>{const r=await fetch(host+route,{headers:cookie?{Cookie:cookie}:{}});return {status:r.status,data:await r.json()};};
 const people=[];
 for(const [i,name] of ['Owner','Kollegin'].entries()){
  const email='r4-'+i+'@fixture.invalid';
  const response=await post({invite:createInvite(app.db,email,i===0?'owner':'member'),name,password:'local-fixture-password-2026'},null,'/api/auth/register');
  assert.equal(response.status,200);people.push({id:app.db.prepare('SELECT id FROM members WHERE email=?').get(email).id,cookie:response.cookie});
 }
 const [owner,other]=people;
 const created=await post({action:'create',id:'r4-create',title:'R4 Probe',description:''},owner.cookie);
 assert.equal(created.status,200);const project=created.data.project;
 const send=async(id,body,extra={})=>post({action:'message',id,project,body,...extra},owner.cookie);
 assert.equal((await send('r4-first','Ältere Nachricht')).status,200);

 // First deployment must not flag all historical messages as unread.
 let state=await get('/api/room?project='+project,other.cookie);
 assert.equal(state.status,200);assert.equal(state.data.unread.all,0);
 assert.equal((await get('/api/rooms',other.cookie)).data.rooms.find(r=>r.id===project).unread,0);

 const mark=async(view,messageId)=>post({action:'read',project,view,...(messageId?{messageId}:{})},other.cookie);
 assert.equal((await mark('all','r4-first')).status,200);
 assert.equal((await send('r4-second','Bitte prüfen')).status,200);
 // GET /api/room and /api/rooms update members.seen but MUST NOT mark any message read.
 await get('/api/rooms',other.cookie);await get('/api/room?project='+project,other.cookie);
 state=await get('/api/room?project='+project,other.cookie);
 assert.equal(state.data.unread.all,1);
 const home=(await get('/api/rooms',other.cookie)).data.rooms.find(r=>r.id===project);
 assert.equal(home.unread,1);assert.equal(home.lastExcerpt,'Bitte prüfen');
 assert.equal((await get('/api/rooms',owner.cookie)).data.rooms.find(r=>r.id===project).unread,0);
 assert.equal((await mark('all','r4-second')).status,200);
 assert.equal((await get('/api/room?project='+project,other.cookie)).data.unread.all,0);

 const agent=(await post({action:'agent',id:'r4-agent',project,name:'Mara',role:'frontend',avatar:'MA',model:'gpt-5-codex',purpose:'Test'},owner.cookie));
 assert.equal(agent.status,200);const agentId=agent.data.agentId;
 assert.equal((await send('r4-agent-1','Hallo Mara',{recipient:agentId})).status,200);
 // A member-view and an agent-view are two projections of the same *project-visible* messages.
 assert.equal((await mark('agent:'+agentId,'r4-agent-1')).status,200);
 assert.equal((await mark('member:'+owner.id,'r4-agent-1')).status,200);
 assert.equal((await send('r4-agent-2','Mara, bitte prüfen',{recipient:agentId})).status,200);
 state=await get('/api/room?project='+project,other.cookie);
 assert.equal(state.data.unread['agent:'+agentId],1);
 assert.equal(state.data.unread['member:'+owner.id],1);
 assert.equal(state.data.unread.all,2);
 assert.equal((await mark('agent:'+agentId,'r4-agent-2')).status,200);
 assert.equal((await get('/api/room?project='+project,other.cookie)).data.unread['agent:'+agentId],0);
 // An older receipt may not move the read cursor backwards.
 assert.equal((await mark('agent:'+agentId,'r4-agent-1')).status,200);
 assert.equal((await get('/api/room?project='+project,other.cookie)).data.unread['agent:'+agentId],0);

 assert.equal((await mark('agent:unknown','r4-agent-2')).status,400);
 assert.equal((await mark('agent:'+agentId,'r4-second')).status,400);
 assert.equal((await post({action:'read',project:'not-authorized',view:'all'},other.cookie)).status,403);
 const stored=app.db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('room:v1:read:'+project+':'+other.id+':agent:'+agentId);
 assert.equal(JSON.parse(stored.value).id,'r4-agent-2');
});
