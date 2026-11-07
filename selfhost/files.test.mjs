import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,mkdirSync,linkSync,rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {allowedFile,readSource,readSourceSection,readableLimit,saveSource} from './files.mjs';
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
test('files over 64 KB are read in gapless bounded sections; editing keeps the 64 KB limit',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'studio-sections-'));
 try{
  // Multi-byte characters around every possible cut, long lines without breaks and normal lines.
  const text=('Grüße 👋 Zeile mit Umlauten äöü und Emoji 🌍\n'.repeat(3000))+'x'.repeat(70000)+'€'.repeat(30000)+'\nEnde\n';
  writeFileSync(path.join(root,'home.js'),text);const size=Buffer.byteLength(text);assert.ok(size>3*65536);
  assert.throws(()=>readSource(root,'home.js'),/abschnittsweise/);
  assert.throws(()=>saveSource(root,'home.js','0'.repeat(64),'kurz'),/64 KB/);
  let offset=0,joined='',sections=0,first;
  while(offset!==null){
   const part=readSourceSection(root,'home.js',offset,first?.revision);first??=part;sections++;
   assert.equal(part.offset,offset);assert.ok(Buffer.byteLength(part.content)<=65536);assert.equal(part.size,size);
   assert.equal(part.startLine,text.slice(0,Buffer.from(text).subarray(0,offset).toString('utf8').length).split('\n').length);
   joined+=part.content;offset=part.nextOffset;assert.equal(part.complete,offset===null);
  }
  assert.equal(joined,text,'No byte or line gaps, no broken characters');assert.ok(sections>=4);
  assert.throws(()=>readSourceSection(root,'home.js',Buffer.from(text).indexOf(Buffer.from('€'))+1),/mitten in einem Zeichen/);
  assert.throws(()=>readSourceSection(root,'home.js',size+1),/Ungültiger/);
  writeFileSync(path.join(root,'home.js'),text+'geändert');
  assert.throws(()=>readSourceSection(root,'home.js',first.nextOffset,first.revision),/geändert/);
  writeFileSync(path.join(root,'huge.json'),'a'.repeat(readableLimit+1));assert.throws(()=>readSourceSection(root,'huge.json',0),/4 MB|64 KB/);
  for(const name of ['../outside','.env','secret.key'])assert.throws(()=>readSourceSection(root,name,0),/nicht freigegeben/);
  linkSync(path.join(root,'home.js'),path.join(root,'linked.js'));assert.throws(()=>readSourceSection(root,'linked.js',0),/Textdateien/);
  writeFileSync(path.join(root,'binary.bin'),Buffer.concat([Buffer.alloc(70000,65),Buffer.from([0])]));assert.throws(()=>readSourceSection(root,'binary.bin',0),/Textdatei/);
  writeFileSync(path.join(root,'small.txt'),'klein\n');assert.deepEqual([readSourceSection(root,'small.txt',0).content,readSourceSection(root,'small.txt',0).complete],['klein\n',true]);
 }finally{rmSync(root,{recursive:true,force:true});}
});
