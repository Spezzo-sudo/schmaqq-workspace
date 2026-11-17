import {useEffect,useMemo,useState} from 'react';
import {Bot,ChevronDown,ChevronRight,Crown,MessageSquare,Plus,Search,Users} from 'lucide-react';
import {AgentAvatar} from './agent-avatar';
import {agentLiveActivity,agentRoleLabels,agentRunActive,isProjectLead,roomRequest,type HermesAgentRun,type Room,type RoomAgent,type RoomState} from './room-model';
import {onLiveSignal} from './live';
import './chats-home.css';

export type WaitingItem={id:string;title:string;detail:string;open:()=>void};
type AgentEntry={agent:RoomAgent;project:Room;last:number|null;preview:string;unread:number};
type Filter='all'|'groups'|'agents';

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

/** Start page: all conversations first, like a messenger. Open work stays one tap away at the top. */
export function ChatsHome({rooms,waiting,greeting,onOpen,onGeneral,onCreateProject,onAgents}:{
 rooms:Room[];waiting:WaitingItem[];greeting:string;
 onOpen:(room:string,chat?:string)=>void;onGeneral:()=>void;onCreateProject:()=>void;onAgents:()=>void;
}){
 const [filter,setFilter]=useState<Filter>('all'),[query,setQuery]=useState(''),[openWaiting,setOpenWaiting]=useState(false),[newMenu,setNewMenu]=useState(false);
 const {entries,loaded}=useAllAgents(rooms),working=useWorkingAgents();
 const q=query.trim().toLowerCase();
 // One block per project: its name once as the heading, then the group chat, the lead and the other agents.
 const sections=useMemo(()=>rooms.map(r=>{
  const titleMatch=!q||r.title.toLowerCase().includes(q);
  const agents=entries.filter(e=>e.project.id===r.id&&(titleMatch||e.agent.name.toLowerCase().includes(q)))
   .sort((a,b)=>Number(isProjectLead(b.agent))-Number(isProjectLead(a.agent))||(b.last??0)-(a.last??0));
  return {room:r,showGroup:filter!=='agents'&&titleMatch,agents:filter==='groups'?[]:agents,last:Math.max(r.lastMessage??0,...agents.map(a=>a.last??0))};
 }).filter(x=>x.showGroup||x.agents.length).sort((a,b)=>b.last-a.last),[rooms,entries,filter,q]);
 return <div className="ch-home">
  <div className="ch-head">
   <p className="ch-hello">{greeting}</p>
   <label className="ch-search"><Search size={18} aria-hidden/><span className="rw-sr">Chats durchsuchen</span><input id="team-search" type="search" placeholder="Chats durchsuchen" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <div className="ch-filters" role="group" aria-label="Chats filtern">
    {([['all','Alle'],['groups','Gruppen'],['agents','Agenten']] as const).map(([id,label])=><button key={id} aria-pressed={filter===id} className={filter===id?'on':''} onClick={()=>setFilter(id)}>{label}</button>)}
   </div>
  </div>
  {!!waiting.length&&<section className="ch-waiting" aria-label="Wartet auf dich">
   <button className="ch-waiting-head" aria-expanded={openWaiting} onClick={()=>setOpenWaiting(v=>!v)}>
    <span className="ch-waiting-count">{waiting.length}</span>
    <span className="ch-row-text"><strong>Wartet auf dich</strong><span>{waiting[0].title}{waiting.length>1?' und '+(waiting.length-1)+' weitere':''}</span></span>
    <ChevronDown size={18} aria-hidden className={openWaiting?'turned':''}/>
   </button>
   {openWaiting&&<ul>{waiting.map(w=><li key={w.id}><button onClick={w.open}><span><strong>{w.title}</strong><small>{w.detail}</small></span><ChevronRight size={16} aria-hidden/></button></li>)}</ul>}
  </section>}
  <ul className="ch-list" aria-label="Chats">
   {filter!=='agents'&&(!q||'team allgemein'.includes(q))&&<li><button className="ch-row" onClick={onGeneral}>
    <span className="ch-group-mark ch-team" aria-hidden><Users size={22}/></span>
    <span className="ch-row-text"><span className="ch-row-top"><strong>Team</strong></span><span className="ch-row-sub">Allgemeines Gespräch, nicht an ein Projekt gebunden</span></span>
   </button></li>}
  </ul>
  {sections.map(({room:r,showGroup,agents})=><section key={r.id} className="ch-project" aria-labelledby={'ch-p-'+r.id}>
   <h2 id={'ch-p-'+r.id}><span>{r.title}</span>{r.practice&&<em className="ch-tag">Übung</em>}{!!r.openTasks&&<small>{r.openTasks} offen</small>}</h2>
   <ul className="ch-list">
    {showGroup&&<li><button className="ch-row" onClick={()=>onOpen(r.id,'all')}>
     <span className="ch-group-mark" style={{background:tone(r.id)}} aria-hidden><Users size={22}/></span>
     <span className="ch-row-text"><span className="ch-row-top"><strong>Gruppenchat</strong><time>{when(r.lastMessage)}</time></span>
      <span className="ch-row-sub">{r.lastExcerpt||'Noch keine Nachricht'}</span></span>{!!r.unread&&<span className="ch-unread" aria-label={r.unread+' ungelesene Nachrichten'}>{r.unread}{r.unread===99?'+':''}</span>}
    </button></li>}
    {agents.map(e=>{const run=working.get(r.id+':'+e.agent.id),lead=isProjectLead(e.agent);return <li key={e.agent.id}><button className="ch-row" onClick={()=>onOpen(r.id,'agent:'+e.agent.id)}>
     <AgentAvatar agent={e.agent} size="md"/>
     <span className="ch-row-text"><span className="ch-row-top"><strong>{e.agent.name}</strong>{lead&&<Crown className="r5-crown" size={15} aria-label="Projektleitung"/>}<time>{when(e.last)}</time></span>
      <span className="ch-row-sub">{run?<span className="ch-working"><span className="r5-dots" aria-hidden><i/><i/><i/></span>{agentLiveActivity(run)} …</span>:e.preview}</span></span>{!!e.unread&&<span className="ch-unread" aria-label={e.unread+' ungelesene Agentennachrichten'}>{e.unread}{e.unread===99?'+':''}</span>}
    </button></li>;})}
   </ul>
  </section>)}
  {!rooms.length&&<div className="ch-empty"><p>Noch kein Projekt. Ein Projekt ist eine Gruppe mit Menschen und Agenten.</p><button className="rw-button lime" onClick={onCreateProject}><Plus size={16}/>Erstes Projekt anlegen</button></div>}
  {!!rooms.length&&filter==='agents'&&loaded&&!entries.length&&<div className="ch-empty"><p>Noch keine Agenten. Du stellst sie in einer Projektgruppe an.</p><button className="rw-button" onClick={onAgents}><Bot size={16}/>Zu den Agenten</button></div>}
  <div className="ch-fab-wrap">
   {newMenu&&<div className="ch-new-menu" role="menu">
    <button role="menuitem" onClick={()=>{setNewMenu(false);onCreateProject();}}><MessageSquare size={17}/>Neues Projekt (Gruppe)</button>
    <button role="menuitem" onClick={()=>{setNewMenu(false);onAgents();}}><Bot size={17}/>Agent anstellen</button>
   </div>}
   <button className="ch-fab" aria-label="Neu: Projekt oder Agent" aria-expanded={newMenu} onClick={()=>setNewMenu(v=>!v)}><Plus size={26}/></button>
  </div>
 </div>;
}

