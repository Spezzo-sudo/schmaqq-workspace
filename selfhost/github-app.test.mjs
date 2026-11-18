import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync,existsSync,statSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {jwtVerify} from 'jose';
import {createStudioServer} from './server.mjs';
import {createGithubApp,githubAppManifest,safeReturn,withNotice} from './github-app.mjs';
import {storeMetadata} from './team-model.mjs';
import {createInvite} from './store.mjs';

const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const pem=privateKey.export({type:'pkcs1',format:'pem'});

function fakeGithub(){
 const calls=[],installations={4242:'Spezzo-sudo',5555:'stranger'},repoInstallation={'spezzo-sudo/klimafinder-ch':4242,'stranger/evil':5555};
 let issued=0,empty=true;
 const server=http.createServer(async(req,res)=>{
  let body='';for await(const part of req)body+=part;
  const url=new URL(req.url,'http://x'),auth=req.headers.authorization??'';
  calls.push({method:req.method,path:url.pathname,body:body?JSON.parse(body):null,auth});
  const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
  const appJwt=async()=>{try{const {payload}=await jwtVerify(auth.replace(/^Bearer /,''),publicKey,{issuer:'777',algorithms:['RS256']});return payload.exp-payload.iat<=600;}catch{return false;}};
  let m;
  if(req.method==='POST'&&(m=url.pathname.match(/^\/app-manifests\/([\w-]+)\/conversions$/))){
   if(m[1]!=='good-code')return json(404,{message:'Not Found'});
   return json(201,{id:777,slug:'schmaqq-studio-test',pem,client_id:'Iv1.fixture',client_secret:'fixture-client-secret',webhook_secret:null,owner:{login:'Spezzo-sudo'}});
  }
  if(req.method==='GET'&&(m=url.pathname.match(/^\/app\/installations\/(\d+)$/))){
   if(!await appJwt())return json(401,{});
   return installations[m[1]]?json(200,{id:Number(m[1]),account:{login:installations[m[1]]}}):json(404,{});
  }
  if(req.method==='GET'&&(m=url.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/installation$/))){
   if(!await appJwt())return json(401,{});
   const id=repoInstallation[m[1].toLowerCase()];return id?json(200,{id,account:{login:installations[id]}}):json(404,{});
  }
  if(req.method==='POST'&&(m=url.pathname.match(/^\/app\/installations\/(\d+)\/access_tokens$/))){
   if(!await appJwt())return json(401,{});
   issued++;return json(201,{token:'ghs_fixture_'+issued,expires_at:new Date(Date.now()+3600000).toISOString()});
  }
  if(req.method==='GET'&&url.pathname==='/installation/repositories'){
   if(!auth.startsWith('Bearer ghs_fixture_'))return json(401,{});
   return json(200,{repositories:[{full_name:'Spezzo-sudo/Klimafinder-CH',private:false,default_branch:'main'},{full_name:'bad name',private:true}]});
  }
  if(req.method==='GET'&&(m=url.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/branches\/(.+)$/))){
   if(!auth.startsWith('Bearer ghs_fixture_'))return json(401,{});
   return json(200,{name:decodeURIComponent(m[2]),protected:m[2]==='main'});
  }
  // A brand-new repository: no branch until the first file is written.
  if(req.method==='GET'&&(m=url.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/branches$/))){
   if(!auth.startsWith('Bearer ghs_fixture_'))return json(401,{});
   return json(200,empty?[]:[{name:'main'}]);
  }
  if(req.method==='PUT'&&(m=url.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/contents\/README\.md$/))){
   if(!auth.startsWith('Bearer ghs_fixture_'))return json(401,{});
   empty=false;return json(201,{content:{path:'README.md'}});
  }
  json(404,{});
 });
 return {server,calls,issued:()=>issued};
}

test('return paths after GitHub stay inside Studio',()=>{
 assert.equal(safeReturn('/?room=website&tab=settings'),'/?room=website&tab=settings');
 for(const bad of ['//evil.example/x','https://evil.example','javascript:alert(1)','/\\evil','',null,'/'+'a'.repeat(600)])assert.equal(safeReturn(bad),'/',String(bad));
 assert.equal(withNotice('/?room=website&tab=settings','github_app','installed'),'/?room=website&tab=settings&github_app=installed');
 assert.equal(withNotice('//evil.example','github_app','created'),'/?github_app=created');
});

test('GitHub App manifest asks only for repository contents and pull requests',()=>{
 const m=githubAppManifest('https://studio.schmaqq.com');
 assert.deepEqual(m.default_permissions,{contents:'write',pull_requests:'write',metadata:'read'});
 assert.equal(m.public,true);
 assert.equal(m.redirect_url,'https://studio.schmaqq.com/api/github-app/created');
 assert.equal(m.setup_url,'https://studio.schmaqq.com/api/github-app/installed');
 assert.equal(m.hook_attributes.active,false);
 assert.ok(m.name.length<=34);
});

