import {useCallback,useEffect,useRef,useState} from 'react';
import {Copy,Download,FileText,KeyRound,ListPlus,Plus,Reply,Send,X} from 'lucide-react';
import {initials,roomRequest,taskTitleFrom,type RoomState,type TeamTask} from './room-model';

/** Studio-wide content that used to live only in the former view: #Allgemein, general documents, data export. */
type Doc={id:string;title:string;body:string;author:string;revision:number;updated:number;project?:string|null};
type Message={id:string;channel:string;author:string;body:string;created:number;replyTo?:string|null;taskId?:string|null;taskProject?:string|null};
type Workspace={members:{id:string;name:string}[];messages:Message[];documents:Doc[];projects:{id:string;title:string}[]};
const when=(t:number)=>new Date(t).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});

function useWorkspace(){
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{try{const r=await fetch('/api/workspace',{cache:'no-store'});const d=await r.json() as Workspace&{error?:string};if(!r.ok)throw new Error(d.error);setData(d);setError('');}catch(e){setError(e instanceof Error&&e.message?e.message:'Die Verbindung ist unterbrochen.');}},[]);
 useEffect(()=>{void load();const timer=setInterval(()=>{if(!document.hidden)void load();},5000);return()=>clearInterval(timer);},[load]);
 async function post(payload:unknown){const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error??'Speichern hat nicht geklappt.');await load();}
 return {data,error,post,load};
}

/** The team-wide conversation (#Allgemein): the same message actions as in a project – answer, and turn into a task of a chosen project. */
export function GeneralChat({userId,onTask}:{userId:string;onTask?:(project:string,task:string)=>void}){
 const {data,error,post,load}=useWorkspace(),[text,setText]=useState(''),[sending,setSending]=useState(false),[failed,setFailed]=useState('');
 const [reply,setReply]=useState<Message|null>(null),[convert,setConvert]=useState<Message|null>(null),[project,setProject]=useState(''),[title,setTitle]=useState('');
 const list=useRef<HTMLOListElement|null>(null);
 const all=(data?.messages??[]).filter(m=>m.channel==='general'),messages=all.slice(-60);
 const name=(id:string)=>data?.members.find(m=>m.id===id)?.name??'Jemand';
 const projects=data?.projects??[];
 useEffect(()=>{if(list.current)list.current.scrollTop=list.current.scrollHeight;},[messages.length]);
 async function send(e:React.FormEvent){e.preventDefault();if(!text.trim()||sending)return;setSending(true);setFailed('');try{await post({action:'message',id:crypto.randomUUID(),channel:'general',body:text,...(reply?{replyTo:reply.id}:{})});setText('');setReply(null);}catch(err){setFailed((err as Error).message);}finally{setSending(false);}}
 function startConvert(m:Message){setConvert(m);setTitle(taskTitleFrom(m.body));setProject(projects.length===1?projects[0].id:'');setFailed('');}
 async function createTask(e:React.FormEvent){e.preventDefault();if(!convert||!project||!title.trim()||sending)return;setSending(true);setFailed('');
  try{const r=await roomRequest<{task:string}>('/api/room',{action:'task',id:crypto.randomUUID(),project,title:title.trim(),source:convert.id});setConvert(null);await load();onTask?.(project,r.task);}
  catch(err){setFailed((err as Error).message);}finally{setSending(false);}}
 return <section className="studio-general-chat" aria-labelledby="general-chat">
  <h2 id="general-chat">Allgemein</h2>
  <p className="studio-page-intro">Für alles, was zu keinem Projekt gehört. Das ganze Team liest mit. Wird aus einer Nachricht Arbeit, mach sie zur Aufgabe in einem Projekt.</p>
  {error&&<p className="rw-error" role="alert">{error}</p>}
  {!!messages.length&&<ol ref={list} className="studio-general-messages">{messages.map(m=>{const quoted=m.replyTo?all.find(x=>x.id===m.replyTo):null;const taskProject=projects.find(p=>p.id===m.taskProject);
   return <li key={m.id} className={m.author===userId?'own':''}><span className="rw-avatar">{initials(name(m.author))}</span><div>
    <p className="studio-general-meta"><strong>{m.author===userId?'Du':name(m.author)}</strong><time>{when(m.created)}</time></p>
    {m.replyTo&&<p className="rw-muted studio-general-quote">Antwort auf {quoted?name(quoted.author)+': „'+taskTitleFrom(quoted.body)+'“':'eine ältere Nachricht'}</p>}
    <p>{m.body}</p>
    <p className="studio-general-actions">
     <button className="rw-link" onClick={()=>{setReply(m);document.getElementById('general-text')?.focus();}}><Reply size={14} aria-hidden="true"/> Antworten</button>
     {m.taskId&&taskProject?<button className="rw-link" onClick={()=>onTask?.(taskProject.id,m.taskId!)}>Aufgabe in {taskProject.title} öffnen</button>
      :!m.taskId&&!!projects.length&&<button className="rw-link" onClick={()=>startConvert(m)}><ListPlus size={14} aria-hidden="true"/> Als Aufgabe</button>}
    </p>
    {convert?.id===m.id&&<form className="studio-general-convert" onSubmit={createTask}>
     <label>In welches Projekt?<select required value={project} onChange={e=>setProject(e.target.value)}><option value="">Projekt wählen</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
     <label>Was soll passieren?<input required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label>
     <div className="rw-row-actions"><button className="rw-button lime" disabled={sending||!project||!title.trim()}>Aufgabe anlegen</button><button type="button" className="rw-button" onClick={()=>setConvert(null)}>Abbrechen</button></div>
     <small className="rw-muted">Die Nachricht wird mit der Aufgabe verknüpft. Anlegen darf, wer im Projekt Entwickler ist.</small>
    </form>}
   </div></li>;})}</ol>}
  {data&&!messages.length&&<p className="rw-muted">Noch keine Nachricht. Schreib die erste.</p>}
  {reply&&<p className="studio-general-replying">Antwort auf {name(reply.author)}: „{taskTitleFrom(reply.body)}“ <button className="rw-icon" aria-label="Antwort abbrechen" onClick={()=>setReply(null)}><X size={14}/></button></p>}
  <form className="studio-general-composer" onSubmit={send}><label className="sr-only" htmlFor="general-text">Nachricht an alle</label><textarea id="general-text" value={text} maxLength={4000} placeholder={reply?'Deine Antwort':'Nachricht an alle'} onChange={e=>setText(e.target.value)}/><button className="rw-button lime" disabled={!text.trim()||sending}><Send size={16}/>{sending?'Wird gesendet …':'Senden'}</button></form>
  {failed&&<p className="rw-error" role="alert">{failed}</p>}
 </section>;
}

