/**
 * The one next step of a task: one sentence in everyday language and at most one button.
 * The task page shows it at the top; nothing else on the page repeats it.
 */
export type TaskStepAction='claim'|'start'|'edit'|'submit'|'resubmit'|'integrate'|'live'|'result'|'look'|'finish'|'reopen'|'setup'|'retry';
/** `quiet`: the button says it all; the page shows no extra sentence. */
export type TaskStep={text:string;action?:TaskStepAction;label?:string;waiting?:boolean;quiet?:boolean};
export type TaskStepInput={
 kind:'general'|'code';status:string;own:boolean;assigned:boolean;person:string;
 cancelled:boolean;blocked:string;ready:boolean;requiresReview:boolean;
 /** Running work for this task, e.g. 'submit' while the change is tested and shared. */
 activeJob?:string;
 /** `automatic`: Studio takes an approved change over by itself (GitHub); otherwise the author does it. */
 result?:{shared?:boolean;state:string;integrated?:boolean;stale?:boolean;mine:boolean;automatic?:boolean}|null;
 /** Code tasks: the person's own working copy exists and the Werkstatt is reachable. */
 hasCopy:boolean;hasWorkshop:boolean;
 /** Code tasks: the own working copy holds a saved change (server-derived). Undefined: unknown, treated as changed. */
 hasChange?:boolean;
 /** Code tasks: the latest step of this task failed (server-derived, survives reloading). */
 failure?:{action:string;text:string;detail:string;mine:boolean;interrupted?:boolean}|null;
 /** Taken over but not yet confirmed live (projects that go live by their own step). */
awaitingLive?:boolean;liveHow?:string;
 /** Project role of the viewer (defaults: allowed). selfApprove: admin of a project with "Admin darf allein freigeben". */
 canDevelop?:boolean;canReview?:boolean;isAdmin?:boolean;selfApprove?:boolean;
 /** Names of people who may review, for "wartet auf …". */
 reviewers?:string;
};

