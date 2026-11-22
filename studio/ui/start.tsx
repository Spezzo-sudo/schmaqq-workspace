import {useEffect,useState} from 'react';
import type {Studio} from './app';
import {api,clock,newId,plural,signOut,when,type Agent,type PlanWindow,type Project} from './api';
import {Face,photoOf} from './avatar';
import {duration,jobOf,stepLabel,taskState,teamOrder} from './model';
import {Brand,Checklist,Dialog,Field,Plus} from './parts';

/**
 * Start, the "Zentrale" (owner, 22.11.2026): an overview of the whole Studio, no project column beside it.
 * What waits for you, who works where, the projects, what moved last, your ChatGPT plan, the week and the team.
 * Desktop: two columns. Phone: the same blocks one below the other, the most urgent first.
 */
export function StartScreen({studio}:{studio:Studio}){
 const {me,projects,team,go,overview}=studio;
 const [creating,setCreating]=useState(false);
 const titleOf=(id:string)=>projects.find(p=>p.id===id)?.title??'';
 const visible=team.tasks.filter(t=>projects.some(p=>p.id===t.project));
 const waiting=visible.filter(t=>t.status!=='done'&&taskState(t).tone==='approve'&&(t.assignee===me.id||t.status==='review'&&t.assignee!==me.id));
 const working=overview?.working.filter(w=>projects.some(p=>p.id===w.project))??[];
 const sentence=[waiting.length?`${waiting.length===1?'Eine Sache wartet':waiting.length+' Sachen warten'} auf dich.`:'',
  working.length?`${working.length===1?'Ein Auftrag läuft':working.length+' Aufträge laufen'} gerade.`:''].filter(Boolean).join(' ')
  ||(projects.length?'Gerade wartet nichts auf dich und niemand arbeitet.':'Leg dein erstes Projekt an und sag Herrn Grau, was du vorhast.');
 return <section className="ui-start">
  <StudioHeader studio={studio}/>
  <div className="ui-greeting"><h1>{greeting()}, {me.name.split(' ')[0]}.</h1><p>{sentence}</p></div>
  <div className="ui-zentrale">
   <div className="ui-zentrale-main">
    {waiting.length>0&&<div className="ui-block">
     <h2 className="ui-label">Wartet auf dich</h2>
     {waiting.slice(0,6).map(t=><button key={t.id} className="ui-row soft" onClick={()=>go({page:'project',project:t.project,task:t.id})}>
      <span className="ui-dot approve"/><span className="ui-row-text"><b>{t.title}</b><small>{titleOf(t.project)} · {t.assignee===me.id?'Ansehen und freigeben':'Freigabe gewünscht'}</small></span>
     </button>)}
    </div>}
    {working.length>0&&<Working studio={studio}/>}
    <div className="ui-block">
     <h2 className="ui-label">Projekte</h2>
     {projects.length===0&&<div className="ui-hello">
      <p>Keine aktiven Projekte.</p>
      <button className="ui-btn primary" onClick={()=>setCreating(true)}><Plus/> Projekt anlegen</button>
      <button className="ui-btn" onClick={()=>go({page:'archive'})}>Archiv öffnen</button>
     </div>}
     <div className="ui-project-grid">
      {projects.map(p=><ProjectCard key={p.id} studio={studio} project={p}/>)}
      {projects.length>0&&<button className="ui-row card add" onClick={()=>setCreating(true)}><Plus/><span className="ui-row-text"><b>Projekt anlegen</b><small>Name und Ziel, Herr Grau ist dabei.</small></span></button>}
     </div>
    </div>
    <Recent studio={studio}/>
   </div>
   <div className="ui-zentrale-side">
    <PlanBlock studio={studio}/>
    <WeekBlock studio={studio}/>
    <TeamBlock studio={studio}/>
    {projects.length>0&&<div className="ui-tip"><b>So geht es weiter</b><p>Öffne ein Projekt und schreib „@Herr Grau“ und dein Ziel. Er macht einen Plan, verteilt die Arbeit und du gibst am Ende frei.</p>
     <button className="ui-link" onClick={()=>go({page:'guide'})}>So funktioniert Studio ›</button></div>}
   </div>
  </div>
  {creating&&<NewProject studio={studio} onClose={()=>setCreating(false)}/>}
 </section>;
}

