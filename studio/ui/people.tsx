import {useState} from 'react';
import type {Studio} from './app';
import {api,newId,type Agent} from './api';
import {Face} from './avatar';
import {FIELD_GUILD_R2_PRESETS} from './avatars';
import {activeAgents,jobOf,JOBS,leadOf,TEAM_LIMIT} from './model';
import {Dialog,ErrorLine,Field} from './parts';

/** The fields the server keeps for an agent; a save sends them all so nothing is lost. */
function agentPayload(agent:Agent,changes:Partial<Agent>){
 const a={...agent,...changes};
 return {action:'agent',id:newId(),project:a.project,agentId:a.id,name:a.name,nickname:a.nickname??'',role:a.role,avatar:a.avatar??'',
  avatarPresetId:a.avatarPresetId??'',avatarPackId:a.avatarPackId??'field-guild-r2',purpose:a.purpose??'',personality:a.personality??'',
  responsibility:a.responsibility??'',model:a.model||'default',capabilities:a.capabilities??['chat'],contextSources:a.contextSources??['messages','tasks','decisions'],
  ...(a.permissions?{permissions:a.permissions}:{}),active:a.active!==false};
}

/** "+ Einstellen": pick a job, the name is suggested. One per job, at most six in the team. */
export function HireDialog({studio,onClose}:{studio:Studio;onClose:()=>void}){
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
   await studio.reload();onClose();if(r.agentId)go({chat:'agent:'+r.agentId});
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Dialog title="Jemanden einstellen" onClose={onClose}>
  {lead&&<button className="ui-row soft" onClick={()=>{onClose();go({chat:'agent:'+lead.id});}}><Face agent={lead} size={36}/><span className="ui-row-text"><b>Lieber die Leitung fragen</b><small>{lead.name} weiß, wer im Team fehlt, und schlägt jemanden vor.</small></span></button>}
  {full?<p className="ui-muted">Das Team ist voll ({TEAM_LIMIT}). Kündige zuerst jemanden im Profil.</p>:<>
   <h3 className="ui-label">Welcher Job?</h3>
   <div className="ui-jobs">{JOBS.map(j=>{const who=taken(j.role);return <button key={j.role} className={'ui-job'+(role===j.role?' on':'')} disabled={!!who}
    onClick={()=>{setRole(j.role);setName(j.name);}}><Face agent={{name:j.name,avatar:'',avatarPresetId:j.face,role:j.role}} size={40}/>
    <span><b>{j.title}</b><small>{who?who.name+' macht das schon.':j.does}</small></span></button>;})}</div>
   {role&&<Field label="Name"><input value={name} onChange={e=>setName(e.target.value)} maxLength={80}/></Field>}
   <ErrorLine text={error}/>
   <div className="ui-actions"><button className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={busy||!role||!name.trim()} onClick={()=>void hire()}>Einstellen</button></div>
  </>}
 </Dialog>;
}

/** An agent's profile: picture, name, job, personality. No models, no permission boxes. */
export function ProfileDialog({studio,agentId,onClose}:{studio:Studio;agentId:string;onClose:()=>void}){
 const {room,go,roles}=studio;
 const agent=(room!.agents??[]).find(a=>a.id===agentId);
 const [name,setName]=useState(agent?.name??''),[personality,setPersonality]=useState(agent?.personality??''),[face,setFace]=useState(agent?.avatarPresetId??'');
 const models=studio.runs.models??[];
 const [model,setModel]=useState(agent?.model??'');
 const [picking,setPicking]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!agent)return null;
 const job=jobOf(agent),admin=roles?.mine.includes('admin')??false;
 const changed=name.trim()!==agent.name||personality.trim()!==(agent.personality??'')||face!==(agent.avatarPresetId??'')||model!==(agent.model??'');
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
  {models.length>0&&<details className="ui-advanced"><summary>Erweitert</summary>
   <Field label="KI-Modell" hint={models.length<2?'Im Moment ist nur eines freigeschaltet.':'Größere denken gründlicher, kosten aber mehr von deinem Kontingent.'}>
    <select value={models.includes(model)?model:models[0]} onChange={e=>setModel(e.target.value)} disabled={models.length<2}>{models.map(m=><option key={m} value={m}>{m}</option>)}</select></Field>
  </details>}
  <ErrorLine text={error}/>
  <div className="ui-actions">
   {admin&&!agent.lead&&<button className="ui-btn danger" disabled={busy} onClick={()=>{if(confirm(agent.name+' kündigen? Das Gespräch bleibt lesbar.'))void save({active:false},true);}}>Kündigen</button>}
   <button className="ui-btn" onClick={()=>{onClose();go({chat:'agent:'+agent.id});}}>Privat schreiben</button>
   <button className="ui-btn primary" disabled={busy||!changed||!name.trim()} onClick={()=>void save({name:name.trim(),personality:personality.trim(),avatarPresetId:face,...(model?{model}:{})})}>Speichern</button>
  </div>
 </Dialog>;
}
