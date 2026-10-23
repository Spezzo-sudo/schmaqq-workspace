import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {statusSuggestion} from '../app/workflow-step.ts';
import {statuses} from '../app/workspace-model.ts';

test('task status labels exist once and match the suggestion wording',()=>{
 assert.deepEqual(statuses.map(s=>s[0]),['todo','doing','review','done']);
 assert.equal(statuses.find(s=>s[0]==='review')[1],'Zur Prüfung');
 const appDir=new URL('../app/',import.meta.url);
 for(const file of readdirSync(appDir).filter(name=>/\.tsx?$/.test(name)&&name!=='workspace-model.ts'))
  assert.doesNotMatch(readFileSync(new URL(file,appDir),'utf8'),/\[\s*'review'\s*,\s*'(?:Review|Zur Prüfung)'\s*\]/,`${file} defines its own task status labels`);
});

const review={status:'completed',changedAfter:false,freshness:'same',state:'pending'};

test('a current pending review suggests Zur Prüfung only for the owner of an open task',()=>{
 for(const taskStatus of ['todo','doing'])assert.equal(statusSuggestion({taskStatus,own:true,review})?.status,'review');
 assert.equal(statusSuggestion({taskStatus:'doing',own:false,review}),null);
 for(const taskStatus of ['review','done'])assert.equal(statusSuggestion({taskStatus,own:true,review}),null);
});

test('requested changes suggest moving a task under review back to In Arbeit',()=>{
 const changes={...review,state:'changes_requested'};
 assert.equal(statusSuggestion({taskStatus:'review',own:true,review:changes})?.status,'doing');
 assert.equal(statusSuggestion({taskStatus:'doing',own:true,review:changes}),null);
 assert.equal(statusSuggestion({taskStatus:'done',own:true,review:changes}),null);
});

test('no suggestion without a current, completed review or after approval',()=>{
 assert.equal(statusSuggestion({taskStatus:'doing',own:true,review:null}),null);
 assert.equal(statusSuggestion({taskStatus:'doing',own:true,review:{...review,changedAfter:true}}),null);
 assert.equal(statusSuggestion({taskStatus:'doing',own:true,review:{...review,status:'failed'}}),null);
 assert.equal(statusSuggestion({taskStatus:'doing',own:true,review:{...review,state:'unavailable'}}),null);
 assert.equal(statusSuggestion({taskStatus:'review',own:true,review:{...review,state:'approved'}}),null);
});

test('every suggestion says that only the click changes the status',()=>{
 for(const s of [statusSuggestion({taskStatus:'doing',own:true,review}),statusSuggestion({taskStatus:'review',own:true,review:{...review,state:'changes_requested'}})])
  assert.match(s.reason,/nur mit diesem Klick/);
});
