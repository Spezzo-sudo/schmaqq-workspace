import {useEffect,useMemo,useRef,useState} from 'react';
import {Archive,ChevronDown,ChevronRight,Info,MessageSquare,MoreHorizontal,Plus,Search,Users} from 'lucide-react';
import {agentLiveActivity,agentRoleLabels,agentRunActive,roomRequest,type HermesAgentRun,type Room,type RoomAgent,type RoomMember,type RoomState} from './room-model';
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

/** Press and hold (or right click) a row for its actions, as in a messenger. */
function useHold(onHold:()=>void){
 const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),held=useRef(false);
 const clear=()=>clearTimeout(timer.current);
 /** True once after a hold, so the following click does not also open the project. */
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

export type ProjectSummary={room:Room;last:number;unread:number;preview:string;working:string|null};
/** One line per project: the group chat plus the viewer's own agent chats of that project, counted together. */
export function useProjectSummaries(rooms:Room[]):ProjectSummary[]{
 const {entries}=useAllAgents(rooms),working=useWorkingAgents();
 return useMemo(()=>rooms.map(r=>{
  const mine=entries.filter(e=>e.project.id===r.id);
  const newest=mine.filter(e=>e.last).sort((a,b)=>(b.last??0)-(a.last??0))[0];
  const groupLast=r.lastMessage??0,agentLast=newest?.last??0;
  const run=[...working.values()].find(w=>w.project===r.id);
  const runner=run?mine.find(e=>e.agent.id===run.agent)?.agent.name??'Ein Agent':null;
  return {room:r,last:Math.max(groupLast,agentLast),unread:(r.unread??0)+mine.reduce((n,e)=>n+e.unread,0),
   preview:agentLast>groupLast&&newest?newest.agent.name+': '+newest.preview:r.lastExcerpt||(r.openTasks?r.openTasks+' offene Aufgaben':'Noch keine Nachricht'),
   working:runner&&run?runner+' · '+agentLiveActivity(run):null};
 }).sort((a,b)=>b.last-a.last),[rooms,entries,working]);
}

function ProjectRow({summary:{room:r,unread,preview,working,last},active=false,onOpen,onInfo,onArchive}:{summary:ProjectSummary;active?:boolean;onOpen:()=>void;onInfo:()=>void;onArchive:()=>void}){
 const [menu,setMenu]=useState(false),hold=useHold(()=>setMenu(true));
 return <li className="ch-row-wrap">
  <button className={'ch-row'+(active?' active':'')} aria-current={active?'page':undefined} {...hold.props} onClick={()=>{if(!hold.consume())onOpen();}}>
   <span className="ch-group-mark" style={{background:tone(r.id)}} aria-hidden>{initials(r.title)}</span>
   <span className="ch-row-text"><span className="ch-row-top"><strong>{r.title}</strong>{r.practice&&<em className="ch-tag">Übung</em>}<time>{when(last||null)}</time></span>
    <span className="ch-row-sub">{working?<span className="ch-working"><span className="r5-dots" aria-hidden><i/><i/><i/></span>{working} …</span>:preview}</span></span>
   {!!unread&&<span className="ch-unread" aria-label={unread+' ungelesene Nachrichten'}>{unread>99?'99+':unread}</span>}
  </button>
  <button className="ch-row-more" aria-label={'Aktionen für '+r.title} aria-expanded={menu} onClick={()=>setMenu(v=>!v)}><MoreHorizontal size={18}/></button>
  {menu&&<div className="ch-row-menu" role="menu" onMouseLeave={()=>setMenu(false)}>
   <button role="menuitem" onClick={()=>{setMenu(false);onOpen();}}><MessageSquare size={16}/>Öffnen</button>
   <button role="menuitem" onClick={()=>{setMenu(false);onInfo();}}><Info size={16}/>Projektinfo</button>
   <button role="menuitem" className="danger" onClick={()=>{setMenu(false);onArchive();}}><Archive size={16}/>Archivieren</button>
  </div>}
 </li>;
}

