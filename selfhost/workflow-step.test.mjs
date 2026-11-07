import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nextStep,guideIndex,stepJobs,inlineOperations,workActionState} from '../app/workflow-step.ts';

const ready={hasDevice:true,online:true,projectStatus:'configured',inspection:{status:'completed',ready:true}};
const ownCopy={status:'completed',own:true,online:true};
const passed={status:'completed',changedAfter:false,freshness:'same'};

test('setup: missing PC, offline PC, missing project and Git inspection come first',()=>{
 assert.equal(nextStep({setup:{...ready,hasDevice:false}}).action,'connect-pc');
 const offline=nextStep({setup:{...ready,online:false},hasCopy:true});
 assert.equal(offline.action,'reconnect-pc');assert.equal(guideIndex(offline.stage),0);
 const missing=nextStep({setup:{...ready,projectStatus:'missing'},hasCopy:true});
 assert.equal(missing.action,'configure-project');assert.equal(guideIndex(missing.stage),1);
 assert.equal(nextStep({setup:{...ready,inspection:null}}).action,'inspect-git');
 assert.equal(nextStep({setup:{...ready,inspection:{status:'running',ready:false}}}).action,'wait');
 const broken=nextStep({setup:{...ready,inspection:{status:'completed',ready:false}}});
 assert.equal(broken.action,'inspect-git');assert.equal(broken.tone,'error');
 assert.equal(nextStep({setup:{...ready,inspection:{status:'failed',ready:false}}}).tone,'error');
 assert.equal(nextStep({setup:ready}).action,'create-copy');
});

test('setup: unknown project report does not block legacy runners but stays visible',()=>{
 const step=nextStep({setup:{...ready,projectStatus:'unknown'},hasCopy:true});
 assert.equal(step.action,'edit');
 assert.match(step.cautions.join(' '),/noch nicht aktuell gemeldet/);
 assert.equal(nextStep({setup:{...ready,projectStatus:'unknown',inspection:null}}).action,'inspect-git');
});

test('guide: running jobs and waiting reviews follow setup; existing copy skips repeated Git check',()=>{
 assert.equal(nextStep({setup:{...ready,inspection:null},hasCopy:true,active:true}).action,'wait');
 assert.equal(nextStep({setup:ready,hasCopy:true,reviewCount:2}).title,'2 Prüfstände warten auf dich');
 const idle=nextStep({setup:ready,hasCopy:true});
 assert.equal(idle.action,'edit');assert.equal(guideIndex(idle.stage),2);
});

test('copy: creation states, revoked and offline own PC',()=>{
 assert.equal(nextStep({copy:{...ownCopy,status:'queued'}}).action,'wait');
 assert.equal(nextStep({copy:{...ownCopy,status:'running'}}).action,'wait');
 assert.equal(nextStep({copy:{...ownCopy,status:'failed'}}).action,'create-copy');
 assert.equal(nextStep({copy:{...ownCopy,status:'cancelled'}}).title,'Erstellung abgebrochen');
 assert.equal(nextStep({copy:{...ownCopy,status:'interrupted'}}).action,'reconnect-pc');
 assert.equal(nextStep({copy:{...ownCopy,status:'failed',own:false}}).action,'none');
 assert.equal(nextStep({copy:{...ownCopy,status:'surprising'}}).title,'Status der Arbeitskopie unbekannt');
 assert.equal(nextStep({copy:{...ownCopy,revoked:true},evidence:{check:passed}}).action,'connect-pc');
 assert.equal(nextStep({copy:{...ownCopy,online:false},evidence:{check:passed}}).action,'reconnect-pc');
 // A teammate's offline PC never asks the viewer to reconnect it.
 assert.notEqual(nextStep({copy:{...ownCopy,own:false,online:false},evidence:{}}).action,'reconnect-pc');
});

test('evidence: missing, running, failed, unknown and stale tests never advance to review',()=>{
 const own=evidence=>nextStep({copy:ownCopy,evidence});
 assert.equal(own({}).action,'run-check');
 for(const status of ['queued','running','cancelling'])assert.equal(own({check:{...passed,status}}).action,'wait');
 for(const status of ['failed','interrupted','cancelled']){const step=own({check:{...passed,status}});assert.equal(step.action,'run-check');assert.equal(step.tone,'error');}
 assert.equal(own({check:{...passed,status:'mystery'}}).action,'run-check');
 assert.equal(own({check:{...passed,changedAfter:true,freshness:'changed'}}).action,'run-check');
 assert.equal(own({check:passed,observing:true}).action,'wait');
});

test('evidence: unverified file binding asks for one observation, then proceeds with a caution',()=>{
 const unverified={...passed,freshness:'unverified'};
 assert.equal(nextStep({copy:ownCopy,evidence:{check:unverified,observed:false}}).action,'observe');
 const after=nextStep({copy:ownCopy,evidence:{check:unverified,observed:true}});
 assert.equal(after.action,'create-review');assert.match(after.cautions.join(' '),/keinen Dateinachweis/);
});

