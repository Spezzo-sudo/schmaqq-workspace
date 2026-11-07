import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {verifyRelease} from './deploy/verify-release.mjs';
import {packArchive} from './release-archive.mjs';

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
  symlinkSync(path.join(f.directory, process.platform === 'win32' ? 'studio-dist' : 'studio-dist/index.html'),
    path.join(f.directory, 'link.txt'), process.platform === 'win32' ? 'junction' : 'file');
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
  execFileSync('tar', ['-czf', archive, '-C', f.directory, '.']);
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

test('rejects a valid extracted release paired with a different pinned archive', async t => {
  const original = fixture(t);
  const changed = fixture(t);
  const htmlPath = path.join(changed.directory, 'studio-dist/index.html');
  const altered = '<h1>Different release</h1>';
  writeFileSync(htmlPath, altered);
  const manifestPath = path.join(changed.directory, 'release-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entry = manifest.files.find(file => file.path === 'studio-dist/index.html');
  entry.bytes = Buffer.byteLength(altered);
  entry.sha256 = sha(altered);
  writeFileSync(manifestPath, JSON.stringify(manifest));

  const archive = path.join(original.folder, 'original.tar.gz');
  execFileSync('tar', ['-czf', archive, '-C', original.directory, '.']);
  const archiveSha256 = sha(readFileSync(archive));

  await assert.rejects(verifyRelease({
    directory: changed.directory, expectedSource: commit, archive, archiveSha256
  }), /tar member differs/);
});

test('archives from the release packer verify on every platform, including paths over 100 characters', async t => {
  const f = fixture(t);
  // GNU tar on Linux would store such a path as an "@LongLink" entry, which the verifier refuses.
  const long = 'node_modules/@scope/' + 'very-long-package-name-'.repeat(3) + '/dist/esm/' + 'nested-module-file-name'.repeat(2) + '.js';
  assert.ok(long.length > 100 && long.length < 250);
  const content = 'export default 1;\n';
  mkdirSync(path.join(f.directory, path.dirname(long)), {recursive: true});
  writeFileSync(path.join(f.directory, long), content);
  const manifestPath = path.join(f.directory, 'release-manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.files.push({path: long, bytes: Buffer.byteLength(content), sha256: sha(content)});
  writeFileSync(manifestPath, JSON.stringify(manifest));
  const archive = path.join(f.folder, 'packed.tar.gz');
  packArchive(archive, f.directory);
  const result = await verifyRelease({directory: f.directory, expectedSource: commit, archive, archiveSha256: sha(readFileSync(archive))});
  assert.equal(result.status, 'PASS');
  assert.equal(result.files, 3);
});
