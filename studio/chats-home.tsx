import {useEffect,useMemo,useRef,useState} from 'react';
import {Archive,Bot,ChevronDown,ChevronRight,Crown,Info,MessageSquare,MoreHorizontal,Plus,Search,UserPlus,Users} from 'lucide-react';
import {AgentAvatar} from './agent-avatar';
import {agentLiveActivity,agentRoleLabels,agentRunActive,isProjectLead,roomRequest,type HermesAgentRun,type Room,type RoomAgent,type RoomMember,type RoomState} from './room-model';
import {onLiveSignal} from './live';
import './chats-home.css';

export type WaitingItem={id:string;title:string;detail:string;open:()=>void};
type AgentEntry={agent:RoomAgent;project:Room;last:number|null;preview:string;unread:number};

const when=(t:number|null|undefined)=>{
 if(!t)return '';
 const d=new Date(t),now=new Date();
 if(d.toDateString()===now.toDateString())return d.toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
 const days=(now.getTime()-t)/86400000;
 return days<6?d.toLocaleDateString('de-CH',{weekday:'short'}):d.toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'});
};
const initials=(title:string)=>title.replace(/[^\p{L}\p{N} ]/gu,' ').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
const tones=['#2f6f5e','#7a4fd0','#9a6a12','#3c5bb5','#b4452f','#4b6b00'];
const tone=(id:string)=>tones[[...id].reduce((a,c)=>a+c.charCodeAt(0),0)%tones.length];

/** Re-check agent conversations only when project messages or read state changed. */
export function useAllAgents(rooms:Room[]){
 const [entries,setEntries]=useState<AgentEntry[]>([]),[loaded,setLoaded]=useState(false);
 const ids=rooms.map(r=>[r.id,r.lastMessage??0,r.lastExcerpt??'',r.unread??0].join(':')).join('|');
 useEffect(()=>{
  let cancelled=false;
  void Promise.all(rooms.map(r=>roomRequest<RoomState>('/api/room?project='+encodeURIComponent(r.id)).then(state=>({r,state})).catch(()=>null))).then(results=>{
   if(cancelled)return;
   const list:AgentEntry[]=[];
   for(const item of results){if(!item)continue;
    for(const agent of (item.state.agents??[]).filter(a=>a.active!==false)){
     const mine=item.state.messages.filter(m=>m.scope==='agent:'+agent.id).sort((a,b)=>(b.sequence??b.created)-(a.sequence??a.created))[0];
     list.push({agent,project:item.r,last:mine?.created??null,preview:mine?mine.body:agent.purpose||agentRoleLabels[agent.role],unread:item.state.unread?.['agent:'+agent.id]??0});
    }}
   setEntries(list);setLoaded(true);
  });
  return ()=>{cancelled=true;};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[ids]);
 return {entries,loaded};
}

/** Agents that are answering the viewer right now, across all projects ("project:agent"). */
function useWorkingAgents(){
 const [working,setWorking]=useState<Map<string,HermesAgentRun>>(new Map());
 useEffect(()=>{
  let mounted=true,timer:ReturnType<typeof setTimeout>|undefined;
  const poll=async()=>{
   let active=false;
   if(!document.hidden){
    try{
     const state=await roomRequest<{runs:HermesAgentRun[]}>('/api/agent-runs');
     const next=new Map(state.runs.filter(agentRunActive).map(r=>[r.project+':'+r.agent,r] as const));
     active=next.size>0;
     if(mounted)setWorking(next);
    }catch{/* Login and offline errors are handled by the workspace. */}
   }
   if(mounted)timer=setTimeout(poll,active?2000:8000);
  };
  void poll();
  const stop=onLiveSignal(signal=>{if(signal.type==='runs'){clearTimeout(timer);void poll();}});
  return()=>{mounted=false;clearTimeout(timer);stop();};
 },[]);
 return working;
}

type HomeTab='chats'|'contacts';
/** Chats | Kontakte at the top of the start page, like a messenger. */
export function HomeTabs({tab,onTab,unread=0}:{tab:HomeTab;onTab:(tab:HomeTab)=>void;unread?:number}){
 return <div className="home-tabs" role="tablist" aria-label="Start">
  <button role="tab" aria-selected={tab==='chats'} className={tab==='chats'?'on':''} onClick={()=>onTab('chats')}>Chats{unread>0&&<span className="n">{unread}</span>}</button>
  <button role="tab" aria-selected={tab==='contacts'} className={tab==='contacts'?'on':''} onClick={()=>onTab('contacts')}>Kontakte</button>
 </div>;
}

type Row={key:string;last:number;kind:'group'|'agent';room:Room;entry?:AgentEntry};
/** Press and hold (or right click) a row for its actions, as in a messenger. */
function useHold(onHold:()=>void){
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),held=useRef(false);
 const clear=()=>clearTimeout(timer.current);
 /** True once after a hold, so the following click does not also open the chat. */
 const consume=()=>{const was=held.current;held.current=false;return was;};
 return {
  consume,
  props:{
   onPointerDown:()=>{held.current=false;clear();timer.current=setTimeout(()=>{held.current=true;onHold();},520);},
   onPointerUp:clear,onPointerLeave:clear,onPointerCancel:clear,
   onContextMenu:(e:React.MouseEvent)=>{e.preventDefault();clear();held.current=true;onHold();}
  }
 };
}

