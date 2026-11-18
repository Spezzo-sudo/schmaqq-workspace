import {useState} from 'react';
import type {Studio} from './app';
import {api,newId,when} from './api';
import {Face} from './avatar';
import {taskState} from './model';
import {Dialog,Field,Plus} from './parts';

/** Start: what waits for you, then the projects. On the desktop it is the left column. */
export function StartScreen({studio,compact=false}:{studio:Studio;compact?:boolean}){
 const {me,projects,team,go,route}=studio;
 const [creating,setCreating]=useState(false);
 const titleOf=(id:string)=>projects.find(p=>p.id===id)?.title??'';
 const waiting=team.tasks.filter(t=>projects.some(p=>p.id===t.project)&&t.status!=='done'&&taskState(t).tone==='approve'&&(t.assignee===me.id||t.status==='review'&&t.assignee!==me.id));
 return <section className={'ui-start'+(compact?' compact':'')}>
  <header className="ui-top">
   <button className="ui-me" aria-label={'Menü öffnen ('+me.name+')'} onClick={studio.openMenu}><Face name={me.name} size={36}/></button>
   <span className="ui-brand">SCHMAQQ<b>STUDIO</b></span>
  </header>
  {waiting.length>0&&<div className="ui-block">
   <h2 className="ui-label">Wartet auf dich</h2>
   {waiting.slice(0,5).map(t=><button key={t.id} className="ui-row" onClick={()=>go({page:'project',project:t.project,task:t.id})}>
    <span className="ui-dot approve"/><span className="ui-row-text"><b>{t.title}</b><small>{titleOf(t.project)} · {t.assignee===me.id?'Ansehen und freigeben':'Freigabe gewünscht'}</small></span>
   </button>)}
  </div>}
  <div className="ui-block">
   <h2 className="ui-label">Projekte</h2>
   {projects.length===0&&<div className="ui-hello">
    <p>Noch kein Projekt. Ein Projekt ist ein Chat mit deinem Team aus Menschen und Agenten.</p>
    <button className="ui-btn primary" onClick={()=>setCreating(true)}><Plus/> Projekt anlegen</button>
   </div>}
   {projects.map(p=><button key={p.id} className={'ui-row project'+(route.project===p.id?' current':'')} onClick={()=>go({page:'project',project:p.id})}>
    <span className="ui-tile" style={{background:tileColor(p.title)}}>{p.title.slice(0,2).toUpperCase()}</span>
    <span className="ui-row-text"><b>{p.title}</b><small>{p.lastExcerpt||p.description||'Noch keine Nachricht'}</small></span>
    <span className="ui-row-end">{p.lastMessage?<small>{when(p.lastMessage)}</small>:null}{(p.unread??0)>0&&<b className="ui-count">{p.unread}</b>}</span>
   </button>)}
  </div>
  {projects.length>0&&<button className="ui-fab" aria-label="Projekt anlegen" onClick={()=>setCreating(true)}><Plus/></button>}
  {creating&&<NewProject studio={studio} onClose={()=>setCreating(false)}/>}
 </section>;
}

export function tileColor(title:string){
 const colors=['#2f6f5e','#3b4a8c','#8c4a3b','#5e3b8c','#6f6a2f','#2f5f6f'];
 let h=0;for(const c of title)h=(h*31+c.charCodeAt(0))>>>0;return colors[h%colors.length];
}

function NewProject({studio,onClose}:{studio:Studio;onClose:()=>void}){
 const [title,setTitle]=useState(''),[goal,setGoal]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [id]=useState(newId);
 async function create(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{const r=await api<{project:string}>('/api/room',{action:'create',id,title:title.trim(),description:goal.trim()});await studio.reload();onClose();studio.go({page:'project',project:r.project});}
  catch(err){setError((err as Error).message);}finally{setBusy(false);}
 }
 return <Dialog title="Projekt anlegen" onClose={onClose}>
  <form onSubmit={create} className="ui-form">
   <p className="ui-muted">Name und Ziel reichen. Herr Grau, eure Projektleitung, ist automatisch dabei.</p>
   <Field label="Name"><input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={120} autoFocus placeholder="z. B. Website Café Sonne"/></Field>
   <Field label="Was wollt ihr erreichen?"><textarea value={goal} onChange={e=>setGoal(e.target.value)} maxLength={1000} rows={3} placeholder="Ein, zwei Sätze"/></Field>
   {error&&<p className="ui-error" role="alert">{error}</p>}
   <div className="ui-actions"><button type="button" className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={busy||!title.trim()}>Projekt anlegen</button></div>
  </form>
 </Dialog>;
}

/** The menu behind your picture. */
export function Menu({studio,onClose}:{studio:Studio;onClose:()=>void}){
 const {me,go,agentsReady}=studio;
 const [creating,setCreating]=useState(false);
 async function logout(){try{await api('/api/auth/logout',{});}finally{try{sessionStorage.clear();}catch{/* private mode */}location.replace('/');}}
 if(creating)return <NewProject studio={studio} onClose={()=>{setCreating(false);onClose();}}/>;
 return <div className="ui-sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <nav className="ui-sheet left" aria-label="Menü">
   <div className="ui-sheet-head"><Face name={me.name} size={44}/><span><b>{me.name}</b><small>{me.email}</small></span></div>
   <button onClick={()=>go({page:'account'})}>Mein Konto</button>
   <button onClick={()=>setCreating(true)}>Projekt anlegen</button>
   <button onClick={()=>{go({page:'account'});setTimeout(()=>document.getElementById('invite')?.scrollIntoView({block:'start'}),400);}}>Jemanden einladen</button>
   <button onClick={()=>go({page:'archive'})}>Projekte und Archiv</button>
   <button onClick={()=>go({page:'guide'})}>So funktioniert Studio</button>
   <button onClick={()=>void logout()}>Abmelden</button>
   <p className="ui-sheet-foot"><span className={'ui-dot '+(agentsReady===false?'fail':agentsReady?'ok':'idle')}/>KI-Zugang {agentsReady===false?'gerade nicht erreichbar':agentsReady?'bereit':'wird geprüft'}</p>
  </nav>
 </div>;
}
