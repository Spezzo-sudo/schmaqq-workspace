import {useCallback,useEffect,useState} from 'react';
import type {Studio} from './app';
import {api,newId,q,type Role} from './api';
import {Face,photoOf} from './avatar';
import {jobOf,taskState,teamOrder} from './model';
import {projectTasks} from './project';
import {HireDialog,ProfileDialog} from './people';
import {tileColor} from './start';
import {Bar,Dialog,ErrorLine,Field,More,ScrollHint,Section} from './parts';
import {CodeSection} from './code';
import {InviteLink,InviteRows,projectVisibility,type Invite} from './account';

/** Project info: now, team, code, area, knowledge, who may do what. Settings live here, out of the way of the work. */
export function InfoScreen({studio}:{studio:Studio}){
 const {room,go,roles,desktop}=studio;
 const [hiring,setHiring]=useState(false),[profile,setProfile]=useState(''),[menu,setMenu]=useState(false),[renaming,setRenaming]=useState(false),[error,setError]=useState('');
 if(!room)return null;
 const admin=roles?.mine.includes('admin')??false,tasks=projectTasks(studio),agents=teamOrder(room.agents);
 const open=tasks.filter(t=>t.status!=='done'),mine=open.filter(t=>t.assignee===studio.me.id),approve=open.filter(t=>taskState(t).tone==='approve');
 async function saveProject(changes:{title?:string;description?:string;archived?:boolean;scope?:string[]}){
  setError('');
  try{await api('/api/team',{action:'project',project:room!.project.id,revision:room!.meta.revision,title:room!.project.title,description:room!.project.description,archived:false,
   base:room!.meta.base??'main',workflow:room!.meta.workflow??'pull-request',...changes});await studio.reload();if(changes.archived)go({page:'start',project:''},true);}
  catch(e){setError((e as Error).message);}
 }
 return <section className="ui-screen info">
  <Bar onBack={()=>go({info:false})} title="Projektinfo" end={admin?<button className="ui-icon" aria-label="Mehr" onClick={()=>setMenu(m=>!m)}><More/></button>:undefined}/>
  {menu&&<div className="ui-popover"><button onClick={()=>{setMenu(false);setRenaming(true);}}>Umbenennen</button>
   <button onClick={()=>{setMenu(false);if(confirm('„'+room.project.title+'“ archivieren? Unter „Projekte und Archiv“ lässt es sich wiederherstellen.'))void saveProject({archived:true});}}>Archivieren</button></div>}
  <div className="ui-info-head"><span className="ui-tile big" style={{background:tileColor(room.project.title)}}>{room.project.title.slice(0,2).toUpperCase()}</span>
   <h2>{room.project.title}</h2>{room.project.description&&<p className="ui-muted">{room.project.description}</p>}</div>
  <ErrorLine text={error}/>
  {room.showcase?.url&&<div className="ui-center"><a className="ui-btn primary" href={room.showcase.url} target="_blank" rel="noreferrer">Ansehen ›</a>{room.showcase.building&&<small className="ui-muted"> neue Fassung wird gebaut …</small>}</div>}
  <div className="ui-stats">
   <button onClick={()=>go({info:false,tab:'tasks'})}><b>{open.length}</b><small>Offen</small></button>
   <button onClick={()=>go({info:false,tab:'tasks'})}><b>{mine.length}</b><small>Bei dir</small></button>
   <button onClick={()=>go({info:false,tab:'tasks'})}><b>{approve.length}</b><small>Zum Freigeben</small></button>
  </div>
  <TeamSection key={room.project.id} studio={studio} admin={admin} onHire={()=>setHiring(true)} onProfile={setProfile}/>
  <CodeSection studio={studio} admin={admin}/>
  {(room.neighbours?.length||room.meta.scope?.length)?<Scope studio={studio} admin={admin} onSave={scope=>saveProject({scope})}/>:null}
  <Knowledge studio={studio}/>
  <Rules studio={studio} admin={admin}/>
  {!desktop&&<div className="ui-pad"/>}
  <ScrollHint/>
  {hiring&&<HireDialog studio={studio} onClose={()=>setHiring(false)}/>}
  {profile&&<ProfileDialog studio={studio} agentId={profile} onClose={()=>setProfile('')}/>}
  {renaming&&<Rename title={room.project.title} goal={room.project.description} onClose={()=>setRenaming(false)} onSave={(title,description)=>saveProject({title,description}).then(()=>setRenaming(false))}/>}
 </section>;
}
const peopleRoles={lead:{label:'Leitet das Projekt',roles:['admin']},participant:{label:'Macht mit',roles:['developer','reviewer']},viewer:{label:'Schaut nur zu',roles:['viewer']}} satisfies Record<string,{label:string;roles:Role[]}>;
type PeopleRole=keyof typeof peopleRoles;
function peopleRole(roles:Role[]):PeopleRole{
 return roles.includes('admin')?'lead':roles.includes('developer')||roles.includes('reviewer')?'participant':'viewer';
}

