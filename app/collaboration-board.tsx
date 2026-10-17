'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowRight,CheckCheck,MessageSquare,Plus,RefreshCw,Users} from 'lucide-react';
import type {TeamWorkspace} from './team-workspaces';

type Task={id:string;project:string;title:string;description:string;status:string;priority:string;assignee:string|null;commentCount?:number};
type Comment={id:string;author:string;authorName:string;body:string;created:number};
type Detail={task:Task;comments:Comment[];workspaces:TeamWorkspace[];reviews:{id:string;owner:string;ownerName:string;commit:string;state:string}[]};
type Props={userId:string;projects:{id:string;title:string;description:string}[];members:{id:string;name:string}[];project:string;onProject:(id:string)=>void;onCreate:()=>void;onDevelop:(task:Task,review?:string)=>void;onChange:()=>Promise<void>;drafts:Record<string,string>;onDraft:(id:string,text:string)=>void};
const statuses=[['todo','Noch offen'],['doing','In Arbeit'],['review','Zur Prüfung'],['done','Erledigt']];
export default function CollaborationBoard({userId,projects,members,project,onProject,onCreate,onDevelop,onChange,drafts,onDraft}:Props){
 const [tasks,setTasks]=useState<Task[]>([]),[workspaces,setWorkspaces]=useState<TeamWorkspace[]>([]),[selected,setSelected]=useState(''),[detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[pending,setPending]=useState(false),[loaded,setLoaded]=useState(false),[mine,setMine]=useState(false),[showDone,setShowDone]=useState(false);
 const discussion=useRef<HTMLElement|null>(null);
 function openDiscussion(id:string){setSelected(id);if(matchMedia('(max-width:1100px)').matches)discussion.current?.scrollIntoView({behavior:'smooth',block:'start'});}
 const selection=useRef(selected);selection.current=selected;
 const commentId=useRef({task:'',body:'',id:''});
 const person=(id:string|null)=>members.find(m=>m.id===id)?.name??'Noch nicht übernommen';
 useEffect(()=>{
  let alive=true;const controller=new AbortController();setLoaded(false);setSelected('');setDetail(null);setError('');
  const load=async()=>{try{
   const r=await fetch('/api/collaboration?project='+encodeURIComponent(project),{signal:controller.signal});const d=await r.json() as {tasks:Task[];workspaces:TeamWorkspace[];error?:string};if(!r.ok)throw new Error(d.error);
   if(alive){setTasks(d.tasks);setWorkspaces(d.workspaces);setLoaded(true);setError('');}
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
 async function mutate(action:'claim'|'release'|'comment'|'status',task:Task,status?:string){
  if(pending)return;setPending(true);setError('');const body=(drafts[task.id]??'').trim();
  if(action==='comment'&&(commentId.current.task!==task.id||commentId.current.body!==body))commentId.current={task:task.id,body,id:crypto.randomUUID()};
  try{
   const r=await fetch('/api/collaboration/task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,task:task.id,...(action==='status'?{status}:{}),...(action==='comment'?{id:commentId.current.id,body}:{})})});const result=await r.json() as {error?:string};if(!r.ok)throw new Error(result.error);
   if(action==='comment')onDraft(task.id,'');
   const next=await loadDetail(task.id);if(selection.current===task.id)setDetail(next);setTasks(previous=>previous.map(t=>t.id===task.id?{...next.task,commentCount:next.comments.length}:t));await onChange();
  }catch(e){setError(e instanceof Error?e.message:'Änderung fehlgeschlagen.');}finally{setPending(false);}
 }
 const openCopies=workspaces.filter(w=>!w.archived),visibleTasks=tasks.filter(t=>(!mine||t.assignee===userId)&&(showDone||t.status!=='done'));
 const current=projects.find(p=>p.id===project);
 return <>
  <div className="page-heading"><div><div className="eyebrow">EUER PROJEKT. EURE GEMEINSAME ARBEIT.</div><h1>Zusammen arbeiten<span className="green-dot">.</span></h1><p>Aufgaben aufteilen, parallel entwickeln und Entscheidungen direkt am Thema festhalten.</p></div><button className="button primary" onClick={onCreate}><Plus size={17}/> Neue Aufgabe</button></div>
  <section className="panel project-context"><label>Gemeinsames Projekt<select aria-label="Gemeinsames Projekt" value={project} onChange={e=>onProject(e.target.value)}><option value="all">Alle Projekte</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><div><h2>{current?.title??'Eure Projekte im Überblick'}</h2><p>{current?.description||'Wählt ein Projekt, um Aufgaben, Diskussionen und Arbeitsbereiche gemeinsam zu überblicken.'}</p></div></section>
  {error&&<p className="form-error" role="alert">{error} Der angezeigte Stand kann veraltet sein.</p>}
  {!loaded?<p role="status">Gemeinsamer Projektstand wird geladen …</p>:<>
   <section className="parallel-team" aria-label="Wer arbeitet woran?">{members.map(m=>{
    const assigned=tasks.filter(t=>t.assignee===m.id&&t.status!=='done'),copies=openCopies.filter(w=>w.owner===m.id);
    return <article className="panel teammate" key={m.id}><div className="section-title"><h2><Users size={18}/>{m.name}</h2><span className="label neutral">{m.id===userId?'Du':'Im Team'}</span></div><p>{assigned.length?`${assigned.length} offene Aufgabe${assigned.length===1?'':'n'}`:'Noch keine Aufgabe übernommen'}</p>{assigned.slice(0,3).map(t=><button className="teammate-task" key={t.id} onClick={()=>openDiscussion(t.id)}>{t.title}<ArrowRight size={14}/></button>)}{copies.map(w=><div className="shared-copy" key={w.id}><strong>{w.title}</strong><span>{w.scope||'Dateibereich noch nicht angegeben'} · {w.deviceName}</span><small>{w.status==='completed'?'Arbeitskopie bereit':w.status==='interrupted'?'Erstellung unterbrochen':'Arbeitskopie wird vorbereitet'} · {w.revoked?'PC-Zugang widerrufen':Date.now()-w.seen<30000?'PC verbunden':'PC nicht verbunden'}</small></div>)}{!copies.length&&<small className="muted">Keine offene Arbeitskopie in diesem Projekt.</small>}</article>;
   })}</section>
   <div className="section-title collaboration-toolbar"><h2>Gemeinsame Aufgaben <span>{tasks.length}</span></h2><div><label><input type="checkbox" checked={mine} onChange={e=>setMine(e.target.checked)}/> Nur meine</label><label><input type="checkbox" checked={showDone} onChange={e=>setShowDone(e.target.checked)}/> Erledigte zeigen</label></div></div>
   <div className="collaboration-layout"><div className="collaboration-tasks">{!visibleTasks.length&&<section className="panel empty-inline"><h2>{tasks.length?'Keine Aufgaben für diese Auswahl':'Womit wollt ihr anfangen?'}</h2><p>Legt konkrete Aufgaben an. Jeder kann eine Aufgabe übernehmen und unabhängig daran arbeiten.</p></section>}{visibleTasks.map(t=>{
    const copy=openCopies.find(w=>w.taskId===t.id),isSelected=selected===t.id;
    return <article className={`panel collaboration-task ${isSelected?'selected':''}`} key={t.id}><div className="task-top"><span className="label neutral">{statuses.find(s=>s[0]===t.status)?.[1]??t.status}</span><span className="task-owner">{person(t.assignee)}</span></div><button className="task-discussion-link" aria-expanded={isSelected} onClick={()=>openDiscussion(t.id)}><h3>{t.title}</h3></button><p>{t.description||'Beschreibung und Anforderungen könnt ihr gemeinsam besprechen.'}</p>{copy&&<p className="task-copy-note">Arbeitsbereich: {copy.scope||copy.title}</p>}<div className="collaboration-task-actions"><button className="button" onClick={()=>openDiscussion(t.id)}><MessageSquare size={15}/>{t.commentCount??0} Kommentare · Öffnen</button>{!t.assignee&&t.status!=='done'&&<button className="button primary" disabled={pending} onClick={()=>{openDiscussion(t.id);void mutate('claim',t);}}>Aufgabe übernehmen</button>}{t.assignee===userId&&t.status!=='done'&&<button className="button primary" onClick={()=>onDevelop(t)}>Weiterarbeiten <ArrowRight size={15}/></button>}</div></article>;
   })}</div>
   <section ref={discussion} className="panel task-discussion" aria-label="Aufgabe besprechen">{!selected?<div className="empty-inline"><MessageSquare size={28}/><h2>Hier bleibt euer Gespräch beim Thema.</h2><p>Öffne eine Aufgabe für Anforderungen, Ideen, Rückfragen und Entscheidungen. Gesendete Kommentare sind für euer Team sichtbar.</p></div>:!detail||detail.task.id!==selected?<p role="status">Aufgabe wird geladen …</p>:<><div className="section-title"><h2>{detail.task.title}</h2><button className="icon-button" aria-label="Aufgabe aktualisieren" disabled={pending} onClick={async()=>{try{setDetail(await loadDetail(selected));}catch{setError('Aufgabe konnte nicht aktualisiert werden.');}}}><RefreshCw size={17}/></button></div><p className="discussion-description">{detail.task.description||'Noch keine Beschreibung vorhanden.'}</p><div className="discussion-owner"><span>Zuständig: <strong>{person(detail.task.assignee)}</strong></span><label>Status<select aria-label="Status der Aufgabe" value={detail.task.status} disabled={pending} onChange={e=>mutate('status',detail.task,e.target.value)}>{statuses.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>{detail.workspaces.map(w=><div className="shared-copy" key={w.id}><strong>{w.ownerName} · {w.title}</strong><span>{w.scope||'Kein Dateibereich angegeben'}</span></div>)}{detail.task.assignee===userId&&detail.task.status!=='done'&&<div className="collaboration-task-actions"><button className="button primary" onClick={()=>onDevelop(detail.task)}>Eigene Arbeitskopie öffnen <ArrowRight size={15}/></button>{!detail.workspaces.length&&<button className="button" disabled={pending} onClick={()=>mutate('release',detail.task)}>Aufgabe wieder freigeben</button>}</div>}{!!detail.reviews.length&&<div className="task-review-links"><h3>Ergebnisse gemeinsam prüfen</h3>{detail.reviews.map(r=><div className="shared-copy" key={r.id}><strong>{r.ownerName} · Stand {r.commit.slice(0,8)}</strong><span>{r.state==='approved'?'Von zweiter Person freigegeben':r.state==='changes_requested'?'Änderungen angefordert':'Wartet auf die zweite Prüfung'}</span><button className="button" onClick={()=>onDevelop(detail.task,r.id)}>Prüfstand ansehen <ArrowRight size={14}/></button></div>)}</div>}<h3 className="discussion-heading">Ideen, Fragen & Entscheidungen</h3><div className="task-comments" aria-live="polite">{!detail.comments.length&&<p className="muted">Noch keine Kommentare. Was soll dein Kollege zu dieser Funktion wissen?</p>}{detail.comments.map(c=><article key={c.id}><div><strong>{c.authorName}</strong><time dateTime={new Date(c.created).toISOString()}>{new Date(c.created).toLocaleString('de-DE')}</time></div><p>{c.body}</p></article>)}</div><form onSubmit={e=>{e.preventDefault();void mutate('comment',detail.task);}}><label htmlFor="task-comment">Kommentar zur Aufgabe</label><textarea id="task-comment" disabled={pending} value={drafts[detail.task.id]??''} maxLength={4000} onChange={e=>onDraft(detail.task.id,e.target.value)} placeholder="Eine Idee, offene Frage oder Entscheidung …"/><p className="muted">Dein Entwurf bleibt beim Navigieren in diesem Tab erhalten. Mit Senden speicherst und teilst du ihn.</p><button className="button primary" disabled={pending||!(drafts[detail.task.id]??'').trim()}><MessageSquare size={15}/> Kommentar senden</button></form></>}</section></div>
   <p className="parallel-explanation"><CheckCheck size={17}/> Ihr arbeitet in getrennten Arbeitskopien desselben Projekts. Reservierte Bereiche helfen bei der Abstimmung. Änderungen werden anschliessend geprüft und zusammengeführt; inhaltliche Konflikte bleiben möglich.</p>
  </>}
 </>;
}
