import {useState} from 'react';
import {ChevronRight} from 'lucide-react';
import type {Resource,RoomMember,RoomState,TeamEvent,TeamJob,TeamTask} from './room-model';
import {nextStep,groupEvents,when,runningLabels,type Step,type TaskPane} from './project-overview-model';
import './project-overview.css';
export type {TaskPane};

export default function ProjectOverview({room,tasks,events,active,members,resources,userId,onOpenTask,onTab}:{room:RoomState;tasks:TeamTask[];events:TeamEvent[];active:TeamJob[];members:RoomMember[];resources:Resource[];userId:string;onOpenTask:(task:TeamTask,pane?:TaskPane)=>void;onTab:(tab:'talk'|'connect')=>void}){
 const [all,setAll]=useState(false);
 const names=new Map(members.map(m=>[m.id,m.name])),titles=new Map(tasks.map(t=>[t.id,t.title])),byId=new Map(tasks.map(t=>[t.id,t]));
 const open=tasks.filter(t=>t.status!=='done'&&!t.contract.cancelled).map(t=>({task:t,step:nextStep(t,userId,names)}));
 const mine=open.filter(o=>o.step.mine),others=open.filter(o=>!o.step.mine);
 const runs=room.runs.filter(r=>r.status==='queued'||r.status==='running').map(r=>({id:r.id,task:r.task,action:'codex',owner:r.owner}));
 const working=[...active.map(j=>({id:j.id,task:j.task,action:j.action,owner:j.owner})),...runs];
 const running=[...working.reduce((m,j)=>{const key=j.task+':'+j.action,g=m.get(key);if(g)g.count++;else m.set(key,{...j,count:1});return m;},new Map<string,{id:string;task:string|null;action:string;owner:string;count:number}>()).values()];
 const configured=resources.filter(r=>r.development?.some(p=>p.id===room.project.id)),online=configured.filter(r=>r.online);
 const groups=groupEvents(events,titles),shown=all?groups:groups.slice(0,5);
 const card=({task,step}:{task:TeamTask;step:Step},primary:boolean)=><article className={'po-task'+(primary?' primary':'')} key={task.id}>
  <button className="po-task-title" onClick={()=>onOpenTask(task)}><strong>{task.title}</strong><ChevronRight size={16} aria-hidden="true"/></button>
  <p className="po-meta">{task.contract.kind==='code'?'Codeaufgabe':'Analyse oder Absprache'}{task.assignee?' · '+(names.get(task.assignee)??'zugewiesen'):' · noch niemand zugewiesen'}</p>
  <p className="po-step"><span>{primary?'Nächster Schritt:':'Stand:'}</span> {step.text}</p>
  {primary&&<button className="rw-button lime" onClick={()=>onOpenTask(task,step.pane)}>{step.action}</button>}
 </article>;
 return <div className="project-overview">
  <ul className="po-state" aria-label="Zustand des Projekts">
   <li className={room.meta.repository?'ok':'warn'}>{room.meta.repository?'Repository verbunden':<button onClick={()=>onTab('connect')}>Kein Repository verbunden</button>}</li>
   <li className={online.length?'ok':'warn'}>{online.length?(online.length===1?online[0].name+' bereit':online.length+' Rechner bereit'):<button onClick={()=>onTab('connect')}>{configured.length?'Eingerichteter Rechner offline':'Noch kein Rechner eingerichtet'}</button>}</li>
   <li>{open.length===1?'1 offene Aufgabe':open.length+' offene Aufgaben'}</li>
  </ul>
  <div className="po-columns">
   <div>
    <section aria-labelledby="po-mine"><h2 id="po-mine">Jetzt dran – bei dir <span>{mine.length}</span></h2>
     {mine.map(o=>card(o,true))}
     {!mine.length&&<p className="po-empty">{open.length?'Gerade liegt nichts bei dir.':'Keine offenen Aufgaben. Im Projektgespräch könnt ihr die nächsten Schritte entwickeln.'}</p>}
     {!open.length&&<button className="rw-button subtle" onClick={()=>onTab('talk')}>Projektgespräch öffnen</button>}
    </section>
    <section aria-labelledby="po-running"><h2 id="po-running">Läuft gerade <span>{running.length}</span></h2>
     {running.map(j=><p className="po-running" key={j.id}><span className="po-pulse" aria-hidden="true"/>{runningLabels[j.action]??'Auftrag läuft'}{j.count>1?' ('+j.count+')':''}{j.task&&titles.get(j.task)?<small>{titles.get(j.task)}</small>:null}</p>)}
     {!running.length&&<p className="po-empty">Keine KI-Aufträge, Tests oder Vorschauen aktiv.</p>}
    </section>
    <section aria-labelledby="po-others"><h2 id="po-others">Wartet auf andere <span>{others.length}</span></h2>
     {others.map(o=>card(o,false))}
     {!others.length&&<p className="po-empty">Niemand muss gerade etwas für dich erledigen.</p>}
    </section>
   </div>
   <section className="po-history" aria-labelledby="po-history"><h2 id="po-history">Zuletzt passiert</h2>
    <ol>{shown.map(g=>{const task=g.task?byId.get(g.task):undefined;const body=<><strong>{g.body}</strong><small>{[task?.title,names.get(g.actor)].filter(Boolean).join(' · ')}</small><time dateTime={new Date(g.latest).toISOString()}>{when(g.latest)}</time></>;
     return <li key={g.id}>{task?<button onClick={()=>onOpenTask(task)}>{body}</button>:g.kind==='message'?<button onClick={()=>onTab('talk')}>{body}</button>:<div>{body}</div>}</li>;})}</ol>
    {!groups.length&&<p className="po-empty">Was im Projekt passiert, erscheint hier.</p>}
    {groups.length>5&&<button className="rw-button subtle" aria-expanded={all} onClick={()=>setAll(!all)}>{all?'Weniger anzeigen':'Ganzen Verlauf anzeigen ('+groups.length+')'}</button>}
   </section>
  </div>
 </div>;
}
