'use client';
import type {TeamWorkspace} from './team-workspaces';

type Evidence={id:string;status:string;created:number;commit:string|null;changedAfter:boolean;state?:string;published?:boolean};
export type ChangeSummary={workspace:string;task:string|null;project:string;check:Evidence|null;preview:Evidence|null;review:Evidence|null;publication:Evidence|null;currentRevision:'unverified'};
const states:Record<string,string>={queued:'Wartet auf PC',running:'Läuft',completed:'Erfolgreich beendet',failed:'Fehlgeschlagen',interrupted:'Unterbrochen',cancelled:'Abgebrochen',cancelling:'Wird gestoppt'};
const reviewStates:Record<string,string>={approved:'Für diesen Commit freigegeben',changes_requested:'Änderungen angefordert',pending:'Zweite Prüfung ausstehend',unavailable:'Kein prüfbarer Stand'};
const date=(value:number)=>new Date(value).toLocaleString('de-DE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
export function checkLabel(change:ChangeSummary){const check=change.check;return !check?'Noch kein Testlauf':check.status==='completed'?(check.changedAfter?'Letzter Test bestanden · danach Änderungen':'Letzter Test bestanden'):states[check.status]??'Status unbekannt';}
export default function ChangeOverview({copy,change,userId,onReview,onWork}:{copy:TeamWorkspace;change?:ChangeSummary;userId:string;onReview:(id:string)=>void;onWork:()=>void}){
 const own=copy.owner===userId,review=change?.review,published=change?.publication?.published===true;
 let next='Aufgabe und Anforderungen abstimmen.';
 if(copy.status!=='completed')next='Arbeitskopie vorbereiten oder unterbrochenen Start prüfen.';
 else if(own){
  if(copy.revoked||Date.now()-copy.seen>=30000)next='Deinen PC wieder verbinden, um weiterzuarbeiten.';
  else if(!change?.check||change.check.changedAfter||change.check.status!=='completed')next='Änderungen ansehen und Tests ausführen.';
  else if(!review||review.changedAfter)next='Aktuellen Stand zur Teamprüfung einreichen.';
  else if(review.state==='changes_requested')next='Rückmeldung lesen und Änderungen abstimmen.';
  else if(review.state!=='approved')next='Zweite Person um Prüfung dieses Commits bitten.';
  else next=published?'PR und gemeinsame Übernahme prüfen.':'Freigegebenen Stand prüfen und bei Bedarf veröffentlichen.';
 }else if(review)next=review.changedAfter?'Neueren Prüfstand bei der zuständigen Person anfordern.':review.state==='approved'?'Freigabe und weitere Schritte gemeinsam abstimmen.':'Prüfstand öffnen und Rückmeldung geben.';
 return <article className="change-overview" aria-label={`Änderungsstand: ${copy.title}`}>
  <div className="section-title"><h3>{copy.title}</h3><span className="label neutral">{own?'Deine Kopie':'Teamkopie'}</span></div>
  <p className="change-origin">{copy.ownerName} · {copy.deviceName}{copy.issue?` · GitHub-Issue #${copy.issue}`:''}</p>
  {copy.scope&&<p className="change-origin">Bereich: {copy.scope}</p>}
  <dl className="change-facts">
   <div><dt>Letzter Testlauf</dt><dd>{change?checkLabel(change):'Noch kein Nachweis'}{change?.check&&<><small>{date(change.check.created)} · persönlicher Runner</small><small>{change.check.commit?`Gemeldeter Commit ${change.check.commit.slice(0,10)}`:'Codezustand nicht belegt'}</small></>}</dd></div>
   <div><dt>Letzte Vorschau</dt><dd>{change?.preview?<>{states[change.preview.status]??'Status unbekannt'}{change.preview.changedAfter?' · danach Änderungen':''}<small>{date(change.preview.created)} · damaliger Stand</small></>:'Noch nicht erstellt'}</dd></div>
   <div><dt>Teamprüfung</dt><dd>{review?<>{reviewStates[review.state??'unavailable']??'Status unbekannt'}{review.changedAfter?' · danach Änderungen':''}<small>{review.commit?`Commit ${review.commit.slice(0,10)}`:'Commit nicht belegt'} · {date(review.created)}</small></>:'Noch kein Prüfstand'}</dd></div>
   <div><dt>Veröffentlichung</dt><dd>{published?<>Branch zum Git-Remote übertragen<small>{change?.publication?.commit?`Commit ${change.publication.commit.slice(0,10)}`:'Commit nicht belegt'} · PR, Merge und Live-Status unbestätigt</small></>:'Keine Branch-Veröffentlichung belegt'}{copy.branch&&<small className="change-branch">{copy.branch}</small>}</dd></div>
  </dl>
  <p className="change-caution">Aktueller Dateistand nicht bestätigt. Ergebnisse gelten für den damaligen Lauf; externe oder neue lokale Änderungen können abweichen.</p>
  <p className="change-next"><strong>{own?'Dein nächster Schritt':'Im Team als Nächstes'}:</strong> {next}</p>
  <div className="collaboration-task-actions">{review&&<button className="button" onClick={()=>onReview(review.id)}>Prüfstand öffnen</button>}{own&&!copy.archived&&<button className="button" onClick={onWork}>In eigener Kopie weiterarbeiten</button>}</div>
 </article>;
}
