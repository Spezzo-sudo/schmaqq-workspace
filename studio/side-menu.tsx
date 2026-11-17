import {useEffect,useRef,useState} from 'react';
import {Archive,CircleHelp,LogOut,Plus,Sparkles,UserPlus,UserRound} from 'lucide-react';
import {initials,roomRequest,type HermesAvailability,type RoomPage} from './room-model';
import './side-menu.css';

/** The one way to the account and everything that is not a chat: opened from the avatar, like a messenger. */
export default function SideMenu({open,name,owner,onClose,onPage,onCreateProject,onAccess,onLogout}:{
 open:boolean;name:string;owner:boolean;onClose:()=>void;onPage:(page:RoomPage)=>void;onCreateProject:()=>void;onAccess:()=>void;onLogout:()=>void;
}){
 const [access,setAccess]=useState<HermesAvailability|null>(null);
 const panel=useRef<HTMLElement|null>(null);
 useEffect(()=>{if(!open)return;
  roomRequest<HermesAvailability>('/api/agent-runs').then(setAccess).catch(()=>setAccess(null));
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',key);
  requestAnimationFrame(()=>panel.current?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true}));
  return()=>document.removeEventListener('keydown',key);
 },[open,onClose]);
 if(!open)return null;
 const ready=access?.configured&&access.online!==false;
 const go=(fn:()=>void)=>()=>{onClose();fn();};
 return <div className="sm-layer">
  <button className="sm-backdrop" aria-label="Menü schliessen" tabIndex={-1} onClick={onClose}/>
  <nav ref={panel} className="sm-panel" aria-label="Menü">
   <div className="sm-head"><span className="sm-avatar">{initials(name)}</span><strong>{name}</strong><small>{owner?'Inhaber':'Mitglied'}</small></div>
   <button onClick={go(()=>onPage('account'))}><UserRound size={19}/><span>Mein Konto</span></button>
   <button onClick={go(onCreateProject)}><Plus size={19}/><span>Neues Projekt</span></button>
   <button onClick={go(()=>onPage('team'))}><UserPlus size={19}/><span>Jemanden einladen</span></button>
   <button onClick={go(onAccess)}><Sparkles size={19}/><span>KI-Zugang</span>{access&&<small className={ready?'ok':'off'}>{ready?'● bereit':access.configured?'● nicht erreichbar':'● nicht eingerichtet'}</small>}</button>
   <button onClick={go(()=>onPage('projects'))}><Archive size={19}/><span>Projekte und Archiv</span></button>
   <hr/>
   <button onClick={go(()=>onPage('guide'))}><CircleHelp size={19}/><span>So funktioniert Studio</span></button>
   <button onClick={go(onLogout)}><LogOut size={19}/><span>Abmelden</span></button>
  </nav>
 </div>;
}
