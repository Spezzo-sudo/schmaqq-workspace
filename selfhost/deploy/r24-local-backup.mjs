/**
 * R24-H1: Explicit, owner-authorized local Studio data snapshot and restore
 * verification. Run as the schmaqq-studio service user with an exact absolute
 * STUDIO_DATA_DIR. Never changes, checkpoints, migrates or opens the source
 * SQLite database for writing.
 *
 * Scope: Studio StateDirectory, not OS-wide disaster recovery. Only known
 * persistent non-DB state (setup-link.txt) is copied. Unknown entries block a
 * claim of completeness. External config/keys/runner state require separate
 * protected inventory and operator approval.
 */
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {
  constants, chmodSync, copyFileSync, existsSync, lstatSync, mkdirSync,
  mkdtempSync, openSync, closeSync, readFileSync, readdirSync,
  realpathSync, rmSync, statSync, writeFileSync
} from 'node:fs';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectSchema} from './schema-preflight.mjs';
import {planMigrations} from './schema-migration.mjs';
import {openStore} from '../store.mjs';

const scriptFile=fileURLToPath(import.meta.url);
const backupScript=fileURLToPath(new URL('../backup.mjs',import.meta.url));

function assertPrivateDirectory(location) {
  const info=lstatSync(location);
  assert.ok(info.isDirectory() && !info.isSymbolicLink(),
    'State and backup directories must not be symlinks.');
  assert.equal(realpathSync(location),location,
    'State and backup directories must be canonical paths.');
  assert.equal(info.mode & 0o077,0,
    'State and backup directories must not be accessible to other users.');
}
/**
 * Existing historic child directories can be 0755 while the Studio
 * StateDirectory itself is 0700. The parent is the real confidentiality
 * boundary: another Unix user cannot traverse to a child with a looser
 * mode. This check never chmods or relabels those old directories.
 *
 * Restrict to canonical, same-owner, non-writable child directories.
 * Newly created backup/restore bundles remain strictly 0700/0600.
 */