test('evidence: review lifecycle for the owner',()=>{
 const own=review=>nextStep({copy:ownCopy,evidence:{check:passed,review}}).action;
 assert.equal(own(null),'create-review');
 assert.equal(own({...passed,changedAfter:true,state:'pending'}),'create-review');
 assert.equal(own({...passed,state:'unavailable'}),'create-review');
 assert.equal(own({...passed,state:'pending'}),'request-review');
 assert.equal(own({...passed,state:'changes_requested'}),'review-feedback');
 assert.equal(own({...passed,state:'approved'}),'publish');
 assert.equal(nextStep({copy:ownCopy,evidence:{check:passed,review:{...passed,state:'approved'},published:true}}).action,'none');
});

test('evidence: teammates can only open or wait, never act on the owner copy',()=>{
 const team=review=>nextStep({copy:{...ownCopy,own:false},evidence:{check:passed,review}});
 assert.equal(team(null).action,'none');
 assert.equal(team({...passed,state:'pending'}).action,'open-review');
 assert.equal(team({...passed,changedAfter:true,state:'pending'}).action,'none');
 assert.equal(team({...passed,state:'changes_requested'}).action,'none');
 assert.equal(team({...passed,state:'approved'}).action,'none');
 for(const review of [null,{...passed,state:'pending'},{...passed,state:'approved'}])
  assert.ok(!['run-check','observe','create-review','publish','reconnect-pc'].includes(team(review).action));
});

test('evidence: a configured preview is suggested once after passing tests, never required',()=>{
 const own=evidence=>nextStep({copy:ownCopy,evidence:{check:passed,...evidence}});
 assert.equal(own({previewConfigured:true}).action,'run-preview');
 assert.equal(own({previewConfigured:true,preview:{...passed,status:'failed'}}).action,'run-preview');
 assert.equal(own({previewConfigured:true,preview:{...passed,changedAfter:true}}).cautions.length,0);
 assert.equal(own({previewConfigured:true,preview:passed}).action,'create-review');
 assert.equal(own({previewConfigured:false}).action,'create-review');
 assert.equal(own({previewConfigured:true,review:{...passed,state:'pending'}}).action,'request-review');
 assert.equal(nextStep({copy:ownCopy,evidence:{check:{...passed,status:'failed'},previewConfigured:true}}).action,'run-check');
});

test('step buttons only start existing own-copy job types and never act for teammates',()=>{
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 const operations=server.match(/z\.enum\(\[([^\]]*'inspect'[^\]]*)\]\)/)[1].match(/'([^']+)'/g).map(value=>value.slice(1,-1));
 for(const {operation,label} of Object.values(stepJobs)){assert.ok(operations.includes(operation),operation);assert.ok(label);}
 for(const operation of inlineOperations)assert.ok(operations.includes(operation),operation);
 assert.ok(!inlineOperations.includes('review')&&!inlineOperations.includes('codex'),'review and Codex keep their dialog');
 for(const action of ['none','wait','open-review','request-review','review-feedback','publish','reconnect-pc','connect-pc'])assert.equal(stepJobs[action],undefined,action);
 const team=nextStep({copy:{...ownCopy,own:false},evidence:{check:passed,previewConfigured:true}});
 assert.equal(stepJobs[team.action],undefined);
});

test('editor bar: an unsaved draft blocks tests, preview and review but not saving or listing changes',()=>{
 const dirty=workActionState({dirty:true,canSave:true,canRun:true});
 assert.deepEqual([dirty.save,dirty.changes,dirty.check,dirty.preview,dirty.review],[true,true,false,false,false]);
 assert.match(dirty.note,/Erst speichern/);
 const clean=workActionState({dirty:false,canSave:false,canRun:true});
 assert.deepEqual([clean.save,clean.changes,clean.check,clean.preview,clean.review],[false,true,true,true,true]);
 assert.doesNotMatch(clean.note,/Erst speichern/);
 const offline=workActionState({dirty:false,canSave:false,canRun:false});
 assert.ok(!offline.changes&&!offline.check&&!offline.preview&&!offline.review);
});

test('evidence: stale or failed preview is reported without blocking the review path',()=>{
 const stale=nextStep({copy:ownCopy,evidence:{check:passed,preview:{...passed,changedAfter:true}}});
 assert.equal(stale.action,'create-review');assert.match(stale.cautions.join(' '),/älteren Stand/);
 assert.match(nextStep({copy:ownCopy,evidence:{check:passed,preview:{...passed,status:'failed'}}}).cautions.join(' '),/Vorschau fehlgeschlagen/);
});
