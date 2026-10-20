import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {
  chmodSync,existsSync,mkdtempSync,readFileSync,readdirSync,rmSync,
  statSync,symlinkSync,writeFileSync
} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {openStore} from './store.mjs';

// Match the private umask of the real Studio systemd service.
process.umask(0o077);
const script=fileURLToPath(new URL('./deploy/r24-local-backup.mjs',import.meta.url));
function fixture(t,{bootstrap=false}={}){
  const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-r24h1-fixture-'));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  const dbFile=path.join(root,'studio.sqlite');
  const db=openStore(dbFile);
  db.prepare(
    'INSERT INTO members(id,name,email,password,role,seen) VALUES(?,?,?,?,?,?)'
  ).run('synthetic','QA-only','solo@fixture.invalid','no-password-real','owner',12345);
  db.prepare(
    'INSERT INTO documents(id,title,body,author,revision,updated) VALUES(?,?,?,?,?,?)'
  ).run('doc-fixture','Fixture','Private synthetic payload','synthetic',1,12345);
  db.close();
  if(bootstrap)writeFileSync(path.join(root,'setup-link.txt'),'TEST-ONLY-NONPRODUCTION-BOOTSTRAP',
    {mode:0o600});
  return root;
}
function run(root){
  return spawnSync(process.execPath,[script,'--data-dir',root],{
    encoding:'utf8',timeout:30000,maxBuffer:1024*1024
  });
}
function latestBundle(root){
  const dirname=path.join(root,'backups');
  const choices=readdirSync(dirname).filter(x=>x.startsWith('r24-h1-'));
  assert.equal(choices.length,1);
  return path.join(dirname,choices[0]);
}
function inspectSnapshot(bundle){
  const filename=path.join(bundle,'studio.sqlite');
  const db=new DatabaseSync(filename,{readOnly:true});
  try {
    assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    return {
      member:db.prepare('SELECT COUNT(*) AS n FROM members').get().n,
      documents:db.prepare('SELECT COUNT(*) AS n FROM documents').get().n,
      activities:db.prepare('SELECT COUNT(*) AS n FROM activities').get().n,
      version:db.prepare('PRAGMA user_version').get().user_version
    };
  }finally{db.close();}
}
test('consistent WAL-aware backup is physically restored and retains known state',t=>{
  const root=fixture(t,{bootstrap:true});
  const db=new DatabaseSync(path.join(root,'studio.sqlite'));
  db.exec('PRAGMA journal_mode=WAL;');
  db.prepare('INSERT INTO activities VALUES(?,?,?,?)').run(
    'activity-1','synthetic','Fixture write kept in WAL',12345
  );
  // The writer is deliberately still open during the consistent backup.
  const result=run(root);
  db.close();
  assert.equal(result.status,0,result.stderr);
  const report=JSON.parse(result.stdout);
  assert.equal(report.snapshot,'CREATED_PRIVATE');
  assert.equal(report.restore,'PASS');
  assert.equal(report.releaseSchemaGate,'PASS');
  assert.equal(report.r24StoreRestoreCompatibility,'PASS');
  assert.equal(report.bootstrapIncluded,true);
  assert.equal(report.productionDataChanged,false);
  assert.equal(result.stdout.includes('TEST-ONLY-NONPRODUCTION-BOOTSTRAP'),false);
  const bundle=latestBundle(root);
  assert.equal(statSync(bundle).mode&0o777,0o700);
  assert.equal(statSync(path.join(bundle,'studio.sqlite')).mode&0o777,0o600);
  assert.equal(statSync(path.join(bundle,'setup-link.txt')).mode&0o777,0o600);
  assert.equal(readFileSync(path.join(bundle,'setup-link.txt'),'utf8'),
    'TEST-ONLY-NONPRODUCTION-BOOTSTRAP');
  const snapshot=inspectSnapshot(bundle);
  assert.equal(snapshot.member,1);
  assert.equal(snapshot.documents,1);
  assert.equal(snapshot.activities,1,'Consistent backup must include committed WAL rows.');
  assert.equal(snapshot.version,0);
  const priv=JSON.parse(readFileSync(path.join(bundle,
    'local-backup-verification.private.json'),'utf8'));
  assert.equal(priv.restoreVerification.status,'PASS');
  assert.equal(priv.restoreVerification.r24StoreStartupOnDisposableRestore,'PASS');
  assert.equal(priv.readOnlyMigrationPlan,'READY');
  assert.ok(readdirSync(bundle).every(x=>!x.startsWith('restore-check-')),
    'Temporary restored SQLite files must be removed.');
});

test('backup without bootstrap is complete for known SQLite-only state',t=>{
  const root=fixture(t);
  const result=run(root);
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).bootstrapIncluded,false);
  assert.deepEqual(inspectSnapshot(latestBundle(root)),
    {member:1,documents:1,activities:0,version:0});
});

test('schema drift preserves a restorable backup but blocks release readiness',t=>{
  const root=fixture(t);
  const db=new DatabaseSync(path.join(root,'studio.sqlite'));
  db.exec('DROP INDEX messages_channel;');
  db.close();
  const result=run(root);
  assert.equal(result.status,2,result.stderr);
  const out=JSON.parse(result.stdout);
  assert.equal(out.restore,'PASS');
  assert.equal(out.r24StoreRestoreCompatibility,'BLOCKED');
  assert.equal(out.releaseSchemaGate,'BLOCKED');
  assert.equal(inspectSnapshot(latestBundle(root)).member,1);
  assert.equal(existsSync(path.join(root,'studio.sqlite')),true);
});

test('unexpected state files prevent claiming a full state backup',t=>{
  const root=fixture(t);
  writeFileSync(path.join(root,'other-important-state.txt'),'test',
    {mode:0o600});
  const result=run(root);
  assert.equal(result.status,1);
  assert.match(result.stderr,/Unaccounted-for persistent state/);
  assert.equal(existsSync(path.join(root,'backups')),false);
});

test('symlinked recovery files are rejected',t=>{
  const root=fixture(t);
  symlinkSync(path.join(root,'missing-secret'),path.join(root,'setup-link.txt'));
  const result=run(root);
  assert.equal(result.status,1);
  assert.match(result.stderr,/private file/);
  assert.equal(existsSync(path.join(root,'backups')),false);
});

test('nonprivate setup-link permissions are rejected before backup',t=>{
  const root=fixture(t,{bootstrap:true});
  chmodSync(path.join(root,'setup-link.txt'),0o644);
  const result=run(root);
  assert.equal(result.status,1);
  assert.match(result.stderr,/private permissions/);
  assert.equal(existsSync(path.join(root,'backups')),false);
});

test('cannot silently use an unknown or relative Production path',t=>{
  const result=spawnSync(process.execPath,[script,'--data-dir','.studio'],{
    encoding:'utf8',timeout:10000
  });
  assert.equal(result.status,1);
  assert.match(result.stderr,/Usage/);
});
