import {useCallback,useEffect,useRef,useState} from 'react';
import {Bot,ClipboardCheck,Send,Users} from 'lucide-react';
import {AgentAvatar} from './agent-avatar';
import {AgentRunLine,ProposalCard} from './agent-activity';
import {RichText} from './rich-text';
import {onLiveSignal} from './live';
import {agentEffectivePermissions,agentRunActive,initials,operationId,roomRequest,saveDraft,storedDraft,time,type AgentTaskProposal,type HermesAgentRun,type RoomAgent,type RoomState} from './room-model';

export type TaskComment={id:string;author:string;authorName:string;body:string;created:number};
export type ThreadMessage={id:string;author:string;authorName:string;body:string;created:number;kind:string;origin:string;senderAgent:string|null;recipient:string|null;recipientKind:string|null;replyTo:string|null;source:boolean;proposalCard:AgentTaskProposal|null};

type Entry={id:string;created:number;body:string;authorName:string;author:string;agent:RoomAgent|null;recipient:RoomAgent|null;proposal:AgentTaskProposal|null;source:boolean;answer:boolean};

/**
 * The conversation of a task card, like a small chat: people write, and "@Name" asks one agent, who answers
 * with this task in mind (goal, "Fertig, wenn", this conversation). Agent answers can become the task's result.
 */
