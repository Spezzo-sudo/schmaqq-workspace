import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {runCodex} from './codex-run.mjs';

const capabilities=(kind,projects,extra={})=>({models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled',host:{kind,os:'linux',arch:'x64',node:'v24.22.0',cpus:2,memoryMb:2048},development:projects.map(id=>({id,setupVersion:1,check:true,preview:true,allowCodex:true,publish:true})),...extra});

test('project agents: a named AI team member with its own model, ordered by a person with that person\'s access',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-agents-')),origin='http://127.0.0.1:44595';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44596'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const host='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie,token)=>{const r=await fetch(host+route,{method:value?'POST':'GET',headers:{...(value?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(value?{body:JSON.stringify(value)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const a=await request('/api/auth/register',{invite:createInvite(app.db,'a@fixture.invalid','owner'),name:'Marco',password:'fixture-password-1234'});
 const b=await request('/api/auth/register',{invite:createInvite(app.db,'b@fixture.invalid'),name:'Markus',password:'fixture-password-1234'});
 const c=await request('/api/auth/register',{invite:createInvite(app.db,'c@fixture.invalid'),name:'Gast',password:'fixture-password-1234'});
 const memberId=mail=>app.db.prepare('SELECT id FROM members WHERE email=?').get(mail).id;
 const project=(await request('/api/room',{action:'create',id:randomUUID(),title:'Klimafinder',description:''},a.cookie)).data.project;
 const other=(await request('/api/room',{action:'create',id:randomUUID(),title:'Anderes',description:''},a.cookie)).data.project;
 assert.equal((await request('/api/project-roles',{action:'roles',project,member:memberId('c@fixture.invalid'),roles:['viewer']},a.cookie)).status,200);
 const pc=(await request('/api/development',{action:'device',name:'Marco-PC'},a.cookie)).data;
 const server=(await request('/api/development',{action:'device',name:'VPS-Worker'},a.cookie)).data;
 assert.equal((await request('/api/runner/capabilities',capabilities('pc',[project],{models:['qwen3:8b'],status:'ready',projects:[project],codex:'chatgpt'}),null,pc.token)).status,200);
 assert.equal((await request('/api/runner/capabilities',capabilities('server',[project]),null,server.token)).status,200);
 const agents=async cookie=>(await request('/api/agents?project='+project,null,cookie)).data;

 // What a person can choose is what that person can really use.
 const first=await agents(a.cookie);
 assert.deepEqual(first.options.local.map(o=>o.model),['qwen3:8b']);assert.equal(first.options.codex[0].signedIn,true);
 assert.deepEqual((await agents(b.cookie)).options.local,[],'Marco\'s PC model is not Markus\' model');

 // Create: developers may, viewers may not; names are unique; a repeated request does not create a second agent.
 const terra={action:'create',id:randomUUID(),project,name:'Terra',role:'developer',purpose:'Finder-Oberfläche',engine:'codex',model:'terra-6.1',effort:'low'};
 assert.equal((await request('/api/agents',terra,c.cookie)).status,403);
 assert.equal((await request('/api/agents',terra,a.cookie)).status,200);
 assert.equal((await request('/api/agents',terra,a.cookie)).data.reused,true);
 assert.equal((await request('/api/agents',{...terra,purpose:'anders'},a.cookie)).status,409);
 assert.equal((await request('/api/agents',{...terra,id:randomUUID(),name:'terra'},b.cookie)).status,409,'same name');
 assert.equal((await request('/api/agents',{...terra,id:randomUUID(),name:'Böse',model:'x"; rm -rf'},a.cookie)).status,400);
 const sol={action:'create',id:randomUUID(),project,name:'Sol',role:'research',purpose:'',engine:'local',model:'qwen3:8b',device:pc.id};
 assert.equal((await request('/api/agents',sol,b.cookie)).status,409,'Markus cannot build an agent on a model he may not use');
 assert.equal((await request('/api/agents',sol,a.cookie)).status,200);
 const listed=await agents(c.cookie);
 assert.deepEqual(listed.agents.map(x=>[x.name,x.engine,x.model,x.effort,x.createdBy.name,x.editable]),[['Terra','codex','terra-6.1','low','Marco',false],['Sol','local','qwen3:8b','medium','Marco',false]]);
 assert.equal(listed.canCreate,false);
 assert.equal((await request('/api/agents?project='+other,null,a.cookie)).data.agents.length,0,'agents belong to one project');

 // Local agent: the order becomes an ordinary job of the person who gave it, with the agent's identity in front.
 const order={action:'run',id:randomUUID(),agent:sol.id,project,prompt:'Fasse den Stand zusammen.'};
 assert.equal((await request('/api/agents',order,b.cookie)).status,409,'not Markus\' model');
 assert.equal((await request('/api/agents',{...order,id:randomUUID(),project:other},a.cookie)).status,404,'agent of another project');
 const ran=await request('/api/agents',order,a.cookie);assert.equal(ran.status,200);
 assert.equal((await request('/api/agents',order,a.cookie)).data.job,ran.data.job,'a repeated order is the same job');
 const job=app.db.prepare('SELECT * FROM jobs WHERE id=?').get(ran.data.job),payload=JSON.parse(job.payload);
 assert.equal(job.owner,memberId('a@fixture.invalid'));assert.equal(job.action,'local-ai');assert.equal(job.device,pc.id);assert.equal(payload.model,'qwen3:8b');
 assert.match(payload.prompt,/^Du arbeitest in diesem Auftrag als „Sol“ \(Rolle: Recherche\)/);assert.match(payload.prompt,/Den Auftrag gibt dir Marco\./);assert.match(payload.prompt,/AKTUELLER AUFTRAG\nFasse den Stand zusammen\.$/);
 assert.equal(app.db.prepare("SELECT count(*) AS n FROM jobs WHERE action='local-ai'").get().n,1);
 app.db.prepare("UPDATE jobs SET status='completed',result=? WHERE id=?").run(JSON.stringify({output:'Alles im Plan.'}),job.id);
 const mine=(await agents(a.cookie)).agents[1].runs[0],theirs=(await agents(b.cookie)).agents[1].runs[0];
 assert.deepEqual([mine.status,mine.byName,mine.output],['completed','Marco','Alles im Plan.']);
 assert.deepEqual([theirs.status,theirs.byName,theirs.output],['completed','Marco',null],'everyone sees who ordered what, the answer stays with the person who asked');

 // Codex agent: needs a task and the person's own working copy on the person's own machine.
 const task=(await request('/api/room',{action:'task',id:randomUUID(),project,title:'Leise-Priorität',kind:'code',criteria:'Tests grün',mine:false},a.cookie)).data.task;
 assert.ok(task);
 const code={action:'run',id:randomUUID(),agent:terra.id,project,prompt:'Sortiere leise Geräte nach oben.'};
 assert.equal((await request('/api/agents',code,a.cookie)).status,400,'no task');
 assert.equal((await request('/api/agents',{...code,task},a.cookie)).status,409,'no working copy yet');
 for(const d of [pc,server])await request('/api/runner/poll',{},null,d.token);
 const copy=await request('/api/development',{action:'job',device:pc.id,project,operation:'prepare',task,title:'Leise'},a.cookie);assert.equal(copy.status,200,JSON.stringify(copy.data));
 app.db.prepare("UPDATE jobs SET status='completed',result='{}' WHERE id=?").run(copy.data.id);
 const coded=await request('/api/agents',{...code,task},a.cookie);assert.equal(coded.status,200,JSON.stringify(coded.data));
 const codex=app.db.prepare('SELECT * FROM jobs WHERE id=?').get(coded.data.job),cp=JSON.parse(codex.payload);
 assert.deepEqual([codex.action,codex.device,codex.owner,cp.worktree,cp.model,cp.effort,cp.agent],['codex',pc.id,memberId('a@fixture.invalid'),copy.data.id,'terra-6.1','low',terra.id]);
 assert.match(cp.prompt,/^Du arbeitest in diesem Auftrag als „Terra“ \(Rolle: Entwickler\)[\s\S]*Sortiere leise Geräte nach oben\.$/);
 const run=(await agents(b.cookie)).agents[0].runs[0];
 assert.deepEqual([run.id,run.byName,run.taskTitle,run.status],[codex.id,'Marco','Leise-Priorität','queued']);
 assert.ok((await request('/api/team',null,a.cookie)).data.events.some(e=>e.kind==='agent-run'&&e.task===task),'the order is part of the project history');

 // A plain code job cannot smuggle an agent of another project or a non-AI operation.
 assert.equal((await request('/api/development',{action:'job',device:pc.id,project,operation:'status',worktree:copy.data.id,agent:terra.id},a.cookie)).status,400);

 // Markus' copy lives in the shared workshop, which carries Marco's sign-in: no Codex agent run there.
 app.db.prepare("UPDATE jobs SET status='completed' WHERE id=?").run(codex.id);
 const task2=(await request('/api/room',{action:'task',id:randomUUID(),project,title:'Zweite',kind:'code',criteria:'x',mine:false},b.cookie)).data.task;
 const copy2=await request('/api/development',{action:'job',device:server.id,project,operation:'prepare',task:task2,title:'Zweite'},b.cookie);assert.equal(copy2.status,200,JSON.stringify(copy2.data));
 app.db.prepare("UPDATE jobs SET status='completed',result='{}' WHERE id=?").run(copy2.data.id);
 const foreign=await request('/api/agents',{...code,id:randomUUID(),task:task2},b.cookie);
 assert.equal(foreign.status,409);assert.match(foreign.data.error,/eigenen ChatGPT-Zugang/);

 // Change and remove: the creator or the project admin.
 const current=(await agents(a.cookie)).agents[0];
 const change={action:'update',agent:terra.id,project,revision:current.revision,name:'Terra',role:'reviewer',purpose:'Prüft',model:'',effort:'high',paused:true};
 assert.equal((await request('/api/agents',change,b.cookie)).status,403);
 assert.equal((await request('/api/agents',change,a.cookie)).status,200);
 assert.equal((await request('/api/agents',change,a.cookie)).status,409,'stale revision');
 assert.equal((await request('/api/agents',{...code,id:randomUUID(),task},a.cookie)).status,409,'paused');
 assert.equal((await request('/api/agents',{action:'remove',agent:terra.id,project},b.cookie)).status,403);
 assert.equal((await request('/api/agents',{action:'remove',agent:terra.id,project},a.cookie)).status,200);
 assert.deepEqual((await agents(a.cookie)).agents.map(x=>x.name),['Sol']);
});

test('codex run passes the agent\'s model and effort to the unchanged Codex CLI and refuses unsafe names',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-agent-codex-'));
 try{
  const calls=[];const execute=async argv=>{calls.push(argv);return argv[1]==='login'?'Logged in using ChatGPT':'';};
  await runCodex({executable:'local-codex',cwd:dir,prompt:'x',sessionFile:path.join(dir,'s'),model:'terra-6.1',effort:'low',execute});
  assert.ok(calls[1].join(' ').includes('-c model="terra-6.1" -c model_reasoning_effort="low"'));
  await runCodex({executable:'local-codex',cwd:dir,prompt:'x',sessionFile:path.join(dir,'s2'),execute});
  assert.ok(!calls[3].join(' ').includes('model'));
  await assert.rejects(runCodex({executable:'local-codex',cwd:dir,prompt:'x',sessionFile:path.join(dir,'s3'),model:'a" -c x="y',execute}),/Modellname/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
