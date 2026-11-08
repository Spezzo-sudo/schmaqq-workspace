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

import {taskSummary} from '../studio/task-next-step.ts';
test('lists use one short status per task and sort it to the right person',()=>{
 const t=(change={})=>({status:'doing',assignee:'me',contract:{kind:'code',blocked:'',cancelled:false,requiresReview:true},completion:{ready:false,result:null},...change});
 const s=(task,me='me')=>taskSummary(task,me,id=>id==='me'?'Marco':'Markus');
 assert.deepEqual(s(t()),{text:'Du bist dran',mine:true,group:'mine'});
 assert.equal(s(t({status:'todo'})).text,'Du bist dran – noch nicht begonnen');
 assert.equal(s(t({assignee:null})).group,'open');
 assert.equal(s(t(),'other').text,'Marco ist dran');
 const shared={owner:'me',state:'pending',shared:true};
 assert.equal(s(t({status:'review',completion:{ready:false,result:shared}})).group,'others','own change waits for the other person');
 assert.deepEqual(s(t({status:'review',completion:{ready:false,result:shared}}),'other'),{text:'Bitte anschauen und freigeben',mine:true,group:'mine'});
 assert.equal(s(t({status:'review',completion:{ready:false,result:{...shared,state:'changes_requested'}}})).text,'Änderung gewünscht – bitte überarbeiten');
 assert.equal(s(t({completion:{ready:false,result:{...shared,state:'approved'}}})).text,'Freigegeben – bitte übernehmen');
 assert.equal(s(t({completion:{ready:false,result:{...shared,state:'approved',workflow:'pull-request'}}})).text,'Freigegeben – wird übernommen');
 assert.equal(s(t({completion:{ready:true,result:{...shared,state:'approved',integrated:true}}})).text,'Fertig – bitte abschliessen');
 assert.equal(s(t({contract:{kind:'code',blocked:'Warte',cancelled:false,requiresReview:true}})).text,'Hängt fest: Warte');
 assert.equal(s(t({status:'done'})).group,'done');
 const general=t({contract:{kind:'general',blocked:'',cancelled:false,requiresReview:true},completion:{ready:false,result:{owner:'me',state:'pending'}}});
 assert.equal(s(general,'other').text,'Bitte anschauen und freigeben');
});

import {humanEvent} from '../studio/project-overview-model.ts';
test('history keeps what people care about, in everyday words',()=>{
 for(const [kind,body] of [['save-file','Datei gespeichert'],['create-file','Datei erstellt'],['check','Tests abgeschlossen'],['preview','Vorschau erstellt'],['review','Prüfstand erstellt'],['contract','Abschlussbedingungen aktualisiert: X'],['brief','Aufgabe präzisiert · X'],['project','Live-Weg: eigener Schritt nach dem Übernehmen'],['read-file','Bearbeitung aktualisiert'],['github-open','Pull Request erstellt oder zugeordnet']])
  assert.equal(humanEvent(kind,body),null,kind);
 assert.equal(humanEvent('submit','Code zur Prüfung geteilt'),'Änderung zur Prüfung gegeben');
 assert.equal(humanEvent('review','Prüfstand freigegeben'),'Änderung freigegeben');
 assert.equal(humanEvent('review','Änderungen angefordert'),'Änderung gewünscht');
 assert.equal(humanEvent('integrated','Freigegebener Code zusammengeführt · X'),'Änderung übernommen');
 assert.equal(humanEvent('status','Status: done · X'),'Aufgabe abgeschlossen');
});
