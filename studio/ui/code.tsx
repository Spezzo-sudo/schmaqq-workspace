import {useEffect,useRef,useState} from 'react';
import type {Studio} from './app';
import {api,q,type Resource} from './api';
import {serverFor} from './task';
import {ErrorLine,Section} from './parts';
import {START_WITHOUT_TESTS,setupRequest} from './model';

// "Code" in the project info: one question, "Wo liegt euer Code?". Everything after it Studio does by itself:
// it sets up the team's workplace on the server (recognises tests and preview, runs a trial) and only speaks up
// when something needs a person. How changes go online and the personal ChatGPT sign-in are asked later, when needed.

type Github={app:{configured:boolean;canCreate:boolean};access:{repository:string|null;access:boolean}};
type Plan={revision:string;state:'proposed'|'needs_configuration'|'missing_tools';tools:{program:string;available:boolean}[]};

async function waitJob(id:string){
 for(let i=0;i<900;i++){const {job}=await api<{job:{status:string;result?:Record<string,unknown>&{error?:string}}}>('/api/development/job?id='+q(id));
  if(job.status==='completed')return job.result??{};if(!['queued','running','cancelling'].includes(job.status))throw new Error(job.result?.error??'Das hat auf dem Server nicht geklappt.');
  await new Promise(r=>setTimeout(r,1500));}
 throw new Error('Der Server antwortet nicht. Bitte später nochmal.');
}
/** Technical messages from git or the server, said in plain words; unknown ones stay as they are. */
export function plainError(message:string){
 if(/Remote branch \S+ not found|repository is empty/i.test(message))return 'Das Repository ist noch ganz leer. Studio konnte die erste Datei nicht anlegen. Leg auf GitHub einmal eine README an und tippe dann „Nochmal“.';
 if(/Authentication failed|could not read Username|Permission denied|403/i.test(message))return 'Studio darf noch nicht auf diesen Code zugreifen. Prüfe auf GitHub, ob die Studio-App das Repository sehen darf.';
 if(/not found|Repository not found|404/i.test(message))return 'Diesen Code findet Studio auf GitHub nicht. Stimmt die Adresse?';
 if(/timeout|timed out|ETIMEDOUT|nicht erreichbar/i.test(message))return 'GitHub oder der Server antwortet gerade nicht. Bitte gleich nochmal.';
 return message;
}
function returnHere(){const url=new URL(location.href);url.searchParams.delete('github_app');url.searchParams.delete('github_app_error');return url.pathname+url.search;}
function githubReturn(){
 const p=new URLSearchParams(location.search);if(!p.get('github_app')&&!p.get('github_app_error'))return '';
 history.replaceState(null,'',returnHere());
 return p.get('github_app_error')?'GitHub hat den Vorgang nicht abgeschlossen. Bitte nochmal.':'';
}

