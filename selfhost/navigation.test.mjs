import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {navGroups,activeNav,continueTasks,pendingReviews} from '../app/navigation.ts';

test('every sidebar entry belongs to exactly one group',()=>{
 const sidebar=readFileSync(new URL('../app/workspace-sidebar.tsx',import.meta.url),'utf8');
 const keys=[...sidebar.matchAll(/\['([a-z]+)', '[^']+', [A-Za-z]+\]/g)].map(m=>m[1]);
 assert.ok(keys.length>=9,'sidebar entries not found');
 const grouped=navGroups.flatMap(g=>g.views);
 assert.deepEqual([...grouped].sort(),[...keys].sort());
 assert.equal(new Set(grouped).size,grouped.length);
});

test('the task workspace highlights the overview entry',()=>{
 assert.equal(activeNav('task'),'overview');
 assert.equal(activeNav('setup'),'setup');
});

test('continue card lists own open tasks, in progress first',()=>{
 const tasks=[
  {id:'a',project:'p',title:'Offen',status:'todo',assignee:'me'},
  {id:'b',project:'p',title:'Fremd',status:'doing',assignee:'you'},
  {id:'c',project:'p',title:'Erledigt',status:'done',assignee:'me'},
  {id:'d',project:'p',title:'Prüfung',status:'review',assignee:'me'},
  {id:'e',project:'p',title:'Arbeit',status:'doing',assignee:'me'},
  {id:'f',project:'p',title:'Niemand',status:'todo',assignee:null}];
 assert.deepEqual(continueTasks(tasks,'me').map(t=>t.id),['e','d','a']);
 assert.deepEqual(continueTasks(tasks,'me',1).map(t=>t.id),['e']);
 assert.deepEqual(continueTasks(tasks,'nobody'),[]);
});


test('review queue shows only current pending peer reviews, independent of author connectivity',()=>{
 const tasks=[{id:'task',project:'p',title:'Review me',status:'doing',assignee:'author'}];
 const copy={id:'copy',taskId:'task',owner:'author',status:'completed',archived:0,revoked:0};
 const review={id:'review',status:'completed',state:'pending',changedAfter:false,freshness:'same'};
 const queue=(c=copy,r=review,ts=tasks)=>pendingReviews(ts,[c],[{workspace:'copy',review:r}],'peer');
 assert.equal(queue()[0].review,'review');
 assert.equal(pendingReviews(tasks,[copy],[{workspace:'copy',review}],'author').length,0);
 for(const r of [{...review,state:'approved'},{...review,state:'changes_requested'},{...review,changedAfter:true},{...review,freshness:'unverified'},{...review,status:'failed'}])assert.equal(queue(copy,r).length,0);
 for(const c of [{...copy,archived:1},{...copy,revoked:1},{...copy,status:'running'}])assert.equal(queue(c).length,0);
 assert.equal(queue(copy,review,[{...tasks[0],status:'done'}]).length,0);
});
