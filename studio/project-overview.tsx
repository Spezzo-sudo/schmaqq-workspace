import {useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {agentRoleLabels,type Resource,type RoomMember,type RoomState,type TeamEvent,type TeamJob,type TeamTask} from './room-model';
import {groupEvents,when,runningLabels,humanEvent,type TaskPane} from './project-overview-model';
import {taskSummary} from './task-next-step';
import {AgentAvatar} from './agent-avatar';
import ProjectReady from './project-ready';
import './project-overview.css';
export type {TaskPane};

export default function ProjectOverview({room,tasks,events,active,members,resources,userId,onOpenTask,onTab,onRepository,onRefresh}:{room:RoomState;tasks:TeamTask[];events:TeamEvent[];active:TeamJob[];members:RoomMember[];resources:Resource[];userId:string;onOpenTask:(task:TeamTask,pane?:TaskPane)=>void;onTab:(tab:'talk'|'connect'|'tasks')=>void;onRepository:()=>void;onRefresh:()=>Promise<void>}){
 const [all,setAll]=useState(false);
 const names=new Map(members.map(m=>[m.id,m.name])),name=(id:string)=>names.get(id)??'Jemand',titles=new Map(tasks.map(t=>[t.id,t.title])),byId=new Map(tasks.map(t=>[t.id,t]));
 const open=tasks.filter(t=>t.status!=='done'&&!t.contract.cancelled).map(task=>({task,summary:taskSummary(task,userId,name)}));
 const mine=open.filter(o=>o.summary.group==='mine'),rest=open.filter(o=>o.summary.group!=='mine');
 const activeAgents=(room.agents??[]).filter(a=>a.active!==false);
 // Only what the Werkstatt does for people; file openings and listings are not "work".
 const working=[...active.filter(j=>runningLabels[j.action]).map(j=>({id:j.id,task:j.task,action:j.action})),...room.runs.filter(r=>r.status==='queued'||r.status==='running').map(r=>({id:r.id,task:r.task,action:'codex'}))];
 const human=events.map(e=>({...e,body:humanEvent(e.kind,e.body)})).filter((e):e is TeamEvent=>!!e.body);
 const groups=groupEvents(human,titles),shown=all?groups:groups.slice(0,5);
 const row=({task,summary}:{task:TeamTask;summary:{text:string}})=><li key={task.id}><button className="team-work-card" onClick={()=>onOpenTask(task)}><span><strong>{task.title}</strong><small>{summary.text}</small></span><ChevronRight size={17} aria-hidden="true"/></button></li>;
 return <div className="project-overview">
  <ProjectReady room={room} resources={resources} members={members} userId={userId} onRepository={onRepository} onRefresh={onRefresh}/>
  <section aria-labelledby="po-mine"><h2 id="po-mine">Bei dir</h2>
   {mine.length?<ul className="po-list">{mine.map(row)}</ul>:<p className="po-empty">{open.length?'Gerade liegt nichts bei dir.':'Noch keine offenen Aufgaben. Leg mit „Aufgabe“ oben die erste an.'}</p>}
  </section>
  {!!working.length&&<section aria-labelledby="po-running"><h2 id="po-running">Läuft gerade</h2>
   {working.map(j=><p className="po-running" key={j.id}><span className="po-pulse" aria-hidden="true"/>{runningLabels[j.action]}{j.task&&titles.get(j.task)?<small>{titles.get(j.task)}</small>:null}</p>)}
  </section>}
  {!!rest.length&&<section aria-labelledby="po-others"><h2 id="po-others">Bei den anderen</h2><ul className="po-list">{rest.map(row)}</ul></section>}
  {!!activeAgents.length&&<section aria-labelledby="po-agents"><h2 id="po-agents">KI-Teammitglieder im Projekt</h2>
   <div className="rw-po-agent-strip">
    {activeAgents.map(a=><button key={a.id} type="button" className="rw-po-agent-chip" onClick={()=>onTab('talk')}>
     <AgentAvatar agent={a} size="md"/>
     <span><strong>{a.name}</strong><small>{agentRoleLabels[a.role]??a.role} · {a.model}</small></span>
    </button>)}
   </div>
  </section>}
  {!!groups.length&&<section className="po-history" aria-labelledby="po-history"><h2 id="po-history">Zuletzt passiert</h2>
   <ol>{shown.map(g=>{const task=g.task?byId.get(g.task):undefined;const body=<><strong>{g.body}</strong><small>{[names.get(g.actor),task?.title].filter(Boolean).join(' · ')}</small><time dateTime={new Date(g.latest).toISOString()}>{when(g.latest)}</time></>;
    return <li key={g.id}>{task?<button onClick={()=>onOpenTask(task)}>{body}</button>:g.kind==='message'?<button onClick={()=>onTab('talk')}>{body}</button>:<div>{body}</div>}</li>;})}</ol>
   {groups.length>5&&<button className="rw-button subtle" aria-expanded={all} onClick={()=>setAll(!all)}>{all?'Weniger anzeigen':'Mehr anzeigen'}</button>}
  </section>}
 </div>;
}
