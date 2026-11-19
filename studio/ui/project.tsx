import {useId,useState} from 'react';
import type {Studio} from './app';
import {api,newId,plural,type TeamTask} from './api';
import {Face,photoOf} from './avatar';
import {Chat} from './chat';
import {activeAgents,jobOf,runActive,taskState,teamOrder} from './model';
import {Bar,Dialog,ErrorLine,Field,Info,Plus} from './parts';
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
  <Bar onBack={()=>go({chat:''})} title={chatAgent.name} sub={jobOf(chatAgent).title+' · privat'} onTitle={()=>setProfile(chatAgent.id)}
   end={<button className="ui-icon-face" aria-label={'Profil von '+chatAgent.name} onClick={()=>setProfile(chatAgent.id)}><Face agent={chatAgent} size={34} working={working.has(chatAgent.id)}/></button>}/>
  <Chat studio={studio} place={{kind:'agent',agent:chatAgent}} key={chatAgent.id}/>
  {profile&&<ProfileDialog studio={studio} agentId={profile} onClose={()=>setProfile('')}/>}
 </section>;
 if(chatMember)return <section className="ui-screen">
  <Bar onBack={()=>go({chat:''})} title={chatMember.name} sub="privat" end={<Face name={chatMember.name} photo={photoOf(chatMember,room.project.id)} size={34}/>}/>
  <Chat studio={studio} place={{kind:'member',member:chatMember}} key={chatMember.id}/>
 </section>;
 return <section className="ui-screen ui-project">
  <Bar onBack={desktop?undefined:()=>go({page:'start',project:''})} title={room.project.title}
   sub={teamExpanded?plural(people.length,'Mensch','Menschen')+' · '+plural(agents.length,'Agent','Agenten'):undefined} onTitle={()=>go({info:true,task:''})}
   end={<button className="ui-icon" aria-label="Projektinfo" onClick={()=>go({info:true,task:''})}><Info/></button>}/>
  <div className={'ui-team-panel'+(teamExpanded?'':' compact')}>
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
  </div>
  <div className="ui-tabs" role="tablist">
   <button role="tab" aria-selected={route.tab==='chat'} onClick={()=>go({tab:'chat'},true)}>Chat</button>
   <button role="tab" aria-selected={route.tab==='tasks'} onClick={()=>go({tab:'tasks'},true)}>Aufgaben{openCount(studio)>0&&<b className="ui-count">{openCount(studio)}</b>}</button>
  </div>
  {route.tab==='tasks'?<TaskList studio={studio}/>:<Chat studio={studio} place={{kind:'group'}} key={room.project.id}/>}
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
