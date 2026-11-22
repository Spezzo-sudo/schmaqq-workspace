import {useEffect,useId,useState} from 'react';
import type {Studio} from './app';
import {api,newId,plural,q,when,type Message,type TeamChat,type TeamTask} from './api';
import {Face,photoOf} from './avatar';
import {Chat} from './chat';
import {activeAgents,jobOf,messagesOf,runActive,taskState,teamOrder} from './model';
import {Bar,Brand,Dialog,ErrorLine,Field,Info,Plus} from './parts';
import {ProfileDialog,TeamExpand} from './people';

/** A project: its chat (or a private chat with one agent), the team on top, and its tasks. */
export function ProjectScreen({studio}:{studio:Studio}){
 const {room,route,go,runs,desktop}=studio;
 const [profile,setProfile]=useState(''),[expandedProject,setExpandedProject]=useState('');
 const teamId=useId();
 if(!room)return <div className="ui-loading" role="status">Projekt wird geladen …</div>;
 const agents=teamOrder(room.agents),people=room.members.filter(m=>!m.removed);
 const chatAgent=route.chat.startsWith('agent:')?agents.find(a=>a.id===route.chat.slice(6))??null:null;
 const chatMember=route.chat.startsWith('member:')?people.find(m=>m.id===route.chat.slice(7))??null:null;
 const working=new Set(runs.runs.filter(runActive).map(r=>r.agent));
 const unread=(key:string)=>room.unread?.[key]??0;
 const teamLabel=(name:string,key:string,detail?:string)=>{
  const count=unread(key);
  return [name,detail,count?count+' ungelesen':null].filter(Boolean).join(' · ');
 };
 const teamExpanded=desktop||expandedProject===room.project.id;
 const photoSize=teamExpanded?48:30;
 if(chatAgent)return <section className="ui-screen">
  <Bar onBack={()=>go({chat:''})} title={chatAgent.name} sub={jobOf(chatAgent).title+(room.sharing?.['agent:'+chatAgent.id]?.shared?' · fürs Team sichtbar':' · privat')} onTitle={()=>setProfile(chatAgent.id)}
   end={<button className="ui-icon-face" aria-label={'Profil von '+chatAgent.name} onClick={()=>setProfile(chatAgent.id)}><Face agent={chatAgent} size={34} working={working.has(chatAgent.id)}/></button>}/>
  <Visibility studio={studio} chat={'agent:'+chatAgent.id}/>
  <Chat studio={studio} place={{kind:'agent',agent:chatAgent}} key={chatAgent.id}/>
  {profile&&<ProfileDialog studio={studio} agentId={profile} onClose={()=>setProfile('')}/>}
 </section>;
 if(chatMember)return <section className="ui-screen">
  <Bar onBack={()=>go({chat:''})} title={chatMember.name} sub={room.sharing?.['member:'+chatMember.id]?.shared?'fürs Team sichtbar':'privat'} end={<Face name={chatMember.name} photo={photoOf(chatMember,room.project.id)} size={34}/>}/>
  <Visibility studio={studio} chat={'member:'+chatMember.id} other={chatMember.name.split(' ')[0]}/>
  <Chat studio={studio} place={{kind:'member',member:chatMember}} key={chatMember.id}/>
 </section>;
 const teamChat=route.chat.startsWith('team:')?room.teamChats?.find(c=>c.chat===route.chat)??null:null;
 if(route.chat.startsWith('team:'))return <TeamChatScreen studio={studio} chat={teamChat}/>;
 return <section className="ui-screen ui-project">
  <Bar onBack={desktop?undefined:()=>go({page:'start',project:''})} title={room.project.title}
   sub={teamExpanded?plural(people.length,'Mensch','Menschen')+' · '+plural(agents.length,'Agent','Agenten'):undefined} onTitle={()=>go({info:true,task:''})}
   end={<button className="ui-icon" aria-label="Projektinfo" onClick={()=>go({info:true,task:''})}><Info/></button>}/>
  {!desktop&&<div className={'ui-team-panel'+(teamExpanded?'':' compact')}>
   <nav className="ui-team" id={teamId} aria-label="Projektteam">
    {agents.map(a=><button key={a.id} className="ui-team-member" aria-label={teamLabel(a.name,'agent:'+a.id,working.has(a.id)?'arbeitet gerade':jobOf(a).title)}
     onClick={()=>go({chat:'agent:'+a.id})} onContextMenu={e=>{e.preventDefault();setProfile(a.id);}}>
     <Face agent={a} size={photoSize} working={working.has(a.id)} badge={unread('agent:'+a.id)}/><b>{a.name}</b><small>{jobOf(a).title}</small>
    </button>)}
    {people.map(m=>m.id===studio.me.id?<div key={m.id} className="ui-team-member me" role={teamExpanded?undefined:"img"} aria-label={teamExpanded?undefined:"Du"}>
     <Face name={m.name} photo={photoOf(m,room.project.id)} size={photoSize}/><b>Du</b><small>{m.role==='owner'?'Inhaber':'Mensch'}</small></div>
     :<button key={m.id} className="ui-team-member" aria-label={teamLabel(m.name,'member:'+m.id)} onClick={()=>go({chat:'member:'+m.id})}>
      <Face name={m.name} photo={photoOf(m,room.project.id)} size={photoSize} badge={unread('member:'+m.id)}/><b>{m.name.split(' ')[0]}</b><small>Mensch</small></button>)}
   </nav>
   {teamExpanded&&<div className="ui-team-add"><TeamExpand key={room.project.id} studio={studio} inStrip/></div>}
   {!desktop&&<button className="ui-team-toggle" type="button" aria-controls={teamId} aria-expanded={teamExpanded}
    onClick={()=>setExpandedProject(teamExpanded?'':room.project.id)}>Team
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
   </button>}
  </div>}
  <div className="ui-tabs" role="tablist">
   <button role="tab" aria-selected={route.tab==='chat'||desktop&&route.tab==='talks'} onClick={()=>go({tab:'chat'},true)}>Chat</button>
   {!desktop&&<button role="tab" aria-selected={route.tab==='talks'} onClick={()=>go({tab:'talks'},true)}>Gespräche{talksUnread(studio)>0&&<b className="ui-count">{talksUnread(studio)}</b>}</button>}
   <button role="tab" aria-selected={route.tab==='tasks'} onClick={()=>go({tab:'tasks'},true)}>Aufgaben{openCount(studio)>0&&<b className="ui-count">{openCount(studio)}</b>}</button>
  </div>
  {route.tab==='tasks'?<TaskList studio={studio}/>:route.tab==='talks'&&!desktop?<Conversations studio={studio} embedded/>:<Chat studio={studio} place={{kind:'group'}} key={room.project.id}/>}
  {profile&&<ProfileDialog studio={studio} agentId={profile} onClose={()=>setProfile('')}/>}
 </section>;
}

