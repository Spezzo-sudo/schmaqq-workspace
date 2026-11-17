import {useEffect,useState} from 'react';
import {CheckCircle2,CircleAlert,Link2,ShieldCheck} from 'lucide-react';
import {roomRequest,type HermesAvailability} from './room-model';
import {onLiveSignal} from './live';
import './codex-account.css';

/** The access the viewer's agents answer with. Shows what the agent queue itself reports, nothing guessed. */
export default function AgentAccess(){
 const [state,setState]=useState<HermesAvailability|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let mounted=true;
  const load=()=>roomRequest<HermesAvailability>('/api/agent-runs').then(s=>{if(mounted){setState(s);setError('');}}).catch(e=>{if(mounted)setError((e as Error).message);});
  void load();const timer=setInterval(()=>void load(),30000);
  const stop=onLiveSignal(signal=>{if(signal.type==='runs')void load();});
  return()=>{mounted=false;clearInterval(timer);stop();};
 },[]);
 const ready=state?.configured&&state.online!==false;
 return <section className="codex-account" aria-labelledby="agent-access-title">
  <h2 id="agent-access-title">KI-Zugang für deine Agenten</h2>
  <p>Fragst du einen Agenten, antwortet er mit <strong>deinem</strong> Zugang. Andere im Team nutzen ihren eigenen.</p>
  <p className="codex-account-private"><ShieldCheck size={16} aria-hidden/>Nur du nutzt diesen Zugang. Niemand sonst kann darüber Aufträge starten.</p>
  {!state&&!error?<p className="rw-muted">Wird geladen …</p>:null}
  {state?<div className="codex-account-status" data-state={ready?'on':'off'}>
   {ready?<><CheckCircle2 size={20} aria-hidden/><span><strong>Bereit</strong><small>Deine Agenten können antworten.</small></span></>
    :state.configured?<><CircleAlert size={20} aria-hidden/><span><strong>Gerade nicht erreichbar</strong><small>Dein Zugang ist eingerichtet, meldet sich aber nicht. Aufträge warten, bis er wieder da ist.</small></span></>
    :<><Link2 size={20} aria-hidden/><span><strong>Noch nicht eingerichtet</strong><small>Deine Agenten können noch nicht antworten. Der Zugang wird einmal für dich eingerichtet; sprich dafür den Inhaber des Teams an.</small></span></>}
  </div>:null}
  {error?<p className="codex-account-error" role="alert">{error}</p>:null}
 </section>;
}
