/**
 * SCHMAQQ SQLite migrations, R24-D.
 *
 * No Production write CLI exists. The exported executor is gated to marked,
 * owner-private test fixtures under the OS temporary directory. Real
 * deployments require a separately reviewed operator path and fresh backup.
 */
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {
  lstatSync, readFileSync, realpathSync, statSync
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectSchema,resolveExpectedSchema} from './schema-preflight.mjs';
import {assertPrivatePath} from '../private-path.mjs';

function isPrivatePath(location) {
  try { assertPrivatePath(location); return true; }
  catch { return false; }
}

const BASELINE_FILE = fileURLToPath(new URL('./schema-baseline.v0.json', import.meta.url));
const TEST_MARKER = '.schmaqq-migration-test-copy';
const TEST_MARKER_CONTENT = 'SYNTHETIC_ONLY_MIGRATION_TEST';
const CREATE_LEDGER = [
  'CREATE TABLE schema_migrations(',
  '  version INTEGER PRIMARY KEY CHECK(version >= 1),',
  '  name TEXT NOT NULL,',
  '  checksum TEXT NOT NULL,',
  '  applied_at INTEGER NOT NULL CHECK(applied_at > 0)',
  ')'
].join('\n');

const sqlHash = sql => createHash('sha256')
  .update((sql ?? '').replace(/\s+/g, ' ').trim()).digest('hex');
const checksum = value => createHash('sha256').update(value).digest('hex');

export const migrations = Object.freeze([Object.freeze({
  version: 1,
  name: '0001_establish_migration_ledger',
  sql: CREATE_LEDGER,
  checksum: checksum('1\n0001_establish_migration_ledger\n' + CREATE_LEDGER)
})]);

function refused(reason) {
  throw new Error('Schema migration refused: ' + reason);
}

function openReadOnly(filename) {
  const real = path.resolve(filename);
  const info = lstatSync(real);
  if (!info.isFile() || info.isSymbolicLink()) refused('existing regular SQLite file required');
  const db = new DatabaseSync(real, {readOnly: true});
  db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000;');
  return db;
}

function blocked(version, reasons) {
  return {
    status: 'BLOCKED', fromVersion: version, targetVersion: 1,
    pending: [], issues: reasons, migrationPerformed: false
  };
}

function inspectVersionOne(filename) {
  const db = openReadOnly(filename);
  try {
    const base = JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
    const issues = [];
    const integrity = db.prepare('PRAGMA integrity_check').all();
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
      issues.push('integrity_check failed');
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length) {
      issues.push('foreign_key_check failed');
    }

    const objects = db.prepare(
      "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type,name"
    ).all();
    const actual = new Map(objects.map(row => [
      row.type + ':' + row.name,
      {type: row.type, name: row.name, table: row.tbl_name, sqlHash: sqlHash(row.sql)}
    ]));
    const resolved=resolveExpectedSchema(base,actual);
    const expected=resolved.expected;
    expected.set('table:schema_migrations', {
      type: 'table', name: 'schema_migrations', table: 'schema_migrations',
      sqlHash: sqlHash(CREATE_LEDGER)
    });

    for (const [key, item] of expected) {
      const seen = actual.get(key);
      if (!seen) issues.push('missing object: ' + key);
      else if (JSON.stringify(seen) !== JSON.stringify(item)) issues.push('changed object: ' + key);
    }
    for (const key of actual.keys()) {
      if (!expected.has(key)) issues.push('unknown object: ' + key);
    }

    // Recheck columns and FK definitions; comparing only table names is not enough.
    for (const [name, structure] of Object.entries(resolved.tables)) {
      if (!/^[a-z_]+$/.test(name)) refused('invalid trusted baseline identifier');
      if (!actual.has('table:' + name)) continue;
      const columns = db.prepare('PRAGMA table_info("' + name + '")').all().map(
        ({name, type, notnull, dflt_value, pk}) => ({name,type,notnull,dflt_value,pk})
      );
      const foreignKeys = db.prepare('PRAGMA foreign_key_list("' + name + '")').all().map(
        ({id,seq,table:parent,from,to,on_update,on_delete,match}) =>
          ({id,seq,parent,from,to,on_update,on_delete,match})
      );
      if (JSON.stringify(columns) !== JSON.stringify(structure.columns) ||
          JSON.stringify(foreignKeys) !== JSON.stringify(structure.foreignKeys)) {
        issues.push('changed table structure: ' + name);
      }
    }

    if (actual.has('table:schema_migrations')) {
      const columns = db.prepare("PRAGMA table_info('schema_migrations')").all()
        .map(x => x.name);
      if (JSON.stringify(columns) !== JSON.stringify(['version','name','checksum','applied_at'])) {
        issues.push('migration history columns mismatch');
      } else {
        const history = db.prepare(
          'SELECT version,name,checksum,applied_at FROM schema_migrations ORDER BY version'
        ).all();
        const [expectedMigration] = migrations;
        if (history.length !== 1 || history[0].version !== 1 ||
            history[0].name !== expectedMigration.name ||
            history[0].checksum !== expectedMigration.checksum ||
            !Number.isSafeInteger(history[0].applied_at) ||
            history[0].applied_at <= 0) {
          issues.push('migration ledger mismatch or altered checksum');
        }
      }
    }
    return issues;
  } finally {
    db.close();
  }
}