export function CodeSection({studio,admin}:{studio:Studio;admin:boolean}){
 const {room,resources,me}=studio;
 const project=room!.project.id,meta=room!.meta;
 const [github,setGithub]=useState<Github|null>(null),[kinds,setKinds]=useState<Record<string,string>>({});
 const [choice,setChoice]=useState<'new'|'existing'|''>(''),[repo,setRepo]=useState(''),[error,setError]=useState(githubReturn);
 const [phase,setPhase]=useState<'idle'|'working'|'no-tests'>('idle');
 useEffect(()=>{let alive=true;
  Promise.all([api<Github['app']>('/api/github-app'),api<Github['access']>('/api/github-app/access?project='+q(project))]).then(([app,access])=>{if(alive)setGithub({app,access});})
   .catch(()=>{if(alive)setGithub({app:{configured:false,canCreate:false},access:{repository:null,access:false}});});
  api<{executors:{id:string;kind:string}[]}>('/api/executors?project='+q(project)).then(d=>{if(alive)setKinds(Object.fromEntries(d.executors.map(e=>[e.id,e.kind])));}).catch(()=>{});
  return()=>{alive=false;};},[project,meta.repository]);

 const name=github?.access.repository??meta.repository?.replace('https://github.com/','')??'';
 const appPossible=!!github&&(github.app.configured||github.app.canCreate);
 const reachable=!!meta.repository&&(!!github?.access.access||!!github&&!appPossible);
 const server=resources.find((r:Resource)=>r.owner===me.id&&r.online&&kinds[r.device]==='server')??null;
 const entry=(r:Resource)=>r.development?.find(p=>p.id===project);
 const ready=!!serverFor(resources,project,me.id);
 const configured=resources.find(r=>r.online&&entry(r));
 const probe=configured?entry(configured)?.readiness?.probe:null;

 async function setup(configuration?:object,emptyTried=false):Promise<void>{
  if(!server)return;
  setPhase('working');setError('');
  try{
   const base={project,device:server.device,workflow:meta.workflow,configuration};
   const planned=await waitJob((await api<{id:string}>('/api/team/project-connect',setupRequest({...base,mode:'plan'}))).id) as {setupPlan?:Plan};
   const plan=planned.setupPlan;if(!plan)throw new Error('Der Server kennt diesen Schritt noch nicht.');
   if(plan.state==='needs_configuration'){setPhase('no-tests');return;}
   if(plan.state==='missing_tools')throw new Error('Auf dem Server fehlen Programme: '+plan.tools.filter(t=>!t.available).map(t=>t.program).join(', ')+'.');
   const applied=await waitJob((await api<{id:string}>('/api/team/project-connect',setupRequest({...base,mode:'apply',expectedPlan:plan.revision}))).id) as {configured?:boolean};
   if(applied.configured!==true)throw new Error('Der Server hat die Einrichtung nicht bestätigt.');
   await studio.reload();
   await waitJob((await api<{id:string}>('/api/development',{action:'job',operation:'probe',device:server.device,project})).id);
   await studio.reload();setPhase('idle');
  }catch(e){
   const message=(e as Error).message;
   // A brand-new repository without any file has no branch yet: Studio writes a first README and tries once more.
   if(!emptyTried&&/Remote branch \S+ not found|repository is empty|leer/i.test(message)){
    try{await api('/api/github-app/start',{project});return setup(configuration,true);}catch(start){setError(plainError((start as Error).message));setPhase('idle');return;}
   }
   setError(plainError(message));setPhase('idle');
  }
 }
 // Once the code is reachable, the admin's own server sets up the workplace without being asked; once per visit.
 const started=useRef(false);
 useEffect(()=>{
  if(started.current||!admin||!reachable||ready||!server||configured||phase!=='idle'||error)return;
  started.current=true;void Promise.resolve().then(()=>setup());
 });

 async function connect(e:React.FormEvent){
  e.preventDefault();setError('');
  try{await api('/api/room',{action:'repository',project,url:repo.trim(),revision:meta.revision});await studio.reload();}catch(err){setError((err as Error).message);}
 }
 async function allowGithub(kind:'create'|'install'){
  try{
   if(kind==='create'){const {action,manifest}=await api<{action:string;manifest:string}>('/api/github-app/create',{returnTo:returnHere()});
    const form=document.createElement('form');form.method='post';form.action=action;const f=document.createElement('input');f.type='hidden';f.name='manifest';f.value=manifest;form.appendChild(f);document.body.appendChild(form);form.submit();}
   else{const {url}=await api<{url:string}>('/api/github-app/install',{returnTo:returnHere()});location.assign(url);}
  }catch(e){setError((e as Error).message);}
 }

 // 1. No code yet: the one question.
 if(!meta.repository)return <Section title="Code">
  {!admin?<p className="ui-muted">Wo der Code liegt, legt der Projekt-Admin fest.</p>:<>
   <p><b>Wo liegt euer Code?</b></p>
   <div className="ui-choice" role="radiogroup" aria-label="Wo liegt euer Code?">
    <button role="radio" aria-checked={choice==='new'} onClick={()=>setChoice('new')}><b>Neu anfangen</b><small>Noch kein Code. Das Team baut von Grund auf.</small></button>
    <button role="radio" aria-checked={choice==='existing'} onClick={()=>setChoice('existing')}><b>Vorhandener Code</b><small>Der Code liegt schon auf GitHub.</small></button>
   </div>
   {choice&&<form className="ui-form" onSubmit={connect}>
    {choice==='new'&&<p className="ui-muted">Leg auf GitHub ein <a href="https://github.com/new" target="_blank" rel="noreferrer">leeres Repository</a> an (privat, mit README) und trag die Adresse hier ein.</p>}
    <div className="ui-inline"><input value={repo} onChange={e=>setRepo(e.target.value)} placeholder="https://github.com/name/projekt" aria-label="GitHub-Adresse"/><button className="ui-btn primary" disabled={!repo.trim()}>Verbinden</button></div>
   </form>}
  </>}
  <ErrorLine text={error}/>
 </Section>;

 // 2. GitHub still has to allow Studio in.
 if(github&&!reachable)return <Section title="Code">
  <p className="ui-fact">{name}</p>
  {!admin?<p className="ui-muted">GitHub muss Studio noch Zugriff geben. Das macht der Projekt-Admin.</p>
   :github.app.configured?<><p className="ui-muted">GitHub muss Studio einmal Zugriff auf diesen Code geben.</p><button className="ui-btn primary" onClick={()=>void allowGithub('install')}>Zugriff bei GitHub erlauben</button></>
   :<><p className="ui-muted">Einmalig meldet sich Studio bei GitHub an. GitHub zeigt dir vorher, was Studio darf.</p><button className="ui-btn primary" onClick={()=>void allowGithub('create')}>Mit GitHub verbinden</button></>}
  <ErrorLine text={error}/>
 </Section>;

 // 3. The workplace: set up by itself; a person is needed only without tests or after an error.
 const working=phase==='working'||probe?.state==='running';
 const status=ready?'Arbeitsplatz bereit':working?'Arbeitsplatz wird eingerichtet …':phase==='no-tests'?'Noch keine Tests gefunden':error||probe?.state==='failed'?'Einrichten hat nicht geklappt':!server?'Arbeitsplatz richtet der Inhaber ein':'Arbeitsplatz noch nicht eingerichtet';
 return <Section title="Code" end={admin&&ready&&server&&!working?<button className="ui-link" onClick={()=>void setup()}>Neu einrichten</button>:undefined}>
  <p className="ui-fact"><span className={'ui-dot '+(ready?'ok':working?'work':phase==='no-tests'?'approve':error||probe?.state==='failed'?'fail':'idle')}/>{name} · {status}</p>
  {working&&<p className="ui-muted">Studio schaut sich euren Code an und richtet ein, wie Änderungen geprüft und angezeigt werden. Das dauert ein paar Minuten.</p>}
  {phase==='no-tests'&&<><p className="ui-muted">Das Team kann trotzdem anfangen; Änderungen schaust du dann selbst an. Sobald es Tests gibt, tippe hier auf „Neu einrichten“.</p>
   <button className="ui-btn primary" onClick={()=>void setup(START_WITHOUT_TESTS)}>So anfangen</button></>}
  {!working&&!ready&&!error&&probe?.state==='failed'&&<><p className="ui-muted">{plainError(probe.error??'Beim Einrichten ist etwas schiefgegangen.')}</p>{admin&&server&&<button className="ui-btn" onClick={()=>void setup()}>Nochmal</button>}</>}
  <ErrorLine text={error}/>{error&&admin&&server&&!working&&<button className="ui-btn" onClick={()=>void setup()}>Nochmal</button>}
  <ResultLine studio={studio} admin={admin}/>
 </Section>;
}