export function taskNextStep(t:TaskStepInput):TaskStep{
 if(t.cancelled)return {text:'Diese Aufgabe wurde abgebrochen.'};
 if(t.awaitingLive)return {text:'Zusammengeführt, aber noch nicht live.'+(t.liveHow?' So geht ihr live: '+t.liveHow:' Schaltet es live und bestätigt es dann hier.'),action:'live',label:'Ist jetzt live'};
 if(t.status==='done')return t.own?{text:'Erledigt.',action:'reopen',label:'Wieder öffnen'}:{text:'Erledigt.'};
 if(t.activeJob)return {waiting:true,text:t.activeJob==='submit'?'Die Änderung wird getestet und zur Prüfung gegeben. Das dauert ein paar Minuten.'
  :t.activeJob==='integrate'?'Die freigegebene Änderung wird übernommen. Das dauert einen Moment.'
  :'Die Werkstatt arbeitet gerade an dieser Aufgabe.'};
 if(!t.assigned)return t.canDevelop===false?{text:'Noch kümmert sich niemand darum. Übernehmen kann, wer im Projekt Entwickler ist.'}:{text:'Noch kümmert sich niemand darum.',action:'claim',label:'Aufgabe übernehmen'};
 if(t.blocked)return {text:'Hängt fest: '+t.blocked};
 if(t.ready)return t.own?{text:'Alles erledigt. Du kannst die Aufgabe abschliessen.',action:'finish',label:'Aufgabe abschliessen'}:{text:t.person+' kann die Aufgabe jetzt abschliessen.'};
 if(t.own&&t.status==='todo')return {text:'Du bist dran.',action:'start',label:'Loslegen',quiet:true};
 const r=t.result;
 if(t.kind==='code'){
  const f=t.failure;
  if(f){
   const why=f.text+(f.detail?' '+f.detail:'');
   if(!f.mine)return {text:'Bei '+t.person+' hat der letzte Schritt nicht geklappt: '+why};
   if(['submit','review','check','preview'].includes(f.action))return {text:why+' Wenn du es behoben hast, versuche es noch einmal.',action:'retry',label:'Nochmal zur Prüfung geben'};
   if(f.action==='integrate')return {text:why,action:'retry',label:'Nochmal zusammenführen'};
   return {text:why,action:'edit',label:'Zur Arbeitskopie'};
  }
  if(r?.shared&&r.stale)return t.own?{text:'Du hast seit der Prüfung noch etwas geändert. Gib die neue Fassung zur Prüfung.',action:'resubmit',label:'Neue Fassung zur Prüfung geben'}
   :{text:t.person+' muss die neue Fassung noch zur Prüfung geben.'};
  if(r?.shared&&!r.integrated){
   if(r.state==='approved')return r.automatic?{text:'Freigegeben. Studio führt die Änderung jetzt zusammen.'}
    :t.own?{text:'Freigegeben. Führe die Änderung jetzt zusammen.',action:'integrate',label:'Änderung zusammenführen'}:{text:'Freigegeben. '+t.person+' führt die Änderung zusammen.'};
   if(r.state==='changes_requested')return t.own?{text:'Es wurden Änderungen gewünscht. Schau dir die Rückmeldung an.',action:'look',label:'Rückmeldung ansehen'}:{text:t.person+' überarbeitet die Änderung.'};
   return r.mine?(t.selfApprove?{text:'In diesem Projekt darfst du als Admin selbst freigeben.',action:'look',label:'Selbst anschauen und freigeben'}:{text:'Deine Änderung wartet auf eine zweite Person.'+(t.reviewers?' Prüfen kann: '+t.reviewers+'.':t.reviewers===''?' Im Projekt gibt es noch keinen Prüfer – der Projekt-Admin vergibt die Rolle unter Einstellungen.':'')})
    :t.canReview===false?{text:t.person+' hat eine Änderung zur Prüfung gegeben. Prüfen darf, wer im Projekt Prüfer ist.'}:{text:t.person+' hat eine Änderung zur Prüfung gegeben. Schau sie dir an.',action:'look',label:'Anschauen'};
  }
  if(r?.integrated)return {text:'Die Änderung ist zusammengeführt.'};
  if(!t.own)return {text:t.person+' arbeitet daran.'};
  if(!t.hasWorkshop)return t.isAdmin===false?{text:'Wartet auf die Einrichtung: Der Projekt-Admin macht das Projekt unter Einstellungen startklar. Bis dahin kannst du im Gespräch mitarbeiten.'}:{text:'Das Projekt ist noch nicht startklar: Code und Werkstatt fehlen.',action:'setup',label:'Zur Einrichtung'};
  if(t.hasCopy)return t.hasChange===false?{text:'Deine Arbeitskopie ist bereit. Ändere und speichere zuerst etwas – dann kannst du es zur Prüfung geben.',action:'edit',label:'Änderung machen',quiet:false}
   :{text:'Wenn deine Änderung fertig ist, gib sie zur Prüfung. Dann schaut sie sich jemand anderes an.',action:'submit',label:'Zur Prüfung geben'};
  return {text:'Du bist dran: Mach die Änderung.',action:'edit',label:'Änderung machen',quiet:true};
 }
 if(r){
  if(r.state==='changes_requested')return t.own?{text:'Es wurden Änderungen gewünscht. Überarbeite dein Ergebnis.',action:'result',label:'Ergebnis überarbeiten'}:{text:t.person+' überarbeitet das Ergebnis.'};
  if(t.requiresReview&&r.state!=='approved')return r.mine?(t.selfApprove?{text:'In diesem Projekt darfst du als Admin selbst freigeben.',action:'look',label:'Selbst anschauen und freigeben'}:{text:'Dein Ergebnis wartet auf eine zweite Person.'+(t.reviewers?' Prüfen kann: '+t.reviewers+'.':t.reviewers===''?' Im Projekt gibt es noch keinen Prüfer – der Projekt-Admin vergibt die Rolle unter Einstellungen.':'')})
   :t.canReview===false?{text:t.person+' hat ein Ergebnis aufgeschrieben. Prüfen darf, wer im Projekt Prüfer ist.'}:{text:t.person+' hat ein Ergebnis aufgeschrieben. Schau es dir an.',action:'look',label:'Anschauen'};
 }
 if(!t.own)return {text:t.person+' arbeitet daran.'};
 return {text:'Du bist dran: Schreib auf, was herausgekommen ist.',action:'result',label:'Ergebnis aufschreiben'};
}

/** Short status of a task for lists (overview, task list, "Meine Arbeit"): same wording everywhere. */
export type TaskSummaryInput={status:string;assignee:string|null;awaitingLive?:boolean;contract:{kind:'general'|'code';blocked:string;cancelled:boolean;requiresReview:boolean};
 completion:{ready:boolean;result:{owner:string;state:string;shared?:boolean;integrated?:boolean;workflow?:string}|null}};