/** Who in the team took a task: the last colleague it was handed to in its conversation. */
export function agentOnTask(studio:Studio,task:string):string|null{
 const room=studio.room;if(!room)return null;
 const handed=[...room.messages].reverse().find(m=>m.topicTask===task&&m.recipientKind==='agent'&&m.recipient);
 return handed?(room.agents??[]).find(a=>a.id===handed.recipient&&a.active!==false)?.name??null:null;
}
export const projectTasks=(studio:Studio):TeamTask[]=>studio.team.tasks.filter(t=>t.project===studio.room?.project.id);
const openCount=(studio:Studio)=>projectTasks(studio).filter(t=>t.status!=='done'&&t.assignee===studio.me.id).length;

function TaskList({studio}:{studio:Studio}){
 const {me,go,room}=studio;
 const [adding,setAdding]=useState(false);
 const tasks=projectTasks(studio);
 const groups=[
  {title:'Bei dir',items:tasks.filter(t=>t.status!=='done'&&t.assignee===me.id)},
  {title:'Läuft',items:tasks.filter(t=>t.status!=='done'&&t.assignee!==me.id)},
  {title:'Erledigt',items:tasks.filter(t=>t.status==='done')}
 ];
 const nameOf=(t:TeamTask)=>agentOnTask(studio,t.id)??(t.assignee?room!.members.find(m=>m.id===t.assignee)?.name??'Jemand':'noch niemand');
 return <div className="ui-tasks">
  {studio.roles?.mine.some(r=>r==='admin'||r==='developer')&&<div className="ui-tasks-head"><button className="ui-btn" onClick={()=>setAdding(true)}><Plus/> Aufgabe</button></div>}
  {tasks.length===0&&<p className="ui-muted center">Noch keine Aufgaben. Sag Herrn Grau im Chat, was ihr erreichen wollt, dann macht er einen Plan. Oder leg selbst eine an.</p>}
  {groups.map(g=>g.items.length>0&&<div key={g.title} className="ui-block">
   <h3 className="ui-label">{g.title} <small>{g.items.length}</small></h3>
   {g.items.map(t=>{const s=taskState(t);return <button key={t.id} className="ui-row" onClick={()=>go({task:t.id,info:false})}>
    <span className={'ui-dot '+s.tone}/><span className="ui-row-text"><b>{t.title}</b><small>{s.label} · {t.contract?.kind==='code'?'Code':'Sonstiges'} · {nameOf(t)}</small></span>
   </button>;})}
  </div>)}
  {adding&&<NewTask studio={studio} onClose={()=>setAdding(false)}/>}
 </div>;
}

