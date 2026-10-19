import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,linkSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {allowedFile,readSource,saveSource} from './files.mjs';
test('editor preserves bytes and refuses stale writes, secrets, hardlinks and non-text files',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-files-'));
 try{
  const filename=path.join(root,'example.ts');writeFileSync(filename,'\ufeffGrüße 👋\r\n');
  const initial=readSource(root,'example.ts');assert.equal(initial.content,'\ufeffGrüße 👋\r\n');
  const saved=saveSource(root,'example.ts',initial.revision,initial.content+'Zwei\r\n');assert.notEqual(saved.revision,initial.revision);
  assert.throws(()=>saveSource(root,'example.ts',initial.revision,'Veraltet'),/Speicherkonflikt/);assert.match(readFileSync(filename,'utf8'),/Zwei/);
  writeFileSync(filename,'Extern verändert');assert.throws(()=>saveSource(root,'example.ts',saved.revision,'Überschreiben'),/Speicherkonflikt/);
  for(const name of ['../outside','C:/outside','a\\b','.env','.env.local','a/.git/config','private.key','credentials.json','x.private.json'])assert.equal(allowedFile(name),false,name);
  writeFileSync(path.join(root,'binary'),Buffer.from([0,1]));assert.throws(()=>readSource(root,'binary'),/Textdatei/);
  writeFileSync(path.join(root,'invalid'),Buffer.from([255]));assert.throws(()=>readSource(root,'invalid'),/UTF-8/);
  const big='/* SCHMAQQ source editor */\n'.repeat(1850);
  assert.ok(Buffer.byteLength(big)>34000&&Buffer.byteLength(big)<65536);
  writeFileSync(path.join(root,'studio.css'),big);
  const opened=readSource(root,'studio.css');assert.equal(opened.content,big);
  const savedLarge=saveSource(root,'studio.css',opened.revision,big+'/* edited */');
  assert.ok(savedLarge.saved);assert.match(readFileSync(path.join(root,'studio.css'),'utf8'),/edited/);
  writeFileSync(path.join(root,'large'),'a'.repeat(65537));assert.throws(()=>readSource(root,'large'),/64 KB/);
  linkSync(filename,path.join(root,'linked'));assert.throws(()=>readSource(root,'linked'),/Textdateien/);
  mkdirSync(path.join(root,'directory'));assert.throws(()=>readSource(root,'directory'),/Textdateien/);
 }finally{assert.ok(root.startsWith(path.join(os.tmpdir(),'studio-files-')));rmSync(root,{recursive:true,force:true});}
});
