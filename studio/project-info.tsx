import {useEffect,useRef,useState} from 'react';
import {BookOpen,ChevronRight,Crown,ExternalLink,FolderOpen,ListChecks,MessageSquare,MoreHorizontal,Plus,Settings,UserPlus,Bot,Archive} from 'lucide-react';
import {AgentAvatar} from './agent-avatar';
import {useProjectAccess} from './project-roles';
import {taskSummary} from './task-next-step';
import {agentRoleLabels,initials,isProjectLead,roomRequest,type RoomState,type RoomTab,type TeamTask} from './room-model';
import './project-info.css';

const roleLabels:Record<string,string>={admin:'Admin',developer:'Entwickler',reviewer:'Prüfer',viewer:'Lesen'};

/** Asks once, then archives with the project's current revision. Shared by the project info and the chat list. */
export async function archiveProject(project:string,title:string):Promise<boolean>{
 if(!window.confirm(`„${title}“ archivieren? Es verschwindet für alle aus den Listen und lässt sich im Menü unter „Projekte und Archiv“ wiederherstellen.`))return false;
 const r=await roomRequest<RoomState>('/api/room?project='+encodeURIComponent(project));
 await roomRequest('/api/team',{action:'project',project,revision:r.meta.revision,title:r.project.title,description:r.project.description,archived:true,base:r.meta.base??'main',workflow:r.meta.workflow??'pull-request'});
 return true;
}

/** Ask the open conversation to show an agent's profile or to start hiring one. */
export const openAgentProfile=(id:string)=>window.dispatchEvent(new CustomEvent('studio:open-agent',{detail:{id}}));
export const hireAgent=()=>window.dispatchEvent(new CustomEvent('studio:hire-agent'));

/**
 * The group info of a project, like a messenger's group page: what is going on now, who is in it,
 * and one entry each for tasks, files, knowledge and settings. Dangerous actions sit behind "⋯".
 */