export function NewTask({studio,onClose}:{studio:Studio;onClose:()=>void}){
 const [title,setTitle]=useState(''),[done,setDone]=useState(''),[kind,setKind]=useState<'code'|'general'>('code'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [id]=useState(newId);
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{const r=await api<{task:string}>('/api/room',{action:'task',id,project:studio.room!.project.id,title:title.trim(),description:'',kind,criteria:done.trim()});
   await studio.reload();onClose();studio.go({task:r.task,info:false});}
  catch(err){setError((err as Error).message);}finally{setBusy(false);}
 }
 return <Dialog title="Aufgabe anlegen" onClose={onClose}>
  <form className="ui-form" onSubmit={save}>
   <Field label="Was soll passieren?"><input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160} autoFocus/></Field>
   <Field label="Fertig, wenn …" hint="Woran man sieht, dass es geschafft ist."><textarea value={done} onChange={e=>setDone(e.target.value)} rows={2} maxLength={400}/></Field>
   <div className="ui-choice" role="radiogroup" aria-label="Art">
    <button type="button" role="radio" aria-checked={kind==='code'} onClick={()=>setKind('code')}><b>Code</b><small>Jemand aus der Entwicklung ändert den Code.</small></button>
    <button type="button" role="radio" aria-checked={kind==='general'} onClick={()=>setKind('general')}><b>Sonstiges</b><small>Text, Recherche, Entscheidung.</small></button>
   </div>
   <ErrorLine text={error}/>
   <div className="ui-actions"><button type="button" className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={busy||!title.trim()}>Anlegen</button></div>
  </form>
 </Dialog>;
}

export const peopleCount=(studio:Studio)=>activeAgents(studio.room?.agents).length;

/** Unread in the private chats (the project chat counts on its own tab). */
const talksUnread=(studio:Studio)=>Object.entries(studio.room?.unread??{}).filter(([k])=>k!=='all').reduce((n,[,v])=>n+v,0);

/**
 * All conversations of this project in one list (owner, 22.11.2026): the project chat, my chats with agents and
 * with people, chats others made readable for the team, and the conversations of the tasks.
 * Desktop: the left column of a project. Phone: the tab "Gespräche".
 */
