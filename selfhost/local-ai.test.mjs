import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {LocalRunner} from './runner.mjs';
import {localModels,runLocalAi,aiCapabilities} from './local-ai.mjs';

test('local AI sharing: explicit owner consent, private results, revoke, limits and no code access',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-ai-')),origin='http://127.0.0.1:44325';let sent,chatCalls=0;
 const backend=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/tags'){res.end(JSON.stringify({models:[{name:'fixture-local'},{name:'hidden-model'},{name:'cloud-model',remote_host:'https://example.invalid'},{name:'model:cloud'}]}));return;}
  assert.equal(req.url,'/api/chat');let body='';for await(const chunk of req)body+=chunk;sent=JSON.parse(body);chatCalls++;
  res.end(JSON.stringify({done:true,message:{role:'assistant',content:'Protocol fixture response'},eval_count:3}));
 });await new Promise(r=>backend.listen(0,'127.0.0.1',r));
 const app=createStudioServer({seedProjects:true,filename:path.join(root,'db.sqlite'),origin});await new Promise(r=>app.server.listen(44325,'127.0.0.1',r));
 async function request(route,data,cookie,token){const r=await fetch(origin+route,{method:data?'POST':'GET',headers:{...(data?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const config={stateDir:path.join(root,'runner'),projects:{},ai:{projects:['website'],ollama:{enabled:true,baseURL:`http://127.0.0.1:${backend.address().port}`,models:['fixture-local','cloud-model','model:cloud'],allowTeam:false,maxOutputTokens:256}}};const runner=new LocalRunner(config);
 try{
  const people=[];for(const name of ['host','borrower','unrelated']){const login=await request('/api/auth/register',{invite:createInvite(app.db,name+'@fixture.invalid'),name,password:'fixture-password-12345'});people.push({...login,id:app.db.prepare('SELECT id FROM members WHERE name=?').get(name).id});}
  const [host,borrower,unrelated]=people,device=(await request('/api/development',{action:'device',name:'Test host'},host.cookie)).data;
  const caps=await aiCapabilities(config);assert.deepEqual(caps.models,['fixture-local']);assert.equal(caps.codex,'disabled');
  const publish=()=>request('/api/runner/capabilities',caps,null,device.token);assert.equal((await publish()).status,200);
  const share=(account,members)=>request('/api/ai',{action:'share',device:device.id,members},account.cookie);
  const queue=(account,extra={})=>request('/api/ai',{action:'run',device:device.id,project:'website',model:'fixture-local',prompt:'Explicit text only',...extra},account.cookie);
  assert.equal((await queue(borrower)).status,403);assert.equal((await share(host,[borrower.id])).status,409);assert.equal((await share(borrower,[borrower.id])).status,403);
  config.ai.ollama.allowTeam=true;caps.allowTeam=true;await publish();assert.equal((await share(host,[borrower.id])).status,200);
  assert.equal((await request('/api/ai',null,borrower.cookie)).data.resources.length,1);assert.equal((await request('/api/ai',null,unrelated.cookie)).data.resources.length,0);
  assert.equal((await queue(borrower,{model:'hidden-model'})).status,403);assert.equal((await queue(borrower,{project:'automation'})).status,403);
  assert.equal((await request('/api/development',{action:'job',operation:'codex',device:device.id,project:'website',prompt:'not authorized'},borrower.cookie)).status,403);
  const queued=await queue(borrower);assert.equal(queued.status,200);const job=(await request('/api/runner/poll',{},null,device.token)).data.job;assert.equal(job.runnerOwner,host.id);
  config.ai.ollama.allowTeam=false;await assert.rejects(runner.run(job),/Team-Nutzung/);config.ai.ollama.allowTeam=true;
  const result=await runner.run(job);assert.equal(result.output,'Protocol fixture response');assert.deepEqual(sent.messages,[{role:'user',content:'Explicit text only'}]);assert.equal(sent.options.num_predict,256);assert.equal(sent.keep_alive,0);assert.equal(chatCalls,1);
  assert.equal((await request('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result},null,device.token)).status,200);
  assert.equal((await request('/api/development/job?id='+job.id,null,borrower.cookie)).status,200);assert.equal((await request('/api/development/job?id='+job.id,null,host.cookie)).status,200);assert.equal((await request('/api/development/job?id='+job.id,null,unrelated.cookie)).status,403);assert.equal((await request('/api/development/events?job='+job.id,null,unrelated.cookie)).status,403);
  assert.ok(!JSON.stringify((await request('/api/ai',null,borrower.cookie)).data.jobs).includes('Protocol fixture response'));
  const waiting=await queue(borrower);await share(host,[]);assert.equal(app.db.prepare('SELECT status FROM jobs WHERE id=?').get(waiting.data.id).status,'cancelled');assert.equal((await request('/api/runner/poll',{},null,device.token)).data.job,null);
  await share(host,[borrower.id]);await queue(borrower);const live=(await request('/api/runner/poll',{},null,device.token)).data.job;await share(host,[]);assert.equal((await request('/api/runner/report',{id:live.id,lease:live.lease,heartbeat:true},null,device.token)).data.cancel,true);
  await request('/api/runner/report',{id:live.id,lease:live.lease,ok:false,result:{error:'cancelled'}},null,device.token);
  for(let i=0;i<3;i++)assert.equal((await queue(host)).status,200);assert.equal((await queue(host)).status,409);
  const paused=new AbortController();paused.abort();await assert.rejects(runLocalAi(config,{...job,owner:host.id},paused.signal));
  await assert.rejects(localModels({...config.ai.ollama,baseURL:'https://external.invalid'}),/Loopback/);
  assert.equal((await request('/api/ai')).status,401);
 }finally{runner.close();await new Promise(r=>app.server.close(r));await new Promise(r=>backend.close(r));app.db.close();assert.ok(root.startsWith(path.join(os.tmpdir(),'studio-ai-')));rmSync(root,{recursive:true,force:true});}
});
