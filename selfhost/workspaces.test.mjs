import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite,openStore} from './store.mjs';
import {listWorkspaces,validScope} from './workspaces.mjs';
import {developmentJob} from '../app/development-request.ts';

test('persistent workspaces: two owners, atomic reservations, archive, revisions and task assignment',async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-workspaces-')),filename=path.join(root,'data.sqlite'),origin='http://127.0.0.1:44322';
 const app=createStudioServer({seedProjects:true,filename,origin});await new Promise(r=>app.server.listen(44322,'127.0.0.1',r));
 async function request(route,value,cookie,token){const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  for(const scope of ['../outside','/root','a//b','a/../b','C:/files','a\\b','a/*'])assert.equal(validScope(scope),false);
  const accounts=[];
  for(const name of ['a','b']){const account=await request('/api/auth/register',{invite:createInvite(app.db,name+'@fixture.invalid'),name,password:'fixture-password-12345'});account.device=(await request('/api/development',{action:'device',name},account.cookie)).data;account.id=app.db.prepare('SELECT id FROM members WHERE name=?').get(name).id;accounts.push(account);}
  const [a,b]=accounts;
  const queue=(account,extra={})=>request('/api/development',developmentJob({operation:'prepare',project:'website',device:account.device.id,worktree:'',...extra}),account.cookie);
  // A fresh browser has no worktree selected. Repository-level actions must still work.
  const inspected=await request('/api/development',developmentJob({operation:'inspect',project:'website',device:a.device.id,worktree:''}),a.cookie);
  assert.equal(inspected.status,200);
  assert.equal((await request('/api/development',{action:'cancel',id:inspected.data.id},a.cookie)).status,200);
  // Omitting a missing copy must not weaken ownership/required-copy validation.
  assert.equal((await request('/api/development',developmentJob({operation:'check',project:'website',device:a.device.id,worktree:''}),a.cookie)).status,403);
  const edit=(account,w,extra={})=>request('/api/development',{action:'workspace',id:w.id,revision:w.revision,title:w.title,scope:w.scope,archived:!!w.archived,...extra},account.cookie);
  const get=async()=> (await request('/api/development',null,a.cookie)).data;
  const task=randomUUID();app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(task,'website','Angebote','Beschreibung','todo','Normal',null,Date.now());
  const race=await Promise.all([queue(a,{issue:42,scope:'marketing',title:'Angebote',task}),queue(b,{issue:42,scope:'marketing/site',title:'Andere Arbeit'})]);assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  // Determine the winner without assuming scheduling order.
  const winner=race[0].status===200?a:b,loser=winner===a?b:a;
  let w=(await get()).workspaces[0];assert.equal(w.owner,winner.id);
  assert.equal((await queue(loser,{scope:'MARKETING/site/header'})).status,409);
  const job=(await request('/api/runner/poll',{},null,winner.device.token)).data.job;
  assert.equal((await request('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result:{branch:'studio/'+job.id}},null,winner.device.token)).status,200);
  w=(await get()).workspaces.find(x=>x.id===job.id);
  assert.equal((await edit(loser,w,{archived:true})).status,404);
  assert.equal((await edit(winner,w,{title:'Umbenannt'})).status,200);
  assert.equal((await edit(winner,w,{archived:true})).status,409);
  w=(await get()).workspaces.find(x=>x.id===job.id);
  // Hundreds of later jobs must not hide the original working copy.
  const insert=app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)');
  for(let n=0;n<125;n++)insert.run(randomUUID(),winner.id,winner.device.id,'website','status',JSON.stringify({worktree:w.id}),'completed',Date.now()+n);
  const state=await get();assert.equal(state.jobs.length,100);assert.ok(!state.jobs.some(j=>j.id===w.id));assert.ok(state.workspaces.some(x=>x.id===w.id));
  const active=await request('/api/development',{action:'job',operation:'check',project:'website',device:winner.device.id,worktree:w.id},winner.cookie);
  assert.equal(active.status,200);assert.equal((await edit(winner,w,{archived:true})).status,409);
  await request('/api/development',{action:'cancel',id:active.data.id},winner.cookie);
  assert.equal((await edit(winner,w,{archived:true})).status,200);
  assert.equal((await request('/api/development',{action:'job',operation:'codex',project:'website',device:winner.device.id,worktree:w.id,prompt:'blocked'},winner.cookie)).status,409);
  const replacement=await queue(loser,{issue:42,scope:'marketing',title:'Nachfolge'});assert.equal(replacement.status,200);
  w=(await get()).workspaces.find(x=>x.id===w.id);assert.equal((await edit(winner,w,{archived:false})).status,409);
  await request('/api/development',{action:'cancel',id:replacement.data.id},loser.cookie);
  assert.equal((await edit(winner,w,{archived:false})).status,200);
  // Explicit task ownership and linkage are enforced independently of scope.
  const separateTask=randomUUID();app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(separateTask,'website','Andere Aufgabe','','todo','Normal',a.id,Date.now());
  assert.equal((await queue(b,{task:separateTask,scope:'app'})).status,409);
  const linked=await queue(a,{task:separateTask,scope:'app'});assert.equal(linked.status,200);
  assert.equal((await queue(a,{task:separateTask,scope:'db'})).status,409);
  const reopened=openStore(filename);try{assert.ok(listWorkspaces(reopened).some(x=>x.id===w.id&&x.title==='Umbenannt'));}finally{reopened.close();}
 }finally{await new Promise(r=>app.server.close(r));app.db.close();assert.ok(root.startsWith(path.join(os.tmpdir(),'studio-workspaces-')));rmSync(root,{recursive:true,force:true});}
});
