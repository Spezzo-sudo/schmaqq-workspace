/**
 * The one next step of a task: one sentence in everyday language and at most one button.
 * The task page shows it at the top; nothing else on the page repeats it.
 */
export type TaskStepAction='claim'|'start'|'edit'|'submit'|'resubmit'|'integrate'|'result'|'look'|'finish'|'reopen'|'setup';
export type TaskStep={text:string;action?:TaskStepAction;label?:string;waiting?:boolean};
export type TaskStepInput={
 kind:'general'|'code';status:string;own:boolean;assigned:boolean;person:string;
 cancelled:boolean;blocked:string;ready:boolean;requiresReview:boolean;
 /** Running work for this task, e.g. 'submit' while the change is tested and shared. */
 activeJob?:string;
 /** `automatic`: Studio takes an approved change over by itself (GitHub); otherwise the author does it. */
 result?:{shared?:boolean;state:string;integrated?:boolean;stale?:boolean;mine:boolean;automatic?:boolean}|null;
 /** Code tasks: the person's own working copy exists and the Werkstatt is reachable. */
 hasCopy:boolean;hasWorkshop:boolean;
};

export function taskNextStep(t:TaskStepInput):TaskStep{
 if(t.cancelled)return {text:'Diese Aufgabe wurde abgebrochen.'};
 if(t.status==='done')return t.own?{text:'Erledigt.',action:'reopen',label:'Wieder öffnen'}:{text:'Erledigt.'};
 if(t.activeJob)return {waiting:true,text:t.activeJob==='submit'?'Die Änderung wird getestet und zur Prüfung gegeben. Das dauert ein paar Minuten.'
  :t.activeJob==='integrate'?'Die freigegebene Änderung wird übernommen. Das dauert einen Moment.'
  :'Die Werkstatt arbeitet gerade an dieser Aufgabe.'};
 if(!t.assigned)return {text:'Noch kümmert sich niemand darum.',action:'claim',label:'Ich übernehme das'};
 if(t.blocked)return {text:'Hängt fest: '+t.blocked};
 if(t.ready)return t.own?{text:'Alles erledigt. Du kannst die Aufgabe abschliessen.',action:'finish',label:'Aufgabe abschliessen'}:{text:t.person+' kann die Aufgabe jetzt abschliessen.'};
 if(t.own&&t.status==='todo')return {text:'Du bist dran.',action:'start',label:'Loslegen'};
 const r=t.result;
 if(t.kind==='code'){
  if(r?.shared&&r.stale)return t.own?{text:'Du hast seit der Prüfung noch etwas geändert. Gib die neue Fassung zur Prüfung.',action:'resubmit',label:'Neue Fassung zur Prüfung geben'}
   :{text:t.person+' muss die neue Fassung noch zur Prüfung geben.'};
  if(r?.shared&&!r.integrated){
   if(r.state==='approved')return r.automatic?{text:'Freigegeben. Studio übernimmt die Änderung jetzt.'}
    :t.own?{text:'Freigegeben. Übernimm die Änderung jetzt.',action:'integrate',label:'Änderung übernehmen'}:{text:'Freigegeben. '+t.person+' übernimmt die Änderung.'};
   if(r.state==='changes_requested')return t.own?{text:'Es wurden Änderungen gewünscht. Schau dir die Rückmeldung an.',action:'look',label:'Rückmeldung ansehen'}:{text:t.person+' überarbeitet die Änderung.'};
   return r.mine?{text:'Deine Änderung wartet darauf, dass jemand anderes sie anschaut.'}
    :{text:t.person+' hat eine Änderung zur Prüfung gegeben. Schau sie dir an.',action:'look',label:'Anschauen'};
  }
  if(r?.integrated)return {text:'Die Änderung ist übernommen.'};
  if(!t.own)return {text:t.person+' arbeitet daran.'};
  if(!t.hasWorkshop)return {text:'Das Projekt ist noch nicht startklar.',action:'setup',label:'Zur Einrichtung'};
  if(t.hasCopy)return {text:'Wenn deine Änderung fertig ist, gib sie zur Prüfung. Dann schaut sie sich jemand anderes an.',action:'submit',label:'Zur Prüfung geben'};
  return {text:'Du bist dran: Mach die Änderung.',action:'edit',label:'Änderung machen'};
 }
 if(r){
  if(r.state==='changes_requested')return t.own?{text:'Es wurden Änderungen gewünscht. Überarbeite dein Ergebnis.',action:'result',label:'Ergebnis überarbeiten'}:{text:t.person+' überarbeitet das Ergebnis.'};
  if(t.requiresReview&&r.state!=='approved')return r.mine?{text:'Dein Ergebnis wartet darauf, dass jemand anderes es anschaut.'}
   :{text:t.person+' hat ein Ergebnis aufgeschrieben. Schau es dir an.',action:'look',label:'Anschauen'};
 }
 if(!t.own)return {text:t.person+' arbeitet daran.'};
 return {text:'Du bist dran: Schreib auf, was herausgekommen ist.',action:'result',label:'Ergebnis aufschreiben'};
}
