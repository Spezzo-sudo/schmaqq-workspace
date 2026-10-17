import test from 'node:test';
import assert from 'node:assert/strict';
import {readDraft,storeDraft,hasDrafts,clearDrafts} from '../app/editor-drafts.ts';

test('unsaved editor work survives navigation, stays isolated and clears only on save or explicit discard',()=>{
 clearDrafts();const first={file:'page.ts',content:'original',revision:'abc'},second={file:'service.ts',content:'base',revision:'def'};
 storeDraft('person-a:worktree-1',first,'edited');storeDraft('person-b:worktree-2',second,'other');
 first.content='mutated externally';const restored=readDraft('person-a:worktree-1');assert.equal(restored.snapshot.content,'original');assert.equal(restored.text,'edited');
 restored.snapshot.content='mutated by consumer';assert.equal(readDraft('person-a:worktree-1').snapshot.content,'original');
 assert.equal(readDraft('person-b:worktree-1'),undefined);assert.equal(hasDrafts(),true);
 storeDraft('person-a:worktree-1',{file:'page.ts',content:'edited',revision:'new'},'edited');assert.equal(readDraft('person-a:worktree-1'),undefined);assert.equal(hasDrafts(),true);assert.equal(readDraft('person-b:worktree-2').text,'other');
 clearDrafts();assert.equal(hasDrafts(),false);assert.equal(readDraft('person-b:worktree-2'),undefined);
});