/** Projects as a list (start page on phones, left column on wide screens), then direct messages with people. */
export function ProjectList({rooms,members,userId,active,waiting=[],compact=false,onOpen,onInfo,onArchive,onMemberChat,onGeneral,onCreateProject}:{
 rooms:Room[];members:RoomMember[];userId:string;active?:string;waiting?:WaitingItem[];compact?:boolean;
 onOpen:(room:string)=>void;onInfo:(room:string)=>void;onArchive:(room:Room)=>void;onMemberChat:(room:string,member:string)=>void;onGeneral:()=>void;onCreateProject:()=>void;
}){
 const [query,setQuery]=useState(''),[openWaiting,setOpenWaiting]=useState(false),[direct,setDirect]=useState(false),[person,setPerson]=useState<string|null>(null);
 const summaries=useProjectSummaries(rooms),q=query.trim().toLowerCase();
 const shown=summaries.filter(s=>!q||s.room.title.toLowerCase().includes(q));
 const people=members.filter(m=>!m.removed&&m.id!==userId);
 return <div className={'ch-home'+(compact?' ch-compact':'')}>
  {!compact&&rooms.length>5&&<div className="ch-head"><label className="ch-search"><Search size={18} aria-hidden/><span className="rw-sr">Projekte durchsuchen</span><input id="team-search" type="search" placeholder="Projekte durchsuchen" value={query} onChange={e=>setQuery(e.target.value)}/></label></div>}
  {!!waiting.length&&<section className="ch-waiting" aria-label="Wartet auf dich">
   <button className="ch-waiting-head" aria-expanded={openWaiting} onClick={()=>setOpenWaiting(v=>!v)}>
    <span className="ch-waiting-count">{waiting.length}</span>
    <span className="ch-row-text"><strong>Wartet auf dich</strong><span>{waiting[0].title}</span><small>{waiting[0].detail}{waiting.length>1?' · und '+(waiting.length-1)+' weitere':''}</small></span>
    <ChevronDown size={18} aria-hidden className={openWaiting?'turned':''}/>
   </button>
   {openWaiting&&<ul>{waiting.map(w=><li key={w.id}><button onClick={w.open}><span><strong>{w.title}</strong><small>{w.detail}</small></span><ChevronRight size={16} aria-hidden/></button></li>)}</ul>}
  </section>}
  <h2 className="ch-section">Projekte</h2>
  <ul className="ch-list ch-flat" aria-label="Projekte">
   {shown.map(s=><ProjectRow key={s.room.id} summary={s} active={s.room.id===active} onOpen={()=>onOpen(s.room.id)} onInfo={()=>onInfo(s.room.id)} onArchive={()=>onArchive(s.room)}/>)}
  </ul>
  {!rooms.length&&<div className="ch-empty"><p>Noch kein Projekt. Ein Projekt ist ein Chat mit Menschen und Agenten.</p><button className="rw-button lime" onClick={onCreateProject}><Plus size={16}/>Erstes Projekt anlegen</button></div>}
  <ul className="ch-list ch-direct">
   <li><button className="ch-row ch-row-small" onClick={onGeneral}><span className="ch-group-mark ch-team" aria-hidden><Users size={18}/></span><span className="ch-row-text"><span className="ch-row-top"><strong>Team</strong></span><span className="ch-row-sub">Für alles ohne Projekt</span></span></button></li>
   {!!people.length&&<li><button className="ch-row ch-row-small" aria-expanded={direct} onClick={()=>setDirect(v=>!v)}><span className="ch-group-mark ch-direct-mark" aria-hidden><MessageSquare size={18}/></span><span className="ch-row-text"><span className="ch-row-top"><strong>Direktnachrichten</strong></span><span className="ch-row-sub">{people.map(p=>p.name).join(', ')}</span></span><ChevronDown size={17} aria-hidden className={direct?'turned':''}/></button>
    {direct&&<ul className="ch-people">{people.map(m=><li key={m.id}>
     <button className="ch-row ch-row-small" aria-expanded={person===m.id} onClick={()=>setPerson(v=>v===m.id?null:m.id)}><span className="rw-avatar ch-person">{initials(m.name)}</span><span className="ch-row-text"><span className="ch-row-top"><strong>{m.name}</strong></span><span className="ch-row-sub">{m.role==='owner'?'Inhaber':'Mitglied'}</span></span></button>
     {person===m.id&&<div className="ch-person-chats">{rooms.map(r=><button key={r.id} className="rw-button" onClick={()=>onMemberChat(r.id,m.id)}><MessageSquare size={15}/>Nachricht in {r.title}</button>)}</div>}
    </li>)}</ul>}
   </li>}
  </ul>
  {!compact&&<div className="ch-fab-wrap"><button className="ch-fab" aria-label="Neues Projekt" onClick={onCreateProject}><Plus size={26}/></button></div>}
 </div>;
}
