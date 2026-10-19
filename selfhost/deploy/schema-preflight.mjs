import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultBaseline = fileURLToPath(new URL('./schema-baseline.v0.json', import.meta.url));
const sqlHash = sql => createHash('sha256').update((sql ?? '').replace(/\s+/g, ' ').trim()).digest('hex');

export function inspectSchema(filename, baselineFile = defaultBaseline) {
  // This check must never call openStore(): openStore() creates tables and
  // initial projects. A production schema preflight is strictly read-only.
  const full = path.resolve(filename);
  const stat = lstatSync(full);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Existing regular SQLite file required.');
  const baseline = JSON.parse(readFileSync(baselineFile, 'utf8'));
  if (baseline.format !== 1 || baseline.userVersion !== 0) {
    throw new Error('Unsupported schema baseline format.');
  }

  const db = new DatabaseSync(full, {readOnly: true});
  try {
    db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    const integrity = db.prepare('PRAGMA integrity_check').all();
    const brokenForeignKeys = db.prepare('PRAGMA foreign_key_check').all().length;
    const objects = db.prepare(
      "SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type,name"
    ).all();
    const actual = new Map(objects.map(({type,name,tbl_name,sql}) => [
      type + ':' + name, {type, name, table:tbl_name, sqlHash:sqlHash(sql)}
    ]));
    const expected = new Map(baseline.objects.map(object => [
      object.type + ':' + object.name, object
    ]));
    const missingObjects = [...expected.keys()].filter(name => !actual.has(name));
    const unexpectedObjects = [...actual.keys()].filter(name => !expected.has(name));
    const differentObjects = [...expected.keys()].filter(name => actual.has(name) &&
      JSON.stringify(actual.get(name)) !== JSON.stringify(expected.get(name)));

    const tableDifferences = [];
    for (const [name, structure] of Object.entries(baseline.tables)) {
      if (!actual.has('table:' + name)) continue;
      if (!/^[a-z_]+$/.test(name)) throw new Error('Malformed trusted baseline table identifier.');
      const cols = db.prepare('PRAGMA table_info("' + name + '")').all().map(
        ({name,type,notnull,dflt_value,pk}) => ({name,type,notnull,dflt_value,pk})
      );
      const fks = db.prepare('PRAGMA foreign_key_list("' + name + '")').all().map(
        ({id,seq,table:parent,from,to,on_update,on_delete,match}) =>
          ({id,seq,parent,from,to,on_update,on_delete,match})
      );
      if (JSON.stringify(cols) !== JSON.stringify(structure.columns) ||
          JSON.stringify(fks) !== JSON.stringify(structure.foreignKeys)) {
        tableDifferences.push(name);
      }
    }
    const clean = version === baseline.userVersion &&
      integrity.length === 1 && integrity[0].integrity_check === 'ok' &&
      brokenForeignKeys === 0 && !missingObjects.length &&
      !unexpectedObjects.length && !differentObjects.length && !tableDifferences.length;

    return {
      status: clean ? 'PASS' : 'BLOCKED',
      schema: 'R23-unversioned-v0',
      userVersion: version,
      expectedVersion: baseline.userVersion,
      integrity: integrity.length === 1 && integrity[0].integrity_check === 'ok' ? 'ok' : 'failed',
      foreignKeyFailures: brokenForeignKeys,
      observedObjects: objects.length,
      missingObjects, unexpectedObjects, differentObjects, tableDifferences,
      migrationPerformed: false,
      recommendation: clean ? 'Baseline-compatible; future schema changes require a versioned migration.' :
        'STOP: unknown or damaged schema. Investigate against backup; do not auto-migrate.'
    };
  } finally {db.close();}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  try {
    if (args.length !== 2 || args[0] !== '--db') throw new Error('Usage: node schema-preflight.mjs --db /existing/studio.sqlite');
    const report = inspectSchema(args[1]);
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    console.error('Schema inspection could not be completed:', error.code ?? error.message);
    process.exitCode = 1;
  }
}
