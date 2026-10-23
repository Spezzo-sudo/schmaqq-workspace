'use client';
import {useState} from 'react';
import type {TeamWorkspace} from './team-workspaces';
import {jobStateLabel} from './workflow-terms';
import {nextStep} from './workflow-step';
import Term from './term';

type Evidence={id:string;status:string;created:number;commit:string|null;changedAfter:boolean;freshness?:'same'|'changed'|'unverified';state?:string;published?:boolean};
type Note={kind:string;body:string;revision:number;author:string|null;updated:number|null};
export type ChangeSummary={workspace:string;task:string|null;project:string;check:Evidence|null;preview:Evidence|null;review:Evidence|null;publication:Evidence|null;currentRevision:'observed'|'unverified';observation?:{revision:string|null;observedAt:number;valid:boolean}|null;observationJob?:{status:string;created:number}|null;note?:Note};
const reviewStates:Record<string,string>={approved:'Für diesen Stand freigegeben',changes_requested:'Änderungen angefordert',pending:'Wartet auf die zweite Person',unavailable:'Kein prüfbarer Stand'};
const date=(value:number)=>new Date(value).toLocaleString('de-DE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const kinds:Record<string,string>={unspecified:'Art der Änderung noch offen',feature:'Neue Funktion',fix:'Fehlerbehebung',maintenance:'Wartung / Verbesserung'};
const binding=(e:Evidence)=>e.freshness==='same'?'Passt zum zuletzt geprüften Dateistand':e.freshness==='changed'?'Dateien wurden seitdem geändert':'Zuordnung zum Dateistand unbekannt';
const stand=(commit:string|null|undefined)=>commit?`Stand ${commit.slice(0,7)}`:'Stand unbekannt';
export function checkLabel(change:ChangeSummary){const check=change.check;return !check?'Noch kein Testlauf':check.status==='completed'?(check.changedAfter?'Letzter Test bestanden · danach Änderungen':'Letzter Test bestanden'):jobStateLabel(check.status);}
export default function ChangeOverview({copy,change,userId,onReview,onWork,onChange}:{copy:TeamWorkspace;change?:ChangeSummary;userId:string;onReview:(id:string)=>void;onWork:()=>void;onChange:()=>Promise<void>}){
 const own=copy.owner===userId,review=change?.review,published=change?.publication?.published===true;
 const [editing,setEditing]=useState(false),[kind,setKind]=useState('unspecified'),[body,setBody]=useState(''),[revision,setRevision]=useState(0),[pending,setPending]=useState(false),[error,setError]=useState('');
 const observation=change?.observation,observing=['queued','running','cancelling'].includes(change?.observationJob?.status??'');
 async function post(route:string,payload:unknown){setPending(true);setError('');try{const response=await fetch(route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const result=await response.json() as {error?:string};if(!response.ok)throw new Error(result.error??'Änderung fehlgeschlagen.');await onChange();return true;}catch(e){setError(e instanceof Error?e.message:'Verbindung fehlgeschlagen.');return false;}finally{setPending(false);}}
 const next=nextStep({copy:{status:copy.status,own,online:Date.now()-copy.seen<30000,revoked:!!copy.revoked,archived:!!copy.archived},
  evidence:{check:change?.check,preview:change?.preview,review,published,observed:change?.currentRevision==='observed',observing}});
 return <article className="change-overview" aria-label={`Änderungsstand: ${copy.title}`}>
  <div className="section-title"><h3>{copy.title}</h3><span className="label neutral">{own?'Deine Kopie':'Teamkopie'}</span></div>
  <p className="change-origin">{copy.ownerName} · {copy.deviceName}{copy.issue?` · GitHub-Issue #${copy.issue}`:''}</p>
  {copy.scope&&<p className="change-origin">Bereich: {copy.scope}</p>}
  <div className="change-description"><strong>{kinds[change?.note?.kind??'unspecified']??kinds.unspecified}</strong><p>{change?.note?.body||'Noch keine Beschreibung des Arbeitsergebnisses. Anforderungen stehen weiterhin in der Aufgabe.'}</p>{change?.note?.updated&&<small>Von der zuständigen Person beschrieben · {date(change.note.updated)}</small>}</div>
  {own&&!editing&&<button className="text-button" onClick={()=>{setKind(change?.note?.kind??'unspecified');setBody(change?.note?.body??'');setRevision(change?.note?.revision??0);setEditing(true);setError('');}}>Änderung beschreiben</button>}
  {editing&&<form className="change-note-form" onSubmit={async e=>{e.preventDefault();if(await post('/api/collaboration/change',{workspace:copy.id,revision,kind,body}))setEditing(false);}}><label>Art der Änderung<select value={kind} onChange={e=>setKind(e.target.value)} disabled={pending}>{Object.entries(kinds).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Was wurde geändert und warum?<textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} disabled={pending}/></label><p className="muted">Deine Beschreibung wird im Team geteilt. Sie schließt kein GitHub-Issue und ersetzt keinen Test.</p><div className="collaboration-task-actions"><button className="button" disabled={pending}>Beschreibung speichern</button><button className="text-button" type="button" disabled={pending} onClick={()=>{setEditing(false);setError('');}}>Abbrechen</button></div></form>}
  {error&&<p className="form-error" role="alert">{error}</p>}
  <dl className="change-facts">
   <div><dt><Term name="Tests">Letzter Testlauf</Term></dt><dd>{change?checkLabel(change):'Noch kein Nachweis'}{change?.check&&<><small>{date(change.check.created)} · auf dem PC</small><small>{stand(change.check.commit)}</small><small>{binding(change.check)}</small></>}</dd></div>
   <div><dt><Term name="Vorschau">Letzte Vorschau</Term></dt><dd>{change?.preview?<>{jobStateLabel(change.preview.status)}{change.preview.changedAfter?' · danach Änderungen':''}<small>{date(change.preview.created)} · damaliger Stand</small><small>{binding(change.preview)}</small></>:'Noch nicht erstellt'}</dd></div>
   <div><dt><Term name="Prüfstand">Prüfung durch das Team</Term></dt><dd>{review?<>{reviewStates[review.state??'unavailable']??'Status unbekannt'}{review.changedAfter?' · danach Änderungen':''}<small>{stand(review.commit)} · {date(review.created)}</small><small>{binding(review)}</small></>:'Noch nicht zur Prüfung gegeben'}</dd></div>
   <div><dt><Term name="Branch">Veröffentlichung</Term></dt><dd>{published?<>An das gemeinsame Projektarchiv übertragen<small>{stand(change?.publication?.commit)} · Übernahme und Livegang noch nicht bestätigt</small></>:'Noch nicht veröffentlicht'}{copy.branch&&<small className="change-branch" title="Technischer Name des Arbeitszweigs">{copy.branch}</small>}</dd></div>
  </dl>
  <div className="change-caution"><p>{observing?'Dateistand wird auf deinem PC abgeglichen.':change?.observationJob?.status==='failed'?'Letzter Dateiabgleich fehlgeschlagen.':observation?.valid&&observation.revision?`Dateistand zuletzt abgeglichen: ${date(observation.observedAt)}. Seitdem sind weitere Änderungen möglich.`:'Dateistand nicht bestätigt. Mit „Dateistand abgleichen“ prüfen.'}</p><details><summary>Was wird abgeglichen?</summary><p>Versionierte und neue, nicht ignorierte Dateien. Ignorierte Dateien, Abhängigkeiten und Umgebungsdaten sind nicht belegt. Der Abgleich ist eine Momentaufnahme; es gibt keine dauerhafte Überwachung externer Änderungen. Ältere Runner liefern gegebenenfalls noch keinen Dateinachweis.</p></details></div>
  <p className="change-next"><strong>{own?'Dein nächster Schritt':'Im Team als Nächstes'}:</strong> {next.title}<br/><small>{next.reason}</small></p>{next.cautions.map(text=><p key={text} className="muted">{text}</p>)}
  <div className="collaboration-task-actions">{own&&!copy.archived&&<button className="button" disabled={pending||observing||copy.status!=='completed'||!!copy.revoked||Date.now()-copy.seen>=30000} onClick={()=>void post('/api/development',{action:'job',operation:'status',device:copy.device,project:copy.project,worktree:copy.id,...(copy.issue?{issue:copy.issue}:{})})}>Dateistand abgleichen</button>}{review&&<button className="button" onClick={()=>onReview(review.id)}>Prüfstand öffnen</button>}{own&&!copy.archived&&<button className="button" onClick={onWork}>In eigener Kopie weiterarbeiten</button>}</div>
 </article>;
}