export default function ProjectInfo({room,tasks,userId,onTab,onChat,onMemberChat,onOpenTask,onNewTask,onInvite,onArchived}:{
 room:RoomState;tasks:TeamTask[];userId:string;
 onTab:(tab:RoomTab)=>void;onChat:()=>void;onMemberChat:(member:string)=>void;
 onOpenTask:(task:TeamTask,pane?:'review')=>void;onNewTask:()=>void;onInvite:()=>void;onArchived:()=>void;
}){
 const access=useProjectAccess(room.project.id,userId);
 const [menu,setMenu]=useState(false),[adding,setAdding]=useState(false),[error,setError]=useState('');
 const menuRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{if(!menu)return;const close=(e:MouseEvent)=>{if(!menuRef.current?.contains(e.target as Node))setMenu(false);};document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);},[menu]);
 const people=room.members.filter(m=>!m.removed);
 const agents=(room.agents??[]).filter(a=>a.active!==false).sort((a,b)=>Number(isProjectLead(b))-Number(isProjectLead(a))||a.name.localeCompare(b.name));
 const name=(id:string)=>people.find(m=>m.id===id)?.name??'Jemand';
 const open=tasks.filter(t=>t.status!=='done');
 const mine=open.filter(t=>taskSummary(t,userId,name).group==='mine').length;
 const inReview=open.filter(t=>t.status==='review');
 const preview=inReview[0];
 const canHire=access.develop;
 const roleText=(m:typeof people[number])=>m.role==='owner'?'Inhaber':(m.projectRoles?.length?m.projectRoles.map(r=>roleLabels[r]??r).join(', '):'Mitglied');
 async function archive(){setMenu(false);setError('');try{if(await archiveProject(room.project.id,room.project.title))onArchived();}catch(e){setError((e as Error).message);}}
 return <div className="pi">
  <section className="pi-hero">
   <span className="pi-mark" aria-hidden>{initials(room.project.title)}</span>
   <h2>{room.project.title}</h2>
   {room.project.description&&<p>{room.project.description}</p>}
   {access.admin&&<div className="pi-more" ref={menuRef}>
    <button className="r3-icon-button" aria-label="Weitere Aktionen" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MoreHorizontal size={20}/></button>
    {menu&&<div className="pi-menu" role="menu"><button role="menuitem" onClick={()=>{setMenu(false);onTab('connect');}}><Settings size={16}/>Einstellungen</button><button role="menuitem" className="danger" onClick={()=>void archive()}><Archive size={16}/>Projekt archivieren</button></div>}
   </div>}
  </section>
  <div className="pi-actions">
   <button className="rw-button" onClick={onChat}><MessageSquare size={16}/>Chat</button>
   <button className="rw-button lime" disabled={!preview} onClick={()=>preview&&onOpenTask(preview,'review')}><ExternalLink size={16}/>Vorschau</button>
   <button className="rw-button" onClick={onNewTask}><Plus size={16}/>Aufgabe</button>
   <button className="rw-button" onClick={()=>setAdding(v=>!v)} aria-expanded={adding}><UserPlus size={16}/>Mitglied</button>
  </div>
  {error&&<p className="rw-error" role="alert">{error}</p>}
  {adding&&<div className="pi-add" role="group" aria-label="Mitglied hinzufügen">
   {canHire&&<button onClick={()=>{setAdding(false);hireAgent();}}><Bot size={18}/><span><strong>Agent anstellen</strong><small>Neu mit Rolle, Name und Auftrag</small></span><ChevronRight size={16}/></button>}
   {access.admin&&<button onClick={()=>{setAdding(false);onTab('connect');requestAnimationFrame(()=>document.querySelector<HTMLDetailsElement>('.r4-settings-roles')?.setAttribute('open',''));}}><UserPlus size={18}/><span><strong>Jemanden aus dem Team aufnehmen</strong><small>Rolle im Projekt festlegen</small></span><ChevronRight size={16}/></button>}
   <button onClick={()=>{setAdding(false);onInvite();}}><UserPlus size={18}/><span><strong>Neue Person einladen</strong><small>Einladungslink für Studio</small></span><ChevronRight size={16}/></button>
  </div>}
  <section className="pi-now" aria-label="Jetzt">
   <div><span>Offene Aufgaben</span><strong>{open.length}</strong></div>
   <div><span>Bei dir</span><strong>{mine}</strong></div>
   <div><span>Wartet auf Prüfung</span><strong>{inReview.length}</strong></div>
   <p className="pi-note">{preview?<>Vorschau: „{preview.title}“</>:'Keine laufende Vorschau. Sie entsteht, wenn eine Code-Aufgabe zur Prüfung kommt.'}</p>
  </section>
  {(!!room.meta.scope?.length||!!room.neighbours?.length)&&<p className="pi-note pi-scope">
   {!!room.meta.scope?.length&&<>Bereich: <code>{room.meta.scope.join(', ')}</code>. </>}
   {!!room.neighbours?.length&&<>Gleiches Repository wie: {room.neighbours.map(n=>n.title).join(', ')}.</>}
  </p>}
  <section className="pi-members" aria-labelledby="pi-members-title">
   <h3 id="pi-members-title">Mitglieder ({agents.length+people.length})</h3>
   <ul>
    {agents.map(a=><li key={a.id}><button onClick={()=>openAgentProfile(a.id)}>
     <AgentAvatar agent={a} size="sm"/>
     <span><strong>{a.name}{isProjectLead(a)&&<Crown className="r5-crown" size={14} aria-label="Projektleitung"/>}</strong><small>{isProjectLead(a)?'Projektleitung':agentRoleLabels[a.role]} · Agent</small></span>
     <ChevronRight size={16} aria-hidden/>
    </button></li>)}
    {people.map(m=><li key={m.id}><button disabled={m.id===userId} onClick={()=>onMemberChat(m.id)}>
     <span className="rw-avatar">{initials(m.name)}</span>
     <span><strong>{m.name}{m.id===userId?' (du)':''}</strong><small>{roleText(m)}</small></span>
     {m.id!==userId&&<ChevronRight size={16} aria-hidden/>}
    </button></li>)}
   </ul>
  </section>
  <nav className="pi-areas" aria-label="Projektbereiche">
   <button onClick={()=>onTab('tasks')}><ListChecks size={18}/><span>Aufgaben</span><small>{open.length?open.length+' offen':'keine offen'}</small><ChevronRight size={16}/></button>
   <button onClick={()=>onTab('files')}><FolderOpen size={18}/><span>Dateien und Code</span><ChevronRight size={16}/></button>
   <button onClick={()=>onTab('knowledge')}><BookOpen size={18}/><span>Wissen</span><small>{room.notes.length||''}</small><ChevronRight size={16}/></button>
   <button onClick={()=>onTab('connect')}><Settings size={18}/><span>Einstellungen</span><ChevronRight size={16}/></button>
  </nav>
 </div>;
}
