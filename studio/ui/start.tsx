import {useEffect,useState} from 'react';
import type {Studio} from './app';
import {api,newId,when} from './api';
import {Face} from './avatar';
import {taskState} from './model';
import {Close,Checklist,Dialog,Field,Plus} from './parts';

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
  {!compact&&<div className="ui-greeting"><h1>{greeting()}, {me.name.split(' ')[0]}.</h1>
   <p>{waiting.length?`${waiting.length===1?'Eine Sache wartet':waiting.length+' Sachen warten'} auf dich.`:projects.length?'Gerade wartet nichts auf dich. Dein Team arbeitet in den Projekten.':'Leg dein erstes Projekt an und sag Herrn Grau, was du vorhast.'}</p></div>}
  {waiting.length>0&&<div className="ui-block">
   <h2 className="ui-label">Wartet auf dich</h2>
   {waiting.slice(0,5).map(t=><button key={t.id} className="ui-row" onClick={()=>go({page:'project',project:t.project,task:t.id})}>
    <span className="ui-dot approve"/><span className="ui-row-text"><b>{t.title}</b><small>{titleOf(t.project)} · {t.assignee===me.id?'Ansehen und freigeben':'Freigabe gewünscht'}</small></span>
   </button>)}
  </div>}
  <div className="ui-block">
   <h2 className="ui-label">Projekte</h2>
   {projects.length===0&&<div className="ui-hello">
    <p>Keine aktiven Projekte.</p>
    <button className="ui-btn primary" onClick={()=>setCreating(true)}><Plus/> Projekt anlegen</button>
    <button className="ui-btn" onClick={()=>go({page:'archive'})}>Archiv öffnen</button>
   </div>}
   {projects.map(p=>{const tasks=team.tasks.filter(t=>t.project===p.id&&t.status!=='done'),approve=tasks.filter(t=>taskState(t).tone==='approve').length;
    return <button key={p.id} className={'ui-row project'+(compact?'':' card')+(route.project===p.id?' current':'')} onClick={()=>go({page:'project',project:p.id})}>
    <span className="ui-tile" style={{background:tileColor(p.title)}}>{p.title.slice(0,2).toUpperCase()}</span>
    <span className="ui-row-text"><b>{p.title}</b><small>{p.lastExcerpt||p.description||'Noch keine Nachricht'}</small>
     {!compact&&<span className="ui-chips small">{tasks.length?<span className="ui-pill">{tasks.length} offen</span>:<span className="ui-pill quiet">keine offenen Aufgaben</span>}{approve>0&&<span className="ui-pill approve">{approve} zum Freigeben</span>}</span>}</span>
    <span className="ui-row-end">{p.lastMessage?<small>{when(p.lastMessage)}</small>:null}{(p.unread??0)>0&&<b className="ui-count">{p.unread}</b>}</span>
   </button>;})}
  </div>
  {!compact&&projects.length>0&&<div className="ui-tip"><b>So geht es weiter</b><p>Öffne ein Projekt und schreib „@Herr Grau“ und dein Ziel. Er macht einen Plan, verteilt die Arbeit und du gibst am Ende frei.</p>
   <button className="ui-link" onClick={()=>go({page:'guide'})}>So funktioniert Studio ›</button></div>}
  {projects.length>0&&<button className="ui-fab" aria-label="Projekt anlegen" onClick={()=>setCreating(true)}><Plus/></button>}
  {creating&&<NewProject studio={studio} onClose={()=>setCreating(false)}/>}
 </section>;
}

function greeting(){const h=new Date().getHours();return h<11?'Guten Morgen':h<18?'Hallo':'Guten Abend';}

export function tileColor(title:string){
 const colors=['#2f6f5e','#3b4a8c','#8c4a3b','#5e3b8c','#6f6a2f','#2f5f6f'];
 let h=0;for(const c of title)h=(h*31+c.charCodeAt(0))>>>0;return colors[h%colors.length];
}

function NewProject({studio,onClose}:{studio:Studio;onClose:()=>void}){
 const [title,setTitle]=useState(''),[goal,setGoal]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [id]=useState(newId),[members,setMembers]=useState<string[]>([]);
 async function create(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{const r=await api<{project:string}>('/api/room',{action:'create',id,title:title.trim(),description:goal.trim(),members});await studio.reload();onClose();studio.go({page:'project',project:r.project});}
  catch(err){setError((err as Error).message);}finally{setBusy(false);}
 }
 return <Dialog title="Projekt anlegen" onClose={onClose}>
  <form onSubmit={create} className="ui-form">
   <p className="ui-muted">Herr Grau ist automatisch dabei.</p>
   <Field label="Name"><input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={120} autoFocus placeholder="z. B. Website Café Sonne"/></Field>
   <Field label="Was wollt ihr erreichen?"><textarea value={goal} onChange={e=>setGoal(e.target.value)} maxLength={1000} rows={3} placeholder="Ein, zwei Sätze"/></Field>
   <Checklist title="Wer ist dabei?" items={studio.members.filter(m=>!m.removed&&m.id!==studio.me.id)} selected={members} onChange={setMembers}/>
   {error&&<p className="ui-error" role="alert">{error}</p>}
   <div className="ui-actions"><button type="button" className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={busy||!title.trim()}>Projekt anlegen</button></div>
  </form>
 </Dialog>;
}

/** The menu behind your picture. */
export function Menu({studio,onClose}:{studio:Studio;onClose:()=>void}){
 const {me,go,agentsReady}=studio;
 const [creating,setCreating]=useState(false);
 useEffect(()=>{
  const closeOnEscape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!creating)onClose();};
  addEventListener('keydown',closeOnEscape);return()=>removeEventListener('keydown',closeOnEscape);
 },[onClose,creating]);
 async function logout(){try{await api('/api/auth/logout',{});}finally{try{sessionStorage.clear();}catch{/* private mode */}location.replace('/');}}
 if(creating)return <NewProject studio={studio} onClose={()=>{setCreating(false);onClose();}}/>;
 return <div className="ui-sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <nav className="ui-sheet left" aria-label="Menü">
   <div className="ui-sheet-head"><Face name={me.name} size={44}/><span><b>{me.name}</b><small>{me.email}</small></span><button className="ui-icon" aria-label="Schließen" onClick={onClose}><Close/></button></div>
   <button onClick={()=>go({page:'account'})}>Mein Konto</button>
   <button onClick={()=>setCreating(true)}>Projekt anlegen</button>
   {studio.members.some(m=>m.id===me.id&&m.role==='owner')&&<button onClick={()=>{go({page:'account'});setTimeout(()=>document.getElementById('invite')?.scrollIntoView({block:'start'}),400);}}>Jemanden einladen</button>}
   <button onClick={()=>go({page:'archive'})}>Projekte und Archiv</button>
   <button onClick={()=>go({page:'guide'})}>So funktioniert Studio</button>
   <button onClick={()=>void logout()}>Abmelden</button>
   <p className="ui-sheet-foot"><span className={'ui-dot '+(agentsReady===false?'fail':agentsReady?'ok':'idle')}/>KI-Zugang {agentsReady===false?'gerade nicht erreichbar':agentsReady?'bereit':'wird geprüft'}</p>
  </nav>
 </div>;
}