/** Pure observation: never calls openStore() or writes to SQLite. */
export function planMigrations(filename) {
  let version;
  const db = openReadOnly(filename);
  try {
    version = db.prepare('PRAGMA user_version').get().user_version;
  } finally {
    db.close();
  }

  if (version === 0) {
    const baseline = inspectSchema(filename);
    if (baseline.status !== 'PASS') {
      return blocked(version, [
        'R23 unversioned baseline does not match',
        ...baseline.missingObjects.map(v => 'missing: ' + v),
        ...baseline.unexpectedObjects.map(v => 'unexpected: ' + v),
        ...baseline.differentObjects.map(v => 'changed: ' + v),
        ...baseline.tableDifferences.map(v => 'changed table: ' + v),
        ...(baseline.integrity !== 'ok' ? ['integrity_check failed'] : []),
        ...(baseline.foreignKeyFailures ? ['foreign_key_check failed'] : [])
      ]);
    }
    return {
      status: 'READY', fromVersion: 0, targetVersion: 1,
      pending: migrations.map(({version,name,checksum}) => ({version,name,checksum})),
      issues: [], migrationPerformed: false
    };
  }
  if (version === 1) {
    const issues = inspectVersionOne(filename);
    if (issues.length) return blocked(version, issues);
    return {
      status: 'CURRENT', fromVersion: 1, targetVersion: 1,
      pending: [], issues: [], migrationPerformed: false
    };
  }
  return blocked(version, ['Unknown database user_version; operator review required']);
}

/** Strict test-copy gate. No CLI exposes write access to Production. */
function assertSyntheticTestCopy(filename) {
  const full = path.resolve(filename);
  const parent = path.dirname(full);
  const realParent = realpathSync(parent);
  const tmpRoot = realpathSync(os.tmpdir());
  if (!realParent.startsWith(tmpRoot + path.sep + 'schmaqq-migration-fixture-') ||
      realParent !== parent) {
    refused('write execution is restricted to isolated synthetic test fixtures');
  }
  const stat = statSync(realParent);
  if (!stat.isDirectory() || !isPrivatePath(realParent)) {
    refused('fixture directory permissions are not private');
  }
  const dbFile = lstatSync(full);
  if (!dbFile.isFile() || dbFile.isSymbolicLink() || dbFile.nlink !== 1) {
    refused('test database must be one regular nonlinked file');
  }
  const markerPath = path.join(realParent, TEST_MARKER);
  const marker = lstatSync(markerPath);
  if (!marker.isFile() || marker.isSymbolicLink() ||
      !isPrivatePath(markerPath) ||
      readFileSync(markerPath,'utf8').trim() !== TEST_MARKER_CONTENT) {
    refused('explicit private synthetic-copy marker required');
  }
}

/**
 * Applies only the version-1 ledger bootstrap to a marked disposable fixture.
 * No arbitrary SQL migrations, schema rewrites, or Production mutation.
 */
export function applyToSyntheticTestCopy(filename, {injectFailure = false} = {}) {
  assertSyntheticTestCopy(filename);
  const before = planMigrations(filename);
  if (before.status === 'CURRENT') return {status:'CURRENT', applied:[], migrationPerformed:false};
  if (before.status !== 'READY') refused('schema preflight did not pass');

  const db = new DatabaseSync(path.resolve(filename));
  let started = false;
  try {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE;');
    started = true;
    if (db.prepare('PRAGMA user_version').get().user_version !== 0) {
      refused('version changed after preflight');
    }
    const migration = migrations[0];
    db.exec(migration.sql);
    db.prepare(
      'INSERT INTO schema_migrations(version,name,checksum,applied_at) VALUES(?,?,?,?)'
    ).run(migration.version, migration.name, migration.checksum, Date.now());
    db.exec('PRAGMA user_version = 1;');
    if (injectFailure) refused('injected failure after DDL, rollback required');
    if (db.prepare('PRAGMA foreign_key_check').all().length) {
      refused('foreign-key failures after migration');
    }
    db.exec('COMMIT;');
    started = false;
  } catch (error) {
    if (started) db.exec('ROLLBACK;');
    throw error;
  } finally {
    db.close();
  }
  const after = planMigrations(filename);
  if (after.status !== 'CURRENT') refused('postmigration verification failed');
  return {
    status:'CURRENT',
    applied:migrations.map(({version,name,checksum})=>({version,name,checksum})),
    migrationPerformed:true
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2 || args[0] !== '--db') {
      throw new Error('Usage: node schema-migration.mjs --db /existing/studio.sqlite (read-only plan)');
    }
    const result = planMigrations(args[1]);
    console.log(JSON.stringify(result,null,2));
    if (result.status === 'BLOCKED') process.exitCode = 1;
  } catch (error) {
    console.error('Migration planning failed:', error.code ?? error.message);
    process.exitCode = 1;
  }
}
