// Talking to the Studio server, the data it returns, and where in the app we are. Nothing visual here.

export type Project={practice?:boolean;id:string;title:string;description:string;color?:string;lastMessage?:number;lastExcerpt?:string;unread?:number;openTasks?:number};
export type Member={photo?:string|null;id:string;name:string;role:string;seen:number;removed?:number|boolean;projectRoles?:string[]};
export type Agent={id:string;project:string;name:string;role:string;avatar:string;avatarPresetId?:string|null;avatarPackId?:string;
 purpose:string;personality?:string;responsibility?:string;active:boolean;lead?:boolean;created:number;updated:number;model?:string;effort?:string|null;codeModel?:string|null;codeEffort?:string|null;
 nickname?:string;permissions?:Record<string,boolean>;capabilities?:string[];contextSources?:string[]};
export type Proposal={id:string;title:string;description:string;kind:'general'|'code'|'plan'|'hire';hire?:{role:string;agent:string|null};who?:string;
 status:'pending'|'accepted'|'rejected';task:string|null;tasks?:string[];agent:string;owner:string;canDecide:boolean;
 plan?:{tasks:{title:string;done_when:string;kind:'general'|'code';who:string}[];hire:{role:string;why:string}[]}};
export type Message={id:string;channel:string;author:string;authorName?:string;body:string;created:number;kind?:string;origin?:string;
 topicTask?:string|null;recipient?:string|null;recipientKind?:'member'|'agent'|null;senderAgent?:string|null;proposalCard?:Proposal|null;
 inTask?:string|null;sharedBy?:string|null;marked?:string[];markColor?:number|null;source?:boolean;
 card?:{from:'direct'|'project';agent?:string;tasks:string[];titles:string[]}|null;scope?:string};
export type Task={id:string;project:string;title:string;description:string;status:string;priority?:string;assignee:string|null};
export type Note={id:string;title:string;body:string;author:string;updated:number;revision:number;kind:'note'|'decision';archived?:boolean};
export type Showcase={url:string|null;at:number|null;building:boolean;error:string|null};
export type RoomState={project:Project;meta:{revision:number;archived?:boolean;repository:string|null;base?:string;workflow?:string;scope?:string[];live?:'merge'|'manual'|'show';liveHow?:string};showcase?:Showcase|null;
 neighbours?:{id:string;title:string;scope:string[]}[];messages:Message[];more:boolean;tasks:Task[];notes:Note[];members:Member[];agents?:Agent[];
 unread?:Record<string,number>};
export type Chain={root:string;depth:number;used:number;limit:number;stopped:boolean;full:boolean;active:boolean};
export type Run={id:string;owner:string;project:string;agent:string;message:string;status:'queued'|'running'|'cancelling'|'completed'|'failed'|'cancelled';
 created:number;updated:number;started?:number|null;position?:number|null;steps?:{tool:string;at:number}[];completedMessage:string|null;errorCode:string|null;chain?:Chain|null};
export type CatalogModel={id:string;label:string;efforts:string[];defaultEffort:string|null;context:number|null;note:string;enabled:boolean};
export type Runs={configured:boolean;online?:boolean;models?:string[];catalog?:CatalogModel[];runs:Run[]};
export type Contract={kind:'general'|'code';criteria:string;requiresReview:boolean;blocked:string;cancelled:boolean;revision:number};
export type Result={id:string;owner:string;body?:string;commit?:string;state:string;created:number;shared?:boolean;integrated?:boolean;changedAfter?:boolean;
 contractRevision?:number;workflow?:string};
export type TeamTask=Task&{contract:Contract;completion:{ready:boolean;missing:string[];result:Result|null};live?:{by:string;at:number}|null;awaitingLive?:boolean};
export type Team={tasks:TeamTask[];active?:{id:string;owner:string;project:string;action:string;status:string;task:string|null}[]};
export type Resource={team?:boolean;device:string;owner:string;ownerName:string;name:string;online:boolean;
 development?:{id:string;readiness?:{ready:boolean;missing:string;probe:{state:'ok'|'running'|'failed';error?:string}|null}}[]};
export type TaskDetail={task:TeamTask;thread:Message[];reviews:{id:string;owner:string;ownerName:string;created:number;commit:string;state:string;dropped?:string[];mergeWait?:{reason:string}|null}[];
 activeJobs:{id:string;action:string;status:string;ownerName:string;behind?:string}[];lastFailure:{id:string;action:string;owner:string;ownerName:string;text:string;detail:string;interrupted:boolean}|null;
 workspaces:{id:string;owner:string;changed?:boolean;behind?:number}[]};
