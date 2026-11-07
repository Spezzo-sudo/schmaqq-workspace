import test from 'node:test';
import assert from 'node:assert/strict';
import {precedingContent,recoveryDraft} from '../app/editor-recovery.ts';
import {readSource,saveSource} from './files.mjs';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('recovery preserves empty preceding content and never replaces an unsaved draft',()=>{
 const before={file:'page.html',content:'',revision:'old'};
 assert.equal(precedingContent(before,'new',false),undefined);
 assert.equal(precedingContent(before,'',true),undefined);
 const previous=precedingContent(before,'new',true),saved={...before,content:'new',revision:'new'};
 assert.equal(previous,'');
 assert.equal(recoveryDraft(saved,'new',previous),'');
 assert.equal(recoveryDraft(saved,'newer unsaved',previous),null);
 assert.equal(recoveryDraft(saved,'new',undefined),null);
 assert.equal(saved.revision,'new');
});

test('restoring stages old content; a later external edit still prevents its save',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'studio-recovery-'));
 try{
  writeFileSync(path.join(root,'page.html'),'before');
  const original=readSource(root,'page.html');
  const write=saveSource(root,'page.html',original.revision,'after');
  const snapshot={...original,content:'after',revision:write.revision};
  const draft=recoveryDraft(snapshot,'after',precedingContent(original,'after',true));
  assert.equal(readSource(root,'page.html').content,'after','staging must not write');
  writeFileSync(path.join(root,'page.html'),'external change');
  assert.throws(()=>saveSource(root,'page.html',snapshot.revision,draft),/Speicherkonflikt/);
  assert.equal(readSource(root,'page.html').content,'external change');
 }finally{rmSync(root,{recursive:true,force:true});}
});
