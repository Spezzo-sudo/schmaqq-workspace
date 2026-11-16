import {useCallback,useEffect,useState} from 'react';
import {CheckCircle2,Copy,ExternalLink,Link2,RefreshCw,ShieldCheck,Unlink} from 'lucide-react';
import {roomRequest} from './room-model';
import './codex-account.css';

type Place={project:string;title:string;device:string;name:string};
type AccountState={
 connected:boolean;checked:number|null;error:string|null;
 pending:{job:string;mode:'login'|'status'|'logout'|null;status:string;created:number;login:{url:string;code:string}|null}|null;
 places:Place[];
};
const when=(t:number)=>new Date(t).toLocaleString('de-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

/** The member's own ChatGPT sign-in on the server worker, so their agents work while every laptop is off.
 * Works fully on a phone: the code and the sign-in link are shown here, confirmation happens on chatgpt.com. */
export default function CodexAccount(){
 const [state,setState]=useState<AccountState|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 const load=useCallback(async()=>{try{setState(await roomRequest<AccountState>('/api/codex-account'));setError('');}catch(e){setError((e as Error).message);}},[]);
 useEffect(()=>{void load();},[load]);
 // Poll only while a step is running; the sign-in link appears within seconds.
 useEffect(()=>{if(!state?.pending)return;const t=setInterval(()=>void load(),3000);return ()=>clearInterval(t);},[state?.pending,load]);
 async function act(action:'connect'|'check'|'disconnect'){
  if(action==='disconnect'&&!confirm('ChatGPT-Anmeldung vom Server entfernen? Deine Agenten können danach erst wieder arbeiten, wenn du neu verbindest.'))return;
  setBusy(true);setError('');setCopied(false);
  try{await roomRequest('/api/codex-account',{action});await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const pending=state?.pending,login=pending?.login;
 return <section className="codex-account" aria-labelledby="codex-account-title">
  <h2 id="codex-account-title">Dein ChatGPT für deine Agenten</h2>
  <p>Deine Agenten arbeiten mit <strong>deinem</strong> ChatGPT-Abo auf dem Server – auch wenn dein Laptop aus ist. Du meldest dich einmal an, auch vom Handy aus.</p>
  <p className="codex-account-private"><ShieldCheck size={16} aria-hidden/>Nur du siehst und nutzt diese Anmeldung. Andere im Team können sie weder sehen noch für sich verwenden.</p>
  {!state&&!error?<p className="rw-muted">Wird geladen …</p>:null}
  {state&&!state.places.length?<p className="codex-account-note">Noch kein Server-Worker verfügbar. Er wird in einem Projekt als Team-Werkstatt eingerichtet.</p>:null}
  {state&&state.places.length&&!pending?<div className="codex-account-status" data-state={state.connected?'on':'off'}>
   {state.connected?<><CheckCircle2 size={20} aria-hidden/><span><strong>Verbunden</strong><small>{state.checked?'Zuletzt bestätigt '+when(state.checked):''}</small></span></>
    :<><Link2 size={20} aria-hidden/><span><strong>Nicht verbunden</strong><small>Deine Agenten können noch nicht antworten.</small></span></>}
  </div>:null}
  {pending?<div className="codex-account-pending" aria-live="polite">
   {pending.mode==='login'&&login?<>
    <ol className="codex-account-steps">
     <li><span>Anmeldeseite öffnen</span><a className="rw-button lime" href={login.url} target="_blank" rel="noreferrer noopener"><ExternalLink size={17} aria-hidden/>ChatGPT-Anmeldung öffnen</a></li>
     <li><span>Mit <strong>deinem</strong> ChatGPT-Konto anmelden und diesen Code eingeben:</span>
      <div className="codex-account-code"><code aria-label="Einmal-Code">{login.code}</code><button className="rw-button" onClick={()=>void navigator.clipboard?.writeText(login.code).then(()=>setCopied(true))}><Copy size={16} aria-hidden/>{copied?'Kopiert':'Kopieren'}</button></div></li>
     <li><span>Zurückkommen – Studio zeigt automatisch „Verbunden“.</span></li>
    </ol>
    <p className="rw-muted">Der Code gilt etwa 15 Minuten und nur für deine Anmeldung. Gib ihn niemandem weiter.</p>
   </>:<p className="codex-account-note"><RefreshCw size={16} className="codex-account-spin" aria-hidden/>{pending.mode==='login'?'Anmeldung wird auf dem Server vorbereitet …':pending.mode==='logout'?'Anmeldung wird entfernt …':'Verbindung wird geprüft …'}{pending.status==='queued'?' (wartet, bis der Server-Worker frei ist)':''}</p>}
  </div>:null}
  {state?.error&&!pending?<p className="codex-account-error" role="alert">{state.error}</p>:null}
  {error?<p className="codex-account-error" role="alert">{error}</p>:null}
  {state&&state.places.length&&!pending?<div className="codex-account-actions">
   {state.connected?<>
    <button className="rw-button" disabled={busy} onClick={()=>void act('check')}><RefreshCw size={17} aria-hidden/>Verbindung prüfen</button>
    <button className="rw-button codex-account-danger" disabled={busy} onClick={()=>void act('disconnect')}><Unlink size={17} aria-hidden/>Trennen</button>
   </>:<button className="rw-button lime" disabled={busy} onClick={()=>void act('connect')}><Link2 size={17} aria-hidden/>ChatGPT verbinden</button>}
  </div>:null}
  {state&&state.places.length?<p className="rw-muted codex-account-where">Läuft auf {state.places[0].name}. Im ChatGPT-Workspace muss „Device Code Login“ erlaubt sein.</p>:null}
 </section>;
}
