import type {Agent,Message,Run,TeamTask} from './api';

// The company: the role decides the job. Same table as the server (selfhost/agent-roles.mjs); a test keeps both equal.
export const ROLE_JOBS={code:['developer','frontend','debugger','infrastructure'],web:['researcher','strategy','knowledge'],review:['reviewer','security']} as const;
export const TEAM_LIMIT=6;

/** Jobs the lead can hire for, with what the colleague does, in one sentence. Same list as the server's HIRABLE. */
export const JOBS:{role:string;title:string;does:string;face:string;name:string;me:string}[]=[
 {role:'developer',title:'Entwicklung',does:'Ändert den Code einer Aufgabe und sagt, was er geändert hat.',face:'otto',name:'Otto',me:'Ich ändere den Code eurer Aufgaben und sage euch, was ich geändert habe.'},
 {role:'frontend',title:'Oberflächen',does:'Baut und verbessert, was man auf dem Bildschirm sieht.',face:'mara',name:'Mara',me:'Ich baue und verbessere, was man auf dem Bildschirm sieht.'},
 {role:'researcher',title:'Recherche',does:'Sucht im Internet und antwortet mit Quellen.',face:'eule',name:'Eule',me:'Ich suche im Internet und antworte mit Quellen.'},
 {role:'reviewer',title:'Prüfung',does:'Prüft jede Änderung, bevor du sie freigibst.',face:'frau-kern',name:'Frau Kern',me:'Ich prüfe jede Änderung, bevor ihr sie freigebt.'},
 {role:'security',title:'Sicherheit',does:'Prüft Änderungen auf Sicherheitslücken.',face:'dachs',name:'Dachs',me:'Ich prüfe Änderungen auf Sicherheitslücken.'},
 {role:'strategy',title:'Strategie',does:'Recherchiert Markt und Möglichkeiten und schlägt Wege vor.',face:'fuchs',name:'Fuchs',me:'Ich recherchiere Markt und Möglichkeiten und schlage Wege vor.'},
 {role:'creative',title:'Gestaltung und Text',does:'Schreibt Texte und macht Gestaltungsvorschläge im Gespräch.',face:'nova',name:'Nova',me:'Ich schreibe Texte und mache Gestaltungsvorschläge.'},
 {role:'support',title:'Kundendienst',does:'Beantwortet Fragen und formuliert Antworten für Kunden.',face:'baer',name:'Bär',me:'Ich beantworte Fragen und formuliere Antworten für eure Kunden.'}
];

export type Job={lead:boolean;code:boolean;web:boolean;review:boolean;title:string;does:string};
export function jobOf(agent:Pick<Agent,'role'|'lead'>):Job{
 const has=(list:readonly string[])=>!agent.lead&&list.includes(agent.role);
 const code=has(ROLE_JOBS.code),web=has(ROLE_JOBS.web),review=has(ROLE_JOBS.review);
 if(agent.lead)return {lead:true,code,web,review,title:'Leitung',does:'Plant, verteilt die Arbeit im Team und stellt ein, wen ihr noch braucht.'};
 const listed=JOBS.find(j=>j.role===agent.role);
 const title=listed?.title??(code?'Entwicklung':web?'Recherche':review?'Prüfung':'Beratung');
 const does=listed?.does??(code?'Ändert Code.':web?'Sucht im Internet.':review?'Prüft Änderungen.':'Berät im Gespräch.');
 return {lead:false,code,web,review,title,does};
}
export const activeAgents=(agents:Agent[]|undefined)=>(agents??[]).filter(a=>a.active!==false);
export const leadOf=(agents:Agent[]|undefined)=>activeAgents(agents).find(a=>a.lead)??null;
/** The team in the order of the company: the lead first, then by hiring. */
export const teamOrder=(agents:Agent[]|undefined)=>[...activeAgents(agents)].sort((a,b)=>Number(!!b.lead)-Number(!!a.lead)||a.created-b.created);

/** How an agent introduces itself in an empty chat. */
export function introOf(agent:Agent):string{
 if(agent.lead)return `Ich bin ${agent.name}, eure Projektleitung. Sagt mir, was ihr erreichen wollt: Ich mache einen Plan, verteile die Arbeit im Team und stelle ein, wen wir noch brauchen.`;
 const job=JOBS.find(j=>j.role===agent.role);
 return `Ich bin ${agent.name}, ${jobOf(agent).title} im Team. `+(job?.me??'Ich berate euch im Gespräch.');
}

