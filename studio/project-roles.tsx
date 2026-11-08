import {useCallback,useEffect,useState} from 'react';
import {initials,roomRequest} from './room-model';

/** Who may do what in this project. The admin changes roles and the review rule; everyone else sees their own role. */
type Role='admin'|'developer'|'reviewer'|'viewer';
type State={review:'second'|'admin-alone';mine:Role[];members:{id:string;name:string;owner:boolean;roles:Role[]}[]};
const labels:Record<Role,string>={admin:'Admin',developer:'Entwickler',reviewer:'Prüfer',viewer:'Zuschauer'};
const meaning:Record<Role,string>={admin:'alles, auch Rollen und Übernehmen',developer:'bearbeiten und zur Prüfung geben',reviewer:'„Passt“ oder „Ändern“ sagen',viewer:'lesen und mitreden'};
const order:Role[]=['admin','developer','reviewer','viewer'];

export default function ProjectRoles({project}:{project:string}){
 const [state,setState]=useState<State|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{setState(await roomRequest<State>('/api/project-roles?project='+encodeURIComponent(project)));setError('');}catch(e){setError((e as Error).message);}},[project]);
 useEffect(()=>{void load();},[load]);
 const save=async(body:unknown)=>{setBusy(true);setError('');try{await roomRequest('/api/project-roles',body);await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 if(!state)return error?<p className="rw-error" role="alert">{error}</p>:null;
 const admin=state.mine.includes('admin');
 const describe=(roles:Role[])=>roles.length?order.filter(r=>roles.includes(r)).map(r=>labels[r]).join(', '):'Keine Rolle – sieht das Projekt, ändert nichts';
 return <section className="studio-project-roles" aria-labelledby="project-roles">
  <h2 id="project-roles">Wer darf was</h2>
  {!admin&&<p>Deine Rolle: <strong>{describe(state.mine)}</strong>. Änderungen macht der Projekt-Admin.</p>}
  {admin&&<p className="studio-page-intro">{order.map(r=><span key={r}><strong>{labels[r]}</strong>: {meaning[r]}. </span>)}</p>}
  <ul className="team-members">{state.members.map(m=><li key={m.id}><span className="rw-avatar">{initials(m.name)}</span><span><strong>{m.name}</strong><small>{m.owner?'Admin (Inhaber von Studio)':describe(m.roles)}</small></span>
   {admin&&!m.owner&&<span className="studio-role-picks" role="group" aria-label={'Rollen von '+m.name}>{order.map(r=><label key={r} className={m.roles.includes(r)?'on':''}><input type="checkbox" disabled={busy} checked={m.roles.includes(r)} onChange={e=>void save({action:'roles',project,member:m.id,roles:e.target.checked?[...m.roles,r]:m.roles.filter(x=>x!==r)})}/>{labels[r]}</label>)}</span>}
  </li>)}</ul>
  <h3>Prüfung vor dem Übernehmen</h3>
  {admin?<div className="po-live-choice" role="radiogroup" aria-label="Prüfregel">
   <button role="radio" aria-checked={state.review==='second'} disabled={busy} onClick={()=>void save({action:'review',project,review:'second'})}><strong>Zweite Person prüft</strong><small>Sicherer. Niemand gibt die eigene Änderung frei.</small></button>
   <button role="radio" aria-checked={state.review==='admin-alone'} disabled={busy} onClick={()=>void save({action:'review',project,review:'admin-alone'})}><strong>Admin darf allein freigeben</strong><small>Für kleine Projekte. Im Verlauf steht, wer freigegeben hat.</small></button>
  </div>:<p>{state.review==='second'?'Eine zweite Person prüft jede Änderung.':'Der Admin darf eigene Änderungen allein freigeben.'}</p>}
  {error&&<p className="rw-error" role="alert">{error}</p>}
 </section>;
}
