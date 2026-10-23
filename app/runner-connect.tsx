'use client';
import {useState,type FormEvent} from 'react';
import RunnerSetupPanel from './development-runner-setup';
import type {LocalProfile,Project} from './development-model';

/** Runner registration with optional local profile import; used by development and setup views. */
export default function RunnerConnect({project,projects,onRegistered,onClose}:{project:string;projects:Project[];onRegistered:(device:string)=>Promise<void>|void;onClose:()=>void}){
 const [profile,setProfile]=useState<LocalProfile|null>(null),[config,setConfig]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState('');
 const profileProject=profile?.projects[project]??Object.values(profile?.projects??{})[0];
 async function importProfile(file:File|undefined){if(!file)return;try{const candidate=JSON.parse(await file.text()) as LocalProfile;if(candidate.schema!=='schmaqq-runner-profile/v1'||!candidate.projects||Object.keys(candidate.projects).length>20)throw new Error();for(const p of Object.values(candidate.projects)){if(typeof p.repo!=='string'||typeof p.base!=='string'||!Array.isArray(p.check)||!p.check.length||!p.check.every(v=>typeof v==='string'))throw new Error();}setProfile(candidate);setError('');}catch{setError('Das ist kein gültiges lokales Studio-Projektprofil.');}}
 function download(){const url=URL.createObjectURL(new Blob([config],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='schmaqq-runner.private.json';a.click();URL.revokeObjectURL(url);}
 async function register(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);let check;
  try{check=JSON.parse(String(f.get('check')));if(!Array.isArray(check)||!check.length||!check.every(x=>typeof x==='string'))throw new Error();}catch{setError('Testbefehl als JSON-Argumentliste eingeben, zum Beispiel ["node","--test"].');return;}
  setPending(true);setError('');
  try{
   const r=await fetch('/api/development',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'device',name:f.get('name')})});const d=await r.json() as {error?:string;token?:string;id:string};if(!r.ok)throw new Error(d.error);
   if(d.token){setConfig(JSON.stringify({server:location.origin,token:d.token,stateDir:'.studio-runner',...(profile?.codex?{codex:profile.codex}:{}),projects:{[String(f.get('project'))]:{...profileProject,repo:f.get('repo'),base:f.get('base'),check,allowCodex:profileProject?.allowCodex??false}}},null,2));await onRegistered(d.id);}
  }catch(e){setError(e instanceof Error?e.message:'Runner-Zugang konnte nicht erstellt werden.');}finally{setPending(false);}
 }
 return <>{error&&<div className="form-error" role="alert">{error}</div>}<RunnerSetupPanel profile={profile} profileProject={profileProject} project={project} projects={projects} pending={pending} config={config} onImportProfile={importProfile} onRegister={register} onDownload={download} onClose={()=>{setConfig('');onClose();}}/></>;
}