function TeamSection({studio,admin,onHire,onProfile}:{studio:Studio;admin:boolean;onHire:()=>void;onProfile:(id:string)=>void}){
 const {room,roles,me,go}=studio,project=room!.project.id,people=roles?.members.filter(m=>m.roles.length)??[],agents=teamOrder(room!.agents);
 const canManage=admin&&!studio.projects.some(p=>p.id===project&&p.practice);
 const canDevelop=roles?.mine.some(r=>r==='admin'||r==='developer');
 const canWrite=roles?.mine.some(r=>r!=='viewer');
 const [adding,setAdding]=useState(false),[editing,setEditing]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const person=people.find(m=>m.id===editing);
 const leads=people.filter(m=>m.roles.includes('admin')).length;
 async function save(member:string,roles:Role[]){
  await api('/api/project-roles',{action:'roles',project,member,roles});await studio.reload();
 }
 async function change(roles:Role[]){
  if(!person)return;
  setBusy(true);setError('');
  try{await save(person.id,roles);setEditing('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Section title={'Team ('+(agents.length+people.length)+')'} end={canDevelop?<button className="ui-link" onClick={onHire}>+ Einstellen</button>:undefined}>
  {agents.map(a=><button key={a.id} className="ui-row" onClick={()=>onProfile(a.id)}><Face agent={a} size={36}/><span className="ui-row-text"><b>{a.name}</b><small>{jobOf(a).title} · {jobOf(a).does}</small></span></button>)}
  {people.map(m=>{
   const line=<><Face name={m.name} photo={photoOf(room!.members.find(person=>person.id===m.id),project)} size={36}/><span className="ui-row-text"><b>{m.name}{m.id===me.id?' (du)':''}</b><small>{peopleRoles[peopleRole(m.roles)].label}</small></span></>;
   return <div className="ui-team-person" key={m.id}>
    {m.id===me.id||!canWrite?<div className="ui-row static">{line}</div>:<button className="ui-row" aria-label={'Privat schreiben mit '+m.name} onClick={()=>go({info:false,chat:'member:'+m.id})}>{line}</button>}
    {canManage&&<button className="ui-link" aria-label={m.name+' verwalten'} onClick={()=>{setError('');setEditing(m.id);}}>Ändern</button>}
   </div>;
  })}
  {canManage&&<button className="ui-link" onClick={()=>setAdding(true)}>+ Mensch dazunehmen</button>}
  <p className="ui-muted">{projectVisibility}</p>
  {adding&&<AddPerson project={project} available={roles?.members.filter(m=>!m.roles.length)??[]} onAdd={save} onClose={()=>setAdding(false)}/>}
  {person&&<EditPerson key={person.id} name={person.name} role={peopleRole(person.roles)} lastLead={leads===1&&peopleRole(person.roles)==='lead'}
   busy={busy} error={error} onClose={()=>setEditing('')} onChange={change}/>}
 </Section>;
}

function RoleChoice({role,onChange}:{role:PeopleRole;onChange:(role:PeopleRole)=>void}){
 return <Field label="Rolle"><select value={role} onChange={e=>onChange(e.target.value as PeopleRole)}>
  {Object.entries(peopleRoles).map(([id,r])=><option key={id} value={id}>{r.label}</option>)}
 </select></Field>;
}
function EditPerson({name,role,lastLead,busy,error,onClose,onChange}:{name:string;role:PeopleRole;lastLead:boolean;busy:boolean;error:string;onClose:()=>void;onChange:(roles:Role[])=>Promise<void>}){
 const [choice,setChoice]=useState(role);
 return <Dialog title={name} onClose={onClose}>
  <form className="ui-form" onSubmit={e=>{e.preventDefault();void onChange(peopleRoles[choice].roles);}}>
   {lastLead?<p className="ui-muted">Gib zuerst jemand anderem die Projektleitung, wenn du diese Rolle ändern oder die Person herausnehmen willst.</p>:<RoleChoice role={choice} onChange={setChoice}/>}
   <ErrorLine text={error}/>
   <div className="ui-actions"><button type="button" className="ui-btn" onClick={onClose}>{lastLead?'Fertig':'Abbrechen'}</button>
    {!lastLead&&<button className="ui-btn primary" disabled={busy||choice===role}>Speichern</button>}</div>
   {!lastLead&&<button type="button" className="ui-link danger" disabled={busy} onClick={()=>{if(confirm(name+' aus dem Projekt nehmen?'))void onChange([]);}}>Aus dem Projekt nehmen</button>}
  </form>
 </Dialog>;
}

function AddPerson({project,available,onAdd,onClose}:{project:string;available:{id:string;name:string}[];onAdd:(member:string,roles:Role[])=>Promise<void>;onClose:()=>void}){
 const [member,setMember]=useState(''),[role,setRole]=useState<PeopleRole>('participant'),[email,setEmail]=useState(''),[link,setLink]=useState('');
 const [invites,setInvites]=useState<Invite[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>setInvites((await api<{invites:Invite[]}>('/api/invites?project='+q(project))).invites),[project]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 async function act(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Dialog title="Mensch dazunehmen" onClose={onClose}>
  {available.length>0?<form className="ui-form" onSubmit={e=>{e.preventDefault();void act(async()=>{await onAdd(member,peopleRoles[role].roles);onClose();});}}>
   <Field label="Studio-Konto"><select value={member} onChange={e=>setMember(e.target.value)} required>
    <option value="">Person auswählen</option>{available.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
   </select></Field>
   <RoleChoice role={role} onChange={setRole}/>
   <div className="ui-actions left"><button className="ui-btn primary" disabled={busy||!member}>Dazunehmen</button></div>
  </form>:<p className="ui-muted">Alle Studio-Konten sind schon dabei.</p>}
  <Section title="Ins Projekt einladen">
   <form className="ui-form" onSubmit={e=>{e.preventDefault();void act(async()=>{
    const d=await api<{link:string}>('/api/invites',{project,email:email.trim()});setLink(d.link);setEmail('');await load();
   });}}>
    <Field label="Benutzername oder E-Mail"><input value={email} onChange={e=>setEmail(e.target.value)} autoCapitalize="none" required/></Field>
    <div className="ui-actions left"><button className="ui-btn" disabled={busy||!email.trim()}>Einladungslink erstellen</button></div>
   </form>
   {link&&<InviteLink key={link} link={link}/>}
   <InviteRows invites={invites} busy={busy} onWithdraw={id=>void act(async()=>{await api('/api/invites/withdraw',{id,project});setLink('');await load();})}/>
  </Section>
  <ErrorLine text={error}/>
 </Dialog>;
}

function Rename({title,goal,onClose,onSave}:{title:string;goal:string;onClose:()=>void;onSave:(t:string,g:string)=>Promise<void>}){
 const [t,setT]=useState(title),[g,setG]=useState(goal);
 return <Dialog title="Projekt umbenennen" onClose={onClose}><form className="ui-form" onSubmit={e=>{e.preventDefault();void onSave(t.trim(),g.trim());}}>
  <Field label="Name"><input value={t} onChange={e=>setT(e.target.value)} required maxLength={160}/></Field>
  <Field label="Ziel"><textarea rows={3} value={g} onChange={e=>setG(e.target.value)} maxLength={1000}/></Field>
  <div className="ui-actions"><button type="button" className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={!t.trim()}>Speichern</button></div>
 </form></Dialog>;
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
 const canAdd=studio.roles?.mine.some(r=>r==='admin'||r==='developer');
 const [open,setOpen]=useState(''),[adding,setAdding]=useState(false),[title,setTitle]=useState(''),[body,setBody]=useState(''),[error,setError]=useState('');
 const [id,setId]=useState(newId);
 async function add(e:React.FormEvent){e.preventDefault();setError('');try{await api('/api/room',{action:'note',id,project:room.project.id,title:title.trim(),body:body.trim(),kind:'note'});setAdding(false);setTitle('');setBody('');setId(newId());await studio.reload();}catch(err){setError((err as Error).message);}}
 return <Section title="Wissen" end={canAdd?<button className="ui-link" onClick={()=>setAdding(true)}>+ Dokument</button>:undefined}>
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
  <p className="ui-muted">{roles.review==='second'?'Eine zweite Person gibt jede Änderung frei.':'Die Projektleitung darf allein freigeben.'}</p>
  {open&&<>
   <div className="ui-choice" role="radiogroup" aria-label="Freigabe">
    <button role="radio" aria-checked={roles.review==='second'} disabled={busy} onClick={()=>void save({action:'review',project,review:'second'})}><b>Zweite Person gibt frei</b><small>Sicherer: niemand gibt die eigene Änderung frei.</small></button>
    <button role="radio" aria-checked={roles.review==='admin-alone'} disabled={busy} onClick={()=>void save({action:'review',project,review:'admin-alone'})}><b>Projektleitung darf allein freigeben</b><small>Für kleine Teams.</small></button>
   </div>

  </>}
  <ErrorLine text={error}/>
 </Section>;
}