/** Where the result can be seen: at our place (fixed address) or put online by the team. Changeable at any time. */
function ResultLine({studio,admin}:{studio:Studio;admin:boolean}){
 const room=studio.room!,meta=room.meta,show=room.showcase;
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function call(body:object){setBusy(true);setError('');try{await api('/api/team',body);await studio.reload();setOpen(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const choose=(live:'show'|'manual')=>call({action:'live',project:room.project.id,revision:meta.revision,live});
 const text=meta.live==='show'?'bei uns ansehen':meta.live==='manual'?'wir stellen es selbst online':meta.live==='merge'?'geht von selbst online':'noch offen (wird beim ersten Übernehmen gefragt)';
 return <div className="ui-result">
  <p className="ui-fact">Ergebnis: {text}{admin&&<button className="ui-link" onClick={()=>setOpen(o=>!o)}>{open?'fertig':'ändern'}</button>}</p>
  {meta.live==='show'&&<p className="ui-muted">{show?.building?'Wird gebaut …':show?.error?show.error:show?.url?<a href={show.url} target="_blank" rel="noreferrer">{show.url.replace(/^https?:\/\//,'')}</a>:'Kommt nach dem ersten Übernehmen.'}</p>}
  {open&&<>
   <div className="ui-choice" role="radiogroup" aria-label="Wo soll man das Ergebnis sehen?">
    <button role="radio" aria-checked={meta.live==='show'} disabled={busy} onClick={()=>void choose('show')}><b>Bei uns ansehen</b><small>Nach jedem Übernehmen unter einer festen Adresse.</small></button>
    <button role="radio" aria-checked={meta.live==='manual'} disabled={busy} onClick={()=>void choose('manual')}><b>Wir stellen es selbst online</b><small>Danach tippt jemand „Ist jetzt online“.</small></button>
   </div>
   {meta.live==='show'&&<div className="ui-actions left">
    <button className="ui-btn" disabled={busy||show?.building} onClick={()=>void call({action:'showcase',project:room.project.id,op:'rebuild'})}>Neu bauen</button>
    <button className="ui-btn" disabled={busy} onClick={()=>{if(confirm('Neue Adresse erzeugen? Die alte funktioniert dann nicht mehr.'))void call({action:'showcase',project:room.project.id,op:'renew'});}}>Neuer Link</button>
   </div>}
  </>}
  <ErrorLine text={error}/>
 </div>;
}