const agentOf=(studio:Studio,project:string,id:string|null)=>studio.overview?.agents.find(a=>a.project===project&&a.id===id)??null;

/** Who works where right now, one line each. */
function Working({studio}:{studio:Studio}){
 const {overview,projects,team,go}=studio;
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(t);},[]);
 const rows=overview!.working.filter(w=>projects.some(p=>p.id===w.project));
 return <div className="ui-block">
  <h2 className="ui-label">Gerade am Arbeiten <small>{rows.length}</small></h2>
  {rows.map((w,i)=>{
   const agent=agentOf(studio,w.project,w.agent),project=projects.find(p=>p.id===w.project)!.title;
   const task=w.task?team.tasks.find(t=>t.id===w.task):null;
   const who=agent?.name??(w.kind==='code'?'Die Entwicklung':'Ein Agent');
   const what=w.status==='queued'?'fängt gleich an':w.kind==='code'?'ändert den Code':stepLabel(w.step);
   return <button key={i} className="ui-row" onClick={()=>go({page:'project',project:w.project,...(task?{task:task.id}:{})})}>
    {agent?<Face agent={agent} size={36} working/>:<span className="ui-tile small" style={{background:tileColor(project)}}>{project.slice(0,2).toUpperCase()}</span>}
    <span className="ui-row-text"><b>{who} {what}</b><small>{project}{task?' · '+task.title:''} · seit {duration(now-w.started)}</small></span>
   </button>;
  })}
 </div>;
}

function ProjectCard({studio,project:p}:{studio:Studio;project:Project}){
 const {team,go,overview}=studio;
 const tasks=team.tasks.filter(t=>t.project===p.id&&t.status!=='done'),approve=tasks.filter(t=>taskState(t).tone==='approve').length;
 const agents=teamOrder(overview?.agents.filter(a=>a.project===p.id));
 const busy=new Set(overview?.working.filter(w=>w.project===p.id).map(w=>w.agent));
 return <button className="ui-row project card" onClick={()=>go({page:'project',project:p.id})}>
  <span className="ui-tile" style={{background:tileColor(p.title)}}>{p.title.slice(0,2).toUpperCase()}</span>
  <span className="ui-row-text"><b>{p.title}</b><small className="ui-row-excerpt">{p.lastExcerpt||p.description||'Noch keine Nachricht'}</small>
   <span className="ui-chips small">{tasks.length?<span className="ui-pill">{tasks.length} offen</span>:<span className="ui-pill quiet">keine offenen Aufgaben</span>}{approve>0&&<span className="ui-pill approve">{approve} zum Freigeben</span>}</span>
   {agents.length>0&&<span className="ui-faces" aria-label={'Team: '+agents.map(a=>a.name).join(', ')}>{agents.slice(0,6).map(a=><Face key={a.id} agent={a} size={24} working={busy.has(a.id)}/>)}</span>}</span>
  <span className="ui-row-end">{p.lastMessage?<small>{when(p.lastMessage)}</small>:null}{(p.unread??0)>0&&<b className="ui-count" aria-label={p.unread+' ungelesen'}>{p.unread}</b>}</span>
 </button>;
}

/** The tasks that moved last, across all projects. */
function Recent({studio}:{studio:Studio}){
 const {team,projects,overview,go}=studio;
 if(!overview)return null;
 const rows=team.tasks.filter(t=>projects.some(p=>p.id===t.project)).sort((a,b)=>(overview.moved[b.id]??0)-(overview.moved[a.id]??0)).slice(0,6);
 if(!rows.length)return null;
 return <div className="ui-block">
  <h2 className="ui-label">Zuletzt bewegt</h2>
  {rows.map(t=>{const s=taskState(t);return <button key={t.id} className="ui-row" onClick={()=>go({page:'project',project:t.project,task:t.id})}>
   <span className={'ui-dot '+s.tone}/><span className="ui-row-text"><b>{t.title}</b><small>{s.label} · {projects.find(p=>p.id===t.project)?.title}</small></span>
   <span className="ui-row-end">{overview.moved[t.id]?<small>{when(overview.moved[t.id])}</small>:null}</span>
  </button>;})}
 </div>;
}

const thousands=(n:number)=>n>=1000000?(n/1000000).toLocaleString('de-CH',{maximumFractionDigits:1})+' Mio.':n>=1000?Math.round(n/1000)+' Tsd.':String(n);

