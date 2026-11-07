'use client';
import {useCallback,useEffect,useState} from 'react';
import {Bot} from 'lucide-react';

/** Personal AI assistant connections (ChatGPT, Claude, Gemini, ...) with revocation.
 * Hidden when the plugin is not enabled on this Studio (the route answers 404). */
type Grant={id:string;clientName:string;scopes:string[];created:number;expires:number;revoked:number};

export default function PluginGrants(){
 const [grants,setGrants]=useState<Grant[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const load=useCallback(async()=>{
  try{const r=await fetch('/api/plugin/grants');if(r.status===404){setGrants(null);return;}const d=await r.json() as {grants?:Grant[];error?:string};if(!r.ok)throw new Error(d.error);setGrants(d.grants??[]);setError('');}
  catch(e){setError(e instanceof Error?e.message:'Verbindungen konnten nicht geladen werden.');}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function revoke(id:string){
  if(!window.confirm('Diese KI-Verbindung trennen? Der Assistent verliert sofort den Zugriff auf Studio.'))return;
  setBusy(id);
  try{const r=await fetch('/api/plugin/revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grantId:id})});if(!r.ok)throw new Error(((await r.json()) as {error?:string}).error);await load();}
  catch(e){setError(e instanceof Error?e.message:'Trennen fehlgeschlagen.');}finally{setBusy('');}
 }
 if(grants===null&&!error)return null;
 const now=Date.now(),active=(grants??[]).filter(g=>!g.revoked&&g.expires>now);
 return <section className="panel connection-card plugin-grants executors" aria-label="Verbundene KI-Assistenten">
  <h3><Bot size={17} aria-hidden/> Verbundene KI-Assistenten</h3>
  <p className="muted">ChatGPT, Claude, Gemini oder andere Assistenten, denen du Zugriff auf Studio erlaubt hast. Sie handeln mit deinen Rechten.</p>
  {active.length?<ul className="executor-list">{active.map(g=><li key={g.id} className="executor"><div><strong>{g.clientName}</strong><small>{g.scopes.includes('studio:code')?'Lesen und Codeaufträge':'Nur lesen'} · seit {new Date(g.created).toLocaleDateString('de-DE')}</small></div><button className="button" disabled={busy===g.id} onClick={()=>void revoke(g.id)}>Trennen</button></li>)}</ul>:<p className="muted">Noch kein Assistent verbunden.</p>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </section>;
}