test('GitHub App: owner creates and installs it; redirects are single-use and browser-bound; tokens are per repository',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-github-app-')),github=fakeGithub();
 await new Promise(r=>github.server.listen(0,'127.0.0.1',r));
 const api='http://127.0.0.1:'+github.server.address().port,origin='http://127.0.0.1:44352';
 const filename=path.join(dir,'db.sqlite'),credentialsFile=path.join(dir,'github-app.private.json');
 let app,host='';
 // Requests go to the port the system assigned; the Origin header keeps the configured origin.
 const request=(route,data,cookie,from=origin)=>fetch(host+route,{method:data?'POST':'GET',headers:{...(data?{Origin:from,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined,redirect:'manual'});
 const bindingOf=r=>r.headers.get('set-cookie').split(';')[0];
 try{
  // The server opens the store; the app module is created on that same database handle.
  const holder={};
  const proxy=new Proxy({},{get:(_,k)=>holder.app[k]});
  app=createStudioServer({seedProjects:true,filename,origin,previewOrigin:'http://127.0.0.1:44353',githubApp:proxy});
  holder.app=createGithubApp({db:app.db,origin,credentialsFile,api,web:'https://github.example'});
  // A free port from the system: a fixed port inside the ephemeral range collided now and then with parallel tests.
  await new Promise((r,j)=>{app.server.once('error',j);app.server.listen(0,'127.0.0.1',r);});host='http://127.0.0.1:'+app.server.address().port;

  const cookies=[];for(const name of ['owner','member']){const r=await request('/api/auth/register',{invite:createInvite(app.db,name+'@fixture.invalid'),name,password:'fixture-password-1234'});cookies.push(r.headers.get('set-cookie').split(';')[0]);}
  app.db.prepare("UPDATE members SET role='owner' WHERE email='owner@fixture.invalid'").run();
  app.db.prepare("UPDATE members SET role='member' WHERE email='member@fixture.invalid'").run();
  const [owner,member]=cookies;

  assert.equal((await request('/api/github-app')).status,401);
  let status=await (await request('/api/github-app',null,owner)).json();
  assert.deepEqual({configured:status.configured,canCreate:status.canCreate},{configured:false,canCreate:true});
  assert.equal((await (await request('/api/github-app',null,member)).json()).canCreate,false);
  assert.equal((await request('/api/github-app/create',{},member)).status,403);
  assert.equal((await request('/api/github-app/create',{},owner,'https://foreign.invalid')).status,403);

  // Creation: wrong browser, wrong code and replay are refused without storing anything.
  let start=await request('/api/github-app/create',{},owner);assert.equal(start.status,200);
  let form=await start.json(),browser=bindingOf(start);
  assert.match(form.action,/^https:\/\/github\.example\/settings\/apps\/new\?state=/);
  assert.equal(JSON.parse(form.manifest).redirect_url,origin+'/api/github-app/created');
  let state=new URL(form.action).searchParams.get('state');
  let back=await request(`/api/github-app/created?state=${state}&code=good-code`,null,'studio_session_github_app=wrong');
  assert.equal(back.headers.get('location'),'/?github_app_error=create');assert.equal(existsSync(credentialsFile),false);
  back=await request(`/api/github-app/created?state=${state}&code=good-code`,null,browser);
  assert.equal(back.headers.get('location'),'/?github_app_error=create','a refused attempt is consumed');
  start=await request('/api/github-app/create',{},owner);form=await start.json();browser=bindingOf(start);state=new URL(form.action).searchParams.get('state');
  back=await request(`/api/github-app/created?state=${state}&code=bad-code`,null,browser);
  assert.equal(back.headers.get('location'),'/?github_app_error=create');assert.equal(existsSync(credentialsFile),false);
  start=await request('/api/github-app/create',{},owner);form=await start.json();browser=bindingOf(start);state=new URL(form.action).searchParams.get('state');
  back=await request(`/api/github-app/created?state=${state}&code=good-code`,null,browser);
  assert.equal(back.headers.get('location'),'/?github_app=created');
  assert.equal(statSync(credentialsFile).mode&0o777,0o600);
  assert.equal(JSON.parse(readFileSync(credentialsFile,'utf8')).id,777);
  assert.equal((await request(`/api/github-app/created?state=${state}&code=good-code`,null,browser)).headers.get('location'),'/?github_app_error=create');
  assert.equal((await request('/api/github-app/create',{},owner)).status,409);

  status=await (await request('/api/github-app',null,owner)).json();
  assert.equal(status.configured,true);assert.equal(status.canCreate,false);
  assert.equal(JSON.stringify(status).includes('PRIVATE KEY'),false);
  assert.equal(JSON.stringify(status).includes('fixture-client-secret'),false);

  // Installation: any member may add repositories; foreign installation ids are refused.
  let install=await request('/api/github-app/install',{},member);assert.equal(install.status,200);
  let target=new URL((await install.json()).url),ib=bindingOf(install);
  assert.equal(target.origin+target.pathname,'https://github.example/apps/schmaqq-studio-test/installations/new');
  back=await request(`/api/github-app/installed?state=${target.searchParams.get('state')}&installation_id=999`,null,ib);
  assert.equal(back.headers.get('location'),'/?github_app_error=install');
  install=await request('/api/github-app/install',{returnTo:'/?room=website&tab=settings'},member);target=new URL((await install.json()).url);ib=bindingOf(install);
  back=await request(`/api/github-app/installed?state=${target.searchParams.get('state')}&installation_id=4242`,null,ib);
  assert.equal(back.headers.get('location'),'/?room=website&tab=settings&github_app=installed','back to the project settings');
  status=await (await request('/api/github-app',null,owner)).json();
  assert.deepEqual(status.installations,[{id:4242,account:'Spezzo-sudo'}]);

  // Repository list for project setup; invalid names are dropped.
  const repos=await (await request('/api/github-app/repositories',null,member)).json();
  assert.deepEqual(repos.repositories,[{repository:'Spezzo-sudo/Klimafinder-CH',private:false,base:'main'}]);

  // Tokens: restricted to one repository, cached, never for repositories without the app.
  const before=github.issued();
  const t1=await holder.app.repositoryToken('Spezzo-sudo/Klimafinder-CH');
  const t2=await holder.app.repositoryToken('Spezzo-sudo/Klimafinder-CH');
  assert.equal(t1,t2);assert.equal(github.issued(),before+1);
  const tokenCall=github.calls.filter(c=>c.method==='POST'&&c.path==='/app/installations/4242/access_tokens').at(-1);
  assert.deepEqual(tokenCall.body,{repositories:['Klimafinder-CH'],permissions:{contents:'write',pull_requests:'write',metadata:'read'}});
  await assert.rejects(holder.app.repositoryToken('Spezzo-sudo/other'),/noch keinen Zugriff/);
  await assert.rejects(holder.app.repositoryToken('../etc'),/Repository ungültig/);
  // Someone outside Studio installed the app on their own account: Studio refuses to work with it.
  await assert.rejects(holder.app.repositoryToken('stranger/evil'),/nicht über Studio freigegeben/);
  assert.equal(await holder.app.branchProtected('Spezzo-sudo/Klimafinder-CH','main'),true);
  assert.equal(await holder.app.branchProtected('Spezzo-sudo/Klimafinder-CH','develop'),false);
  await assert.rejects(holder.app.branchProtected('Spezzo-sudo/Klimafinder-CH','../x'),/Zielbranch ungültig/);

  // Project setup: does Studio reach the repository, and is the target branch protected?
  storeMetadata(app.db,'room:v1:project:website',{repository:'https://github.com/Spezzo-sudo/Klimafinder-CH',base:'main',teamShared:true,revision:1});
  storeMetadata(app.db,'room:v1:project:other',{repository:'https://github.com/Spezzo-sudo/other',base:'main',teamShared:true,revision:1});
  assert.deepEqual(await (await request('/api/github-app/access?project=website',null,member)).json(),{repository:'Spezzo-sudo/Klimafinder-CH',base:'main',configured:true,access:true,protected:true});
  assert.deepEqual(await (await request('/api/github-app/access?project=other',null,member)).json(),{repository:'Spezzo-sudo/other',base:'main',configured:true,access:false,protected:null});
  assert.equal((await request('/api/github-app/access?project=../x',null,member)).status,400);

  // "Neu anfangen" with a completely empty repository: the admin's Studio writes a first README, only while it is empty.
  assert.equal((await request('/api/github-app/start',{project:'website'},member)).status,403,'only the project admin');
  assert.deepEqual(await (await request('/api/github-app/start',{project:'website'},owner)).json(),{started:true});
  const readme=github.calls.find(c=>c.method==='PUT'&&c.path==='/repos/Spezzo-sudo/Klimafinder-CH/contents/README.md');
  assert.equal(readme.body.message,'Projekt angelegt mit SCHMAQQ Studio');assert.match(Buffer.from(readme.body.content,'base64').toString(),/^# /);
  assert.deepEqual(await (await request('/api/github-app/start',{project:'website'},owner)).json(),{started:false},'never twice, never on existing code');
 }finally{
  app?.server.closeAllConnections?.();app?.server.close();app?.previewServer?.close();app?.db?.close();github.server.closeAllConnections?.();github.server.close();rmSync(dir,{recursive:true,force:true});
 }
});

test('GitHub App routes report not available in demo mode',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-github-app-demo-')),origin='http://127.0.0.1:44354';
 const app=createStudioServer({demoMode:true,filename:path.join(dir,'db.sqlite'),origin,previewOrigin:'http://127.0.0.1:44355'});
 try{
  await new Promise((r,j)=>{app.server.once('error',j);app.server.listen(0,'127.0.0.1',r);});
  const r=await fetch('http://127.0.0.1:'+app.server.address().port+'/api/github-app/create',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'});
  assert.ok(r.status===401||r.status===409);
 }finally{app.server.closeAllConnections?.();app.server.close();app.db.close();rmSync(dir,{recursive:true,force:true});}
});
