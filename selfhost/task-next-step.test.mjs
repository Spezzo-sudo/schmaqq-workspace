import test from 'node:test';
import assert from 'node:assert/strict';
import {taskNextStep} from '../studio/task-next-step.ts';

const base={kind:'code',status:'doing',own:true,assigned:true,person:'Markus',cancelled:false,blocked:'',ready:false,requiresReview:true,result:null,hasCopy:true,hasWorkshop:true};
const step=change=>taskNextStep({...base,...change});

test('a code task names exactly one next step along the whole way',()=>{
 assert.equal(step({assigned:false}).action,'claim');
 assert.equal(step({status:'todo'}).action,'start');
 assert.equal(step({hasWorkshop:false}).action,'setup');
 assert.equal(step({hasCopy:false}).action,'edit');
 assert.deepEqual(step({}),{text:'Wenn deine Änderung fertig ist, gib sie zur Prüfung. Dann schaut sie sich jemand anderes an.',action:'submit',label:'Zur Prüfung geben'});
 const running=step({activeJob:'submit'});assert.equal(running.waiting,true);assert.equal(running.action,undefined);assert.match(running.text,/ein paar Minuten/);
 assert.equal(step({result:{shared:true,state:'pending',mine:true}}).action,undefined,'own change waits for someone else');
 assert.equal(step({own:false,result:{shared:true,state:'pending',mine:false}}).action,'look');
 assert.equal(step({result:{shared:true,state:'pending',stale:true,mine:true}}).action,'resubmit');
 assert.equal(step({own:false,result:{shared:true,state:'pending',stale:true,mine:false}}).action,undefined);
 assert.equal(step({result:{shared:true,state:'changes_requested',mine:true}}).action,'look');
 assert.equal(step({result:{shared:true,state:'approved',mine:true}}).action,'integrate','without GitHub the author takes the change over');
 assert.equal(step({result:{shared:true,state:'approved',mine:true,automatic:true}}).action,undefined,'with GitHub Studio does it');
 assert.equal(step({own:false,result:{shared:true,state:'approved',mine:false}}).action,undefined);
 assert.equal(step({ready:true}).action,'finish');
 assert.equal(step({status:'done'}).action,'reopen');
 assert.equal(step({status:'done',own:false}).action,undefined);
 assert.equal(step({cancelled:true}).action,undefined);
 assert.equal(step({blocked:'Warte auf Vermieter'}).text,'Hängt fest: Warte auf Vermieter');
 assert.equal(step({own:false}).text,'Markus arbeitet daran.');
});

test('a general task asks for a written result and its approval',()=>{
 assert.equal(step({kind:'general'}).action,'result');
 assert.equal(step({kind:'general',result:{state:'pending',mine:true}}).action,undefined);
 assert.equal(step({kind:'general',own:false,result:{state:'pending',mine:false}}).action,'look');
 assert.equal(step({kind:'general',result:{state:'changes_requested',mine:true}}).action,'result');
});

test('next steps speak everyday language',()=>{
 const inputs=[{},{assigned:false},{status:'todo'},{hasWorkshop:false},{hasCopy:false},{activeJob:'submit'},{activeJob:'integrate'},{activeJob:'check'},
  {result:{shared:true,state:'pending',mine:true}},{own:false,result:{shared:true,state:'pending',mine:false}},{result:{shared:true,state:'approved',mine:true}},
  {result:{shared:true,state:'pending',stale:true,mine:true}},{result:{shared:true,integrated:true,state:'approved',mine:true}},{ready:true},{status:'done'},
  {kind:'general'},{kind:'general',result:{state:'changes_requested',mine:true}}];
 for(const input of inputs){const s=step(input);
  assert.doesNotMatch(s.text+' '+(s.label??''),/\b(Commit|Branch|Repository|Prüfstand|Runner|Worker|Merge|Pull Request|PR|Git)\b/,s.text);}
});
