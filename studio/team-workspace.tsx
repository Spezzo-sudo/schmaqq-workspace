import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowRight,BookOpen,Bot,CircleHelp,ChevronRight,Copy,Folder,Hash,Home,LayoutGrid,ListChecks,LogOut,MessageSquare,MessagesSquare,Plus,Search,Settings,UserRound,Users,FolderOpen,PanelRight} from 'lucide-react';
import {taskSummary} from './task-next-step';
import {humanEvent} from './project-overview-model';
import type {ChatGPTUser} from '../app/chatgpt-auth';
import {hasDrafts,clearDrafts} from '../app/editor-drafts';
import StudioBrand from '../app/studio-brand';
import TeamAccess from './team-access';
import ProjectRoles,{useProjectAccess} from './project-roles';
import GuidePage,{type GuideTarget} from './guide';
import ScrollHint from './scroll-hint';
import Connections from '../app/connections';
import PluginGrants from '../app/plugin-grants';
import ProviderLogin from '../app/provider-login';
import {GeneralChat,GeneralKnowledge,DownloadAll,ProjectBriefing,ChangePassword} from './studio-general';
import RunnerConnect from '../app/runner-connect';
import Executors from '../app/executors';
import ProjectStart from '../app/project-start';
import ProjectReadiness,{emptyReadiness,type Readiness} from '../app/project-readiness';
import ProjectConnect from './project-connect';
import ProjectReady from './project-ready';
import TeamTaskView from './team-task';
import ProjectOverview,{type TaskPane} from './project-overview';
import TeamKnowledge from './team-knowledge';
import RoomAssistant from './room-assistant';
import CodexAccount from './codex-account';
import {ChatsHome,AgentsPage,type WaitingItem} from './chats-home';
import MessengerProjectNavigation from './messenger-project-nav';
import {ProjectFiles} from './messenger-detail';
import {Conversation,ResourceList,RoomModal,type Modal} from './room-components';
import {roomRequest,readRoomRoute,tabs,initials,type Room,type RoomState,type RoomMember,type RoomPage,type RoomRoute,type RoomTab,type Resource,type TeamState,type TeamTask,type RoomNote} from './room-model';
import './workspace-room.css';
import './r26-workflow.css';
import './schmaqq-design-system.css';
import './team-workflow.css';
import './schmaqq-convergence.css';
import './studio-navigation.css';
const emptyTeam:TeamState={tasks:[],events:[]};
const detailTitles:Record<string,string>={overview:'Projektübersicht',tasks:'Aufgaben',files:'Dateien',knowledge:'Wissen',activity:'KI & Kontext',connect:'Projekteinstellungen'};
export default function TeamWorkspace({user,demoMode=false}:{user:ChatGPTUser;demoMode?:boolean}){
 const [route,setRoute]=useState(readRoomRoute),[rooms,setRooms]=useState<Room[]>([]),[room,setRoom]=useState<RoomState|null>(null),[team,setTeam]=useState<TeamState>(emptyTeam);
 const [resources,setResources]=useState<Resource[]>([]),[members,setMembers]=useState<RoomMember[]>([]),[error,setError]=useState(''),[connected,setConnected]=useState(false),[search,setSearch]=useState(''),[modal,setModal]=useState<Modal|null>(null);
 const [practice,setPractice]=useState<string|null>(null),[practiceBusy,setPracticeBusy]=useState(false),[spot,setSpot]=useState('');
 const activeRoom=useRef(route.room);activeRoom.current=route.room;
 useEffect(()=>{
  const root=document.documentElement,previous=root.style.getPropertyValue('--r3-viewport');
  const resize=()=>root.style.setProperty('--r3-viewport',(window.visualViewport?.height??window.innerHeight)+'px');
  resize();window.visualViewport?.addEventListener('resize',resize);window.addEventListener('resize',resize);
  return()=>{window.visualViewport?.removeEventListener('resize',resize);window.removeEventListener('resize',resize);previous?root.style.setProperty('--r3-viewport',previous):root.style.removeProperty('--r3-viewport');};
 },[]);
 useEffect(()=>{roomRequest<{project:string|null}>('/api/practice').then(r=>setPractice(r.project)).catch(()=>{});},[]);
 // "Zeig mir wo": wait for the element on the target page, scroll to it and light it up briefly in lime.
 useEffect(()=>{if(!spot)return;let tries=0,timer:ReturnType<typeof setTimeout>;const look=()=>{const el=document.querySelector<HTMLElement>(spot);
  if(el){el.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});el.classList.add('studio-spotlight');timer=setTimeout(()=>el.classList.remove('studio-spotlight'),2800);setSpot('');}
  else if(++tries<20)timer=setTimeout(look,250);else setSpot('');};timer=setTimeout(look,200);return()=>clearTimeout(timer);},[spot,route,room]);
 const refresh=useCallback(async()=>{
  try{const selected=activeRoom.current;const [r,a,t,w,p]=await Promise.all([roomRequest<{rooms:Room[]}>('/api/rooms'),roomRequest<{resources:Resource[]}>('/api/ai'),roomRequest<TeamState>('/api/team'),roomRequest<{members:RoomMember[]}>('/api/workspace'),selected?roomRequest<RoomState>('/api/room?project='+encodeURIComponent(selected)):Promise.resolve(null)]);
   setRooms(r.rooms);setResources(a.resources);setTeam(t);setMembers(w.members);if(selected===activeRoom.current)setRoom(p);setConnected(true);setError('');
  }catch(e){setError((e as Error).message);setConnected(false);}
 },[]);
 useEffect(()=>{let running=false;const tick=async()=>{if(running||document.hidden)return;running=true;try{await refresh();}finally{running=false;}};void tick();const timer=setInterval(tick,5000);return()=>clearInterval(timer);},[refresh]);
 useEffect(()=>{setRoom(null);setSearch('');void refresh();},[route.room,refresh]);
 // First visit opens the last permitted project, not another management dashboard. Explicit links always win.
 useEffect(()=>{if(route.room&&rooms.some(r=>r.id===route.room)){try{localStorage.setItem('studio:last-project:'+user.userId,route.room);}catch{}}},[route.room,rooms,user.userId]);
 useEffect(()=>{const back=()=>setRoute(readRoomRoute());window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[]);
 useEffect(()=>{if(!route.room||!room||!window.matchMedia('(max-width:650px)').matches)return;document.querySelector<HTMLButtonElement>('.team-areas button.active')?.scrollIntoView({block:'nearest',inline:'nearest'});},[route.room,route.tab,room?.project.id]);
 function navigate(change:Partial<RoomRoute>){const next={...readRoomRoute(),...change};const url=new URL(location.href);if(change.room!==undefined&&change.room!==readRoomRoute().room)url.searchParams.delete('chat');for(const key of ['view','project','pane'])url.searchParams.delete(key);for(const k of ['room','tab','task','page'] as const){if(next[k])url.searchParams.set(k,next[k]);else url.searchParams.delete(k);}history.pushState(null,'',url);setRoute(next);}
 const goPage=(page:RoomPage)=>navigate({page,room:'',task:'',tab:'overview'});
 // Open a project group, optionally straight into one conversation (agent:<id>, member:<id>, all).
 const openChat=(project:string,chat?:string)=>{navigate({room:project,tab:'talk',task:'',page:'rooms'});if(chat){const url=new URL(location.href);url.searchParams.set('chat',chat);history.replaceState(null,'',url);setRoute(readRoomRoute());}};
 const isHome=route.page==='rooms'&&!route.room,inProject=route.page==='rooms'&&!!route.room;
 const showWhere=(t:GuideTarget)=>{const target=(t.tab==='tasks'?practice??rooms.find(r=>!r.practice&&r.openTasks)?.id:undefined)??rooms.find(r=>!r.practice)?.id??practice??rooms[0]?.id??'';navigate(t.project?{page:'rooms',room:target,tab:t.tab??'overview',task:''}:{page:t.page??'rooms',room:'',tab:'overview',task:''});setSpot(t.selector);};
 async function startPractice(){setPracticeBusy(true);try{const r=await roomRequest<{project:string}>('/api/practice',{action:'start'});setPractice(r.project);await refresh();navigate({page:'rooms',room:r.project,tab:'overview',task:''});}catch(e){setError((e as Error).message);}finally{setPracticeBusy(false);}}
 async function deletePractice(){if(!window.confirm('Übungsprojekt mit allem darin löschen?'))return;setPracticeBusy(true);try{await roomRequest('/api/practice',{action:'delete'});setPractice(null);await refresh();}catch(e){setError((e as Error).message);}finally{setPracticeBusy(false);}}
 const closeTask=useCallback(()=>{const url=new URL(location.href);url.searchParams.delete('task');url.searchParams.delete('pane');history.pushState(null,'',url);setRoute(readRoomRoute());},[]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.getElementById('team-search')?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(hasDrafts()){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[]);
 async function logout(){if(hasDrafts()){setError('Es gibt ungespeicherte Dateiänderungen. Speichere oder verwerfe sie vor dem Abmelden in der betreffenden Aufgabe.');return;}try{await roomRequest('/api/auth/logout',{});clearDrafts();for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.includes(user.userId))sessionStorage.removeItem(key);}location.replace('/');}catch(e){setError((e as Error).message);}}
 const projectTasks=team.tasks.filter(t=>t.project===route.room);
 const myWork=team.tasks.map(task=>({task,summary:taskSummary(task,user.userId,id=>members.find(m=>m.id===id)?.name??'Jemand')})).filter(w=>w.summary.mine);
 const news=(team.unread??[]).map(event=>({event,text:humanEvent(event.kind,event.body)})).filter((n):n is {event:typeof n.event;text:string}=>!!n.text).slice(0,8);
 const waiting:WaitingItem[]=[
  ...myWork.map(({task,summary})=>({id:'t:'+task.id,title:task.title,detail:(rooms.find(r=>r.id===task.project)?.title??'Projekt')+' · '+summary.text,open:()=>openTask(task)})),
  ...news.map(({event,text})=>({id:'e:'+event.id,title:text+(event.task&&team.tasks.find(t=>t.id===event.task)?': '+team.tasks.find(t=>t.id===event.task)!.title:''),detail:rooms.find(r=>r.id===event.project)?.title??'',open:()=>{navigate({room:event.project,task:event.task??'',tab:event.task?'tasks':'talk',page:'rooms'});void roomRequest('/api/team',{action:'read',event:event.id}).then(refresh);}}))
 ];
 const projectEvents=team.events.filter(e=>e.project===route.room),owner=members.some(m=>m.id===user.userId&&m.role==='owner');
 const tab=route.tab==='results'?'tasks':route.tab,name=(id:string)=>members.find(m=>m.id===id)?.name??'Jemand';
 const openTask=(task:TeamTask,pane?:TaskPane)=>{const target=pane??(task.status==='review'?'review':undefined);navigate({room:task.project,task:task.id,tab:route.room===task.project&&route.tab==='overview'?'overview':'tasks',page:'rooms'});if(target){const url=new URL(location.href);url.searchParams.set('pane',target);history.replaceState(null,'',url);}};
 return <div className={'rw-shell team-shell r3-shell'+(route.room&&route.page==='rooms'?' r3-project':'')}>
  <aside className="rw-sidebar" aria-label="Workspace-Navigation">
   <div className="rw-brand"><StudioBrand compact onHome={()=>goPage('rooms')}/></div>
   <nav className="studio-global-links" aria-label="Hauptnavigation">
    <button className={'rw-nav-home'+(isHome?' selected':'')} aria-current={isHome?'page':undefined} onClick={()=>goPage('rooms')}><MessagesSquare size={18}/>Chats</button>
    <button className={'rw-nav-home'+(route.page==='agents'?' selected':'')} aria-current={route.page==='agents'?'page':undefined} onClick={()=>goPage('agents')}><Bot size={18}/>Agenten</button>
    <button className={'rw-nav-home'+(route.page==='projects'||inProject?' selected':'')} aria-current={route.page==='projects'||inProject?'page':undefined} onClick={()=>goPage('projects')}><Folder size={18}/>Projekte</button>
    <button className={'rw-nav-home'+(route.page==='account'||route.page==='team'?' selected':'')} aria-current={route.page==='account'||route.page==='team'?'page':undefined} onClick={()=>goPage('account')}><UserRound size={18}/>Konto</button>
   </nav>
   <div className="rw-sidebar-bottom">
    <button className={route.page==='guide'?'active':''} aria-current={route.page==='guide'?'page':undefined} onClick={()=>goPage('guide')}><CircleHelp size={18}/>So funktioniert Studio</button>
    <div className="studio-profile-name">{user.displayName}</div>
   </div>
  </aside>
  <main className="rw-main" inert={modal||route.task?true:undefined}><header className="rw-topbar"><div className="studio-topbar-brand"><StudioBrand compact tag onHome={()=>goPage('rooms')}/></div><div className="rw-breadcrumb"><span>Studio</span><ChevronRight size={14}/><strong>{route.page==='guide'?'So funktioniert Studio':route.page==='team'?'Team':route.page==='account'?'Mein Konto':route.page==='conversations'?'Team-Chat':route.page==='projects'?'Projekte':route.page==='agents'?'Agenten':route.room?(room?.project.title??'Projekt'):'Chats'}</strong></div><span className={'rw-sync '+(connected?'ok':'')}>{connected?'Aktueller Stand geladen':'Verbindung wird geprüft'}</span><button className={'studio-account-button'+(route.page==='account'?' active':'')} aria-label={'Mein Konto ('+user.displayName+')'} aria-current={route.page==='account'?'page':undefined} onClick={()=>goPage('account')}>{initials(user.displayName)}</button></header>
   {demoMode&&<div className="rw-demo-strip">ISOLIERTER PROBELAUF · Keine Verbindung zur Produktion</div>}
   {error&&<p className="rw-error global" role="alert">{error}<button className="rw-button" onClick={()=>void refresh()}>Erneut versuchen</button></p>}
   {route.page==='team'?<div className="rw-page team-page">
    <h1>Team</h1>
    <p className="studio-page-intro">Wer mitarbeitet und wie du jemanden dazuholst.</p>
    <TeamAccess members={members} userId={user.userId} owner={owner} onChanged={()=>void refresh()}/>
    <details className="team-secondary team-developer"><summary>Für Entwickler</summary><ResourceList resources={resources} members={members} userId={user.userId} onRefresh={refresh}/></details>
   </div>:
   route.page==='account'?<div className="rw-page team-page studio-account-page">
    <h1>Mein Konto</h1>
    <section className="studio-account-profile" aria-label="Dein Profil"><span className="rw-avatar">{initials(user.displayName)}</span><div><strong>{user.displayName}</strong><small>{owner?'Inhaber':'Mitglied'} im Team · Anmeldung mit „{user.email}“</small></div><button className="rw-button studio-signout" onClick={()=>void logout()}><LogOut size={17}/>Abmelden</button></section>
    <button className="team-work-card studio-guide-link" onClick={()=>goPage('guide')}><CircleHelp size={18}/><span><strong>So funktioniert Studio</strong><small>Der ganze Weg, was wann erscheint, Übungsrunde</small></span><ChevronRight size={17}/></button>
    <button className="team-work-card" onClick={()=>goPage('team')}><Users size={18}/><span><strong>Team & Einladungen</strong><small>Wer mitarbeitet und wie du jemanden dazuholst</small></span><ChevronRight size={17}/></button>
    <CodexAccount/>
    <ChatgptConnect/>
    <PluginGrants/>
    <section className="studio-account-login"><ProviderLogin link/></section>
    <ChangePassword/>
    <DownloadAll/>
    <details className="team-secondary team-developer"><summary>Für Entwickler</summary>
     <Connections resources={resources} userId={user.userId} onDevelopment={()=>navigate({page:'rooms',room:rooms[0]?.id??'',tab:'connect',task:''})} developer/>
     <p><a className="rw-link" href="/?legacy=1">Frühere Ansicht öffnen</a></p>
    </details>
   </div>:
   route.page==='guide'?<GuidePage practice={practice} busy={practiceBusy} onShow={showWhere} onPractice={()=>void (practice?navigate({page:'rooms',room:practice,tab:'overview',task:''}):startPractice())} onDeletePractice={()=>void deletePractice()}/>:
   route.page==='agents'?<AgentsPage rooms={rooms} onOpen={openChat} onCreateProject={()=>setModal({kind:'room'})}/>:
   route.page==='projects'?<div className="rw-page team-page studio-projects-page">
    <div className="team-section-head"><h1>Projekte</h1><button className="rw-button lime" onClick={()=>setModal({kind:'room'})}><Plus size={17}/>Neues Projekt</button></div>
        <section aria-label="Deine Projekte">{rooms.map(r=><button className="team-work-card" key={r.id} onClick={()=>openChat(r.id,'all')}><span><strong>{r.title}{r.practice&&<em className="studio-practice-tag">Übung</em>}</strong><small>{r.openTasks?r.openTasks===1?'1 offene Aufgabe':r.openTasks+' offene Aufgaben':'Keine offenen Aufgaben'}</small></span><ChevronRight size={17}/></button>)}{!rooms.length&&<p className="rw-muted">Noch kein Projekt. Lege euer erstes Projekt an.</p>}</section>
    <GeneralKnowledge/>
   </div>:
   route.page==='conversations'?<div className="rw-page team-page studio-conversations-page">
    <h1>Team</h1>
    <p className="studio-page-intro">Allgemeines Gespräch für alles, was keinem Projekt gehört.</p>
    <GeneralChat userId={user.userId} onTask={(room,task)=>navigate({page:'rooms',room,tab:'tasks',task})}/>
    {!!rooms.length&&<section aria-labelledby="studio-project-talks"><h2 id="studio-project-talks">In den Projekten</h2>
     {rooms.map(r=><button className="team-work-card" key={r.id} onClick={()=>openChat(r.id,'all')}><MessageSquare size={18}/><span><strong>{r.title}{r.practice&&<em className="studio-practice-tag">Übung</em>}</strong><small>{[r.lastMessage?'Letzte Nachricht '+new Date(r.lastMessage).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Noch keine Nachricht',r.openTasks?r.openTasks===1?'1 offene Aufgabe':r.openTasks+' offene Aufgaben':null].filter(Boolean).join(' · ')}</small></span><ChevronRight size={17}/></button>)}
    </section>}
   </div>:
   !route.room?<ChatsHome rooms={rooms} greeting={'Hallo '+user.displayName.split(' ')[0]} waiting={waiting} onOpen={openChat} onGeneral={()=>goPage('conversations')} onCreateProject={()=>setModal({kind:'room'})} onAgents={()=>goPage('agents')}/>:
   !room?<div className="rw-loading">Projekt wird geladen …</div>:<>
    <div className={'team-project-content r3-project-content'+(rooms.find(r=>r.id===route.room)?.practice?' studio-practice':'')}>
     <Conversation key={room.project.id} room={room} resources={resources} userId={user.userId} search="" refresh={refresh} onTask={id=>navigate({task:id})} onConvert={(kind,source)=>setModal({kind,source})} onBack={()=>goPage('rooms')}
      projectNavigation={<MessengerProjectNavigation rooms={rooms} project={room.project.id} connected={connected} onProject={id=>navigate({room:id,tab:'talk',task:'',page:'rooms'})} onPage={goPage} onCreate={()=>setModal({kind:'room'})}/>}
      tools={<div className="r3-chat-tools">
       <button className="r3-icon-button" aria-label="Projektwerkzeuge: Aufgaben, Dateien, Wissen, Info" title="Aufgaben, Dateien, Wissen, Info" aria-pressed={tab!=='talk'} onClick={()=>navigate({tab:tab==='talk'?'tasks':'talk'})}><LayoutGrid size={19}/></button>
      </div>}
      detailKey={tab} detailTitle={detailTitles[tab]} onCloseDetail={()=>navigate({tab:'talk'})} onFiles={()=>navigate({tab:'files'})}
      detailNavigation={<ProjectToolbar tab={tab} onTab={t=>navigate({tab:t})}/>}
      detail={tab==='talk'?undefined:<>
       {tab==='overview'&&<ProjectOverview room={room} tasks={projectTasks} events={projectEvents} active={(team.active??[]).filter(j=>j.project===route.room)} members={members} resources={resources} userId={user.userId} onOpenTask={openTask} onTab={tab=>navigate({tab,task:''})} onRepository={()=>setModal({kind:'repository'})} onRefresh={refresh}/>}
       {tab==='tasks'&&<><div className="r3-panel-actions"><button className="rw-button lime" onClick={()=>setModal({kind:'task'})}><Plus size={16}/>Aufgabe</button></div><TaskList tasks={projectTasks} userId={user.userId} name={name} search={search} onSearch={setSearch} onOpen={openTask}/></>}
       {tab==='files'&&!route.task&&<ProjectFiles key={room.project.id} room={room} userId={user.userId} onTask={id=>navigate({task:id})} onTasks={()=>navigate({tab:'tasks'})} onSetup={()=>navigate({tab:'connect'})}/>}
       {tab==='knowledge'&&<><TeamKnowledge room={room} search="" refresh={refresh} onNew={kind=>setModal({kind})} onSource={source=>{navigate({tab:'talk'});requestAnimationFrame(()=>document.getElementById('message-'+source)?.scrollIntoView({block:'center'}));}}/><ProjectBriefing room={room} tasks={projectTasks}/></>}
       {tab==='activity'&&<><p className="r3-panel-intro">Echte Aufträge mit deinem freigegebenen Modellzugang. Ein Agentenprofil allein startet keinen Modelllauf.</p><RoomAssistant room={room} resources={resources} userId={user.userId} onClose={()=>navigate({tab:'talk'})} onRefresh={refresh} onConnect={()=>navigate({tab:'connect'})}/><details className="r3-usage-note"><summary>Verbrauch und Kontingente</summary><p>Der aktuelle Runner liefert keine belastbaren Tokenzahlen, Kontextfenster-Auslastung oder verbleibenden Abo-Kontingente. Studio zeigt deshalb keine geschätzten Prozentwerte. Den tatsächlich mitgesendeten Projektkontext kannst du oben prüfen.</p></details></>}
       {tab==='connect'&&<ProjectSettings room={room} resources={resources} userId={user.userId} refresh={refresh} onRepository={()=>setModal({kind:'repository'})}/>}
      </>}
     />
    </div>
   </>}
  </main>
  {!route.task&&!modal&&<ScrollHint/>}
  {!route.task&&!modal&&<nav className="studio-mobile-nav" aria-label="Hauptnavigation">
   <button aria-current={isHome?'page':undefined} className={isHome?'active':''} onClick={()=>goPage('rooms')}><MessagesSquare size={21}/><span>Chats</span></button>
   <button aria-current={route.page==='agents'?'page':undefined} className={route.page==='agents'?'active':''} onClick={()=>goPage('agents')}><Bot size={21}/><span>Agenten</span></button>
   <button aria-current={route.page==='projects'||inProject?'page':undefined} className={route.page==='projects'||inProject?'active':''} onClick={()=>goPage('projects')}><Folder size={21}/><span>Projekte</span></button>
   <button aria-current={route.page==='account'||route.page==='team'?'page':undefined} className={route.page==='account'||route.page==='team'?'active':''} onClick={()=>goPage('account')}><UserRound size={21}/><span>Konto</span></button>
  </nav>}
  {modal&&<RoomModal spec={modal} room={room} onClose={()=>setModal(null)} onSaved={async r=>{setModal(null);if(r.project)navigate({room:r.project,page:'rooms',tab:'talk',task:''});await refresh();if(r.task)navigate({task:r.task});}}/>}
  {route.task&&room&&<TeamTaskView key={route.task} taskId={route.task} room={room} resources={resources} userId={user.userId} onClose={closeTask} onRefresh={refresh} onConnect={()=>{navigate({task:'',tab:'connect'});setSpot('.po-ready');}}/>}
 </div>;
}

function ProjectSettings({room,resources,userId,refresh,onRepository}:{room:RoomState;resources:Resource[];userId:string;refresh:()=>Promise<void>;onRepository:()=>void}){
 const access=useProjectAccess(room.project.id,userId);
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
  {access.admin?<form className="team-form" key={room.meta.revision} onSubmit={update}><label>Name<input name="title" required defaultValue={room.project.title} maxLength={160}/></label><label>Worum geht es?<textarea name="description" defaultValue={room.project.description} maxLength={12000} placeholder="Ein, zwei Sätze zum Ziel."/></label><input type="hidden" name="base" value={room.meta.base??'main'}/><input type="hidden" name="workflow" value={room.meta.workflow??'pull-request'}/><button className="rw-button lime">Speichern</button></form>:<div className="studio-readonly"><p><strong>{room.project.title}</strong></p><p>{room.project.description||'Noch kein Ziel beschrieben.'}</p><small className="rw-muted">Name und Ziel ändert der Projekt-Admin.</small></div>}
  <h2>Einrichtung</h2><ProjectReady room={room} resources={resources} members={room.members} userId={userId} onRepository={onRepository} onRefresh={refresh}/>
  <ProjectRoles project={room.project.id}/>
  <details className="team-secondary team-developer"><summary>Für Entwickler</summary>
  {access.admin&&<form className="team-form" key={'dev'+room.meta.revision} onSubmit={update}><input type="hidden" name="title" value={room.project.title}/><input type="hidden" name="description" value={room.project.description}/><label>Hauptbranch<input name="base" required defaultValue={room.meta.base??'main'} maxLength={100}/></label><label>Wie freigegebene Änderungen übernommen werden<select name="workflow" defaultValue={room.meta.workflow??'pull-request'}><option value="pull-request">Über GitHub (Pull Request)</option>{!room.meta.repository&&<option value="direct">Direkt durch die Werkstatt</option>}</select></label><button className="rw-button">Speichern</button></form>}
  <section className="studio-dev-pc"><h3>Eigener PC (optional)</h3><p>Studio arbeitet in der Werkstatt des Projekts. Einen eigenen PC brauchst du nur, wenn du lieber lokal arbeitest.</p><button ref={runnerToggle} className="rw-button" aria-expanded={showRunner} onClick={()=>{if(showRunner)closeRunner();else openRunner();}}>{showRunner?'Schliessen':'Eigenen PC verbinden'}</button>{resources.some(r=>r.owner===userId)&&<Executors project={room.project.id} embedded onSetup={openSetup}/>}{showRunner&&<div ref={runnerPanel} tabIndex={-1}><RunnerConnect project={room.project.id} projects={[room.project]} onRegistered={refresh} onClose={closeRunner}/></div>} {showSetup&&<><div ref={setupPanel} tabIndex={-1}><ProjectConnect key={setupDevice} project={room.project.id} projectTitle={room.project.title} initialDevice={setupDevice} resources={resources} userId={userId} onDone={refresh}/></div></>}{checking&&<p role="status">Einrichtungsstand wird geladen …</p>}</section></details></section>;
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
 return <section aria-labelledby="team-ai"><h2 id="team-ai">ChatGPT greift auf Studio zu (Connector)</h2>
  <p>Damit dein ChatGPT Aufgaben lesen und Änderungen machen kann, fügst du Studio in ChatGPT einmal als Verbindung (Connector) hinzu. Diese Adresse trägst du dort ein:</p>
  <div className="team-copy"><code>{address}</code><button className="rw-button" onClick={()=>void navigator.clipboard?.writeText(address).then(()=>setCopied(true))}><Copy size={16}/>{copied?'Kopiert':'Kopieren'}</button></div>
  <p className="rw-muted">ChatGPT fragt danach, ob es auf Studio zugreifen darf. Du bestätigst es auf einer Studio-Seite. Jede Person verbindet ihr eigenes ChatGPT.</p>
 </section>;
}

/** One tool bar per project: the same four areas on phone (sheet) and desktop (right column).
 * Info covers overview, AI & context and settings, reachable as a second row inside it. */
const toolTabs:{id:RoomTab;label:string}[]=[{id:'tasks',label:'Aufgaben'},{id:'files',label:'Dateien'},{id:'knowledge',label:'Wissen'},{id:'overview',label:'Info'}];
const infoTabs:{id:RoomTab;label:string}[]=[{id:'overview',label:'Übersicht'},{id:'activity',label:'KI & Kontext'},{id:'connect',label:'Einstellungen'}];
function ProjectToolbar({tab,onTab}:{tab:string;onTab:(tab:RoomTab)=>void}){
 const info=['overview','activity','connect'].includes(tab);
 return <div className="r3-toolbar">
  <div className="r3-toolbar-tabs" role="tablist" aria-label="Projektwerkzeuge">{toolTabs.map(t=>{const on=t.id==='overview'?info:tab===t.id;return <button key={t.id} role="tab" aria-selected={on} className={on?'on':''} onClick={()=>onTab(t.id)}>{t.label}</button>;})}</div>
  {info&&<div className="r3-toolbar-sub" role="group" aria-label="Info">{infoTabs.map(t=><button key={t.id} aria-pressed={tab===t.id} className={tab===t.id?'on':''} onClick={()=>onTab(t.id)}>{t.label}</button>)}</div>}
 </div>;
}
