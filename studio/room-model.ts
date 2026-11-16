import type {Task} from '../app/workspace-model';
export type Room={id:string;title:string;description:string;color:string;stage:string;openTasks?:number;lastMessage?:number;lastExcerpt?:string;unread?:number;practice?:boolean};
export type RoomMember={id:string;name:string;role:string;seen:number;removed?:number|boolean;invitedBy?:string|null;projectRoles?:string[]};
export type RoomAgentRole=
 |'coordinator'
 |'advisor'
 |'frontend'
 |'developer'
 |'reviewer'
 |'operations'
 |'strategy'
 |'researcher'
 |'debugger'
 |'infrastructure'
 |'security'
 |'support'
 |'knowledge';
export type RoomAgentCapability='chat'|'task-plan'|'task-delegate'|'code-work'|'review-support'|'context-read';
export type RoomAgentContextSource='messages'|'tasks'|'decisions'|'notes'|'repository'|'runs';
export type RoomAgentPermissions={
 readProject:boolean;
 writeMessages:boolean;
 manageTasks:boolean;
 editCode:boolean;
 prepareReviews:boolean;
 delegateAgents:boolean;
};
export type RoomAgent={
 id:string;
 project:string;
 name:string;
 nickname?:string;
 role:RoomAgentRole;
 avatar:string;
 avatarPresetId?:string|null;
 avatarPackId?:string;
 purpose:string;
 personality?:string;
 model:string;
 modelDevice?:string|null;
 capabilities:RoomAgentCapability[];
 contextSources?:RoomAgentContextSource[];
 knowledgeScope?:string;
 responsibility?:string;
 permissions?:RoomAgentPermissions;
 active:boolean;
 createdBy:string;
 updatedBy?:string;
 created:number;
 updated:number;
};
export type AgentHandoff={fromAgent?:string;toAgent:string;task?:string|null;summary:string;status:'delegated'|'in_progress'|'completed'|'requested'|'stopped'};
export type RoomMessage={id:string;channel:string;author:string;body:string;created:number;sequence?:number;replyTo?:string|null;kind?:'human'|'ai-shared'|'agent'|'agent-handoff';origin?:'human'|'human-authored'|'verified-run';model?:string;taskId?:string|null;topicTask?:string|null;recipient?:string|null;recipientKind?:'member'|'agent'|null;senderAgent?:string|null;handoff?:AgentHandoff|null;proposalCard?:AgentTaskProposal|null};
/** Hermes task proposal shown in the chat. Server decides `canDecide`; a proposal is never a task until accepted. */
export type AgentTaskProposal={id:string;title:string;description:string;kind:'general'|'code';status:'pending'|'accepted'|'rejected';task:string|null;agent:string;owner:string;canDecide:boolean};
export type RoomNote={id:string;title:string;body:string;author:string;updated:number;revision:number;kind:'note'|'decision';source?:string;archived?:boolean};
export type RoomLink={id:string;title:string;url:string;kind:'reference'|'chatgpt'|'github'|'result';author:string;created:number};
export type RoomRun={id:string;agentId?:string|null;owner:string;device:string;deviceName:string;status:string;model:string;output:string|null;error:string|null;sharedMessage:string|null;created:number;updated?:number;task:string|null};
/** One answer an agent owes to one message. Only the person who asked sees their runs. */
export type AgentRunStep={tool:string;at:number};
export type HermesAgentRun={id:string;owner:string;project:string;agent:string;message:string;model:string;status:'queued'|'running'|'cancelling'|'completed'|'failed'|'cancelled';created:number;updated:number;started?:number|null;finished?:number|null;position?:number|null;steps?:AgentRunStep[];completedMessage:string|null;errorCode:string|null};
export type RoomState={project:Room;meta:{revision:number;repository:string|null;base?:string;workflow?:string};messages:RoomMessage[];more:boolean;tasks:Task[];notes:RoomNote[];links:RoomLink[];members:RoomMember[];agents?:RoomAgent[];runs:RoomRun[];unread?:Record<string,number>};
/** Server-computed: ready only after a passed trial run on the shared main state. */
export type WorkshopReadiness={ready:boolean;missing:string;probe:{id:string;state:'ok'|'running'|'failed';at:number;error?:string}|null};
export type Resource={team?:boolean;device:string;owner:string;ownerName:string;name:string;online:boolean;status:string;models:string[];projects:string[];codex:string;allowTeam:boolean;grants:string[];development?:{id:string;setupVersion?:number;check:boolean;preview:boolean;allowCodex:boolean;readiness?:WorkshopReadiness;publish:boolean}[]};
export type ContextPreview={text:string;hash:string;messageIds:string[];task:string|null};
export type RoomTab='overview'|'talk'|'tasks'|'results'|'knowledge'|'connect'|'files'|'activity';
export type RoomPage='rooms'|'projects'|'conversations'|'team'|'account'|'guide'|'agents';
export type RoomRoute={room:string;tab:RoomTab;task:string;page:RoomPage};
// The five project areas stay inside each project, independently of the global navigation. Former "Ergebnisse" live under Aufgaben → Erledigt.
export const tabs:{id:RoomTab;label:string}[]=[{id:'overview',label:'Übersicht'},{id:'tasks',label:'Aufgaben'},{id:'talk',label:'Gespräch'},{id:'knowledge',label:'Wissen'},{id:'connect',label:'Einstellungen'}];
export function readRoomRoute(search=location.search):RoomRoute{
 const p=new URLSearchParams(search),old=p.get('view'),project=p.get('project'),explicit=p.get('tab');
 const room=p.get('room')??(project&&project!=='all'?project:'');
 const legacyTab:Record<string,RoomTab>={tasks:'tasks',docs:'knowledge',chat:'talk',development:'connect',settings:'connect',setup:'connect',models:'connect'};
 const tab=(tabs.some(t=>t.id===explicit)||explicit==='files'||explicit==='activity')?explicit as RoomTab:legacyTab[old??'']??'talk';
 const requested=p.get('page');
 const page:RoomPage=requested==='team'||requested==='projects'||requested==='conversations'||requested==='account'||requested==='guide'||requested==='agents'?requested:old==='team'?'team':'rooms';
 return {room,tab,task:room?p.get('task')??'':'',page};
}
/** Re-authentication restores only known internal room state, never an external redirect. */
export function roomResumeURL(search:string){
 const route=readRoomRoute(search),p=new URLSearchParams();
 if(/^[\w-]{1,100}$/.test(route.room)){p.set('room',route.room);if(route.tab!=='talk')p.set('tab',route.tab);if(/^[\w-]{1,100}$/.test(route.task)){p.set('task',route.task);const pane=new URLSearchParams(search).get('pane');if(['conversation','work','preview','review'].includes(pane??''))p.set('pane',pane!);}}
 const chat=new URLSearchParams(search).get('chat');
 if(p.has('room')&&chat&&/^(?:all|handoffs|(?:member|agent|topic):[\w-]{1,100})$/.test(chat))p.set('chat',chat);
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

/** A task title from a message: first line, at most 100 characters, cut at a word boundary with a visible "…". */
export function taskTitleFrom(body:string){
 const line=body.split('\n').map(l=>l.trim()).find(Boolean)??'';
 if(line.length<=100)return line;
 const cut=line.slice(0,99),space=cut.lastIndexOf(' ');
 return (space>40?cut.slice(0,space):cut).replace(/[\s,.;:–-]+$/,'')+'…';
}

export const agentRoleLabels:Record<RoomAgentRole,string>={
 coordinator:'Koordinator',
 advisor:'Technischer Berater',
 frontend:'Frontend / UX',
 developer:'Entwickler-Agent',
 reviewer:'Review / QA',
 operations:'Operations',
 strategy:'Forschung / Strategie',
 researcher:'Recherche / Ideen',
 debugger:'Debugging / Qualität',
 infrastructure:'Infrastruktur / Systeme',
 security:'Security',
 support:'Support',
 knowledge:'Wissen / Dokumentation'
};

export const agentCapabilityLabels:Record<RoomAgentCapability,string>={
 chat:'Projektgespräch',
 'task-plan':'Aufgaben planen',
 'task-delegate':'Aufgaben delegieren',
 'code-work':'Code-Vorschläge',
 'review-support':'Review-Vorprüfung',
 'context-read':'Projektkontext lesen'
};

export const agentContextSourceLabels:Record<RoomAgentContextSource,string>={
 messages:'Projektgespräch',
 tasks:'Projektaufgaben',
 decisions:'Entscheidungen',
 notes:'Wissen & Notizen',
 repository:'Repository-Referenz',
 runs:'Test- & Modellläufe'
};

export const agentPermissionLabels:Record<keyof RoomAgentPermissions,string>={
 readProject:'Projekt lesen',
 writeMessages:'Nachrichten schreiben',
 manageTasks:'Aufgaben anlegen und bearbeiten',
 editCode:'Code bearbeiten',
 prepareReviews:'Reviews vorbereiten',
 delegateAgents:'Andere Agenten beauftragen'
};

export function agentEffectivePermissions(agent?:Partial<RoomAgent>|null):RoomAgentPermissions{
 const explicit=agent?.permissions;
 if(explicit){
  return {
   readProject:Boolean(explicit.readProject),
   writeMessages:Boolean(explicit.writeMessages),
   manageTasks:Boolean(explicit.manageTasks),
   editCode:Boolean(explicit.editCode),
   prepareReviews:Boolean(explicit.prepareReviews),
   delegateAgents:Boolean(explicit.delegateAgents)
  };
 }
 const caps=agent?.capabilities??[];
 return {
  readProject:true,
  writeMessages:true,
  manageTasks:caps.includes('task-plan'),
  editCode:caps.includes('code-work'),
  prepareReviews:caps.includes('review-support'),
  delegateAgents:caps.includes('task-delegate')||agent?.role==='coordinator'
 };
}

/** The viewer's own AI access: configured = a worker is bound to this person, online = it asked for work recently. */
export type HermesAvailability={configured:boolean;online?:boolean;runs:HermesAgentRun[]};
export const agentRunActive=(run:Pick<HermesAgentRun,'status'>)=>run.status==='queued'||run.status==='running'||run.status==='cancelling';
const agentStepLabels:Record<string,string>={'project.read_context':'Projektstand gelesen','task.propose':'Aufgabe vorgeschlagen'};
export const agentStepLabel=(tool:string)=>agentStepLabels[tool]??'Arbeitsschritt';
export function workDuration(ms:number){
 const seconds=Math.max(1,Math.round(ms/1000));
 if(seconds<60)return seconds+' s';
 const rest=seconds%60;
 return Math.floor(seconds/60)+' min'+(rest?' '+rest+' s':'');
}
const agentRunFailures:Record<string,string>={
 timeout:'Das hat zu lange gedauert.',
 'provider-unavailable':'Der KI-Zugang war nicht erreichbar.',
 'quota-exceeded':'Das Kontingent deines KI-Zugangs ist aufgebraucht.',
 'protocol-error':'Die Antwort kam unvollständig an.'
};
/** The one line a person reads about a run. No engine names, no technical codes. */
export function agentRunSummary(run:HermesAgentRun,agentName:string,now:number,online=true):{tone:'waiting'|'working'|'done'|'failed'|'stopped';text:string;canStop:boolean;canRetry:boolean}{
 if(run.status==='queued'){
  const text=!online?`Wartet – der KI-Zugang von ${agentName} ist gerade nicht erreichbar`:(run.position??1)>1?`Wartet · Platz ${run.position}`:`${agentName} fängt gleich an`;
  return {tone:'waiting',text,canStop:true,canRetry:false};
 }
 if(run.status==='running')return {tone:'working',text:`${agentName} arbeitet · ${workDuration(now-(run.started??run.created))}`,canStop:true,canRetry:false};
 if(run.status==='cancelling')return {tone:'working',text:'Wird gestoppt …',canStop:false,canRetry:false};
 if(run.status==='completed')return {tone:'done',text:`Hat ${workDuration((run.finished??run.updated)-(run.started??run.created))} gearbeitet`,canStop:false,canRetry:false};
 if(run.status==='cancelled')return {tone:'stopped',text:'Gestoppt',canStop:false,canRetry:true};
 return {tone:'failed',text:'Keine Antwort. '+(agentRunFailures[run.errorCode??'']??'Dabei ist ein Fehler passiert.'),canStop:false,canRetry:true};
}
export function agentExecutionStatus(agent:RoomAgent,roomOrRuns:RoomState|RoomRun[]=[],resources:Resource[]=[],hermes:HermesAvailability|null=null):{
 state:'running'|'ready'|'idle';
 label:string;
 detail:string;
 modelAvailable:boolean;
 via:'runner'|'hermes'|null;
 connectedResource:Resource|null;
 activeRuns:RoomRun[];
 completedRuns:RoomRun[];
}{
 const runs=Array.isArray(roomOrRuns)?roomOrRuns:(roomOrRuns?.runs??[]);
 // A shared model does not identify an agent. Only an explicit run association may show this character as working.
 const agentRuns=runs.filter(r=>r.agentId===agent.id&&r.model===agent.model&&(!agent.modelDevice||r.device===agent.modelDevice));
 const activeRuns=agentRuns.filter(r=>r.status==='running'||r.status==='queued'||r.status==='cancelling');
 const completedRuns=agentRuns.filter(r=>r.status==='completed'||r.status==='failed');
 const matchingResource=(agent.modelDevice?resources.find(r=>r.device===agent.modelDevice):null)
  ??resources.find(r=>r.online&&(r.models.includes(agent.model)||(r.codex==='chatgpt'&&agent.model==='gpt-5-codex')))
  ??null;
 const modelAvailable=Boolean(matchingResource&&matchingResource.online);
 if(activeRuns.length>0){
  return {state:'running',label:'Modelllauf aktiv',detail:`Läuft tatsächlich auf ${activeRuns[0].deviceName} (${agent.model})`,modelAvailable,via:modelAvailable?'runner':null,connectedResource:matchingResource,activeRuns,completedRuns};
 }
 // Only a real queued/running run for exactly this agent counts as working.
 const hermesActive=hermes?.runs.some(r=>r.agent===agent.id&&(r.status==='queued'||r.status==='running'||r.status==='cancelling'))??false;
 if(hermesActive){
  return {state:'running',label:'Arbeitet gerade',detail:`Arbeitet gerade an deiner Nachricht (${agent.model})`,modelAvailable:true,via:'hermes',connectedResource:matchingResource,activeRuns,completedRuns};
 }
 if(modelAvailable){
  return {state:'ready',label:'Zugang verbunden · Ruhend',detail:`Modell ${agent.model} erreichbar über ${matchingResource!.name} (keine aktive Ausführung)`,modelAvailable:true,via:'runner',connectedResource:matchingResource,activeRuns,completedRuns};
 }
 if(hermes?.configured&&hermes.online===false){
  return {state:'idle',label:'Gerade nicht erreichbar',detail:'Der KI-Zugang antwortet im Moment nicht. Nachrichten warten, bis er wieder da ist.',modelAvailable:false,via:'hermes',connectedResource:matchingResource,activeRuns,completedRuns};
 }
 if(hermes?.configured){
  return {state:'ready',label:'Bereit',detail:`Antwortet, wenn du ${agent.name} schreibst (${agent.model})`,modelAvailable:true,via:'hermes',connectedResource:matchingResource,activeRuns,completedRuns};
 }
 return {state:'idle',label:'Inaktiv · Kein Live-Modell verbunden',detail:`Modell ${agent.model} als Profil hinterlegt – kein verbundener Modellzugang aktiv`,modelAvailable:false,via:null,connectedResource:matchingResource,activeRuns,completedRuns};
}

export function memberRoleSummary(member:RoomMember):string{
 const roles=member.projectRoles??[];
 if(roles.includes('admin')||member.role==='owner')return 'Admin';
 const parts:string[]=[];
 if(roles.includes('developer')||!roles.length)parts.push('Entwickler');
 if(roles.includes('reviewer')||!roles.length)parts.push('Prüfer');
 if(!parts.length&&roles.includes('viewer'))parts.push('Zuschauer');
 return parts.join(' · ')||'Mitglied';
}

export type MessengerFilter=
 |{kind:'all'}
 |{kind:'handoffs'}
 |{kind:'member';id:string}
 |{kind:'agent';id:string}
 |{kind:'topic';taskId:string};

export function filterMessengerMessages(messages:RoomMessage[],filter:MessengerFilter,search=''):RoomMessage[]{
 const q=search.trim().toLowerCase();
 return messages.filter(m=>{
  if(q&&!m.body.toLowerCase().includes(q))return false;
  if(filter.kind==='all')return true;
  if(filter.kind==='handoffs')return Boolean(m.handoff||m.kind==='agent-handoff'||m.senderAgent||m.recipientKind==='agent'||m.kind==='ai-shared');
  if(filter.kind==='member')return m.author===filter.id||m.recipient===filter.id;
  if(filter.kind==='agent')return m.senderAgent===filter.id||m.recipient===filter.id||m.handoff?.toAgent===filter.id;
  if(filter.kind==='topic')return m.taskId===filter.taskId||m.topicTask===filter.taskId;
  return true;
 });
}


