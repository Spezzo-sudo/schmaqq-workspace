import {useEffect,useState} from 'react';
import type {Studio} from './app';
import {api,newId,q,type Role,type Resource} from './api';
import {Face} from './avatar';
import {jobOf,taskState,teamOrder} from './model';
import {projectTasks} from './project';
import {HireDialog,ProfileDialog} from './people';
import {tileColor} from './start';
import {serverFor} from './task';
import {Bar,Check,Dialog,ErrorLine,Field,More,Section} from './parts';
import {CodeSignIn} from './account';

/** Project info: now, team, code, area, knowledge, who may do what. Settings live here, out of the way of the work. */
export function InfoScreen({studio}:{studio:Studio}){
 const {room,go,me,roles,desktop}=studio;
 const [hiring,setHiring]=useState(false),[profile,setProfile]=useState(''),[menu,setMenu]=useState(false),[renaming,setRenaming]=useState(false),[error,setError]=useState('');
 if(!room)return null;
 const admin=roles?.mine.includes('admin')??false,tasks=projectTasks(studio),agents=teamOrder(room.agents),people=room.members.filter(m=>!m.removed);
 const open=tasks.filter(t=>t.status!=='done'),mine=open.filter(t=>t.assignee===me.id),approve=open.filter(t=>taskState(t).tone==='approve');
 async function saveProject(changes:{title?:string;description?:string;archived?:boolean;scope?:string[]}){
  setError('');
  try{await api('/api/team',{action:'project',project:room!.project.id,revision:room!.meta.revision,title:room!.project.title,description:room!.project.description,archived:false,
   base:room!.meta.base??'main',workflow:room!.meta.workflow??'pull-request',...changes});await studio.reload();if(changes.archived)go({page:'start',project:''});}
  catch(e){setError((e as Error).message);}
 }
 return <section className="ui-screen info">
  <Bar onBack={()=>go({info:false})} title="Projektinfo" end={admin?<button className="ui-icon" aria-label="Mehr" onClick={()=>setMenu(m=>!m)}><More/></button>:undefined}/>
  {menu&&<div className="ui-popover"><button onClick={()=>{setMenu(false);setRenaming(true);}}>Umbenennen</button>
   <button onClick={()=>{setMenu(false);if(confirm('„'+room.project.title+'“ archivieren? Unter „Projekte und Archiv“ lässt es sich wiederherstellen.'))void saveProject({archived:true});}}>Archivieren</button></div>}
  <div className="ui-info-head"><span className="ui-tile big" style={{background:tileColor(room.project.title)}}>{room.project.title.slice(0,2).toUpperCase()}</span>
   <h2>{room.project.title}</h2>{room.project.description&&<p className="ui-muted">{room.project.description}</p>}</div>
  <ErrorLine text={error}/>
  <div className="ui-stats">
   <button onClick={()=>go({info:false,tab:'tasks'})}><b>{open.length}</b><small>Offen</small></button>
   <button onClick={()=>go({info:false,tab:'tasks'})}><b>{mine.length}</b><small>Bei dir</small></button>
   <button onClick={()=>go({info:false,tab:'tasks'})}><b>{approve.length}</b><small>Zum Freigeben</small></button>
  </div>
  <Section title={'Team ('+(agents.length+people.length)+')'} end={<button className="ui-link" onClick={()=>setHiring(true)}>+ Einstellen</button>}>
   {agents.map(a=><button key={a.id} className="ui-row" onClick={()=>setProfile(a.id)}><Face agent={a} size={36}/><span className="ui-row-text"><b>{a.name}</b><small>{jobOf(a).title} · {jobOf(a).does}</small></span></button>)}
   {people.map(m=>{const line=<><Face name={m.name} size={36}/><span className="ui-row-text"><b>{m.name}{m.id===me.id?' (du)':''}</b><small>{roleText(roles?.members.find(x=>x.id===m.id)?.roles,roles?.members.find(x=>x.id===m.id)?.owner)}{m.id!==me.id?' · privat schreiben':''}</small></span></>;
    return m.id===me.id?<div key={m.id} className="ui-row static">{line}</div>:<button key={m.id} className="ui-row" onClick={()=>go({info:false,chat:'member:'+m.id})}>{line}</button>;})}
   {admin&&<button className="ui-link" onClick={()=>{go({page:'account',project:''});setTimeout(()=>document.getElementById('invite')?.scrollIntoView(),400);}}>+ Mensch einladen</button>}
  </Section>
  <CodeSetup studio={studio} admin={admin}/>
  {(room.neighbours?.length||room.meta.scope?.length)?<Scope studio={studio} admin={admin} onSave={scope=>saveProject({scope})}/>:null}
  <Knowledge studio={studio}/>
  <Rules studio={studio} admin={admin}/>
  {!desktop&&<div className="ui-pad"/>}
  {hiring&&<HireDialog studio={studio} onClose={()=>setHiring(false)}/>}
  {profile&&<ProfileDialog studio={studio} agentId={profile} onClose={()=>setProfile('')}/>}
  {renaming&&<Rename title={room.project.title} goal={room.project.description} onClose={()=>setRenaming(false)} onSave={(title,description)=>saveProject({title,description}).then(()=>setRenaming(false))}/>}
 </section>;
}
const roleNames:Record<Role,string>={admin:'Admin',developer:'Entwickler',reviewer:'Prüfer',viewer:'Zuschauer'};
function roleText(roles:Role[]|undefined,owner?:boolean){if(owner)return 'Inhaber';const list=(roles??[]).map(r=>roleNames[r]);return list.length?list.join(', '):'Mitglied';}

