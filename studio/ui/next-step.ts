/**
 * The one next step of a task: one sentence in everyday language and at most one button.
 * The task page shows it at the top; nothing else on the page repeats it.
 */
export type TaskStepAction='claim'|'start'|'edit'|'submit'|'resubmit'|'integrate'|'live'|'result'|'look'|'finish'|'reopen'|'setup'|'retry'|'update';
/** `quiet`: the button says it all; the page shows no extra sentence. */
export type TaskStep={text:string;action?:TaskStepAction;label?:string;waiting?:boolean;quiet?:boolean};
export type TaskStepInput={
 kind:'general'|'code';status:string;own:boolean;assigned:boolean;person:string;
 cancelled:boolean;blocked:string;ready:boolean;requiresReview:boolean;
 /** Running work for this task, e.g. 'submit' while the change is tested and shared. */
 activeJob?:string;
 /** The task's job waits behind this person's work on a shared server. */
 activeBehind?:string;
 /** `automatic`: Studio takes an approved change over by itself (GitHub); otherwise the author does it. */
 result?:{shared?:boolean;state:string;integrated?:boolean;stale?:boolean;mine:boolean;automatic?:boolean;dropped?:string[]}|null;
 /** Code tasks: the person's own working copy exists and the server is reachable. */
 hasCopy:boolean;hasWorkshop:boolean;
 /** Code tasks: the own working copy holds a saved change (server-derived). Undefined: unknown, treated as changed. */
 hasChange?:boolean;
 /** Code tasks: commits of the shared main state the own copy does not contain yet. */
 behind?:number;
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
 if(t.awaitingLive)return {text:'Übernommen, aber noch nicht live.'+(t.liveHow?' So geht ihr live: '+t.liveHow:' Schaltet es live und bestätigt es dann hier.'),action:'live',label:'Ist jetzt live'};
 if(t.status==='done')return t.own?{text:'Erledigt.',action:'reopen',label:'Wieder öffnen'}:{text:'Erledigt.'};
 if(t.activeJob&&t.activeBehind)return {waiting:true,text:'Der Server arbeitet gerade an einer Aufgabe von '+t.activeBehind+' beschäftigt. Dieser Schritt ist als Nächstes dran.'};
 if(t.activeJob)return {waiting:true,text:t.activeJob==='submit'?'Die Änderung wird getestet und zur Freigabe gegeben. Das dauert ein paar Minuten.'
  :t.activeJob==='integrate'?'Die freigegebene Änderung wird übernommen. Das dauert einen Moment.'
  :'Der Server arbeitet gerade an dieser Aufgabe.'};
 if(!t.assigned)return t.canDevelop===false?{text:'Noch kümmert sich niemand darum. Übernehmen kann, wer im Projekt Entwickler ist.'}:{text:'Noch kümmert sich niemand darum.',action:'claim',label:'Aufgabe übernehmen'};
 if(t.blocked)return {text:'Hängt fest: '+t.blocked};
 if(t.ready)return t.own?{text:'Alles erledigt. Du kannst die Aufgabe abschliessen.',action:'finish',label:'Aufgabe abschliessen'}:{text:t.person+' kann die Aufgabe jetzt abschliessen.'};
 if(t.own&&t.status==='todo')return {text:'Du bist dran.',action:'start',label:'Beauftragen',quiet:true};
 const r=t.result;
 if(t.kind==='code'){
  const f=t.failure;
  if(f){
   const why=f.text+(f.detail?' '+f.detail:'');
   if(!f.mine)return {text:'Bei '+t.person+' hat der letzte Schritt nicht geklappt: '+why};
   if(['submit','review','check','preview'].includes(f.action))return {text:why+' Wenn du es behoben hast, versuche es noch einmal.',action:'retry',label:'Nochmal zur Freigabe geben'};
   if(f.action==='integrate'&&/Stand hat sich inzwischen/.test(f.detail))return {text:why,action:'update',label:'Auf den neuen Stand bringen'};
   if(f.action==='integrate')return {text:why,action:'retry',label:'Nochmal übernehmen'};
   if(f.action==='update')return {text:why};
   return {text:why,action:'edit',label:'Weiter bearbeiten'};
  }
  const update=t.own&&t.hasCopy&&(t.behind??0)>0?{text:'Der gemeinsame Stand hat '+(t.behind===1?'eine neue Änderung':t.behind+' neue Änderungen')+', die in dieser Änderung noch fehlen. Bring sie zuerst auf den neuen Stand.',action:'update' as const,label:'Auf den neuen Stand bringen'}:null;
  if(r?.shared&&r.stale&&update)return update;
  if(r?.shared&&r.stale)return t.own?{text:'Seit der Freigabe-Anfrage hat sich noch etwas geändert. Schau die neue Fassung an.',action:'resubmit',label:'Neue Fassung ansehen'}
   :{text:t.person+' muss die neue Fassung noch zur Freigabe geben.'};
  if(r?.shared&&!r.integrated){
   // Approval only approves; the author (or a project admin) takes the change over – also with GitHub.
   if(r.state==='approved')return t.own?{text:'Freigegeben. Übernimm die Änderung jetzt.',action:'integrate',label:'Übernehmen'}
    :t.isAdmin?{text:'Freigegeben. '+t.person+' übernimmt die Änderung – als Projekt-Admin kannst du es auch selbst tun.',action:'integrate',label:'Übernehmen'}
    :{text:'Freigegeben. '+t.person+' übernimmt die Änderung.'};
   if(r.state==='changes_requested')return t.own?{text:'Es wurden Änderungen gewünscht. Schau dir die Rückmeldung an.',action:'look',label:'Rückmeldung ansehen'}:{text:t.person+' überarbeitet die Änderung.'};
   if(r.state==='pending'&&r.dropped?.length){const who=r.dropped.join(' und ');return {text:'Die Freigabe von '+who+' zählt nicht mehr, weil '+(r.dropped.length>1?'sie':who)+' im Projekt nicht mehr Prüfer '+(r.dropped.length>1?'sind':'ist')+'. Die Änderung braucht eine neue Freigabe.'+(r.mine?'':t.canReview===false?'':' Schau sie dir an.'),...(!r.mine&&t.canReview!==false?{action:'look' as const,label:'Anschauen'}:{})};}
   return r.mine?(t.selfApprove?{text:'In diesem Projekt darfst du als Admin selbst freigeben.',action:'look',label:'Selbst anschauen und freigeben'}:{text:'Deine Änderung wartet auf eine zweite Person.'+(t.reviewers?' Prüfen kann: '+t.reviewers+'.':t.reviewers===''?' Im Projekt darf noch niemand anderes freigeben – der Projekt-Admin legt das in der Projektinfo unter „Wer darf was“ fest.':'')})
    :t.canReview===false?{text:t.person+' möchte eine Änderung freigeben lassen. Freigeben darf, wer im Projekt Prüfer ist.'}:{text:t.person+' möchte eine Änderung freigeben lassen. Schau sie dir an.',action:'look',label:'Anschauen'};
  }
  if(r?.integrated)return {text:'Die Änderung ist übernommen.'};
  if(!t.own)return {text:t.person+' arbeitet daran.'};
  if(!t.hasWorkshop)return t.isAdmin===false?{text:'Wartet auf die Einrichtung: Der Projekt-Admin macht das Projekt unter Einstellungen startklar. Bis dahin kannst du im Gespräch mitarbeiten.'}:{text:'Der Code des Projekts ist noch nicht verbunden.',action:'setup',label:'Zur Einrichtung'};
  if(update&&!(r?.shared&&!r.integrated&&r.state!=='changes_requested'))return update;
  if(t.hasCopy)return t.hasChange===false?{text:'Noch gibt es keine Änderung. Beauftrage jemanden aus der Entwicklung im Gespräch.',action:'edit',label:'Beauftragen',quiet:false}
   :{text:'Es gibt eine Änderung. Schau sie an und gib sie frei.',action:'submit',label:'Ansehen'};
  return {text:'Du bist dran: Mach die Änderung.',action:'edit',label:'Beauftragen',quiet:true};
 }
 if(r){
  if(r.state==='changes_requested')return t.own?{text:'Es wurden Änderungen gewünscht. Überarbeite dein Ergebnis.',action:'result',label:'Ergebnis überarbeiten'}:{text:t.person+' überarbeitet das Ergebnis.'};
  if(t.requiresReview&&r.state!=='approved')return r.mine?(t.selfApprove?{text:'In diesem Projekt darfst du als Admin selbst freigeben.',action:'look',label:'Selbst anschauen und freigeben'}:{text:'Dein Ergebnis wartet auf eine zweite Person.'+(t.reviewers?' Prüfen kann: '+t.reviewers+'.':t.reviewers===''?' Im Projekt darf noch niemand anderes freigeben – der Projekt-Admin legt das in der Projektinfo unter „Wer darf was“ fest.':'')})
   :t.canReview===false?{text:t.person+' hat ein Ergebnis aufgeschrieben. Prüfen darf, wer im Projekt Prüfer ist.'}:{text:t.person+' hat ein Ergebnis aufgeschrieben. Schau es dir an.',action:'look',label:'Anschauen'};
 }
 if(!t.own)return {text:t.person+' arbeitet daran.'};
 return {text:'Du bist dran: Schreib auf, was herausgekommen ist.',action:'result',label:'Ergebnis aufschreiben'};
}