export type TaskSummary={text:string;mine:boolean;group:'mine'|'open'|'others'|'done'};
export function taskSummary(t:TaskSummaryInput,me:string,name:(id:string)=>string):TaskSummary{
 if(t.contract.cancelled)return {text:'Abgebrochen',mine:false,group:'done'};
 if(t.awaitingLive)return {text:'Zusammengeführt – noch nicht live',mine:t.assignee===me,group:t.assignee===me?'mine':'others'};
 if(t.status==='done')return {text:'Erledigt',mine:false,group:'done'};
 const own=t.assignee===me,who=t.assignee?name(t.assignee):'',r=t.completion.result;
 if(!t.assignee)return {text:'Noch niemand kümmert sich darum',mine:false,group:'open'};
 if(t.contract.blocked)return {text:'Hängt fest: '+t.contract.blocked,mine:own,group:own?'mine':'others'};
 const waiting=r&&(t.contract.kind==='code'?r.shared&&!r.integrated:t.contract.requiresReview)&&r.state!=='approved';
 if(r&&waiting&&r.state==='changes_requested')return r.owner===me?{text:'Änderung gewünscht – bitte überarbeiten',mine:true,group:'mine'}:{text:who+' überarbeitet es',mine:false,group:'others'};
 if(r&&waiting)return r.owner===me?{text:'Wartet darauf, dass jemand es anschaut',mine:false,group:'others'}:{text:'Bitte anschauen und freigeben',mine:true,group:'mine'};
 if(t.completion.ready)return own?{text:'Fertig – bitte abschliessen',mine:true,group:'mine'}:{text:who+' kann abschliessen',mine:false,group:'others'};
 if(r&&t.contract.kind==='code'&&r.state==='approved'&&!r.integrated)return r.workflow==='pull-request'?{text:'Freigegeben – wird zusammengeführt',mine:false,group:'others'}
  :r.owner===me?{text:'Freigegeben – bitte zusammenführen',mine:true,group:'mine'}:{text:'Freigegeben – '+who+' führt zusammen',mine:false,group:'others'};
 if(own)return {text:t.status==='todo'?'Du bist dran – noch nicht begonnen':'Du bist dran',mine:true,group:'mine'};
 return {text:who+' ist dran',mine:false,group:'others'};
}

/** The whole way of a task as a timeline: what is done, what is now, what comes. */
export type Stage={label:string;state:'done'|'now'|'next';detail:string};
export type StageInput={kind:'general'|'code';status:string;requiresReview:boolean;cancelled:boolean;own:boolean;person:string|null;
 result:{shared?:boolean;state:string;integrated?:boolean;stale?:boolean;automatic?:boolean}|null;
 liveMode?:'merge'|'manual';liveHow?:string;live:boolean};
export function taskStages(t:StageInput):Stage[]{
 const r=t.result,who=t.own?'Du':t.person??'Wer übernimmt?';
 const marks=(done:boolean[])=>{const now=done.findIndex(d=>!d);return done.map((d,i)=>d?'done':i===now&&!t.cancelled?'now':'next') as Stage['state'][];};
 if(t.kind==='general'){
  const written=!!r&&r.state!=='changes_requested',approved=!t.requiresReview||r?.state==='approved',finished=t.status==='done';
  const labels=t.requiresReview?['Erledigen','Anschauen','Fertig']:['Erledigen','Fertig'];
  const done=t.requiresReview?[written,written&&approved,finished]:[written,finished];
  const details=t.requiresReview?[t.person?who+(t.own?' schreibst':' schreibt')+' das Ergebnis auf':'Noch niemand kümmert sich darum','Jemand anderes liest es und gibt es frei','Die Aufgabe wird abgeschlossen']:[t.person?who+(t.own?' schreibst':' schreibt')+' das Ergebnis auf':'Noch niemand kümmert sich darum','Die Aufgabe wird abgeschlossen'];
  return marks(done).map((state,i)=>({label:labels[i],state,detail:details[i]}));
 }
 const changed=!!r?.shared&&!r.stale&&r.state!=='changes_requested',approved=changed&&r?.state==='approved',merged=!!r?.integrated;
 const live=t.liveMode==='merge'?merged:t.liveMode==='manual'?t.live:false;
 return marks([changed,approved,merged,live]).map((state,i)=>({state,...[
  {label:'Ändern',detail:!t.person?'Noch niemand kümmert sich darum':t.own?'Du änderst es – selbst oder mit KI':t.person+' ändert es'},
  {label:'Anschauen',detail:'Jemand anderes öffnet die Vorschau und sagt „Passt“'},
  {label:'Zusammenführen',detail:r?.automatic?'Studio führt es nach dem „Passt“ selbst zusammen':(t.own?'Du drückst':who+' drückt')+' „Änderung zusammenführen“'},
  {label:'Live',detail:t.liveMode==='merge'?'Geht beim Zusammenführen automatisch live':t.liveMode==='manual'?(t.liveHow||'Ihr schaltet selbst live')+' – danach „Ist jetzt live“':'Noch nicht festgelegt – unter Einstellungen'}
 ][i]}));
}
