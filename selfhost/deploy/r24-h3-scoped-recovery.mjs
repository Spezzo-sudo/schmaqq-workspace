/**
 * R24-H3 – read-only evidence reconciliation for an already-created H2 backup.
 *
 * NO BACKUP CREATION. NO RESTORE WRITE. NO LIVE DATABASE WRITE. NO DEPLOY.
 * Separates active Studio state recovery (DB + bootstrap + separately kept
 * root-only runtime configuration) from retained historical archives.
 * A positive scoped review is possible ONLY with an operator-controlled,
 * root-owned, evidence-bound attestation; never from a CLI boolean.
 */
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {
  constants, createReadStream, existsSync, fstatSync, lstatSync, openSync,
  closeSync, readFileSync, readdirSync, realpathSync
} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectSchema} from './schema-preflight.mjs';
import {planMigrations} from './schema-migration.mjs';

const HISTORICAL=['backups','restore-test','restore-tests'];
const KNOWN_LIVE=new Set([
  'studio.sqlite','studio.sqlite-wal','studio.sqlite-shm',
  'studio.sqlite-journal','setup-link.txt'
]);
const R23_SOURCE='aef64f85efeeb40f6c0f3a7dc43986a52a20f09f';
const shaRe=/^[a-f0-9]{64}$/;
const gitShaRe=/^[a-f0-9]{40}$/;

function fail(id) {
  // Intentionally avoid leaking private file names, paths, or contents.
  throw new Error(id);
}
function check(cond,code){if(!cond)fail(code);}
function lstat(location) {
  // Symlink is never followed; undefined files simply block verification.
  const st=lstatSync(location,{bigint:true});
  check(!st.isSymbolicLink(),'SYMLINK_REFUSED');
  return st;
}
function checkedDirectory(location,{privateOnly=false,owner}={}) {
  const st=lstat(location);
  check(st.isDirectory(),'DIRECTORY_REQUIRED');
  check(realpathSync(location)===location,'CANONICAL_PATH_REQUIRED');
  check((st.mode & 0o022n)===0n,'WRITABLE_SHARED_DIRECTORY');
  if(privateOnly)check((st.mode & 0o077n)===0n,'PRIVATE_DIRECTORY_REQUIRED');
  if(owner){
    check(st.uid===owner.uid&&st.gid===owner.gid,'STATE_OWNER_MISMATCH');
  }
  return st;
}
function checkedPrivateFile(location,owner) {
  const st=lstat(location);
  check(st.isFile()&&st.nlink===1n,'REGULAR_UNLINKED_FILE_REQUIRED');
  check((st.mode & 0o077n)===0n,'PRIVATE_FILE_REQUIRED');
  check(st.uid===owner.uid&&st.gid===owner.gid,'STATE_OWNER_MISMATCH');
  return st;
}
async function sha256(filename) {
  const h=createHash('sha256');
  for await(const chunk of createReadStream(filename))h.update(chunk);
  return h.digest('hex');
}
const digest=(bytes)=>createHash('sha256').update(bytes).digest('hex');
function safeJSON(file,owner,maxBytes=65536) {
  const st=checkedPrivateFile(file,owner);
  check(st.size>0n&&st.size<=BigInt(maxBytes),'PRIVATE_REPORT_SIZE_INVALID');
  const bytes=readFileSync(file);
  check(bytes.length<=maxBytes,'PRIVATE_REPORT_SIZE_INVALID');
  let parsed;
  try{parsed=JSON.parse(bytes.toString('utf8'));}
  catch{fail('PRIVATE_REPORT_NOT_JSON');}
  return {parsed,sha256:digest(bytes)};
}

/**
 * A bounded, stable metadata fingerprint of explicitly named archival trees.
 * No archive bytes are read; neither names nor the enumerated entries are
 * printed. The digest binds an operator review to the exact local tree state.
 * This is NOT a content-integrity proof for historical backups.
 */