function Rename({title,goal,onClose,onSave}:{title:string;goal:string;onClose:()=>void;onSave:(t:string,g:string)=>Promise<void>}){
 const [t,setT]=useState(title),[g,setG]=useState(goal);
 return <Dialog title="Projekt umbenennen" onClose={onClose}><form className="ui-form" onSubmit={e=>{e.preventDefault();void onSave(t.trim(),g.trim());}}>
  <Field label="Name"><input value={t} onChange={e=>setT(e.target.value)} required maxLength={160}/></Field>
  <Field label="Ziel"><textarea rows={3} value={g} onChange={e=>setG(e.target.value)} maxLength={1000}/></Field>
  <div className="ui-actions"><button type="button" className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={!t.trim()}>Speichern</button></div>
 </form></Dialog>;
}

// ---- Code: four steps with check marks, each one button ---------------------------------------
type Github={app:{configured:boolean;canCreate:boolean};access:{repository:string|null;base:string;access:boolean;protected:boolean|null}};
type Plan={revision:string;label:string;state:'proposed'|'needs_configuration'|'missing_tools';notes:string[];tools:{program:string;available:boolean}[];
 configuration:{check:string[];preview?:{build:string[];directory:string}|{serve:{argv:string[];port:number}}}|null};

async function waitJob(id:string){
 for(let i=0;i<900;i++){const {job}=await api<{job:{status:string;result?:Record<string,unknown>&{error?:string}}}>('/api/development/job?id='+q(id));
  if(job.status==='completed')return job.result??{};if(!['queued','running','cancelling'].includes(job.status))throw new Error(job.result?.error??'Das hat auf dem Server nicht geklappt.');
  await new Promise(r=>setTimeout(r,1500));}
 throw new Error('Der Server antwortet nicht. Bitte später nochmal.');
}
/** Back from GitHub: one sentence, and the marker leaves the address. */
function githubReturn(){
 const p=new URLSearchParams(location.search);if(!p.get('github_app')&&!p.get('github_app_error'))return '';
 history.replaceState(null,'',returnHere());
 return p.get('github_app_error')?'GitHub hat den Vorgang nicht abgeschlossen. Bitte nochmal.':'GitHub ist verbunden.';
}
function returnHere(){const url=new URL(location.href);url.searchParams.delete('github_app');url.searchParams.delete('github_app_error');return url.pathname+url.search;}

