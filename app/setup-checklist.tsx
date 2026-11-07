'use client';
import {useCallback,useEffect,useState} from 'react';
import {ArrowRight,Copy,RefreshCw} from 'lucide-react';
import ProjectStart from './project-start';
import RunnerConnect from './runner-connect';
import DevelopmentResult from './development-result';
import {useJobFollow} from './job-follow';
import {developmentJob} from './development-request';
import {emptyReadiness,readinessFor,type Readiness} from './project-readiness';
import {setupSteps,type SetupState} from './setup-model';
import {jobStateLabel} from './workflow-terms';
import Term from './term';
import type {Device,Job} from './development-model';
import type {TeamWorkspace} from './team-workspaces';

type Props={projects:{id:string;title:string}[];userId:string;initialProject?:string;onProjectChange:(id:string)=>void;onDevelopment:(project:string)=>void;onConnections?:()=>void};
const badge:Record<SetupState,string>={done:'Erledigt',todo:'Offen',attention:'Braucht Aufmerksamkeit',wait:'Läuft',blocked:'Noch gesperrt',optional:'Optional'};
const restart='node selfhost/runner.mjs PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL';

/** One-time setup with live state; the same jobs and helpers as the development view, no new backend. */
export default function SetupChecklist({projects,userId,initialProject,onProjectChange,onDevelopment,onConnections}:Props){
 const [devices,setDevices]=useState<Device[]>([]),[jobs,setJobs]=useState<Job[]>([]),[workspaces,setWorkspaces]=useState<TeamWorkspace[]>([]),[active,setActive]=useState<string[]>([]),[readiness,setReadiness]=useState<Readiness>(emptyReadiness);
 const [loaded,setLoaded]=useState(false),[error,setError]=useState(''),[device,setDevice]=useState(''),[connect,setConnect]=useState(false),[inspect,setInspect]=useState<string|null>(null),[pending,setPending]=useState(false),[copied,setCopied]=useState(false);
 const project=initialProject&&projects.some(p=>p.id===initialProject)?initialProject:projects[0]?.id??'';
 const refresh=useCallback(async()=>{try{const r=await fetch('/api/development');const d=await r.json() as {devices:Device[];jobs:Job[];workspaces:TeamWorkspace[];activeDeviceIds:string[];readiness?:Readiness;error?:string};if(!r.ok)throw new Error(d.error);setDevices(d.devices);setJobs(d.jobs);setWorkspaces(d.workspaces);setActive(d.activeDeviceIds);setReadiness(d.readiness??emptyReadiness);setLoaded(true);setError('');}catch(e){setError(e instanceof Error?e.message:'Einrichtungsstand nicht erreichbar.');}},[]);
 // Live state: a restarted runner or a finished check appears without reloading.
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},5000);return()=>clearInterval(timer);},[refresh]);
 const own=devices.filter(d=>d.owner===userId),online=(d:Device)=>Date.now()-d.seen<30000;
 useEffect(()=>{if(own.length&&!own.some(d=>d.id===device))setDevice((own.find(online)??own[0]).id);},[devices,device]);
 const selected=own.find(d=>d.id===device),personal=readinessFor(readiness,device,project);
 const follow=useJobFollow(inspect,refresh);
 const inspection=personal.inspection?{status:personal.inspection.status,ready:!!personal.inspection.ready}:null;
 const result=setupSteps({hasDevice:own.length>0,online:!!selected&&online(selected),revoked:!!(selected as {revoked?:number}|undefined)?.revoked,projectStatus:personal.projectStatus,inspection,
  hasCopy:workspaces.some(w=>w.owner===userId&&w.project===project&&w.status==='completed'&&!w.archived&&!w.revoked),
  checkPassed:jobs.some(j=>j.owner===userId&&j.project===project&&j.action==='check'&&j.status==='completed'),
  codexReady:personal.codexReady,codexAllowed:!!personal.cap?.allowCodex,publishAllowed:!!personal.cap?.publish});
 const busy=!!selected&&active.includes(selected.id);
 async function startInspect(){if(!selected)return;setPending(true);setError('');try{const r=await fetch('/api/development',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(developmentJob({device:selected.id,project,operation:'inspect'}))});const d=await r.json() as {id:string;error?:string};if(!r.ok)throw new Error(d.error);setInspect(d.id);await refresh();}catch(e){setError(e instanceof Error?e.message:'Git-Prüfung konnte nicht gestartet werden.');}finally{setPending(false);}}
 async function copyRestart(){try{await navigator.clipboard.writeText(restart);setCopied(true);}catch{setCopied(false);setError('Kopieren nicht möglich. Bitte den Befehl markieren und manuell kopieren.');}}
 const restartHelp=<div className="setup-command"><pre>{restart}</pre><button className="button" onClick={()=>void copyRestart()}><Copy size={14}/> Neustartbefehl kopieren</button>{copied&&<p role="status">Kopiert. Ersetze vor dem Ausführen den Dateipfad durch dein vorhandenes Runnerprofil.</p>}<p className="muted">Diese Seite aktualisiert sich alle paar Sekunden. Nach dem Neustart wird der Schritt ohne Neuladen grün.</p></div>;
 function body(id:string,state:SetupState){
  if(state==='done'||state==='blocked')return null;
  if(id==='pc')return state==='todo'||connect?<>{!connect&&<button className="button primary" onClick={()=>setConnect(true)}>PC verbinden</button>}{connect&&<RunnerConnect project={project} projects={projects} onRegistered={async id=>{setDevice(id);await refresh();}} onClose={()=>setConnect(false)}/>}</>:<>{restartHelp}<button className="text-button" onClick={()=>setConnect(true)}>Stattdessen einen neuen PC verbinden</button></>;
  if(id==='project')return state==='todo'?<ProjectStart key={project} project={{id:project,title:projects.find(p=>p.id===project)?.title??'Projekt'}} onComplete={()=>void refresh()}/>:restartHelp;
  if(id==='git')return <>{state!=='wait'&&<button className="button primary" disabled={!selected||!online(selected)||busy||pending} onClick={()=>void startInspect()}><RefreshCw size={15}/> {state==='attention'?'Git erneut prüfen':'Git-Verbindung prüfen'}</button>}{follow.job&&<div className="setup-result"><p><span className="label neutral">{jobStateLabel(follow.job.status)}</span></p>{follow.job.result&&<DevelopmentResult action="inspect" result={follow.job.result}/>}</div>}</>;
  if(id==='trial')return <button className="button primary" onClick={()=>onDevelopment(project)}>Zu den Aufgaben <ArrowRight size={15}/></button>;
  // Personal AI and GitHub accounts are managed in one place: Verbindungen.
  if(id==='ai'&&onConnections)return <button className="text-button" onClick={onConnections}>KI-Konten unter „Verbindungen“ ansehen <ArrowRight size={14}/></button>;
  return null;
 }
 return <>
  <div className="page-heading"><div><div className="eyebrow">EINMAL EINRICHTEN. DANACH EINFACH ARBEITEN.</div><h1>Einrichtung<span className="green-dot">.</span></h1><p>Dein PC, dein Projekt und deine Git-Verbindung. Jeder Schritt zeigt seinen aktuellen Stand.</p></div></div>
  <section className="panel setup-context"><label>Projekt<select aria-label="Projekt für die Einrichtung" value={project} onChange={e=>onProjectChange(e.target.value)}>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>{own.length>1&&<label>Dein PC<select aria-label="PC für die Einrichtung" value={device} onChange={e=>setDevice(e.target.value)}>{own.map(d=><option key={d.id} value={d.id}>{d.name} · {online(d)?'verbunden':'nicht verbunden'}</option>)}</select></label>}<p className="setup-summary" role="status">{!loaded?'Einrichtungsstand wird geladen …':result.complete?'Einrichtung abgeschlossen: 4 von 4 Schritten erledigt.':`${result.done} von ${result.total} Schritten erledigt.`}</p>{loaded&&result.complete&&<button className="button primary" onClick={()=>onDevelopment(project)}>Zu den Aufgaben <ArrowRight size={15}/></button>}</section>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {loaded&&<ol className="setup-steps">{result.steps.map((s,index)=><li key={s.id} className={`panel setup-step ${s.state}${result.current===s.id?' current':''}`} aria-current={result.current===s.id?'step':undefined}><div className="setup-step-head"><span className="setup-step-number">{s.state==='done'?'✓':s.required?index+1:'·'}</span><h2>{s.id==='pc'?<Term name="Runner">{s.label}</Term>:s.id==='git'?<Term name="Git">{s.label}</Term>:s.label}</h2><span className="label neutral">{badge[s.state]}</span></div><p>{s.detail}</p>{body(s.id,s.state)}</li>)}</ol>}
 </>;
}
