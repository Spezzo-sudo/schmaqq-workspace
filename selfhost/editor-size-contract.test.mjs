import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('Studio HTTP job contract supports 48 KB files and bounded escaped reads', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-large-editor-'));
  const origin = 'http://127.0.0.1:44584';
  const app = createStudioServer({seedProjects:true,
    filename: path.join(dir, 'studio.sqlite'), origin,
    previewOrigin: 'http://127.0.0.1:44585'
  });
  await new Promise((resolve, reject) => {
    app.server.once('error', reject);
    app.server.listen(44584, '127.0.0.1', resolve);
  });
  async function post(route, data, cookie = null, token = null) {
    const result = await fetch(origin + route, {
      method: 'POST',
      headers: {
        Origin: origin, 'Content-Type': 'application/json',
        ...(cookie ? {Cookie: cookie} : {}),
        ...(token ? {Authorization: 'Bearer ' + token} : {})
      },
      body: JSON.stringify(data)
    });
    return {status: result.status, data: await result.json(), cookie: result.headers.get('set-cookie')?.split(';')[0]};
  }
  try {
    const invite = createInvite(app.db, 'editor-owner@fixture.invalid', 'owner');
    const user = await post('/api/auth/register', {invite, name: 'Editor', password: 'fixture-password-12345'});
    assert.equal(user.status, 200);
    const device = await post('/api/development', {action: 'device', name: 'Fixture runner'}, user.cookie);
    assert.equal(device.status, 200);

    const prepare = await post('/api/development', {
      action: 'job', operation: 'prepare', project: 'website', device: device.data.id
    }, user.cookie);
    assert.equal(prepare.status, 200);
    const claimed = (await post('/api/runner/poll', {}, null, device.data.token)).data.job;
    assert.equal(claimed.id, prepare.data.id);
    const prepared = await post('/api/runner/report', {
      id: claimed.id, lease: claimed.lease, ok: true,
      result: {branch: 'studio/' + claimed.id, commit: 'a'.repeat(40)}
    }, null, device.data.token);
    assert.equal(prepared.status, 200);

    const content = '/* SCHMAQQ Studio */\n'.repeat(2400);
    assert.ok(Buffer.byteLength(content) > 34000 && Buffer.byteLength(content) < 65536);
    const save = await post('/api/development', {
      action: 'job', operation: 'save-file', project: 'website', device: device.data.id,
      worktree: prepare.data.id, file: 'app/workspace.tsx',
      content, revision: 'f'.repeat(64)
    }, user.cookie);
    assert.equal(save.status, 200, JSON.stringify(save.data));
    const saving = (await post('/api/runner/poll', {}, null, device.data.token)).data.job;
    assert.equal(saving.payload.content, content);
    assert.equal((await post('/api/runner/report', {
      id: saving.id, lease: saving.lease, ok: true,
      result: {file: 'app/workspace.tsx', revision: 'a'.repeat(64), saved: true}
    }, null, device.data.token)).status, 200);

    const rejected = await post('/api/development', {
      action: 'job', operation: 'save-file', project: 'website', device: device.data.id,
      worktree: prepare.data.id, file: 'app/workspace.tsx',
      content: 'x'.repeat(65537), revision: 'f'.repeat(64)
    }, user.cookie);
    assert.equal(rejected.status, 400);

    // Unicode code points can exceed the runner's byte bound while remaining
    // below Zod's JavaScript-character limit; reject *before* queueing a job.
    const unicodeTooLarge = await post('/api/development', {
      action: 'job', operation: 'save-file', project: 'website', device: device.data.id,
      worktree: prepare.data.id, file: 'app/workspace.tsx',
      content: '😀'.repeat(17000), revision: 'f'.repeat(64)
    }, user.cookie);
    assert.equal(unicodeTooLarge.status, 413);

    const reading = await post('/api/development', {
      action: 'job', operation: 'read-file', project: 'website', device: device.data.id,
      worktree: prepare.data.id, file: 'app/workspace.tsx'
    }, user.cookie);
    assert.equal(reading.status, 200);
    const readClaim = (await post('/api/runner/poll', {}, null, device.data.token)).data.job;
    const escaped = '\u0001'.repeat(65536);
    assert.equal((await post('/api/runner/report', {
      id: readClaim.id, lease: readClaim.lease, ok: true,
      result: {file: 'app/workspace.tsx', content: escaped, revision: 'b'.repeat(64)}
    }, null, device.data.token)).status, 200);
    const result = await fetch(origin + '/api/development/job?id=' + readClaim.id, {
      headers: {Cookie: user.cookie}
    });
    assert.equal(result.status, 200);
    const returned = await result.json();
    assert.equal(returned.job.result.content, escaped);
  } finally {
    await new Promise(resolve => app.server.close(resolve));
    app.db.close();
    rmSync(dir, {recursive: true, force: true});
  }
});