function GroupRow({room:r,onOpen,onInfo,onArchive}:{room:Room;onOpen:()=>void;onInfo:()=>void;onArchive:()=>void}){
 const [menu,setMenu]=useState(false),hold=useHold(()=>setMenu(true));
 return <li className="ch-row-wrap">
  <button className="ch-row" {...hold.props} onClick={()=>{if(!hold.consume())onOpen();}}>
   <span className="ch-group-mark" style={{background:tone(r.id)}} aria-hidden>{initials(r.title)}</span>
   <span className="ch-row-text"><span className="ch-row-top"><strong>{r.title}</strong>{r.practice&&<em className="ch-tag">Übung</em>}<time>{when(r.lastMessage)}</time></span>
    <span className="ch-row-sub">{r.lastExcerpt||(r.openTasks?r.openTasks+' offene Aufgaben':'Noch keine Nachricht')}</span></span>
   {!!r.unread&&<span className="ch-unread" aria-label={r.unread+' ungelesene Nachrichten'}>{r.unread}{r.unread===99?'+':''}</span>}
  </button>
  <button className="ch-row-more" aria-label={'Aktionen für '+r.title} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MoreHorizontal size={18}/></button>
  {menu&&<div className="ch-row-menu" role="menu" onMouseLeave={()=>setMenu(false)}>
   <button role="menuitem" onClick={()=>{setMenu(false);onInfo();}}><Info size={16}/>Projektinfo</button>
   <button role="menuitem" onClick={()=>{setMenu(false);onOpen();}}><MessageSquare size={16}/>Gruppenchat öffnen</button>
   <button role="menuitem" className="danger" onClick={()=>{setMenu(false);onArchive();}}><Archive size={16}/>Archivieren</button>
  </div>}
 </li>;
}

