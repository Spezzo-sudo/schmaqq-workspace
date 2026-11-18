import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {api,q,readRoute,routeURL,type Member,type Project,type Resource,type Roles,type RoomState,type Route,type Runs,type Team} from './api';
import {onLiveSignal} from './live';
import {runActive} from './model';
import {StartScreen,Menu} from './start';
import {ProjectScreen} from './project';
import {TaskScreen} from './task';
import {InfoScreen} from './info';
import {AccountScreen,ArchiveScreen,GuideScreen} from './account';

export type Me={id:string;name:string;email:string};
/** Everything a screen needs: who I am, the data, and how to move and refresh. */
export type Studio={
 me:Me;route:Route;go:(next:Partial<Route>,replace?:boolean)=>void;
 projects:Project[];team:Team;members:Member[];resources:Resource[];agentsReady:boolean|null;
 room:RoomState|null;runs:Runs;roles:Roles|null;reload:()=>Promise<void>;reloadRuns:()=>Promise<boolean>;
 desktop:boolean;openMenu:()=>void;
};

function useWide(){
 const query='(min-width: 1000px)';
 const [wide,setWide]=useState(()=>matchMedia(query).matches);
 useEffect(()=>{const m=matchMedia(query),f=()=>setWide(m.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f);},[]);
 return wide;
}

export default function StudioApp({user}:{user:{userId:string;displayName:string;email:string}}){
 const me=useMemo(()=>({id:user.userId,name:user.displayName,email:user.email}),[user]);
 const [route,setRoute]=useState(()=>readRoute());
 const [projects,setProjects]=useState<Project[]>([]),[team,setTeam]=useState<Team>({tasks:[]}),[members,setMembers]=useState<Member[]>([]);
 const [resources,setResources]=useState<Resource[]>([]),[menu,setMenu]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 // Project data is kept together with the project it belongs to; another project never shows the old one's data.
 const [projectData,setProjectData]=useState<{project:string;room:RoomState|null;roles:Roles|null}>({project:'',room:null,roles:null});
 const [runState,setRunState]=useState<{project:string;runs:Runs}>({project:'',runs:{configured:false,runs:[]}});
 const desktop=useWide();
 const current=useRef(route.project);
 useLayoutEffect(()=>{current.current=route.project;},[route.project]);
 const room=projectData.project===route.project?projectData.room:null,roles=projectData.project===route.project?projectData.roles:null;
 const runs=runState.project===route.project?runState.runs:{configured:runState.runs.configured,online:runState.runs.online,runs:[]};

 const go=useCallback((next:Partial<Route>,replace=false)=>{
  const target=readRoute(routeURL({...(next.project===undefined&&next.page===undefined?readRoute():{}),...next}).slice(1));
  history[replace?'replaceState':'pushState'](null,'',routeURL(target));setRoute(target);setMenu(false);scrollTo(0,0);
 },[]);
 useEffect(()=>{const f=()=>setRoute(readRoute());addEventListener('popstate',f);return()=>removeEventListener('popstate',f);},[]);

 const reload=useCallback(async()=>{
  const project=current.current;
  try{
   const [p,t,m,a,r,roleState]=await Promise.all([api<{rooms:Project[]}>('/api/rooms'),api<Team>('/api/team'),api<{members:Member[]}>('/api/workspace'),
    api<{resources:Resource[]}>('/api/ai').catch(()=>({resources:[]})),project?api<RoomState>('/api/room?project='+q(project)):Promise.resolve(null),
    project?api<Roles>('/api/project-roles?project='+q(project)).catch(()=>null):Promise.resolve(null)]);
   setProjects(p.rooms);setTeam(t);setMembers(m.members);setResources(a.resources);
   if(project===current.current)setProjectData({project,room:r,roles:roleState});
   setError('');
  }catch(e){
   if(project===current.current){
    const error=e as Error & {status?:number};
    if(project&&(error.status===403||error.status===404)){
     setProjectData({project:'',room:null,roles:null});
     setProjects(previous=>previous.filter(p=>p.id!==project));
     go({page:'start',project:''},true);
    }
    setError(error.message);
   }
  }
  finally{setLoaded(true);}
 },[go]);
 const reloadRuns=useCallback(async()=>{
  const project=current.current;
  try{const r=await api<Runs>('/api/agent-runs'+(project?'?project='+q(project):''));if(project===current.current)setRunState({project,runs:r});return r.runs.some(runActive);}
  catch(e){if(project&&project===current.current&&(e as {status?:number}).status===403)void reload();return false;}
 },[reload]);
 // A different project: load it (until then its screens show "wird geladen").
 useEffect(()=>{let alive=true;Promise.resolve().then(()=>{if(alive){void reload();void reloadRuns();}});return()=>{alive=false;};},[route.project,reload,reloadRuns]);
 // Live: the server says "something changed here"; while agents work, look a bit more often.
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined,alive=true;
  const tick=async()=>{const busy=await reloadRuns();if(alive)timer=setTimeout(tick,busy?2500:15000);};
  timer=setTimeout(tick,2500);
  const stop=onLiveSignal(signal=>{if(signal.type==='runs'){void reloadRuns();}else void reload();if(signal.project===current.current)void reloadRuns();});
  const visible=()=>{if(!document.hidden){void reload();void reloadRuns();}};document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;clearTimeout(timer);stop();document.removeEventListener('visibilitychange',visible);};
 },[reload,reloadRuns]);
 // When an agent finishes, its answer is a new message: fetch the room once more.
 const working=runs.runs.filter(runActive).length;const lastWorking=useRef(working);
 useEffect(()=>{if(working<lastWorking.current)void reload();lastWorking.current=working;},[working,reload]);

 const agentsReady=runs.configured?runs.online!==false:null;
 const studio:Studio={me,route,go,projects,team,members,resources,agentsReady,room,runs,roles,reload,reloadRuns,desktop,openMenu:()=>setMenu(true)};
 if(!loaded)return <main className="ui-loading" role="status">Studio wird geladen …</main>;

 const inProject=route.page==='project'&&!!route.project;
 const side=inProject&&(route.task||route.info)?(route.task?<TaskScreen studio={studio} key={route.task}/>:<InfoScreen studio={studio}/>):null;
 const page=route.page==='account'?<AccountScreen studio={studio}/>:route.page==='guide'?<GuideScreen studio={studio}/>
  :route.page==='archive'?<ArchiveScreen studio={studio}/>:inProject?<ProjectScreen studio={studio}/>:<StartScreen studio={studio}/>;
 return <div className={'ui-app'+(desktop?' wide':'')}>
  {error&&<div className="ui-banner" role="alert">{error} <button onClick={()=>void reload()}>Nochmal</button></div>}
  {desktop?<div className="ui-columns">
   <aside className="ui-col-left"><StartScreen studio={studio} compact/></aside>
   <main className="ui-col-main">{inProject||route.page!=='start'?page:<div className="ui-empty-pane"><p>Wähle links ein Projekt.</p></div>}</main>
   {side&&<aside className="ui-col-right">{side}</aside>}
  </div>:<main className="ui-col-main">{side??page}</main>}
  {menu&&<Menu studio={studio} onClose={()=>setMenu(false)}/>}
 </div>;
}
