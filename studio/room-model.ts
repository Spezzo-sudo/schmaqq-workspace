import type {Task} from '../app/workspace-model';
export type Room={id:string;title:string;description:string;color:string;stage:string;openTasks?:number;lastMessage?:number};
export type RoomMember={id:string;name:string;role:string;seen:number};
export type RoomMessage={id:string;channel:string;author:string;body:string;created:number;replyTo?:string|null;kind?:'human'|'ai-shared';model?:string;taskId?:string|null};
export type RoomNote={id:string;title:string;body:string;author:string;updated:number;revision:number;kind:'note'|'decision';source?:string;archived?:boolean};
export type RoomLink={id:string;title:string;url:string;kind:'reference'|'chatgpt'|'github'|'result';author:string;created:number};
export type RoomRun={id:string;owner:string;device:string;deviceName:string;status:string;model:string;output:string|null;error:string|null;sharedMessage:string|null;created:number;task:string|null};
export type RoomState={project:Room;meta:{revision:number;repository:string|null;base?:string;workflow?:string};messages:RoomMessage[];more:boolean;tasks:Task[];notes:RoomNote[];links:RoomLink[];members:RoomMember[];runs:RoomRun[]};
export type Resource={device:string;owner:string;ownerName:string;name:string;online:boolean;status:string;models:string[];projects:string[];codex:string;allowTeam:boolean;grants:string[];development?:{id:string;setupVersion?:number;check:boolean;preview:boolean;allowCodex:boolean;publish:boolean}[]};
export type ContextPreview={text:string;hash:string;messageIds:string[];task:string|null};
export type RoomTab='overview'|'talk'|'tasks'|'results'|'knowledge'|'connect';
export type RoomPage='rooms'|'projects'|'conversations'|'team'|'account';
export type RoomRoute={room:string;tab:RoomTab;task:string;page:RoomPage};
// The five project areas stay inside each project, independently of the global navigation. Former "Ergebnisse" live under Aufgaben → Erledigt.
export const tabs:{id:RoomTab;label:string}[]=[{id:'overview',label:'Übersicht'},{id:'tasks',label:'Aufgaben'},{id:'talk',label:'Gespräch'},{id:'knowledge',label:'Wissen'},{id:'connect',label:'Einstellungen'}];
export function readRoomRoute(search=location.search):RoomRoute{
 const p=new URLSearchParams(search),old=p.get('view'),project=p.get('project'),explicit=p.get('tab');
 const room=p.get('room')??(project&&project!=='all'?project:'');
 const legacyTab:Record<string,RoomTab>={tasks:'tasks',docs:'knowledge',chat:'talk',development:'connect',settings:'connect',setup:'connect',models:'connect'};
 const tab=tabs.some(t=>t.id===explicit)?explicit as RoomTab:legacyTab[old??'']??'talk';
 const requested=p.get('page');
 const page:RoomPage=requested==='team'||requested==='projects'||requested==='conversations'||requested==='account'?requested:old==='team'?'team':'rooms';
 return {room,tab,task:room?p.get('task')??'':'',page};
}
/** Re-authentication restores only known internal room state, never an external redirect. */
export function roomResumeURL(search:string){
 const route=readRoomRoute(search),p=new URLSearchParams();
 if(/^[\w-]{1,100}$/.test(route.room)){p.set('room',route.room);if(route.tab!=='talk')p.set('tab',route.tab);if(/^[\w-]{1,100}$/.test(route.task)){p.set('task',route.task);const pane=new URLSearchParams(search).get('pane');if(['conversation','work','preview','review'].includes(pane??''))p.set('pane',pane!);}}
 if(route.page!=='rooms')p.set('page',route.page);
 return '/'+(p.size?'?'+p.toString():'');
}
export async function roomRequest<T>(path:string,body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch(path,{signal,...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 let value;try{value=await response.json();}catch{throw new Error('Die Verbindung ist unterbrochen. Dein Entwurf bleibt erhalten.');}
 if(response.status===401)throw new Error('Deine Sitzung ist abgelaufen. Bitte erneut anmelden; dein Entwurf bleibt in diesem Tab.');
 if(!response.ok){const error=value&&typeof value==='object'&&'error' in value&&typeof value.error==='string'?value.error:'Die Aktion konnte nicht abgeschlossen werden.';throw new Error(error);}
 return value as T;
}
export const operationId=()=>crypto.randomUUID();
export const time=(value:number)=>new Date(value).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'});
export const initials=(name:string)=>{const w=name.replace(/\([^)]*\)/g,'').trim().split(/\s+/).filter(Boolean);return (w.length>1?w[0][0]+w.at(-1)![0]:(w[0]?.[0]??'?')+(w[0]?.slice(-1)??'')).toUpperCase();};
export function storedDraft(key:string){try{return sessionStorage.getItem(key)??'';}catch{return '';}}
export function saveDraft(key:string,value:string){try{value?sessionStorage.setItem(key,value):sessionStorage.removeItem(key);}catch{/* Private browsing can disallow storage; keep the React draft. */}}
export const stateLabel=(status:string)=>({queued:'Wartet auf Rechner',running:'Wird bearbeitet',completed:'Antwort bereit',failed:'Fehlgeschlagen',cancelled:'Abgebrochen',cancelling:'Wird gestoppt',interrupted:'Unterbrochen'}[status]??status);

export type TaskContract={kind:'general'|'code';criteria:string;requiresReview:boolean;blocked:string;cancelled:boolean;revision:number};
export type TaskResult={id:string;owner:string;body?:string;commit?:string;branch?:string;state:string;created:number;shared?:boolean;integrated?:boolean;changedAfter?:boolean;contractRevision?:number;workflow?:string;votes?:{reviewer:string;decision:string;body:string;created:number}[]};
export type TeamTask=Task&{contract:TaskContract;completion:{ready:boolean;missing:string[];result:TaskResult|null};live?:{by:string;at:number}|null;awaitingLive?:boolean};
export type TeamEvent={id:string;actor:string;project:string;task:string|null;kind:string;body:string;created:number};
export type TeamJob={id:string;owner:string;project:string;action:string;status:string;created:number;task:string|null};
export type TeamState={tasks:TeamTask[];events:TeamEvent[];unread?:TeamEvent[];active?:TeamJob[]};