/** Short status of a task for lists (overview, task list, "Meine Arbeit"): same wording everywhere. */
export type TaskSummaryInput={status:string;assignee:string|null;awaitingLive?:boolean;contract:{kind:'general'|'code';blocked:string;cancelled:boolean;requiresReview:boolean};
 completion:{ready:boolean;result:{owner:string;state:string;shared?:boolean;integrated?:boolean;workflow?:string}|null}};
export type TaskSummary={text:string;mine:boolean;group:'mine'|'open'|'others'|'done'};
export function taskSummary(t:TaskSummaryInput,me:string,name:(id:string)=>string,{selfApprove=false}:{selfApprove?:boolean}={}):TaskSummary{
 if(t.contract.cancelled)return {text:'Abgebrochen',mine:false,group:'done'};
 if(t.awaitingLive)return {text:'Übernommen – noch nicht live',mine:t.assignee===me,group:t.assignee===me?'mine':'others'};
 if(t.status==='done')return {text:'Erledigt',mine:false,group:'done'};
 const own=t.assignee===me,who=t.assignee?name(t.assignee):'',r=t.completion.result;
 if(!t.assignee)return {text:'Noch niemand kümmert sich darum',mine:false,group:'open'};
 if(t.contract.blocked)return {text:'Hängt fest: '+t.contract.blocked,mine:own,group:own?'mine':'others'};
 const waiting=r&&(t.contract.kind==='code'?r.shared&&!r.integrated:t.contract.requiresReview)&&r.state!=='approved';
 if(r&&waiting&&r.state==='changes_requested')return r.owner===me?{text:'Änderung gewünscht – bitte überarbeiten',mine:true,group:'mine'}:{text:who+' überarbeitet es',mine:false,group:'others'};
 if(r&&waiting)return r.owner===me?(selfApprove?{text:'Selbst anschauen und freigeben',mine:true,group:'mine'}:{text:'Wartet darauf, dass jemand es anschaut',mine:false,group:'others'}):{text:'Bitte anschauen und freigeben',mine:true,group:'mine'};
 if(t.completion.ready)return own?{text:'Fertig – bitte abschliessen',mine:true,group:'mine'}:{text:who+' kann abschliessen',mine:false,group:'others'};
 if(r&&t.contract.kind==='code'&&r.state==='approved'&&!r.integrated)return r.owner===me?{text:'Freigegeben – bitte übernehmen',mine:true,group:'mine'}:{text:'Freigegeben – '+who+' übernimmt',mine:false,group:'others'};
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
  {label:'Anschauen',detail:'Jemand anderes schaut es an und tippt „Diese Fassung freigeben“'},
  {label:'Übernehmen',detail:(t.own?'Du drückst':who+' drückt')+' „Übernehmen“'},
  {label:'Live',detail:t.liveMode==='merge'?'Geht beim Übernehmen von selbst live':t.liveMode==='manual'?(t.liveHow||'Ihr schaltet selbst live')+' – danach „Ist jetzt live“':'Noch nicht festgelegt – unter Einstellungen'}
 ][i]}));
}
