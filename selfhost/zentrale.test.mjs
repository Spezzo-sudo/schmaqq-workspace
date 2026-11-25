import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {planLimits} from './codex-run.mjs';
import {limitsOf} from './overview-http.mjs';

// Start as "Zentrale" and private chats that their people make readable for the team (owner, 22.11.2026, option C).

async function fixture(t,{hermesWorkers=[{owner:'nobody',token:'w'.repeat(43)}]}={}){
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-zentrale-test-'));
 const origin='http://127.0.0.1:44893';
 const app=createStudioServer({seedProjects:false,filename:path.join(dir,'test.sqlite'),origin,previewOrigin:'http://127.0.0.1:44894',resetMailer:null,hermesWorkers});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const host='http://127.0.0.1:'+app.server.address().port;
 async function post(body,cookie,route='/api/room'){
  const r=await fetch(host+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 async function get(route,cookie){const r=await fetch(host+route,{headers:cookie?{Cookie:cookie}:{}});return {status:r.status,data:await r.json()};}
 const people=[];
 for(const [index,name] of ['Marco Fixture','Markus Fixture','Lena Fixture','Zora Fixture'].entries()){
  const email=`zentrale${index}@fixture.invalid`,invite=createInvite(app.db,email,index===0?'owner':'member');
  const result=await post({invite,name,password:'isolated-fixture-password-2026'},null,'/api/auth/register');assert.equal(result.status,200);
  people.push({...app.db.prepare('SELECT id FROM members WHERE email=?').get(email),cookie:result.cookie,name});
 }
 const [marco,markus,lena,zora]=people;
 const r=await post({action:'create',id:randomUUID(),title:'Zentrale-Projekt',description:'Test',members:[markus.id,lena.id]},marco.cookie);assert.equal(r.status,200);
 const project=r.data.project;
 const lead=(await get('/api/room?project='+project,marco.cookie)).data.agents.find(a=>a.lead);
 const say=async(who,body,extra={})=>{const id=randomUUID();const s=await post({action:'message',project,id,body,...extra},who.cookie);assert.equal(s.status,200,JSON.stringify(s.data));return id;};
 return {app,post,get,marco,markus,lena,zora,project,lead,say};
}

test('a chat with an agent stays private until its person makes it readable for the team; others only read',async t=>{
 const f=await fixture(t);
 await f.say(f.markus,'Geheime Frage an die Leitung',{recipient:f.lead.id,direct:true});
 const chat='team:agent:'+f.markus.id+':'+f.lead.id,read=who=>f.get('/api/room/chat?project='+f.project+'&chat='+chat,who.cookie);
 assert.equal((await read(f.marco)).status,404,'private by default');
 assert.deepEqual((await f.get('/api/room?project='+f.project,f.marco.cookie)).data.teamChats,[]);

 // Only the person in the chat decides: someone else switching "their" agent chat changes only their own.
 assert.equal((await f.post({action:'chat-visibility',project:f.project,chat:'agent:'+f.lead.id,shared:true},f.markus.cookie)).status,200);
 const room=(await f.get('/api/room?project='+f.project,f.marco.cookie)).data;
 assert.equal(room.teamChats.length,1);assert.equal(room.teamChats[0].chat,chat);assert.match(room.teamChats[0].excerpt,/Geheime Frage/);
 assert.ok(!room.messages.some(m=>/Geheime Frage/.test(m.body)),'the project chat stays free of it');
 const shared=await read(f.marco);assert.equal(shared.status,200);
 assert.deepEqual(shared.data.messages.map(m=>m.body),['Geheime Frage an die Leitung']);
 assert.equal((await f.get('/api/room?project='+f.project,f.markus.cookie)).data.sharing['agent:'+f.lead.id].shared,true);
 // Not in the project: nothing.
 assert.equal((await read(f.zora)).status,403);

 assert.equal((await f.post({action:'chat-visibility',project:f.project,chat:'agent:'+f.lead.id,shared:false},f.markus.cookie)).status,200);
 assert.equal((await read(f.marco)).status,404,'private again');
});

test('a chat between two people becomes readable for the team only when both agree',async t=>{
 const f=await fixture(t);
 await f.say(f.marco,'Nur unter uns',{recipient:f.markus.id,direct:true});
 const chat='team:member:'+f.marco.id+':'+f.markus.id,read=who=>f.get('/api/room/chat?project='+f.project+'&chat='+chat,who.cookie);
 await f.post({action:'chat-visibility',project:f.project,chat:'member:'+f.markus.id,shared:true},f.marco.cookie);
 assert.equal((await read(f.lena)).status,404,'one person alone cannot open a chat of two');
 assert.deepEqual((await f.get('/api/room?project='+f.project,f.markus.cookie)).data.sharing['member:'+f.marco.id],{mine:false,theirs:true,shared:false});
 await f.post({action:'chat-visibility',project:f.project,chat:'member:'+f.marco.id,shared:true},f.markus.cookie);
 const shared=await read(f.lena);assert.equal(shared.status,200);assert.deepEqual(shared.data.messages.map(m=>m.body),['Nur unter uns']);
 assert.equal((await f.get('/api/room?project='+f.project,f.lena.cookie)).data.teamChats.length,1);
 assert.deepEqual((await f.get('/api/room?project='+f.project,f.marco.cookie)).data.teamChats,[],'the two people see it as their own chat');
 // Either one taking it back makes it private again.
 await f.post({action:'chat-visibility',project:f.project,chat:'member:'+f.marco.id,shared:false},f.markus.cookie);
 assert.equal((await read(f.lena)).status,404);
 // A chat with someone outside the project cannot be switched.
 assert.equal((await f.post({action:'chat-visibility',project:f.project,chat:'member:'+f.zora.id,shared:true},f.marco.cookie)).status,400);
});

test('overview works on a fresh studio without an agent service',async t=>{
 const f=await fixture(t,{hermesWorkers:[]});
 await f.say(f.marco,'Hallo Team');
 const {status,data}=await f.get('/api/overview',f.marco.cookie);
 assert.equal(status,200);
 assert.deepEqual(data.projects,[f.project]);
 assert.deepEqual(data.working,[]);
 assert.deepEqual(data.week[f.project],{answers:0,messages:1,codeRuns:0});
 assert.ok(data.agents.some(agent=>agent.id===f.lead.id));
});

test('overview: own projects only, private work of others stays hidden, limits and usage from my own code runs',async t=>{
 const f=await fixture(t),now=Date.now();
 const other=(await f.post({action:'create',id:randomUUID(),title:'Fremd',description:'',members:[]},f.zora.cookie)).data.project;
 const group=await f.say(f.marco,'Hallo Team');
 const secret=await f.say(f.markus,'Privat an die Leitung',{recipient:f.lead.id,direct:true});
 const run=(owner,source,status='running',project=f.project)=>f.app.db.prepare("INSERT INTO agent_runs(id,owner,project,agent,source_message,model,status,created,updated) VALUES(?,?,?,?,?,?,?,?,?)").run(randomUUID(),owner,project,f.lead.id,source,'m',status,now-5000,now);
 run(f.marco.id,group);run(f.markus.id,secret);run(f.zora.id,'elsewhere','running',other);
 f.app.db.prepare('INSERT INTO devices(id,owner,name,hash) VALUES(?,?,?,?)').run('d1',f.marco.id,'Server','h1');
 const job=(owner,result,created)=>f.app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),owner,'d1',f.project,'codex','{}','completed',created,JSON.stringify(result));
 job(f.marco.id,{usage:{input:1000,cached:400,output:50},limits:{short:{used:12,minutes:300,resets:now+3600000},week:{used:40.4,minutes:10080,resets:now+86400000}}},now-60000);
 job(f.marco.id,{usage:{input:500,cached:0,output:10}},now-1000);
 job(f.markus.id,{usage:{input:9999,cached:0,output:9999},limits:{short:{used:99,minutes:300,resets:null}}},now);
 const o=(await f.get('/api/overview',f.marco.cookie)).data;
 assert.deepEqual(o.projects,[f.project]);
 assert.equal(o.working.length,1,'my answer only; a private request of Markus and a foreign project stay hidden');
 assert.ok(o.agents.every(a=>a.project===f.project));
 assert.deepEqual(o.usage,{runs:2,reported:2,input:1500,cached:400,output:60});
 assert.equal(o.limits.short.used,12);assert.equal(o.limits.week.used,40);assert.equal(o.week[f.project].codeRuns,3);
 // Once Markus shares the chat, his request may show as work.
 await f.post({action:'chat-visibility',project:f.project,chat:'agent:'+f.lead.id,shared:true},f.markus.cookie);
 assert.equal((await f.get('/api/overview',f.marco.cookie)).data.working.length,2);
 assert.equal((await f.get('/api/overview')).status,401);
});

