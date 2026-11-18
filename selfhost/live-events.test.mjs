import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {openStore,digest,passwordHash} from './store.mjs';

async function fixture(t){
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-live-'));
 const filename=path.join(dir,'studio.sqlite'),origin='http://127.0.0.1:49161';
 const db=openStore(filename,{seedProjects:false});
 const members=['Alice','Bob','Carol'].map(name=>({id:randomUUID(),name,session:randomBytes(32).toString('base64url')}));
 for(const m of members){
  db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(m.id,m.name,m.name.toLowerCase()+'@fixture.invalid',passwordHash('fixture-password'),m.name==='Alice'?'owner':'member',Date.now());
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(m.session),m.id,Date.now()+120000);
  m.cookie='studio_session='+m.session;
 }
 db.close();
 const worker={owner:members[0].id,token:randomBytes(32).toString('base64url')};
 const app=createStudioServer({filename,origin,previewOrigin:'http://127.0.0.1:49162',resetMailer:null,hermesWorkers:[worker]});
 await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
 const host='http://127.0.0.1:'+app.server.address().port,open=[];
 t.after(async()=>{for(const c of open)c.abort();app.live.close();await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const post=async(route,body,{cookie,token}={})=>{const r=await fetch(host+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 /** Open the live connection of one person and collect the signals it receives. */
 async function listen(member){
  const control=new AbortController();open.push(control);
  const response=await fetch(host+'/api/live',{headers:{Cookie:member.cookie},signal:control.signal});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);
  const seen=[],beats={n:0};seen.beats=beats;
  (async()=>{const decoder=new TextDecoder();let buffer='';try{for await(const chunk of response.body){buffer+=decoder.decode(chunk,{stream:true});let i;while((i=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,i);buffer=buffer.slice(i+2);if(block.startsWith('event: hb'))beats.n++;else if(block.startsWith('data: '))seen.push(JSON.parse(block.slice(6)));}}}catch{/* closed by the test */}})();
  return seen;
 }
 const settle=()=>new Promise(resolve=>setTimeout(resolve,120));
 return {app,members,worker,host,post,listen,settle};
}

test('live signals: group news reaches the project, private chats only their participants, nothing carries content',async t=>{
 const f=await fixture(t),[alice,bob,carol]=f.members;
 assert.equal((await fetch(f.host+'/api/live')).status,401,'the live connection needs a login');
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Live',description:'',members:[bob.id,carol.id]},{cookie:alice.cookie})).data.project;
 const [a,b,c]=await Promise.all([alice,bob,carol].map(f.listen));
 await f.settle();
 await f.post('/api/room',{action:'message',id:randomUUID(),project,body:'An alle'},{cookie:alice.cookie});
 await f.settle();
 assert.deepEqual([a.length,b.length,c.length],[1,1,1]);
 assert.deepEqual(a[0],{type:'room',project},'only where to look, never what was written');
 assert.ok(a.beats.n>=1,'a heartbeat arrives right after connecting, so the browser knows the line really works');
 await f.post('/api/room',{action:'message',id:randomUUID(),project,recipient:bob.id,direct:true,body:'Nur für Bob'},{cookie:alice.cookie});
 await f.settle();
 assert.deepEqual([a.length,b.length,c.length],[2,2,1],'the third person is not even told that something happened');
 await f.post('/api/room',{action:'read',project,view:'all'},{cookie:bob.cookie});
 await f.settle();
 assert.deepEqual([a.length,b.length,c.length],[2,2,1],'reading signals nobody');
});

test('live signals: every step of an agent run reaches only the person who asked; the answer follows its conversation',async t=>{
 const f=await fixture(t),[alice,bob]=f.members,w={token:f.worker.token};
 const project=(await f.post('/api/room',{action:'create',id:randomUUID(),title:'Live',description:'',members:[bob.id]},{cookie:alice.cookie})).data.project;
 const state=await (await fetch(f.host+'/api/room?project='+project,{headers:{Cookie:alice.cookie}})).json();
 const lead=state.agents[0].id,message=randomUUID();
 await f.post('/api/room',{action:'message',id:message,project,recipient:lead,direct:true,body:'Was nun?'},{cookie:alice.cookie});
 const [a,b]=await Promise.all([alice,bob].map(f.listen));
 await f.settle();
 await f.post('/api/agent-runs',{project,agent:lead,message},{cookie:alice.cookie});
 const job=(await f.post('/api/agent-worker/claim',{},w)).data.job;
 await f.post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:'call-0001',tool:'project.read_context',args:{}},w);
 await f.post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Erst die Startseite.'},w);
 await f.settle();
 assert.deepEqual(a.map(s=>s.type),['runs','runs','runs','runs','room'],'asked, picked up, one step, finished, answer');
 assert.equal(b.length,0,'a private agent chat tells nobody else anything');
});
