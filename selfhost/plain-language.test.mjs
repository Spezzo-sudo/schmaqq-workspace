import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {nextStep,recommendedBarAction} from '../app/workflow-step.ts';
import {glossary} from '../app/workflow-terms.ts';

const passed={status:'completed',changedAfter:false,freshness:'same'};
const copy={status:'completed',own:true,online:true};
const cases=[
 {copy,evidence:{}},
 {copy,evidence:{check:{...passed,status:'failed'}}},
 {copy,evidence:{check:{...passed,changedAfter:true}}},
 {copy,evidence:{check:passed}},
 {copy,evidence:{check:passed,previewConfigured:true}},
 {copy,evidence:{check:passed,review:{...passed,changedAfter:true,state:'pending'}}},
 {copy,evidence:{check:passed,review:{...passed,state:'unavailable'}}},
 {copy,evidence:{check:passed,review:{...passed,state:'pending'}}},
 {copy,evidence:{check:passed,review:{...passed,state:'changes_requested'}}},
 {copy,evidence:{check:passed,review:{...passed,state:'approved'}}},
 {copy,evidence:{check:passed,review:{...passed,state:'approved'},published:true}},
 {copy:{...copy,own:false},evidence:{check:passed,review:{...passed,state:'approved'}}},
 {copy:{...copy,own:false},evidence:{check:passed,review:{...passed,state:'pending'}}}
];

test('next-step titles and reasons avoid developer jargon',()=>{
 for(const input of cases){
  const step=nextStep(input);
  assert.doesNotMatch(step.title+' '+step.reason,/\b(Commit|PR|Merge|Branch|Git-Remote|Runner)\b/,step.title);
 }
});

test('only the next useful bar button is highlighted, saving a draft first',()=>{
 assert.equal(recommendedBarAction('run-check',true),'save');
 assert.equal(recommendedBarAction('run-check',false),'check');
 assert.equal(recommendedBarAction('run-preview',false),'preview');
 assert.equal(recommendedBarAction('create-review',false),'review');
 assert.equal(recommendedBarAction('observe',false),'changes');
 assert.equal(recommendedBarAction('request-review',false),null);
 assert.equal(recommendedBarAction('inspect-git',false),null);
 assert.equal(recommendedBarAction(undefined,false),null);
});

test('every explained term used in the app has a plain-language explanation',()=>{
 const appDir=new URL('../app/',import.meta.url),used=new Set();
 for(const file of readdirSync(appDir).filter(name=>name.endsWith('.tsx')))
  for(const match of readFileSync(new URL(file,appDir),'utf8').matchAll(/<Term name="([^"]+)"/g))used.add(match[1]);
 assert.ok(used.size>=6,'expected terms in use');
 for(const name of used){assert.ok(glossary[name],`missing explanation for ${name}`);assert.ok(glossary[name].length<200,`${name} explanation too long`);}
});
