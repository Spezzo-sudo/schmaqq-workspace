import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('GitHub account connection: session binding, PKCE, replay, isolation, errors and disconnect; no token storage',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-connections-')),codes=new Map();let currentProfile={id:123,login:'fixture-user'},exchanges=0,beforeProfile;
 const provider=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/user'){
   assert.equal(req.headers.authorization,'Bearer fixture-access');
   if(beforeProfile)await beforeProfile();
   res.end(JSON.stringify(currentProfile));return;
  }
  let text='';for await(const part of req)text+=part;const form=new URLSearchParams(text),challenge=codes.get(form.get('code'));codes.delete(form.get('code'));
  assert.equal(form.get('client_secret'),'fixture-secret');
  if(!challenge||createHash('sha256').update(form.get('code_verifier')??'').digest('base64url')!==challenge){res.writeHead(400);res.end('{}');return;}
  exchanges++;res.end(JSON.stringify({access_token:'fixture-access',token_type:'bearer'}));
 });
 await new Promise(r=>provider.listen(0,'127.0.0.1',r));const baseProvider='http://127.0.0.1:'+provider.address().port,origin='http://127.0.0.1:44342';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'db.sqlite'),origin,previewOrigin:'http://127.0.0.1:44343',githubProvider:{clientId:'fixture-client',secret:'fixture-secret',authorize:baseProvider+'/authorize',tokenUrl:baseProvider+'/token',userUrl:baseProvider+'/user'}});
 await new Promise(r=>app.server.listen(44342,'127.0.0.1',r));
 const request=(route,data,cookie,from=origin)=>fetch(origin+route,{method:data?'POST':'GET',headers:{...(data?{Origin:from,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined,redirect:'manual'});
 let sequence=0;
 async function start(cookie){const r=await request('/api/connections/github/start',{},cookie);assert.equal(r.status,200);const url=new URL((await r.json()).url);assert.equal(url.searchParams.get('scope'),'read:user');assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('prompt'),'select_account');return {url,cookie:r.headers.get('set-cookie').split(';')[0]};}
 async function finish(attempt,cookie=attempt.cookie,extra=''){const code='fixture-code-'+(++sequence);codes.set(code,attempt.url.searchParams.get('code_challenge'));return request('/api/connections/github/callback?state='+attempt.url.searchParams.get('state')+'&code='+code+extra,null,cookie);}
 const linked=r=>assert.equal(r.headers.get('location'),'/?view=models&connection=github');
 const denied=r=>assert.equal(r.headers.get('location'),'/?view=models&connection_error=github');
 try{
  assert.equal((await request('/api/connections')).status,401);
  const cookies=[];for(const name of ['a','b']){const r=await request('/api/auth/register',{invite:createInvite(app.db,name+'@fixture.invalid'),name,password:'fixture-password-1234'});cookies.push(r.headers.get('set-cookie').split(';')[0]);}
  const [a,b]=cookies;
  assert.equal((await request('/api/connections/github/start',{},a,'https://foreign.invalid')).status,403);
  const first=await start(a);denied(await finish(first,'unrelated=browser'));assert.equal(exchanges,0);
  linked(await finish(first));denied(await finish(first));assert.equal(exchanges,1);
  const aStatus=(await (await request('/api/connections',null,a)).json()).github;
  assert.equal(aStatus.account.login,'fixture-user');assert.equal(aStatus.repositoryAccess,false);
  assert.equal((await (await request('/api/connections',null,b)).json()).github.account,null);
  denied(await finish(await start(b))); // A personal external account cannot silently link to a second member.
  const expired=await start(b);app.db.prepare('UPDATE github_attempts SET expires=0').run();denied(await finish(expired));
  denied(await finish(await start(b),undefined,'&error=access_denied'));
  currentProfile={id:234,login:'invalid/<profile>'};denied(await finish(await start(b)));
  currentProfile={id:234,login:'other-fixture'};
  const loggedOut=await start(b);await request('/api/auth/logout',{},b);denied(await finish(loggedOut));
  const interrupted=await start(a);await request('/api/connections/github/disconnect',{},a);denied(await finish(interrupted));
  // Revoking while profile verification is in flight must also cancel the link.
  const inFlight=await start(a);beforeProfile=async()=>{assert.equal((await request('/api/connections/github/disconnect',{},a)).status,200);};
  denied(await finish(inFlight));beforeProfile=undefined;
  linked(await finish(await start(a)));
  const rows=app.db.prepare('SELECT * FROM github_connections').all();assert.equal(rows.length,1);
  assert.ok(!JSON.stringify(rows).includes('fixture-access'));assert.deepEqual(Object.keys(rows[0]).sort(),['login','member','subject','verified']);
  assert.equal((await request('/api/connections/github/disconnect',{},a)).status,200);
  assert.equal((await (await request('/api/connections',null,a)).json()).github.account,null);
 }finally{await new Promise(r=>app.server.close(r));app.db.close();await new Promise(r=>provider.close(r));assert.ok(dir.startsWith(path.join(os.tmpdir(),'studio-connections-')));rmSync(dir,{recursive:true,force:true});}
});

test('unconfigured GitHub connection stays unavailable and never implies repository access',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-connections-disabled-')),origin='http://127.0.0.1:44344';
 const app=createStudioServer({seedProjects:true,filename:path.join(dir,'db.sqlite'),origin,previewOrigin:'http://127.0.0.1:44345',githubProvider:null});await new Promise(r=>app.server.listen(44344,'127.0.0.1',r));
 const post=(route,data,cookie)=>fetch(origin+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
 try{
  const r=await post('/api/auth/register',{invite:createInvite(app.db,'disabled@fixture.invalid'),name:'Fixture',password:'fixture-password-1234'});const cookie=r.headers.get('set-cookie').split(';')[0];
  const status=await (await fetch(origin+'/api/connections',{headers:{Cookie:cookie}})).json();assert.equal(status.github.enabled,false);assert.equal(status.github.repositoryAccess,false);
  assert.equal((await post('/api/connections/github/start',{},cookie)).status,409);
 }finally{await new Promise(r=>app.server.close(r));app.db.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'studio-connections-disabled-')));rmSync(dir,{recursive:true,force:true});}
});