/** All agents, grouped by project. Adding one happens inside its project group, where it works. */
export function AgentsPage({rooms,onOpen,onCreateProject}:{rooms:Room[];onOpen:(room:string,chat?:string)=>void;onCreateProject:()=>void}){
 const {entries,loaded}=useAllAgents(rooms);
 return <div className="rw-page team-page ch-agents">
  <h1>Agenten</h1>
  <p className="studio-page-intro">Agenten arbeiten in Projektgruppen. Ihre Antworten laufen über das ChatGPT-Konto, das du unter Mein Konto verbindest.</p>
  {!loaded&&<p className="rw-muted">Wird geladen …</p>}
  {rooms.map(r=>{const list=entries.filter(e=>e.project.id===r.id);return <section key={r.id} aria-labelledby={'ag-'+r.id}>
   <h2 id={'ag-'+r.id}>{r.title}</h2>
   {list.map(e=><button key={e.agent.id} className="ch-row ch-agent-row" onClick={()=>onOpen(r.id,'agent:'+e.agent.id)}>
    <AgentAvatar agent={e.agent} size="md"/>
    <span className="ch-row-text"><span className="ch-row-top"><strong>{e.agent.name}</strong></span><span className="ch-row-sub">{agentRoleLabels[e.agent.role]}{e.agent.purpose?' · '+e.agent.purpose:''}</span></span>
    <ChevronRight size={17} aria-hidden/>
   </button>)}
   <button className="rw-button ch-hire" onClick={()=>onOpen(r.id)}><Plus size={16}/>Agent in {r.title} anstellen</button>
  </section>;})}
  {!rooms.length&&<div className="ch-empty"><p>Agenten gehören zu Projekten. Lege zuerst ein Projekt an.</p><button className="rw-button lime" onClick={onCreateProject}><Plus size={16}/>Neues Projekt</button></div>}
 </div>;
}
