import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync, linkSync, symlinkSync, readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertPrivatePath, protectNewPrivatePath} from './private-path.mjs';
import {exposeFixture} from './private-path-test-support.mjs';

function fixture(t) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "schmaqq-private-'quoted-"));
  t.after(() => rmSync(dir, {recursive:true, force:true}));
  protectNewPrivatePath(dir);
  return dir;
}

test('private paths validate native access controls including quoted filenames', t => {
  const dir = fixture(t);
  const file = path.join(dir, "private ' data.txt");
  writeFileSync(file, 'synthetic', {mode:0o600});
  assertPrivatePath(dir);
  assertPrivatePath(file);
  assert.equal(readFileSync(file, 'utf8'), 'synthetic');
});

test('private path checks reject deliberately shared files and directories', t => {
  const dir = fixture(t);
  const file = path.join(dir, 'private.txt');
  writeFileSync(file, 'synthetic', {mode:0o600});
  exposeFixture(file, 0o644);
  assert.throws(() => assertPrivatePath(file), /private|Private/);
  // Read-only verification must not repair the unsafe ACL/mode.
  assert.throws(() => assertPrivatePath(file), /private|Private/);
  exposeFixture(dir);
  assert.throws(() => assertPrivatePath(dir), /private|Private/);
});

test('permission protection refuses hardlinks and directory reparse points', t => {
  const dir = fixture(t);
  const file = path.join(dir, 'private.txt');
  writeFileSync(file, 'synthetic', {mode:0o600});
  const hard = path.join(dir, 'hard.txt');
  linkSync(file, hard);
  assert.throws(() => protectNewPrivatePath(hard), /linked/);
  const linked = path.join(dir, 'linked');
  symlinkSync(dir, linked, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => protectNewPrivatePath(linked), /linked/);
});
