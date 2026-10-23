import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoute,writeRoute} from '../app/workspace-model.ts';
import {nextStep,taskProgress,taskStages,stepTab,requestedChanges} from '../app/workflow-step.ts';

const views=['overview','projects','development'];

test('task route needs task and project; unknown views fall back to the overview',()=>{
 assert.deepEqual(readRoute('?view=task&project=website&task=t1',views),{view:'task',project:'website',task:'t1'});
 assert.deepEqual(readRoute('?view=task&task=t1',views),{view:'overview',project:'all',task:''});
 assert.deepEqual(readRoute('?view=task&project=website',views),{view:'overview',project:'website',task:''});
 assert.deepEqual(readRoute('?view=development&project=website&task=t1',views),{view:'development',project:'website',task:''});
 assert.deepEqual(readRoute('?view=unknown',views),{view:'overview',project:'all',task:''});
 assert.deepEqual(readRoute('',views),{view:'overview',project:'all',task:''});
});

test('writing a route keeps unrelated parameters and drops a stale task',()=>{
 const url=new URL('http://studio.test/?setup=keep&task=old');
 assert.equal(writeRoute(url,{view:'task',project:'website',task:'t2'}).search,'?setup=keep&task=t2&view=task&project=website');
 assert.equal(writeRoute(url,{view:'overview',project:'all',task:'t2'}).search,'?setup=keep&view=overview');
 // Round trip.
 const route={view:'task',project:'website',task:'t3'};
 assert.deepEqual(readRoute(writeRoute(new URL('http://studio.test/'),route).search,views),route);
});

test('task progress follows the shared next step',()=>{
 assert.equal(taskStages.length,5);
 const copy={status:'completed',own:true,online:true};
 const passed={status:'completed',changedAfter:false,freshness:'same'};
 assert.equal(taskProgress(nextStep({copy,evidence:{}}),false),1);
 assert.equal(taskProgress(nextStep({copy,evidence:{}}),true),2);
 assert.equal(taskProgress(nextStep({copy,evidence:{check:passed}}),true),3);
 assert.equal(taskProgress(nextStep({copy,evidence:{check:passed,review:{...passed,state:'pending'}}}),true),3);
 assert.equal(taskProgress(nextStep({copy,evidence:{check:passed,review:{...passed,state:'approved'}}}),true),4);
 assert.equal(taskProgress(nextStep({copy:{...copy,status:'running'}}),true),1);
 assert.equal(taskProgress(nextStep({copy:{...copy,online:false},evidence:{check:passed}}),true),2);
});

test('each next step points to the tab where it can be done',()=>{
 assert.equal(stepTab('run-check'),'edit');
 assert.equal(stepTab('create-review'),'edit');
 assert.equal(stepTab('reconnect-pc'),'edit');
 assert.equal(stepTab('open-review'),'evidence');
 assert.equal(stepTab('request-review'),'evidence');
 assert.equal(stepTab('review-feedback'),'evidence');
});


test('feedback follows current peer decisions on the exact commit, not comments or superseded votes',()=>{
 const entry=(id,reviewer,decision,commitSha='current')=>({id,reviewer,name:reviewer,decision,commitSha,body:id,created:1});
 const entries=[entry('old','peer','changes','old'),entry('self','owner','changes'),entry('fix','peer','changes'),entry('comment','peer','comment')];
 assert.deepEqual(requestedChanges(entries,'current','owner').map(e=>e.id),['fix']);
 entries.push(entry('approved','peer','approved'));
 assert.deepEqual(requestedChanges(entries,'current','owner'),[]);
 entries.push(entry('other-fix','other','changes'));
 assert.deepEqual(requestedChanges(entries,'current','owner').map(e=>e.id),['other-fix']);
});
