import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowRight,BookOpen,ChevronRight,Copy,Folder,Hash,Home,ListChecks,LogOut,Menu,MessageSquare,Plus,Search,Settings,UserRound,Users,X} from 'lucide-react';
import {taskSummary} from './task-next-step';
import {humanEvent} from './project-overview-model';
import type {ChatGPTUser} from '../app/chatgpt-auth';
import {hasDrafts,clearDrafts} from '../app/editor-drafts';
import StudioBrand from '../app/studio-brand';
import TeamInvite from '../app/team-invite';
import Connections from '../app/connections';
import RunnerConnect from '../app/runner-connect';
import Executors from '../app/executors';
import ProjectStart from '../app/project-start';
import ProjectReadiness,{emptyReadiness,type Readiness} from '../app/project-readiness';
import ProjectConnect from './project-connect';
import ProjectReady from './project-ready';
import TeamTaskView from './team-task';
import ProjectOverview,{type TaskPane} from './project-overview';
import TeamKnowledge from './team-knowledge';
import {Conversation,ResourceList,RoomModal,type Modal} from './room-components';
import {roomRequest,readRoomRoute,tabs,initials,type Room,type RoomState,type RoomMember,type RoomPage,type RoomRoute,type Resource,type TeamState,type TeamTask,type RoomNote} from './room-model';
import './workspace-room.css';
import './r26-workflow.css';
import './schmaqq-design-system.css';
import './team-workflow.css';
import './schmaqq-convergence.css';
const emptyTeam:TeamState={tasks:[],events:[]};
const areaIcons:Record<string,typeof Home>={overview:Home,tasks:ListChecks,talk:MessageSquare,knowledge:BookOpen,connect:Settings};
export default function TeamWorkspace({user,demoMode=false}:{user:ChatGPTUser;demoMode?:boolean}){
 const [route,setRoute]=useState(readRoomRoute),[rooms,setRooms]=useState<Room[]>([]),[room,setRoom]=useState<RoomState|null>(null),[team,setTeam]=useState<TeamState>(emptyTeam);
 const [resources,setResources]=useState<Resource[]>([]),[members,setMembers]=useState<RoomMember[]>([]),[error,setError]=useState(''),[more,setMore]=useState(false),[connected,setConnected]=useState(false),[search,setSearch]=useState(''),[modal,setModal]=useState<Modal|null>(null);
 const moreTrigger=useRef<HTMLButtonElement|null>(null),moreFirst=useRef<HTMLButtonElement|null>(null),moreLast=useRef<HTMLButtonElement|null>(null),wasMore=useRef(false);
 const activeRoom=useRef(route.room);activeRoom.current=route.room;
 const refresh=useCallback(async()=>{
  try{const selected=activeRoom.current;const [r,a,t,w,p]=await Promise.all([roomRequest<{rooms:Room[]}>('/api/rooms'),roomRequest<{resources:Resource[]}>('/api/ai'),roomRequest<TeamState>('/api/team'),roomRequest<{members:RoomMember[]}>('/api/workspace'),selected?roomRequest<RoomState>('/api/room?project='+encodeURIComponent(selected)):Promise.resolve(null)]);
   setRooms(r.rooms);setResources(a.resources);setTeam(t);setMembers(w.members);if(selected===activeRoom.current)setRoom(p);setConnected(true);setError('');
  }catch(e){setError((e as Error).message);setConnected(false);}
 },[]);
 useEffect(()=>{let running=false;const tick=async()=>{if(running||document.hidden)return;running=true;try{await refresh();}finally{running=false;}};void tick();const timer=setInterval(tick,5000);return()=>clearInterval(timer);},[refresh]);
 useEffect(()=>{setRoom(null);setSearch('');void refresh();},[route.room,refresh]);
 useEffect(()=>{const back=()=>setRoute(readRoomRoute());window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[]);
 function navigate(change:Partial<RoomRoute>){const next={...readRoomRoute(),...change};const url=new URL(location.href);for(const key of ['view','project','pane'])url.searchParams.delete(key);for(const k of ['room','tab','task','page'] as const){if(next[k])url.searchParams.set(k,next[k]);else url.searchParams.delete(k);}history.pushState(null,'',url);setRoute(next);setMore(false);}
 const goPage=(page:RoomPage)=>navigate({page,room:'',task:'',tab:'overview'});
 const closeTask=useCallback(()=>{const url=new URL(location.href);url.searchParams.delete('task');url.searchParams.delete('pane');history.pushState(null,'',url);setRoute(readRoomRoute());},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setMore(false);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.getElementById('team-search')?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
 useEffect(()=>{if(more){wasMore.current=true;moreFirst.current?.focus();}else if(wasMore.current){moreTrigger.current?.focus();wasMore.current=false;}},[more]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(hasDrafts()){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 async function logout(){if(hasDrafts()){setError('Es gibt ungespeicherte Dateiänderungen. Speichere oder verwerfe sie vor dem Abmelden in der betreffenden Aufgabe.');return;}try{await roomRequest('/api/auth/logout',{});clearDrafts();for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.includes(user.userId))sessionStorage.removeItem(key);}location.replace('/');}catch(e){setError((e as Error).message);}}
 const projectTasks=team.tasks.filter(t=>t.project===route.room);
 const myWork=team.tasks.map(task=>({task,summary:taskSummary(task,user.userId,id=>members.find(m=>m.id===id)?.name??'Jemand')})).filter(w=>w.summary.mine);
 const news=(team.unread??[]).map(event=>({event,text:humanEvent(event.kind,event.body)})).filter((n):n is {event:typeof n.event;text:string}=>!!n.text).slice(0,8);
 const projectEvents=team.events.filter(e=>e.project===route.room),owner=members.some(m=>m.id===user.userId&&m.role==='owner');
 const tab=route.tab==='results'?'tasks':route.tab,name=(id:string)=>members.find(m=>m.id===id)?.name??'Jemand';
 const openTask=(task:TeamTask,pane?:TaskPane)=>{const target=pane??(task.status==='review'?'review':undefined);navigate({room:task.project,task:task.id,tab:route.room===task.project&&route.tab==='overview'?'overview':'tasks',page:'rooms'});if(target){const url=new URL(location.href);url.searchParams.set('pane',target);history.replaceState(null,'',url);}};
 return <div className="rw-shell team-shell">
  {mobile&&<button className="rw-nav-scrim" aria-label="Navigation schließen" onClick={()=>setMobile(false)}/>}
  <aside className={'rw-sidebar'+(mobile?' open':'')} aria-label="Workspace-Navigation"><div className="rw-brand"><StudioBrand compact onHome={()=>{navigate({room:'',task:'',page:'rooms'});setMobile(false);}}/><button className="rw-icon rw-mobile-only" aria-label="Menü schließen" onClick={()=>setMobile(false)}><X size={20}/></button></div><div className="rw-workspace-label"><span className="rw-square">S</span><span><strong>SCHMAQQ Studio</strong><small>Euer gemeinsamer Arbeitsplatz</small></span></div>
   <button className={'rw-nav-home'+(!route.room&&route.page==='rooms'?' selected':'')} onClick={()=>navigate({room:'',task:'',page:'rooms'})}><Folder size={18}/>Meine Arbeit</button>
   <div className="rw-section-label">PROJEKTE<button className="rw-icon" aria-label="Neues Projekt anlegen" onClick={()=>setModal({kind:'room'})}><Plus size={17}/></button></div><nav className="rw-rooms">{rooms.map(r=><button key={r.id} className={route.room===r.id&&route.page==='rooms'?'active':''} onClick={()=>navigate({room:r.id,tab:'overview',task:'',page:'rooms'})}><Hash size={17}/><span>{r.title}</span>{!!r.openTasks&&<small title={r.openTasks===1?'1 offene Aufgabe':r.openTasks+' offene Aufgaben'} aria-label={r.openTasks===1?'1 offene Aufgabe':r.openTasks+' offene Aufgaben'}>{r.openTasks}</small>}</button>)}</nav>
   <div className="rw-sidebar-bottom"><button className={route.page==='team'?'active':''} onClick={()=>navigate({page:'team',task:''})}><Users size={18}/>Team</button><div className="rw-profile"><span className="rw-avatar">{initials(user.displayName)}</span><span><strong>{user.displayName}</strong><small>Persönliches Konto</small></span><button className="rw-icon" aria-label="Abmelden" onClick={()=>void logout()}><LogOut size={17}/></button></div></div>
  </aside>
  <main className="rw-main" inert={modal||route.task?true:undefined}><header className="rw-topbar"><div className="rw-breadcrumb"><span>Studio</span><ChevronRight size={14}/><strong>{route.page==='team'?'Team':route.page==='account'?'Mein Konto':route.page==='conversations'?'Gespräche':route.page==='projects'?'Projekte':route.room?(room?.project.title??'Projekt'):'Meine Arbeit'}</strong></div><span className={'rw-sync '+(connected?'ok':'')}>{connected?'Aktueller Stand geladen':'Verbindung wird geprüft'}</span></header>
   {demoMode&&<div className="rw-demo-strip">ISOLIERTER PROBELAUF · Keine Verbindung zur Produktion</div>}
   {error&&<p className="rw-error global" role="alert">{error}<button className="rw-button" onClick={()=>void refresh()}>Erneut versuchen</button></p>}
   {route.page==='team'?<div className="rw-page team-page"><h1>Team</h1>
    <section aria-labelledby="team-members"><h2 id="team-members">Wer dabei ist</h2><ul className="team-members">{members.map(m=><li key={m.id}><span className="rw-avatar">{initials(m.name)}</span><span><strong>{m.name}{m.id===user.userId?' (du)':''}</strong><small>{m.role==='owner'?'Inhaber':'Mitglied'}</small></span></li>)}</ul></section>
    {owner&&<TeamInvite/>}
    <ChatgptConnect/>
    <details className="team-secondary team-developer"><summary>Für Entwickler</summary><ResourceList resources={resources} members={members} userId={user.userId} onRefresh={refresh}/><Connections resources={resources} userId={user.userId} onDevelopment={()=>navigate({page:'rooms',room:route.room||rooms[0]?.id||'',tab:'connect'})}/><details className="rw-legacy-archive"><summary>Inhalte aus der früheren Ansicht</summary><a className="rw-button" href="/?legacy=1&view=chat">Frühere Gespräche</a> <a className="rw-button" href="/?legacy=1&view=docs">Frühere Dokumente</a></details></details>
   </div>:
   !route.room?<div className="rw-page team-home"><h1>Meine Arbeit</h1>
    {/* What is waiting for me across all projects, in the same words as everywhere else. */}
    {/* Brand hero: the one most important thing for me, in the colours of the logo. */}
    <section className="home-hero" aria-labelledby="home-next"><p className="home-hello">Hallo {user.displayName.split(' ')[0]}</p>
     {myWork[0]?<><h2 id="home-next">Als Nächstes</h2><p className="home-hero-task">{myWork[0].task.title}</p><p className="home-hero-meta">{rooms.find(r=>r.id===myWork[0].task.project)?.title} · {myWork[0].summary.text}</p><button className="rw-button lime" onClick={()=>openTask(myWork[0].task)}>Öffnen<ArrowRight size={16}/></button></>
      :<><h2 id="home-next">Gerade liegt nichts bei dir.</h2><p className="home-hero-meta">Leg in einem Projekt eine Aufgabe an oder schau, was die anderen machen.</p></>}
    </section>
    {myWork.length>1&&<section aria-labelledby="home-mine"><h2 id="home-mine">Auch bei dir</h2>{myWork.slice(1).map(({task,summary})=><button className="team-work-card" key={task.id} onClick={()=>openTask(task)}><span><strong>{task.title}</strong><small>{rooms.find(r=>r.id===task.project)?.title} · {summary.text}</small></span><ChevronRight size={17}/></button>)}</section>}
    {!!news.length&&<section className="team-inbox" aria-labelledby="home-news"><h2 id="home-news">Neu für dich</h2>{news.map(({event,text})=><button className="team-work-card" key={event.id} onClick={()=>{navigate({room:event.project,task:event.task??'',tab:event.task?'tasks':'talk',page:'rooms'});void roomRequest('/api/team',{action:'read',event:event.id}).then(refresh);}}><span><strong>{text}</strong><small>{[name(event.actor),rooms.find(r=>r.id===event.project)?.title].filter(Boolean).join(' · ')}</small></span><ChevronRight size={17}/></button>)}<button className="rw-link" onClick={()=>void Promise.all(news.map(n=>roomRequest('/api/team',{action:'read',event:n.event.id}))).then(refresh)}>Alles als gelesen markieren</button></section>}
    <section aria-labelledby="home-projects"><div className="team-section-head"><h2 id="home-projects">Projekte</h2><button className="rw-button" onClick={()=>setModal({kind:'room'})}><Plus size={16}/>Neues Projekt</button></div>{rooms.map(r=><button className="team-work-card" key={r.id} onClick={()=>navigate({room:r.id,tab:'overview',task:'',page:'rooms'})}><span><strong>{r.title}</strong><small>{r.openTasks?r.openTasks===1?'1 offene Aufgabe':r.openTasks+' offene Aufgaben':'Keine offenen Aufgaben'}</small></span><ChevronRight size={17}/></button>)}{!rooms.length&&<p className="rw-muted">Noch kein Projekt. Ein Name und ein Ziel reichen für den Anfang.</p>}</section>
   </div>:
   !room?<div className="rw-loading">Projekt wird geladen …</div>:<>
    {/* Compact head: the project name and the one action every area needs. The areas are always visible:
        a row of tabs on wide screens, a fixed bar at the bottom on phones. */}
    <section className="team-head"><h1>{room.project.title}</h1><button className="rw-button lime" onClick={()=>setModal({kind:'task'})}><Plus size={17}/>Aufgabe</button></section>
    <nav className="team-areas" aria-label="Bereiche des Projekts">{tabs.map(t=>{const Icon=areaIcons[t.id]??Home;return <button key={t.id} className={tab===t.id?'active':''} aria-current={tab===t.id?'page':undefined} onClick={()=>navigate({tab:t.id,task:''})}><Icon size={19} aria-hidden="true"/><span>{t.label}</span></button>;})}</nav>
    <div className="team-project-content">
     {tab==='overview'&&<ProjectOverview room={room} tasks={projectTasks} events={projectEvents} active={(team.active??[]).filter(j=>j.project===route.room)} members={members} resources={resources} userId={user.userId} onOpenTask={openTask} onTab={tab=>navigate({tab,task:''})} onRepository={()=>setModal({kind:'repository'})} onRefresh={refresh}/>}
     {tab==='talk'&&<Conversation key={room.project.id} room={room} userId={user.userId} search="" refresh={refresh} onTask={id=>navigate({task:id})} onConvert={(kind,source)=>setModal({kind,source})}/>}
     {tab==='tasks'&&<TaskList tasks={projectTasks} userId={user.userId} name={name} search={search} onSearch={setSearch} onOpen={openTask}/>}
     {tab==='knowledge'&&<TeamKnowledge room={room} search="" refresh={refresh} onNew={kind=>setModal({kind})} onSource={source=>{navigate({tab:'talk'});requestAnimationFrame(()=>document.getElementById('message-'+source)?.scrollIntoView({block:'center'}));}}/>}
     {tab==='connect'&&<ProjectSettings room={room} resources={resources} userId={user.userId} refresh={refresh} onRepository={()=>setModal({kind:'repository'})}/>}
    </div>
   </>}
  </main>
  {modal&&<RoomModal spec={modal} room={room} onClose={()=>setModal(null)} onSaved={async r=>{setModal(null);if(r.project)navigate({room:r.project,page:'rooms',tab:'overview',task:''});await refresh();if(r.task)navigate({task:r.task});}}/>}
  {route.task&&room&&<TeamTaskView key={route.task} taskId={route.task} room={room} resources={resources} userId={user.userId} onClose={closeTask} onRefresh={refresh} onConnect={()=>navigate({task:'',tab:'overview'})}/>}
 </div>;
}

function ProjectSettings({room,resources,userId,refresh,onRepository}:{room:RoomState;resources:Resource[];userId:string;refresh:()=>Promise<void>;onRepository:()=>void}){
 const [readiness,setReadiness]=useState<Readiness|null>(null),[checking,setChecking]=useState(false);
 const readinessPanel=useRef<HTMLDivElement|null>(null),runnerPanel=useRef<HTMLDivElement|null>(null),setupPanel=useRef<HTMLDivElement|null>(null);
 const own=resources.filter(r=>r.owner===userId),personal=own.find(r=>r.online&&r.development?.some(p=>p.id===room.project.id))??own.find(r=>r.online)??own[0];
 const focusPanel=(panel:React.RefObject<HTMLDivElement|null>)=>requestAnimationFrame(()=>{panel.current?.scrollIntoView({block:'start'});panel.current?.focus({preventScroll:true});});
 const runnerToggle=useRef<HTMLButtonElement|null>(null),setupToggle=useRef<HTMLButtonElement|null>(null),[setupDevice,setSetupDevice]=useState('');
 function openRunner(){setShowRunner(true);focusPanel(runnerPanel);}
 function closeRunner(){setShowRunner(false);runnerToggle.current?.focus();}
 function openSetup(device=''){setSetupDevice(device);setShowSetup(true);focusPanel(setupPanel);}
 async function showReadiness(){setChecking(true);setError('');try{const data=await roomRequest<{readiness?:Readiness}>('/api/development');setReadiness(data.readiness??emptyReadiness);await refresh();focusPanel(readinessPanel);}catch(e){setError((e as Error).message);}finally{setChecking(false);}}
 const [showSetup,setShowSetup]=useState(false),[showRunner,setShowRunner]=useState(false),[error,setError]=useState(''),[repoName,setRepoName]=useState(''),[creating,setCreating]=useState(false);const repoAttempt=useRef({name:'',id:''});
 async function createRepo(e:React.FormEvent){e.preventDefault();if(repoAttempt.current.name!==repoName)repoAttempt.current={name:repoName,id:crypto.randomUUID()};setCreating(true);setError('');try{await roomRequest('/api/github-project',{project:room.project.id,revision:room.meta.revision,name:repoName,id:repoAttempt.current.id});await refresh();}catch(e){setError((e as Error).message);}finally{setCreating(false);}}
 async function update(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await roomRequest('/api/team',{action:'project',project:room.project.id,revision:room.meta.revision,title:f.get('title'),description:f.get('description'),archived:false,base:f.get('base'),workflow:f.get('workflow')});await refresh();setError('');}catch(e){setError((e as Error).message);}}
 return <section className="rw-connections team-settings"><h2>Projekt</h2>{error&&<p className="rw-error" role="alert">{error}</p>}
  {/* Everyday settings first; Werkstatt, GitHub and the technical rules sit under "Für Entwickler". */}
  <form className="team-form" key={room.meta.revision} onSubmit={update}><label>Name<input name="title" required defaultValue={room.project.title} maxLength={160}/></label><label>Worum geht es?<textarea name="description" defaultValue={room.project.description} maxLength={12000} placeholder="Ein, zwei Sätze zum Ziel."/></label><input type="hidden" name="base" value={room.meta.base??'main'}/><input type="hidden" name="workflow" value={room.meta.workflow??'pull-request'}/><button className="rw-button lime">Speichern</button></form>
  <h2>Einrichtung</h2><ProjectReady room={room} resources={resources} members={room.members} userId={userId} onRepository={onRepository} onRefresh={refresh}/>
  <details className="team-secondary team-developer"><summary>Für Entwickler</summary>
  <form className="team-form" key={'dev'+room.meta.revision} onSubmit={update}><input type="hidden" name="title" value={room.project.title}/><input type="hidden" name="description" value={room.project.description}/><label>Hauptbranch<input name="base" required defaultValue={room.meta.base??'main'} maxLength={100}/></label><label>Wie freigegebene Änderungen übernommen werden<select name="workflow" defaultValue={room.meta.workflow??'pull-request'}><option value="pull-request">Über GitHub (Pull Request)</option><option value="direct">Direkt durch die Werkstatt</option></select></label><button className="rw-button">Speichern</button></form>
  <section className="team-callout"><h3>Gemeinsames Repository</h3><p>{room.meta.repository??'Noch kein Repository verbunden. Planung und allgemeine Aufgaben funktionieren bereits.'}</p>{room.meta.repository&&<><p role="status">Repository-Adresse gespeichert · keine Zugriffsbestätigung.</p><p>Das Speichern der Adresse bestätigt weder Zugriff noch Schreibrechte. Prüfe den Einrichtungsstand deines eigenen Rechners.</p><button className="rw-button" disabled={checking} onClick={()=>void showReadiness()}>Einrichtungsstand anzeigen</button></>}<button className="rw-button" onClick={onRepository}>{room.meta.repository?'Repository ändern':'Vorhandenes Repository verbinden'}</button>{!room.meta.repository&&<details><summary>Ein neues gemeinsames Repository anlegen</summary><p>Erstellt ein privates Repository in deinem verbundenen GitHub-Konto. Dein Kollege benötigt dort ebenfalls Zugriff und verbindet anschließend seinen eigenen Rechner.</p><form className="team-form" onSubmit={createRepo}><label>Repository-Name<input required value={repoName} maxLength={100} onChange={e=>setRepoName(e.target.value)} placeholder="unser-neues-projekt"/></label><button className="rw-button" disabled={creating}>{creating?'GitHub-Anlage wird bestätigt …':'Privates Repository anlegen'}</button></form></details>}</section><section className="team-callout"><h3>Dein Rechner für dieses Projekt</h3><p>{(()=>{const reported=resources.filter(r=>r.owner===userId&&r.online).flatMap(r=>r.development?.filter(p=>p.id===room.project.id)??[]);
 return reported.some(p=>p.check)?'Ein Rechner meldet einen Testbefehl für dieses Projekt. Ob die Tests bestehen, zeigt erst ein Testlauf in einer Aufgabe.':reported.length?'Eine Repository-Kopie ist vorhanden, aber noch kein Testbefehl konfiguriert. Richte das Projekt ein, um Tests und Vorschau festzulegen.':'Wähle deinen PC oder Server und richte das gemeinsame Repository dort ein.';})()}</p><div className="rw-row-actions"><button ref={runnerToggle} className="rw-button" aria-expanded={showRunner} onClick={()=>{if(showRunner)closeRunner();else openRunner();}}>PC oder Server hinzufügen</button><button ref={setupToggle} className="rw-button" aria-expanded={showSetup} onClick={()=>{if(showSetup){setShowSetup(false);setupToggle.current?.focus();}else openSetup();}}>{room.project.title} einrichten</button></div>{resources.some(r=>r.owner===userId)&&<Executors project={room.project.id} embedded onSetup={openSetup}/>}{showRunner&&<div ref={runnerPanel} tabIndex={-1}><RunnerConnect project={room.project.id} projects={[room.project]} onRegistered={refresh} onClose={closeRunner}/></div>} {showSetup&&<><div ref={setupPanel} tabIndex={-1}><ProjectConnect key={setupDevice} project={room.project.id} projectTitle={room.project.title} initialDevice={setupDevice} resources={resources} userId={userId} onDone={refresh}/></div><details><summary>Alternativ: Import auf einem eigenen PC</summary><p>Dieser separate Weg ist nur für einen Ordner auf deinem eigenen PC gedacht. Für den Server-Worker verwende die Projekteinstellung oben.</p><ProjectStart project={room.project} onComplete={()=>void showReadiness()} onConnect={openRunner}/></details></>}{checking&&<p role="status">Einrichtungsstand wird geladen …</p>}{readiness&&<div ref={readinessPanel} tabIndex={-1}><p role="status">Einrichtungsstand aktualisiert. Die Übersicht zeigt die letzten Meldungen deines Rechners.</p><ProjectReadiness data={readiness} device={personal?.device??''} project={room.project.id} online={personal?.online??false}/>{!personal&&<p>Dein Rechner ist noch nicht verbunden. Öffne „PC oder Server hinzufügen“, registriere ihn bei Bedarf und starte den Runner auf deinem PC.</p>}{(!personal||!personal.online)&&<button className="rw-button" onClick={openRunner}>Rechnerverbindung öffnen</button>}</div>}</section></details></section>;
}

/** Tasks as a plain list grouped by who acts next; the same short status as everywhere else. */
function TaskList({tasks,userId,name,search,onSearch,onOpen}:{tasks:TeamTask[];userId:string;name:(id:string)=>string;search:string;onSearch:(v:string)=>void;onOpen:(task:TeamTask)=>void}){
 const query=search.trim().toLowerCase();
 const rows=tasks.filter(t=>!query||(t.title+' '+t.description).toLowerCase().includes(query)).map(task=>({task,summary:taskSummary(task,userId,name)}));
 const groups:[string,string,typeof rows][]=[['mine','Bei dir',rows.filter(r=>r.summary.group==='mine')],['open','Noch offen – wer übernimmt?',rows.filter(r=>r.summary.group==='open')],['others','Bei den anderen',rows.filter(r=>r.summary.group==='others')]];
 const done=rows.filter(r=>r.summary.group==='done');
 const row=({task,summary}:typeof rows[number])=><li key={task.id}><button className="team-work-card" onClick={()=>onOpen(task)}><span><strong>{task.title}</strong><small>{summary.text}</small></span><ChevronRight size={17}/></button></li>;
 return <section className="team-task-list" aria-label="Aufgaben">
  {tasks.length>6&&<label className="team-search"><Search size={16} aria-hidden="true"/><input aria-label="Aufgaben durchsuchen" value={search} onChange={e=>onSearch(e.target.value)} placeholder="Aufgabe suchen"/></label>}
  {groups.filter(([, ,items])=>items.length).map(([id,label,items])=><section key={id} aria-labelledby={'tasks-'+id}><h2 id={'tasks-'+id}>{label}</h2><ul>{items.map(row)}</ul></section>)}
  {!rows.length&&<p className="rw-muted">{query?'Keine Aufgabe passt zur Suche.':'Noch keine Aufgaben. Leg mit „Aufgabe“ oben die erste an.'}</p>}
  {!!done.length&&<details className="team-secondary"><summary>Erledigt ({done.length})</summary><ul>{done.map(row)}</ul></details>}
 </section>;
}

/** The one working way to bring your own AI: ChatGPT (or another assistant) connects to Studio with this address. */
function ChatgptConnect(){
 const address=location.origin+'/mcp',[copied,setCopied]=useState(false);
 return <section aria-labelledby="team-ai"><h2 id="team-ai">Dein ChatGPT verbinden</h2>
  <p>Damit dein ChatGPT Aufgaben lesen und Änderungen machen kann, fügst du Studio in ChatGPT einmal als Verbindung (Connector) hinzu. Diese Adresse trägst du dort ein:</p>
  <div className="team-copy"><code>{address}</code><button className="rw-button" onClick={()=>void navigator.clipboard?.writeText(address).then(()=>setCopied(true))}><Copy size={16}/>{copied?'Kopiert':'Kopieren'}</button></div>
  <p className="rw-muted">ChatGPT fragt danach, ob es auf Studio zugreifen darf. Du bestätigst es auf einer Studio-Seite. Jede Person verbindet ihr eigenes ChatGPT.</p>
 </section>;
}
