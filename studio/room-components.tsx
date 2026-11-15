import {useEffect,useRef,useState} from 'react';
import {ArrowRight,Bot,CheckCheck,ExternalLink,Hash,Link2,MessageSquare,Monitor,Pin,Plus,Reply,Search,Send,Sparkles,Users,X} from 'lucide-react';
import {
 roomRequest,operationId,time,initials,storedDraft,saveDraft,taskTitleFrom,
 agentRoleLabels,agentCapabilityLabels,memberRoleSummary,filterMessengerMessages,
 type RoomState,type RoomMember,type RoomMessage,type RoomAgent,type RoomAgentRole,type RoomAgentCapability,type Resource,type MessengerFilter
} from './room-model';
export type Modal={kind:'room'|'task'|'note'|'decision'|'link'|'repository';source?:RoomMessage;linkKind?:'chatgpt'|'github'|'result'|'reference'};

const DEFAULT_MODELS=['gpt-5-codex','gpt-4.1','o3','claude-sonnet-4','lokales-modell'];
const ALL_CAPABILITIES:RoomAgentCapability[]=['chat','task-plan','task-delegate','code-work','review-support'];

export function Conversation({room,resources=[],userId,search,refresh,onTask,onConvert}:{room:RoomState;resources?:Resource[];userId:string;search:string;refresh:()=>Promise<void>;onTask:(id:string)=>void;onConvert:(kind:'task'|'decision',source:RoomMessage)=>void}){
 const draftKey=`room-chat:${userId}:${room.project.id}`;
 const [text,setText]=useState(()=>storedDraft(draftKey)),[reply,setReply]=useState<RoomMessage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[older,setOlder]=useState<RoomMessage[]>([]),[more,setMore]=useState(room.more);
 const [filter,setFilter]=useState<MessengerFilter>({kind:'all'}),[localSearch,setLocalSearch]=useState('');
 const [recipient,setRecipient]=useState(''),[topicTask,setTopicTask]=useState(''),[senderAgent,setSenderAgent]=useState(''),[handoffTo,setHandoffTo]=useState(''),[handoffSummary,setHandoffSummary]=useState('');
 const [editingAgent,setEditingAgent]=useState<Partial<RoomAgent>|null>(null),[mobilePanel,setMobilePanel]=useState<'chat'|'contacts'|'topics'>('chat');
 const attempt=useRef({fingerprint:'',id:''});const end=useRef<HTMLDivElement|null>(null);const first=useRef(true);

 const activeMembers=room.members.filter(m=>!m.removed);
 const activeAgents=(room.agents??[]).filter(a=>a.active!==false);
 const me=activeMembers.find(m=>m.id===userId);
 const canDevelop=!me||me.role==='owner'||!me.projectRoles?.length||me.projectRoles.includes('admin')||me.projectRoles.includes('developer');
 const connectedModels=[...new Set(resources.filter(r=>r.online).flatMap(r=>[...r.models,...(r.codex==='chatgpt'?['gpt-5-codex']:[])]))];
 const modelOptions=[...new Set([...connectedModels,...DEFAULT_MODELS])];

 const messages=[...new Map([...older,...room.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id));
 useEffect(()=>{if(first.current&&messages.length){first.current=false;end.current?.scrollIntoView({block:'nearest'});}},[messages.length]);

 const selectedSenderAgent=activeAgents.find(a=>a.id===senderAgent)??null;
 const canDelegate=Boolean(selectedSenderAgent&&(selectedSenderAgent.role==='coordinator'||selectedSenderAgent.capabilities?.includes('task-delegate')));

 function selectFilter(next:MessengerFilter){
  setFilter(next);
  if(next.kind==='member'||next.kind==='agent')setRecipient(next.id);
  else if(next.kind==='all')setRecipient('');
  if(next.kind==='topic')setTopicTask(next.taskId);
  setMobilePanel('chat');
 }

 async function send(){
  if(!text.trim()||busy)return;
  const body=text.trim();
  const effectiveTopic=topicTask||(reply?.topicTask??reply?.taskId??'');
  const payload:Record<string,unknown>={
   action:'message',
   project:room.project.id,
   body,
   ...(reply?{replyTo:reply.id}:{}),
   ...(effectiveTopic?{topicTask:effectiveTopic}:{}),
   ...(recipient?{recipient}:{}),
   ...(senderAgent?{senderAgent}:{}),
   ...(canDelegate&&handoffTo&&handoffTo!==senderAgent?{handoff:{toAgent:handoffTo,summary:handoffSummary.trim()||taskTitleFrom(body),status:'delegated'}}:{})
  };
  const fingerprint=JSON.stringify(payload);
  if(attempt.current.fingerprint!==fingerprint)attempt.current={fingerprint,id:operationId()};
  setBusy(true);setError('');
  try{
   await roomRequest('/api/room',{...payload,id:attempt.current.id});
   setText('');saveDraft(draftKey,'');setReply(null);setHandoffTo('');setHandoffSummary('');
   await refresh();
   requestAnimationFrame(()=>end.current?.scrollIntoView({block:'nearest',behavior:'smooth'}));
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 async function saveAgent(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editingAgent||busy)return;
  const f=new FormData(e.currentTarget);
  const role=(f.get('role') as RoomAgentRole)||'developer';
  const caps=ALL_CAPABILITIES.filter(c=>f.get('cap-'+c)==='on');
  if(role==='coordinator'&&!caps.includes('task-delegate'))caps.push('task-delegate');
  if(!caps.length)caps.push('chat');
  const payload={
   action:'agent',
   id:operationId(),
   project:room.project.id,
   ...(editingAgent.id?{agentId:editingAgent.id}:{}),
   name:String(f.get('name')??'').trim(),
   avatar:String(f.get('avatar')??'').trim(),
   role,
   model:String(f.get('model')??'gpt-5-codex').trim(),
   purpose:String(f.get('purpose')??'').trim(),
   capabilities:caps,
   active:true
  };
  setBusy(true);setError('');
  try{await roomRequest('/api/room',payload);setEditingAgent(null);await refresh();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 async function removeAgent(agent:RoomAgent){
  if(busy)return;
  setBusy(true);setError('');
  try{
   await roomRequest('/api/room',{action:'agent',id:operationId(),project:room.project.id,agentId:agent.id,name:agent.name,role:agent.role,avatar:agent.avatar,model:agent.model,purpose:agent.purpose,capabilities:agent.capabilities,active:false});
   if(filter.kind==='agent'&&filter.id===agent.id)setFilter({kind:'all'});
   if(recipient===agent.id)setRecipient('');
   if(senderAgent===agent.id)setSenderAgent('');
   setEditingAgent(null);
   await refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 async function loadOlder(){
  setBusy(true);
  try{
   const r=await roomRequest<RoomState>('/api/room?project='+encodeURIComponent(room.project.id)+'&before='+encodeURIComponent(messages[0].id));
   setOlder(prev=>[...r.messages,...prev]);setMore(r.more);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 const query=(search+' '+localSearch).trim();
 const visible=filterMessengerMessages(messages,filter,query);
 const handoffCount=messages.filter(m=>m.handoff||m.kind==='agent-handoff'||m.senderAgent||m.recipientKind==='agent'||m.kind==='ai-shared').length;

 const activeFilterTitle=(()=>{
  if(filter.kind==='handoffs')return 'Agenten & Übergaben';
  if(filter.kind==='member')return 'Kontakt: '+(activeMembers.find(m=>m.id===filter.id)?.name??'Teammitglied');
  if(filter.kind==='agent')return 'KI-Teammitglied: '+(activeAgents.find(a=>a.id===filter.id)?.name??'Agent');
  if(filter.kind==='topic')return 'Thema: '+(room.tasks.find(t=>t.id===filter.taskId)?.title??'Aufgabe');
  return 'Alle im Projekt';
 })();

 return <section className="rw-conversation rw-messenger" aria-label="Projektgespräch">
  <div className="rw-messenger-mobile-tabs" role="tablist" aria-label="Messenger-Ansicht">
   <button role="tab" aria-selected={mobilePanel==='chat'} className={mobilePanel==='chat'?'active':''} onClick={()=>setMobilePanel('chat')}><MessageSquare size={15}/>Chat ({visible.length})</button>
   <button role="tab" aria-selected={mobilePanel==='contacts'} className={mobilePanel==='contacts'?'active':''} onClick={()=>setMobilePanel('contacts')}><Users size={15}/>Kontakte ({activeMembers.length+activeAgents.length})</button>
   <button role="tab" aria-selected={mobilePanel==='topics'} className={mobilePanel==='topics'?'active':''} onClick={()=>setMobilePanel('topics')}><Hash size={15}/>Themen ({room.tasks.length})</button>
  </div>

  <div className="rw-messenger-grid">
   <aside className={'rw-messenger-rail'+(mobilePanel!=='chat'?' mobile-open':'')} aria-label="Kontakte, Kanäle und Themen">
    <div className="rw-messenger-search">
     <Search size={15} aria-hidden="true"/>
     <input aria-label="Nachrichten im Projekt durchsuchen" value={localSearch} onChange={e=>setLocalSearch(e.target.value)} placeholder="Im Gespräch suchen …"/>
     {localSearch&&<button className="rw-icon" onClick={()=>setLocalSearch('')} aria-label="Suche leeren"><X size={14}/></button>}
    </div>

    {(mobilePanel==='chat'||mobilePanel==='contacts')&&<>
     <div className="rw-messenger-group">
      <div className="rw-messenger-group-head"><span>Gespräche</span></div>
      <button className={'rw-contact-row'+(filter.kind==='all'?' active':'')} onClick={()=>selectFilter({kind:'all'})}>
       <span className="rw-avatar channel"><MessageSquare size={15}/></span>
       <span className="rw-contact-meta"><strong>Alle im Projekt</strong><small>Gruppengespräch · {messages.length} {messages.length===1?'Nachricht':'Nachrichten'}</small></span>
      </button>
      <button className={'rw-contact-row'+(filter.kind==='handoffs'?' active':'')} onClick={()=>selectFilter({kind:'handoffs'})}>
       <span className="rw-avatar agent"><Bot size={15}/></span>
       <span className="rw-contact-meta"><strong>Agenten & Übergaben</strong><small>KI-Beiträge & Koordination · {handoffCount}</small></span>
      </button>
     </div>

     <div className="rw-messenger-group">
      <div className="rw-messenger-group-head"><span>Team ({activeMembers.length})</span></div>
      {activeMembers.map(m=>{
       const online=Date.now()-m.seen<120_000;
       const selected=filter.kind==='member'&&filter.id===m.id;
       return <button key={m.id} className={'rw-contact-row'+(selected?' active':'')} onClick={()=>selectFilter(selected?{kind:'all'}:{kind:'member',id:m.id})}>
        <span className="rw-avatar">{initials(m.name)}<i className={'rw-status-dot'+(online?' online':'')} aria-hidden="true"/></span>
        <span className="rw-contact-meta">
         <strong>{m.name}{m.id===userId?' (Du)':''}</strong>
         <small>{memberRoleSummary(m)} · {online?'Gerade aktiv':'Mitglied'}</small>
        </span>
       </button>;
      })}
     </div>

     <div className="rw-messenger-group">
      <div className="rw-messenger-group-head">
       <span>KI-Teammitglieder ({activeAgents.length})</span>
       {canDevelop&&<button className="rw-link rw-agent-add" onClick={()=>{setEditingAgent({role:'coordinator',model:connectedModels[0]??'gpt-5-codex',capabilities:['chat','task-plan','task-delegate']});setMobilePanel('chat');}}><Plus size={14}/>Neu</button>}
      </div>
      {!activeAgents.length&&<p className="rw-messenger-empty">Noch kein KI-Teammitglied angelegt.{canDevelop?' Lege z. B. einen Koordinator oder Prüf-Agenten mit Rolle und Modell an.':''}</p>}
      {activeAgents.map(a=>{
       const selected=filter.kind==='agent'&&filter.id===a.id;
       const modelLive=connectedModels.includes(a.model);
       return <div key={a.id} className={'rw-contact-card'+(selected?' active':'')}>
        <button className="rw-contact-row" onClick={()=>selectFilter(selected?{kind:'all'}:{kind:'agent',id:a.id})}>
         <span className="rw-avatar agent">{a.avatar||initials(a.name)}</span>
         <span className="rw-contact-meta">
          <strong>{a.name}</strong>
          <small>{agentRoleLabels[a.role]??a.role} · <code className="rw-agent-model">{a.model}</code> {modelLive?'· verbunden':'· Profil'}</small>
          {a.purpose&&<small className="rw-agent-purpose">{a.purpose}</small>}
         </span>
        </button>
        <div className="rw-agent-caps">
         {(a.capabilities??[]).map(c=><span key={c} className="rw-cap-pill">{agentCapabilityLabels[c]??c}</span>)}
         {canDevelop&&<button className="rw-link" onClick={()=>{setEditingAgent(a);setMobilePanel('chat');}}>Bearbeiten</button>}
        </div>
       </div>;
      })}
     </div>
    </>}

    {(mobilePanel==='chat'||mobilePanel==='topics')&&<div className="rw-messenger-group">
     <div className="rw-messenger-group-head"><span>Themen & Aufgaben ({room.tasks.length})</span></div>
     {!room.tasks.length&&<p className="rw-messenger-empty">Aus jeder Nachricht kannst du direkt eine Aufgabe machen.</p>}
     {room.tasks.slice(0,15).map(t=>{
      const count=messages.filter(m=>m.taskId===t.id||m.topicTask===t.id).length;
      const selected=filter.kind==='topic'&&filter.taskId===t.id;
      const statusText=t.status==='done'?'Erledigt':t.status==='review'?'Prüfung':t.status==='in_progress'?'In Arbeit':'Offen';
      return <div key={t.id} className={'rw-topic-row'+(selected?' active':'')}>
       <button className="rw-contact-row" onClick={()=>selectFilter(selected?{kind:'all'}:{kind:'topic',taskId:t.id})}>
        <span className={'rw-topic-dot '+t.status} aria-hidden="true"/>
        <span className="rw-contact-meta">
         <strong>{t.title}</strong>
         <small>{statusText}{count?` · ${count} ${count===1?'Beitrag':'Beiträge'}`:''}</small>
        </span>
       </button>
       <button className="rw-icon rw-topic-open" onClick={()=>onTask(t.id)} title="Aufgabe öffnen" aria-label={'Aufgabe öffnen: '+t.title}><ArrowRight size={14}/></button>
      </div>;
     })}
    </div>}
   </aside>

   <div className="rw-messenger-main">
    <header className="rw-messenger-header">
     <div>
      <strong>{activeFilterTitle}</strong>
      <small>
       {filter.kind==='all'&&`${activeMembers.length} ${activeMembers.length===1?'Mensch':'Menschen'} · ${activeAgents.length} ${activeAgents.length===1?'KI-Teammitglied':'KI-Teammitglieder'}`}
       {filter.kind==='handoffs'&&'Nachvollziehbare KI-Beiträge und Agent-zu-Agent-Übergaben im Projekt'}
       {filter.kind==='member'&&'Direkte Adressierung und gemeinsame Beiträge im Projektkontext'}
       {filter.kind==='agent'&&(()=>{const a=activeAgents.find(x=>x.id===filter.id);return a?`${agentRoleLabels[a.role]} · Modell ${a.model}${a.purpose?' · '+a.purpose:''}`:'';})()}
       {filter.kind==='topic'&&'Alle Nachrichten, Entscheidungen und Übergaben zu dieser Aufgabe'}
      </small>
     </div>
     <div className="rw-messenger-header-actions">
      {filter.kind==='topic'&&<button className="rw-button subtle" onClick={()=>onTask(filter.taskId)}><CheckCheck size={14}/>Aufgabe öffnen</button>}
      {filter.kind!=='all'&&<button className="rw-button subtle" onClick={()=>selectFilter({kind:'all'})}><X size={14}/>Alle zeigen</button>}
      {canDevelop&&!editingAgent&&<button className="rw-button subtle" onClick={()=>setEditingAgent({role:activeAgents.some(a=>a.role==='coordinator')?'developer':'coordinator',model:connectedModels[0]??'gpt-5-codex',capabilities:activeAgents.some(a=>a.role==='coordinator')?['chat','code-work']:['chat','task-plan','task-delegate']})}><Bot size={15}/>+ KI-Teammitglied</button>}
     </div>
    </header>

    {editingAgent&&<form className="rw-agent-form" onSubmit={saveAgent} aria-label="KI-Teammitglied einrichten">
     <div className="rw-agent-form-top">
      <strong>{editingAgent.id?'KI-Teammitglied bearbeiten':'Neues KI-Teammitglied im Projekt'}</strong>
      <button type="button" className="rw-icon" onClick={()=>setEditingAgent(null)} aria-label="Formular schließen"><X size={16}/></button>
     </div>
     <p className="rw-muted">KI-Teammitglieder haben im Projekt einen erkennbaren Namen, eine Rolle, definierte Fähigkeiten und ein ausgewähltes Modell. Freigaben bleiben immer bei einem Menschen.</p>
     <div className="rw-agent-form-grid">
      <label>Name des Agenten<input name="name" required maxLength={80} defaultValue={editingAgent.name??''} placeholder="z. B. Koordinator-Agent oder Prüf-Agent"/></label>
      <label>Kürzel / Avatar<input name="avatar" maxLength={4} defaultValue={editingAgent.avatar??''} placeholder="z. B. KO"/></label>
      <label>Rolle im Team
       <select name="role" defaultValue={editingAgent.role??'coordinator'}>
        <option value="coordinator">Koordinator (plant & delegiert begrenzt)</option>
        <option value="developer">Entwickler-Agent (Code & Umsetzung)</option>
        <option value="reviewer">Prüf-Agent (Vorprüfung & Tests)</option>
        <option value="researcher">Recherche-Agent (Analyse & Wissen)</option>
       </select>
      </label>
      <label>Ausgewähltes Modell
       <input name="model" list={'agent-models-'+room.project.id} required maxLength={120} defaultValue={editingAgent.model??(connectedModels[0]??'gpt-5-codex')} placeholder="z. B. gpt-5-codex"/>
       <datalist id={'agent-models-'+room.project.id}>{modelOptions.map(m=><option key={m} value={m}/>)}</datalist>
      </label>
     </div>
     <label>Auftrag & Fokus im Projekt<input name="purpose" maxLength={400} defaultValue={editingAgent.purpose??''} placeholder="z. B. Zerlegt Ziele in Aufgaben und koordiniert Übergaben an Spezial-Agenten"/></label>
     <fieldset className="rw-agent-cap-fieldset">
      <legend>Fähigkeiten</legend>
      {ALL_CAPABILITIES.map(c=><label key={c} className="rw-cap-check"><input type="checkbox" name={'cap-'+c} defaultChecked={(editingAgent.capabilities??['chat','task-plan']).includes(c)}/><span>{agentCapabilityLabels[c]}</span></label>)}
     </fieldset>
     <footer className="rw-agent-form-actions">
      {editingAgent.id&&<button type="button" className="rw-button subtle" disabled={busy} onClick={()=>void removeAgent(editingAgent as RoomAgent)}>Aus Projekt entfernen</button>}
      <button type="button" className="rw-button subtle" disabled={busy} onClick={()=>setEditingAgent(null)}>Abbrechen</button>
      <button type="submit" className="rw-button lime" disabled={busy}>{busy?'Wird gespeichert …':'KI-Teammitglied speichern'}</button>
     </footer>
    </form>}

    <div className="rw-chat-stream">
     {more&&messages.length>0&&<button className="rw-button subtle" disabled={busy} onClick={()=>void loadOlder()}>Ältere Nachrichten laden</button>}
     {!messages.length&&<div className="rw-room-welcome"><span className="rw-welcome-icon"><MessageSquare size={30}/></span><span className="rw-eyebrow">DER ANFANG IST EIN GESPRÄCH</span><h2>Ein Raum für eure nächste Idee.</h2><p>Teilt Gedanken, stellt Fragen, adressiert Teammitglieder oder KI-Agenten und verknüpft Nachrichten direkt mit Aufgaben.</p><div><button onClick={()=>{setText('Unser Ziel für dieses Projekt: ');saveDraft(draftKey,'Unser Ziel für dieses Projekt: ');}}>Ziel festhalten</button><button onClick={()=>{setText('Was müssen wir zuerst herausfinden?');saveDraft(draftKey,'Was müssen wir zuerst herausfinden?');}}>Offene Fragen sammeln</button></div></div>}
     {visible.map(message=>{
      const person=room.members.find(m=>m.id===message.author);
      const sAgent=message.senderAgent?activeAgents.find(a=>a.id===message.senderAgent)??(room.agents??[]).find(a=>a.id===message.senderAgent):null;
      const targetMember=message.recipient&&message.recipientKind==='member'?room.members.find(m=>m.id===message.recipient):null;
      const targetAgent=message.recipient&&message.recipientKind==='agent'?(room.agents??[]).find(a=>a.id===message.recipient):null;
      const handoffAgent=message.handoff?.toAgent?(room.agents??[]).find(a=>a.id===message.handoff!.toAgent):null;
      const parent=messages.find(m=>m.id===message.replyTo);
      const parentPerson=parent?room.members.find(m=>m.id===parent.author):null;
      const parentAgent=parent?.senderAgent?(room.agents??[]).find(a=>a.id===parent.senderAgent):null;
      const linkedTaskId=message.taskId??message.topicTask??null;
      const linkedTask=linkedTaskId?room.tasks.find(t=>t.id===linkedTaskId):null;
      const isAgentMsg=Boolean(sAgent||message.kind==='ai-shared'||message.kind==='agent'||message.kind==='agent-handoff');

      return <article className={'rw-message'+(isAgentMsg?' ai':'')+(message.handoff?' handoff':'')} key={message.id} id={'message-'+message.id}>
       <span className={'rw-avatar '+(isAgentMsg?'agent':'')}>
        {sAgent?(sAgent.avatar||initials(sAgent.name)):message.kind==='ai-shared'?<Sparkles size={17}/>:initials(person?.name??'?')}
       </span>
       <div className="rw-message-content">
        <header>
         <strong>{sAgent?sAgent.name:message.kind==='ai-shared'?message.model:person?.name??'Mitglied'}</strong>
         {sAgent&&<span className="rw-badge">{agentRoleLabels[sAgent.role]??'Agent'} · {sAgent.model} · via {person?.name??'Mitglied'}</span>}
         {!sAgent&&message.kind==='ai-shared'&&<span className="rw-badge">KI · geteilt von {person?.name}</span>}
         {(targetMember||targetAgent)&&<span className="rw-recipient-badge">An {targetAgent?`🤖 ${targetAgent.name}`:targetMember?.name}</span>}
         <time dateTime={new Date(message.created).toISOString()}>{time(message.created)}</time>
        </header>

        {linkedTaskId&&<div className="rw-message-topic-row">
         <button className="rw-topic-pill" onClick={()=>onTask(linkedTaskId)}><Hash size={12}/><span>Thema: {linkedTask?.title??'Verknüpfte Aufgabe'}</span><ArrowRight size={12}/></button>
         {filter.kind!=='topic'&&<button className="rw-link rw-topic-filter-btn" onClick={()=>selectFilter({kind:'topic',taskId:linkedTaskId})}>Thema filtern</button>}
        </div>}

        {message.replyTo&&<button className="rw-reply-reference" onClick={()=>document.getElementById('message-'+message.replyTo)?.scrollIntoView({block:'center',behavior:'smooth'})}>
         <Reply size={13}/>
         <span><strong>{parentAgent?.name??parentPerson?.name??'Frühere Nachricht'}:</strong> {parent?.body.slice(0,120)??'Antwort auf eine frühere Raumnachricht'}</span>
        </button>}

        {message.handoff&&<div className="rw-handoff-card" role="note" aria-label="Agenten-Übergabe">
         <div className="rw-handoff-head">
          <Bot size={15}/>
          <strong>Koordinator-Übergabe: {sAgent?.name??'Koordinator'} → {handoffAgent?.name??message.handoff.toAgent}</strong>
          <span className="rw-badge">Beauftragt</span>
         </div>
         <p className="rw-handoff-summary">{message.handoff.summary}</p>
         {canDevelop&&handoffAgent&&<div className="rw-handoff-actions">
          <button className="rw-link" onClick={()=>{setSenderAgent(handoffAgent.id);setReply(message);if(linkedTaskId)setTopicTask(linkedTaskId);}}>Als {handoffAgent.name} antworten</button>
         </div>}
        </div>}

        <p>{message.body}</p>
        {isAgentMsg&&<small className="rw-muted">KI-/Agentenbeitrag – Entscheidungen und Freigaben bleiben beim Team</small>}
        {message.taskId&&!linkedTask&&<button className="rw-message-task" onClick={()=>onTask(message.taskId!)}><CheckCheck size={14}/>Verknüpfte Aufgabe öffnen<ArrowRight size={13}/></button>}

        <div className="rw-message-actions">
         <button onClick={()=>{setReply(message);if(linkedTaskId&&!topicTask)setTopicTask(linkedTaskId);if(sAgent)setRecipient(sAgent.id);}}><Reply size={14}/>Antworten</button>
         <button onClick={()=>linkedTaskId?onTask(linkedTaskId):onConvert('task',message)}><CheckCheck size={14}/>{linkedTaskId?'Aufgabe':'Als Aufgabe'}</button>
         <button onClick={()=>onConvert('decision',message)}><Pin size={14}/>Festhalten</button>
        </div>
       </div>
      </article>;
     })}
     {messages.length>0&&!visible.length&&<p className="rw-muted">Keine Nachricht passt zum aktuellen Filter.{filter.kind!=='all'&&<> <button className="rw-link" onClick={()=>selectFilter({kind:'all'})}>Alle Nachrichten zeigen</button></>}</p>}
     <div ref={end}/>
    </div>

    <div className="rw-composer-wrap">
     {error&&<p role="alert" className="rw-error">{error}</p>}
     {reply&&<div className="rw-reply-bar"><Reply size={14}/><span>Antwort auf: {reply.body.slice(0,140)}</span><button className="rw-icon" onClick={()=>setReply(null)} aria-label="Antwortbezug entfernen"><X size={14}/></button></div>}
     <div className="rw-composer-context">
      <label className="rw-context-select">
       <span>An:</span>
       <select aria-label="Empfänger im Projekt" value={recipient} onChange={e=>setRecipient(e.target.value)} disabled={busy}>
        <option value="">Alle im Projekt</option>
        {activeMembers.length>0&&<optgroup label="Team (Menschen)">
         {activeMembers.map(m=><option key={m.id} value={m.id}>{m.name}{m.id===userId?' (Du)':''}</option>)}
        </optgroup>}
        {activeAgents.length>0&&<optgroup label="KI-Teammitglieder">
         {activeAgents.map(a=><option key={a.id} value={a.id}>🤖 {a.name} ({agentRoleLabels[a.role]})</option>)}
        </optgroup>}
       </select>
      </label>
      <label className="rw-context-select">
       <span>Thema:</span>
       <select aria-label="Thema oder Aufgabe zuordnen" value={topicTask} onChange={e=>setTopicTask(e.target.value)} disabled={busy}>
        <option value="">Kein festes Thema</option>
        {room.tasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}
       </select>
      </label>
      {canDevelop&&activeAgents.length>0&&<label className="rw-context-select">
       <span>Absender-Rolle:</span>
       <select aria-label="Als Mensch oder KI-Teammitglied senden" value={senderAgent} onChange={e=>{setSenderAgent(e.target.value);if(!e.target.value)setHandoffTo('');}} disabled={busy}>
        <option value="">Ich selbst ({me?.name??'Mitglied'})</option>
        {activeAgents.map(a=><option key={a.id} value={a.id}>🤖 {a.name} ({agentRoleLabels[a.role]})</option>)}
       </select>
      </label>}
     </div>
     {canDelegate&&activeAgents.length>1&&<div className="rw-composer-handoff">
      <label className="rw-context-select">
       <span>Koordinator-Übergabe an:</span>
       <select aria-label="Ziel-Agent für Koordinator-Übergabe" value={handoffTo} onChange={e=>{setHandoffTo(e.target.value);if(e.target.value)setRecipient(e.target.value);}} disabled={busy}>
        <option value="">Keine Übergabe (normaler Beitrag)</option>
        {activeAgents.filter(a=>a.id!==senderAgent).map(a=><option key={a.id} value={a.id}>🤖 {a.name} ({agentRoleLabels[a.role]} · {a.model})</option>)}
       </select>
      </label>
      {handoffTo&&<input className="rw-handoff-input" aria-label="Kurzauftrag für die Agenten-Übergabe" value={handoffSummary} onChange={e=>setHandoffSummary(e.target.value)} maxLength={300} placeholder="Kurzauftrag für den Ziel-Agenten (optional, sonst erste Zeile der Nachricht)"/>}
     </div>}
     <form className="rw-composer" onSubmit={e=>{e.preventDefault();void send();}}>
      <label className="rw-sr" htmlFor="rw-message">Nachricht an den Projektraum</label>
      <textarea id="rw-message" value={text} maxLength={4000} disabled={busy} onChange={e=>{setText(e.target.value);saveDraft(draftKey,e.target.value);}} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();void send();}}} placeholder={senderAgent?`Beitrag oder Übergabe von ${selectedSenderAgent?.name??'Agent'} …`:'Nachricht an '+room.project.title+' …'}/>
      <footer><span/><button className="rw-send" disabled={busy||!text.trim()} aria-label="Nachricht senden"><Send size={18}/></button></footer>
     </form>
    </div>
   </div>
  </div>
 </section>;
}

function LinkList({links}:{links:RoomState['links']}){return <div className="rw-links">{links.map(link=><a key={link.id} href={link.url} rel="noreferrer" target="_blank"><span className="rw-link-icon"><Link2 size={18}/></span><span><strong>{link.title}</strong><small>{new URL(link.url).hostname} · Verlinkt, nicht synchronisiert</small></span><ExternalLink size={15}/></a>)}</div>;}

export function ResourceList({resources,members,userId,onRefresh}:{resources:Resource[];members:RoomMember[];userId:string;onRefresh:()=>Promise<void>}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(''),[pendingMembers,setPendingMembers]=useState<string[]|null>(null);
 async function share(resource:Resource,member:string,checked:boolean){const next=checked?[...resource.grants,member]:resource.grants.filter(x=>x!==member);setPendingMembers(next);setBusy(resource.device);setError('');try{await roomRequest('/api/ai',{action:'share',device:resource.device,members:next});await onRefresh();}catch(e){setError((e as Error).message);}finally{setBusy('');setPendingMembers(null);}}
 return <section className="rw-resources"><div className="rw-section-heading"><h2>Rechner & freigegebene Modelle</h2><span className="rw-badge">Opt-in · keine geteilten Passwörter</span></div>{error&&<p role="alert" className="rw-error">{error}</p>}{!resources.length?<div className="rw-empty small"><Monitor size={24}/><h3>Noch kein freigegebener Rechner sichtbar</h3><p>Ein Passwort-Reset kann frühere Gerätezugänge widerrufen. Verbinde den bestehenden Rechner sicher neu; Projekte und Dateien bleiben erhalten.</p></div>:<div className="rw-resource-grid">{resources.map(r=><article key={r.device}><div className="rw-resource-title"><Monitor size={20}/><strong>{r.name}</strong><span className={'rw-led '+(r.online?'on':'')}/></div><p>{r.ownerName} · {r.online?'Erreichbar':'Offline'}</p><div className="rw-model-tags">{r.models.length?r.models.map(m=><span className="rw-badge" key={m}>{m}</span>):<span className="rw-muted">Kein lokales Modell gemeldet</span>}</div><small>Codex: {r.codex==='chatgpt'?'persönliche Anmeldung erkannt':r.codex==='private'?'persönlicher Zugang des Besitzers':r.codex==='disabled'?'nicht freigegeben':'Anmeldung nötig'}</small>{r.owner===userId&&<details><summary>Mein Modell für das Team freigeben</summary><p>Nur Textanfragen. Kein fremder Datei- oder Terminalzugriff. Der Nutzer und du sehen Anfrage und Antwort.</p>{!r.allowTeam&&<p className="rw-muted">Team-Nutzung muss zuerst im lokalen Runnerprofil erlaubt werden.</p>}{members.filter(m=>m.id!==userId).map(m=><label className="rw-consent" key={m.id}><input type="checkbox" checked={(busy===r.device&&pendingMembers?pendingMembers:r.grants).includes(m.id)} disabled={busy===r.device||(!r.allowTeam&&!r.grants.includes(m.id))} onChange={e=>void share(r,m.id,e.target.checked)}/>{m.name}</label>)}</details>}</article>)}</div>}</section>;
}

export function RoomModal({spec,room,onClose,onSaved}:{spec:Modal;room:RoomState|null;onClose:()=>void;onSaved:(result:{project?:string;task?:string})=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');const panel=useRef<HTMLElement|null>(null);const request=useRef({fingerprint:'',id:''});
 const titles={room:'Neues Projekt anlegen',task:'Neue Aufgabe',decision:'Entscheidung festhalten',note:'Etwas festhalten',link:'Link speichern',repository:'Gemeinsames Repository festlegen'};
 // Focus the first field only when the window opens. The page refreshes every few seconds and hands in a new
 // onClose each time; reading it from refs keeps the cursor where the person is typing.
 const closeRef=useRef(onClose),busyRef=useRef(busy);closeRef.current=onClose;busyRef.current=busy;
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const root=panel.current;root?.querySelector<HTMLInputElement>('input')?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!busyRef.current)closeRef.current();if(e.key!=='Tab'||!root)return;const list=[...root.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,select')].filter(x=>x.getClientRects().length);if(e.shiftKey&&document.activeElement===list[0]){e.preventDefault();list.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===list.at(-1)){e.preventDefault();list[0]?.focus();}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};// eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;const f=new FormData(e.currentTarget);let payload:Record<string,unknown>;
  if(spec.kind==='room')payload={action:'create',title:f.get('title'),description:f.get('body')};
  else if(spec.kind==='repository')payload={action:'repository',project:room!.project.id,url:f.get('url'),revision:room!.meta.revision};
  else if(spec.kind==='link')payload={action:'link',project:room!.project.id,title:f.get('title'),url:f.get('url'),kind:f.get('kind')};
  else if(spec.kind==='task')payload={action:'task',project:room!.project.id,title:f.get('title'),description:f.get('body'),kind:f.get('taskKind')??'general',criteria:f.get('criteria')??'',mine:f.get('mine')==='on',...(spec.source?{source:spec.source.id}:{})};
  else payload={action:'note',project:room!.project.id,title:f.get('title'),body:f.get('body'),kind:spec.kind==='decision'?'decision':'note',...(spec.source?{source:spec.source.id}:{})};
  const fingerprint=JSON.stringify(payload);if(request.current.fingerprint!==fingerprint)request.current={fingerprint,id:operationId()};if(spec.kind!=='repository')payload.id=request.current.id;
  setBusy(true);setError('');try{const result=await roomRequest<{project?:string;task?:string}>('/api/room',payload);await onSaved(result);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <div className="rw-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}><section className="rw-modal" ref={panel} role="dialog" aria-modal="true" aria-label={titles[spec.kind]}><div className="rw-modal-top"><span className="rw-eyebrow">{spec.kind==='room'?'ERST DIE IDEE. DANN DIE TECHNIK.':room?.project.title}</span><button className="rw-icon" onClick={onClose} disabled={busy} aria-label="Dialog schließen"><X size={20}/></button></div><h2>{titles[spec.kind]}</h2>{spec.kind==='room'&&<p>Name und Ziel reichen. Code und Werkstatt richtest du danach in Ruhe ein. Das Team sieht das Projekt.</p>}{spec.kind==='repository'&&<p>Legt das gemeinsame Repository dieses Projekts fest. Jedes Teammitglied verbindet anschließend seinen eigenen Rechner mit genau diesem Repository.</p>}{spec.source&&<blockquote>{spec.source.body.slice(0,400)}</blockquote>}<form onSubmit={submit}>
  {spec.kind!=='repository'&&<label>{spec.kind==='room'?'Projektname':spec.kind==='task'?'Was soll passieren?':'Titel'}<input name="title" required maxLength={160} disabled={busy} defaultValue={spec.source?taskTitleFrom(spec.source.body):''} placeholder={spec.kind==='room'?'Zum Beispiel: Klimafinder.ch':spec.kind==='task'?'Zum Beispiel: Den Text auf der Startseite kürzen':''}/></label>}
  {['room','task','note','decision'].includes(spec.kind)&&<label>{spec.kind==='room'?'Was möchtet ihr erreichen?':spec.kind==='task'?'Genauer beschrieben (optional)':'Inhalt'}<textarea name="body" aria-label={spec.kind==='room'?'Was möchtet ihr erreichen?':spec.kind==='task'?'Genauer beschrieben':'Inhalt'} disabled={busy} required={spec.kind==='note'||spec.kind==='decision'} maxLength={spec.kind==='room'||spec.kind==='task'?12000:4000} defaultValue={spec.source?.body??''} placeholder={spec.kind==='room'?'Eine klare Richtung genügt. Details entstehen im Gespräch.':spec.kind==='task'?'Was genau, wo, warum – so viel du weisst.':''}/></label>}
  {spec.kind==='task'&&<>
   {/* Two plain choices instead of a select; changing something is the common case. */}
   <fieldset className="team-choice"><legend>Was für eine Aufgabe?</legend>
    <label><input type="radio" name="taskKind" value="code" defaultChecked/><span><strong>Etwas an der Website oder App ändern</strong><small>Jemand ändert es, eine zweite Person schaut es an und gibt es frei.</small></span></label>
    <label><input type="radio" name="taskKind" value="general"/><span><strong>Etwas klären oder planen</strong><small>Am Ende wird das Ergebnis aufgeschrieben.</small></span></label>
   </fieldset>
   <label className="team-check"><input type="checkbox" name="mine" defaultChecked/><span>Ich mache das selbst</span></label>
   <details className="team-secondary"><summary>Mehr Angaben (optional)</summary><label>Woran erkennt man, dass es fertig ist?<textarea name="criteria" maxLength={4000} placeholder="Zum Beispiel: Der Satz ist kürzer und auf dem Handy gut lesbar."/></label></details>
  </>}{(spec.kind==='link'||spec.kind==='repository')&&<label>{spec.kind==='link'?'Adresse (Link)':'HTTPS-Adresse'}<input name="url" type="url" required disabled={busy} maxLength={2000} defaultValue={spec.kind==='repository'?room?.meta.repository??'':''} placeholder={spec.kind==='repository'?'https://github.com/organisation/projekt':'https://…'}/></label>}
  {spec.kind==='link'&&<input type="hidden" name="kind" value={spec.linkKind??'reference'}/>}
  {error&&<p role="alert" className="rw-error">{error}</p>}<footer><button type="button" className="rw-button subtle" disabled={busy} onClick={onClose}>Abbrechen</button><button className="rw-button lime" disabled={busy}>{busy?'Wird gespeichert …':spec.kind==='room'?'Projekt anlegen':spec.kind==='task'?'Aufgabe anlegen':'Speichern'}<ArrowRight size={16}/></button></footer>
 </form></section></div>;
}
