import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync, existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';
import {openStore} from './store.mjs';
import {inspectSchema} from './deploy/schema-preflight.mjs';

function fixture(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-schema-readonly-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const filename = path.join(dir, 'studio.sqlite');
  const db = openStore(filename);
  db.close();
  return filename;
}

function writeForTest(filename, callback) {
  const db = new DatabaseSync(filename);
  try {callback(db);}
  finally {db.close();}
}

test('R23 legacy-v0 baseline is recognized with no migration', t => {
  const filename = fixture(t);
  const before = new DatabaseSync(filename, {readOnly: true});
  const countBefore = before.prepare('SELECT count(*) AS n FROM projects').get().n;
  before.close();

  const report = inspectSchema(filename);
  assert.equal(report.status, 'PASS');
  assert.equal(report.userVersion, 0);
  assert.equal(report.foreignKeyFailures, 0);
  assert.equal(report.migrationPerformed, false);
  assert.equal(report.observedObjects, 25);

  const after = new DatabaseSync(filename, {readOnly: true});
  try {
    assert.equal(after.prepare('PRAGMA user_version').get().user_version, 0);
    assert.equal(after.prepare('SELECT count(*) AS n FROM projects').get().n, countBefore);
  } finally {after.close();}
});

test('unknown user_version must block rather than migrate', t => {
  const filename = fixture(t);
  writeForTest(filename, db => db.exec('PRAGMA user_version=5'));
  const report = inspectSchema(filename);
  assert.equal(report.status, 'BLOCKED');
  assert.equal(report.userVersion, 5);
  assert.equal(report.migrationPerformed, false);
});

test('missing table is detected without auto-creating it', t => {
  const filename = fixture(t);
  writeForTest(filename, db => {
    db.exec('PRAGMA foreign_keys=OFF');
    db.exec('DROP TABLE change_notes');
  });
  const result = inspectSchema(filename);
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.missingObjects.includes('table:change_notes'));
  const after = new DatabaseSync(filename, {readOnly: true});
  try {
    assert.equal(after.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name='change_notes'").get().n, 0);
  } finally {after.close();}
});

test('index and SQL constraint drift are detected', t => {
  const filename = fixture(t);
  writeForTest(filename, db => db.exec('DROP INDEX messages_channel'));
  const report = inspectSchema(filename);
  assert.equal(report.status, 'BLOCKED');
  assert.ok(report.missingObjects.includes('index:messages_channel'));
});

test('foreign-key corruption is reported without leaking row content', t => {
  const filename = fixture(t);
  writeForTest(filename, db => {
    db.exec('PRAGMA foreign_keys=OFF');
    db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(
      'orphan', 'nonexistent', 'Fixture task', '', 'todo', 'Normal', null, 0
    );
  });
  const result = inspectSchema(filename);
  assert.equal(result.status, 'BLOCKED');
  assert.ok(result.foreignKeyFailures > 0);
  assert.equal(JSON.stringify(result).includes('Fixture task'), false);
});

test('missing database is never created by read-only schema inspector', t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'studio-schema-absent-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const filename = path.join(dir, 'absent.sqlite');
  assert.throws(() => inspectSchema(filename), /ENOENT/);
  assert.equal(existsSync(filename), false);
});
