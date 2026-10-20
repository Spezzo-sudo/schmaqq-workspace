/**
 * CI-only release acceptance. Builds from clean HEAD, checks tar and unpacked
 * payload byte-for-byte and runs ephemeral, loopback-only Runtime smoke tests.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyRelease} from '../selfhost/deploy/verify-release.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function run(command,args,options={}) {
  return execFileSync(command,args,{
    cwd:root,encoding:'utf8',timeout:180000,
    maxBuffer:16*1024*1024,...options
  });
}
run(process.execPath,['scripts/r24-candidate-gate.mjs']);
const head=run('git',['rev-parse','HEAD']).trim();

const output=run(process.execPath,['selfhost/release.mjs']);
const metadataStart=output.lastIndexOf('\n{');
assert.ok(metadataStart>=0,'Packager did not emit expected metadata JSON');
const metadata=JSON.parse(output.slice(metadataStart+1));
assert.equal(metadata.sourceCommit,head,'Package source must match CI checkout');

const archive=path.resolve(metadata.archive);
const unpacked=mkdtempSync(path.join(os.tmpdir(),'schmaqq-r24-release-review-'));
try {
  const digest=createHash('sha256').update(readFileSync(archive)).digest('hex');
  run('tar',['-xzf',archive,'-C',unpacked]);
  const report=await verifyRelease({
    directory:unpacked,expectedSource:head,archive,archiveSha256:digest
  });
  assert.equal(report.status,'PASS');
  assert.equal(report.sourceAttestation,'embedded');
  assert.ok(report.files>=700,'Unexpectedly small release payload');

  const manifest=JSON.parse(readFileSync(
    path.join(unpacked,'release-manifest.json'),'utf8'));
  const entries=new Set(manifest.files.map(item=>item.path));
  for(const filename of [
    'release-source.json',
    'studio-dist/index.html',
    'selfhost/server.mjs',
    'selfhost/auth-http.mjs',
    'selfhost/workspace-http.mjs',
    'selfhost/backup.mjs',
    'selfhost/deploy/schema-migration.mjs',
    'selfhost/deploy/r24-local-backup.mjs',
    'selfhost/deploy/schema-baseline.v0.json',
    'selfhost/deploy/schema-auth-extension.v0.json'
  ]) assert.ok(entries.has(filename),'Required runtime file missing: '+filename);

  const provenance=JSON.parse(readFileSync(
    path.join(unpacked,'release-source.json'),'utf8'));
  const lockHash=createHash('sha256').update(
    readFileSync(path.join(root,'package-lock.json'))).digest('hex');
  assert.equal(provenance.lockSha256,lockHash,
    'Release lockfile attestation does not match tracked source');

  // This script creates synthetic users/tasks on an isolated SQLite path.
  // It has no access to real Studio user sessions or the service unit.
  const smoke=run(process.execPath,
    ['selfhost/release-smoke.mjs',unpacked],{timeout:180000});
  process.stdout.write(smoke);
  console.log(JSON.stringify({
    result:'PASS',sourceCommit:head,
    archiveSha256:digest,files:report.files,
    sourceAttestation:report.sourceAttestation,
    scope:'Ephemeral review only; NOT a deploy'
  },null,2));
} finally {
  rmSync(unpacked,{recursive:true,force:true});
}