export function inventoryHistoricalTrees(dataDir){
  check(path.isAbsolute(dataDir),'ABSOLUTE_STATE_PATH_REQUIRED');
  const root=path.resolve(dataDir);
  check(root===dataDir,'CANONICAL_STATE_PATH_REQUIRED');
  const owner=checkedDirectory(root,{privateOnly:true});
  const top=readdirSync(root).sort();
  const allAllowed=new Set([...KNOWN_LIVE,...HISTORICAL]);
  check(top.includes('studio.sqlite'),'ACTIVE_DATABASE_MISSING');
  for(const name of top)check(allAllowed.has(name),'UNKNOWN_STATE_ENTRY');
  for(const name of top){
    if(KNOWN_LIVE.has(name)){
      const file=lstat(path.join(root,name));
      check(file.isFile()&&file.nlink===1n,'ACTIVE_FILE_NOT_REGULAR');
      check(file.uid===owner.uid&&file.gid===owner.gid,'ACTIVE_OWNER_MISMATCH');
      check((file.mode & 0o022n)===0n,'ACTIVE_FILE_WRITABLE_SHARED');
    }
  }
  const h=createHash('sha256');
  h.update('SCHMAQQ-H3-LEGACY-METADATA-v1\n');
  let files=0,directories=0,bytes=0n,items=0;
  const present=[];
  for(const prefix of HISTORICAL){
    const target=path.join(root,prefix);
    if(!top.includes(prefix))continue;
    present.push(prefix);
    const walk=(location,rel,depth)=>{
      check(depth<=12,'HISTORICAL_DEPTH_LIMIT');
      check(rel.length<=2048,'HISTORICAL_PATH_LIMIT');
      const item=lstat(location);
      check(item.uid===owner.uid&&item.gid===owner.gid,'HISTORICAL_OWNER_MISMATCH');
      check((item.mode & 0o022n)===0n,'HISTORICAL_WRITABLE_SHARED');
      let kind;
      if(item.isDirectory()){
        directories++;
        kind='D';
        check(realpathSync(location)===location,'HISTORICAL_NONCANONICAL');
      }else if(item.isFile()){
        files++;
        kind='F';
        check(item.nlink===1n,'HISTORICAL_HARDLINK_REFUSED');
        bytes+=item.size;
        check(bytes<=100n*1024n*1024n*1024n,'HISTORICAL_SIZE_LIMIT');
      }else{
        fail('HISTORICAL_SPECIAL_FILE_REFUSED');
      }
      items++;
      check(items<=10000,'HISTORICAL_ENTRY_LIMIT');
      // JSON-escaped names stay in a digest only, never in user-visible output.
      h.update(JSON.stringify([
        rel,kind,(item.mode&0o7777n).toString(8),item.uid.toString(),
        item.gid.toString(),item.nlink.toString(),
        item.size.toString(),item.mtimeNs.toString(),item.ctimeNs.toString()
      ])+'\n');
      if(kind==='D'){
        for(const name of readdirSync(location).sort()){
          walk(path.join(location,name),rel+'/'+name,depth+1);
        }
      }
    };
    checkedDirectory(target,{owner});
    walk(target,prefix,0);
  }
  return {
    ownerUid:owner.uid.toString(),
    ownerGid:owner.gid.toString(),
    fingerprint:h.digest('hex'),
    legacyRoots:present,
    legacyDirectories:directories,
    legacyFiles:files,
    // Size never echoed; the fingerprint covers each private file's size.
    isEmpty:items===0
  };
}
function validateRootAttestationFile(file) {
  check(path.isAbsolute(file),'ATTESTATION_ABSOLUTE_PATH_REQUIRED');
  const exact=path.resolve(file);
  check(exact===file,'ATTESTATION_CANONICAL_REQUIRED');
  const parent=path.dirname(exact);
  const p=checkedDirectory(parent);
  // Root-owned, non-writable parent and file; a service-user self-attestation
  // can never close the reviewed historical-archive gate.
  check(p.uid===0n,'ROOT_ATTESTATION_PARENT_REQUIRED');
  const flags=constants.O_RDONLY|(constants.O_NOFOLLOW??0);
  const fd=openSync(exact,flags);
  try {
    const stat=fstatSync(fd,{bigint:true});
    const entry=lstat(exact);
    check(stat.ino===entry.ino&&stat.dev===entry.dev,'ATTESTATION_RACE');
    check(stat.isFile()&&stat.nlink===1n&&stat.uid===0n&&stat.gid===0n,
      'ROOT_ATTESTATION_REQUIRED');
    check((stat.mode&0o022n)===0n,'WRITABLE_ATTESTATION_REFUSED');
    check(stat.size>0n&&stat.size<=8192n,'ATTESTATION_SIZE_LIMIT');
    let obj;
    try{obj=JSON.parse(readFileSync(fd,{encoding:'utf8'}));}
    catch{fail('ATTESTATION_INVALID_JSON');}
    return obj;
  } finally{closeSync(fd);}
}
/** Pure comparison; caller must first validate root-owned attestation storage. */
export function compareAttestation(review,expected){
  const pin={
    format:1,
    decision:'RETAIN_HISTORIC_ARCHIVES_EXCLUDED_FROM_ACTIVE_STUDIO_RESTORE',
    reviewedBy:'Hermes',
    sourceSha:expected.sourceSha,
    runningReleaseSha:R23_SOURCE,
    backupId:expected.backupId,
    snapshotSha256:expected.snapshotSha256,
    h2PrivateReportSha256:expected.h2PrivateReportSha256,
    historicalInventorySha256:expected.historicalInventorySha256,
    legacyRoots:expected.legacyRoots,
    retainedUnmodified:true,
    activeStateOnly:true,
    historicArchivesNotFullRecovery:true,
    privateRootKitOperatorChecked:true
  };
  check(review&&typeof review==='object'&&!Array.isArray(review),
    'REVIEW_OBJECT_REQUIRED');
  const requiredKeys=[...Object.keys(pin),'reviewedUtc'].sort();
  check(JSON.stringify(Object.keys(review).sort())===JSON.stringify(requiredKeys),
    'REVIEW_UNKNOWN_OR_MISSING_FIELDS');
  for(const [k,v] of Object.entries(pin)){
    check(JSON.stringify(review[k])===JSON.stringify(v),'REVIEW_MISMATCH_'+k);
  }
  const time=Date.parse(review.reviewedUtc);
  check(Number.isFinite(time)&&new Date(time).toISOString()===review.reviewedUtc,
    'REVIEW_TIME_INVALID');
  check(Date.now()-time>=-300000&&Date.now()-time<=7*86400000,
    'REVIEW_STALE_OR_FUTURE');
  return true;
}