/** Documents that belong to no project (the former "Gemeinsames Wissen"). Read, edit, add. */
export function GeneralKnowledge(){
 const {data,error,post}=useWorkspace(),[open,setOpen]=useState<string|null>(null),[failed,setFailed]=useState(''),[saving,setSaving]=useState(false);
 const docs=(data?.documents??[]).filter(d=>!d.project);
 const name=(id:string)=>data?.members.find(m=>m.id===id)?.name??'Jemand';
 async function save(e:React.FormEvent<HTMLFormElement>,doc?:Doc){e.preventDefault();const f=new FormData(e.currentTarget);setSaving(true);setFailed('');try{await post({action:'document',...(doc?{id:doc.id,revision:doc.revision}:{}),title:f.get('title'),body:f.get('body')});setOpen(null);}catch(err){setFailed((err as Error).message);}finally{setSaving(false);}}
 const form=(doc?:Doc)=><form className="team-form studio-doc-form" onSubmit={e=>void save(e,doc)}><label>Titel<input name="title" required maxLength={160} defaultValue={doc?.title}/></label><label>Inhalt<textarea name="body" maxLength={50000} defaultValue={doc?.body}/></label>{failed&&<p className="rw-error" role="alert">{failed}</p>}<div className="rw-row-actions"><button className="rw-button lime" disabled={saving}>{saving?'Wird gespeichert …':'Speichern'}</button><button type="button" className="rw-button" onClick={()=>{setOpen(null);setFailed('');}}>Abbrechen</button></div></form>;
 if(!data&&!error)return null;
 return <section className="studio-general-knowledge" aria-labelledby="general-knowledge">
  <div className="team-section-head"><h2 id="general-knowledge">Allgemeines Wissen</h2>{open!=='new'&&<button className="rw-button" onClick={()=>{setOpen('new');setFailed('');}}><Plus size={16}/>Dokument</button>}</div>
  <p className="studio-page-intro">Notizen und Entscheidungen, die für alle Projekte gelten. Projektwissen findest du im Projekt unter „Wissen“.</p>
  {error&&<p className="rw-error" role="alert">{error}</p>}
  {open==='new'&&form()}
  {docs.map(d=>open===d.id?<div key={d.id}>{form(d)}</div>:<button key={d.id} className="team-work-card" onClick={()=>{setOpen(d.id);setFailed('');}}><FileText size={18}/><span><strong>{d.title}</strong><small>{d.body.slice(0,120)||'Noch kein Inhalt.'}</small><small>{name(d.author)} · {when(d.updated)}</small></span></button>)}
  {!docs.length&&open!=='new'&&<p className="rw-muted">Noch nichts festgehalten.</p>}
 </section>;
}

