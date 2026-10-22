import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, statSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertLinuxOperator, linuxOperatorSupported} from './deploy/operator-platform.mjs';
import {inventoryHistoricalTrees, verifyExistingH2Backup} from './deploy/r24-h3-scoped-recovery.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const unsupported={skip:linuxOperatorSupported?'Unsupported-platform refusal regression; Linux executes the full H2/H3 fixture suites':false};
function fixture(t){
 const directory=mkdtempSync(path.join(os.tmpdir(),'studio-platform-refusal-'));
 const sentinel=path.join(directory,'retained.txt');
 writeFileSync(sentinel,'synthetic retained state');
 const before=statSync(sentinel).mtimeMs;
 t.after(()=>{
  try{
   assert.deepEqual(readdirSync(directory),['retained.txt']);
   assert.equal(readFileSync(sentinel,'utf8'),'synthetic retained state');
   assert.equal(statSync(sentinel).mtimeMs,before);
  }finally{rmSync(directory,{recursive:true,force:true});}
 });
 return directory;
}
function call(script,args,cwd){
 return spawnSync(process.execPath,[path.join(root,script),...args],
  {cwd,encoding:'utf8',windowsHide:true,timeout:15000});
}

test('operator platform preflight reports actual host capability',()=>{
 if(process.platform==='linux')assert.doesNotThrow(assertLinuxOperator);
 else assert.throws(assertLinuxOperator,{code:'LINUX_OPERATOR_REQUIRED'});
});

test('H2 refuses unsupported hosts before inventory or snapshot writes',unsupported,t=>{
 const dir=fixture(t);
 const result=call('selfhost/deploy/r24-local-backup.mjs',['--data-dir',dir],dir);
 assert.equal(result.status,1,result.stderr);
 assert.equal(result.stdout,'');
 assert.match(result.stderr,/LINUX_OPERATOR_REQUIRED/);
});

test('H3 refuses unsupported hosts before reading state or attestation',unsupported,async t=>{
 const dir=fixture(t);
 const args={dataDir:dir,backupId:'r24-h1-fixture',sourceSha:'1'.repeat(40),attestationFile:path.join(dir,'not-a-real-attestation')};
 assert.throws(()=>inventoryHistoricalTrees(dir),/LINUX_OPERATOR_REQUIRED/);
 await assert.rejects(verifyExistingH2Backup(args),/LINUX_OPERATOR_REQUIRED/);
 const result=call('selfhost/deploy/r24-h3-scoped-recovery.mjs',
  ['--data-dir',dir,'--backup-id',args.backupId,'--source-sha',args.sourceSha],dir);
 assert.equal(result.status,1,result.stderr);
 assert.equal(result.stdout,'');
 assert.match(result.stderr,/LINUX_OPERATOR_REQUIRED/);
});

test('release smoke refuses unsupported hosts before build or archive creation',unsupported,t=>{
 const dir=fixture(t);
 const result=call('scripts/r24-ci-release-smoke.mjs',[],dir);
 assert.equal(result.status,1,result.stderr);
 assert.equal(result.stdout,'');
 assert.match(result.stderr,/LINUX_OPERATOR_REQUIRED/);
});
