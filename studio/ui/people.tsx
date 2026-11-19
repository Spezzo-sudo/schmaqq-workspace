import {useCallback,useEffect,useState} from 'react';
import type {Studio} from './app';
import {api,newId,q,type Agent,type CatalogModel,type Role} from './api';
import {Face} from './avatar';
import {FIELD_GUILD_R2_PRESETS} from './avatars';
import {activeAgents,jobOf,JOBS,leadOf,ROLE_JOBS,TEAM_LIMIT} from './model';
import {Dialog,ErrorLine,Field,Plus,Section} from './parts';
import {InviteLink,InviteRows,type Invite} from './account';

/** The fields the server keeps for an agent; a save sends them all so nothing is lost. */
function agentPayload(agent:Agent,changes:Partial<Agent>){
 const a={...agent,...changes};
 return {action:'agent',id:newId(),project:a.project,agentId:a.id,name:a.name,nickname:a.nickname??'',role:a.role,avatar:a.avatar??'',
  avatarPresetId:a.avatarPresetId??'',avatarPackId:a.avatarPackId??'field-guild-r2',purpose:a.purpose??'',personality:a.personality??'',
  responsibility:a.responsibility??'',model:a.model||'default',effort:a.effort||null,codeModel:a.codeModel||null,codeEffort:a.codeEffort||null,capabilities:a.capabilities??['chat'],contextSources:a.contextSources??['messages','tasks','decisions'],
  ...(a.permissions?{permissions:a.permissions}:{}),active:a.active!==false};
}

export const peopleRoles={lead:{label:'Leitet das Projekt',roles:['admin']},participant:{label:'Macht mit',roles:['developer','reviewer']},viewer:{label:'Schaut nur zu',roles:['viewer']}} satisfies Record<string,{label:string;roles:Role[]}>;
export type PeopleRole=keyof typeof peopleRoles;
export function peopleRole(roles:Role[]):PeopleRole{
 return roles.includes('admin')?'lead':roles.includes('developer')||roles.includes('reviewer')?'participant':'viewer';
}

export function RoleChoice({role,onChange}:{role:PeopleRole;onChange:(role:PeopleRole)=>void}){
 return <Field label="Rolle"><select value={role} onChange={e=>onChange(e.target.value as PeopleRole)}>
  {Object.entries(peopleRoles).map(([id,r])=><option key={id} value={id}>{r.label}</option>)}
 </select></Field>;
}
export async function savePersonRoles(studio:Studio,member:string,roles:Role[]){
 await api('/api/project-roles',{action:'roles',project:studio.room!.project.id,member,roles});
 await studio.reload();
}

export function TeamExpand({studio,inStrip=false}:{studio:Studio;inStrip?:boolean}){
 const [view,setView]=useState<'person'|'agent'|null>(null);
 const {roles,room}=studio,project=room?.project.id;
 if(!project)return null;
 const canInvite=roles?.mine.includes('admin')&&!studio.projects.some(p=>p.id===project&&p.practice);
 const canHire=roles?.mine.some(role=>role==='admin'||role==='developer')&&activeAgents(room?.agents).length<TEAM_LIMIT;
 if(!canInvite&&!canHire)return null;
 const close=()=>setView(null);
 const open=()=>setView(canInvite?'person':'agent');
 const person=canInvite&&(view==='person'||!canHire);
 return <>
  {inStrip?<button className="ui-team-member add" onClick={open}><span className="ui-face add"><Plus/></span><b>Team erweitern</b></button>
   :<button className="ui-link" onClick={open}>+ Team erweitern</button>}
  {view&&<Dialog title="Team erweitern" onClose={close}>
   {canInvite&&canHire&&<div className="ui-chips" role="group" aria-label="Team erweitern">
    <button className={'ui-chip'+(person?' on':'')} aria-pressed={person} onClick={()=>setView('person')}>Person einladen</button>
    <button className={'ui-chip'+(!person?' on':'')} aria-pressed={!person} onClick={()=>setView('agent')}>Agent einstellen</button>
   </div>}
   {person?<InvitePersonForm key={project} project={project} available={roles?.members.filter(m=>!m.roles.length)??[]}
    onAdd={(member,roles)=>savePersonRoles(studio,member,roles)} onClose={close}/>
    :<HireForm studio={studio} onClose={close}/>}
  </Dialog>}
 </>;
}

