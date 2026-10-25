import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createStudioServer} from './server.mjs';
import {createInvite, digest} from './store.mjs';
import {RESET_LIFETIME_MS, createResetMailer} from './password-recovery.mjs';

const ORIGIN='http://127.0.0.1:44735';
async function fixture(t,{mailer=true}={}) {
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-recovery-test-'));
 const clock={value:Date.now()};
 const emails=[];
 const sender=mailer?{
  async sendReset(detail){emails.push({kind:'reset',...detail});},
  async sendChanged(detail){emails.push({kind:'notice',...detail});}
 }:null;
 const app=createStudioServer({
  filename:path.join(dir,'studio.sqlite'),
  origin:ORIGIN,previewOrigin:'http://127.0.0.1:44736',
  resetMailer:sender,recoveryNow:()=>clock.value
 });
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const base='http://127.0.0.1:'+app.server.address().port;
 const post=async(route,body,headers={})=>{
  const r=await fetch(base+route,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 };
 const get=async(route,headers={})=>{
  const r=await fetch(base+route,{headers});
  return {status:r.status,data:await r.json()};
 };
 const wait=async(predicate)=>{
  for(let i=0;i<50&&!predicate();i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.ok(predicate(),'Expected asynchronous mail action');
 };
 const create=async(email='owner@fixture.invalid')=>{
  const invite=createInvite(app.db,email,'owner');
  const r=await post('/api/auth/register',{invite,name:'Fixture Owner',password:'original-password-2026'});
  assert.equal(r.status,200);
  return r;
 };
 return {app,post,get,wait,create,emails,clock,dir};
}

test('password recovery is unavailable without operator-owned SMTP config',async t=>{
 const f=await fixture(t,{mailer:false});
 assert.deepEqual((await f.get('/api/auth/recovery/status')).data,{available:false});
 const unknown=await f.post('/api/auth/recovery/request',{email:'unknown@fixture.invalid'});
 assert.equal(unknown.status,503);
 assert.ok(unknown.data.error.includes('nicht eingerichtet'));
 assert.equal(f.app.db.prepare("SELECT COUNT(*) AS n FROM workspace_meta WHERE key LIKE 'password-recovery:%'").get().n,0);
});

test('secure recovery: generic request, hashed one-use token, new password, session and runner revocation',async t=>{
 const f=await fixture(t);
 const owner=await f.create();
 f.app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,0,0)')
  .run('dev-fixture',f.app.db.prepare('SELECT id FROM members LIMIT 1').get().id,'old-runner',digest('device-secret'));
 f.app.db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)")
  .run('job-fixture',f.app.db.prepare('SELECT id FROM members LIMIT 1').get().id,'dev-fixture','website','check','{}','queued',Date.now());

 const unknown=await f.post('/api/auth/recovery/request',{email:'unknown@fixture.invalid'});
 const known=await f.post('/api/auth/recovery/request',{email:'OWNER@FIXTURE.INVALID'});
 assert.equal(unknown.status,200);assert.equal(known.status,200);
 assert.deepEqual(unknown.data,known.data,'Never reveal whether an account exists');
 await f.wait(()=>f.emails.filter(x=>x.kind==='reset').length===1);
 const email=f.emails.find(x=>x.kind==='reset');
 assert.equal(email.to,'owner@fixture.invalid');
 const link=new URL(email.link);
 assert.equal(link.origin,ORIGIN);
 assert.equal(link.search,'','Token must not be in HTTP query');
 const value=new URLSearchParams(link.hash.slice(1)).get('reset');
 assert.match(value,/^[a-zA-Z0-9_-]{43}$/);
 const hash=digest(value);
 assert.ok(f.app.db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('password-recovery:token:'+hash));
 assert.equal(f.app.db.prepare('SELECT COUNT(*) AS n FROM workspace_meta WHERE value LIKE ?').get('%'+value+'%').n,0,'Raw token never persisted');

 const oldSession=await f.get('/api/auth/session',{Cookie:owner.cookie});
 assert.equal(oldSession.status,200);
 const newPassword='new-unique-passphrase-2026!';
 const change=await f.post('/api/auth/recovery/confirm',{token:value,password:newPassword});
 assert.equal(change.status,200);
 assert.equal((await f.get('/api/auth/session',{Cookie:owner.cookie})).status,401);
 assert.equal(f.app.db.prepare('SELECT revoked FROM devices WHERE id=?').get('dev-fixture').revoked,1);
 assert.equal(f.app.db.prepare('SELECT status FROM jobs WHERE id=?').get('job-fixture').status,'cancelled');
 assert.equal(f.app.db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('password-recovery:token:'+hash),undefined);
 assert.equal((await f.post('/api/auth/recovery/confirm',{token:value,password:'some-other-pass-2026'})).status,400,'Single use');
 assert.equal((await f.post('/api/auth/login',{email:'owner@fixture.invalid',password:'original-password-2026'})).status,401);
 assert.equal((await f.post('/api/auth/login',{email:'owner@fixture.invalid',password:newPassword})).status,200);
 await f.wait(()=>f.emails.some(x=>x.kind==='notice'));
 assert.ok(!JSON.stringify(f.emails).includes(newPassword));
});

