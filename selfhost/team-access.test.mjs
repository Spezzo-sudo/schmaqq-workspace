import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createInvite} from './store.mjs';
import {createStudioServer} from './server.mjs';

test('Studio is invitation-only: owner invites, members propose, removed members are locked out', async t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-team-access-'));
  const origin = 'http://127.0.0.1:44685';
  const app = createStudioServer({seedProjects:true, filename:path.join(dir,'fixture.sqlite'), origin, previewOrigin:'http://127.0.0.1:44686'});
  await new Promise((resolve, reject) => {app.server.once('error', reject);app.server.listen(0, '127.0.0.1', resolve);});
  t.after(async () => {await new Promise(resolve => app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const call = async (method, route, payload, cookie) => {
    const r = await fetch(base + route, {method, headers:{...(payload!==undefined?{'Content-Type':'application/json'}:{}),Origin:origin,...(cookie?{Cookie:cookie}:{})}, ...(payload!==undefined?{body:JSON.stringify(payload)}:{})});
    return {status:r.status, body:await r.json(), cookie:r.headers.get('set-cookie')?.split(';')[0]};
  };
  const token = link => new URL(link).searchParams.get('invite');
  const password = 'fixture-password-123';

  // No invitation, no account: made-up or reused links never work.
  assert.equal((await call('POST','/api/auth/register',{invite:'x'.repeat(43),name:'Fremd',password})).status,403);
  const owner = await call('POST','/api/auth/register',{invite:createInvite(app.db,'owner@fixture.invalid','owner'),name:'Owner',password});
  assert.equal(owner.status,200);

  // Owner invites: link valid 24 h, used once, remembers who invited.
  const created = await call('POST','/api/invites',{email:'Member@Fixture.invalid'},owner.cookie);
  assert.equal(created.status,200);
  const list = await call('GET','/api/invites',undefined,owner.cookie);
  assert.equal(list.body.invites.length,1);
  assert.equal(list.body.invites[0].email,'member@fixture.invalid');
  assert.ok(list.body.invites[0].expires<=Date.now()+24*3600000);
  const member = await call('POST','/api/auth/register',{invite:token(created.body.link),name:'Member',password},undefined);
  assert.equal(member.status,200);
  assert.equal((await call('POST','/api/auth/register',{invite:token(created.body.link),name:'Again',password})).status,403);
  const people = (await call('GET','/api/workspace',undefined,owner.cookie)).body.members;
  const memberRow = people.find(p=>p.name==='Member'),ownerRow = people.find(p=>p.name==='Owner');
  assert.equal(memberRow.invitedBy,ownerRow.id);

  // A member cannot create links, only propose; the owner decides.
  const proposal = await call('POST','/api/invites',{email:'friend@fixture.invalid'},member.cookie);
  assert.deepEqual(proposal.body,{requested:true});
  assert.equal((await call('POST','/api/invites',{email:'friend@fixture.invalid'},member.cookie)).status,409);
  assert.equal((await call('POST','/api/invites/withdraw',{id:'a'.repeat(64)},member.cookie)).status,403);
  const pending = (await call('GET','/api/invites',undefined,owner.cookie)).body.requests;
  assert.equal(pending.length,1);assert.equal(pending[0].by,'Member');
  assert.equal((await call('POST','/api/invites/decide',{id:pending[0].id,approve:true},member.cookie)).status,403);
  const approved = await call('POST','/api/invites/decide',{id:pending[0].id,approve:true},owner.cookie);
  assert.equal(approved.status,200);
  assert.equal((await call('POST','/api/invites/decide',{id:pending[0].id,approve:true},owner.cookie)).status,404);

  // Withdrawn invitations stop working.
  const open = (await call('GET','/api/invites',undefined,owner.cookie)).body.invites.find(i=>i.email==='friend@fixture.invalid');
  assert.equal(open.invitedBy,'Member');
  assert.equal((await call('POST','/api/invites/withdraw',{id:open.id},owner.cookie)).status,200);
  assert.equal((await call('POST','/api/auth/register',{invite:token(approved.body.link),name:'Friend',password})).status,403);

  // A user name instead of an e-mail address works for invitation and sign-in.
  assert.equal((await call('POST','/api/invites',{email:'x'},owner.cookie)).status,400);
  const named = await call('POST','/api/invites',{email:'Lena.K'},owner.cookie);
  assert.equal(named.status,200);
  assert.equal((await call('POST','/api/auth/register',{invite:token(named.body.link),name:'Lena',password})).status,200);
  const lena = await call('POST','/api/auth/login',{email:'lena.k',password});
  assert.equal(lena.status,200);

  // Changing your own password needs the old one; other sign-ins end, this one stays.
  const second = await call('POST','/api/auth/login',{email:'lena.k',password});
  assert.equal((await call('POST','/api/auth/password',{current:'wrong-password-123',password:'new-fixture-password-1'},lena.cookie)).status,403);
  assert.equal((await call('POST','/api/auth/password',{current:password,password:'new-fixture-password-1'},lena.cookie)).status,200);
  assert.equal((await call('GET','/api/workspace',undefined,lena.cookie)).status,200);
  assert.equal((await call('GET','/api/workspace',undefined,second.cookie)).status,401);
  assert.equal((await call('POST','/api/auth/login',{email:'lena.k',password:'new-fixture-password-1'})).status,200);

  // Forgotten password: only the owner creates a one-time link; it sets a new password once.
  const lenaId = app.db.prepare("SELECT id FROM members WHERE email='lena.k'").get().id;
  assert.equal((await call('POST','/api/members/reset',{member:lenaId},member.cookie)).status,403);
  const reset = await call('POST','/api/members/reset',{member:lenaId},owner.cookie);
  const raw = new URL(reset.body.link).hash.replace('#reset=','');
  assert.equal((await call('POST','/api/auth/recovery/confirm',{token:raw,password:'reset-fixture-password-2'})).status,200);
  assert.equal((await call('POST','/api/auth/recovery/confirm',{token:raw,password:'reset-fixture-password-3'})).status,400);
  assert.equal((await call('POST','/api/auth/login',{email:'lena.k',password:'reset-fixture-password-2'})).status,200);

  // Removing a member ends the session at once and blocks a new login; the owner cannot be removed.
  assert.equal((await call('POST','/api/members/remove',{member:ownerRow.id},owner.cookie)).status,400);
  assert.equal((await call('POST','/api/members/remove',{member:ownerRow.id},member.cookie)).status,403);
  assert.equal((await call('POST','/api/members/remove',{member:memberRow.id},owner.cookie)).status,200);
  assert.equal((await call('GET','/api/workspace',undefined,member.cookie)).status,401);
  assert.equal((await call('POST','/api/auth/login',{email:'member@fixture.invalid',password})).status,401);
  assert.equal((await call('GET','/api/workspace',undefined,owner.cookie)).body.members.find(p=>p.id===memberRow.id).removed,1);
});
