import type {Task} from '../app/workspace-model';
export type Room={id:string;title:string;description:string;color:string;stage:string;openTasks?:number;lastMessage?:number};
export type RoomMember={id:string;name:string;role:string;seen:number};
export type RoomMessage={id:string;channel:string;author:string;body:string;created:number;replyTo?:string|null;kind?:'human'|'ai-shared';model?:string;taskId?:string|null};
export type RoomNote={id:string;title:string;body:string;author:string;updated:number;revision:number;kind:'note'|'decision';source?:string};
export type RoomLink={id:string;title:string;url:string;kind:'reference'|'chatgpt'|'github'|'result';author:string;created:number};
export type RoomRun={id:string;owner:string;device:string;deviceName:string;status:string;model:string;output:string|null;error:string|null;sharedMessage:string|null;created:number;task:string|null};
export type RoomState={project:Room;meta:{revision:number;repository:string|null};messages:RoomMessage[];more:boolean;tasks:Task[];notes:RoomNote[];links:RoomLink[];members:RoomMember[];runs:RoomRun[]};
export type Resource={device:string;owner:string;ownerName:string;name:string;online:boolean;status:string;models:string[];projects:string[];codex:string;allowTeam:boolean;grants:string[]};
export type ContextPreview={text:string;hash:string;messageIds:string[];task:string|null};
export type RoomTab='talk'|'tasks'|'results'|'knowledge'|'connect';
export type RoomRoute={room:string;tab:RoomTab;task:string;page:'rooms'|'team'};
export const tabs:{id:RoomTab;label:string}[]=[{id:'talk',label:'Raum'},{id:'tasks',label:'Aufgaben'},{id:'results',label:'Ergebnisse'},{id:'knowledge',label:'Wissen'},{id:'connect',label:'Code & KI'}];
export function readRoomRoute(search=location.search):RoomRoute{
 const p=new URLSearchParams(search),old=p.get('view'),project=p.get('project'),explicit=p.get('tab');
 const room=p.get('room')??(project&&project!=='all'?project:'');
 const legacyTab:Record<string,RoomTab>={tasks:'tasks',docs:'knowledge',chat:'talk',development:'connect',settings:'connect',setup:'connect',models:'connect'};
 const tab=tabs.some(t=>t.id===explicit)?explicit as RoomTab:legacyTab[old??'']??'talk';
 return {room,tab,task:room?p.get('task')??'':'',page:p.get('page')==='team'||old==='team'?'team':'rooms'};
}
/** Re-authentication restores only known internal room state, never an external redirect. */
export function roomResumeURL(search:string){
 const route=readRoomRoute(search),p=new URLSearchParams();
 if(/^[\w-]{1,100}$/.test(route.room)){p.set('room',route.room);if(route.tab!=='talk')p.set('tab',route.tab);if(/^[\w-]{1,100}$/.test(route.task)){p.set('task',route.task);const pane=new URLSearchParams(search).get('pane');if(['conversation','work','preview','review'].includes(pane??''))p.set('pane',pane!);}}
 if(route.page==='team')p.set('page','team');
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
export const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
export function storedDraft(key:string){try{return sessionStorage.getItem(key)??'';}catch{return '';}}
export function saveDraft(key:string,value:string){try{value?sessionStorage.setItem(key,value):sessionStorage.removeItem(key);}catch{/* Private browsing can disallow storage; keep the React draft. */}}
export const stateLabel=(status:string)=>({queued:'Wartet auf Rechner',running:'Wird bearbeitet',completed:'Antwort bereit',failed:'Fehlgeschlagen',cancelled:'Abgebrochen',cancelling:'Wird gestoppt',interrupted:'Unterbrochen'}[status]??status);
