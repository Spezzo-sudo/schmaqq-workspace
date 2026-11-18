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
 const created=await post({action:'create',id:'r4-create',title:'R4 Probe',description:'',members:[other.id]},owner.cookie);
 assert.equal(created.status,200);const project=created.data.project;
 const send=async(id,body,extra={})=>post({action:'message',id,project,body,...extra},owner.cookie);
 assert.equal((await send('r4-first','Ältere Nachricht')).status,200);

 // First deployment must not flag all historical messages as unread.
 let state=await get('/api/room?project='+project,other.cookie);
 assert.equal(state.status,200);assert.equal(state.data.unread.all,0);
 assert.equal((await get('/api/rooms',other.cookie)).data.rooms.find(r=>r.id===project).unread,0);
 const baseline=app.db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('room:v1:read-baseline:global');
 assert.ok(baseline,'initial R4 access fixes the installation-wide unread baseline');

 const mark=async(view,messageId)=>post({action:'read',project,view,...(messageId?{messageId}:{})},other.cookie);
 assert.equal((await mark('all','r4-first')).status,200);
 assert.equal((await send('r4-second','Bitte prüfen')).status,200);
 // Same-millisecond messages still have a strict SQLite insertion order.
 app.db.prepare('UPDATE messages SET created=(SELECT created FROM messages WHERE id=?) WHERE id=?').run('r4-first','r4-second');
 // GET /api/room and /api/rooms update members.seen but MUST NOT mark any message read.
 await get('/api/rooms',other.cookie);await get('/api/room?project='+project,other.cookie);
 state=await get('/api/room?project='+project,other.cookie);
 assert.equal(state.data.unread.all,1);
 const home=(await get('/api/rooms',other.cookie)).data.rooms.find(r=>r.id===project);
 assert.equal(home.unread,1);assert.equal(home.lastExcerpt,'Bitte prüfen');
 assert.equal((await get('/api/rooms',owner.cookie)).data.rooms.find(r=>r.id===project).unread,0);
 // A brand new project after initial activation has unread messages even for members
 // who have never visited the project, instead of getting a misleading zero.
 const late=await post({action:'create',id:'r4-later-project',title:'Spätere Gruppe',description:'',members:[other.id]},owner.cookie);
 assert.equal(late.status,200);
 assert.equal((await post({action:'message',id:'r4-late-message',project:late.data.project,body:'Neue Projektinfo'},owner.cookie)).status,200);
 assert.equal((await get('/api/rooms',other.cookie)).data.rooms.find(r=>r.id===late.data.project).unread,1);
 assert.equal((await mark('all','r4-second')).status,200);
 assert.equal((await get('/api/room?project='+project,other.cookie)).data.unread.all,0);

 const agent=(await post({action:'agent',id:'r4-agent',project,name:'Mara',role:'frontend',avatar:'MA',model:'gpt-5-codex',purpose:'Test'},owner.cookie));
 assert.equal(agent.status,200);const agentId=agent.data.agentId;
 // The owner's chat with an agent is private: the other member neither counts nor sees it.
 assert.equal((await send('r4-agent-1','Hallo Mara',{recipient:agentId,direct:true})).status,200);
 state=await get('/api/room?project='+project,other.cookie);
 assert.equal(state.data.unread['agent:'+agentId],0);assert.equal(state.data.unread.all,0);
 assert.ok(!state.data.messages.some(m=>m.id==='r4-agent-1'),'a private chat is not delivered to others');
 assert.equal((await get('/api/rooms',other.cookie)).data.rooms.find(r=>r.id===project).lastExcerpt,'Bitte prüfen','private text never shows in the project preview');
 assert.equal((await get('/api/room?project='+project,owner.cookie)).data.messages.find(m=>m.id==='r4-agent-1').scope,'agent:'+agentId);
 assert.equal((await mark('agent:'+agentId,'r4-agent-1')).status,400,'nobody marks a message they cannot read');
 // Addressing an agent in the group chat stays in the group.
 assert.equal((await send('r4-group-1','@Mara bitte prüfen')).status,200);
 state=await get('/api/room?project='+project,other.cookie);
 const mention=state.data.messages.find(m=>m.id==='r4-group-1');
 assert.deepEqual([mention.scope,mention.recipient,state.data.unread.all],['group',agentId,1]);
 // A direct message between two people counts only in that chat.
 assert.equal((await send('r4-dm-1','Nur für dich',{recipient:other.id,direct:true})).status,200);
 assert.equal((await send('r4-dm-2','Noch etwas',{recipient:other.id,direct:true})).status,200);
 state=await get('/api/room?project='+project,other.cookie);
 assert.equal(state.data.unread['member:'+owner.id],2);assert.equal(state.data.unread.all,1);
 assert.equal(state.data.messages.find(m=>m.id==='r4-dm-1').scope,'member:'+owner.id);
 assert.equal((await mark('member:'+owner.id,'r4-dm-2')).status,200);
 assert.equal((await get('/api/room?project='+project,other.cookie)).data.unread['member:'+owner.id],0);
 // An older receipt may not move the read cursor backwards.
 assert.equal((await mark('member:'+owner.id,'r4-dm-1')).status,200);
 assert.equal((await get('/api/room?project='+project,other.cookie)).data.unread['member:'+owner.id],0);

 assert.equal((await mark('agent:unknown','r4-dm-2')).status,400);
 assert.equal((await mark('all','r4-dm-2')).status,400,'a receipt must name the conversation the message is in');
 assert.equal((await post({action:'read',project:'not-authorized',view:'all'},other.cookie)).status,404,'unknown or inaccessible projects are not disclosed');
 const stored=app.db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('room:v1:read:'+project+':'+other.id+':member:'+owner.id);
 assert.equal(JSON.parse(stored.value).sequence,app.db.prepare('SELECT rowid AS n FROM messages WHERE id=?').get('r4-dm-2').n);
});
