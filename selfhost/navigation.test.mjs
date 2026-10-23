import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {navGroups,activeNav,continueTasks} from '../app/navigation.ts';

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