function InvitePersonForm({project,available,onAdd,onClose}:{project:string;available:{id:string;name:string}[];onAdd:(member:string,roles:Role[])=>Promise<void>;onClose:()=>void}){
 const [member,setMember]=useState(''),[role,setRole]=useState<PeopleRole>('participant'),[email,setEmail]=useState(''),[link,setLink]=useState('');
 const [invites,setInvites]=useState<Invite[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>setInvites((await api<{invites:Invite[]}>('/api/invites?project='+q(project))).invites),[project]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 async function act(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <>
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
    <Field label="E-Mail"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoCapitalize="none" required/></Field>
    <div className="ui-actions left"><button className="ui-btn" disabled={busy||!email.trim()}>Einladungslink erstellen</button></div>
   </form>
   {link&&<InviteLink key={link} link={link}/>}
   <InviteRows invites={invites} busy={busy} onWithdraw={id=>void act(async()=>{await api('/api/invites/withdraw',{id,project});setLink('');await load();})}/>
  </Section>
  <ErrorLine text={error}/>
 </>;
}

/** Agent einstellen: pick a job, the name is suggested. One per job, at most six in the team. */
function HireForm({studio,onClose}:{studio:Studio;onClose:()=>void}){
 const {room,go}=studio;
 const team=activeAgents(room!.agents),lead=leadOf(room!.agents);
 const [role,setRole]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const taken=(r:string)=>team.find(a=>a.role===r&&!a.lead);
 const full=team.length>=TEAM_LIMIT;
 async function hire(){
  const job=JOBS.find(j=>j.role===role);if(!job)return;
  setBusy(true);setError('');
  try{
   const r=await api<{agentId?:string}>('/api/room',{action:'agent',id:newId(),project:room!.project.id,name:name.trim()||job.name,role,avatar:'',avatarPresetId:job.face,
    avatarPackId:'field-guild-r2',purpose:job.title+' im Team. '+job.does,personality:'Sachlich, freundlich, kommt schnell auf den Punkt.',responsibility:job.title,
    model:lead?.model||'default',capabilities:['chat','context-read'],contextSources:['messages','tasks','decisions'],
    permissions:{readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:false},active:true});
   await studio.reload();onClose();if(r.agentId)go({info:false,chat:'agent:'+r.agentId});
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <>
  {lead&&<button className="ui-row soft" onClick={()=>{onClose();go({info:false,chat:'agent:'+lead.id});}}><Face agent={lead} size={36}/><span className="ui-row-text"><b>Lieber die Leitung fragen</b><small>{lead.name} weiß, wer im Team fehlt, und schlägt jemanden vor.</small></span></button>}
  {full?<p className="ui-muted">Das Team ist voll ({TEAM_LIMIT}). Kündige zuerst jemanden im Profil.</p>:<>
   <h3 className="ui-label">Welcher Job?</h3>
   <div className="ui-jobs">{JOBS.map(j=>{const who=taken(j.role);return <button key={j.role} className={'ui-job'+(role===j.role?' on':'')} disabled={!!who}
    onClick={()=>{setRole(j.role);setName(j.name);}}><Face agent={{name:j.name,avatar:'',avatarPresetId:j.face,role:j.role}} size={40}/>
    <span><b>{j.title}</b><small>{who?who.name+' macht das schon.':j.does}</small></span></button>;})}</div>
   {role&&<Field label="Name"><input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></Field>}
   <ErrorLine text={error}/>
   <div className="ui-actions"><button className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={busy||!role||!name.trim()} onClick={()=>void hire()}>Einstellen</button></div>
  </>}
 </>;
}

/** An agent's profile: picture, name, job, personality. No models, no permission boxes. */
export function ProfileDialog({studio,agentId,onClose}:{studio:Studio;agentId:string;onClose:()=>void}){
 const {room,go,roles}=studio;
 const agent=(room!.agents??[]).find(a=>a.id===agentId);
 const [name,setName]=useState(agent?.name??''),[personality,setPersonality]=useState(agent?.personality??''),[face,setFace]=useState(agent?.avatarPresetId??'');
 const catalog=(studio.runs.catalog??[]).filter(m=>m.enabled);
 const [model,setModel]=useState(agent?.model??''),[effort,setEffort]=useState(agent?.effort??''),[codeModel,setCodeModel]=useState(agent?.codeModel??''),[codeEffort,setCodeEffort]=useState(agent?.codeEffort??'');
 const [picking,setPicking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!agent)return null;
 const job=jobOf(agent),admin=roles?.mine.includes('admin')??false;
 const changed=name.trim()!==agent.name||personality.trim()!==(agent.personality??'')||face!==(agent.avatarPresetId??'')||model!==(agent.model??'')
  ||effort!==(agent.effort??'')||codeModel!==(agent.codeModel??'')||codeEffort!==(agent.codeEffort??'');
 const codes=(ROLE_JOBS.code as readonly string[]).includes(agent.role);
 async function save(changes:Partial<Agent>,close=false){
  setBusy(true);setError('');
  try{await api('/api/room',agentPayload(agent!,changes));await studio.reload();if(close)onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Dialog title={agent.name} onClose={onClose}>
  <div className="ui-profile">
   <button className="ui-profile-face" onClick={()=>setPicking(p=>!p)} aria-label="Bild ändern"><Face agent={{...agent,avatarPresetId:face}} size={96}/><small>Bild ändern</small></button>
   {picking&&<div className="ui-faces">{FIELD_GUILD_R2_PRESETS.map(p=><button key={p.id} className={face===p.id?'on':''} onClick={()=>{setFace(p.id);setPicking(false);}} aria-label={p.name}><Face agent={{name:p.name,avatar:'',avatarPresetId:p.id,role:''}} size={48}/></button>)}</div>}
   <p className="ui-job-line"><b>{job.title}</b> · {job.does}</p>
  </div>
  <Field label="Name"><input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></Field>
  <Field label="Persönlichkeit" hint="Wie er schreibt und auftritt."><textarea rows={3} value={personality} onChange={e=>setPersonality(e.target.value)} maxLength={600}/></Field>
  {catalog.length>0&&<details className="ui-advanced"><summary>Erweitert</summary>
   <ModelPick title="Im Gespräch" catalog={catalog} model={model} effort={effort} onModel={setModel} onEffort={setEffort}/>
   {codes&&<ModelPick title="Beim Programmieren" catalog={catalog} model={codeModel} effort={codeEffort} onModel={setCodeModel} onEffort={setCodeEffort} standard="Standard"/>}
   <p className="ui-muted">Stärkere Modelle und höhere Stufen denken gründlicher, kosten aber mehr von deinem Kontingent. Ob dein Zugang ein Modell kennt, zeigt sich beim ersten Einsatz.</p>
  </details>}
  <ErrorLine text={error}/>
  <div className="ui-actions">
   {admin&&!agent.lead&&<button className="ui-btn danger" disabled={busy} onClick={()=>{if(confirm(agent.name+' kündigen? Das Gespräch bleibt lesbar.'))void save({active:false},true);}}>Kündigen</button>}
   <button className="ui-btn" onClick={()=>{onClose();go({chat:'agent:'+agent.id});}}>Privat schreiben</button>
   <button className="ui-btn primary" disabled={busy||!changed||!name.trim()} onClick={()=>void save({name:name.trim(),personality:personality.trim(),avatarPresetId:face,...(model?{model}:{}),effort:effort||null,codeModel:codeModel||null,codeEffort:codeEffort||null})}>Speichern</button>
  </div>
 </Dialog>;
}

const ALL_EFFORTS=['minimal','low','medium','high','xhigh','max','ultra'];
const EFFORT_LABEL:Record<string,string>={minimal:'minimal',low:'niedrig',medium:'mittel',high:'hoch',xhigh:'sehr hoch',max:'maximal',ultra:'ultra'};
/** One model with its thinking level: the catalog as a list, any other name typed in, and only the levels the model has. */
function ModelPick({title,catalog,model,effort,onModel,onEffort,standard}:{title:string;catalog:CatalogModel[];model:string;effort:string;onModel:(v:string)=>void;onEffort:(v:string)=>void;standard?:string}){
 const known=catalog.find(m=>m.id===model);
 const [own,setOwn]=useState(()=>Boolean(model)&&!known);
 const efforts=known?.efforts.length?known.efforts:ALL_EFFORTS;
 return <div className="ui-model-pick">
  <h4>{title}</h4>
  <Field label="KI-Modell">
   <select value={own?'__own':model} onChange={e=>{if(e.target.value==='__own'){setOwn(true);}else{setOwn(false);onModel(e.target.value);const next=catalog.find(m=>m.id===e.target.value);if(effort&&next&&!next.efforts.includes(effort))onEffort('');}}}>
    {standard&&<option value="">{standard}</option>}
    {catalog.map(m=><option key={m.id} value={m.id}>{m.label} – {m.note||m.id}</option>)}
    <option value="__own">Anderer Name …</option>
   </select>
  </Field>
  {own&&<Field label="Modellname" hint="So, wie ihn der Anbieter nennt."><input value={model} onChange={e=>onModel(e.target.value.trim())} maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9_.:/\\-]*"/></Field>}
  <Field label="Denkstufe" hint={known?.defaultEffort?'Standard dieses Modells: '+(EFFORT_LABEL[known.defaultEffort]??known.defaultEffort)+'.':undefined}>
   <select value={effort} onChange={e=>onEffort(e.target.value)}>
    <option value="">Standard</option>
    {efforts.map(v=><option key={v} value={v}>{EFFORT_LABEL[v]??v}</option>)}
   </select>
  </Field>
 </div>;
}