/** Start page: one list of all conversations, newest first. Projects are groups; agents are contacts. */
export function ChatsHome({rooms,waiting,onTab,onOpen,onInfo,onArchive,onGeneral,onCreateProject,onContacts}:{
 rooms:Room[];waiting:WaitingItem[];onTab:(tab:HomeTab)=>void;
 onOpen:(room:string,chat?:string)=>void;onInfo:(room:string)=>void;onArchive:(room:Room)=>void;onGeneral:()=>void;onCreateProject:()=>void;onContacts:()=>void;
}){
 const [query,setQuery]=useState(''),[openWaiting,setOpenWaiting]=useState(false),[newMenu,setNewMenu]=useState(false);
 const {entries}=useAllAgents(rooms),working=useWorkingAgents();
 const q=query.trim().toLowerCase();
 const rows=useMemo(()=>{
  const list:Row[]=[];
  for(const r of rooms){if(!q||r.title.toLowerCase().includes(q))list.push({key:'g:'+r.id,last:r.lastMessage??0,kind:'group',room:r});}
  for(const e of entries){if(!e.last&&!q)continue;if(!q||e.agent.name.toLowerCase().includes(q)||e.project.title.toLowerCase().includes(q))list.push({key:'a:'+e.project.id+':'+e.agent.id,last:e.last??0,kind:'agent',room:e.project,entry:e});}
  // Newest first; without any message yet: groups before agents, the project lead before the team.
  return list.sort((a,b)=>b.last-a.last||Number(a.kind==='agent')-Number(b.kind==='agent')||Number(isProjectLead(b.entry?.agent??({} as RoomAgent)))-Number(isProjectLead(a.entry?.agent??({} as RoomAgent))));
 },[rooms,entries,q]);
 const unread=rooms.reduce((n,r)=>n+(r.unread??0),0)+entries.reduce((n,e)=>n+e.unread,0);
 return <div className="ch-home">
  <HomeTabs tab="chats" onTab={onTab} unread={unread}/>
  <div className="ch-head">
   <label className="ch-search"><Search size={18} aria-hidden/><span className="rw-sr">Chats durchsuchen</span><input id="team-search" type="search" placeholder="Chats und Projekte durchsuchen" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  </div>
  {!!waiting.length&&<section className="ch-waiting" aria-label="Wartet auf dich">
   <button className="ch-waiting-head" aria-expanded={openWaiting} onClick={()=>setOpenWaiting(v=>!v)}>
    <span className="ch-waiting-count">{waiting.length}</span>
    <span className="ch-row-text"><strong>Wartet auf dich</strong><span>{waiting[0].title}</span><small>{waiting[0].detail}{waiting.length>1?' · und '+(waiting.length-1)+' weitere':''}</small></span>
    <ChevronDown size={18} aria-hidden className={openWaiting?'turned':''}/>
   </button>
   {openWaiting&&<ul>{waiting.map(w=><li key={w.id}><button onClick={w.open}><span><strong>{w.title}</strong><small>{w.detail}</small></span><ChevronRight size={16} aria-hidden/></button></li>)}</ul>}
  </section>}
  <ul className="ch-list ch-flat" aria-label="Chats">
   {rows.map(row=>row.kind==='group'
    ?<GroupRow key={row.key} room={row.room} onOpen={()=>onOpen(row.room.id,'all')} onInfo={()=>onInfo(row.room.id)} onArchive={()=>onArchive(row.room)}/>
    :(()=>{const e=row.entry!,run=working.get(row.room.id+':'+e.agent.id),lead=isProjectLead(e.agent);return <li key={row.key}><button className="ch-row" onClick={()=>onOpen(row.room.id,'agent:'+e.agent.id)}>
     <AgentAvatar agent={e.agent} size="md"/>
     <span className="ch-row-text"><span className="ch-row-top"><strong>{e.agent.name}</strong>{lead&&<Crown className="r5-crown" size={15} aria-label="Projektleitung"/>}<em className="ch-agent-tag">KI</em><time>{when(e.last)}</time></span>
      <span className="ch-row-sub">{run?<span className="ch-working"><span className="r5-dots" aria-hidden><i/><i/><i/></span>{agentLiveActivity(run)} …</span>:<><span className="ch-row-project">{row.room.title} · </span>{e.preview}</>}</span></span>{!!e.unread&&<span className="ch-unread" aria-label={e.unread+' ungelesene Agentennachrichten'}>{e.unread}{e.unread===99?'+':''}</span>}
    </button></li>;})())}
   {(!q||'team allgemein'.includes(q))&&<li><button className="ch-row" onClick={onGeneral}>
    <span className="ch-group-mark ch-team" aria-hidden><Users size={22}/></span>
    <span className="ch-row-text"><span className="ch-row-top"><strong>Team</strong></span><span className="ch-row-sub">Allgemeines Gespräch, nicht an ein Projekt gebunden</span></span>
   </button></li>}
  </ul>
  {!rooms.length&&<div className="ch-empty"><p>Noch kein Projekt. Ein Projekt ist eine Gruppe mit Menschen und Agenten.</p><button className="rw-button lime" onClick={onCreateProject}><Plus size={16}/>Erstes Projekt anlegen</button></div>}
  <div className="ch-fab-wrap">
   {newMenu&&<div className="ch-new-menu" role="menu">
    <button role="menuitem" onClick={()=>{setNewMenu(false);onCreateProject();}}><MessageSquare size={17}/>Neues Projekt (Gruppe)</button>
    <button role="menuitem" onClick={()=>{setNewMenu(false);onContacts();}}><Bot size={17}/>Agent anstellen</button>
   </div>}
   <button className="ch-fab" aria-label="Neu: Projekt oder Agent" aria-expanded={newMenu} onClick={()=>setNewMenu(v=>!v)}><Plus size={26}/></button>
  </div>
 </div>;
}

