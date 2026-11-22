import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {Studio} from './app';
import {api,clock,draft,newId,q,type Agent,type Member,type Message,type Proposal,type Run} from './api';
import {Face,photoOf} from './avatar';
import {RichText} from './rich-text';
import {jobOf,introOf,JOBS,leadOf,messagesOf,runActive,runLine,teamOrder} from './model';
import {Close,ErrorLine,Mark,Send} from './parts';

// One chat for three places: the project chat, a private chat with an agent, and the conversation of a task.
export type ChatPlace={kind:'group'}|{kind:'agent';agent:Agent}|{kind:'member';member:Member}|{kind:'task';task:string;thread:Message[];onChanged:()=>void}
 /** A private chat of others, readable for the team: read only. */
 |{kind:'team';chat:string;messages:Message[];more:boolean};
const MARK=['blau','grün','orange','lila'];

export function Chat({studio,place}:{studio:Studio;place:ChatPlace}){
 const {room,runs,me,go,roles}=studio;
 const canTalk=place.kind!=='team'&&(roles?.mine.some(r=>r!=='viewer')??false);
 const project=room!.project.id,agents=teamOrder(room!.agents),lead=leadOf(room!.agents);
 const [older,setOlder]=useState<Message[]>([]),[more,setMore]=useState(place.kind==='team'?place.more:room!.more);
 const [seed,setSeed]=useState(''),[replyTo,setReplyTo]=useState<Message|null>(null),[marking,setMarking]=useState<string[]|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[now,setNow]=useState(()=>Date.now());
 const list=useMemo(()=>place.kind==='task'?place.thread:place.kind==='team'?[...older,...place.messages]:messagesOf([...older,...room!.messages],place.kind==='agent'?{agent:place.agent.id}:place.kind==='member'?{member:place.member.id}:{}),[older,room,place]);
 const ids=useMemo(()=>new Set(list.map(m=>m.id)),[list]);
 // Runs that answer a message of this place: working ones as a live line, failed ones once with "Nochmal".
 const placeRuns=runs.runs.filter(r=>ids.has(r.message)&&(runActive(r)||(r.status==='failed'||r.status==='cancelled')&&!r.completedMessage))
  .filter((r,i,all)=>all.findIndex(x=>x.message===r.message&&x.agent===r.agent)===i).sort((a,b)=>(a.position??0)-(b.position??0)||a.created-b.created);
 const chainRun=place.kind==='task'?runs.runs.filter(r=>ids.has(r.message)&&r.chain).sort((a,b)=>b.created-a.created)[0]:undefined;
 const anyWorking=placeRuns.some(runActive);
 useEffect(()=>{if(!anyWorking)return;const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[anyWorking]);

 const empty=list.length===0;
 const stream=useRef<HTMLDivElement>(null),follow=useRef(true);
 useLayoutEffect(()=>{
  const el=stream.current;if(!el)return;
  if(empty){
   el.scrollTop=0;
   follow.current=true;
  }else if(follow.current){
   el.scrollTop=el.scrollHeight;
  }
 },[empty,list.length,placeRuns.length,place.kind]);
 // The project team can expand above the chat without moving someone who is reading older messages.
 useLayoutEffect(()=>{
  const el=stream.current;
  if(!el||empty||place.kind!=='group')return;
  const observer=new ResizeObserver(()=>{
   if(follow.current)el.scrollTop=el.scrollHeight;
  });
  observer.observe(el);
  return ()=>observer.disconnect();
 },[empty,place.kind]);
 // Reading: only while this chat is on screen.
 const view=place.kind==='agent'?'agent:'+place.agent.id:place.kind==='member'?'member:'+place.member.id:place.kind==='group'?'all':null,last=list.at(-1)?.id;
 useEffect(()=>{if(!view||document.hidden||!last)return;void api('/api/room',{action:'read',project,view,messageId:last}).catch(()=>{});},[view,last,project]);

 async function ask(messageId:string,agent:string,retry=false){
  if(!runs.configured)return;
  await api('/api/agent-runs',{project,agent,message:messageId,...(retry?{retry:true}:{})});await studio.reloadRuns();
 }
 async function send(body:string,recipient?:string){
  const id=newId();
  const payload={action:'message',id,project,body,...(place.kind==='agent'?{recipient:place.agent.id,direct:true}:place.kind==='member'?{recipient:place.member.id,direct:true}:{}),...(place.kind==='task'?{topicTask:place.task}:{}),
   ...(marking&&recipient?{recipient,marked:marking}:{}),...(replyTo&&!marking?{replyTo:replyTo.id}:{})};
  const sent=await api<{ask?:string|null}>('/api/room',payload);
  follow.current=true;setMarking(null);setReplyTo(null);
  if(sent.ask)await ask(id,sent.ask);
  if(place.kind==='task')place.onChanged();
  await studio.reload();
 }
 async function act(fn:()=>Promise<unknown>){setBusy(true);setError('');try{await fn();await studio.reload();if(place.kind==='task')place.onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function loadOlder(){const first=list[0];if(!first)return;await act(async()=>{const r=await api<{messages:Message[];more:boolean}>((place.kind==='team'?'/api/room/chat?chat='+q(place.chat)+'&project=':'/api/room?project=')+q(project)+'&before='+q(first.id));setOlder(p=>[...r.messages,...p]);setMore(r.more);});}

 const nameOf=(id:string|null|undefined)=>agents.find(a=>a.id===id)?.name??room!.members.find(m=>m.id===id)?.name??'Jemand';
 const agentOf=(id:string|null|undefined)=>(room!.agents??[]).find(a=>a.id===id)??null;
 const greeter=place.kind==='agent'?place.agent:place.kind==='group'?lead:null;
 return <div className="ui-chat">
  <div className="ui-stream" ref={stream} onScroll={e=>{const el=e.currentTarget;follow.current=empty||el.scrollHeight-el.scrollTop-el.clientHeight<80;}}>
   {more&&place.kind!=='task'&&!empty&&<button className="ui-link center" disabled={busy} onClick={()=>void loadOlder()}>Ältere Nachrichten</button>}
   {empty&&greeter&&<div className="ui-intro"><Face agent={greeter} size={72}/><p>{introOf(greeter)}</p>
    {place.kind==='group'&&<>{canTalk&&<button className="ui-chip on" onClick={()=>setSeed('@'+greeter.name+' ')}>@{greeter.name} schreiben</button>}<p className="ui-muted">Alle im Projekt lesen hier mit. Agenten antworten nur, wenn ihr sie mit @Name holt.</p></>}</div>}
   {empty&&place.kind==='task'&&<p className="ui-muted center">Noch kein Gespräch. Hol jemanden aus dem Team mit @Name.</p>}
   {empty&&place.kind==='member'&&<p className="ui-muted center">Nur ihr zwei lest hier.</p>}
   {list.map(m=><Bubble key={m.id} m={m} me={me.id} place={place} agent={agentOf(m.senderAgent)} to={m.recipientKind==='agent'?nameOf(m.recipient):''}
    photo={photoOf(room!.members.find(person=>person.id===m.author),project)} canTalk={canTalk} marking={marking} onMark={()=>setMarking(x=>x?(x.includes(m.id)?x.filter(i=>i!==m.id):[...x,m.id].slice(0,20)):[m.id])}
    onOpenTask={task=>go({task})} busy={busy} onReply={canTalk&&(place.kind==='group'||place.kind==='task')&&agentOf(m.senderAgent)&&!m.inTask?()=>setReplyTo(m):undefined}
    onDecide={(p,decision)=>void act(()=>api('/api/agent-proposals/decide',{proposal:p.id,decision}))}
    onShare={()=>void act(()=>api('/api/room',{action:'share',project,id:newId(),message:m.id}))}
    nameOf={nameOf} taskTitle={id=>room!.tasks.find(t=>t.id===id)?.title??'Aufgabe'}/>)}
   {placeRuns.map(r=><RunLine key={r.id} run={r} agent={agentOf(r.agent)} now={now} online={runs.online!==false}
    onStop={()=>void act(()=>api('/api/agent-runs/cancel',{run:r.id}).then(()=>studio.reloadRuns()))}
    onRetry={()=>void act(()=>ask(r.message,r.agent,true))}/>)}
  </div>
  {chainRun?.chain&&chainRun.chain.used>1&&<ChainBar run={chainRun} onSteer={action=>void act(()=>api('/api/agent-chains',{run:chainRun.id,action}).then(()=>studio.reloadRuns()))}/>}
  <ErrorLine text={error}/>
  {canTalk&&(marking?<MarkBar count={marking.length} agents={agents} onCancel={()=>setMarking(null)} onSend={(agent,text)=>send(text,agent)}/>
   :<Composer key={seed} seed={seed} quote={replyTo?{name:nameOf(replyTo.senderAgent),text:glimpse(replyTo.body)}:null} onClearQuote={()=>setReplyTo(null)} place={place} agents={agents} draftKey={'ui:'+me.id+':'+project+':'+(view??'task:'+(place.kind==='task'?place.task:''))} onSend={body=>send(body)}
    placeholder={place.kind==='agent'?'Nachricht an '+place.agent.name+' …':place.kind==='member'?'Nachricht an '+place.member.name+' …':'Nachricht · @Name holt jemanden'} canMark={place.kind==='group'||place.kind==='task'} onMark={()=>setMarking([])}/>)}
 </div>;
}

/** In the project chat a task shows one short line; the whole text stays in the task. */
const glimpse=(text:string)=>{const one=text.replace(/\s+/g,' ').trim();return one.length>140?one.slice(0,137).trimEnd()+' …':one;};

function Bubble({m,me,place,agent,to,photo,canTalk,marking,onMark,onOpenTask,onDecide,onShare,onReply,nameOf,taskTitle,busy}:{m:Message;me:string;place:ChatPlace;agent:Agent|null;to:string;
 photo?:string;canTalk:boolean;marking:string[]|null;onMark:()=>void;onOpenTask:(task:string)=>void;onDecide:(p:Proposal,d:'accept'|'reject')=>void;onShare:()=>void;onReply?:()=>void;nameOf:(id:string)=>string;taskTitle:(id:string)=>string;busy:boolean}){
 const mine=!agent&&m.author===me&&m.kind!=='card';
 const selected=marking?.includes(m.id);
 if(m.kind==='card'&&m.card)return <div className="ui-card-line">
  <span>{m.card.from==='direct'?m.body.replace(/^.*?(aus \S+ Gespräch mit .*)$/,'Neu $1'):m.card.tasks.length>1?'Neue Aufgaben':'Neue Aufgabe'}</span>
  {m.card.tasks.slice(0,6).map((t,i)=><button key={t} className="ui-chip" onClick={()=>onOpenTask(t)}>{m.card!.titles[i]??'Aufgabe'} ›</button>)}
 </div>;
 // In the project chat, a task's conversation shows as one line that opens it.
 const inTask=place.kind==='group'&&m.inTask?m.inTask:null;
 return <div className={'ui-msg'+(mine?' mine':'')+(agent?' agent':'')+(selected?' selected':'')+(marking?' picking':'')}
  onClick={marking?onMark:undefined} onContextMenu={e=>{if(canTalk&&(place.kind==='group'||place.kind==='task')){e.preventDefault();onMark();}}}>
  {!mine&&<Face agent={agent} name={m.authorName??nameOf(m.author)} photo={photo} size={32}/>}
  <div className="ui-msg-body">
   {!mine&&<div className="ui-msg-head"><b>{agent?agent.name:m.authorName??nameOf(m.author)}</b>{to&&<span> an {to}</span>}<small>{clock(m.created)}</small></div>}
   {m.markColor!=null&&<span className={'ui-mark c'+m.markColor}>{MARK[m.markColor]} markiert</span>}
   {inTask&&<button className="ui-task-ref" onClick={()=>onOpenTask(inTask)}>In „{taskTitle(inTask)}“ ›</button>}
   <div className="ui-msg-text">{inTask?glimpse(m.body):agent?<RichText text={m.body}/>:m.body}</div>
   {m.proposalCard&&<ProposalCard p={m.proposalCard} busy={busy} onDecide={d=>onDecide(m.proposalCard!,d)} onOpenTask={onOpenTask} nameOf={nameOf}/>}
   {canTalk&&agent&&place.kind==='agent'&&!m.sharedBy&&<button className="ui-link" onClick={onShare}>Im Projekt teilen</button>}
   {onReply&&!marking&&<button className="ui-link" onClick={onReply}>Antworten</button>}
   {m.sharedBy&&<small className="ui-muted">geteilt von {nameOf(m.sharedBy)}</small>}
   {mine&&<small className="ui-msg-time">{clock(m.created)}</small>}
  </div>
 </div>;
}

/** A plan, a task or a hire the lead proposes. Only the person who asked decides. */
function ProposalCard({p,busy,onDecide,onOpenTask,nameOf}:{p:Proposal;busy:boolean;onDecide:(d:'accept'|'reject')=>void;onOpenTask:(t:string)=>void;nameOf:(id:string)=>string}){
 const kind=p.kind==='plan'?'Plan':p.kind==='hire'?'Einstellen':'Aufgabe';
 const job=p.kind==='hire'?JOBS.find(j=>j.role===p.hire?.role):null;
 return <div className={'ui-proposal '+p.status}>
  <small className="ui-label">{kind}{p.status==='pending'?' · Vorschlag':p.status==='accepted'?' · angenommen':' · abgelehnt'}</small>
  <b>{p.kind==='hire'?`${p.title} für ${job?.title??'das Team'}`:p.title}</b>
  {p.kind==='plan'&&p.plan&&<ol>{p.plan.tasks.map((t,i)=><li key={i}><span>{t.title}</span><small>{t.who&&t.who!=='Mensch'?t.who:'jemand von euch'}{t.done_when?' · Fertig, wenn: '+t.done_when:''}</small>
   {p.tasks?.[i]&&<button className="ui-link" onClick={()=>onOpenTask(p.tasks![i])}>Öffnen ›</button>}</li>)}</ol>}
  {p.kind==='plan'&&!!p.plan?.hire.length&&<p className="ui-muted">Fehlt im Team: {p.plan.hire.map(h=>h.role).join(', ')}. Herr Grau kann dafür jemanden einstellen.</p>}
  {p.kind==='hire'&&<p className="ui-muted">{job?.does}</p>}
  {p.kind!=='plan'&&p.kind!=='hire'&&p.description&&<p className="ui-muted">{p.description.slice(0,300)}</p>}
  {p.who&&p.kind!=='plan'&&<p className="ui-muted">Übernimmt: {nameOf(p.who)}</p>}
  {p.status==='pending'&&p.canDecide&&<div className="ui-actions">
   <button className="ui-btn" disabled={busy} onClick={()=>onDecide('reject')}>Nein danke</button>
   <button className="ui-btn primary" disabled={busy} onClick={()=>onDecide('accept')}>{p.kind==='hire'?'Einstellen':p.kind==='plan'?'Plan annehmen':'Annehmen'}</button>
  </div>}
  {p.status==='pending'&&!p.canDecide&&<p className="ui-muted">Entscheidet {nameOf(p.owner)}.</p>}
  {p.status==='accepted'&&p.task&&p.kind!=='plan'&&<button className="ui-link" onClick={()=>onOpenTask(p.task!)}>Aufgabe öffnen ›</button>}
 </div>;
}

function RunLine({run,agent,now,online,onStop,onRetry}:{run:Run;agent:Agent|null;now:number;online:boolean;onStop:()=>void;onRetry:()=>void}){
 const line=runLine(run,agent?.name??'Agent',now,online);if(!line)return null;
 return <div className={'ui-run '+line.tone}><Face agent={agent} size={24} working={line.tone==='work'}/><span>{line.text}</span>
  {line.stop&&<button className="ui-link" onClick={onStop}>Stopp</button>}{line.retry&&<button className="ui-link" onClick={onRetry}>Nochmal</button>}</div>;
}

function ChainBar({run,onSteer}:{run:Run;onSteer:(a:'stop'|'continue')=>void}){
 const c=run.chain!;
 return <div className={'ui-chain'+(c.full||c.stopped?' held':'')}>
  <span>{c.stopped?'Gestoppt.':c.full?`Grenze erreicht: ${c.used} von ${c.limit} Antworten.`:`Das Team arbeitet: ${c.used} von ${c.limit} Antworten.`}</span>
  {c.active&&!c.stopped&&<button className="ui-link" onClick={()=>onSteer('stop')}>Stopp</button>}
  {(c.full||c.stopped)&&<button className="ui-link" onClick={()=>onSteer('continue')}>Weitermachen</button>}
 </div>;
}

function Composer({seed,place,agents,draftKey,onSend,placeholder,canMark,onMark,quote,onClearQuote}:{quote:{name:string;text:string}|null;onClearQuote:()=>void;seed:string;place:ChatPlace;agents:Agent[];draftKey:string;onSend:(body:string)=>Promise<void>;placeholder:string;canMark:boolean;onMark:()=>void}){
 const [text,setText]=useState(()=>seed||draft(draftKey)),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const box=useRef<HTMLTextAreaElement>(null);
 useLayoutEffect(()=>{const el=box.current;if(!el)return;el.style.height='auto';el.style.height=Math.min(el.scrollHeight,132)+'px';},[text]);
 const at=/(?:^|\s)@([^\s@]*)$/.exec(text);
 const suggestions=(place.kind==='group'||place.kind==='task')&&at?agents.filter(a=>a.name.toLowerCase().startsWith(at[1].toLowerCase())).slice(0,6):[];
 function change(v:string){setText(v);draft(draftKey,v);}
 function pick(a:Agent){change(text.replace(/@([^\s@]*)$/,'@'+a.name+' '));box.current?.focus();}
 async function submit(){
  const body=text.trim();if(!body||busy)return;setBusy(true);setError('');
  try{await onSend(body);change('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <div className="ui-composer">
  {suggestions.length>0&&<div className="ui-suggest">{suggestions.map(a=><button key={a.id} onMouseDown={e=>{e.preventDefault();pick(a);}}><Face agent={a} size={22}/>{a.name}<small>{jobOf(a).title}</small></button>)}</div>}
  <ErrorLine text={error}/>
  {quote&&<div className="ui-quote"><span><b>Antwort an {quote.name}</b> {quote.text}</span><button className="ui-icon" aria-label="Antwort verwerfen" onClick={onClearQuote}><Close/></button></div>}
  <div className="ui-composer-row">
   {canMark&&<button className="ui-icon" aria-label="Nachrichten markieren und einen Agenten fragen" title="Markieren" onClick={onMark}><Mark/></button>}
   <textarea ref={box} rows={1} autoFocus={!!seed} value={text} placeholder={placeholder} aria-label="Nachricht" maxLength={8000}
    onChange={e=>change(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!('ontouchstart' in window)){e.preventDefault();void submit();}}}/>
   <button className="ui-send" aria-label="Senden" disabled={busy||!text.trim()} onClick={()=>void submit()}><Send/></button>
  </div>
 </div>;
}

function MarkBar({count,agents,onCancel,onSend}:{count:number;agents:Agent[];onCancel:()=>void;onSend:(agent:string,text:string)=>Promise<void>}){
 const [agent,setAgent]=useState(agents[0]?.id??''),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function go(){setBusy(true);setError('');try{await onSend(agent,text.trim());}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="ui-markbar">
  <p><b>{count?count+' markiert':'Tippe die Nachrichten an, um die es geht.'}</b> Der Agent liest nur diese.</p>
  <div className="ui-chips">{agents.map(a=><button key={a.id} className={'ui-chip'+(a.id===agent?' on':'')} onClick={()=>setAgent(a.id)}><Face agent={a} size={20}/>{a.name}</button>)}</div>
  <ErrorLine text={error}/>
  <div className="ui-composer-row">
   <button className="ui-btn" onClick={onCancel}>Abbrechen</button>
   <input value={text} onChange={e=>setText(e.target.value)} placeholder="Was soll er damit machen?" aria-label="Auftrag"/>
   <button className="ui-btn primary" disabled={busy||!count||!agent||!text.trim()} onClick={()=>void go()}>Fragen</button>
  </div>
 </div>;
}
