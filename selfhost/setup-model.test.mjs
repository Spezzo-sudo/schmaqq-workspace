import test from 'node:test';
import assert from 'node:assert/strict';
import {setupSteps} from '../app/setup-model.ts';

const ready={hasDevice:true,online:true,projectStatus:'configured',inspection:{status:'completed',ready:true},hasCopy:true,checkPassed:true,codexReady:false,codexAllowed:false,publishAllowed:false};
const state=(input,id)=>setupSteps(input).steps.find(s=>s.id===id).state;

test('a fully set up PC completes the four required steps; AI and publishing stay optional',()=>{
 const result=setupSteps(ready);
 assert.equal(result.complete,true);assert.equal(result.done,4);assert.equal(result.total,4);assert.equal(result.current,null);
 assert.equal(state(ready,'ai'),'optional');assert.equal(state(ready,'publish'),'optional');
 assert.equal(state({...ready,codexReady:true,codexAllowed:true,publishAllowed:true},'ai'),'done');
});

test('steps unlock in order and an online heartbeat alone is not project access',()=>{
 const none=setupSteps({...ready,hasDevice:false,online:false,inspection:null,hasCopy:false,checkPassed:false});
 assert.deepEqual(none.steps.slice(0,4).map(s=>s.state),['todo','blocked','blocked','blocked']);
 assert.equal(none.current,'pc');
 assert.equal(state({...ready,online:false},'pc'),'attention');
 assert.equal(state({...ready,revoked:true},'pc'),'attention');
 assert.equal(state({...ready,online:false},'project'),'blocked');
 assert.equal(state({...ready,projectStatus:'missing'},'project'),'todo');
 assert.equal(state({...ready,projectStatus:'missing',inspection:null},'git'),'blocked');
 assert.equal(setupSteps({...ready,projectStatus:'missing'}).current,'project');
});

test('an offline PC keeps reached results and does not reset the checklist',()=>{
 const offline=setupSteps({...ready,online:false,projectStatus:'unknown'});
 assert.deepEqual(offline.steps.slice(0,4).map(s=>s.state),['attention','blocked','done','done']);
 assert.equal(offline.done,2);assert.equal(offline.current,'pc');
 assert.match(offline.steps[1].detail,/wieder verbunden/);
 const fresh=setupSteps({...ready,online:false,inspection:null,hasCopy:false,checkPassed:false});
 assert.deepEqual(fresh.steps.slice(0,4).map(s=>s.state),['attention','blocked','blocked','blocked']);
});

test('a legacy runner without project report can still pass the Git check',()=>{
 const legacy={...ready,projectStatus:'unknown'};
 assert.equal(state(legacy,'project'),'attention');
 assert.equal(state(legacy,'git'),'done');
 assert.equal(setupSteps(legacy).complete,false);
});

test('Git check states and the trial run',()=>{
 assert.equal(state({...ready,inspection:null},'git'),'todo');
 assert.equal(state({...ready,inspection:{status:'running',ready:false}},'git'),'wait');
 assert.equal(state({...ready,inspection:{status:'completed',ready:false}},'git'),'attention');
 assert.equal(state({...ready,inspection:{status:'failed',ready:false}},'git'),'attention');
 assert.equal(state({...ready,inspection:null,checkPassed:false},'trial'),'blocked');
 assert.equal(state({...ready,hasCopy:false,checkPassed:false},'trial'),'todo');
 assert.equal(state({...ready,checkPassed:false},'trial'),'todo');
});
