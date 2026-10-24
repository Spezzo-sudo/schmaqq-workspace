'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowRight,CheckCheck,MessageSquare,Plus,RefreshCw,Users} from 'lucide-react';
import type {TeamWorkspace} from './team-workspaces';
import ChangeOverview,{checkLabel,type ChangeSummary} from './change-overview';
import {copyStateLabel} from './workflow-terms';
import TaskDiscussion,{type TaskComment} from './task-discussion';
import StatusSuggestionBox from './status-suggestion';
import {nextStep,statusSuggestion} from './workflow-step';
import {continueTasks,pendingReviews} from './navigation';
import {statuses} from './workspace-model';

type Task={id:string;project:string;title:string;description:string;status:string;priority:string;assignee:string|null;commentCount?:number};
type Detail={task:Task;comments:TaskComment[];workspaces:TeamWorkspace[];changes?:ChangeSummary[];reviews:{id:string;owner:string;ownerName:string;commit:string;state:string}[]};
type Props={userId:string;projects:{id:string;title:string;description:string}[];members:{id:string;name:string}[];project:string;onProject:(id:string)=>void;onHelp:()=>void;onProjects:()=>void;onCreate:()=>void;onDevelop:(task:Task,review?:string)=>void;onOpenTask:(task:Task)=>void;onChange:()=>Promise<void>;drafts:Record<string,string>;onDraft:(id:string,text:string)=>void};
export default function CollaborationBoard({userId,projects,members,project,onProject,onHelp,onProjects,onCreate,onDevelop,onOpenTask,onChange,drafts,onDraft}:Props){
 const [tasks,setTasks]=useState<Task[]>([]),[workspaces,setWorkspaces]=useState<TeamWorkspace[]>([]),[selected,setSelected]=useState(''),[detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false),[loaded,setLoaded]=useState(false),[mine,setMine]=useState(false),[showDone,setShowDone]=useState(false);
 const discussion=useRef<HTMLElement|null>(null);
 const [changes,setChanges]=useState<ChangeSummary[]>([]);
 // The panel mounts only after selection, so scroll once it exists.
 function openDiscussion(id:string){setSelected(id);if(matchMedia('(max-width:1100px)').matches)setTimeout(()=>discussion.current?.scrollIntoView({behavior:'smooth',block:'start'}));}
 const selection=useRef(selected);selection.current=selected;
 const person=(id:string|null)=>members.find(m=>m.id===id)?.name??'Noch nicht übernommen';
 useEffect(()=>{
  let alive=true;const controller=new AbortController();setLoaded(false);setSelected('');setDetail(null);setError('');
  const load=async()=>{try{
   const r=await fetch('/api/collaboration?project='+encodeURIComponent(project),{signal:controller.signal});const d=await r.json() as {tasks:Task[];workspaces:TeamWorkspace[];changes?:ChangeSummary[];error?:string};if(!r.ok)throw new Error(d.error);
   if(alive){setTasks(d.tasks);setWorkspaces(d.workspaces);setChanges(d.changes??[]);setLoaded(true);setError('');}
  }catch(e){if(alive&&!controller.signal.aborted)setError(e instanceof Error?e.message:'Projektstand nicht erreichbar.');}};
  const visible=()=>{if(!document.hidden)void load();};void load();const timer=setInterval(visible,5000);document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[project]);
 const loadDetail=useCallback(async(id:string,signal?:AbortSignal)=>{
  const r=await fetch('/api/collaboration/task?id='+encodeURIComponent(id),{signal});const d=await r.json() as Detail&{error?:string};if(!r.ok)throw new Error(d.error);return d;
 },[]);
 useEffect(()=>{
  if(!selected)return;let alive=true;const controller=new AbortController();setDetail(null);
  const load=async()=>{try{const d=await loadDetail(selected,controller.signal);if(alive)setDetail(d);}catch(e){if(alive&&!controller.signal.aborted)setError(e instanceof Error?e.message:'Aufgabe nicht erreichbar.');}};
  const visible=()=>{if(!document.hidden)void load();};void load();const timer=setInterval(visible,5000);document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[selected,loadDetail]);
 async function mutate(action:'claim'|'release'|'status',task:Task,status?:string){
  if(pending)return;setPending(true);setError('');
  try{
   const r=await fetch('/api/collaboration/task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,task:task.id,...(action==='status'?{status}:{})})});const result=await r.json() as {error?:string};if(!r.ok)throw new Error(result.error);
   const next=await loadDetail(task.id);if(selection.current===task.id)setDetail(next);setTasks(previous=>previous.map(t=>t.id===task.id?{...next.task,commentCount:next.comments.length}:t));await onChange();
  }catch(e){setError(e instanceof Error?e.message:'Änderung fehlgeschlagen.');}finally{setPending(false);}
 }
 const openCopies=workspaces.filter(w=>!w.archived),visibleTasks=tasks.filter(t=>(!mine||t.assignee===userId)&&(showDone||t.status!=='done'));
 const current=projects.find(p=>p.id===project);
 const mineOpen=continueTasks(tasks,userId);
 const waitingReviews=pendingReviews(tasks,workspaces,changes,userId);
 function continueStep(t:Task){
  const copy=openCopies.find(w=>w.taskId===t.id&&w.owner===userId);
  if(!copy)return 'Arbeitskopie für diese Aufgabe erstellen.';
  const change=changes.find(c=>c.workspace===copy.id);
  return nextStep({copy:{status:copy.status,own:true,online:Date.now()-copy.seen<30000,revoked:!!copy.revoked,archived:!!copy.archived},
   evidence:{check:change?.check,preview:change?.preview,review:change?.review,published:change?.publication?.published===true,observed:change?.currentRevision==='observed',observing:['queued','running','cancelling'].includes(change?.observationJob?.status??'')}}).title;
 }
 const teamSection=<section className="parallel-team" aria-label="Wer arbeitet woran?">{members.map(m=>{
    const assigned=tasks.filter(t=>t.assignee===m.id&&t.status!=='done'),copies=openCopies.filter(w=>w.owner===m.id);
    return <article className="panel teammate" key={m.id}><div className="section-title"><h2><Users size={18}/>{m.name}</h2><span className="label neutral">{m.id===userId?'Du':'Im Team'}</span></div><p>{assigned.length?`${assigned.length} offene Aufgabe${assigned.length===1?'':'n'}`:'Noch keine Aufgabe übernommen'}</p>{assigned.slice(0,3).map(t=><button className="teammate-task" key={t.id} onClick={()=>onOpenTask(t)}>{t.title}<ArrowRight size={14}/></button>)}{copies.map(w=><div className="shared-copy" key={w.id}><strong>{w.title}</strong><span>{w.scope||'Dateibereich noch nicht angegeben'} · {w.deviceName}</span><small>Arbeitskopie: {copyStateLabel(w.status)} · {w.revoked?'PC-Zugang widerrufen':Date.now()-w.seen<30000?'PC verbunden':'PC nicht verbunden'}</small></div>)}{!copies.length&&<small className="muted">Keine offene Arbeitskopie in diesem Projekt.</small>}</article>;
   })}</section>;
 return <>
  <div className="page-heading"><div><div className="eyebrow">EUER PROJEKT. EURE GEMEINSAME ARBEIT.</div><h1>Zusammen arbeiten<span className="green-dot">.</span></h1><p>Aufgaben aufteilen, parallel entwickeln und Entscheidungen direkt am Thema festhalten.</p></div><button className="button primary keep-label" onClick={onCreate}><Plus size={17}/> Neue Aufgabe</button></div>
  {loaded&&<section className="panel continue-card" aria-label="Weitermachen"><div className="section-title"><h2>Weitermachen</h2>{!!mineOpen.length&&<span className="muted">{mineOpen.length===1?'Deine offene Aufgabe':'Deine offenen Aufgaben'}</span>}</div>{mineOpen.length?<ul>{mineOpen.map(t=><li key={t.id}><div><strong>{t.title}</strong><small>{projects.find(p=>p.id===t.project)?.title??'Projekt'} · {statuses.find(s=>s[0]===t.status)?.[1]??t.status}</small><span>Nächster Schritt: {continueStep(t)}</span></div><button className="button primary" onClick={()=>onOpenTask(t)}>Weiterarbeiten <ArrowRight size={15}/></button></li>)}</ul>:<p className="muted">Du hast gerade keine eigene offene Aufgabe. Übernimm unten eine Aufgabe oder lege mit „Neue Aufgabe“ eine an.</p>}{!!waitingReviews.length&&<section aria-label="Wartende Teamprüfungen"><h3>Prüfung wartet auf dich</h3><ul>{waitingReviews.map(item=><li key={item.review}><div><strong>{item.task.title}</strong><small>{projects.find(p=>p.id===item.task.project)?.title}</small><span>Eine andere Person hat einen aktuellen Stand zur Prüfung bereitgestellt.</span></div><button className="button primary" onClick={()=>onDevelop(item.task,item.review)}>Prüfen <ArrowRight size={15}/></button></li>)}</ul></section>}</section>}
  <section className="panel start-orientation"><div><h2>{project==='all'?'Was möchtest du heute machen?':'An diesem Projekt arbeiten'}</h2><p>Öffne eine Aufgabe: Dort bleiben Bearbeitung, Gespräch, Vorschau und Prüfung zusammen.</p></div><div className="dev-buttons"><button className="button" onClick={onCreate}>Neue Aufgabe beschreiben</button>{project==='all'&&<button className="button" onClick={onProjects}>Projekte ansehen</button>}<button className="text-button" onClick={onHelp}>So funktioniert Studio →</button></div></section>
  <section className="panel project-context"><label>Gemeinsames Projekt<select aria-label="Gemeinsames Projekt" value={project} onChange={e=>onProject(e.target.value)}><option value="all">Alle Projekte</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><div><h2>{current?.title??'Eure Projekte im Überblick'}</h2><p>{current?.description||'Wählt ein Projekt, um Aufgaben, Diskussionen und Arbeitskopien gemeinsam zu überblicken.'}</p></div></section>
  {error&&<p className="form-error" role="alert">{error} Der angezeigte Stand kann veraltet sein.</p>}
  {!loaded?<p role="status">Gemeinsamer Projektstand wird geladen …</p>:<>
   <div className="section-title collaboration-toolbar"><h2>Gemeinsame Aufgaben <span>{tasks.length}</span></h2><div><label><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/> Nur meine</label><label><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/> Erledigte zeigen</label></div></div>
   <div className={`collaboration-layout${selected?'':' single'}`}><div className="collaboration-tasks">{!visibleTasks.length&&<section className="panel empty-inline"><h2>{tasks.length?'Keine Aufgaben für diese Auswahl':'Womit wollt ihr anfangen?'}</h2><p>Legt konkrete Aufgaben an. Jeder kann eine Aufgabe übernehmen und unabhängig daran arbeiten.</p></section>}{visibleTasks.map(t=>{
    const taskCopies=openCopies.filter(w=>w.taskId===t.id),copy=taskCopies[0],change=changes.find(c=>c.workspace===copy?.id),isSelected=selected===t.id;
    return <article className={`panel collaboration-task ${isSelected?'selected':''}`} key={t.id}><div className="task-top"><span className="label neutral">{statuses.find(s=>s[0]===t.status)?.[1]??t.status}</span><span className="task-owner">{person(t.assignee)}</span></div><button className="task-discussion-link" onClick={()=>onOpenTask(t)}><h3>{t.title}</h3></button><p>{t.description||'Beschreibung und Anforderungen könnt ihr gemeinsam besprechen.'}</p>{copy&&<p className="task-copy-note">{taskCopies.length} Arbeitskopie{taskCopies.length===1?'':'n'} · {copy.scope||copy.title}<br/>{change?checkLabel(change):'Noch kein Testnachweis'} · Aufgabe öffnen für Details</p>}<div className="collaboration-task-actions"><button className="button" onClick={()=>openDiscussion(t.id)}><MessageSquare size={15}/>Diskussion ({t.commentCount??0})</button>{!t.assignee&&t.status!=='done'&&<button className="button primary" disabled={pending} onClick={()=>{openDiscussion(t.id);void mutate('claim',t);}}>Aufgabe übernehmen</button>}{t.assignee===userId&&t.status!=='done'?<button className="button primary" onClick={()=>onOpenTask(t)}>Weiterarbeiten <ArrowRight size={15}/></button>:<button className="button" onClick={()=>onOpenTask(t)}>Arbeitsplatz öffnen</button>}</div></article>;
   })}</div>
   {/* The discussion panel only takes space once a task is chosen. */}{selected&&<section ref={discussion} className="panel task-discussion" aria-label="Aufgabe besprechen">{!detail||detail.task.id!==selected?<p role="status">Aufgabe wird geladen …</p>:<><div className="section-title"><h2>{detail.task.title}</h2><button className="icon-button" aria-label="Aufgabe aktualisieren" disabled={pending} onClick={async()=>{try{setDetail(await loadDetail(selected));}catch{setError('Aufgabe konnte nicht aktualisiert werden.');}}}><RefreshCw size={17}/></button></div><p className="discussion-description">{detail.task.description||'Noch keine Beschreibung vorhanden.'}</p><div className="discussion-owner"><span>Zuständig: <strong>{person(detail.task.assignee)}</strong></span><label>Status<select aria-label="Status der Aufgabe" value={detail.task.status} disabled={pending} onChange={e=>mutate('status',detail.task,e.target.value)}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div><section className="task-change-overviews" aria-label="Änderungen und Nachweise"><h3>Was wurde gemacht und geprüft?</h3><p className="muted">{detail.workspaces.length?'Nachweise pro Arbeitskopie. Aufgabenstatus, Prüfung und Veröffentlichung sind getrennte Schritte.':'Noch keine Arbeitskopie verknüpft. Hier erscheinen eure Änderungen, Tests und Prüfstände, sobald ihr die Aufgabe bearbeitet.'}</p>{detail.workspaces.map(w=><ChangeOverview key={w.id} copy={w} change={detail.changes?.find(c=>c.workspace===w.id)} userId={userId} onReview={id=>onDevelop(detail.task,id)} onWork={()=>onOpenTask(detail.task)} onChange={async()=>{const next=await loadDetail(detail.task.id);if(selection.current===next.task.id)setDetail(next);}}/>)}{(()=>{const own=detail.workspaces.find(w=>w.owner===userId&&!w.archived);return <StatusSuggestionBox suggestion={statusSuggestion({taskStatus:detail.task.status,own:!!own,review:own?detail.changes?.find(c=>c.workspace===own.id)?.review:null})} disabled={pending} onApply={status=>mutate('status',detail.task,status)}/>;})()}</section>{detail.task.assignee===userId&&detail.task.status!=='done'&&<div className="collaboration-task-actions"><button className="button primary" onClick={()=>onOpenTask(detail.task)}>Im Arbeitsplatz weiterarbeiten <ArrowRight size={15}/></button>{!detail.workspaces.length&&<button className="button" disabled={pending} onClick={()=>mutate('release',detail.task)}>Aufgabe wieder freigeben</button>}</div>}{!!detail.reviews.length&&<details className="task-review-links"><summary>Alle Prüfstände ({detail.reviews.length})</summary>{detail.reviews.map(r=><div className="shared-copy" key={r.id}><strong>{r.ownerName} · Stand {r.commit.slice(0,8)}</strong><span>{r.state==='approved'?'Von zweiter Person freigegeben':r.state==='changes_requested'?'Änderungen angefordert':'Wartet auf die zweite Prüfung'}</span><button className="button" onClick={()=>onDevelop(detail.task,r.id)}>Prüfstand ansehen <ArrowRight size={14}/></button></div>)}</details>}<TaskDiscussion taskId={detail.task.id} comments={detail.comments} draft={drafts[detail.task.id]??''} onDraft={text=>onDraft(detail.task.id,text)} disabled={pending} onPosted={async()=>{const next=await loadDetail(detail.task.id);if(selection.current===next.task.id)setDetail(next);setTasks(previous=>previous.map(t=>t.id===next.task.id?{...next.task,commentCount:next.comments.length}:t));await onChange();}}/></>}</section>}</div>
   <h2 className="team-heading">Wer arbeitet woran?</h2>{teamSection}
   <p className="parallel-explanation"><CheckCheck size={17}/> Jede Person arbeitet in ihrer eigenen Arbeitskopie. Bevor Änderungen zusammengeführt werden, sieht sie sich eine zweite Person an. Wenn zwei Personen dieselbe Stelle ändern, stimmt euch kurz ab.</p>
  </>}
 </>;
}
