import test from 'node:test';
import assert from 'node:assert/strict';
import {inScope,groupFiles,autoOpenFile} from '../app/editor-files.ts';
import {workActionState} from '../app/workflow-step.ts';
import {setupSteps,guideReached} from '../app/setup-model.ts';

const files=['.gitignore','build.mjs','check.mjs','site/index.html','site/services.json','sitemap.xml'];

test('task files come first; scope is a file or folder, never a name prefix',()=>{
 assert.equal(inScope('site/index.html','site'),true);
 assert.equal(inScope('site/index.html','site/'),true);
 assert.equal(inScope('site/index.html','./site/index.html'),true);
 assert.equal(inScope('sitemap.xml','site'),false);
 assert.equal(inScope('site/index.html',''),false);
 assert.deepEqual(groupFiles(files,'site/index.html'),{task:['site/index.html'],other:['.gitignore','build.mjs','check.mjs','site/services.json','sitemap.xml']});
 assert.deepEqual(groupFiles(files,'site').task,['site/index.html','site/services.json']);
 assert.deepEqual(groupFiles(files,'').task,[]);
 assert.equal(groupFiles(files,'').other.length,files.length);
 assert.deepEqual(groupFiles(files,'site','json'),{task:['site/services.json'],other:[]});
});

test('the editor opens the last file, otherwise a single task file, otherwise nothing',()=>{
 assert.equal(autoOpenFile(files,'site/index.html',null),'site/index.html');
 assert.equal(autoOpenFile(files,'site/index.html','check.mjs'),'check.mjs');
 assert.equal(autoOpenFile(files,'site/index.html','gone.txt'),'site/index.html');
 assert.equal(autoOpenFile(files,'site',null),null);
 assert.equal(autoOpenFile(files,'',null),null);
});

test('the editor bar never reports opening a file as saving',()=>{
 const loading=workActionState({dirty:false,canSave:false,canRun:false,loading:true});
 assert.equal(loading.saveLabel,'Speichern');assert.match(loading.note,/geladen/);
 const saving=workActionState({dirty:true,canSave:false,canRun:false,saving:true,loading:true});
 assert.equal(saving.saveLabel,'Speichert …');assert.match(saving.note,/gespeichert/);
 assert.match(workActionState({dirty:true,canSave:true,canRun:true}).note,/Erst speichern/);
 assert.match(workActionState({dirty:false,canSave:false,canRun:false,online:false}).note,/nicht verbunden/);
 assert.match(workActionState({dirty:false,canSave:false,canRun:false,activeWork:true}).note,/arbeitet an einem Auftrag/);
 assert.match(workActionState({dirty:false,canSave:false,canRun:true}).note,/laufen auf deinem PC/);
});

test('guide check marks match the setup checklist; an existing copy does not tick an unchecked Git step',()=>{
 const base={hasDevice:true,online:true,projectStatus:'configured',inspection:null,hasCopy:true,checkPassed:false,codexReady:false,codexAllowed:false,publishAllowed:false};
 assert.deepEqual(guideReached(setupSteps(base)),[true,false]);
 assert.deepEqual(guideReached(setupSteps({...base,inspection:{status:'completed',ready:true}})),[true,true]);
 assert.deepEqual(guideReached(setupSteps({...base,online:false})),[false,false]);
});
