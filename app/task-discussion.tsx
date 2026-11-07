'use client';
import {useRef,useState} from 'react';
import {MessageSquare} from 'lucide-react';

export type TaskComment={id:string;author:string;authorName:string;body:string;created:number};
type Props={taskId:string;comments:TaskComment[];draft:string;onDraft:(text:string)=>void;disabled?:boolean;onPosted:()=>Promise<void>};

/** Task comments with an idempotent send; shared by the project board and the task workspace. */
export default function TaskDiscussion({taskId,comments,draft,onDraft,disabled=false,onPosted}:Props){
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 // A retried send of the same text reuses its id, so the server stores it once.
 const sent=useRef({task:'',body:'',id:''});
 async function send(){
  const body=draft.trim();if(!body||pending)return;
  if(sent.current.task!==taskId||sent.current.body!==body)sent.current={task:taskId,body,id:crypto.randomUUID()};
  setPending(true);setError('');
  try{
   const r=await fetch('/api/collaboration/task',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'comment',task:taskId,id:sent.current.id,body})});const result=await r.json() as {error?:string};if(!r.ok)throw new Error(result.error);
   onDraft('');await onPosted();
  }catch(e){setError(e instanceof Error?e.message:'Kommentar konnte nicht gesendet werden.');}finally{setPending(false);}
 }
 const busy=pending||disabled;
 return <>
  <h3 className="discussion-heading">Ideen, Fragen & Entscheidungen</h3>
  <div className="task-comments" aria-live="polite">{!comments.length&&<p className="muted">Noch keine Kommentare. Was soll dein Kollege zu dieser Funktion wissen?</p>}{comments.map(c=><article key={c.id}><div><strong>{c.authorName}</strong><time dateTime={new Date(c.created).toISOString()}>{new Date(c.created).toLocaleString('de-DE')}</time></div><p>{c.body}</p></article>)}</div>
  {error&&<p className="form-error" role="alert">{error}</p>}
  <form onSubmit={e=>{e.preventDefault();void send();}}><label htmlFor={'task-comment-'+taskId}>Kommentar zur Aufgabe</label><textarea id={'task-comment-'+taskId} disabled={busy} value={draft} maxLength={4000} onChange={e=>onDraft(e.target.value)} placeholder="Eine Idee, offene Frage oder Entscheidung …"/><p className="muted">Dein Entwurf bleibt beim Navigieren in diesem Tab erhalten. Mit Senden speicherst und teilst du ihn.</p><button className="button primary" disabled={busy||!draft.trim()}><MessageSquare size={15}/> Kommentar senden</button></form>
 </>;
}
