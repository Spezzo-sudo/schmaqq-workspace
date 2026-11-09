import type {TeamEvent} from './room-model';

export type TaskPane='result'|'review'|'work';
export const runningLabels:Record<string,string>={codex:'KI arbeitet an der Aufgabe',check:'Tests laufen',preview:'Vorschau wird gebaut',prepare:'Werkstatt wird vorbereitet',inspect:'Projekt wird geprüft',review:'Änderung wird vorbereitet',submit:'Änderung wird zur Prüfung gegeben',integrate:'Änderung wird übernommen','deploy-key':'Zugang wird eingerichtet'};
const groupLabels:Record<string,(n:number)=>string>={'save-file':n=>n+' Dateien gespeichert','create-file':n=>n+' Dateien erstellt',check:n=>'Tests '+n+'× abgeschlossen',codex:n=>n+' KI-Bearbeitungen abgeschlossen',preview:n=>n+' Vorschauen erstellt',message:n=>n+' neue Nachrichten im Projektgespräch',comment:n=>n+' neue Kommentare'};
export type EventGroup={id:string;actor:string;task:string|null;kind:string;body:string;count:number;latest:number};
/** Consecutive entries (newest first) of the same person, task and kind within six hours read as one line. */
export function groupEvents(events:TeamEvent[],titles:Map<string,string>):EventGroup[]{
 const groups:(EventGroup&{earliest:number})[]=[];
 for(const e of events){
  const last=groups.at(-1);
  // Only repeat events of the same kind and meaning are grouped ("Hängt fest" and "Geht wieder weiter" stay separate).
  if(last&&last.actor===e.actor&&last.task===e.task&&last.kind===e.kind&&(last.kind!=='block'||last.body===e.body)&&last.earliest-e.created<6*3600000){last.count++;last.earliest=e.created;continue;}
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

/**
 * A history entry in everyday words, or null when it is technical noise (files saved, tests run, settings).
 * The server stores short technical labels; this is the one place that turns them into what people care about.
 */
export function humanEvent(kind:string,body:string):string|null{
 if(kind==='message')return 'Neue Nachricht im Gespräch';
 if(kind==='comment')return 'Neuer Kommentar';
 if(kind==='submit')return 'Änderung zur Prüfung gegeben';
 if(kind==='review')return body.startsWith('Prüfstand freigegeben')?'Änderung freigegeben':body.startsWith('Änderungen angefordert')?'Änderung gewünscht':body.startsWith('Prüfstand erstellt')?null:'Rückmeldung gegeben';
 if(kind==='integrated'||kind==='github-merge')return 'Änderung zusammengeführt';
 if(kind==='result')return 'Ergebnis aufgeschrieben';
 if(kind==='live')return 'Ist jetzt live';
 if(kind==='vote')return /Änderung/.test(body)?'Änderung gewünscht':'Ergebnis freigegeben';
 if(kind==='codex')return 'KI hat an der Aufgabe gearbeitet';
 if(kind==='knowledge')return body.startsWith('Wissen archiviert')?null:'Etwas im Wissen festgehalten';
 if(kind==='takeover'||kind==='claim')return 'Aufgabe übernommen';
 if(kind==='handoff'||kind==='assign')return 'Aufgabe weitergegeben';
 if(kind==='block')return body.startsWith('Blockierung geklärt')?'Geht wieder weiter':'Hängt fest';
 if(kind==='task'||kind==='create')return 'Neue Aufgabe';
 if(kind==='status')return /done/.test(body)?'Aufgabe abgeschlossen':/doing/.test(body)?'Mit der Aufgabe angefangen':null;
 if(kind==='cancel')return 'Aufgabe abgebrochen';
 if(kind==='reopen')return 'Aufgabe wieder geöffnet';
 return null;
}
