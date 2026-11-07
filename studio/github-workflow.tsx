import {useEffect,useState} from 'react';
import {roomRequest} from './room-model';
type State={configured:boolean;state:string;url?:string;number?:number;review?:string;reason?:string};
export default function GithubWorkflow({job,owner,userId,onChange}:{job:string;owner:string;userId:string;onChange:()=>void}){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function load(){try{setState(await roomRequest<State>('/api/github-workflow?job='+encodeURIComponent(job)));setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void load();},[job]);
 async function act(action:'open'|'refresh'|'merge'){
  setBusy(true);setError('');try{setState(await roomRequest<State>('/api/github-workflow',{action,job}));onChange();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="team-callout" aria-label="GitHub-Abschluss"><h3>Gemeinsamer Pull Request</h3>{!state&&!error&&<p>GitHub-Verbindung wird geprüft …</p>}{state&&!state.configured&&<p>{state.reason} Unter „Team & eigene Verbindungen“ kannst du dein Konto verbinden. Der persönliche Repository-Zugang muss zusätzlich eingerichtet sein.</p>}{state?.configured&&<><p>{state.state==='merged'?'Zusammenführung auf GitHub bestätigt.':state.state==='missing'?'Noch kein Pull Request für diesen Stand.':state.review==='approved'?'Freigabe bestätigt. Zusammenführung steht noch aus.':'Pull Request vorhanden. Die Freigabe gilt dem angezeigten Commit.'}</p>{state.url&&<a className="rw-button" href={state.url} target="_blank" rel="noreferrer">Pull Request #{state.number} öffnen</a>}<div className="rw-row-actions">{state.state==='missing'&&owner===userId&&<button className="rw-button lime" disabled={busy} onClick={()=>void act('open')}>Pull Request erstellen</button>}{state.review==='approved'&&state.state!=='merged'&&<button className="rw-button lime" disabled={busy} onClick={()=>void act('merge')}>Freigegebenen Stand zusammenführen</button>}<button className="rw-button" disabled={busy} onClick={()=>void act('refresh')}>GitHub-Stand abgleichen</button></div></>}{error&&<p className="rw-error" role="alert">{error}</p>}<p className="rw-muted">Die Aktion verwendet deinen persönlichen Repository-Zugang. GitHub prüft Commit und Branchschutz erneut.</p></section>;
}