/** Download everything the team wrote (projects, tasks, messages, documents) as one file. */
export async function downloadAll(){
 const r=await fetch('/api/workspace',{cache:'no-store'});if(!r.ok)throw new Error('Der Download hat nicht geklappt. Versuch es gleich noch einmal.');
 const url=URL.createObjectURL(new Blob([JSON.stringify(await r.json(),null,2)],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download='schmaqq-studio-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);
}
export function DownloadAll(){
 const [state,setState]=useState('');
 return <section aria-labelledby="account-export"><h2 id="account-export">Deine Daten</h2><p className="studio-page-intro">Alle Projekte, Aufgaben, Gespräche und Dokumente als eine Datei.</p><button className="rw-button" onClick={()=>{setState('');void downloadAll().then(()=>setState('Heruntergeladen.'),e=>setState((e as Error).message));}}><Download size={16}/>Alles herunterladen</button>{state&&<p role="status" className="rw-muted">{state}</p>}</section>;
}

/** Copy the project as plain text for your own ChatGPT – works without any connection. */
export function ProjectBriefing({room,tasks}:{room:RoomState;tasks:TeamTask[]}){
 const [prompt,setPrompt]=useState(''),[copied,setCopied]=useState(false);
 const status:Record<string,string>={todo:'offen',doing:'in Arbeit',review:'zur Prüfung',done:'erledigt'};
 const text=()=>['Du hilfst uns bei SCHMAQQ (schmaqq.com) im Projekt „'+room.project.title+'“.',room.project.description,
  'AUFGABEN',...tasks.map(t=>'- '+t.title+' ('+(status[t.status]??t.status)+')'),
  'WISSEN',...room.notes.filter(n=>!n.archived).map(n=>n.title+'\n'+n.body),
  'DEIN AUFTRAG',prompt.trim()||'Schlage den nächsten konkreten Schritt vor.'].filter(Boolean).join('\n\n');
 return <details className="team-secondary studio-briefing"><summary>Projekt an dein eigenes ChatGPT geben</summary>
  <p>Kopiert Ziel, Aufgaben und Wissen dieses Projekts als Text. Du fügst ihn in deinen ChatGPT-Chat ein. Dafür muss nichts verbunden sein.</p>
  <label className="team-form"><span>Was soll ChatGPT tun? (optional)</span><textarea value={prompt} maxLength={2000} onChange={e=>{setPrompt(e.target.value);setCopied(false);}} placeholder="Zum Beispiel: Schreib einen Vorschlag für die Startseite."/></label>
  <button className="rw-button" onClick={()=>void navigator.clipboard?.writeText(text()).then(()=>setCopied(true))}><Copy size={16}/>{copied?'Kopiert':'Briefing kopieren'}</button>
 </details>;
}

/** Change your own password. Other sign-ins end; this one stays. */
export function ChangePassword(){
 const [open,setOpen]=useState(false),[state,setState]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function save(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget,f=new FormData(form);setError('');setState('');
  if(f.get('password')!==f.get('repeat')){setError('Die beiden neuen Passwörter sind nicht gleich.');return;}
  setBusy(true);try{const r=await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current:f.get('current'),password:f.get('password')})});const d=await r.json().catch(()=>({})) as {error?:string};if(!r.ok)throw new Error(d.error??'Das hat nicht geklappt.');form.reset();setOpen(false);setState('Neues Passwort gespeichert. Andere Anmeldungen wurden beendet.');}catch(err){setError((err as Error).message);}finally{setBusy(false);}}
 return <section aria-labelledby="account-password"><h2 id="account-password">Passwort</h2>
  {!open&&<button className="rw-button" onClick={()=>{setOpen(true);setState('');}}><KeyRound size={16}/>Passwort ändern</button>}
  {open&&<form className="team-form" onSubmit={e=>void save(e)}>
   <label>Bisheriges Passwort<input name="current" type="password" autoComplete="current-password" required/></label>
   <label>Neues Passwort<input name="password" type="password" autoComplete="new-password" minLength={12} required/></label>
   <label>Neues Passwort wiederholen<input name="repeat" type="password" autoComplete="new-password" minLength={12} required/></label>
   <small className="rw-muted">Mindestens 12 Zeichen.</small>
   <div className="rw-row-actions"><button className="rw-button lime" disabled={busy}>{busy?'Wird gespeichert …':'Speichern'}</button><button type="button" className="rw-button" onClick={()=>{setOpen(false);setError('');}}>Abbrechen</button></div>
  </form>}
  {state&&<p role="status" className="rw-muted">{state}</p>}
  {error&&<p className="rw-error" role="alert">{error}</p>}
 </section>;
}
