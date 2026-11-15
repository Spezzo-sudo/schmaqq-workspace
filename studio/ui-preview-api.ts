/**
 * Browser-only inspection mode for Cloudflare Pages.
 *
 * No production API, login, SQLite, runner or model access. All entries are
 * visibly fictional examples; writes update only this page's in-memory state.
 * Refreshing the browser restores the fixtures.
 */
import {FIELD_GUILD_R2_PRESETS} from './avatar-catalog';
import type {Room,RoomState,RoomAgent,RoomMessage,RoomMember} from './room-model';

const uid='preview-owner';
const projectId='studio-ui-preview';
const now=Date.now();
const members:RoomMember[]=[
 {id:uid,name:'Demo-Nutzer',role:'owner',seen:now,projectRoles:['admin']},
 {id:'preview-colleague',name:'Demo-Teammitglied',role:'member',seen:now,projectRoles:['developer','reviewer']}
];
const project:Room={id:projectId,title:'Studio – UI-Probelauf',description:'Fiktive Beispieldaten für die Oberflächenprüfung; keine reale Zusammenarbeit',color:'#c9fe6c',stage:'active',openTasks:0,lastMessage:now};
const agents:RoomAgent[]=FIELD_GUILD_R2_PRESETS.map((preset,index)=>({
 id:'preview-'+preset.id,project:projectId,name:preset.name,role:preset.recommendedRole,
 avatar:preset.fallbackCode,avatarPresetId:preset.id,avatarPackId:'field-guild-r2',
 purpose:preset.defaultPurpose,personality:preset.defaultPersonality,
 responsibility:preset.defaultPurpose,model:'Kein Modell verbunden',
 capabilities:['chat','context-read'],contextSources:['messages','tasks','decisions'],
 knowledgeScope:'Nur die fiktiven Beispielinhalte dieser Vorschau',
 permissions:{readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:false},
 active:true,createdBy:uid,updatedBy:uid,created:now-index*1000,updated:now
}));
const messages:RoomMessage[]=[
 {id:'preview-msg-1',channel:projectId,author:uid,body:'BEISPIELCHAT: Hier entsteht unser gemeinsamer Messenger. Alle Kontakte und Avatare sind Demonstrationsdaten.',created:now-180000,kind:'human',origin:'human'},
 {id:'preview-msg-2',channel:projectId,author:'preview-colleague',body:'Die Field Guild R2 hat zwölf Figuren. Tipp auf ein Portrait, um das Agentenprofil zu sehen.',created:now-120000,replyTo:'preview-msg-1',kind:'human',origin:'human'},
 {id:'preview-msg-3',channel:projectId,author:uid,body:'Diese Vorschau speichert nichts dauerhaft und führt keine KI-Aufträge aus.',created:now-60000,replyTo:'preview-msg-2',kind:'human',origin:'human'}
];

function data():RoomState {
 return {project,meta:{revision:0,repository:null,base:'main'},messages:[...messages],more:false,tasks:[],notes:[],links:[],members,agents:[...agents],runs:[]};
}
function respond(body:unknown,status=200):Response {
 return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-UI-Preview':'isolated-fixture'}});
}

export function installStudioUIPreview():void {
 // Keep preview visitors out of production; no real credential is ever sent.
 const original=window.fetch.bind(window);
 window.fetch=async(input:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
  const url=new URL(input instanceof Request?input.url:String(input),location.href);
  if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,init);
  const path=url.pathname;
  const method=(init?.method??(input instanceof Request?input.method:'GET')).toUpperCase();
  if(method==='GET'){
   if(path==='/api/studio')return respond({mode:'demo'});
   if(path==='/api/auth/session')return respond({user:{id:uid,name:'Demo-Nutzer',email:'demo@fixture.invalid'}});
   if(path==='/api/rooms')return respond({rooms:[project]});
   if(path==='/api/practice')return respond({project:null});
   if(path==='/api/room')return url.searchParams.get('project')===projectId?respond(data()):respond({error:'Dieses Beispielprojekt existiert nicht.'},404);
   if(path==='/api/ai')return respond({resources:[]});
   if(path==='/api/team')return respond({tasks:[],events:[],unread:[],active:[]});
   if(path==='/api/workspace')return respond({members});
   return respond({error:'Dieser Bereich benötigt das echte Studio-Backend. Die Online-Vorschau enthält nur Beispieldaten.'},503);
  }
  if(method==='POST'&&path==='/api/room'){
   let body:Record<string,unknown>={};
   try{body=JSON.parse(String(init?.body??'{}')) as Record<string,unknown>;}catch{return respond({error:'Ungültige Beispieldaten.'},400);}
   if(body.project!==projectId)return respond({error:'Nur das Beispielprojekt kann lokal bearbeitet werden.'},403);
   if(body.action==='message'){
    const id=String(body.id??'preview-msg-'+(messages.length+1));
    messages.push({id,channel:projectId,author:uid,body:String(body.body??''),created:Date.now(),kind:body.senderAgent?'agent':'human',origin:body.senderAgent?'human-authored':'human',
     replyTo:typeof body.replyTo==='string'?body.replyTo:null,recipient:typeof body.recipient==='string'?body.recipient:null,recipientKind:body.recipient?'agent':null,topicTask:null,senderAgent:typeof body.senderAgent==='string'?body.senderAgent:null});
    return respond({ok:true,message:id});
   }
   if(body.action==='agent'){
    const id=String(body.agentId||'preview-new-'+(agents.length+1));
    const previous=agents.findIndex(a=>a.id===id);
    const record={...(previous>=0?agents[previous]:agents[0]),...body,id,project:projectId,updated:Date.now(),created:previous>=0?agents[previous].created:Date.now(),createdBy:uid} as RoomAgent;
    if(previous>=0)agents[previous]=record;else agents.push(record);
    return respond({ok:true,agent:id,agentId:id});
   }
  }
  return respond({error:'UI-Probelauf: Diese Aktion benötigt das echte Studio-Backend. Hier werden keine echten Daten verändert.'},403);
 };
 // A meaningful first screen rather than a fake login form.
 if(!new URLSearchParams(location.search).has('room')&&!new URLSearchParams(location.search).has('page')){
  history.replaceState(null,'','/?room='+projectId+'&tab=talk');
 }
}
