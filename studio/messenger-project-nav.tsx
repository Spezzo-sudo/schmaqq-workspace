import {useRef} from 'react';
import {BookOpen,Bot,ChevronLeft,Folder,MessageSquare,MessagesSquare,MoreHorizontal,Plus,UserRound,Users} from 'lucide-react';
import StudioBrand from '../app/studio-brand';
import type {Room,RoomPage} from './room-model';

export default function MessengerProjectNavigation({rooms,project,connected,onProject,onPage,onCreate}:{rooms:Room[];project:string;connected:boolean;onProject:(id:string)=>void;onPage:(page:RoomPage)=>void;onCreate:()=>void}){
 const menu=useRef<HTMLDetailsElement|null>(null);
 function go(page:RoomPage){if(menu.current)menu.current.open=false;onPage(page);}
 return <div className="r3-project-navigation">
  <div className="r3-brand-row"><StudioBrand compact onHome={()=>go('rooms')}/><details ref={menu} className="r3-workspace-menu"><summary className="r3-icon-button" aria-label="Workspace-Menü" title="Workspace-Menü"><MoreHorizontal size={21}/></summary><div>
   <button onClick={()=>go('rooms')}><MessagesSquare size={16}/>Alle Chats</button>
   <button onClick={()=>go('agents')}><Users size={16}/>Kontakte</button>
   <button onClick={()=>go('projects')}><Folder size={16}/>Projekte und Archiv</button>
   <button onClick={()=>go('conversations')}><MessageSquare size={16}/>Team-Chat</button>
   <button onClick={()=>go('team')}><Users size={16}/>Team verwalten</button>
   <button onClick={()=>go('account')}><UserRound size={16}/>Mein Konto</button>
   <button onClick={()=>go('guide')}><BookOpen size={16}/>So funktioniert Studio</button>
   <button onClick={()=>{if(menu.current)menu.current.open=false;onCreate();}}><Plus size={16}/>Neues Projekt</button>
  </div></details></div>
  <button className="r3-all-chats" onClick={()=>go('rooms')}><ChevronLeft size={17} aria-hidden/>Alle Chats</button>
  <label className="r3-project-picker r5-project-title"><span className="rw-sr">Projekt</span><select aria-label="Projekt wechseln" value={project} onChange={e=>onProject(e.target.value)}>{rooms.map(room=><option key={room.id} value={room.id}>{room.title}{room.practice?' · Übung':''}</option>)}</select><i className={'r3-sync-dot'+(connected?' connected':'')} title={connected?'Letzter Abruf erfolgreich; automatische Aktualisierung':'Verbindung unterbrochen'}/></label>
 </div>;
}
