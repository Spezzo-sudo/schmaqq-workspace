import type {TeamEvent,TeamTask} from './room-model';

export type TaskPane='result'|'review'|'work';
export type Step={text:string;action:string;pane?:TaskPane;mine:boolean};

/** Exactly one next step per open task, derived from the same completion gates the server enforces. */
export function nextStep(task:TeamTask,me:string,names:Map<string,string>):Step{
 const result=task.completion.result,mine=!task.assignee||task.assignee===me;
 if(task.contract.blocked)return {text:'Blockierung klären: '+task.contract.blocked,action:'Aufgabe öffnen',mine};
 if(task.status==='review'&&result&&result.state!=='approved'){
  if(result.state==='changes_requested')return {text:'Änderungen wurden angefordert',action:'Zur Bearbeitung',pane:'work',mine:result.owner===me};
  return result.owner===me?{text:'Wartet auf die Freigabe einer zweiten Person',action:'Aufgabe öffnen',mine:false}:{text:'Ergebnis prüfen und freigeben',action:'Ergebnis prüfen',pane:'review',mine:true};
 }
 if(task.completion.ready)return {text:'Alle Bedingungen erfüllt, Aufgabe abschließen',action:'Abschließen',mine};
 if(!mine)return {text:'In Bearbeitung bei '+(names.get(task.assignee!)??'einer anderen Person'),action:'Aufgabe öffnen',mine:false};
 if(task.contract.kind==='general'&&!result)return {text:'Ergebnis festhalten',action:'Ergebnis festhalten',pane:'result',mine};
 if(task.contract.kind==='code'&&!result)return {text:'Ändern und einen getesteten Prüfstand erstellen',action:'Zur Bearbeitung',pane:'work',mine};
 return {text:task.completion.missing[0]??'Weiterarbeiten',action:'Aufgabe öffnen',mine};
}

export const runningLabels:Record<string,string>={codex:'KI bearbeitet die Aufgabe',check:'Tests laufen',preview:'Vorschau wird erstellt','read-file':'KI liest Dateien',files:'KI sieht Dateien durch',prepare:'Arbeitskopie wird vorbereitet',inspect:'Projekt wird geprüft',review:'Prüfstand wird erstellt',submit:'Branch wird geteilt',integrate:'Wird zusammengeführt','save-file':'Datei wird gespeichert','create-file':'Datei wird erstellt',status:'Stand wird geprüft','deploy-key':'Zugang wird eingerichtet'};
const groupLabels:Record<string,(n:number)=>string>={'save-file':n=>n+' Dateien gespeichert','create-file':n=>n+' Dateien erstellt',check:n=>'Tests '+n+'× abgeschlossen',codex:n=>n+' KI-Bearbeitungen abgeschlossen',preview:n=>n+' Vorschauen erstellt',message:n=>n+' neue Nachrichten im Projektgespräch',comment:n=>n+' neue Kommentare'};
export type EventGroup={id:string;actor:string;task:string|null;kind:string;body:string;count:number;latest:number};
/** Consecutive entries (newest first) of the same person, task and kind within six hours read as one line. */
export function groupEvents(events:TeamEvent[],titles:Map<string,string>):EventGroup[]{
 const groups:(EventGroup&{earliest:number})[]=[];
 for(const e of events){
  const last=groups.at(-1);
  if(last&&last.actor===e.actor&&last.task===e.task&&last.kind===e.kind&&last.earliest-e.created<6*3600000){last.count++;last.earliest=e.created;continue;}
  const title=e.task?titles.get(e.task):undefined;
  let body=e.body;for(const sep of [' · ',': '])if(title&&body.endsWith(sep+title))body=body.slice(0,-(sep+title).length);
  groups.push({id:e.id,actor:e.actor,task:e.task,kind:e.kind,body,count:1,latest:e.created,earliest:e.created});
 }
 return groups.map(({earliest:_,...g})=>({...g,body:g.count>1?groupLabels[g.kind]?.(g.count)??g.body+' ('+g.count+'×)':g.body}));
}
export function when(value:number,now=Date.now()){
 const d=new Date(value),today=new Date(now),clock=d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
 const day=(x:Date)=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime(),diff=Math.round((day(today)-day(d))/86400000);
 return diff===0?'heute '+clock:diff===1?'gestern '+clock:d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})+', '+clock;
}
