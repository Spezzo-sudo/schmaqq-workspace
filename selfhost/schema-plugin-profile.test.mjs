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
import {createPluginAuth} from './studio-plugin-auth.mjs';
import {inspectSchema} from './deploy/schema-preflight.mjs';
import {planMigrations} from './deploy/schema-migration.mjs';

const pinned=JSON.parse(readFileSync(fileURLToPath(new URL('./deploy/schema-plugin-extension.v1.json',import.meta.url)),'utf8'));
const sqlHash=sql=>createHash('sha256').update((sql??'').replace(/\s+/g,' ').trim()).digest('hex');

function fixture(t,{plugin=true}={}){
 const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-plugin-schema-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const filename=path.join(root,'studio.sqlite'),db=openStore(filename);
 const arg={db,origin:'http://127.0.0.1:55119',sessionCookie:'test',provider:null};
 createOidcRoutes(arg);createConnectionRoutes(arg);
 if(plugin)createPluginAuth({db,issuer:'http://127.0.0.1:55119',clients:[]});
 db.close();return filename;
}
const change=(filename,act)=>{const db=new DatabaseSync(filename);try{act(db);}finally{db.close();}};

test('pinned plugin schema extension equals what the plugin code creates',t=>{
 const filename=fixture(t),db=new DatabaseSync(filename,{readOnly:true});
 try{
  const objects=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name LIKE 'plugin_%' ORDER BY type,name").all().map(o=>({type:o.type,name:o.name,table:o.tbl_name,sqlHash:sqlHash(o.sql)}));
  assert.deepEqual(objects,pinned.objects,'Plugin SQL changed: a schema change needs a reviewed fingerprint update');
  for(const name of Object.keys(pinned.tables)){
   assert.deepEqual(db.prepare(`PRAGMA table_info("${name}")`).all().map(({name,type,notnull,dflt_value,pk})=>({name,type,notnull,dflt_value,pk})),pinned.tables[name].columns,name);
  }
 }finally{db.close();}
});

test('a complete plugin extension passes the release preflight and keeps migrations ready',t=>{
 const result=inspectSchema(fixture(t));
 assert.equal(result.status,'PASS',JSON.stringify(result));
 assert.equal(result.schemaProfile,'R23-v0-with-complete-auth');assert.equal(result.pluginExtension,'complete');
 assert.equal(planMigrations(fixture(t)).status,'READY');
 const without=inspectSchema(fixture(t,{plugin:false}));assert.equal(without.status,'PASS');assert.equal(without.pluginExtension,'absent');
});

test('a partial or altered plugin extension blocks instead of being accepted by name',t=>{
 const partial=fixture(t);change(partial,db=>db.exec('DROP TABLE plugin_clients'));
 const blocked=inspectSchema(partial);
 assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.pluginExtension,'partial-BLOCKED');assert.ok(blocked.unexpectedObjects.includes('table:plugin_grants'));
 const altered=fixture(t);change(altered,db=>db.exec('ALTER TABLE plugin_grants ADD COLUMN note TEXT'));
 const drift=inspectSchema(altered);
 assert.equal(drift.status,'BLOCKED');assert.ok(drift.differentObjects.includes('table:plugin_grants')||drift.tableDifferences.includes('plugin_grants'));
 const extra=fixture(t);change(extra,db=>db.exec('CREATE TABLE plugin_unknown(id TEXT)'));
 assert.equal(inspectSchema(extra).status,'BLOCKED');
});
