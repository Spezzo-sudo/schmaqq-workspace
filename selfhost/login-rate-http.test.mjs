import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {LOGIN_ACCOUNT_LIMIT,LOGIN_CLIENT_LIMIT} from './login-rate-limit.mjs';

async function createFixture(t, {trustedProxyIps=''}={}) {
  const dir=mkdtempSync(path.join(os.tmpdir(),'studio-auth-throttle-'));
  const origin='http://127.0.0.1:44695';
  const app=createStudioServer({seedProjects:true,
    filename:path.join(dir,'fixture.sqlite'),origin,
    previewOrigin:'http://127.0.0.1:44696',trustedProxyIps
  });
  await new Promise((resolve,reject)=>{
    app.server.once('error',reject);
    app.server.listen(0,'127.0.0.1',resolve);
  });
  t.after(async()=>{
    await new Promise(resolve=>app.server.close(resolve));
    app.db.close();
    rmSync(dir,{recursive:true,force:true});
  });
  const host='http://127.0.0.1:'+app.server.address().port;
  const post=async(route,body,extraHeaders={})=>{
    const response=await fetch(host+route,{
      method:'POST',headers:{
        Origin:origin,'Content-Type':'application/json',...extraHeaders
      },body:JSON.stringify(body)
    });
    return {status:response.status,
      data:await response.json(),
      cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  const get=async(route,headers={})=>{
    const response=await fetch(host+route,{headers});
    return {status:response.status,data:await response.json()};
  };
  return {app,post,get};
}

test('real HTTP login: shared proxy socket cannot lock a different member after 12 account attempts',async t=>{
  const {app,post,get}=await createFixture(t);
  const pass='safe-fixture-password-12345';
  const ownerInvite=createInvite(app.db,'owner@fixture.invalid','owner');
  const memberInvite=createInvite(app.db,'member@fixture.invalid','member');
  const owner=await post('/api/auth/register',{invite:ownerInvite,name:'Fixture Owner',password:pass});
  const member=await post('/api/auth/register',{invite:memberInvite,name:'Fixture Member',password:pass});
  assert.equal(owner.status,200);
  assert.equal(member.status,200);
  assert.ok(owner.cookie?.startsWith('studio_session='));

  for(let i=0;i<LOGIN_ACCOUNT_LIMIT;i++){
    const wrong=await post('/api/auth/login',{
      email:i%2?'OWNER@fixture.invalid':'owner@fixture.invalid',
      password:'wrong-password'
    },{'X-Forwarded-For':'198.51.100.'+(i+1)});
    assert.equal(wrong.status,401,'Failed login should have no user-enumeration difference');
    assert.match(wrong.data.error,/E-Mail oder Passwort/);
  }
  const denied=await post('/api/auth/login',{
    email:'owner@fixture.invalid',password:pass
  },{'X-Forwarded-For':'203.0.113.250'});
  assert.equal(denied.status,429);
  assert.match(denied.data.error,/Minute/);

  // Per-account saturation must never sign out the already authenticated user.
  const existing=await get('/api/auth/session',{Cookie:owner.cookie});
  assert.equal(existing.status,200);
  assert.equal(existing.data.user.email,'owner@fixture.invalid');

  const second=await post('/api/auth/login',{
    email:'member@fixture.invalid',password:pass
  },{'X-Forwarded-For':'203.0.113.251'});
  assert.equal(second.status,200,'Independent member behind same proxy socket must be able to log in');
  assert.ok(second.cookie?.startsWith('studio_session='));
});

test('real HTTP login: configured exact trusted proxy isolates client IPs',async t=>{
  const {post}=await createFixture(t,{trustedProxyIps:'127.0.0.1'});
  for(let i=0;i<LOGIN_CLIENT_LIMIT;i++){
    const response=await post('/api/auth/login',{
      email:'unknown'+i+'@fixture.invalid',password:'wrong'
    },{'X-Forwarded-For':'192.0.2.'+(i%200+1)+', 203.0.113.41'});
    assert.equal(response.status,401);
  }
  const blocked=await post('/api/auth/login',{
    email:'unique-rejected@fixture.invalid',password:'wrong'
  },{'X-Forwarded-For':'198.51.100.200, 203.0.113.41'});
  assert.equal(blocked.status,429,'Spoofed prefix must not evade the trusted client bucket');

  const other=await post('/api/auth/login',{
    email:'another-unique@fixture.invalid',password:'wrong'
  },{'X-Forwarded-For':'203.0.113.42'});
  assert.equal(other.status,401,'Another real client IP is independent');
});

test('malformed JSON and CSRF are still bounded or denied at the server boundary',async t=>{
  const {post}=await createFixture(t);
  const invalid=await post('/api/auth/login',{
    email:'invalid-email',password:'wrong'
  });
  assert.equal(invalid.status,400);
  const badOrigin=await post('/api/auth/login',{
    email:'someone@fixture.invalid',password:'wrong'
  },{Origin:'https://attacker.example'});
  assert.equal(badOrigin.status,403);
});

test('misconfigured trusted proxy refuses startup before opening SQLite',t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'studio-invalid-proxy-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const filename=path.join(dir,'should-not-exist.sqlite');
  assert.throws(()=>createStudioServer({seedProjects:true,
    filename,origin:'http://127.0.0.1:44695',
    previewOrigin:'http://127.0.0.1:44696',
    trustedProxyIps:'172.16.0.0/12'
  }),/STUDIO_TRUSTED_PROXY_IPS/);
  assert.equal(existsSync(filename),false);
});