export type Role='admin'|'developer'|'reviewer'|'viewer';
export type Roles={teamWorkshop?:boolean;review:'second'|'admin-alone';mine:Role[];members:{id:string;name:string;owner:boolean;roles:Role[]}[]};
export type Access={loaded:boolean;admin:boolean;develop:boolean;review:boolean;selfApprove:boolean;reviewers:string};
export function accessOf(roles:Roles|null,me:string):Access{
 if(!roles)return {loaded:false,admin:false,develop:true,review:true,selfApprove:false,reviewers:''};
 const has=(r:Role)=>roles.mine.includes(r),admin=has('admin');
 const reviewers=roles.members.filter(m=>m.id!==me&&(m.roles.includes('admin')||m.roles.includes('reviewer'))).map(m=>m.name).join(', ');
 return {loaded:true,admin,develop:admin||has('developer'),review:admin||has('reviewer'),selfApprove:admin&&roles.review==='admin-alone',reviewers};
}

export async function api<T>(path:string,body?:unknown):Promise<T>{
 const response=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let value:unknown;try{value=await response.json();}catch{throw new Error('Die Verbindung ist unterbrochen. Bitte gleich nochmal.');}
 if(response.status===401){location.replace('/');throw new Error('Bitte neu anmelden.');}
 if(!response.ok){const error=value&&typeof value==='object'&&'error' in value&&typeof (value as {error:unknown}).error==='string'?(value as {error:string}).error:'Das hat nicht geklappt.';throw Object.assign(new Error(error),{status:response.status});}
 return value as T;
}
export async function signOut(){
 try{await api('/api/auth/logout',{});}finally{
  try{sessionStorage.clear();}catch{/* tab storage unavailable */}
  location.replace('/');
 }
}
export const newId=()=>crypto.randomUUID();
export const q=(value:string)=>encodeURIComponent(value);

// ---- Where we are: one small set of URL parameters -------------------------------------------------
export type Page='start'|'project'|'account'|'guide'|'archive';
export const accountAreas=['profil','sicherheit','ki','daten','verwaltung'] as const;
export type AccountArea=typeof accountAreas[number];
export type Route={account?:AccountArea;page:Page;project:string;chat:string;tab:'chat'|'tasks';task:string;info:boolean;agent:string};
const idOk=(v:string|null)=>!!v&&/^[\w-]{1,100}$/.test(v);
export function readRoute(search=location.search):Route{
 const p=new URLSearchParams(search),project=p.get('p')??p.get('room')??'';
 const page=(['account','guide','archive'] as const).find(x=>x===p.get('page'))??(idOk(project)?'project':'start');
 const chat=p.get('chat')??'',account=page==='account'?accountAreas.find(area=>area===p.get('bereich')):undefined;
 return {...(account?{account}:{}),page,project:idOk(project)?project:'',chat:/^(agent|member):[\w-]{1,100}$/.test(chat)?chat:'',tab:p.get('tab')==='tasks'?'tasks':'chat',
  task:idOk(p.get('task'))?p.get('task')!:'',info:p.get('info')==='1',agent:idOk(p.get('agent'))?p.get('agent')!:''};
}
export function routeURL(r:Partial<Route>):string{
 const p=new URLSearchParams();
 if(r.page&&r.page!=='start'&&r.page!=='project')p.set('page',r.page);
 if(r.page==='account'&&r.account)p.set('bereich',r.account);
 if(r.project){p.set('p',r.project);if(r.chat)p.set('chat',r.chat);if(r.tab==='tasks')p.set('tab','tasks');if(r.task)p.set('task',r.task);if(r.info)p.set('info','1');if(r.agent)p.set('agent',r.agent);}
 return '/'+(p.size?'?'+p.toString():'');
}
/** After signing in again: back to the same place inside Studio, never somewhere else. */
export function resumeURL(search:string){const r=readRoute(search);return routeURL(r);}

// ---- Small helpers ------------------------------------------------------------------------------
export const clock=(at:number)=>new Date(at).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
export function when(at:number){
 const d=new Date(at),today=new Date();
 if(d.toDateString()===today.toDateString())return clock(at);
 const y=new Date(today);y.setDate(today.getDate()-1);if(d.toDateString()===y.toDateString())return 'gestern';
 return d.toLocaleDateString('de-CH',{day:'numeric',month:'short'});
}
export const initials=(name:string)=>{const w=name.replace(/\([^)]*\)/g,'').trim().split(/\s+/).filter(Boolean);return (w.length>1?w[0][0]+w.at(-1)![0]:(w[0]?.slice(0,2)??'?')).toUpperCase();};
export const plural=(n:number,one:string,many:string)=>n+' '+(n===1?one:many);
export function draft(key:string,value?:string){try{if(value===undefined)return sessionStorage.getItem(key)??'';if(value)sessionStorage.setItem(key,value);else sessionStorage.removeItem(key);}catch{/* private mode */}return value??'';}
