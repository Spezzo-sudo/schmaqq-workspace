import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {
  mkdtempSync, writeFileSync, rmSync, existsSync,
  chmodSync, symlinkSync, statSync, readFileSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from './store.mjs';
import {applyToSyntheticTestCopy,planMigrations,migrations} from './deploy/schema-migration.mjs';

const script = fileURLToPath(new URL('./deploy/schema-migration.mjs',import.meta.url));

function fixture(t, {marker = true} = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'schmaqq-migration-fixture-'));
  t.after(() => rmSync(dir, {force:true,recursive:true}));
  if (marker) {
    writeFileSync(path.join(dir,'.schmaqq-migration-test-copy'),
      'SYNTHETIC_ONLY_MIGRATION_TEST\n',{mode:0o600});
  }
  const filename = path.join(dir,'studio.sqlite');
  const db = openStore(filename);
  db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(
    'u-fixture','Fixture User','fixture@example.invalid','fake-hash','owner',0
  );
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run('session-fake','u-fixture',1890000000000);
  db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(
    'task-fixture','website','Persist across migration','synthetic','doing','Normal','u-fixture',1
  );
  db.close();
  return {dir,filename};
}

function withWritableDb(filename,fn) {
  const db=new DatabaseSync(filename);
  try{return fn(db);}
  finally{db.close();}
}

function state(filename) {
  const db=new DatabaseSync(filename,{readOnly:true});
  try {
    return {
      version:db.prepare('PRAGMA user_version').get().user_version,
      users:db.prepare('SELECT count(*) AS n FROM members').get().n,
      sessions:db.prepare('SELECT count(*) AS n FROM sessions').get().n,
      tasks:db.prepare('SELECT count(*) AS n FROM tasks').get().n,
      ledger:db.prepare(
        "SELECT COUNT(*) AS n FROM sqlite_master WHERE name='schema_migrations'"
      ).get().n,
      integrity:db.prepare('PRAGMA integrity_check').get().integrity_check,
      foreignKeys:db.prepare('PRAGMA foreign_key_check').all().length
    };
  } finally{db.close();}
}

test('read-only plan on R23 version 0 exposes only pinned v1 migration',t=>{
  const {filename}=fixture(t);
  const before=state(filename);
  const plan=planMigrations(filename);
  assert.equal(plan.status,'READY');
  assert.equal(plan.fromVersion,0);
  assert.equal(plan.targetVersion,1);
  assert.equal(plan.migrationPerformed,false);
  assert.deepEqual(plan.pending.map(x=>x.version),[1]);
  assert.equal(plan.pending[0].checksum,migrations[0].checksum);
  assert.deepEqual(state(filename),before);
});

test('atomic migration creates version ledger and preserves every fixture row',t=>{
  const {filename}=fixture(t);
  const before=state(filename);
  const result=applyToSyntheticTestCopy(filename);
  assert.equal(result.status,'CURRENT');
  assert.equal(result.migrationPerformed,true);
  const after=state(filename);
  assert.equal(after.version,1);
  assert.equal(after.ledger,1);
  assert.equal(after.users,before.users);
  assert.equal(after.tasks,before.tasks);
  assert.equal(after.sessions,before.sessions);
  assert.equal(after.integrity,'ok');
  assert.equal(after.foreignKeys,0);
  assert.equal(planMigrations(filename).status,'CURRENT');
  assert.deepEqual(planMigrations(filename).pending,[]);
});

test('repeated invocation is a safe no-op and original R23 openStore stays compatible',t=>{
  const {filename}=fixture(t);
  applyToSyntheticTestCopy(filename);
  const first=state(filename);
  assert.equal(applyToSyntheticTestCopy(filename).migrationPerformed,false);
  const db=openStore(filename);
  try {assert.equal(db.prepare('PRAGMA user_version').get().user_version,1);}
  finally{db.close();}
  assert.deepEqual(state(filename),first);
});

test('injected failure rolls back ledger creation and version atomically',t=>{
  const {filename}=fixture(t);
  const before=state(filename);
  assert.throws(
    ()=>applyToSyntheticTestCopy(filename,{injectFailure:true}),
    /injected failure/
  );
  assert.deepEqual(state(filename),before);
  assert.equal(planMigrations(filename).status,'READY');
});

