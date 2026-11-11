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
 assert.equal(step({result:{shared:true,state:'approved',mine:true,automatic:true}}).action,'integrate','with GitHub, too, approval only approves; the author merges');
 assert.equal(step({own:false,isAdmin:true,result:{shared:true,state:'approved',mine:false}}).action,'integrate','the project admin may merge as well');
 const dropped=step({result:{shared:true,state:'pending',mine:true,dropped:['Markus']}});assert.match(dropped.text,/Freigabe von Markus zählt nicht mehr/);assert.equal(dropped.action,undefined);
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
 assert.equal(s(t({completion:{ready:false,result:{...shared,state:'approved'}}})).text,'Freigegeben – bitte zusammenführen');
 assert.equal(s(t({completion:{ready:false,result:{...shared,state:'approved',workflow:'pull-request'}}})).text,'Freigegeben – bitte zusammenführen','GitHub projects merge by the same explicit step');
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
 assert.equal(humanEvent('integrated','Freigegebener Code zusammengeführt · X'),'Änderung zusammengeführt');
 assert.equal(humanEvent('status','Status: done · X'),'Aufgabe abgeschlossen');
});

import {taskStages} from '../studio/task-next-step.ts';
test('the timeline shows the whole way and where the task stands',()=>{
 const base={kind:'code',status:'doing',requiresReview:true,cancelled:false,own:true,person:'Marco',result:null,liveMode:'manual',liveHow:'Marco startet Hermes.',live:false};
 const states=change=>taskStages({...base,...change}).map(s=>s.state).join(',');
 assert.deepEqual(taskStages(base).map(s=>s.label),['Ändern','Anschauen','Zusammenführen','Live']);
 assert.equal(states({}),'now,next,next,next');
 assert.equal(states({result:{shared:true,state:'pending'}}),'done,now,next,next');
 assert.equal(states({result:{shared:true,state:'changes_requested'}}),'now,next,next,next','a wished change goes back to Ändern');
 assert.equal(states({result:{shared:true,state:'approved'}}),'done,done,now,next');
 assert.equal(states({status:'done',result:{shared:true,state:'approved',integrated:true}}),'done,done,done,now');
 assert.equal(states({status:'done',live:true,result:{shared:true,state:'approved',integrated:true}}),'done,done,done,done');
 assert.equal(states({liveMode:'merge',status:'done',result:{shared:true,state:'approved',integrated:true}}),'done,done,done,done');
 assert.match(taskStages(base)[3].detail,/Marco startet Hermes/);
 assert.equal(taskStages({...base,kind:'general'}).map(s=>s.label).join(','),'Erledigen,Anschauen,Fertig');
 assert.equal(taskStages({...base,kind:'general',requiresReview:false}).length,2);
});
test('a taken-over change that is not live yet asks for the live step',()=>{
 const s=taskNextStep({kind:'code',status:'done',own:false,assigned:true,person:'Markus',cancelled:false,blocked:'',ready:true,requiresReview:true,hasCopy:true,hasWorkshop:true,awaitingLive:true,liveHow:'Marco startet Hermes.'});
 assert.equal(s.action,'live');assert.match(s.text,/Marco startet Hermes/);
 assert.equal(taskSummary({status:'done',assignee:'me',awaitingLive:true,contract:{kind:'code',blocked:'',cancelled:false,requiresReview:true},completion:{ready:true,result:null}},'me',()=>'').text,'Zusammengeführt – noch nicht live');
});

test('next step follows the project role: self approval in practice, no review button for viewers, setup waits for the admin',()=>{
 const general={kind:'general',status:'doing',own:true,assigned:true,person:'Analyse',cancelled:false,blocked:'',ready:false,requiresReview:true,hasCopy:false,hasWorkshop:true,result:{state:'pending',mine:true}};
 assert.equal(taskNextStep(general).action,undefined,'by default nobody approves their own result');
 assert.match(taskNextStep({...general,reviewers:'Marco'}).text,/Prüfen kann: Marco/);
 assert.equal(taskNextStep({...general,selfApprove:true}).action,'look','practice / "Admin darf allein freigeben"');
 const other={...general,own:false,result:{state:'pending',mine:false}};
 assert.equal(taskNextStep(other).action,'look');
 assert.equal(taskNextStep({...other,canReview:false}).action,undefined,'viewers get no review button');
 assert.equal(taskNextStep({...general,assigned:false,canDevelop:false}).action,undefined);
 const code={...general,kind:'code',result:null,hasWorkshop:false};
 assert.equal(taskNextStep({...code,isAdmin:true}).action,'setup');
 assert.equal(taskNextStep({...code,isAdmin:false}).action,undefined);
 assert.match(taskNextStep({...code,isAdmin:false}).text,/Projekt-Admin/);
});

test('a failed step stays the next step until it is retried, and an empty copy cannot be submitted',()=>{
 const failure={action:'submit',text:'Die Änderung konnte nicht zur Prüfung gegeben werden.',detail:'Gebaute Vorschau fehlt.',mine:true};
 const failed=step({failure});assert.equal(failed.action,'retry');assert.match(failed.text,/Gebaute Vorschau fehlt/);
 assert.equal(step({failure:{...failure,action:'integrate'}}).label,'Nochmal zusammenführen');
 assert.equal(step({failure:{...failure,action:'create-file'}}).action,'edit');
 const other=step({own:false,failure:{...failure,mine:false}});assert.equal(other.action,undefined);assert.match(other.text,/Markus/);
 assert.equal(step({failure,activeJob:'submit'}).waiting,true,'running work wins over an old failure');
 const empty=step({hasChange:false});assert.equal(empty.action,'edit');assert.match(empty.text,/zuerst etwas/);
 assert.equal(step({hasChange:true}).action,'submit');
});

test('work queued behind another person on a shared Werkstatt says who is ahead',()=>{
 const queued=step({activeJob:'submit',activeBehind:'Markus'});
 assert.equal(queued.waiting,true);assert.match(queued.text,/Aufgabe von Markus/);assert.match(queued.text,/als Nächstes dran/);
});

test('a copy behind the shared state is brought up to date first, and a stale merge points there',()=>{
 const behind=step({behind:2});assert.equal(behind.action,'update');assert.match(behind.text,/2 neue Änderungen/);
 assert.equal(step({behind:1,result:{shared:true,state:'pending',stale:true,mine:true}}).action,'update');
 assert.equal(step({behind:3,result:{shared:true,state:'pending',mine:true}}).action,undefined,'a version waiting for review is not touched');
 assert.equal(step({behind:0}).action,'submit');
 const conflict=step({failure:{action:'integrate',text:'Die Änderung konnte nicht zusammengeführt werden.',detail:'Zusammenführen gestoppt: Der gemeinsame Stand hat sich inzwischen an denselben Stellen geändert (page.txt).',mine:true}});
 assert.equal(conflict.action,'update');
 const failedUpdate=step({failure:{action:'update',text:'Die Arbeitskopie konnte nicht auf den neuen Stand gebracht werden.',detail:'… page.txt …',mine:true}});
 assert.equal(failedUpdate.action,undefined);assert.match(failedUpdate.text,/page\.txt/);
});
