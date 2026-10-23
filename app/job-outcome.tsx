'use client';
import DevelopmentResult from './development-result';
import {jobActions,jobStateLabel} from './workflow-terms';
import {stepJobs,type NextStep} from './workflow-step';
import type {Job} from './development-model';
import type {JobEvent} from './job-follow';

type Props={job:Job;done:boolean;events:JobEvent[];error:string;next:NextStep|null;own:boolean;canStart:boolean;inspectPending:boolean;
 onStart:(operation:string)=>void;onEdit:()=>void;onCancel:()=>void;onInspectAgain?:()=>void;onClose:()=>void};

/** Result of the last check, preview, change listing or Git inspection, shown next to the controls instead of a dialog. */
export default function JobOutcome({job,done,events,error,next,own,canStart,inspectPending,onStart,onEdit,onCancel,onInspectAgain,onClose}:Props){
 const open=!done,cancellable=own&&(job.status==='queued'||job.status==='running'&&job.action==='check');
 const url=typeof job.result?.url==='string'&&/^https?:\/\//.test(job.result.url)?job.result.url:null;
 const start=next&&stepJobs[next.action];
 // A failed inspection already offers its own retry button inside the result.
 const button=next&&!(job.action==='inspect'&&next.action==='inspect-git')?start?<button className="button primary" disabled={!canStart} onClick={()=>onStart(start.operation)}>{start.label}</button>:next.action==='edit'?<button className="button primary" onClick={onEdit}>Dateien bearbeiten</button>:null:null;
 return <section id="job-outcome" className="panel job-outcome" aria-label="Ergebnis des letzten Auftrags">
  <div className="section-title"><h3>{jobActions[job.action]??'Auftrag'}</h3><button className="text-button" onClick={onClose}>Ausblenden</button></div>
  <div className="dev-job-actions"><span className="label neutral">{jobStateLabel(job.status)}</span>{cancellable&&<button className="button" onClick={onCancel}>Auftrag stoppen</button>}</div>
  <div aria-live="polite">
   {open&&<p role="status">{job.status==='queued'?'Wartet darauf, dass dein PC den Auftrag übernimmt …':job.status==='cancelling'?'Stopp angefordert. Bereits geschriebene Änderungen bleiben erhalten.':'Läuft auf deinem PC …'}</p>}
   {error&&<p className="form-error" role="alert">{error}</p>}
   {url&&<p><a className="button primary" target="_blank" rel="noreferrer" href={url}>Vorschau öffnen</a> <small className="muted">{job.result?.scope==='shared'?'Gemeinsame Vorschau auf der getrennten Vorschau-Adresse.':'Diese Vorschau ist nur auf dem Ausführungs-PC erreichbar.'}</small></p>}
   {done&&job.result&&<DevelopmentResult action={job.action} result={job.result} onInspectAgain={job.action==='inspect'&&own?onInspectAgain:undefined} inspectPending={inspectPending}/>}
   {done&&<div className={`job-outcome-next ${next?.tone??'info'}`}>{next?<><p><strong>Nächster Schritt:</strong> {next.title}<br/><small>{next.reason}</small></p>{next.cautions.map(text=><p key={text} className="muted">{text}</p>)}{button}</>:<p className="muted">Nächster Schritt wird ermittelt …</p>}</div>}
  </div>
  <details open={open}><summary>Auftragsprotokoll</summary><div className="dev-live-log">{events.length?events.map(e=><div key={e.seq}><small>{new Date(e.created).toLocaleTimeString('de-DE')}</small><pre>{e.text}</pre></div>):<p className="muted">Noch keine Rückmeldung vom Runner.</p>}</div></details>
 </section>;
}
