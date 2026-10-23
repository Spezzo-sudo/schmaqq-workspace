'use client';
import {useCallback,useEffect,useState} from 'react';
import {ArrowLeft,ArrowRight,RefreshCw} from 'lucide-react';
import Development from './development';
import ChangeOverview,{type ChangeSummary} from './change-overview';
import TaskDiscussion,{type TaskComment} from './task-discussion';
import type {TeamWorkspace} from './team-workspaces';
import {nextStep,stepTab,taskProgress,taskStages,type NextStep} from './workflow-step';
import {statuses} from './workspace-model';

type Task={id:string;project:string;title:string;description:string;status:string;priority:string;assignee:string|null};
type Detail={task:Task;comments:TaskComment[];workspaces:TeamWorkspace[];changes?:ChangeSummary[];reviews:{id:string;owner:string;ownerName:string;commit:string;state:string}[]};
type Tab='edit'|'discussion'|'evidence'|'history';
type Props={userId:string;projects:{id:string;title:string;description:string}[];members:{id:string;name:string}[];projectId:string;taskId:string;canInvite:boolean;
 draft:string;onDraft:(text:string)=>void;onOverview:()=>void;onChanged:()=>Promise<void>};
const tabs:[Tab,string][]=[['edit','Bearbeiten'],['discussion','Diskussion'],['evidence','Nachweise'],['history','Verlauf']];