/** People and agents. Agents are listed under the project they belong to; a tap opens their profile. */
export function ContactsPage({rooms,members,userId,onTab,onProfile,onMemberChat,onInvite,onHire,onCreateProject}:{
 rooms:Room[];members:RoomMember[];userId:string;onTab:(tab:HomeTab)=>void;
 onProfile:(room:string,agent:string)=>void;onMemberChat:(room:string,member:string)=>void;onInvite:()=>void;onHire:(room:string)=>void;onCreateProject:()=>void;
}){
 const {entries,loaded}=useAllAgents(rooms);
 const [person,setPerson]=useState<string|null>(null);
 const people=members.filter(m=>!m.removed).sort((a,b)=>Number(b.id===userId)-Number(a.id===userId)||a.name.localeCompare(b.name));
 return <div className="ch-home ch-contacts">
  <HomeTabs tab="contacts" onTab={onTab}/>
  <div className="ch-contact-actions">
   <button className="rw-button" onClick={onInvite}><UserPlus size={16}/>Jemanden einladen</button>
   {rooms.length===1&&<button className="rw-button lime" onClick={()=>onHire(rooms[0].id)}><Plus size={16}/>Agent anstellen</button>}
  </div>
  <section aria-labelledby="ct-people"><h2 id="ct-people" className="ch-section">Menschen</h2>
   <ul className="ch-list">{people.map(m=><li key={m.id}>
    <button className="ch-row" disabled={m.id===userId} aria-expanded={person===m.id} onClick={()=>setPerson(v=>v===m.id?null:m.id)}>
     <span className="rw-avatar ch-person">{initials(m.name)}</span>
     <span className="ch-row-text"><span className="ch-row-top"><strong>{m.name}{m.id===userId?' (du)':''}</strong></span><span className="ch-row-sub">{m.role==='owner'?'Inhaber':'Mitglied'}</span></span>
    </button>
    {person===m.id&&<div className="ch-person-chats">{rooms.map(r=><button key={r.id} className="rw-button" onClick={()=>onMemberChat(r.id,m.id)}><MessageSquare size={15}/>Nachricht in {r.title}</button>)}</div>}
   </li>)}</ul>
  </section>
  {!loaded&&<p className="rw-muted">Agenten werden geladen …</p>}
  {rooms.map(r=>{const list=entries.filter(e=>e.project.id===r.id).sort((a,b)=>Number(isProjectLead(b.agent))-Number(isProjectLead(a.agent))||a.agent.name.localeCompare(b.agent.name));return <section key={r.id} aria-labelledby={'ct-'+r.id}>
   <h2 id={'ct-'+r.id} className="ch-section">{r.title}</h2>
   <ul className="ch-list">{list.map(e=><li key={e.agent.id}><button className="ch-row" onClick={()=>onProfile(r.id,e.agent.id)}>
    <AgentAvatar agent={e.agent} size="md"/>
    <span className="ch-row-text"><span className="ch-row-top"><strong>{e.agent.name}</strong>{isProjectLead(e.agent)&&<Crown className="r5-crown" size={15} aria-label="Projektleitung"/>}<em className="ch-agent-tag">KI</em></span><span className="ch-row-sub">{isProjectLead(e.agent)?'Projektleitung':agentRoleLabels[e.agent.role]}</span></span>
    <ChevronRight size={17} aria-hidden/>
   </button></li>)}</ul>
   <button className="rw-button ch-hire" onClick={()=>onHire(r.id)}><Plus size={16}/>Agent in {r.title} anstellen</button>
  </section>;})}
  {!rooms.length&&<div className="ch-empty"><p>Agenten gehören zu Projekten. Lege zuerst ein Projekt an.</p><button className="rw-button lime" onClick={onCreateProject}><Plus size={16}/>Neues Projekt</button></div>}
 </div>;
}
