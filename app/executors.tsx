'use client';
import {useCallback,useEffect,useState} from 'react';
import {Server,Laptop,RefreshCw} from 'lucide-react';

/** Own executors (PCs and server workers), the project placement rule and the
 * executor Studio would choose now. Placement never offers another person's device. */
type Executor={id:string;name:string;kind:'pc'|'server';online:boolean;busy:boolean;projects:string[]|null;host:{os:string;cpus:number;memoryMb:number;label?:string}|null};
type View={mode:string;modes:{id:string;text:string}[];canEdit:boolean;executors:Executor[];recommendation:{device?:string;reason?:string;error?:string}};
const memory=(mb:number)=>mb>=1024?`${Math.round(mb/102.4)/10} GB`:`${mb} MB`;

/** embedded: inside another card (project room) – no own panel frame and no device selection. */
export default function Executors({project,selected='',onChoose,embedded=false}:{project:string;selected?:string;onChoose?:(id:string)=>void;embedded?:boolean}){
 const [view,setView]=useState<View|null>(null),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const load=useCallback(async()=>{
  if(!project)return;
  try{const r=await fetch('/api/executors?project='+encodeURIComponent(project));const d=await r.json() as View&{error?:string};if(!r.ok)throw new Error(d.error);setView(d);setError('');}
  catch(e){setError(e instanceof Error?e.message:'Ausführer konnten nicht geladen werden.');}
 },[project]);
 useEffect(()=>{void load();const timer=setInterval(()=>{if(!document.hidden)void load();},15000);return()=>clearInterval(timer);},[load]);
 async function setMode(mode:string){
  setSaving(true);
  try{const r=await fetch('/api/executors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project,mode})});const d=await r.json() as View&{error?:string};if(!r.ok)throw new Error(d.error);setView(d);setError('');}
  catch(e){setError(e instanceof Error?e.message:'Regel konnte nicht gespeichert werden.');}finally{setSaving(false);}
 }
 if(!view)return error?<p className="form-error" role="alert">{error}</p>:null;
 const recommended=view.recommendation.device,button=embedded?'rw-button':'button';
 return <section className={embedded?'executors embedded':'panel executors'} aria-label="Ausführer">
  <div className="section-title">{embedded?<h4>Wo wird gearbeitet?</h4>:<h2>Wo wird gearbeitet?</h2>}<button className="icon-button" aria-label="Ausführer aktualisieren" onClick={()=>void load()}><RefreshCw size={16}/></button></div>
  <label>Ausführungsregel für dieses Projekt<select value={view.mode} disabled={!view.canEdit||saving} onChange={e=>void setMode(e.target.value)}>{view.modes.map(m=><option key={m.id} value={m.id}>{m.text}</option>)}</select></label>
  {!view.canEdit&&<p className="muted">Die verantwortliche Person des Projekts legt die Regel fest.</p>}
  {!view.executors.length?<p className="muted">Noch kein Ausführer verbunden.</p>:<ul className="executor-list">{view.executors.map(e=>{
   const configured=e.projects?.includes(project);
   return <li key={e.id} className={`executor${e.id===selected?' selected':''}`}>
    {e.kind==='server'?<Server size={18} aria-hidden/>:<Laptop size={18} aria-hidden/>}
    <div><strong>{e.name}</strong> <span className="label neutral">{e.kind==='server'?'Server':'PC'}</span>
     <small>{e.online?e.busy?'Erreichbar · arbeitet gerade':'Erreichbar':'Nicht erreichbar'}{e.host?` · ${e.host.os} · ${e.host.cpus} CPU · ${memory(e.host.memoryMb)}`:''} · {configured?'Projekt eingerichtet':e.projects?'Projekt nicht eingerichtet':'Projektstand unbekannt'}</small></div>
    {onChoose&&e.id!==selected&&<button className={button} onClick={()=>onChoose(e.id)}>Verwenden</button>}
   </li>;})}</ul>}
  <p className="execution-note" role="status">{recommended?<>Empfehlung: <strong>{view.recommendation.reason}</strong>{onChoose&&recommended!==selected&&<> <button className="text-button" onClick={()=>onChoose(recommended)}>Übernehmen</button></>}</>:view.recommendation.error}</p>
  {error&&<p className="form-error" role="alert">{error}</p>}
 </section>;
}
