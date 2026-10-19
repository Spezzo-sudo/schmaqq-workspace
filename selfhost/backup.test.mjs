import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync, mkdirSync, rmSync, statSync, chmodSync, symlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

const backupScript = fileURLToPath(new URL('./backup.mjs', import.meta.url));

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'schmaqq-backup-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const db = new DatabaseSync(path.join(root, 'studio.sqlite'));
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;' +
          'CREATE TABLE project (id TEXT PRIMARY KEY);' +
          'CREATE TABLE task (id TEXT PRIMARY KEY, project TEXT REFERENCES project(id));');
  db.prepare('INSERT INTO project VALUES(?)').run('pilot');
  db.prepare('INSERT INTO task VALUES(?,?)').run('task-1', 'pilot');
  db.close();
  return root;
}

function run(root, destination) {
  return spawnSync(process.execPath, [backupScript, destination], {
    env: {...process.env, STUDIO_DATA_DIR: root},
    encoding: 'utf8', timeout: 20000
  });
}

test('consistent SQLite snapshot has private permissions and intact data', t => {
  const root = fixture(t);
  const dest = path.join(root, 'protected', 'backup.sqlite');
  const result = run(root, dest);
  assert.equal(result.status, 0, result.stderr);
  const info = JSON.parse(result.stdout);
  assert.equal(info.integrity, 'ok');
  assert.equal(info.foreignKeyFailures, 0);
  if (process.platform !== 'win32') {
    assert.equal(statSync(dest).mode & 0o777, 0o600);
    assert.equal(statSync(path.dirname(dest)).mode & 0o777, 0o700);
  }
  const db = new DatabaseSync(dest, {readOnly: true});
  try {
    assert.equal(db.prepare('SELECT count(*) AS n FROM project').get().n, 1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM task').get().n, 1);
  } finally {db.close();}
});
test('never overwrites an existing backup', t => {
  const root = fixture(t);
  const dest = path.join(root, 'backup.sqlite');
  assert.equal(run(root, dest).status, 0);
  const second = run(root, dest);
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /already exists/);
});
test('refuses a database self-overwrite', t => {
  const root = fixture(t);
  const result = run(root, path.join(root, 'studio.sqlite'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must differ/);
});
test('rejects destination symbolic links, including dangling links', t => {
  const root = fixture(t);
  const dest = path.join(root, 'backup-link.sqlite');
  symlinkSync(path.join(root, 'absent.sqlite'), dest);
  const result = run(root, dest);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already exists/);
});
test('rejects a symlinked destination parent', t => {
  const root = fixture(t);
  const privateDir = path.join(root, 'private');
  mkdirSync(privateDir, {mode: 0o700});
  const link = path.join(root, 'alias');
  symlinkSync(privateDir, link, 'dir');
  const result = run(root, path.join(link, 'backup.sqlite'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symlinks/);
});
test('refuses to create an unverified backup when foreign keys are broken', t => {
  const root = fixture(t);
  const db = new DatabaseSync(path.join(root, 'studio.sqlite'));
  db.exec('PRAGMA foreign_keys=OFF;');
  db.prepare('INSERT INTO task VALUES(?,?)').run('orphan', 'missing');
  db.close();
  const result = run(root, path.join(root, 'invalid-backup.sqlite'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /validation failed/);
});

test('rejects a writable shared destination directory', t => {
  const root = fixture(t);
  const shared = path.join(root, 'shared');
  mkdirSync(shared);
  chmodSync(shared, 0o777);
  const result = run(root, path.join(shared, 'snapshot.sqlite'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /group\/world writable/);
});