/** One task in one place: next step, own copy and editor, discussion, evidence and history. */
export default function TaskWorkspace({userId,projects,members,projectId,taskId,canInvite,draft,onDraft,onOverview,onChanged}:Props){
 const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[tab,setTab]=useState<Tab>('edit'),[review,setReview]=useState<string|undefined>();
 const load=useCallback(async()=>{try{const r=await fetch('/api/collaboration/task?id='+encodeURIComponent(taskId));const d=await r.json() as Detail&{error?:string};if(!r.ok)throw new Error(d.error??'Aufgabe nicht erreichbar.');setDetail(d);setError('');}catch(e){setError(e instanceof Error?e.message:'Aufgabe nicht erreichbar.');}},[taskId]);
 useEffect(()=>{setDetail(null);void load();const timer=setInterval(()=>{if(!document.hidden)void load();},5000);return()=>clearInterval(timer);},[load]);
 const task=detail?.task.id===taskId?detail.task:null;
 const own=detail?.workspaces.find(w=>w.owner===userId&&!w.archived),team=detail?.workspaces.find(w=>w.owner!==userId&&!w.archived),copy=own??team;
 const change=copy&&detail?.changes?.find(c=>c.workspace===copy.id);
 const person=(id:string|null)=>members.find(m=>m.id===id)?.name??'Noch nicht übernommen';
 const next:NextStep|null=!task?null:copy?nextStep({copy:{status:copy.status,own:copy.owner===userId,online:Date.now()-copy.seen<30000,revoked:!!copy.revoked,archived:!!copy.archived},
  evidence:{check:change?.check,preview:change?.preview,review:change?.review,published:change?.publication?.published===true,observed:change?.currentRevision==='observed',observing:['queued','running','cancelling'].includes(change?.observationJob?.status??'')}})
  :!task.assignee||task.assignee===userId?{stage:'copy',action:'create-copy',title:'Arbeitskopie für diese Aufgabe erstellen.',reason:'Unter „Bearbeiten“ legst du deine eigene Kopie an. Die Aufgabe wird dir dabei zugewiesen.',tone:'info',cautions:[]}
  :{stage:'copy',action:'none',title:'Die zuständige Person hat noch keine Arbeitskopie.',reason:'Fragen und Hinweise gehören in die Diskussion.',tone:'info',cautions:[]};
 const progress=next?taskProgress(next,!!copy&&copy.status==='completed'):0;
 function openReview(id:string){setReview(id);setTab('edit');}
 if(error&&!detail)return <section className="panel task-workspace-missing"><h1>Aufgabe nicht verfügbar</h1><p className="form-error" role="alert">{error}</p><button className="button" onClick={onOverview}><ArrowLeft size={15}/> Zur Projektübersicht</button></section>;
 return <div className="task-workspace">
  <button className="text-button back-to-project" onClick={onOverview}><ArrowLeft size={15}/> Projektübersicht</button>
  <header className="task-workspace-head">
   <p className="eyebrow">{projects.find(p=>p.id===projectId)?.title??'Projekt'} · AUFGABE</p>
   <h1>{task?.title??'Aufgabe wird geladen …'}</h1>
   {task&&<p className="task-workspace-meta">Zuständig: <strong>{person(task.assignee)}</strong> · Status: <strong>{statuses.find(s=>s[0]===task.status)?.[1]??task.status}</strong>{copy&&<> · Arbeitskopie: <strong>{copy.title}</strong> auf {copy.deviceName} · {copy.revoked?'PC-Zugang widerrufen':Date.now()-copy.seen<30000?'PC verbunden':'PC nicht verbunden'}</>}</p>}
   <ol className="task-progress" aria-label="Fortschritt der Aufgabe">{taskStages.map((label,index)=><li key={label} aria-current={index===progress?'step':undefined} className={index<progress?'reached':index===progress?'current':''}><span>{index<progress?'✓':index+1}</span>{label}</li>)}</ol>
   {next&&<div className={`task-next ${next.tone}`}><div><strong>Nächster Schritt:</strong> {next.title}<br/><small>{next.reason}</small>{next.cautions.map(text=><small key={text}><br/>{text}</small>)}</div>{stepTab(next.action)!==tab&&next.action!=='wait'&&<button className="button" onClick={()=>setTab(stepTab(next.action))}>{tabs.find(t=>t[0]===stepTab(next.action))?.[1]} öffnen <ArrowRight size={15}/></button>}</div>}
  </header>
  <div className="task-tabs" role="tablist" aria-label="Bereiche der Aufgabe">{tabs.map(([key,label])=><button key={key} role="tab" id={'task-tab-'+key} aria-selected={tab===key} aria-controls={'task-panel-'+key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}{key==='discussion'&&detail?` (${detail.comments.length})`:''}</button>)}</div>
  {error&&<p className="form-error" role="alert">{error} Der angezeigte Stand kann veraltet sein.</p>}
  {/* The editor stays mounted while other tabs are open, so drafts, results and polling keep running. */}
  <div role="tabpanel" id={(tab==='history'?'task-panel-history':'task-panel-edit')} aria-labelledby={'task-tab-'+(tab==='history'?'history':'edit')} hidden={tab!=='edit'&&tab!=='history'}>
   <Development key={review??'task'} mode="focused" panel={tab==='history'?'history':'edit'} projects={projects} userId={userId} canInvite={canInvite} initialProject={projectId} initialTask={taskId} initialReview={review} onProjectChange={()=>{}}/>
  </div>
  {tab==='discussion'&&<section role="tabpanel" id="task-panel-discussion" aria-labelledby="task-tab-discussion" className="panel task-discussion"><p className="discussion-description">{task?.description||'Noch keine Beschreibung vorhanden.'}</p>{task&&detail?<TaskDiscussion taskId={task.id} comments={detail.comments} draft={draft} onDraft={onDraft} onPosted={async()=>{await load();await onChanged();}}/>:<p role="status">Aufgabe wird geladen …</p>}</section>}
  {tab==='evidence'&&<section role="tabpanel" id="task-panel-evidence" aria-labelledby="task-tab-evidence" className="panel task-change-overviews"><div className="section-title"><h2>Was wurde gemacht und geprüft?</h2><button className="icon-button" aria-label="Nachweise aktualisieren" onClick={()=>void load()}><RefreshCw size={16}/></button></div>{!detail?<p role="status">Nachweise werden geladen …</p>:!detail.workspaces.length?<p className="muted">Noch keine Arbeitskopie verknüpft. Tests, Vorschauen und Prüfstände erscheinen hier, sobald jemand an der Aufgabe arbeitet.</p>:detail.workspaces.map(w=><ChangeOverview key={w.id} copy={w} change={detail.changes?.find(c=>c.workspace===w.id)} userId={userId} onReview={openReview} onWork={()=>setTab('edit')} onChange={load}/>)}{!!detail?.reviews.length&&<details className="task-review-links"><summary>Alle Prüfstände ({detail.reviews.length})</summary>{detail.reviews.map(r=><div className="shared-copy" key={r.id}><strong>{r.ownerName} · Stand {r.commit.slice(0,8)}</strong><span>{r.state==='approved'?'Von zweiter Person freigegeben':r.state==='changes_requested'?'Änderungen angefordert':'Wartet auf die zweite Prüfung'}</span><button className="button" onClick={()=>openReview(r.id)}>Prüfstand ansehen <ArrowRight size={14}/></button></div>)}</details>}</section>}
 </div>;
}