function inspectProtectedExistingChild(parent, name) {
  const dir=path.join(parent,name);
  const ancestor=lstatSync(parent);
  const info=lstatSync(dir);
  assert.ok(info.isDirectory() && !info.isSymbolicLink(),
    'Known recovery artifact must be a real directory.');
  assert.equal(realpathSync(dir),dir,'Linked recovery directories are refused.');
  assert.equal(info.uid,ancestor.uid,
    'Recovery directory owner must match the private Studio state owner.');
  assert.equal(info.gid,ancestor.gid,
    'Recovery directory group must match the private Studio state group.');
  assert.equal(info.mode & 0o022,0,
    'Existing recovery directories must not be group or world writable.');
  return {privateMode:(info.mode & 0o077)===0,mode:(info.mode&0o777).toString(8)};
}
function assertPrivateFile(filename) {
  const info=lstatSync(filename);
  assert.ok(info.isFile() && !info.isSymbolicLink() && info.nlink===1,
    'Expected a regular private file without symlinks or hardlinks.');
  assert.equal(info.mode & 0o077,0,
    'Persistent state and snapshot files must have private permissions.');
}
async function sha256(filename) {
  const h=createHash('sha256');
  for await(const bytes of createReadStream(filename))h.update(bytes);
  return h.digest('hex');
}
function sqliteRead(filename) {
  const db=new DatabaseSync(filename,{readOnly:true});
  try {
    db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000;');
    const integrity=db.prepare('PRAGMA integrity_check').all();
    assert.equal(integrity.length,1,'SQLite integrity_check reported multiple failures.');
    assert.equal(integrity[0].integrity_check,'ok','SQLite integrity_check failed.');
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0,
      'SQLite foreign key violations detected.');
    const userVersion=db.prepare('PRAGMA user_version').get().user_version;
    const tables=db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all().map(x=>x.name);
    assert.ok(tables.length>0 && tables.length<=128,
      'Invalid or unreasonable SQLite table inventory.');
    const summary=createHash('sha256');
    for(const name of tables){
      const safe='"'+name.replace(/"/g,'""')+'"';
      const count=db.prepare('SELECT COUNT(*) AS n FROM '+safe).get().n;
      summary.update(JSON.stringify([name,count])+'\n');
    }
    return {userVersion,tableCount:tables.length,countsDigest:summary.digest('hex')};
  } finally{db.close();}
}
function knownStateOnly(dataDir) {
  const allowed=new Set([
    'studio.sqlite','studio.sqlite-wal','studio.sqlite-shm',
    'studio.sqlite-journal','setup-link.txt','backups',
    // The names are known from historic Hermes recovery runs, but the
    // contents are never read/copied/removed by the live-state backup.
    'restore-test','restore-tests'
  ]);
  const entries=readdirSync(dataDir);
  const unknown=entries.filter(x=>!allowed.has(x));
  assert.equal(unknown.length,0,
    'Unaccounted-for persistent state entries: stop; review private inventory before claiming completeness.');
  const legacyRestoreDirs=[];
  let legacyBackupParentNonPrivate=false;
  for(const entry of entries){
    if(entry==='backups'){
      const info=inspectProtectedExistingChild(dataDir,'backups');
      legacyBackupParentNonPrivate=!info.privateMode;
    }else if(entry==='restore-test'||entry==='restore-tests'){
      inspectProtectedExistingChild(dataDir,entry);
      legacyRestoreDirs.push(entry);
    }else{
      assertPrivateFile(path.join(dataDir,entry));
    }
  }
  assert.ok(entries.includes('studio.sqlite'),'Missing source Studio database.');
  return {
    bootstrapPresent:entries.includes('setup-link.txt'),
    legacyRestoreDirs:legacyRestoreDirs.sort(),
    legacyBackupParentNonPrivate,
    // Existing historical restore directories are preserved, not declared
    // part of the live service recovery kit without operator inventory.
    status:legacyRestoreDirs.length||legacyBackupParentNonPrivate ?
      'BLOCKED_OPERATOR_REVIEW':'PASS'
  };
}
function statusOnly(filename) {
  try{
    const report=inspectSchema(filename);
    return {
      status:report.status,
      userVersion:report.userVersion,
      integrity:report.integrity,
      foreignKeyFailures:report.foreignKeyFailures,
      driftObjects:report.missingObjects.length+report.unexpectedObjects.length+
        report.differentObjects.length+report.tableDifferences.length
    };
  }catch(error){
    return {status:'BLOCKED',reason:'schema-inspector-error',userVersion:null,
      integrity:'unverified',foreignKeyFailures:null,driftObjects:null};
  }
}
async function main(){
  const args=process.argv.slice(2);
  if(args.length!==2 || args[0]!=='--data-dir' || !path.isAbsolute(args[1])){
    throw new Error('Usage: node r24-local-backup.mjs --data-dir /absolute/private/StudioStateDirectory');
  }
  // Use the supplied existing, canonical data directory. Do not follow an
  // operator-supplied symlink and do not guess the actual Production path.
  const dataDir=path.resolve(args[1]);
  assertPrivateDirectory(dataDir);
  const inventory=knownStateOnly(dataDir);
  const initialBootstrapHash=inventory.bootstrapPresent ?
    await sha256(path.join(dataDir,'setup-link.txt')) : null;
  const source=path.join(dataDir,'studio.sqlite');
  const preflight=statusOnly(source);

  const parent=path.join(dataDir,'backups');
  if(existsSync(parent)){
    // Old backups/ can be 0755 under the already-private 0700 StateDir.
    // Never change the old directory permissions implicitly. The newly
    // minted bundle MUST be private regardless of this legacy parent.
    inspectProtectedExistingChild(dataDir,'backups');
  }else{
    mkdirSync(parent,{mode:0o700});
    assertPrivateDirectory(parent);
  }
  const bundle=mkdtempSync(path.join(parent,'r24-h1-'));
  chmodSync(bundle,0o700);
  assertPrivateDirectory(bundle);
  const snapshot=path.join(bundle,'studio.sqlite');

  // VACUUM INTO creates an SQLite-consistent point-in-time image including
  // committed WAL frames. The running source DB remains read-only for us.
  const execution=execFileSync(process.execPath,[backupScript,snapshot],{
    cwd:path.dirname(scriptFile),
    env:{...process.env,STUDIO_DATA_DIR:dataDir},
    encoding:'utf8',timeout:120000,maxBuffer:1024*1024
  });
  const backupResult=JSON.parse(execution.trim());
  assert.equal(backupResult.integrity,'ok');
  assert.equal(backupResult.foreignKeyFailures,0);
  assertPrivateFile(snapshot);
  for(const suffix of ['-wal','-shm','-journal']){
    assert.equal(existsSync(snapshot+suffix),false,
      'A standalone VACUUM INTO snapshot must not need a journal sidecar.');
  }

  const copiedFiles=['studio.sqlite'];
  if(inventory.bootstrapPresent){
    const src=path.join(dataDir,'setup-link.txt');
    const dst=path.join(bundle,'setup-link.txt');
    assertPrivateFile(src);
    const hashBefore=await sha256(src);
    assert.equal(hashBefore,initialBootstrapHash,
      'Bootstrap recovery state changed during the live database snapshot.');
    copyFileSync(src,dst,constants.COPYFILE_EXCL);
    chmodSync(dst,0o600);
    assertPrivateFile(dst);
    assert.equal(await sha256(dst),hashBefore,'Bootstrap recovery file copy differs.');
    assert.equal(await sha256(src),hashBefore,'Bootstrap source changed during snapshot.');
    copiedFiles.push('setup-link.txt');
  }
  const finalInventory=knownStateOnly(dataDir);
  assert.equal(finalInventory.bootstrapPresent,inventory.bootstrapPresent,
    'Bootstrap recovery file appeared or disappeared during snapshot.');
  assert.deepEqual(finalInventory.legacyRestoreDirs,inventory.legacyRestoreDirs,
    'Historical restore inventory changed during snapshot.');
  assert.equal(finalInventory.status,inventory.status,
    'Recovery directory permissions or scope changed during snapshot.');

  // Physical restoration, in a separate private directory. No application
  // server is started and no actual user/session data leaves the server.
  const restore=mkdtempSync(path.join(bundle,'restore-check-'));
  chmodSync(restore,0o700);
  try{
    const originalHash=await sha256(snapshot);
    const restoredDb=path.join(restore,'studio.sqlite');
    copyFileSync(snapshot,restoredDb,constants.COPYFILE_EXCL);
    chmodSync(restoredDb,0o600);
    assertPrivateFile(restoredDb);
    assert.equal(await sha256(restoredDb),originalHash,
      'Restored database copy differs from snapshot.');

    const snapshotChecks=sqliteRead(snapshot);
    const restoredChecks=sqliteRead(restoredDb);
    assert.deepEqual(restoredChecks,snapshotChecks,
      'Restored SQLite schema or table counts do not match snapshot.');
    if(inventory.bootstrapPresent){
      const bootstrapSrc=path.join(bundle,'setup-link.txt');
      const bootstrapCopy=path.join(restore,'setup-link.txt');
      copyFileSync(bootstrapSrc,bootstrapCopy,constants.COPYFILE_EXCL);
      chmodSync(bootstrapCopy,0o600);
      assertPrivateFile(bootstrapCopy);
      assert.equal(await sha256(bootstrapCopy),await sha256(bootstrapSrc));
    }
    const snapshotSchema=statusOnly(snapshot);
    const plan=planMigrations(snapshot);
    let appStoreCompatibility='BLOCKED';
    if(preflight.status==='PASS' && snapshotSchema.status==='PASS' &&
       plan.status==='READY'){
      // Open the physically restored copy with R24's real persistence entry
      // point. This intentionally writes ONLY the disposable restore copy;
      // no HTTP listener, provider, runner, secret export or Production write.
      const db=openStore(restoredDb);
      try{
        assert.equal(db.prepare('SELECT COUNT(*) AS n FROM projects').get().n>=5,true);
        assert.equal(db.prepare('PRAGMA user_version').get().user_version,0,
          'R24 application startup must not auto-run the ledger migration.');
      }finally{db.close();}
      assert.deepEqual(sqliteRead(restoredDb),snapshotChecks,
        'R24 startup changed schema or table counts on restored database.');
      appStoreCompatibility='PASS';
    }
    const releaseReady=preflight.status==='PASS' &&
      snapshotSchema.status==='PASS' && plan.status==='READY' &&
      finalInventory.status==='PASS';

    rmSync(restore,{recursive:true,force:true});
    assert.equal(existsSync(restore),false,'Private restore-check data not removed.');
    const report={
      format:1,
      scope:'studio-state-directory-only',
      createdUtc:new Date().toISOString(),
      backupDataFiles:copiedFiles,
      historicalRestoreDirectoriesPreserved:inventory.legacyRestoreDirs,
      historicalRestoreContentsReviewed:false,
      legacyBackupParentNonPrivate:inventory.legacyBackupParentNonPrivate,
      studioStateInventoryGate:finalInventory.status,
      sourceDatabaseMutated:false,
      sourceSchema:preflight,
      snapshotSchema,
      readOnlyMigrationPlan:plan.status,
      localSnapshot: {
        sqliteBytes:statSync(snapshot).size,
        sqliteSha256:originalHash,
        mode:'0600',
        coherentWalSnapshot:true
      },
      restoreVerification:{
        status:'PASS',sqliteIntegrity:'ok',foreignKeyFailures:0,
        restoredCopyBytesMatch:true,
        restoredSchemaAndTableCountsMatch:true,
        r24StoreStartupOnDisposableRestore:appStoreCompatibility,
        bootstrapCopyVerified:inventory.bootstrapPresent,
        temporaryRestoredCopyRemoved:true
      },
      externalSecretsAndRunnerStateIncluded:false,
      releaseSchemaGate:releaseReady?'PASS':'BLOCKED',
      noMigrationOrDeployment:true
    };
    const reportFile=path.join(bundle,'local-backup-verification.private.json');
    const fd=openSync(reportFile,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL,0o600);
    try{writeFileSync(fd,JSON.stringify(report,null,2)+'\n');}
    finally{closeSync(fd);}
    assertPrivateFile(reportFile);
    // The full bundle stays on the private VPS, not in GitHub or a public log.
    console.log(JSON.stringify({
      snapshot:'CREATED_PRIVATE',
      backupId:path.basename(bundle),
      restore:'PASS',
      stateScope:'SQLITE_AND_OPTIONAL_BOOTSTRAP',
      bootstrapIncluded:inventory.bootstrapPresent,
      snapshotSha256:originalHash,
      liveSchemaGate:preflight.status,
      restoredSchemaGate:snapshotSchema.status,
      migrationPlan:plan.status,
      r24StoreRestoreCompatibility:appStoreCompatibility,
      studioStateInventoryGate:finalInventory.status,
      legacyRestoreDirsPreserved:inventory.legacyRestoreDirs.length,
      legacyBackupParentNonPrivate:inventory.legacyBackupParentNonPrivate,
      releaseSchemaGate:report.releaseSchemaGate,
      completeHostRecovery:'NOT_VERIFIED',
      productionDataChanged:false
    },null,2));
    if(!releaseReady)process.exitCode=2;
  } finally {
    rmSync(restore,{recursive:true,force:true});
  }
}
await main().catch(error=>{
  // Never print path/content of sensitive Production backup material.
  const diagnostic=error.code==='ERR_ASSERTION' ? error.message :
    (error.message?.startsWith('Usage:') ? 'Usage: explicit absolute private data directory required' :
    (error.code??'unclassified-error'));
  console.error('R24 local backup preflight blocked:',diagnostic);
  process.exitCode=1;
});
