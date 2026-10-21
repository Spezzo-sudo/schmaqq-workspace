import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {
  chmodSync, linkSync, mkdtempSync, mkdirSync, rmSync, readdirSync, readFileSync,
  writeFileSync, statSync, symlinkSync
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {openStore} from './store.mjs';
import {createOidcRoutes} from './oidc.mjs';
import {createConnectionRoutes} from './connections.mjs';
import {
  inventoryHistoricalTrees, compareAttestation, verifyExistingH2Backup
} from './deploy/r24-h3-scoped-recovery.mjs';
const backupScript=fileURLToPath(new URL('./deploy/r24-local-backup.mjs',import.meta.url));
const gateScript=fileURLToPath(new URL('./deploy/r24-h3-scoped-recovery.mjs',import.meta.url));
const candidateSha='1'.repeat(40);
const prevUmask=process.umask(0o077);
process.on('exit',()=>process.umask(prevUmask));

function fixture(t) {
  const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-r24h3-scoped-'));
  chmodSync(root,0o700);
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const db=openStore(path.join(root,'studio.sqlite'));
  const routes={db,origin:'http://127.0.0.1:55331',
    sessionCookie:'synthetic_scope',provider:null};
  createOidcRoutes(routes);
  createConnectionRoutes(routes);
  db.close();
  writeFileSync(path.join(root,'setup-link.txt'),'FIXTURE_SYNTHETIC_ONLY',
    {mode:0o600});
  mkdirSync(path.join(root,'backups'),{mode:0o700});
  chmodSync(path.join(root,'backups'),0o755);
  for(const name of ['restore-test','restore-tests']){
    mkdirSync(path.join(root,name),{mode:0o700});
    writeFileSync(path.join(root,name,'fixture.txt'),
      'HISTORIC_FIXTURE_DO_NOT_USE_AS_PRODUCTION',{mode:0o600});
  }
  chmodSync(path.join(root,'restore-tests'),0o755);
  return root;
}
function createH2Bundle(root) {
  const result=spawnSync(process.execPath,
    [backupScript,'--data-dir',root],{encoding:'utf8',timeout:20000});
  assert.equal(result.status,2,result.stderr);
  const status=JSON.parse(result.stdout);
  assert.equal(status.snapshot,'CREATED_PRIVATE');
  assert.equal(status.restore,'PASS');
  assert.equal(status.releaseSchemaGate,'BLOCKED');
  assert.match(status.snapshotSha256,/^[0-9a-f]{64}$/);
  return {backupId:status.backupId,status};
}
function args(root,backupId,attestationFile) {
  return {dataDir:root,backupId,sourceSha:candidateSha,attestationFile};
}
function rootReview(expected){
  return {
    format:1,
    decision:'RETAIN_HISTORIC_ARCHIVES_EXCLUDED_FROM_ACTIVE_STUDIO_RESTORE',
    reviewedBy:'Hermes',
    sourceSha:expected.sourceSha,
    runningReleaseSha:'aef64f85efeeb40f6c0f3a7dc43986a52a20f09f',
    backupId:expected.backupId,
    snapshotSha256:expected.snapshotSha256,
    h2PrivateReportSha256:expected.h2PrivateReportSha256,
    historicalInventorySha256:expected.historicalInventorySha256,
    legacyRoots:expected.legacyRoots,
    reviewedUtc:new Date().toISOString(),
    retainedUnmodified:true,
    activeStateOnly:true,
    historicArchivesNotFullRecovery:true,
    privateRootKitOperatorChecked:true
  };
}
test('H3 independently rehashes existing authentic R23 H2 backup and respects blocked historic gate',async t=>{
  const root=fixture(t);
  const {backupId,status}=createH2Bundle(root);
  const dir=path.join(root,'backups',backupId);
  const before=statSync(path.join(dir,'studio.sqlite')).mtimeMs;
  const evidence=await verifyExistingH2Backup(args(root,backupId));
  assert.equal(evidence.proof,'H2_EXISTING_BACKUP_VERIFIED_READ_ONLY');
  assert.equal(evidence.activeStudioDbAndBootstrapRecovery,'PASS_SCOPED');
  assert.equal(evidence.historicalRetentionReview,'PENDING_ROOT_OPERATOR');
  assert.equal(evidence.activeStateScopeGate,'BLOCKED_PENDING_OPERATOR_REVIEW');
  assert.equal(evidence.finalR24DeploymentGate,'NO_GO_SEPARATE_CI_AND_OWNER_APPROVAL');
  assert.equal(evidence.h2PhysicalRestoreRecorded,'PASS_PREVIOUS_RUN');
  assert.equal(evidence.h2R24OpenStoreRecorded,'PASS_PREVIOUS_RUN');
  assert.equal(evidence.recalculatedSnapshotSha256,status.snapshotSha256);
  assert.match(evidence.h2PrivateReportSha256,/^[0-9a-f]{64}$/);
  assert.match(evidence.historicalInventorySha256,/^[0-9a-f]{64}$/);
  assert.deepEqual(evidence.legacyRoots,['backups','restore-test','restore-tests']);
  assert.equal(statSync(path.join(dir,'studio.sqlite')).mtimeMs,before);
  assert.equal(readFileSync(path.join(root,'restore-test','fixture.txt'),'utf8'),
    'HISTORIC_FIXTURE_DO_NOT_USE_AS_PRODUCTION');
});
test('read-only CLI uses exit 2 for protected backup with pending operator review',t=>{
  const root=fixture(t);
  const {backupId}=createH2Bundle(root);
  const proc=spawnSync(process.execPath,
    [gateScript,'--data-dir',root,'--backup-id',backupId,
      '--source-sha',candidateSha],{encoding:'utf8',timeout:20000});
  assert.equal(proc.status,2,proc.stderr);
  const outcome=JSON.parse(proc.stdout);
  assert.equal(outcome.activeStateScopeGate,'BLOCKED_PENDING_OPERATOR_REVIEW');
  assert.equal(outcome.mutatesProduction,false);
  assert.equal(outcome.createsNewSnapshot,false);
  assert.equal(readdirSync(path.join(root,'backups')).length,1);
});
test('pure operator attestation comparison requires every evidence binding',async t=>{
  const root=fixture(t);
  const {backupId}=createH2Bundle(root);
  const result=await verifyExistingH2Backup(args(root,backupId));
  const expected={
    sourceSha:candidateSha,backupId,
    snapshotSha256:result.recalculatedSnapshotSha256,
    h2PrivateReportSha256:result.h2PrivateReportSha256,
    historicalInventorySha256:result.historicalInventorySha256,
    legacyRoots:result.legacyRoots
  };
  const review=rootReview(expected);
  assert.equal(compareAttestation(review,expected),true);
  for(const name of [
    'sourceSha','backupId','snapshotSha256','h2PrivateReportSha256',
    'historicalInventorySha256','runningReleaseSha','reviewedBy',
    'privateRootKitOperatorChecked','legacyRoots','decision'
  ]){
    const wrong={...review,[name]:name==='legacyRoots'?
      ['backups']:name==='privateRootKitOperatorChecked'?false:'wrong'};
    assert.throws(()=>compareAttestation(wrong,expected),/REVIEW_MISMATCH/);
  }
  assert.throws(()=>compareAttestation({...review,extraSecret:'NOPE'},expected),
    /REVIEW_UNKNOWN_OR_MISSING_FIELDS/);
});
test('stale or future review never satisfies the scope gate',()=>{
  const expected={sourceSha:candidateSha,backupId:'r24-h1-valid',
    snapshotSha256:'a'.repeat(64),h2PrivateReportSha256:'b'.repeat(64),
    historicalInventorySha256:'c'.repeat(64),legacyRoots:['backups']};
  const review=rootReview(expected);
  review.reviewedUtc=new Date(Date.now()-9*86400000).toISOString();
  assert.throws(()=>compareAttestation(review,expected),/REVIEW_STALE_OR_FUTURE/);
  review.reviewedUtc=new Date(Date.now()+3600000).toISOString();
  assert.throws(()=>compareAttestation(review,expected),/REVIEW_STALE_OR_FUTURE/);
});
test('non-root-created self-attestation cannot approve archived data',async t=>{
  const root=fixture(t);
  const {backupId}=createH2Bundle(root);
  const temp=mkdtempSync(path.join(os.tmpdir(),'schmaqq-h3-local-review-'));
  chmodSync(temp,0o700);
  t.after(()=>rmSync(temp,{recursive:true,force:true}));
  const review=path.join(temp,'review.json');
  writeFileSync(review,'{"format":1}',{mode:0o644});
  await assert.rejects(
    verifyExistingH2Backup(args(root,backupId,review)),
    /ROOT_ATTESTATION_PARENT_REQUIRED|ROOT_ATTESTATION_REQUIRED|ATTESTATION_RACE/
  );
});
test('historical inventory digest binds to exact archived topology and modes',t=>{
  const root=fixture(t);
  const first=inventoryHistoricalTrees(root);
  const again=inventoryHistoricalTrees(root);
  assert.equal(first.fingerprint,again.fingerprint);
  chmodSync(path.join(root,'restore-tests'),0o700);
  const changed=inventoryHistoricalTrees(root);
  assert.notEqual(first.fingerprint,changed.fingerprint);
});
test('unrecognized root-state entry blocks recovery classification',async t=>{
  const root=fixture(t);
  const {backupId}=createH2Bundle(root);
  writeFileSync(path.join(root,'unknown-risk.bin'),'new unknown state',
    {mode:0o600});
  await assert.rejects(verifyExistingH2Backup(args(root,backupId)),/UNKNOWN_STATE_ENTRY/);
});
test('symlink in historic archive blocks H3 inventory instead of following it',t=>{
  const root=fixture(t);
  symlinkSync(path.join(root,'studio.sqlite'),
    path.join(root,'restore-tests','unsafe-link'));
  assert.throws(()=>inventoryHistoricalTrees(root),/SYMLINK_REFUSED/);
});
test('hardlinked historic files are refused even when inside private dir',t=>{
  const root=fixture(t);
  const original=path.join(root,'restore-test','fixture.txt');
  const link=path.join(root,'restore-test','copy');
  // Node hard links allow a second path to same inode; never bless them.
  linkSync(original,link);
  assert.throws(()=>inventoryHistoricalTrees(root),/HISTORICAL_HARDLINK_REFUSED/);
});
test('writable legacy backup parent is blocked by H3 without chmod',t=>{
  const root=fixture(t);
  chmodSync(path.join(root,'backups'),0o777);
  assert.throws(()=>inventoryHistoricalTrees(root),/HISTORICAL_WRITABLE_SHARED|WRITABLE_SHARED_DIRECTORY/);
  assert.equal(statSync(path.join(root,'backups')).mode&0o777,0o777);
});
test('mismatch between claimed private H2 report and snapshot prevents PASS',async t=>{
  const root=fixture(t);
  const {backupId}=createH2Bundle(root);
  const reportFile=path.join(root,'backups',backupId,
    'local-backup-verification.private.json');
  const report=JSON.parse(readFileSync(reportFile,'utf8'));
  report.localSnapshot.sqliteSha256='a'.repeat(64);
  writeFileSync(reportFile,JSON.stringify(report),{mode:0o600});
  await assert.rejects(verifyExistingH2Backup(args(root,backupId)),
    /H2_SNAPSHOT_HASH_MISMATCH/);
});
test('H2 physical-restore fail cannot be reclassified as scoped PASS',async t=>{
  const root=fixture(t);
  const {backupId}=createH2Bundle(root);
  const reportFile=path.join(root,'backups',backupId,
    'local-backup-verification.private.json');
  const report=JSON.parse(readFileSync(reportFile,'utf8'));
  report.restoreVerification.r24StoreStartupOnDisposableRestore='BLOCKED';
  writeFileSync(reportFile,JSON.stringify(report),{mode:0o600});
  await assert.rejects(verifyExistingH2Backup(args(root,backupId)),
    /H2_RESTORE_PROOF_INCOMPLETE/);
});