test('unknown future database version blocks without any writes',t=>{
  const {filename}=fixture(t);
  withWritableDb(filename,db=>db.exec('PRAGMA user_version = 23'));
  const before=state(filename);
  const result=planMigrations(filename);
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.fromVersion,23);
  assert.deepEqual(state(filename),before);
  assert.throws(()=>applyToSyntheticTestCopy(filename),/preflight/);
});

test('partial legacy v0 schema is blocked instead of repaired automatically',t=>{
  const {filename}=fixture(t);
  withWritableDb(filename,db=>db.exec('DROP INDEX messages_channel'));
  const result=planMigrations(filename);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.issues.some(value=>value.includes('messages_channel')));
  assert.throws(()=>applyToSyntheticTestCopy(filename),/preflight/);
});

test('tampered migration checksum is detected with no automatic repair',t=>{
  const {filename}=fixture(t);
  applyToSyntheticTestCopy(filename);
  withWritableDb(filename,db=>db.prepare('UPDATE schema_migrations SET checksum=?').run('tampered'));
  const result=planMigrations(filename);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.issues.some(value=>value.includes('checksum')));
  assert.throws(()=>applyToSyntheticTestCopy(filename),/preflight/);
});

test('untracked extra v1 table is blocked',t=>{
  const {filename}=fixture(t);
  applyToSyntheticTestCopy(filename);
  withWritableDb(filename,db=>db.exec('CREATE TABLE unreviewed_addition(foo TEXT)'));
  const result=planMigrations(filename);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.issues.some(v=>v.includes('unreviewed_addition')));
});

test('test-copy executor refuses an unmarked database',t=>{
  const {filename}=fixture(t,{marker:false});
  assert.throws(()=>applyToSyntheticTestCopy(filename));
  assert.equal(state(filename).version,0);
});

test('test-copy executor refuses a linked database path',t=>{
  const {filename,dir}=fixture(t);
  const link=path.join(dir,'linked.sqlite');
  symlinkSync(filename,link);
  assert.throws(()=>applyToSyntheticTestCopy(link),/test database/);
  assert.equal(state(filename).version,0);
});

test('test-copy executor refuses directory whose marker is publicly readable',t=>{
  const {filename,dir}=fixture(t);
  chmodSync(path.join(dir,'.schmaqq-migration-test-copy'),0o644);
  assert.throws(()=>applyToSyntheticTestCopy(filename),/private synthetic-copy marker/);
  assert.equal(state(filename).version,0);
});

test('test-copy executor refuses paths outside synthetic fixture root',t=>{
  const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-unmarked-'));
  t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const file=path.join(dir,'studio.sqlite');
  const db=openStore(file);db.close();
  assert.throws(()=>applyToSyntheticTestCopy(file),/restricted/);
  assert.equal(state(file).version,0);
});

test('CLI allows read-only plans but not writes or new databases',t=>{
  const {filename}=fixture(t);
  const out=spawnSync(process.execPath,[script,'--db',filename],{encoding:'utf8',timeout:15000});
  assert.equal(out.status,0,out.stderr);
  assert.equal(JSON.parse(out.stdout).status,'READY');
  const attempt=spawnSync(process.execPath,[script,'--apply','--db',filename],{encoding:'utf8',timeout:15000});
  assert.notEqual(attempt.status,0);
  assert.equal(state(filename).version,0);
  const missing=path.join(path.dirname(filename),'absent.sqlite');
  const absent=spawnSync(process.execPath,[script,'--db',missing],{encoding:'utf8',timeout:15000});
  assert.notEqual(absent.status,0);
  assert.equal(existsSync(missing),false);
});

test('FK-broken legacy database is refused',t=>{
  const {filename}=fixture(t);
  withWritableDb(filename,db=>{
    db.exec('PRAGMA foreign_keys=OFF');
    db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(
      'orphan','no-project','Orphan','', 'todo','Normal', null, Date.now()
    );
  });
  const result=planMigrations(filename);
  assert.equal(result.status,'BLOCKED');
  assert.ok(result.issues.some(v=>v.includes('foreign_key_check')));
  assert.throws(()=>applyToSyntheticTestCopy(filename),/preflight/);
});