test('plan limits: read from the session log, the window length decides which is which',t=>{
 const home=mkdtempSync(path.join(os.tmpdir(),'schmaqq-limits-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
 const session=randomUUID(),now=new Date(2026,10,22,12).getTime(),dir=path.join(home,'sessions','2026','11','22');mkdirSync(dir,{recursive:true});
 const entry=r=>JSON.stringify({type:'event_msg',payload:{type:'token_count',rate_limits:r}});
 writeFileSync(path.join(dir,'rollout-2026-11-22T10-00-00-'+session+'.jsonl'),[
  entry({primary:{used_percent:3,window_minutes:300,resets_at:1},secondary:{used_percent:10,window_minutes:10080,resets_at:2}}),
  entry({primary:{used_percent:64,window_minutes:10080,resets_at:1800000000},secondary:{used_percent:7,window_minutes:300,resets_at:1700000000}}),
  entry({limit_id:'premium',primary:null,secondary:null,rate_limit_reached_type:'workspace_owner_usage_limit_reached'})
 ].join('\n')+'\n');
 assert.deepEqual(planLimits(home,session,{now}),{short:{used:7,minutes:300,resets:1700000000000},week:{used:64,minutes:10080,resets:1800000000000},reached:true});
 assert.equal(planLimits(home,randomUUID(),{now}),null);
 assert.equal(limitsOf({short:{used:'x'}},1),null);
 assert.deepEqual(limitsOf({week:{used:150,minutes:10080,resets:5}},1),{short:null,week:{used:100,minutes:10080,resets:5},reached:false,at:1});
});