export function Conversations({studio,embedded=false}:{studio:Studio;embedded?:boolean}){
 const {room,route,go,runs,me}=studio;
 if(!room)return <div className="ui-loading" role="status">Projekt wird geladen …</div>;
 const agents=teamOrder(room.agents),people=room.members.filter(m=>!m.removed&&m.id!==me.id);
 const working=new Set(runs.runs.filter(runActive).map(r=>r.agent));
 const unread=(key:string)=>room.unread?.[key]??0;
 const lastOf=(list:Message[])=>list.at(-1);
 const group=lastOf(messagesOf(room.messages,{}));
 const here=(chat:string)=>!route.task&&!route.info&&route.chat===chat&&(chat!==''||route.tab==='chat'||route.tab==='talks');
 const shared=(key:string)=>!!room.sharing?.[key]?.shared;
 const nameOf=(id:string)=>room.members.find(m=>m.id===id)?.name.split(' ')[0]??'Jemand';
 const agentName=(id:string)=>(room.agents??[]).find(a=>a.id===id)?.name??'Agent';
 // Tasks with a conversation, newest first; done ones only in the task list.
 const latest=new Map<string,number>();
 for(const m of room.messages)if(m.inTask)latest.set(m.inTask,Math.max(latest.get(m.inTask)??0,m.created));
 const tasks=projectTasks(studio).filter(t=>t.status!=='done').sort((a,b)=>(latest.get(b.id)??0)-(latest.get(a.id)??0)).slice(0,8);
 const row=(key:string,chat:string,face:React.ReactNode,title:string,detail:string,at?:number)=><button key={key} className={'ui-row talk'+(here(chat)?' current':'')} onClick={()=>go({chat,task:'',info:false,tab:chat===''||studio.desktop?'chat':'talks'})}>
  {face}<span className="ui-row-text"><b>{title}</b><small className="ui-row-excerpt">{detail}</small></span>
  <span className="ui-row-end">{at?<small>{when(at)}</small>:null}{unread(chat||'all')>0&&<b className="ui-count">{unread(chat||'all')}</b>}</span>
 </button>;
 return <nav className={'ui-talks'+(embedded?' embedded':'')} aria-label="Gespräche im Projekt">
  {!embedded&&<header className="ui-talks-head">
   <button className="ui-link" onClick={()=>go({page:'start',project:''})}>‹ Zentrale</button>
   <Brand onHome={()=>go({page:'start',project:''})}/>
  </header>}
  <div className="ui-block">
   {row('group','',<span className="ui-tile small" style={{background:tileOf(room.project.title)}}>#</span>,'Projektchat',group?glimpse(group,nameOf,agentName,me.id):'Alle im Projekt',group?.created)}
  </div>
  <div className="ui-block">
   <h2 className="ui-label">Mit Agenten</h2>
   {agents.map(a=>{const last=lastOf(messagesOf(room.messages,{agent:a.id}));
    return row(a.id,'agent:'+a.id,<Face agent={a} size={36} working={working.has(a.id)}/>,a.name,(working.has(a.id)?'arbeitet gerade · ':'')+(last?glimpse(last,nameOf,agentName,me.id):jobOf(a).title)+(shared('agent:'+a.id)?' · fürs Team sichtbar':''),last?.created);})}
  </div>
  {people.length>0&&<div className="ui-block">
   <h2 className="ui-label">Mit Menschen</h2>
   {people.map(m=>{const last=lastOf(messagesOf(room.messages,{member:m.id}));
    return row(m.id,'member:'+m.id,<Face name={m.name} photo={photoOf(m,room.project.id)} size={36}/>,m.name,(last?glimpse(last,nameOf,agentName,me.id):'privat')+(shared('member:'+m.id)?' · fürs Team sichtbar':''),last?.created);})}
  </div>}
  {(room.teamChats?.length??0)>0&&<div className="ui-block">
   <h2 className="ui-label">Fürs Team sichtbar</h2>
   {room.teamChats!.map(c=>row(c.chat,c.chat,<TeamChatFace studio={studio} chat={c}/>,teamChatTitle(studio,c),c.excerpt,c.last))}
  </div>}
  <div className="ui-block">
   <h2 className="ui-label">Aufgaben</h2>
   {tasks.length===0&&<p className="ui-muted">Noch keine offenen Aufgaben.</p>}
   {tasks.map(t=>{const s=taskState(t);return <button key={t.id} className={'ui-row talk'+(route.task===t.id?' current':'')} onClick={()=>go({task:t.id,info:false})}>
    <span className={'ui-dot '+s.tone}/><span className="ui-row-text"><b>{t.title}</b><small>{s.label}</small></span>
    {latest.get(t.id)?<span className="ui-row-end"><small>{when(latest.get(t.id)!)}</small></span>:null}
   </button>;})}
   <button className="ui-link" onClick={()=>go({tab:'tasks',chat:'',task:'',info:false})}>Alle Aufgaben ›</button>
  </div>
  <div className="ui-block"><TeamExpand key={room.project.id} studio={studio}/></div>
 </nav>;
}
const tileOf=(title:string)=>{const colors=['#2f6f5e','#3b4a8c','#8c4a3b','#5e3b8c','#6f6a2f','#2f5f6f'];let h=0;for(const c of title)h=(h*31+c.charCodeAt(0))>>>0;return colors[h%colors.length];};
function glimpse(m:Message,nameOf:(id:string)=>string,agentName:(id:string)=>string,me:string){
 const who=m.senderAgent?agentName(m.senderAgent):m.author===me?'Du':nameOf(m.author);
 const one=m.body.replace(/\s+/g,' ').trim();
 return who+': '+(one.length>90?one.slice(0,88).trimEnd()+' …':one);
}

function teamChatTitle(studio:Studio,c:TeamChat){
 const person=(id:string)=>studio.room?.members.find(m=>m.id===id)?.name.split(' ')[0]??'Jemand';
 return c.kind==='agent'?person(c.member)+' mit '+((studio.room?.agents??[]).find(a=>a.id===c.peer)?.name??'Agent'):person(c.member)+' und '+person(c.peer);
}
function TeamChatFace({studio,chat}:{studio:Studio;chat:TeamChat}){
 const agent=chat.kind==='agent'?(studio.room?.agents??[]).find(a=>a.id===chat.peer)??null:null;
 const person=studio.room?.members.find(m=>m.id===chat.member);
 return agent?<Face agent={agent} size={36}/>:<Face name={person?.name??'?'} photo={photoOf(person,studio.room?.project.id)} size={36}/>;
}

/** A private chat of others that its people made readable for the team. Everyone else reads, nobody else writes. */
function TeamChatScreen({studio,chat}:{studio:Studio;chat:TeamChat|null}){
 const {room,go}=studio;
 const [state,setState]=useState<{messages:Message[];more:boolean}|null>(null),[error,setError]=useState('');
 const project=room!.project.id;
 useEffect(()=>{
  if(!chat)return;let alive=true;
  api<{messages:Message[];more:boolean}>('/api/room/chat?project='+q(project)+'&chat='+q(chat.chat)).then(r=>{if(alive){setState(r);setError('');}}).catch(e=>{if(alive)setError((e as Error).message);});
  return()=>{alive=false;};
 },[chat,project,room]);
 if(!chat)return <section className="ui-screen">
  <Bar onBack={()=>go({chat:''})} title="Gespräch"/>
  <div className="ui-hello"><p>Dieses Gespräch ist wieder privat.</p><button className="ui-btn" onClick={()=>go({chat:''})}>Zum Projektchat</button></div>
 </section>;
 return <section className="ui-screen">
  <Bar onBack={()=>go({chat:''})} title={teamChatTitle(studio,chat)} sub="fürs Team sichtbar · nur lesen" end={<TeamChatFace studio={studio} chat={chat}/>}/>
  <ErrorLine text={error}/>
  {state?<Chat studio={studio} place={{kind:'team',chat:chat.chat,messages:state.messages,more:state.more}} key={chat.chat}/>:<div className="ui-loading" role="status">Gespräch wird geladen …</div>}
 </section>;
}

/** "Privat" or "fürs Team sichtbar": each person decides for their own chats; between two people both must agree. */
function Visibility({studio,chat,other}:{studio:Studio;chat:string;other?:string}){
 const {room}=studio;
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const state=room?.sharing?.[chat]??{mine:false,theirs:false,shared:false};
 async function set(shared:boolean){setBusy(true);setError('');try{await api('/api/room',{action:'chat-visibility',project:room!.project.id,chat,shared});await studio.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const person=!!other;
 const text=state.shared?(person?'Fürs Team sichtbar: ihr beide habt zugestimmt. Alle im Projekt können mitlesen.':'Fürs Team sichtbar: alle im Projekt können mitlesen.')
  :person&&state.mine?`Du hast zugestimmt. Fürs Team sichtbar, sobald auch ${other} zustimmt.`
  :person&&state.theirs?`${other} möchte dieses Gespräch fürs Team sichtbar machen.`
  :person?'Privat: nur ihr zwei.':'Privat: nur du liest hier.';
 const action=state.shared||state.mine?{label:state.shared?'Wieder privat':'Zurücknehmen',on:false}:{label:person&&state.theirs?'Zustimmen':'Fürs Team sichtbar machen',on:true};
 return <div className={'ui-visibility'+(state.shared?' shared':'')}>
  <span>{text}</span>
  <button className="ui-link" disabled={busy} onClick={()=>void set(action.on)}>{action.label}</button>
  <ErrorLine text={error}/>
 </div>;
}