function CodeSetup({studio,admin}:{studio:Studio;admin:boolean}){
 const {room,resources,me}=studio;
 const project=room!.project.id,meta=room!.meta;
 const [github,setGithub]=useState<Github|null>(null),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(githubReturn);
 const [repo,setRepo]=useState(meta.repository??''),[plan,setPlan]=useState<Plan|null>(null),[open,setOpen]=useState(false),[how,setHow]=useState(meta.liveHow??'');
 const [kinds,setKinds]=useState<Record<string,string>>({});
 useEffect(()=>{let alive=true;
  Promise.all([api<Github['app']>('/api/github-app'),api<Github['access']>('/api/github-app/access?project='+q(project))]).then(([app,access])=>{if(alive)setGithub({app,access});})
   .catch(()=>{if(alive)setGithub({app:{configured:false,canCreate:false},access:{repository:null,base:'main',access:false,protected:null}});});
  api<{executors:{id:string;kind:string}[]}>('/api/executors?project='+q(project)).then(d=>{if(alive)setKinds(Object.fromEntries(d.executors.map(e=>[e.id,e.kind])));}).catch(()=>{});
  return()=>{alive=false;};},[project,meta.repository]);
 // Where the team works: today the server. A PC can become a second place later without changing this screen.
 const ownServer=resources.find((r:Resource)=>r.owner===me.id&&r.online&&kinds[r.device]==='server')??null;
 const ready=serverFor(resources,project,me.id);
 const pending=resources.find(r=>r.online&&r.development?.some(p=>p.id===project&&!p.readiness?.ready));
 const appPossible=!!github&&(github.app.configured||github.app.canCreate);
 const code=!!meta.repository&&(!!github?.access.access||!appPossible);
 const serverOk=!!ready,live=!!meta.live;
 async function step(label:string,fn:()=>Promise<unknown>){setBusy(label);setError('');setNotice('');try{await fn();await studio.reload();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
 async function github_(kind:'create'|'install'){
  if(kind==='create'){const {action,manifest}=await api<{action:string;manifest:string}>('/api/github-app/create',{returnTo:returnHere()});
   const form=document.createElement('form');form.method='post';form.action=action;const f=document.createElement('input');f.type='hidden';f.name='manifest';f.value=manifest;form.appendChild(f);document.body.appendChild(form);form.submit();}
  else{const {url}=await api<{url:string}>('/api/github-app/install',{returnTo:returnHere()});location.assign(url);}
 }
 async function prepare(){
  if(!ownServer)throw new Error('Den Server bereitet der Inhaber vor.');
  const planned=await waitJob((await api<{id:string}>('/api/team/project-connect',{project,device:ownServer.device,mode:'plan',automatic:true,workflow:meta.workflow??'pull-request'})).id) as {setupPlan?:Plan};
  if(!planned.setupPlan)throw new Error('Der Server kennt diesen Schritt noch nicht.');
  setPlan(planned.setupPlan);
 }
 async function apply(){
  if(!ownServer||!plan)return;
  const applied=await waitJob((await api<{id:string}>('/api/team/project-connect',{project,device:ownServer.device,mode:'apply',automatic:true,publish:false,allowCodex:false,workflow:meta.workflow??'pull-request',expectedPlan:plan.revision})).id) as {configured?:boolean};
  if(applied.configured!==true)throw new Error('Der Server hat die Einrichtung nicht bestätigt.');
  setPlan(null);setNotice('Gespeichert. Jetzt prüft ein Probelauf, ob Tests und Vorschau laufen. Das dauert ein paar Minuten.');
  await studio.reload();
  await waitJob((await api<{id:string}>('/api/development',{action:'job',operation:'probe',device:ownServer.device,project})).id);
  setNotice('');
 }
 async function chooseLive(value:'merge'|'manual',liveHow?:string){await api('/api/team',{action:'live',project,revision:meta.revision,live:value,...(liveHow!==undefined?{liveHow}:{})});}
 const done=[code,serverOk,live].filter(Boolean).length;
 if(done===3&&!open)return <Section title="Code" end={admin?<button className="ui-link" onClick={()=>setOpen(true)}>Ändern</button>:undefined}>
  <p className="ui-fact"><Check/> {github?.access.repository??meta.repository?.replace('https://github.com/','')} · Server bereit · {meta.live==='merge'?'geht von selbst live':'ihr schaltet selbst live'}</p>
 </Section>;
 const item=(ok:boolean,n:number,title:string,body:React.ReactNode)=><li className={ok?'ok':''}><span className="ui-step">{ok?<Check/>:n}</span><div><b>{title}</b>{body}</div></li>;
 return <Section title={'Code verbinden · '+done+' von 3'}>
  {notice&&<p className="ui-note" role="status">{notice}</p>}<ErrorLine text={error}/>
  <ol className="ui-checklist">
   {item(code,1,'Mit GitHub verbinden',code?<p className="ui-muted">Studio arbeitet mit {github?.access.repository??meta.repository?.replace('https://github.com/','')}.</p>
    :!admin?<p className="ui-muted">Macht der Projekt-Admin.</p>
    :!meta.repository?<><form className="ui-inline" onSubmit={e=>{e.preventDefault();void step('repo',()=>api('/api/room',{action:'repository',project,url:repo.trim(),revision:meta.revision}));}}>
      <input value={repo} onChange={e=>setRepo(e.target.value)} placeholder="https://github.com/name/projekt" aria-label="Adresse des Codes auf GitHub"/><button className="ui-btn primary" disabled={!!busy||!repo.trim()}>Verbinden</button></form>
      <p className="ui-muted">Noch kein Code? <a href="https://github.com/new" target="_blank" rel="noreferrer">Leg auf GitHub ein leeres Repository an</a> (privat, mit README) und trag die Adresse hier ein.</p></>
    :github?.app.configured?<><p className="ui-muted">GitHub muss Studio einmal Zugriff auf {meta.repository.replace('https://github.com/','')} geben.</p><button className="ui-btn primary" disabled={!!busy} onClick={()=>void step('gh',()=>github_('install'))}>Zugriff bei GitHub erlauben</button></>
    :github?.app.canCreate?<><p className="ui-muted">Einmalig meldet sich Studio bei GitHub an. GitHub zeigt dir vorher, was Studio darf.</p><button className="ui-btn primary" disabled={!!busy} onClick={()=>void step('gh',()=>github_('create'))}>Mit GitHub verbinden</button></>
    :<p className="ui-muted">Der Inhaber verbindet Studio einmal mit GitHub.</p>)}
   {item(serverOk,2,'Server vorbereiten',serverOk?<p className="ui-muted">Tests und Vorschau laufen auf dem Server.</p>
    :!code?<p className="ui-muted">Kommt nach GitHub.</p>
    :!ownServer?<p className="ui-muted">{pending?'Der Probelauf läuft oder steht noch aus.':'Den Server bereitet der Inhaber vor.'}</p>
    :plan?<div><p className="ui-muted">{plan.state==='proposed'?'Studio hat erkannt: '+describePlan(plan):plan.state==='missing_tools'?'Auf dem Server fehlen Programme: '+plan.tools.filter(t=>!t.available).map(t=>t.program).join(', '):'Studio konnte Tests und Vorschau nicht von selbst erkennen. Lege im Repository eine Datei studio.project.json an oder frag Otto, sie zu schreiben.'}</p>
      {plan.notes.map((n,i)=><small key={i} className="ui-muted">{n}</small>)}
      {plan.state==='proposed'&&<button className="ui-btn primary" disabled={!!busy} onClick={()=>void step('apply',apply)}>{busy==='apply'?'Probelauf läuft …':'So übernehmen und testen'}</button>}</div>
    :<><p className="ui-muted">Studio schaut sich den Code an und findet Testbefehl und Vorschau selbst. Danach prüft ein Probelauf, ob alles läuft.</p>
      <button className="ui-btn primary" disabled={!!busy} onClick={()=>void step('plan',prepare)}>{busy==='plan'?'Wird angeschaut …':pending?'Nochmal prüfen':'Server vorbereiten'}</button></>)}
   {item(live,3,'Wie geht es live?',admin?<div className="ui-choice" role="radiogroup" aria-label="Wie kommt eine Änderung online?">
    <button role="radio" aria-checked={meta.live==='manual'} disabled={!!busy} onClick={()=>void step('live',()=>chooseLive('manual'))}><b>Wir schalten selbst live</b><small>Nach dem Übernehmen macht es jemand aus dem Team.</small></button>
    <button role="radio" aria-checked={meta.live==='merge'} disabled={!!busy} onClick={()=>void step('live',()=>chooseLive('merge'))}><b>Geht von selbst live</b><small>Wenn euer Hoster jede übernommene Änderung selbst veröffentlicht.</small></button>
   </div>:<p className="ui-muted">{meta.live==='merge'?'Geht von selbst live.':meta.live==='manual'?'Ihr schaltet selbst live.':'Legt der Projekt-Admin fest.'}</p>)}
  </ol>
  {admin&&meta.live==='manual'&&<form className="ui-inline" onSubmit={e=>{e.preventDefault();void step('live',()=>chooseLive('manual',how.trim()));}}>
   <input value={how} onChange={e=>setHow(e.target.value)} maxLength={300} placeholder="Wie genau? z. B. Marco startet das Update" aria-label="Wie ihr live geht"/><button className="ui-btn" disabled={how.trim()===(meta.liveHow??'')}>Speichern</button></form>}
  <CodeSignIn studio={studio} compact/>
  {open&&<button className="ui-link" onClick={()=>setOpen(false)}>Zuklappen</button>}
 </Section>;
}
function describePlan(plan:Plan){
 const c=plan.configuration;if(!c)return plan.label;
 const preview=c.preview&&'build' in c.preview?'Vorschau aus „'+c.preview.directory+'“':c.preview&&'serve' in c.preview?'Vorschau als laufende App':'keine Vorschau';
 return 'Tests mit „'+c.check.join(' ')+'“, '+preview+'.';
}

function Scope({studio,admin,onSave}:{studio:Studio;admin:boolean;onSave:(scope:string[])=>Promise<void>}){
 const room=studio.room!;const [text,setText]=useState((room.meta.scope??[]).join('\n'));
 return <Section title="Bereich">
  <p className="ui-muted">Mehrere Projekte arbeiten im selben Code. Dieses Projekt ist zuständig für: {(room.meta.scope??[]).join(', ')||'alles'}.</p>
  {room.neighbours?.map(n=><p key={n.id} className="ui-muted">Gleicher Code wie „{n.title}“ ({n.scope.join(', ')||'alles'}).</p>)}
  {admin&&<form className="ui-form" onSubmit={e=>{e.preventDefault();void onSave(text.split(/\n|,/).map(s=>s.trim()).filter(Boolean).map(s=>s.endsWith('/')||s.includes('.')?s:s+'/'));}}>
   <Field label="Ordner, einer pro Zeile" hint="z. B. frontend/"><textarea rows={2} value={text} onChange={e=>setText(e.target.value)}/></Field><button className="ui-btn">Speichern</button></form>}
 </Section>;
}

function Knowledge({studio}:{studio:Studio}){
 const room=studio.room!,notes=room.notes.filter(n=>!n.archived);
 const [open,setOpen]=useState(''),[adding,setAdding]=useState(false),[title,setTitle]=useState(''),[body,setBody]=useState(''),[error,setError]=useState('');
 const [id,setId]=useState(newId);
 async function add(e:React.FormEvent){e.preventDefault();setError('');try{await api('/api/room',{action:'note',id,project:room.project.id,title:title.trim(),body:body.trim(),kind:'note'});setAdding(false);setTitle('');setBody('');setId(newId());await studio.reload();}catch(err){setError((err as Error).message);}}
 return <Section title="Wissen" end={<button className="ui-link" onClick={()=>setAdding(true)}>+ Dokument</button>}>
  {!notes.length&&<p className="ui-muted">Dokumente, die das Team kennen soll: Zielgruppe, Regeln, Zugangsinfos ohne Passwörter. Die Agenten lesen sie mit.</p>}
  {notes.map(n=><div key={n.id} className="ui-note-item"><button className="ui-row" onClick={()=>setOpen(o=>o===n.id?'':n.id)}><span className="ui-row-text"><b>{n.title}</b><small>{n.kind==='decision'?'Entscheidung':'Dokument'}</small></span></button>{open===n.id&&<p className="ui-note-body">{n.body}</p>}</div>)}
  {adding&&<Dialog title="Dokument" onClose={()=>setAdding(false)}><form className="ui-form" onSubmit={add}>
   <Field label="Titel"><input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160}/></Field>
   <Field label="Inhalt"><textarea rows={8} value={body} onChange={e=>setBody(e.target.value)} required maxLength={12000}/></Field>
   <ErrorLine text={error}/><div className="ui-actions"><button type="button" className="ui-btn" onClick={()=>setAdding(false)}>Abbrechen</button><button className="ui-btn primary" disabled={!title.trim()||!body.trim()}>Speichern</button></div>
  </form></Dialog>}
 </Section>;
}

function Rules({studio,admin}:{studio:Studio;admin:boolean}){
 const {roles,room}=studio;const [error,setError]=useState(''),[busy,setBusy]=useState(false),[open,setOpen]=useState(false);
 if(!roles)return null;
 async function save(body:unknown){setBusy(true);setError('');try{await api('/api/project-roles',body);await studio.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const project=room!.project.id;
 return <Section title="Wer darf was" end={admin?<button className="ui-link" onClick={()=>setOpen(o=>!o)}>{open?'Fertig':'Ändern'}</button>:undefined}>
  <p className="ui-muted">{roles.review==='second'?'Eine zweite Person gibt jede Änderung frei.':'Der Admin darf allein freigeben.'}</p>
  {open&&<>
   <div className="ui-choice" role="radiogroup" aria-label="Freigabe">
    <button role="radio" aria-checked={roles.review==='second'} disabled={busy} onClick={()=>void save({action:'review',project,review:'second'})}><b>Zweite Person gibt frei</b><small>Sicherer: niemand gibt die eigene Änderung frei.</small></button>
    <button role="radio" aria-checked={roles.review==='admin-alone'} disabled={busy} onClick={()=>void save({action:'review',project,review:'admin-alone'})}><b>Admin darf allein freigeben</b><small>Für kleine Teams.</small></button>
   </div>
   {roles.members.filter(m=>!m.owner).map(m=><div key={m.id} className="ui-roles"><b>{m.name}</b>{(['admin','developer','reviewer'] as Role[]).map(r=><label key={r}>
    <input type="checkbox" checked={m.roles.includes(r)} disabled={busy} onChange={e=>void save({action:'roles',project,member:m.id,roles:e.target.checked?[...m.roles,r]:m.roles.filter(x=>x!==r)})}/>{roleNames[r]}</label>)}</div>)}
  </>}
  <ErrorLine text={error}/>
 </Section>;
}
