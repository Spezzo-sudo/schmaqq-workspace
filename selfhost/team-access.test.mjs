import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createInvite,digest,passwordHash,token as makeToken} from './store.mjs';
import {createStudioServer} from './server.mjs';

test('Studio is invitation-only: owner invites, members propose, removed members are locked out', async t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-team-access-'));
  const origin = 'http://127.0.0.1:44685';
  const app = createStudioServer({seedProjects:false, filename:path.join(dir,'fixture.sqlite'), origin, previewOrigin:'http://127.0.0.1:44686'});
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
  assert.equal(memberRow.email,'member@fixture.invalid');
  const memberView=(await call('GET','/api/workspace',undefined,member.cookie)).body.members;
  assert.equal(memberView.find(p=>p.id===memberRow.id).email,'member@fixture.invalid');
  assert.equal(memberView.find(p=>p.id===ownerRow.id).name,'Owner');
  assert.equal(Object.hasOwn(memberView.find(p=>p.id===ownerRow.id),'email'),false);


  // General invitations create a Studio account with an empty project list.
  const create = async (title,cookie) => {
    const response = await call('POST','/api/room',{action:'create',id:randomUUID(),title},cookie);
    assert.equal(response.status,200);
    return response.body.project;
  };
  const a=await create('Erstes Projekt',owner.cookie);
  const b=await create('Zweites Projekt',owner.cookie);
  const privateProject=await create('Privates Projekt',owner.cookie);
  const lists=async cookie=>(await call('GET','/api/rooms',undefined,cookie)).body.rooms.map(p=>p.id).sort();
  assert.deepEqual(await lists(member.cookie),[]);
  const memberProject=await create('Projekt von Member',member.cookie);
  assert.deepEqual(await lists(member.cookie),[memberProject]);
  assert.equal((await call('POST','/api/invites',{email:'forbidden@fixture.invalid',project:a},member.cookie)).status,403);
  assert.equal((await call('POST','/api/invites',{email:'forbidden@fixture.invalid',projects:[memberProject]},member.cookie)).status,403);
  assert.equal((await call('POST','/api/invites',{email:'forbidden@fixture.invalid',projects:[memberProject]},owner.cookie)).status,403);

  // The project lead can invite straight into their own project without waiting for the owner.
  const single=await call('POST','/api/invites',{email:'single@fixture.invalid',project:memberProject},member.cookie);
  assert.equal(single.status,200);
  const joined=await call('POST','/api/auth/register',{invite:token(single.body.link),name:'Single',password});
  assert.deepEqual(joined.body,{ok:true,project:memberProject});
  assert.deepEqual(await lists(joined.cookie),[memberProject]);
  assert.equal((await call('GET','/api/room?project='+privateProject,undefined,joined.cookie)).status,403);

  // The owner chooses multiple projects; duplicate selections give only one membership.
  const multi=await call('POST','/api/invites',{email:'multi@fixture.invalid',projects:[a,b,b]},owner.cookie);
  assert.equal(multi.status,200);
  const choices=await call('GET','/api/invites',undefined,owner.cookie);
  assert.deepEqual(choices.body.projects.map(p=>p.id).sort(),[a,b,privateProject].sort());
  assert.deepEqual(choices.body.invites.find(i=>i.email==='multi@fixture.invalid').projects,['Erstes Projekt','Zweites Projekt']);
  const multiJoined=await call('POST','/api/auth/register',{invite:token(multi.body.link),name:'Multi',password});
  assert.deepEqual(multiJoined.body,{ok:true});
  assert.deepEqual(await lists(multiJoined.cookie),[a,b].sort());

  const revoked=await call('POST','/api/invites',{email:'revoked@fixture.invalid',project:memberProject},member.cookie);
  const scoped=await call('GET','/api/invites?project='+memberProject,undefined,member.cookie);
  assert.equal(scoped.body.invites.length,1);
  assert.equal((await call('POST','/api/invites/withdraw',{project:memberProject,id:scoped.body.invites[0].id},joined.cookie)).status,403);
  assert.equal((await call('POST','/api/invites/withdraw',{project:memberProject,id:scoped.body.invites[0].id},member.cookie)).status,200);
  assert.equal((await call('POST','/api/auth/register',{invite:token(revoked.body.link),name:'Revoked',password})).status,403);

  assert.equal((await call('POST','/api/auth/photo',{jpeg:'ZmFrZQ=='},member.cookie)).status,400);
  const photoMeta='member:v1:photo:'+memberRow.id;
  app.db.prepare('INSERT INTO workspace_meta VALUES(?,?)').run(photoMeta,JSON.stringify({revision:'fixture',jpeg:'ZmFrZQ=='}));
  const photoPath='/api/auth/photo?member='+memberRow.id;
  const getPhoto=(path,cookie)=>fetch(base+path,{headers:{Cookie:cookie}});
  assert.equal((await getPhoto(photoPath,joined.cookie)).status,404);
  assert.equal((await getPhoto(photoPath+'&project='+privateProject,joined.cookie)).status,404);
  assert.equal((await getPhoto(photoPath+'&project='+memberProject,joined.cookie)).headers.get('content-type'),'image/jpeg');
  assert.equal((await getPhoto(photoPath,member.cookie)).status,200);
  assert.equal((await call('POST','/api/auth/photo',{jpeg:null},member.cookie)).status,200);
  assert.equal((await getPhoto(photoPath,member.cookie)).status,404);

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

  // An e-mail address is mandatory, and is normalized for sign-in.
  assert.equal((await call('POST','/api/invites',{email:'x'},owner.cookie)).status,400);
  assert.equal((await call('POST','/api/invites',{email:'Lena.K'},owner.cookie)).status,400);
  assert.throws(()=>createInvite(app.db,'Lena.K'));
  const pendingWithoutEmail=makeToken();
  app.db.prepare('INSERT INTO invites VALUES(?,?,?,?)').run(digest(pendingWithoutEmail),'old-name','member',Date.now()+60000);
  assert.equal((await call('POST','/api/auth/register',{invite:pendingWithoutEmail,name:'Alt',password})).status,403);
  app.db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(randomUUID(),'Altes Konto','legacy-login',passwordHash(password),'member',Date.now());
  assert.equal((await call('POST','/api/auth/login',{email:'legacy-login',password})).status,200);

  const named = await call('POST','/api/invites',{email:'Lena.K@fixture.invalid'},owner.cookie);
  assert.equal(named.status,200);
  assert.equal((await call('POST','/api/auth/register',{invite:token(named.body.link),name:'Lena',password})).status,200);
  const lena = await call('POST','/api/auth/login',{email:'lena.k@fixture.invalid',password});
  assert.equal(lena.status,200);

  // Changing your own password needs the old one; other sign-ins end, this one stays.
  const second = await call('POST','/api/auth/login',{email:'lena.k@fixture.invalid',password});
  assert.equal((await call('POST','/api/auth/password',{current:'wrong-password-123',password:'new-fixture-password-1'},lena.cookie)).status,403);
  assert.equal((await call('POST','/api/auth/password',{current:password,password:'new-fixture-password-1'},lena.cookie)).status,200);
  assert.equal((await call('GET','/api/workspace',undefined,lena.cookie)).status,200);
  assert.equal((await call('GET','/api/workspace',undefined,second.cookie)).status,401);
  assert.equal((await call('POST','/api/auth/login',{email:'lena.k@fixture.invalid',password:'new-fixture-password-1'})).status,200);

  // The owner cannot request a password link; older owner-issued links are invalid too.
  const lenaId = app.db.prepare("SELECT id FROM members WHERE email='lena.k@fixture.invalid'").get().id;
  assert.equal((await call('POST','/api/members/reset',{member:lenaId},owner.cookie)).status,404);
  const raw = makeToken(),hash=digest(raw),expires=Date.now()+60000;
  const put=app.db.prepare('INSERT INTO workspace_meta VALUES(?,?)');
  put.run('password-recovery:member:'+lenaId,JSON.stringify({hash,expires}));
  put.run('password-recovery:token:'+hash,JSON.stringify({member:lenaId,expires,byOwner:true}));
  assert.equal((await call('POST','/api/auth/recovery/confirm',{token:raw,password:'reset-fixture-password-2'})).status,400);
  assert.equal((await call('POST','/api/auth/login',{email:'lena.k@fixture.invalid',password:'new-fixture-password-1'})).status,200);

  // Removing a member ends the session at once and blocks a new login; the owner cannot be removed.
  assert.equal((await call('POST','/api/members/remove',{member:ownerRow.id},owner.cookie)).status,400);
  assert.equal((await call('POST','/api/members/remove',{member:ownerRow.id},member.cookie)).status,403);
  assert.equal((await call('POST','/api/members/remove',{member:memberRow.id},owner.cookie)).status,200);
  assert.equal((await call('GET','/api/workspace',undefined,member.cookie)).status,401);
  assert.equal((await call('POST','/api/auth/login',{email:'member@fixture.invalid',password})).status,401);
  assert.equal((await call('GET','/api/workspace',undefined,owner.cookie)).body.members.find(p=>p.id===memberRow.id).removed,1);
});
