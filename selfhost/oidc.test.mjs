import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('OIDC: verified invitations, explicit linking, PKCE, browser binding, replay and claims',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-oidc-'));
 const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);jwk.kid='fixture';
 const codes=new Map();let exchanges=0,issuer;
 const idp=http.createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/jwks'){res.end(JSON.stringify({keys:[jwk]}));return;}
  let data='';for await(const chunk of req)data+=chunk;const form=new URLSearchParams(data),entry=codes.get(form.get('code'));codes.delete(form.get('code'));
  if(!entry||createHash('sha256').update(form.get('code_verifier')??'').digest('base64url')!==entry.challenge){res.writeHead(400);res.end('{}');return;}
  exchanges++;
  const jwt=await new SignJWT({nonce:entry.nonce,email:entry.email,email_verified:entry.verified??true,name:'Fixture'})
   .setProtectedHeader({alg:'RS256',kid:'fixture'}).setIssuer(entry.issuer??issuer).setAudience(entry.aud??'studio-fixture').setSubject(entry.sub??entry.email).setIssuedAt().setExpirationTime(entry.exp??'5m').sign(privateKey);
  res.end(JSON.stringify({id_token:jwt}));
 });
 await new Promise(r=>idp.listen(0,'127.0.0.1',r));issuer='http://127.0.0.1:'+idp.address().port;
 const base='http://127.0.0.1:44339';
 const studio=createStudioServer({filename:path.join(dir,'db.sqlite'),origin:base,previewOrigin:'http://127.0.0.1:44340',oidcProvider:{issuer,clientId:'studio-fixture',method:'none',authorize:issuer+'/authorize',tokenUrl:issuer+'/token',jwks:issuer+'/jwks'}});
 await new Promise(r=>studio.server.listen(44339,'127.0.0.1',r));
 const request=(route,data,cookie)=>fetch(base+route,{method:data?'POST':'GET',headers:{...(data?{Origin:base,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined,redirect:'manual'});
 async function start(options={},cookie){const r=await request('/api/auth/provider/start',{provider:'chatgpt',purpose:'login',...options},cookie);assert.equal(r.status,200);const url=new URL((await r.json()).url);assert.equal(url.searchParams.get('scope'),'openid profile email');assert.equal(url.searchParams.get('code_challenge_method'),'S256');return {url,cookie:r.headers.get('set-cookie').split(';')[0]};}
 let sequence=0;
 async function finish(start,claims={},binding=start.cookie){const code='code'+(++sequence);codes.set(code,{email:'new@test.invalid',nonce:start.url.searchParams.get('nonce'),challenge:start.url.searchParams.get('code_challenge'),...claims});return request('/api/auth/provider/callback?state='+start.url.searchParams.get('state')+'&code='+code,null,binding);}
 const ok=r=>assert.equal(r.headers.get('location'),'/');
 const denied=r=>assert.equal(r.headers.get('location'),'/?auth_error=provider');
 try{
  assert.equal((await request('/api/auth/providers')).status,200);
  denied(await finish(await start()));assert.equal(studio.db.prepare('SELECT count(*) AS n FROM members').get().n,0);
  const invite=createInvite(studio.db,'new@test.invalid');
  const first=await start({invite});denied(await finish(first,{},'unrelated=x'));assert.equal(exchanges,1);
  const joined=await finish(first);ok(joined);const memberCookie=joined.headers.getSetCookie().find(c=>c.startsWith('studio_session=')).split(';')[0];
  denied(await finish(first));assert.equal(exchanges,2);
  assert.equal((await request('/api/auth/session',null,memberCookie)).status,200);
  assert.equal(studio.db.prepare('SELECT count(*) AS n FROM invites').get().n,0);
  ok(await finish(await start()));
  for(const claims of [{nonce:'wrong'},{aud:'other'},{issuer:issuer+'/other'},{exp:1}])denied(await finish(await start(),claims));
  const mismatch=createInvite(studio.db,'another@test.invalid');denied(await finish(await start({invite:mismatch}),{email:'wrong@test.invalid'}));
  denied(await finish(await start({invite:mismatch}),{email:'another@test.invalid',verified:false}));
  assert.equal(studio.db.prepare('SELECT count(*) AS n FROM invites').get().n,1);
  const passwordInvite=createInvite(studio.db,'password@test.invalid');const registered=await request('/api/auth/register',{invite:passwordInvite,name:'Password User',password:'fixture-password-123'});
  const passwordCookie=registered.headers.get('set-cookie').split(';')[0];
  denied(await finish(await start(),{email:'password@test.invalid'}));
  assert.equal((await request('/api/auth/provider/start',{provider:'chatgpt',purpose:'link'})).status,401);
  ok(await finish(await start({purpose:'link'},passwordCookie),{email:'password@test.invalid'}));
  ok(await finish(await start(),{email:'password@test.invalid'}));
  denied(await finish(await start({purpose:'link'},passwordCookie),{email:'new@test.invalid'}));
  const stale=await start({purpose:'link'},passwordCookie);await request('/api/auth/logout',{},passwordCookie);denied(await finish(stale,{email:'password@test.invalid'}));
  assert.equal((await request('/api/auth/login',{email:'new@test.invalid',password:'irrelevant'})).status,401);
  const csrf=await fetch(base+'/api/auth/provider/start',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.invalid'},body:'{}'});assert.equal(csrf.status,403);
 }finally{await new Promise(r=>studio.server.close(r));studio.db.close();await new Promise(r=>idp.close(r));rmSync(dir,{recursive:true,force:true});}
});