export default function TaskConversation({taskId,room,userId,comments,thread,onRefresh,onUseAsResult,onOpenTask}:{
 taskId:string;room:RoomState;userId:string;comments:TaskComment[];thread:ThreadMessage[];
 onRefresh:()=>Promise<void>;onUseAsResult?:(text:string)=>void;onOpenTask:(task:string)=>void;
}){
 const draftKey='room-task-chat:'+userId+':'+taskId;
 const [text,setText]=useState(()=>storedDraft(draftKey)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [runs,setRuns]=useState<HermesAgentRun[]>([]),[configured,setConfigured]=useState(false),[online,setOnline]=useState(true);
 const attempt=useRef({body:'',id:''}),input=useRef<HTMLTextAreaElement|null>(null),end=useRef<HTMLDivElement|null>(null);
 const agents=(room.agents??[]).filter(a=>a.active!==false&&agentEffectivePermissions(a).readProject&&agentEffectivePermissions(a).writeMessages);
 const agentById=(id:string|null)=>id?(room.agents??[]).find(a=>a.id===id)??null:null;

 const loadRuns=useCallback(async()=>{
  const state=await roomRequest<{configured:boolean;online?:boolean;runs:HermesAgentRun[]}>('/api/agent-runs?project='+encodeURIComponent(room.project.id));
  setConfigured(state.configured);setOnline(state.online!==false);setRuns(state.runs);
  return state.runs.some(agentRunActive);
 },[room.project.id]);
 useEffect(()=>{
  let alive=true,timer:ReturnType<typeof setTimeout>;
  const tick=async()=>{let working=false;try{working=await loadRuns();}catch{/* shown by the workspace */}if(working)void onRefresh();if(alive)timer=setTimeout(tick,working?2000:15000);};
  void tick();
  const stop=onLiveSignal(s=>{if((s.type==='runs'||s.type==='room')&&s.project===room.project.id){void loadRuns().catch(()=>{});void onRefresh();}});
  return()=>{alive=false;clearTimeout(timer);stop();};
 },[loadRuns,onRefresh,room.project.id]);

 const entries:Entry[]=[
  ...comments.map(c=>({id:c.id,created:c.created,body:c.body,authorName:c.authorName,author:c.author,agent:null,recipient:null,proposal:null,source:false,answer:false})),
  ...thread.map(m=>({id:m.id,created:m.created,body:m.body,authorName:m.authorName,author:m.author,agent:agentById(m.senderAgent),
   recipient:m.recipientKind==='agent'?agentById(m.recipient):null,proposal:m.proposalCard,source:m.source,answer:m.origin==='verified-run'}))
 ].sort((a,b)=>a.created-b.created);
 const last=entries.at(-1)?.id;
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[last]);

 async function send(){
  const body=text.trim();if(!body||busy)return;
  if(attempt.current.body!==body)attempt.current={body,id:operationId()};
  setBusy(true);setError('');
  try{
   const id=attempt.current.id;
   // Written in the task, the message belongs to the task; "@Name" makes the server address that agent.
   const sent=await roomRequest<{ask?:string|null}>('/api/room',{action:'message',project:room.project.id,id,body,topicTask:taskId});
   setText('');saveDraft(draftKey,'');
   if(sent.ask&&configured)await roomRequest('/api/agent-runs',{project:room.project.id,agent:sent.ask,message:id});
   await Promise.all([onRefresh(),loadRuns()]);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function decide(proposal:string,decision:'accept'|'reject'){
  setBusy(true);setError('');
  try{await roomRequest('/api/agent-proposals/decide',{proposal,decision});await onRefresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function stop(run:string){try{await roomRequest('/api/agent-runs/cancel',{run});await loadRuns();}catch(e){setError((e as Error).message);}}
 async function retry(run:HermesAgentRun){try{await roomRequest('/api/agent-runs',{project:room.project.id,agent:run.agent,message:run.message,retry:true});await loadRuns();}catch(e){setError((e as Error).message);}}
 // The latest chain of agents talking to each other in this task: counter, Stopp, "Weitermachen?".
 const threadIds=new Set(thread.map(m=>m.id));
 const chainRun=runs.filter(r=>r.chain&&threadIds.has(r.message)).sort((a,b)=>b.created-a.created)[0];
 const chain=chainRun?.chain??null;
 async function steer(action:'stop'|'continue'){if(!chainRun)return;try{await roomRequest('/api/agent-chains',{run:chainRun.id,action});await loadRuns();}catch(e){setError((e as Error).message);}}
 function mention(agent:RoomAgent){const next=('@'+agent.name+' '+text.replace(/^@\S+(\s\S+)?\s/,'')).trimStart();setText(next);saveDraft(draftKey,next);input.current?.focus();}

 return <div className="tc">
  <div className="tc-stream" aria-live="polite">
   {!entries.length&&<p className="tc-empty">Noch nichts geschrieben. Fragen, Ideen und Rückmeldungen zu dieser Aufgabe gehören hierher.
    {agents.length>0&&<> Mit <strong>@{agents[0].name}</strong> fragst du einen Agenten. Er kennt dann Ziel und „Fertig, wenn“ dieser Aufgabe.</>}</p>}
   {entries.map(e=>{
    const own=e.author===userId&&!e.agent,run=runs.find(r=>r.message===e.id);
    return <div key={e.id}>
     <article className={'tc-msg'+(own?' own':'')+(e.agent?' agent':'')}>
      {e.agent?<AgentAvatar agent={e.agent} size="sm"/>:<span className="rw-avatar">{initials(e.authorName)}</span>}
      <div className="tc-bubble">
       <header><strong>{e.agent?.name??e.authorName}</strong>{e.recipient&&<span className="r5-to">an {e.recipient.name}</span>}{e.source&&<span className="r5-to">Ursprung im Projektchat</span>}<time dateTime={new Date(e.created).toISOString()}>{time(e.created)}</time></header>
       {e.agent?<RichText text={e.body}/>:<p>{e.body}</p>}
       {e.proposal&&<ProposalCard proposal={e.proposal} busy={busy} onDecide={d=>void decide(e.proposal!.id,d)} onOpenTask={onOpenTask}/>}
       {e.agent&&e.answer&&onUseAsResult&&<button className="tc-use" onClick={()=>onUseAsResult(e.body)}><ClipboardCheck size={14}/>Als Ergebnis übernehmen</button>}
      </div>
     </article>
     {run&&e.recipient&&e.author===userId&&<AgentRunLine run={run} agent={e.recipient} online={online} busy={busy} onStop={()=>void stop(run.id)} onRetry={()=>void retry(run)}/>}
    </div>;
   })}
   <div ref={end}/>
  </div>
  {chain&&<div className={'tc-chain'+(chain.full||chain.stopped?' halted':'')} role="status">
   <Users size={15} aria-hidden/>
   <span>{chain.stopped?'Agenten-Kette gestoppt':chain.full?'Grenze erreicht – weitermachen?':'Agenten sprechen miteinander'} · <strong>{chain.used} von {chain.limit}</strong></span>
   {chain.active&&!chain.stopped&&<button type="button" onClick={()=>void steer('stop')}>Stopp</button>}
   {(chain.full||chain.stopped)&&<button type="button" onClick={()=>void steer('continue')}>Weitermachen</button>}
  </div>}
  {error&&<p className="rw-error" role="alert">{error}</p>}
  {agents.length>0&&<div className="tc-agents" role="group" aria-label="Agenten fragen">
   <span>Fragen:</span>
   {agents.map(a=><button key={a.id} type="button" onClick={()=>mention(a)} title={'@'+a.name+' fragen'}><AgentAvatar agent={a} size="xs"/>{a.name}</button>)}
  </div>}
  {!configured&&agents.length>0&&<p className="tc-note"><Bot size={13}/> Für dich ist noch kein KI-Zugang verbunden. Nachrichten an Agenten bleiben stehen, bis er eingerichtet ist.</p>}
  <form className="tc-composer" onSubmit={e=>{e.preventDefault();void send();}}>
   <textarea ref={input} aria-label="Nachricht zur Aufgabe" value={text} maxLength={4000} disabled={busy} placeholder="Nachricht …"
    onChange={e=>{setText(e.target.value);saveDraft(draftKey,e.target.value);}}
    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&matchMedia('(pointer:fine)').matches){e.preventDefault();void send();}}}/>
   <button className="rw-send" aria-label="Senden" disabled={busy||!text.trim()}><Send size={18}/></button>
  </form>
 </div>;
}
