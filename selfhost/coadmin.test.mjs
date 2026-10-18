import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('co-admin rights: promotion is controlled, equal invite powers, no self-promotion or privilege downgrade',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-coadmin-'));
 const origin='http://127.0.0.1:44989';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44990'});
 await new Promise(resolve=>app.server.listen(44989,'127.0.0.1',resolve));
 async function req(route,value,cookie){
  const response=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:value?JSON.stringify(value):undefined});
  return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 try{
  async function account(name,role='member'){
   const email=name+'@example.invalid';
   const result=await req('/api/auth/register',{invite:createInvite(app.db,email,role),name,password:'test-password-12345'});
   assert.equal(result.status,200);
   const record=app.db.prepare('SELECT id,role FROM members WHERE email=?').get(email);
   return {...result,id:record.id};
  }
  const marco=await account('marco','owner');
  const markus=await account('markus');
  const guest=await account('guest');
  const payload={member:markus.id,action:'promote-admin'};
  assert.equal((await req('/api/admin/members',payload)).status,401);
  assert.equal((await req('/api/admin/members',payload,guest.cookie)).status,403);
  assert.equal((await req('/api/admin/members',{member:guest.id,action:'promote-admin'},markus.cookie)).status,403);
  assert.equal((await req('/api/admin/members',{member:marco.id,action:'promote-admin'},marco.cookie)).status,403);
  assert.equal((await req('/api/admin/members',{member:'unknown',action:'promote-admin'},marco.cookie)).status,404);
  assert.equal((await req('/api/admin/members',payload,marco.cookie)).status,200);
  assert.equal(app.db.prepare('SELECT role FROM members WHERE id=?').get(markus.id).role,'admin');
  assert.equal((await req('/api/admin/members',payload,marco.cookie)).status,409);
  assert.equal((await req('/api/auth/session',undefined,markus.cookie)).data.user.role,'admin');
  assert.equal((await req('/api/invites',{email:'invited-by-owner@example.invalid'},marco.cookie)).status,200);
  assert.equal((await req('/api/invites',{email:'invited-by-admin@example.invalid'},markus.cookie)).status,200);
  assert.equal((await req('/api/invites',{email:'blocked@example.invalid'},guest.cookie)).status,403);
  assert.equal((await req('/api/admin/members',{member:guest.id,action:'promote-admin'},markus.cookie)).status,200);
  assert.equal(app.db.prepare('SELECT role FROM members WHERE id=?').get(guest.id).role,'admin');
  assert.equal((await req('/api/admin/members',{member:marco.id,action:'promote-admin'},markus.cookie)).status,409);
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM activities WHERE body='Co-Administrator ernannt'").get().n,2);
 }finally{
  await new Promise(resolve=>app.server.close(resolve));
  app.db.close();
  rmSync(dir,{recursive:true,force:true});
 }
});
