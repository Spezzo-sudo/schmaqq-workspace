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
import {ensureChatSchema} from './chat-scope.mjs';
import {inspectSchema} from './deploy/schema-preflight.mjs';
import {planMigrations} from './deploy/schema-migration.mjs';

const pinned=JSON.parse(readFileSync(fileURLToPath(new URL('./deploy/schema-chat-extension.v1.json',import.meta.url)),'utf8'));
const sqlHash=sql=>createHash('sha256').update((sql??'').replace(/\s+/g,' ').trim()).digest('hex');

function fixture(t,{chat=true}={}){
 const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-agent-schema-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const filename=path.join(root,'studio.sqlite'),db=openStore(filename);
 const arg={db,origin:'http://127.0.0.1:55119',sessionCookie:'test',provider:null};
 createOidcRoutes(arg);createConnectionRoutes(arg);
 if(chat)ensureChatSchema(db);
 db.close();return filename;
}
const change=(filename,act)=>{const db=new DatabaseSync(filename);try{act(db);}finally{db.close();}};

test('pinned chat schema extension equals what the chat code creates',t=>{
 const filename=fixture(t),db=new DatabaseSync(filename,{readOnly:true});
 try{
  const objects=db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger') AND name LIKE 'chat_%' ORDER BY type,name").all().map(o=>({type:o.type,name:o.name,table:o.tbl_name,sqlHash:sqlHash(o.sql)}));
  assert.deepEqual(objects,pinned.objects,'Chat SQL changed: a schema change needs a reviewed fingerprint update');
  for(const name of Object.keys(pinned.tables)){
   assert.deepEqual(db.prepare(`PRAGMA table_info("${name}")`).all().map(({name,type,notnull,dflt_value,pk})=>({name,type,notnull,dflt_value,pk})),pinned.tables[name].columns,name);
  }
 }finally{db.close();}
});

test('a database from before private chats passes; with them the release preflight accepts the extension',t=>{
 const off=inspectSchema(fixture(t,{chat:false}));
 assert.equal(off.status,'PASS',JSON.stringify(off));assert.equal(off.chatExtension,'absent');
 const on=inspectSchema(fixture(t));
 assert.equal(on.status,'PASS',JSON.stringify(on));assert.equal(on.chatExtension,'complete');
 assert.equal(planMigrations(fixture(t)).status,'READY');
});

test('a partial or altered chat extension blocks instead of being accepted by name',t=>{
 const partial=fixture(t);change(partial,db=>db.exec('DROP INDEX chat_private_scope'));
 const blocked=inspectSchema(partial);
 assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.chatExtension,'partial-BLOCKED');assert.ok(blocked.unexpectedObjects.includes('table:chat_private'));
 const altered=fixture(t);change(altered,db=>db.exec('ALTER TABLE chat_private ADD COLUMN note TEXT'));
 const drift=inspectSchema(altered);
 assert.equal(drift.status,'BLOCKED');assert.ok(drift.differentObjects.includes('table:chat_private')||drift.tableDifferences.includes('chat_private'));
 const extra=fixture(t);change(extra,db=>db.exec('CREATE TABLE chat_unknown(id TEXT)'));
 assert.equal(inspectSchema(extra).status,'BLOCKED');
});
