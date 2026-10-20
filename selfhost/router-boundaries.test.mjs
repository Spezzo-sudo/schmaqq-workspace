import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createInvite} from './store.mjs';
import {createStudioServer} from './server.mjs';

test('extracted auth and workspace routes preserve the HTTP and role contract', async t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-routing-regression-'));
  const origin = 'http://127.0.0.1:44675';
  const app = createStudioServer({
    filename: path.join(dir, 'fixture.sqlite'),
    origin,
    previewOrigin: 'http://127.0.0.1:44676'
  });

  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise(resolve => app.server.close(resolve));
    app.db.close();
    rmSync(dir, {recursive: true, force: true});
  });

  const base = 'http://127.0.0.1:' + app.server.address().port;
  const request = async (method, route, payload, cookie, includeOrigin = true) => {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(payload !== undefined ? {'Content-Type':'application/json'} : {}),
        ...(includeOrigin ? {Origin:origin} : {}),
        ...(cookie ? {Cookie:cookie} : {})
      },
      ...(payload !== undefined ? {body:JSON.stringify(payload)} : {})
    });
    const result = await response.json();
    return {
      status: response.status, result,
      cookie: response.headers.get('set-cookie')?.split(';')[0]
    };
  };

  assert.equal((await request('GET','/api/workspace')).status, 401);
  assert.equal((await request('GET','/api/auth/session')).status, 401);

  const invitation = createInvite(app.db, 'owner@fixture.invalid', 'owner');
  const owner = await request('POST', '/api/auth/register', {
    invite: invitation, name: 'Fixture Owner', password: 'strong-fixture-passphrase'
  });
  assert.equal(owner.status, 200);
  assert.ok(owner.cookie?.startsWith('studio_session='));

  const session = await request('GET', '/api/auth/session', undefined, owner.cookie);
  assert.equal(session.status, 200);
  assert.equal(session.result.user.email, 'owner@fixture.invalid');
  assert.equal(session.result.user.role, 'owner');

  const noOrigin = await request('POST','/api/workspace',{
    action:'message',id:'no-origin',channel:'general',body:'No'
  },owner.cookie,false);
  assert.equal(noOrigin.status,403);

  const create = await request('POST','/api/workspace',{
    action:'project',title:'Refactor project',description:'Tests only',color:'sage',stage:'Im Aufbau'
  },owner.cookie);
  assert.equal(create.status,200);

  let workspace = await request('GET','/api/workspace',undefined,owner.cookie);
  assert.equal(workspace.status,200);
  const project = workspace.result.projects.find(p=>p.title==='Refactor project');
  assert.ok(project);

  const addTask = await request('POST','/api/workspace',{
    action:'task',project:project.id,title:'Review the route split',
    description:'',priority:'Normal',assignee:null
  },owner.cookie);
  assert.equal(addTask.status,200);

  const message = {action:'message',id:'same-message-id',channel:'general',body:'hello'};
  assert.equal((await request('POST','/api/workspace',message,owner.cookie)).status,200);
  assert.equal((await request('POST','/api/workspace',message,owner.cookie)).status,200);
  workspace = await request('GET','/api/workspace',undefined,owner.cookie);
  assert.equal(workspace.result.messages.filter(m=>m.id===message.id).length,1);
  assert.equal(workspace.result.tasks.filter(t=>t.project===project.id).length,1);

  const addedDocument = await request('POST','/api/workspace',{
    action:'document',title:'Doc',body:'First'
  },owner.cookie);
  assert.equal(addedDocument.status,200);
  workspace = await request('GET','/api/workspace',undefined,owner.cookie);
  const doc = workspace.result.documents.find(d=>d.title==='Doc');
  assert.ok(doc);
  assert.equal((await request('POST','/api/workspace',{
    action:'document',id:doc.id,title:'New',body:'Stale',revision:2
  },owner.cookie)).status,409);

  const memberInvite = createInvite(app.db,'member@fixture.invalid','member');
  const member = await request('POST','/api/auth/register',{
    invite:memberInvite,name:'Fixture Member',password:'another-safe-fixture-secret'
  });
  assert.equal(member.status,200);
  assert.equal((await request('POST','/api/invites',{
    email:'other@fixture.invalid'
  },member.cookie)).status,403);

  const logout = await request('POST','/api/auth/logout',{},owner.cookie);
  assert.equal(logout.status,200);
  assert.equal((await request('GET','/api/auth/session',undefined,owner.cookie)).status,401);
});
