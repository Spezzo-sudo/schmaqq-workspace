import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {lstatSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const defaultBaseline = fileURLToPath(new URL('./schema-baseline.v0.json', import.meta.url));
const authExtensionFile = fileURLToPath(new URL('./schema-auth-extension.v0.json', import.meta.url));
const pluginExtensionFile = fileURLToPath(new URL('./schema-plugin-extension.v1.json', import.meta.url));
const agentExtensionFile = fileURLToPath(new URL('./schema-agent-extension.v1.json', import.meta.url));
const chatExtensionFile = fileURLToPath(new URL('./schema-chat-extension.v1.json', import.meta.url));
const sqlHash = sql => createHash('sha256').update((sql ?? '').replace(/\s+/g, ' ').trim()).digest('hex');

/**
 * R23 always creates these four optional/authentication tables in the
 * HTTP route initializers, not in openStore(). A standalone openStore()
 * synthetic fixture has the core schema only; a real R23 server has the
 * complete auth quartet. Accept either COMPLETE signed-off schema
 * fingerprint, but never a partial set, name-only match or unknown object.
 *
 * The immutable JSON fingerprint was generated from the exact R23
 * oidc.mjs/connections.mjs SQL under SQLite on a synthetic fixture.
 * This is a pure read-only expected-schema resolver.
 */
export function resolveExpectedSchema(base, actual) {
  const optional = JSON.parse(readFileSync(authExtensionFile,'utf8'));
  if(optional.format!==1 ||
     optional.sourceCommit!=='aef64f85efeeb40f6c0f3a7dc43986a52a20f09f' ||
     optional.profile!=='R23-v0-auth-extensions' ||
     !Array.isArray(optional.objects) || optional.objects.length!==4 ||
     Object.keys(optional.tables??{}).length!==4 ||
     optional.objects.some(obj=>obj.type!=='table' ||
       !/^(github_attempts|github_connections|oidc_attempts|oidc_identities)$/.test(obj.name))) {
    throw new Error('Unrecognized pinned R23 authentication schema fingerprint.');
  }
  const expected=new Map(base.objects.map(item=>[item.type+':'+item.name,item]));
  const authKeys=optional.objects.map(x=>x.type+':'+x.name);
  const pinnedNames=['github_attempts','github_connections',
    'oidc_attempts','oidc_identities'];
  const observedNames=optional.objects.map(x=>x.name).sort();
  const tableNames=Object.keys(optional.tables).sort();
  if(new Set(authKeys).size!==4 ||
     JSON.stringify(observedNames)!==JSON.stringify(pinnedNames) ||
     JSON.stringify(tableNames)!==JSON.stringify(pinnedNames) ||
     optional.objects.some(x=>x.table!==x.name ||
       !/^[a-f0-9]{64}$/.test(x.sqlHash)) ||
     pinnedNames.some(name=>{
       const structure=optional.tables[name];
       return !structure || !Array.isArray(structure.columns) ||
         !Array.isArray(structure.foreignKeys);
     }) ||
     authKeys.some(k=>expected.has(k))) {
    throw new Error('Invalid or overlapping pinned R23 schema objects.');
  }
  const seen=authKeys.filter(x=>actual.has(x));
  const profile=seen.length===0?'R23-v0-core-only':
    seen.length===4?'R23-v0-with-complete-auth':'R23-v0-partial-auth-BLOCKED';
  const complete=seen.length===4;
  if(complete){
    for(const obj of optional.objects)expected.set(obj.type+':'+obj.name,obj);
  }
  const plugin=pluginExtension(expected,actual);
  const agent=agentExtension(expected,actual);
  const chat=chatExtension(expected,actual);
  return {
    expected,
    tables:{...base.tables,...(complete?optional.tables:{}),...(plugin.complete?plugin.tables:{}),...(agent.complete?agent.tables:{}),...(chat.complete?chat.tables:{})},
    profile,
    completeAuthExtension:complete,
    pluginExtension:plugin.state,
    agentExtension:agent.state,
    chatExtension:chat.state
  };
}

/**
 * The personal plugin authorization creates its own tables (plugin_*) in the
 * Studio database when it is enabled. Like the auth quartet, the extension is
 * accepted only when every pinned object is present with the exact SQL,
 * columns and foreign keys; a partial or altered set stays unexpected and
 * therefore BLOCKED. Pinned from the code by schema-plugin-profile.test.mjs.
 */
function pluginExtension(expected,actual){
  return pinnedExtension(pluginExtensionFile,'plugin-oauth-extension',/^plugin_[a-z_]+$/,expected,actual);
}

/**
 * Agent runs, their work steps and task proposals (agent_*). Created only where a worker is bound to a
 * person; accepted on the same terms as the plugin extension: complete and exact, or not at all.
 * Pinned from the code by schema-agent-profile.test.mjs.
 */
function agentExtension(expected,actual){
  return pinnedExtension(agentExtensionFile,'agent-run-extension',/^agent_[a-z_]+$/,expected,actual);
}

/**
 * Private one-to-one chats (chat_*): which project messages belong to a private conversation.
 * Created when the Studio server starts; pinned from the code by schema-chat-profile.test.mjs.
 */
function chatExtension(expected,actual){
  return pinnedExtension(chatExtensionFile,'chat-private-extension',/^chat_[a-z_]+$/,expected,actual);
}

function pinnedExtension(file,profile,namePattern,expected,actual){
  const extension=JSON.parse(readFileSync(file,'utf8'));
  const keys=(extension.objects??[]).map(x=>x.type+':'+x.name);
  if(extension.format!==1||extension.profile!==profile||!keys.length||
     new Set(keys).size!==keys.length||
     extension.objects.some(x=>!['table','index'].includes(x.type)||!namePattern.test(x.name)||!namePattern.test(x.table)||!/^[a-f0-9]{64}$/.test(x.sqlHash))||
     extension.objects.filter(x=>x.type==='table').some(x=>!Array.isArray(extension.tables?.[x.name]?.columns)||!Array.isArray(extension.tables[x.name].foreignKeys))||
     keys.some(k=>expected.has(k))){
    throw new Error('Invalid pinned schema extension: '+profile+'.');
  }
  const seen=keys.filter(k=>actual.has(k)).length;
  if(seen!==keys.length)return {state:seen?'partial-BLOCKED':'absent',complete:false};
  for(const obj of extension.objects)expected.set(obj.type+':'+obj.name,obj);
  return {state:'complete',complete:true,tables:extension.tables};
}


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
    const resolved=resolveExpectedSchema(baseline,actual);
    const expected=resolved.expected;
    const missingObjects = [...expected.keys()].filter(name => !actual.has(name));
    const unexpectedObjects = [...actual.keys()].filter(name => !expected.has(name));
    const differentObjects = [...expected.keys()].filter(name => actual.has(name) &&
      JSON.stringify(actual.get(name)) !== JSON.stringify(expected.get(name)));

    const tableDifferences = [];
    for (const [name, structure] of Object.entries(resolved.tables)) {
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
      schemaProfile: resolved.profile,
      pluginExtension: resolved.pluginExtension,
      agentExtension: resolved.agentExtension,
      chatExtension: resolved.chatExtension,
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