export async function verifyExistingH2Backup({dataDir,backupId,sourceSha,attestationFile}){
  check(gitShaRe.test(sourceSha),'SOURCE_COMMIT_INVALID');
  check(/^r24-h1-[A-Za-z0-9_-]{4,64}$/.test(backupId),
    'BACKUP_ID_INVALID');
  const inventory=inventoryHistoricalTrees(dataDir);
  const root=path.resolve(dataDir);
  const owner=checkedDirectory(root,{privateOnly:true});
  const backupParent=path.join(root,'backups');
  checkedDirectory(backupParent,{owner});
  const bundle=path.join(backupParent,backupId);
  checkedDirectory(bundle,{owner,privateOnly:true});
  const snapshot=path.join(bundle,'studio.sqlite');
  const reportFile=path.join(bundle,'local-backup-verification.private.json');
  const snapshotStat=checkedPrivateFile(snapshot,owner);
  const {parsed:report,sha256:reportSha256}=safeJSON(reportFile,owner);
  const snapshotSha256=await sha256(snapshot);
  check(shaRe.test(snapshotSha256),'BAD_COMPUTED_SHA256');
  check(shaRe.test(report.localSnapshot?.sqliteSha256??'')&&
    report.localSnapshot.sqliteSha256===snapshotSha256,
    'H2_SNAPSHOT_HASH_MISMATCH');
  check(report.localSnapshot.sqliteBytes===Number(snapshotStat.size),
    'H2_SNAPSHOT_BYTES_MISMATCH');
  check(report.localSnapshot.mode==='0600'&&
    report.localSnapshot.coherentWalSnapshot===true,
    'H2_SNAPSHOT_PROOF_INCOMPLETE');
  check(report.format===1&&report.scope==='studio-state-directory-only'&&
    report.sourceDatabaseMutated===false&&
    report.noMigrationOrDeployment===true&&
    report.externalSecretsAndRunnerStateIncluded===false,
    'H2_PROOF_SCOPE_INVALID');
  check(report.sourceSchema?.status==='PASS'&&
    report.snapshotSchema?.status==='PASS'&&
    report.readOnlyMigrationPlan==='READY',
    'H2_SCHEMA_PROOF_INCOMPLETE');
  check(report.restoreVerification?.status==='PASS'&&
    report.restoreVerification.sqliteIntegrity==='ok'&&
    report.restoreVerification.foreignKeyFailures===0&&
    report.restoreVerification.restoredCopyBytesMatch===true&&
    report.restoreVerification.restoredSchemaAndTableCountsMatch===true&&
    report.restoreVerification.r24StoreStartupOnDisposableRestore==='PASS'&&
    report.restoreVerification.temporaryRestoredCopyRemoved===true,
    'H2_RESTORE_PROOF_INCOMPLETE');
  const expectedFiles=report.backupDataFiles;
  check(Array.isArray(expectedFiles)&&expectedFiles.includes('studio.sqlite')&&
    expectedFiles.every(f=>f==='studio.sqlite'||f==='setup-link.txt'),
    'H2_BACKUP_FILES_UNRECOGNIZED');
  const bootstrapIncluded=expectedFiles.includes('setup-link.txt');
  check(report.restoreVerification.bootstrapCopyVerified===bootstrapIncluded,
    'BOOTSTRAP_PROOF_MISMATCH');
  if(bootstrapIncluded)checkedPrivateFile(path.join(bundle,'setup-link.txt'),owner);
  else check(!existsSync(path.join(bundle,'setup-link.txt')),'BOOTSTRAP_UNEXPECTED');
  const sqlite=new DatabaseSync(snapshot,{readOnly:true});
  try {
    sqlite.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000;');
    check(sqlite.prepare('PRAGMA integrity_check').get().integrity_check==='ok',
      'CURRENT_SNAPSHOT_SQLITE_CORRUPT');
    check(sqlite.prepare('PRAGMA foreign_key_check').all().length===0,
      'CURRENT_SNAPSHOT_FK_INVALID');
  }finally{sqlite.close();}
  // Don't certify a moving historical evidence tree. New backup creation,
  // artifact replacement or permission changes during verification all block.
  const afterInventory=inventoryHistoricalTrees(dataDir);
  check(afterInventory.fingerprint===inventory.fingerprint,
    'HISTORICAL_INVENTORY_CHANGED_DURING_VERIFICATION');
  const schema=inspectSchema(snapshot);
  check(schema.status==='PASS'&&
    schema.schemaProfile==='R23-v0-with-complete-auth',
    'CURRENT_SNAPSHOT_SCHEMA_INVALID');
  check(planMigrations(snapshot).status==='READY',
    'CURRENT_SNAPSHOT_MIGRATION_PLAN_INVALID');
  check(Array.isArray(report.historicalRestoreDirectoriesPreserved)&&
    report.studioStateInventoryGate==='BLOCKED_OPERATOR_REVIEW'&&
    report.releaseSchemaGate==='BLOCKED',
    'H2_REVIEW_BOUNDARY_MISMATCH');

  const finalInventory=inventoryHistoricalTrees(dataDir);
  check(finalInventory.fingerprint===inventory.fingerprint,
    'HISTORICAL_INVENTORY_CHANGED_DURING_VERIFICATION');
  const expected={
    sourceSha,backupId,snapshotSha256,h2PrivateReportSha256:reportSha256,
    historicalInventorySha256:inventory.fingerprint,
    legacyRoots:inventory.legacyRoots
  };
  let reviewed=false;
  if(attestationFile){
    const attestation=validateRootAttestationFile(attestationFile);
    compareAttestation(attestation,expected);
    reviewed=true;
  }
  return {
    proof:'H2_EXISTING_BACKUP_VERIFIED_READ_ONLY',
    runningReleaseShaExpected:R23_SOURCE,
    claimedCandidateSha:sourceSha,
    backupId,
    recalculatedSnapshotSha256:snapshotSha256,
    h2PrivateReportSha256:reportSha256,
    historicalInventorySha256:inventory.fingerprint,
    legacyDirectories:inventory.legacyDirectories,
    legacyFiles:inventory.legacyFiles,
    legacyRoots:inventory.legacyRoots,
    schemaSnapshot:'PASS',
    sqliteIntegrity:'PASS',
    foreignKeys:'PASS',
    h2PhysicalRestoreRecorded:'PASS_PREVIOUS_RUN',
    h2R24OpenStoreRecorded:'PASS_PREVIOUS_RUN',
    activeStudioDbAndBootstrapRecovery:'PASS_SCOPED',
    historicalRetentionReview:reviewed?'PASS_ROOT_OPERATOR_ATTESTED':'PENDING_ROOT_OPERATOR',
    activeStateScopeGate:reviewed?'PASS_SCOPED':'BLOCKED_PENDING_OPERATOR_REVIEW',
    completeHostRecovery:'NOT_ATTESTED',
    finalR24DeploymentGate:'NO_GO_SEPARATE_CI_AND_OWNER_APPROVAL',
    createsNewSnapshot:false,
    mutatesProduction:false,
    historicArchivesPreserved:true
  };
}
async function main(){
  const args=process.argv.slice(2);
  check((args.length===6||args.length===8)&&args[0]==='--data-dir'&&
    args[2]==='--backup-id'&&args[4]==='--source-sha'&&
    (args.length===6||args[6]==='--root-attestation'),
    'USAGE_READ_ONLY_DATA_DIR_BACKUP_ID_SOURCE_SHA_OPTIONAL_ROOT_ATTESTATION');
  const out=await verifyExistingH2Backup({
    dataDir:args[1],backupId:args[3],sourceSha:args[5],
    attestationFile:args.length===8?args[7]:undefined
  });
  console.log(JSON.stringify(out,null,2));
  if(out.activeStateScopeGate!=='PASS_SCOPED')process.exitCode=2;
}
if(process.argv[1]&&path.resolve(process.argv[1])===
   fileURLToPath(import.meta.url)){
  await main().catch(error=>{
    const code=error?.message??'UNCLASSIFIED';
    console.error('R24-H3 read-only evidence gate: BLOCKED',
      /^[A-Z0-9_]+$/.test(code)?code:'UNCLASSIFIED');
    process.exitCode=1;
  });
}