// ---- What an agent is doing ----------------------------------------------------------------------
export const runActive=(run:Pick<Run,'status'>)=>run.status==='queued'||run.status==='running'||run.status==='cancelling';
const steps:Record<string,string>={'project.read_context':'liest den Projektstand','task.propose':'schreibt einen Vorschlag','plan.propose':'macht einen Plan',
 'agent.ask':'gibt Arbeit weiter','code.change':'ändert den Code','web.read':'liest eine Webseite','change.read':'prüft die Änderung','team.hire':'schlägt jemanden vor'};
const failures:Record<string,string>={timeout:'Das hat zu lange gedauert.','provider-unavailable':'Der KI-Zugang war nicht erreichbar.',
 'model-unavailable':'Der KI-Zugang hat die Anfrage abgelehnt.','quota-exceeded':'Das Kontingent des KI-Zugangs ist aufgebraucht.','protocol-error':'Die Antwort kam unvollständig an.'};
export function duration(ms:number){const s=Math.max(1,Math.round(ms/1000));return s<60?s+' s':Math.floor(s/60)+' min'+(s%60?' '+(s%60)+' s':'');}
/** One line about a run: who does what, or why nothing came. */
export function runLine(run:Run,name:string,now:number,online=true):{tone:'wait'|'work'|'fail'|'stop';text:string;stop:boolean;retry:boolean}|null{
 if(run.status==='queued')return {tone:'wait',text:!online?`${name} wartet, der KI-Zugang ist gerade nicht erreichbar`:(run.position??1)>1?`${name} wartet (Platz ${run.position})`:`${name} fängt gleich an`,stop:true,retry:false};
 if(run.status==='running'){const last=run.steps?.at(-1)?.tool;return {tone:'work',text:`${name} ${last&&steps[last]?steps[last]:'denkt nach'} · ${duration(now-(run.started??run.created))}`,stop:true,retry:false};}
 if(run.status==='cancelling')return {tone:'work',text:`${name} hört auf …`,stop:false,retry:false};
 if(run.status==='cancelled')return {tone:'stop',text:`${name} wurde gestoppt.`,stop:false,retry:true};
 if(run.status==='failed')return {tone:'fail',text:`${name} hat nicht geantwortet. `+(failures[run.errorCode??'']??'Dabei ist ein Fehler passiert.'),stop:false,retry:true};
 return null;
}

// ---- Tasks -----------------------------------------------------------------------------------------
export function taskState(t:Pick<TeamTask,'status'|'completion'|'contract'>):{label:string;tone:'open'|'work'|'approve'|'done'}{
 if(t.status==='done')return {label:'Erledigt',tone:'done'};
 if(t.status==='review'||t.completion?.result&&!t.completion.result.integrated&&t.contract?.kind==='code')return {label:'Zum Freigeben',tone:'approve'};
 if(t.status==='doing')return {label:'In Arbeit',tone:'work'};
 return {label:'Offen',tone:'open'};
}

// ---- Which messages a chat shows (the server names the conversation of every message: group | agent:<id> | member:<id>) ----
export function messagesOf(messages:Message[],place:{agent?:string;member?:string}):Message[]{
 if(place.agent)return messages.filter(m=>m.scope==='agent:'+place.agent);
 if(place.member)return messages.filter(m=>m.scope==='member:'+place.member);
 // Project chat: a task's conversation stands as one line (its latest message); a new-task card steps back behind it.
 const latest=new Map<string,string>();
 for(const m of messages)if(m.inTask&&(m.scope??'group')==='group')latest.set(m.inTask,m.id);
 return messages.filter(m=>(m.scope??'group')==='group'&&(!m.inTask||latest.get(m.inTask)===m.id)
  &&!(m.kind==='card'&&m.card?.from==='project'&&m.card.tasks.length===1&&latest.has(m.card.tasks[0])));
}

/** Without tests the team can still start (empty or unknown code): the check only proves the code is there.
 * Real tests come later with "Neu einrichten". The server validates it like any project setup. */
export const START_WITHOUT_TESTS={version:1,prepare:[],check:['node','-e','0'],requires:['node'],generated:[]};
