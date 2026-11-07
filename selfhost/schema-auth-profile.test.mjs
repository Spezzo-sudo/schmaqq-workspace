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
import {inspectSchema} from './deploy/schema-preflight.mjs';
import {migrations,planMigrations} from './deploy/schema-migration.mjs';

const authProfile=fileURLToPath(new URL('./deploy/schema-auth-extension.v0.json',import.meta.url));
const expectedProfile=JSON.parse(readFileSync(authProfile,'utf8'));

function fixture(t,{auth=true}={}){
 const root=mkdtempSync(path.join(os.tmpdir(),'schmaqq-r24h2-auth-fixture-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const filename=path.join(root,'studio.sqlite');
 const db=openStore(filename);
 if(auth){
   const arg={db,origin:'http://127.0.0.1:55109',sessionCookie:'test',
     provider:null};
   createOidcRoutes(arg);
   createConnectionRoutes(arg);
 }
 db.close();
 return filename;
}
function change(filename,act){
 const db=new DatabaseSync(filename);
 try{act(db);}finally{db.close();}
}
test('pinned R23 auth profile has exactly four expected objects and FK fingerprints',()=>{
 assert.equal(expectedProfile.sourceCommit,'aef64f85efeeb40f6c0f3a7dc43986a52a20f09f');
 assert.deepEqual(expectedProfile.objects.map(x=>x.name).sort(),[
   'github_attempts','github_connections','oidc_attempts','oidc_identities'
 ]);
 assert.equal(Object.keys(expectedProfile.tables).length,4);
});
test('legacy core-only R23 v0 remains a valid synthetic schema',t=>{
 const filename=fixture(t,{auth:false});
 const result=inspectSchema(filename);
 assert.equal(result.status,'PASS');
 assert.equal(result.schemaProfile,'R23-v0-core-only');
 assert.equal(result.observedObjects,25);
 assert.equal(planMigrations(filename).status,'READY');
});
test('complete four-table authentication extension is valid R23 v0',t=>{
 const filename=fixture(t);
 const result=inspectSchema(filename);
 assert.equal(result.status,'PASS');
 assert.equal(result.schemaProfile,'R23-v0-with-complete-auth');
 assert.equal(result.observedObjects,29);
 assert.deepEqual(result.unexpectedObjects,[]);
 assert.equal(planMigrations(filename).status,'READY');
});
test('strict SQL hashes/columns/FK definitions match actual R23 initializer output',t=>{
 const filename=fixture(t);
 const db=new DatabaseSync(filename,{readOnly:true});
 try{
  const hash=sql=>createHash('sha256').update((sql??'').replace(/\s+/g,' ').trim()).digest('hex');
  for(const item of expectedProfile.objects){
   const sql=db.prepare('SELECT sql FROM sqlite_master WHERE name=?').get(item.name)?.sql;
   assert.equal(hash(sql),item.sqlHash,item.name);
   const structure=expectedProfile.tables[item.name];
   const columns=db.prepare('PRAGMA table_info("'+item.name+'")').all()
     .map(({name,type,notnull,dflt_value,pk})=>({name,type,notnull,dflt_value,pk}));
   const foreignKeys=db.prepare('PRAGMA foreign_key_list("'+item.name+'")').all()
     .map(({id,seq,table:parent,from,to,on_update,on_delete,match})=>
       ({id,seq,parent,from,to,on_update,on_delete,match}));
   assert.deepEqual(columns,structure.columns,item.name);
   assert.deepEqual(foreignKeys,structure.foreignKeys,item.name);
  }
 }finally{db.close();}
});
test('partial auth schema is blocked instead of relaxed by names',t=>{
 const filename=fixture(t);
 change(filename,db=>db.exec('DROP TABLE github_attempts;'));
 const result=inspectSchema(filename);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.schemaProfile,'R23-v0-partial-auth-BLOCKED');
 assert.ok(result.unexpectedObjects.includes('table:github_connections'));
 assert.equal(planMigrations(filename).status,'BLOCKED');
});
test('tampered auth SQL definition blocks even with the expected table names',t=>{
 const filename=fixture(t);
 change(filename,db=>db.exec(
   'DROP TABLE oidc_attempts;'+
   'CREATE TABLE oidc_attempts(hash TEXT PRIMARY KEY,browser TEXT NOT NULL,'+
   'data TEXT NOT NULL,expires INTEGER);'
 ));
 const result=inspectSchema(filename);
 assert.equal(result.status,'BLOCKED');
 assert.equal(result.schemaProfile,'R23-v0-with-complete-auth');
 assert.ok(result.differentObjects.includes('table:oidc_attempts'));
 assert.ok(result.tableDifferences.includes('oidc_attempts'));
});
test('foreign key drift in an authentication table blocks release preflight',t=>{
 const filename=fixture(t);
 change(filename,db=>db.exec(
   'DROP TABLE github_connections;'+
   'CREATE TABLE github_connections(member TEXT PRIMARY KEY,'+
   'subject TEXT NOT NULL UNIQUE,login TEXT NOT NULL,verified INTEGER NOT NULL);'
 ));
 const result=inspectSchema(filename);
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.differentObjects.includes('table:github_connections'));
 assert.ok(result.tableDifferences.includes('github_connections'));
});
test('unknown extra table never becomes valid just because auth quartet is present',t=>{
 const filename=fixture(t);
 change(filename,db=>db.exec('CREATE TABLE attacker_added(payload TEXT);'));
 const result=inspectSchema(filename);
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.unexpectedObjects.includes('table:attacker_added'));
});
test('complete auth + versioned migration ledger passes strict v1 read-only check',t=>{
 const filename=fixture(t);
 change(filename,db=>{
   db.exec(migrations[0].sql);
   db.prepare('INSERT INTO schema_migrations VALUES(?,?,?,?)').run(
     migrations[0].version,migrations[0].name,migrations[0].checksum,Date.now()
   );
   db.exec('PRAGMA user_version=1');
 });
 const result=planMigrations(filename);
 assert.equal(result.status,'CURRENT');
 assert.equal(result.migrationPerformed,false);
});
test('v1 ledger with tampered auth table fails closed',t=>{
 const filename=fixture(t);
 change(filename,db=>{
   db.exec(migrations[0].sql);
   db.prepare('INSERT INTO schema_migrations VALUES(?,?,?,?)').run(
     migrations[0].version,migrations[0].name,migrations[0].checksum,Date.now()
   );
   db.exec('PRAGMA user_version=1');
   db.exec('DROP TABLE oidc_attempts;'+
     'CREATE TABLE oidc_attempts(hash TEXT PRIMARY KEY,browser TEXT NOT NULL,'+
     'data TEXT NOT NULL,expires TEXT NOT NULL);');
 });
 const result=planMigrations(filename);
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.issues.some(x=>x.includes('oidc_attempts')));
});
