import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {openStore} from './store.mjs';
import {createOidcRoutes} from './oidc.mjs';
import {createConnectionRoutes} from './connections.mjs';
import {createAgentRunRoute} from './agent-run-http.mjs';
import {inspectSchema} from './deploy/schema-preflight.mjs';
import {planMigrations} from './deploy/schema-migration.mjs';

const pinned=JSON.parse(readFileSync(fileURLToPath(new URL('./deploy/schema-agent-extension.v1.json',import.meta.url)),'utf8'));
const sqlHash=sql=>createHash('sha256').update((sql??'').replace(/\s+/g,' ').trim()).digest('hex');
const worker={owner:'member-1',token:'w'.repeat(43)};

function fixture(t,{agents=true}={}){
 const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-agent-schema-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const filename=path.join(root,'studio.sqlite'),db=openStore(filename);
 const arg={db,origin:'http://127.0.0.1:55119',sessionCookie:'test',provider:null};
 createOidcRoutes(arg);createConnectionRoutes(arg);
 createAgentRunRoute({db,workers:agents?[worker]:[]});
 db.close();return filename;
}
const change=(filename,act)=>{const db=new DatabaseSync(filename);try{act(db);}finally{db.close();}};

test('pinned agent schema extension equals what the agent code creates',t=>{
 const filename=fixture(t),db=new DatabaseSync(filename,{readOnly:true});
 try{
  const objects=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name LIKE 'agent_%' ORDER BY type,name").all().map(o=>({type:o.type,name:o.name,table:o.tbl_name,sqlHash:sqlHash(o.sql)}));
  assert.deepEqual(objects,pinned.objects,'Agent SQL changed: a schema change needs a reviewed fingerprint update');
  for(const name of Object.keys(pinned.tables)){
   assert.deepEqual(db.prepare(`PRAGMA table_info("${name}")`).all().map(({name,type,notnull,dflt_value,pk})=>({name,type,notnull,dflt_value,pk})),pinned.tables[name].columns,name);
  }
 }finally{db.close();}
});

test('agents switched off create no agent tables; switched on, the release preflight accepts the extension',t=>{
 const off=inspectSchema(fixture(t,{agents:false}));
 assert.equal(off.status,'PASS',JSON.stringify(off));assert.equal(off.agentExtension,'absent');
 const on=inspectSchema(fixture(t));
 assert.equal(on.status,'PASS',JSON.stringify(on));assert.equal(on.agentExtension,'complete');
 assert.equal(planMigrations(fixture(t)).status,'READY');
});

test('a partial or altered agent extension blocks instead of being accepted by name',t=>{
 const partial=fixture(t);change(partial,db=>db.exec('DROP TABLE agent_proposals'));
 const blocked=inspectSchema(partial);
 assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.agentExtension,'partial-BLOCKED');assert.ok(blocked.unexpectedObjects.includes('table:agent_runs'));
 const altered=fixture(t);change(altered,db=>db.exec('ALTER TABLE agent_runs ADD COLUMN note TEXT'));
 const drift=inspectSchema(altered);
 assert.equal(drift.status,'BLOCKED');assert.ok(drift.differentObjects.includes('table:agent_runs')||drift.tableDifferences.includes('agent_runs'));
 const extra=fixture(t);change(extra,db=>db.exec('CREATE TABLE agent_unknown(id TEXT)'));
 assert.equal(inspectSchema(extra).status,'BLOCKED');
});