/** Your ChatGPT plan: how much is used (as the last code run reported it) and what the team used this week. */
function PlanBlock({studio}:{studio:Studio}){
 const {overview,go}=studio;
 if(!overview)return null;
 const {limits,usage}=overview,now=overview.at; // the time of the overview, refreshed with it
 const meter=(title:string,w:PlanWindow|null)=>{
  if(!w)return null;
  const refilled=w.resets!=null&&w.resets<=now;
  const tone=refilled?'ok':w.used>=90?'fail':w.used>=70?'work':'ok';
  return <div className="ui-meter">
   <div className="ui-meter-head"><span>{title}</span><b>{refilled?'wieder frei':w.used+' % verbraucht'}</b></div>
   <div className="ui-meter-track" role="meter" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={refilled?0:w.used}><i className={tone} style={{width:(refilled?0:Math.max(w.used,2))+'%'}}/></div>
   {!refilled&&w.resets&&<small className="ui-muted">Wieder voll {when(w.resets)==clock(w.resets)?'um '+clock(w.resets):'am '+new Date(w.resets).toLocaleString('de-CH',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</small>}
  </div>;
 };
 return <div className="ui-block">
  <h2 className="ui-label">Dein ChatGPT</h2>
  <div className="ui-panel">
   {limits?<>
    {limits.reached&&<p className="ui-warn">Das Kontingent ist aufgebraucht. Das Team kann erst wieder für dich programmieren, wenn es sich auffüllt.</p>}
    {meter('Die nächsten Stunden',limits.short)}
    {meter('Diese Woche',limits.week)}
    <small className="ui-muted">Stand {when(limits.at)===clock(limits.at)?clock(limits.at):when(limits.at)+' '+clock(limits.at)}, nach dem letzten Programmierauftrag für dich.</small>
   </>:<p className="ui-muted">Noch keine Angabe. Sobald das Team zum ersten Mal für dich programmiert hat, steht hier, wie viel von deinem ChatGPT-Kontingent verbraucht ist.</p>}
   {usage.runs>0&&<p className="ui-muted">In den letzten 7 Tagen für dich: {plural(usage.runs,'Programmierauftrag','Programmieraufträge')}{usage.reported?` · ${thousands(usage.input-usage.cached)} neu gelesen · ${thousands(usage.cached)} aus dem Zwischenspeicher · ${thousands(usage.output)} geschrieben`:''}.</p>}
   <button className="ui-link" onClick={()=>go({page:'account',account:'ki'})}>KI-Zugänge ›</button>
  </div>
 </div>;
}

/** The last seven days in a few numbers, then per project. */
function WeekBlock({studio}:{studio:Studio}){
 const {overview,projects,team}=studio;
 if(!overview||!projects.length)return null;
 const rows=projects.map(p=>({p,w:overview.week[p.id]??{answers:0,messages:0,codeRuns:0}}));
 const sum=(k:'answers'|'messages'|'codeRuns')=>rows.reduce((n,r)=>n+r.w[k],0);
 const open=team.tasks.filter(t=>projects.some(p=>p.id===t.project)&&t.status!=='done').length;
 const tiles:[string,number][]=[['Antworten der Agenten',sum('answers')],['Programmieraufträge',sum('codeRuns')],['Nachrichten von euch',sum('messages')],['Offene Aufgaben',open]];
 const active=rows.filter(r=>r.w.answers+r.w.messages+r.w.codeRuns>0).sort((a,b)=>(b.w.answers+b.w.messages+b.w.codeRuns)-(a.w.answers+a.w.messages+a.w.codeRuns));
 return <div className="ui-block">
  <h2 className="ui-label">Die letzten 7 Tage</h2>
  <div className="ui-tiles">{tiles.map(([label,value])=><div key={label} className="ui-stat"><b>{value.toLocaleString('de-CH')}</b><small>{label}</small></div>)}</div>
  {active.length>0&&<table className="ui-week">
   <thead><tr><th scope="col">Projekt</th><th scope="col">Antworten</th><th scope="col">Aufträge</th><th scope="col">Nachrichten</th></tr></thead>
   <tbody>{active.map(r=><tr key={r.p.id}><th scope="row">{r.p.title}</th><td>{r.w.answers}</td><td>{r.w.codeRuns}</td><td>{r.w.messages}</td></tr>)}</tbody>
  </table>}
 </div>;
}

/** Every colleague once, with the projects they work in. */
function TeamBlock({studio}:{studio:Studio}){
 const {overview,projects,go}=studio;
 if(!overview)return null;
 const groups=new Map<string,{agent:Agent;in:{project:string;id:string}[]}>();
 for(const a of teamOrder(overview.agents)){
  if(!projects.some(p=>p.id===a.project))continue;
  const k=(a.lead?'lead':a.role)+':'+a.name,g=groups.get(k);
  if(g)g.in.push({project:a.project,id:a.id});else groups.set(k,{agent:a,in:[{project:a.project,id:a.id}]});
 }
 if(!groups.size)return null;
 const busy=(g:{in:{project:string;id:string}[]})=>overview.working.some(w=>g.in.some(x=>x.project===w.project&&x.id===w.agent));
 return <div className="ui-block">
  <h2 className="ui-label">Dein Team <small>{groups.size}</small></h2>
  {[...groups.values()].map(g=>{const first=g.in[0];
   return <button key={g.agent.id} className="ui-row" onClick={()=>go({page:'project',project:first.project,chat:'agent:'+first.id})}>
    <Face agent={g.agent} size={36} working={busy(g)}/>
    <span className="ui-row-text"><b>{g.agent.name} <small>· {jobOf(g.agent).title}</small></b><small>{busy(g)?'arbeitet gerade · ':''}{g.in.map(x=>projects.find(p=>p.id===x.project)?.title).join(', ')}</small></span>
   </button>;})}
 </div>;
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

function StudioHeader({studio,onClose}:{studio:Studio;onClose?:()=>void}){
 return <header className="ui-top">
  <MenuButton studio={studio} open={!!onClose} onClick={onClose??studio.openMenu}/>
  <Brand onHome={onClose?()=>studio.route.page==='start'?onClose():studio.go({page:'start',project:''}):undefined}/>
 </header>;
}

function MenuButton({studio,open=false,onClick}:{studio:Studio;open?:boolean;onClick:()=>void}){
 const name=studio.me.name.trim();
 const initialsName=/\s/.test(name)?name:[...name][0]??'?';
 return <button className="ui-me" aria-label={open?'Schließen':'Menü öffnen ('+studio.me.name+')'} aria-expanded={open} onClick={onClick}>
  <Face name={initialsName} photo={photoOf(studio.members.find(m=>m.id===studio.me.id))} size={30}/>
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12"><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
 </button>;
}

/** The menu behind your picture. */
export function Menu({studio,onClose}:{studio:Studio;onClose:()=>void}){
 const {me,go,agentsReady}=studio;
 const [creating,setCreating]=useState(false);
 useEffect(()=>{
  const closeOnEscape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!creating)onClose();};
  addEventListener('keydown',closeOnEscape);return()=>removeEventListener('keydown',closeOnEscape);
 },[onClose,creating]);
 if(creating)return <NewProject studio={studio} onClose={()=>{setCreating(false);onClose();}}/>;
 return <div className="ui-sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <nav className="ui-sheet left" aria-label="Menü">
   <StudioHeader studio={studio} onClose={onClose}/>
   <div className="ui-sheet-account"><b>{me.name}</b><small>{me.email}</small></div>
   <button onClick={()=>go({page:'account'})}>Mein Konto</button>
   <button onClick={()=>setCreating(true)}>Projekt anlegen</button>
   {studio.members.some(m=>m.id===me.id&&m.role==='owner')&&<button onClick={()=>{go({page:'account',account:'verwaltung'});}}>Jemanden einladen</button>}
   <button onClick={()=>go({page:'archive'})}>Projekte und Archiv</button>
   <button onClick={()=>go({page:'guide'})}>So funktioniert Studio</button>
   <button onClick={()=>void signOut()}>Abmelden</button>
   <p className="ui-sheet-foot"><span className={'ui-dot '+(agentsReady===false?'fail':agentsReady?'ok':'idle')}/>KI-Zugang {agentsReady===false?'gerade nicht erreichbar':agentsReady?'bereit':'wird geprüft'}</p>
  </nav>
 </div>;
}
