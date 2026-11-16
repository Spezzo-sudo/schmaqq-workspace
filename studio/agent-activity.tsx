import {useEffect,useState} from 'react';
import {Check,ChevronRight,ListChecks,RotateCcw,Square,X} from 'lucide-react';
import {AgentAvatar} from './agent-avatar';
import {agentLiveActivity,agentRunActive,agentRunSummary,agentStepLabel,time,workDuration,type AgentTaskProposal,type HermesAgentRun,type RoomAgent} from './room-model';

/** Seconds only tick while something is actually running. */
function useNow(active:boolean){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{
  if(!active)return;
  setNow(Date.now());
  const timer=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(timer);
 },[active]);
 return now;
}

/** What an agent is doing, or did, for one message. While it works the steps stay open and the current one is named. */
export function AgentRunLine({run,agent,online,busy,onStop,onRetry}:{run:HermesAgentRun;agent:RoomAgent;online:boolean;busy:boolean;onStop:()=>void;onRetry:()=>void}){
 const active=agentRunActive(run),working=run.status==='running',now=useNow(active);
 const line=agentRunSummary(run,agent.name,now,online),steps=run.steps??[];
 const count=steps.length+(run.started?1:0);
 const stepCount=count&&!working?` · ${count} ${count===1?'Schritt':'Schritte'}`:'';
 const mark=<span className="r5-run-mark" aria-hidden="true"/>;
 const [open,setOpen]=useState(working);
 useEffect(()=>setOpen(working),[working]);
 const list=<ol>
  {run.started&&<li><span>Nachricht angenommen</span><time dateTime={new Date(run.started).toISOString()}>{time(run.started)}</time></li>}
  {steps.map((step,index)=><li key={index}><span>{agentStepLabel(step.tool)}</span><time dateTime={new Date(step.at).toISOString()}>{time(step.at)}</time></li>)}
  {working&&<li className="current"><span>{agentLiveActivity(run)} …</span></li>}
 </ol>;
 return <div className={'r5-run '+line.tone}>
  {count
   ?<details className="r5-run-steps" open={open} onToggle={e=>setOpen(e.currentTarget.open)}>
     <summary>{mark}<span>{line.text}{stepCount}</span><ChevronRight size={14} aria-hidden="true"/></summary>
     {list}
    </details>
   :<span className="r5-run-text">{mark}<span>{line.text}</span></span>}
  {line.canStop&&<button type="button" disabled={busy} onClick={onStop}><Square size={11} aria-hidden="true"/>Stoppen</button>}
  {line.canRetry&&<button type="button" disabled={busy} onClick={onRetry}><RotateCcw size={12} aria-hidden="true"/>Erneut versuchen</button>}
 </div>;
}

/** Sits at the end of the chat while an agent works: who, what right now, and for how long. */
export function AgentWorkingBubble({run,agent}:{run:HermesAgentRun;agent:RoomAgent}){
 const now=useNow(true);
 return <div className="r5-working" role="status" aria-label={agent.name+' arbeitet: '+agentLiveActivity(run)}>
  <span className="r5-working-pill"><AgentAvatar agent={agent} size="sm"/><span><strong>{agent.name}</strong><small>{agentLiveActivity(run)}</small></span><span className="r5-dots" aria-hidden="true"><i/><i/><i/></span></span>
  <small>Arbeitet seit {workDuration(now-(run.started??run.created))}</small>
 </div>;
}

const proposalStatus={pending:'Wartet auf dich',accepted:'Aufgabe angelegt',rejected:'Abgelehnt'};

/** A proposal is never a task until the person who asked accepts it. */
export function ProposalCard({proposal,busy,onDecide,onOpenTask}:{proposal:AgentTaskProposal;busy:boolean;onDecide:(decision:'accept'|'reject')=>void;onOpenTask:(task:string)=>void}){
 return <div className={'r5-proposal-card '+proposal.status} role="group" aria-label={'Aufgabenvorschlag: '+proposal.title}>
  <div className="r5-proposal-head"><ListChecks size={15} aria-hidden="true"/><span>Aufgabenvorschlag</span><span className={'r5-proposal-status '+proposal.status}>{proposalStatus[proposal.status]}</span></div>
  <p className="r5-proposal-title">{proposal.title}</p>
  {proposal.description&&<p className="r5-proposal-body">{proposal.description}</p>}
  {proposal.canDecide&&<div className="r5-proposal-actions">
   <button type="button" className="accept" disabled={busy} onClick={()=>onDecide('accept')}><Check size={15} aria-hidden="true"/>Als Aufgabe anlegen</button>
   <button type="button" disabled={busy} onClick={()=>onDecide('reject')}><X size={15} aria-hidden="true"/>Ablehnen</button>
  </div>}
  {proposal.status==='pending'&&!proposal.canDecide&&<small className="rw-muted">Nur die Person, die gefragt hat, entscheidet.</small>}
  {proposal.task&&<button type="button" className="r5-proposal-open" onClick={()=>onOpenTask(proposal.task!)}>Aufgabe öffnen<ChevronRight size={14} aria-hidden="true"/></button>}
 </div>;
}
