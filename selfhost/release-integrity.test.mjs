import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {verifyRelease} from './deploy/verify-release.mjs';

const sha = content => createHash('sha256').update(content).digest('hex');
const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const lock = 'c'.repeat(64);

function fixture(t, legacy = false) {
  const folder = mkdtempSync(path.join(os.tmpdir(), 'schmaqq-release-integrity-'));
  t.after(() => rmSync(folder, {recursive: true, force: true}));
  const directory = path.join(folder, 'release');
  mkdirSync(directory);
  const payload = {'studio-dist/index.html': '<h1>Studio</h1>'};
  if (!legacy) payload['release-source.json'] = JSON.stringify({
    format: 1, sourceCommit: commit, sourceTree: tree, lockSha256: lock
  });
  for (const [name, data] of Object.entries(payload)) {
    const destination = path.join(directory, name);
    mkdirSync(path.dirname(destination), {recursive: true});
    writeFileSync(destination, data);
  }
  const files = Object.entries(payload).map(([name, data]) => ({
    path: name, bytes: Buffer.byteLength(data), sha256: sha(data)
  }));
  writeFileSync(path.join(directory, 'release-manifest.json'), JSON.stringify({version: 'test', files}));
  return {folder, directory, files};
}

test('strict verifier checks embedded source identity and hashes', async t => {
  const f = fixture(t);
  const result = await verifyRelease({directory: f.directory, expectedSource: commit});
  assert.equal(result.status, 'PASS');
  assert.equal(result.files, 2);
  assert.equal(result.sourceAttestation, 'embedded');
});
test('rejects an incorrect source commit', async t => {
  const f = fixture(t);
  await assert.rejects(verifyRelease({directory: f.directory, expectedSource: 'd'.repeat(40)}), /source attestation/);
});
test('rejects a modified release file', async t => {
  const f = fixture(t);
  writeFileSync(path.join(f.directory, 'studio-dist/index.html'), 'tampered');
  await assert.rejects(verifyRelease({directory: f.directory, expectedSource: commit}), /hash mismatch/);
});
test('rejects an unexpected file not covered by manifest', async t => {
  const f = fixture(t);
  writeFileSync(path.join(f.directory, 'unexpected.txt'), 'unexpected');
  await assert.rejects(verifyRelease({directory: f.directory, expectedSource: commit}), /missing or unexpected/);
});
test('rejects symlinks inside a release directory', async t => {
  const f = fixture(t);
  symlinkSync(path.join(f.directory, 'studio-dist/index.html'), path.join(f.directory, 'link.txt'));
  await assert.rejects(verifyRelease({directory: f.directory, expectedSource: commit}), /symlinks/);
});
test('rejects duplicate manifest paths', async t => {
  const f = fixture(t);
  const manifestPath = path.join(f.directory, 'release-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.files.push(manifest.files[0]);
  writeFileSync(manifestPath, JSON.stringify(manifest));
  await assert.rejects(verifyRelease({directory: f.directory, expectedSource: commit}), /duplicated/);
});
test('old R23-style manifests fail without explicitly pinned legacy archive', async t => {
  const f = fixture(t, true);
  await assert.rejects(verifyRelease({directory: f.directory, expectedSource: commit}), /legacy source/);
});
test('legacy archive can be checked but source remains externally attested', async t => {
  const f = fixture(t, true);
  const archive = path.join(f.folder, 'fixture.tar.gz');
  writeFileSync(archive, Buffer.from('opaque external archive fixture'));
  const archiveSha256 = sha(readFileSync(archive));
  const result = await verifyRelease({
    directory: f.directory, expectedSource: commit, archive, archiveSha256, allowLegacy: true
  });
  assert.equal(result.sourceAttestation, 'legacy-external-only');
  assert.equal(result.archiveSha256, archiveSha256);
});
test('rejects a mismatched archive digest', async t => {
  const f = fixture(t);
  const archive = path.join(f.folder, 'fixture.tar.gz');
  writeFileSync(archive, Buffer.from('opaque external archive fixture'));
  await assert.rejects(verifyRelease({
    directory: f.directory, expectedSource: commit, archive, archiveSha256: '0'.repeat(64)
  }), /archive SHA256 mismatch/);
});