test('recovery refuses expired, forged, replayed links and cross-site requests',async t=>{
 const f=await fixture(t);
 await f.create();
 const cross=await f.post('/api/auth/recovery/request',{email:'owner@fixture.invalid'},{Origin:'https://evil.invalid'});
 assert.equal(cross.status,403);
 const req=await f.post('/api/auth/recovery/request',{email:'owner@fixture.invalid'});
 assert.equal(req.status,200);
 await f.wait(()=>f.emails.length===1);
 const token=new URLSearchParams(new URL(f.emails[0].link).hash.slice(1)).get('reset');
 const crossConfirm=await f.post('/api/auth/recovery/confirm',{token,password:'safe-new-password-2026'},{Origin:'https://evil.invalid'});
 assert.equal(crossConfirm.status,403);
 assert.equal((await f.post('/api/auth/recovery/confirm',{token:'A'.repeat(43),password:'safe-new-password-2026'})).status,400);
 f.clock.value+=RESET_LIFETIME_MS+1;
 assert.equal((await f.post('/api/auth/recovery/confirm',{token,password:'safe-new-password-2026'})).status,400);
 assert.equal((await f.post('/api/auth/login',{email:'owner@fixture.invalid',password:'original-password-2026'})).status,200);
});

test('recovery throttles repeated requests and does not invalidate the first live link',async t=>{
 const f=await fixture(t);
 await f.create();
 for(let i=0;i<6;i++) assert.equal((await f.post('/api/auth/recovery/request',{email:'owner@fixture.invalid'})).status,200);
 await f.wait(()=>f.emails.filter(x=>x.kind==='reset').length===1);
 assert.equal(f.emails.filter(x=>x.kind==='reset').length,1);
 const first=new URLSearchParams(new URL(f.emails[0].link).hash.slice(1)).get('reset');
 assert.equal((await f.post('/api/auth/recovery/confirm',{token:first,password:'safe-new-password-2026'})).status,200);
});

test('mailer config enforces all-or-nothing, implicit TLS and HTTPS before store opens',()=>{
 assert.equal(createResetMailer({env:{},origin:'https://studio.schmaqq.com'}),null);
 const env={STUDIO_RESET_SMTP_HOST:'smtp.hostinger.com',STUDIO_RESET_SMTP_USER:'studio@example.invalid',STUDIO_RESET_SMTP_PASSWORD:'mock'};
 assert.throws(()=>createResetMailer({env:{STUDIO_RESET_SMTP_HOST:'smtp.hostinger.com'},origin:'https://studio.schmaqq.com'}),/incomplete/);
 assert.throws(()=>createResetMailer({env:{...env,STUDIO_RESET_SMTP_PORT:'587'},origin:'https://studio.schmaqq.com'}),/TLS/);
 assert.throws(()=>createResetMailer({env,origin:'http://studio.schmaqq.com'}),/HTTPS/);
 const valid=createResetMailer({env,origin:'https://studio.schmaqq.com'});
 assert.equal(typeof valid.sendReset,'function');
});
