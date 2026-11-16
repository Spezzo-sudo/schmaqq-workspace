import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowRight,Bot,CheckCheck,ExternalLink,Hash,Link2,MessageSquare,Monitor,Pin,Plus,Reply,Search,Send,Shield,Sparkles,UserCircle,Users,X,ChevronLeft,MoreHorizontal,FolderOpen} from 'lucide-react';
import {
 roomRequest,operationId,time,initials,storedDraft,saveDraft,taskTitleFrom,
 agentRoleLabels,agentCapabilityLabels,agentContextSourceLabels,agentPermissionLabels,
 agentEffectivePermissions,agentExecutionStatus,memberRoleSummary,filterMessengerMessages,
 type RoomState,type RoomMember,type RoomMessage,type RoomAgent,type RoomAgentRole,
 type RoomAgentCapability,type RoomAgentContextSource,type RoomAgentPermissions,type Resource,type MessengerFilter
} from './room-model';
import {FIELD_GUILD_R2_PRESETS,findAvatarPreset,type AvatarPreset} from './avatar-catalog';
import {AgentAvatar,AvatarConfigurator,AgentProfileView} from './agent-avatar';
import {MessengerInspector} from './messenger-detail';
import {messengerComposerTarget,messengerDraftKey,messengerFilterKey,readMessengerFilter} from './messenger-state';

export type Modal={kind:'room'|'task'|'note'|'decision'|'link'|'repository';source?:RoomMessage;linkKind?:'chatgpt'|'github'|'result'|'reference'};

const DEFAULT_MODELS=['gpt-5-codex','gpt-4.1','o3','claude-sonnet-4','lokales-modell'];
const ALL_CAPABILITIES:RoomAgentCapability[]=['chat','task-plan','task-delegate','code-work','review-support'];
const ALL_CONTEXT_SOURCES:RoomAgentContextSource[]=['messages','tasks','decisions','repository','Test-Runs' as never].filter(x=>['messages','tasks','decisions','repository','runs'].includes(x)) as RoomAgentContextSource[];
const CONTEXT_SOURCE_KEYS:RoomAgentContextSource[]=['messages','tasks','decisions','repository','runs'];
const ALL_ROLES:RoomAgentRole[]=['coordinator','advisor','frontend','reviewer','operations','strategy','debugger','researcher','infrastructure','security','support','knowledge','developer'];

export function Conversation({room,resources=[],userId,search,refresh,onTask,onConvert,projectNavigation,tools,detail,detailTitle,detailKey='talk',detailNavigation,onCloseDetail,onFiles}:{room:RoomState;resources?:Resource[];userId:string;search:string;refresh:()=>Promise<void>;onTask:(id:string)=>void;onConvert:(kind:'task'|'decision',source:RoomMessage)=>void;projectNavigation?:ReactNode;tools?:ReactNode;detail?:ReactNode;detailTitle?:string;detailKey?:string;detailNavigation?:ReactNode;onCloseDetail?:()=>void;onFiles?:()=>void}){
 const [filter,setFilter]=useState<MessengerFilter>(()=>readMessengerFilter(location.search,room));
 const draftKey=messengerDraftKey(userId,room.project.id,filter),initialTarget=messengerComposerTarget(filter);
 const [text,setText]=useState(()=>storedDraft(draftKey)),[reply,setReply]=useState<RoomMessage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[older,setOlder]=useState<RoomMessage[]>([]),[more,setMore]=useState(room.more);
 const [localSearch,setLocalSearch]=useState(''),[contactSearch,setContactSearch]=useState(''),[railMode,setRailMode]=useState<'chats'|'contacts'>('chats');
 const [recipient,setRecipient]=useState(initialTarget.recipient),[topicTask,setTopicTask]=useState(initialTarget.topicTask),[senderAgent,setSenderAgent]=useState(''),[handoffTo,setHandoffTo]=useState(''),[handoffSummary,setHandoffSummary]=useState('');
 const [editingAgent,setEditingAgent]=useState<Partial<RoomAgent>|null>(null),[profileAgentId,setProfileAgentId]=useState<string|null>(null),[avatarPickerOpen,setAvatarPickerOpen]=useState(false),[composerOptions,setComposerOptions]=useState(false);
 const [mobilePanel,setMobilePanel]=useState<'chat'|'contacts'>(()=>window.matchMedia('(max-width:760px)').matches&&!new URLSearchParams(location.search).has('chat')?'contacts':'chat');
 const [overlay,setOverlay]=useState(()=>window.matchMedia('(max-width:1199px)').matches);
 const currentDraft=useRef(draftKey);currentDraft.current=draftKey;
 const profileReturn=useRef<'chat'|'contacts'>('chat'),composerInput=useRef<HTMLTextAreaElement|null>(null);
 useEffect(()=>{const media=window.matchMedia('(max-width:1199px)'),change=()=>setOverlay(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{const input=composerInput.current;if(input){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,132)+'px';}},[text]);
 const attempt=useRef({fingerprint:'',id:''});const end=useRef<HTMLDivElement|null>(null);const first=useRef(true);
 const stream=useRef<HTMLDivElement|null>(null),followLatest=useRef(true);

 const activeMembers=room.members.filter(m=>!m.removed);
 const activeAgents=(room.agents??[]).filter(a=>a.active!==false);
 const me=activeMembers.find(m=>m.id===userId);
 const canDevelop=Boolean(me&&(me.role==='owner'||!me.projectRoles?.length||me.projectRoles.includes('admin')||me.projectRoles.includes('developer')));
 const connectedModels=[...new Set(resources.filter(r=>r.online).flatMap(r=>[...r.models,...(r.codex==='chatgpt'?['gpt-5-codex']:[])]))];
 const modelOptions=[...new Set([...connectedModels,...DEFAULT_MODELS])];

 const messages=[...new Map([...older,...room.messages].map(m=>[m.id,m])).values()].sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id));
 useEffect(()=>{if(!messages.length)return;if(first.current||followLatest.current){first.current=false;requestAnimationFrame(()=>{if(stream.current)stream.current.scrollTop=stream.current.scrollHeight;});}},[messages.at(-1)?.id,messengerFilterKey(filter)]);

 const writableAgents=activeAgents.filter(a=>agentEffectivePermissions(a).writeMessages);
 const selectedSenderAgent=writableAgents.find(a=>a.id===senderAgent)??null;
 const canDelegate=Boolean(selectedSenderAgent&&agentEffectivePermissions(selectedSenderAgent).delegateAgents);
 const profileAgent=profileAgentId?activeAgents.find(a=>a.id===profileAgentId)??null:null;

 function selectFilter(next:MessengerFilter,writeHistory=true){
  saveDraft(draftKey,text);followLatest.current=true;
  const target=messengerComposerTarget(next),nextKey=messengerDraftKey(userId,room.project.id,next);
  currentDraft.current=nextKey;setText(storedDraft(nextKey));setFilter(next);
  setRecipient(target.recipient);setTopicTask(target.topicTask);setReply(null);
  setSenderAgent('');setHandoffTo('');setHandoffSummary('');setComposerOptions(false);
  setProfileAgentId(null);setMobilePanel('chat');setError('');
  if(writeHistory){const url=new URL(location.href);url.searchParams.set('chat',messengerFilterKey(next));history.pushState(null,'',url);}
 }
 const restoreSelection=useRef(()=>{});restoreSelection.current=()=>{selectFilter(readMessengerFilter(location.search,room),false);if(window.matchMedia('(max-width:760px)').matches&&!new URLSearchParams(location.search).has('chat'))setMobilePanel('contacts');};
 useEffect(()=>{const restore=()=>restoreSelection.current();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);},[]);
 useEffect(()=>{
  const allowed=readMessengerFilter('?chat='+encodeURIComponent(messengerFilterKey(filter)),room);
  if(messengerFilterKey(allowed)!==messengerFilterKey(filter)){selectFilter(allowed,false);setError('Dieser Kontakt oder dieses Thema ist nicht mehr verfügbar. Dein Textentwurf bleibt in seiner bisherigen Ansicht erhalten.');}
 },[room.members,room.agents,room.tasks]);
 useEffect(()=>{
  if(detailKey==='talk')return;
  if(editingAgent&&!window.confirm('Agentenprofil ohne Speichern verlassen?')){onCloseDetail?.();return;}
  setProfileAgentId(null);setEditingAgent(null);
 },[detailKey]);
 useEffect(()=>{if((profileAgentId||editingAgent)&&detailKey!=='talk')onCloseDetail?.();},[profileAgentId,Boolean(editingAgent)]);
 function showConversationList(){setMobilePanel('contacts');const url=new URL(location.href);url.searchParams.delete('chat');history.replaceState(null,'',url);}
 function openProfile(id:string){profileReturn.current=mobilePanel;setProfileAgentId(id);setEditingAgent(null);setMobilePanel('chat');}
 function closeInspector(){
  if(editingAgent&&!window.confirm('Agentenprofil ohne Speichern schliessen?'))return;
  const wasAgent=Boolean(profileAgentId||editingAgent);setProfileAgentId(null);setEditingAgent(null);
  if(detail)onCloseDetail?.();if(wasAgent)setMobilePanel(profileReturn.current);
 }
 function resetComposer(){const target=messengerComposerTarget(filter);setRecipient(target.recipient);setTopicTask(target.topicTask);setSenderAgent('');setHandoffTo('');setHandoffSummary('');}

 function startCreateAgent(presetId?:string){
  profileReturn.current=mobilePanel;setMobilePanel('chat');
  const preset=findAvatarPreset(presetId)|| (activeAgents.some(a=>a.role==='coordinator')?FIELD_GUILD_R2_PRESETS[1]:FIELD_GUILD_R2_PRESETS[0]);
  const role=preset.recommendedRole;
  const isCoord=role==='coordinator';
  setProfileAgentId(null);
  setEditingAgent({
   name:preset.name,
   nickname:'',
   avatarPresetId:preset.id,
   avatar:preset.fallbackCode,
   role,
   model:connectedModels[0]??'gpt-5-codex',
   modelDevice:'',
   purpose:preset.defaultPurpose,
   personality:preset.defaultPersonality,
   responsibility:preset.defaultPurpose,
   knowledgeScope:'Projektgespräch, Aufgaben, Entscheidungen und verknüpftes Repository',
   contextSources:['messages','tasks','decisions','repository'],
   capabilities:isCoord?['chat','task-plan','task-delegate']:['chat','task-plan','review-support'],
   permissions:{
    readProject:true,
    writeMessages:true,
    manageTasks:isCoord,
    editCode:role==='developer'||role==='frontend'||role==='debugger'||role==='infrastructure',
    prepareReviews:role==='reviewer'||role==='advisor'||role==='security'||role==='debugger',
    delegateAgents:isCoord
   }
  });
  setMobilePanel('chat');
 }

 function applyPresetRecommendation(preset:AvatarPreset){
  setEditingAgent(prev=>{
   if(!prev)return prev;
   const role=preset.recommendedRole;
   const isCoord=role==='coordinator';
   return {
    ...prev,
    name:prev.id?prev.name:(preset.name),
    avatarPresetId:preset.id,
    avatar:preset.fallbackCode,
    role,
    purpose:preset.defaultPurpose,
    personality:preset.defaultPersonality,
    responsibility:prev.responsibility||preset.defaultPurpose,
    capabilities:isCoord?['chat','task-plan','task-delegate']:['chat','task-plan','review-support'],
    permissions:{
     readProject:true,
     writeMessages:true,
     manageTasks:isCoord,
     editCode:role==='developer'||role==='frontend'||role==='debugger'||role==='infrastructure',
     prepareReviews:role==='reviewer'||role==='advisor'||role==='security'||role==='debugger',
     delegateAgents:isCoord
    }
   };
  });
 }

 async function updateAgentAvatarDirectly(agent:RoomAgent,presetId:string,fallbackCode:string){
  setBusy(true);setError('');
  try{
   await roomRequest('/api/room',{
    action:'agent',
    id:operationId(),
    project:room.project.id,
    agentId:agent.id,
    name:agent.name,
    nickname:agent.nickname,
    avatar:fallbackCode,
    avatarPresetId:presetId,
    role:agent.role,
    model:agent.model,
    modelDevice:agent.modelDevice,
    purpose:agent.purpose,
    personality:agent.personality,
    responsibility:agent.responsibility,
    knowledgeScope:agent.knowledgeScope,
    contextSources:agent.contextSources,
    capabilities:agent.capabilities,
    permissions:agentEffectivePermissions(agent),
    active:true
   });
   await refresh();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
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
   saveDraft(draftKey,'');
   // A slow acknowledgement must never erase the draft of a different selected contact.
   if(currentDraft.current===draftKey){setText('');setReply(null);setHandoffTo('');setHandoffSummary('');setComposerOptions(false);}
   await refresh();
   requestAnimationFrame(()=>end.current?.scrollIntoView({block:'nearest',behavior:'smooth'}));
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 async function saveAgent(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!editingAgent||busy)return;
  const f=new FormData(e.currentTarget);
  const role=(f.get('role') as RoomAgentRole)||'developer';
  const caps=ALL_CAPABILITIES.filter(c=>f.get('cap-'+c)==='on');
  if(!caps.length)caps.push('chat');
  const ctxSources=CONTEXT_SOURCE_KEYS.filter(c=>f.get('ctx-'+c)==='on');
  const permissions:RoomAgentPermissions={
   readProject:f.get('perm-readProject')==='on',
   writeMessages:f.get('perm-writeMessages')==='on',
   manageTasks:f.get('perm-manageTasks')==='on',
   editCode:f.get('perm-editCode')==='on',
   prepareReviews:f.get('perm-prepareReviews')==='on',
   delegateAgents:f.get('perm-delegateAgents')==='on'
  };
  const payload={
   action:'agent',
   id:operationId(),
   project:room.project.id,
   ...(editingAgent.id?{agentId:editingAgent.id}:{}),
   name:String(f.get('name')??'').trim(),
   nickname:String(f.get('nickname')??'').trim(),
   avatar:String(f.get('avatar')??editingAgent.avatar??'').trim(),
   avatarPresetId:editingAgent.avatarPresetId??'',
   role,
   model:String(f.get('model')??'gpt-5-codex').trim(),
   modelDevice:String(f.get('modelDevice')??'').trim(),
   purpose:String(f.get('purpose')??'').trim(),
   personality:String(f.get('personality')??'').trim(),
   responsibility:String(f.get('responsibility')??'').trim(),
   knowledgeScope:String(f.get('knowledgeScope')??'').trim(),
   contextSources:ctxSources.length?ctxSources:['messages','tasks','decisions'],
   capabilities:caps,
   permissions,
   active:true
  };
  setBusy(true);setError('');
  try{
   const saved=await roomRequest<{agentId?:string}>('/api/room',payload);
   const nextId=saved.agentId??editingAgent.id??null;
   setEditingAgent(null);
   await refresh();
   if(nextId)setProfileAgentId(nextId);
  }
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }

 async function removeAgent(agent:RoomAgent){
  if(busy)return;
  setBusy(true);setError('');
  try{
   await roomRequest('/api/room',{action:'agent',id:operationId(),project:room.project.id,agentId:agent.id,name:agent.name,role:agent.role,avatar:agent.avatar,avatarPresetId:agent.avatarPresetId,model:agent.model,purpose:agent.purpose,capabilities:agent.capabilities,permissions:agentEffectivePermissions(agent),active:false});
   if(filter.kind==='agent'&&filter.id===agent.id)setFilter({kind:'all'});
   if(recipient===agent.id)setRecipient('');
   if(senderAgent===agent.id)setSenderAgent('');
   if(profileAgentId===agent.id)setProfileAgentId(null);
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
  if(filter.kind==='member')return 'Adressiert im Raum: '+(activeMembers.find(m=>m.id===filter.id)?.name??'Teammitglied');
  if(filter.kind==='agent')return 'KI-Teammitglied: '+(activeAgents.find(a=>a.id===filter.id)?.name??'Agent');
  if(filter.kind==='topic')return 'Thema: '+(room.tasks.find(t=>t.id===filter.taskId)?.title??'Aufgabe');
  return 'Alle im Projekt';
 })();

 const editingPerms:RoomAgentPermissions=editingAgent?agentEffectivePermissions({
  role:editingAgent.role??'developer',
  capabilities:editingAgent.capabilities??['chat'],
  permissions:editingAgent.permissions
 }):{readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:false};

 const lastFor=(view:MessengerFilter)=>filterMessengerMessages(messages,view).at(-1);
 const matchesContact=(name:string)=>!contactSearch.trim()||name.toLowerCase().includes(contactSearch.trim().toLowerCase());
 const listedMembers=activeMembers.filter(m=>(railMode==='contacts'||m.id!==userId&&(lastFor({kind:'member',id:m.id})||filter.kind==='member'&&filter.id===m.id))&&matchesContact(m.name+' '+memberRoleSummary(m)));
 const listedAgents=activeAgents.filter(a=>(railMode==='contacts'||lastFor({kind:'agent',id:a.id})||filter.kind==='agent'&&filter.id===a.id)&&matchesContact(a.name+' '+(agentRoleLabels[a.role]??a.role)));
 const hasDetail=Boolean(profileAgent||editingAgent||detail);
 const targetName=activeAgents.find(a=>a.id===recipient)?.name??activeMembers.find(m=>m.id===recipient)?.name??recipient;
 return <section className={'rw-conversation rw-messenger r3-messenger'+(hasDetail?' with-detail':'')} data-mobile-panel={mobilePanel} aria-label="Projektgespräch">
  <div className="rw-messenger-grid">
   <aside className="rw-messenger-rail" aria-label="Gespräche und Kontakte" inert={hasDetail&&overlay?true:undefined}>
    {projectNavigation}
    <div className="r3-rail-heading"><h1>Gespräche</h1>{canDevelop&&<button className="r3-icon-button" aria-label="KI-Teammitglied hinzufügen" title="KI-Teammitglied hinzufügen" onClick={()=>startCreateAgent()}><Plus size={19}/></button>}</div>
    <div className="r3-rail-tabs" role="tablist" aria-label="Gesprächsliste"><button role="tab" id="r3-tab-chats" aria-controls="r3-contact-list" aria-selected={railMode==='chats'} onClick={()=>setRailMode('chats')}>Chats</button><button role="tab" id="r3-tab-contacts" aria-controls="r3-contact-list" aria-selected={railMode==='contacts'} onClick={()=>setRailMode('contacts')}>Kontakte</button></div>
    <div className="rw-messenger-search"><Search size={16} aria-hidden="true"/><input aria-label={railMode==='contacts'?'Kontakte suchen':'Nachrichten im Projekt durchsuchen'} value={railMode==='contacts'?contactSearch:localSearch} onChange={e=>railMode==='contacts'?setContactSearch(e.target.value):setLocalSearch(e.target.value)} placeholder={railMode==='contacts'?'Kontakt suchen …':'Nachrichten suchen …'}/>{(railMode==='contacts'?contactSearch:localSearch)&&<button className="rw-icon" onClick={()=>railMode==='contacts'?setContactSearch(''):setLocalSearch('')} aria-label="Suche leeren"><X size={14}/></button>}</div>
    <div className="r3-contact-scroll" id="r3-contact-list" role="tabpanel" aria-labelledby={railMode==='chats'?'r3-tab-chats':'r3-tab-contacts'}>
     {railMode==='chats'&&<div className="rw-messenger-group">
      <button className={'rw-contact-row'+(filter.kind==='all'&&!profileAgentId?' active':'')} onClick={()=>selectFilter({kind:'all'})}><span className="rw-avatar channel"><Users size={19}/></span><span className="rw-contact-meta"><strong>Projektteam</strong><small>{messages.at(-1)?.body??'Euer gemeinsames Gespräch'}</small></span>{messages.at(-1)&&<time>{time(messages.at(-1)!.created)}</time>}</button>
      <button className={'rw-contact-row'+(filter.kind==='handoffs'?' active':'')} onClick={()=>selectFilter({kind:'handoffs'})}><span className="rw-avatar agent"><Bot size={18}/></span><span className="rw-contact-meta"><strong>Agenten & Übergaben</strong><small>{handoffCount?handoffCount+' Beiträge im Projekt':'Aufträge und Abstimmung im Team'}</small></span></button>
     </div>}
     {!!listedMembers.length&&<div className="rw-messenger-group"><div className="rw-messenger-group-head"><span>Menschen</span></div>{listedMembers.map(m=>{const latest=lastFor({kind:'member',id:m.id});return <button key={m.id} className={'rw-contact-row'+(filter.kind==='member'&&filter.id===m.id?' active':'')} onClick={()=>selectFilter({kind:'member',id:m.id})}><span className="rw-avatar">{initials(m.name)}</span><span className="rw-contact-meta"><strong>{m.name}{m.id===userId?' (Du)':''}</strong><small>{latest?.body??memberRoleSummary(m)}</small></span>{latest&&<time>{time(latest.created)}</time>}</button>;})}</div>}
     {!!listedAgents.length&&<div className="rw-messenger-group"><div className="rw-messenger-group-head"><span>KI-Team</span></div>{listedAgents.map(a=>{
      const selected=filter.kind==='agent'&&filter.id===a.id||profileAgentId===a.id,exec=agentExecutionStatus(a,room,resources),latest=lastFor({kind:'agent',id:a.id});
      return <div key={a.id} className={'rw-contact-card'+(selected?' active':'')}><div className="rw-contact-row rw-agent-contact-row"><button type="button" className="rw-avatar-btn" aria-label={`Profil von ${a.name} öffnen`} title={`Profil von ${a.name} öffnen`} onClick={()=>openProfile(a.id)}><AgentAvatar agent={a} size="sm" statusDot={exec.state==='running'?'running':exec.state==='ready'?'ready':'idle'}/></button><button type="button" className="rw-contact-meta-btn" onClick={()=>selectFilter({kind:'agent',id:a.id})}><span className="rw-contact-meta"><strong>{a.name}</strong><small>{latest?.body??agentRoleLabels[a.role]??a.role}</small></span></button>{latest&&<time>{time(latest.created)}</time>}</div></div>;
     })}</div>}
     {railMode==='chats'&&<button className="r3-directory-link" onClick={()=>setRailMode('contacts')}><Users size={16}/>{listedAgents.length?'Alle Kontakte':'KI-Team und weitere Kontakte'}<ArrowRight size={14}/></button>}
     {railMode==='contacts'&&!listedMembers.length&&!listedAgents.length&&<p className="rw-messenger-empty">Keine passenden Kontakte.</p>}
     {!!room.tasks.length&&<details className="r3-topic-directory"><summary>Themen & Aufgaben <span>{room.tasks.length}</span></summary>{room.tasks.slice(0,30).map(t=><div key={t.id} className="rw-topic-row"><button className={'rw-contact-row'+(filter.kind==='topic'&&filter.taskId===t.id?' active':'')} onClick={()=>selectFilter({kind:'topic',taskId:t.id})}><Hash size={15}/><span className="rw-contact-meta"><strong>{t.title}</strong></span></button><button className="rw-icon" aria-label={'Aufgabe öffnen: '+t.title} onClick={()=>onTask(t.id)}><ArrowRight size={15}/></button></div>)}</details>}
    </div>
    <div className="r3-rail-footer">{activeMembers.length} Menschen · {activeAgents.length} KI-Profile</div>
   </aside>
   <div className="rw-messenger-main" inert={hasDetail&&overlay?true:undefined}>
    <header className="rw-messenger-header">
     <button type="button" className="r3-icon-button r3-chat-back" aria-label="Zur Gesprächsliste" onClick={showConversationList}><ChevronLeft size={22}/></button>
     {filter.kind==='agent'?(()=>{const a=activeAgents.find(a=>a.id===filter.id);return a?<button className="rw-avatar-btn" aria-label={`Profil von ${a.name} öffnen`} onClick={()=>openProfile(a.id)}><AgentAvatar agent={a} size="sm"/></button>:null;})():<span className="rw-avatar channel">{filter.kind==='handoffs'?<Bot size={19}/>:filter.kind==='member'?initials(activeMembers.find(m=>m.id===filter.id)?.name??'?'):<MessageSquare size={19}/>}</span>}
     <div className="r3-chat-heading"><strong title={activeFilterTitle}>{filter.kind==='all'?'Projektteam':filter.kind==='agent'?activeAgents.find(a=>a.id===filter.id)?.name:filter.kind==='member'?activeMembers.find(m=>m.id===filter.id)?.name:activeFilterTitle}</strong><small><span className="r3-shared-dot"/>Projektweit sichtbar · {filter.kind==='agent'?'adressierter Austausch':filter.kind==='member'?'adressierte Beiträge':'gemeinsamer Arbeitsraum'}</small></div>
     {tools}
    </header>

    <div className="rw-chat-stream" ref={stream} onScroll={()=>{if(stream.current)followLatest.current=stream.current.scrollHeight-stream.current.scrollTop-stream.current.clientHeight<80;}}>
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
      const isVerifiedRun=message.origin==='verified-run'||message.kind==='ai-shared';
      const isOwn=message.author===userId&&!isAgentMsg;

      return <article className={'rw-message'+(isOwn?' r3-own':'')+(isAgentMsg?' ai':'')+(message.handoff?' handoff':'')} aria-label={isOwn?'Deine Nachricht':undefined} key={message.id} id={'message-'+message.id}>
       {sAgent
        ?<button type="button" className="rw-avatar-btn" onClick={()=>openProfile(sAgent.id)} title={`Profil von ${sAgent.name} öffnen`}>
         <AgentAvatar agent={sAgent} size="md"/>
        </button>
        :<span className={'rw-avatar '+(isAgentMsg?'agent':'')}>
         {message.kind==='ai-shared'?<Sparkles size={17}/>:initials(person?.name??'?')}
        </span>}
       <div className="rw-message-content">
        <header>
         <strong>
          {sAgent
           ?<button type="button" className="rw-link rw-msg-agent-name" onClick={()=>openProfile(sAgent.id)}>{sAgent.name}{sAgent.nickname?` „${sAgent.nickname}“`:''}</button>
           :message.kind==='ai-shared'?message.model:person?.name??'Mitglied'}
         </strong>
         {sAgent&&<span className="rw-badge">{agentRoleLabels[sAgent.role]??'Agent'} · {sAgent.model}</span>}
         {sAgent&&!isVerifiedRun&&<span className="rw-origin-badge manual" title={'Manuell erfasst von '+(person?.name??'Mitglied')+'; keine Modellgenerierung'}>Manuell protokolliert</span>}
         {sAgent&&isVerifiedRun&&<span className="rw-origin-badge verified">Verifizierter Modelllauf</span>}
         {!sAgent&&message.kind==='ai-shared'&&<span className="rw-badge">Verifizierter KI-Lauf · geteilt von {person?.name}</span>}
         {(targetMember||targetAgent)&&<span className="rw-recipient-badge">An {targetAgent?`🤖 ${targetAgent.name}`:targetMember?.name} (im Projektraum)</span>}
         <time dateTime={new Date(message.created).toISOString()}>{time(message.created)}</time>
        </header>

        {linkedTaskId&&<div className="rw-message-topic-row">
         <button className="rw-topic-pill" onClick={()=>onTask(linkedTaskId)}><Hash size={12}/><span>Thema: {linkedTask?.title??'Verknüpfte Aufgabe'}</span><ArrowRight size={12}/></button>
         {filter.kind!=='topic'&&<button className="rw-link rw-topic-filter-btn" onClick={()=>selectFilter({kind:'topic',taskId:linkedTaskId})}>Thema filtern</button>}
        </div>}

        {message.replyTo&&<button className="rw-reply-reference" onClick={()=>{const target=document.getElementById('message-'+message.replyTo);if(target){target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}if(messages.some(m=>m.id===message.replyTo)){selectFilter({kind:'all'});requestAnimationFrame(()=>document.getElementById('message-'+message.replyTo)?.scrollIntoView({block:'center'}));}else setError('Diese Antwort bezieht sich auf eine ältere Nachricht. Lade oben im Gespräch die älteren Nachrichten.');}}>
         <Reply size={13}/>
         <span><strong>{parentAgent?.name??parentPerson?.name??'Frühere Nachricht'}:</strong> {parent?.body.slice(0,120)??'Antwort auf eine frühere Raumnachricht'}</span>
        </button>}

        {message.handoff&&<div className="rw-handoff-card" role="note" aria-label="Agenten-Übergabe">
         <div className="rw-handoff-head">
          {sAgent?<AgentAvatar agent={sAgent} size="xs"/>:<Bot size={15}/>}
          <ArrowRight size={13}/>
          {handoffAgent?<AgentAvatar agent={handoffAgent} size="xs"/>:null}
          <strong>Koordinator-Übergabe: {sAgent?.name??'Koordinator'} → {handoffAgent?.name??message.handoff.toAgent}</strong>
          <span className="rw-badge">Beauftragt</span>
         </div>
         <p className="rw-handoff-summary">{message.handoff.summary}</p>
         {canDevelop&&handoffAgent&&agentEffectivePermissions(handoffAgent).writeMessages&&<div className="rw-handoff-actions">
          <button className="rw-link" onClick={()=>{setSenderAgent(handoffAgent.id);setReply(message);setRecipient(sAgent?.id??'');setTopicTask(linkedTaskId??'');setHandoffTo('');setHandoffSummary('');setComposerOptions(true);}}>Für {handoffAgent.name} antworten</button>
          <button className="rw-link" onClick={()=>openProfile(handoffAgent.id)}>Profil von {handoffAgent.name}</button>
         </div>}
        </div>}

        <p>{message.body}</p>
        {isAgentMsg&&<details className="r3-message-provenance"><summary>Herkunft</summary><small className="rw-muted">
         {isVerifiedRun
          ?'Verifizierter Modelllauf – Entscheidungen und Freigaben bleiben beim Team'
          :`Manuell protokolliert durch ${person?.name??'Mitglied'} – keine automatische Modellgenerierung`}
        </small></details>}
        {message.taskId&&!linkedTask&&<button className="rw-message-task" onClick={()=>onTask(message.taskId!)}><CheckCheck size={14}/>Verknüpfte Aufgabe öffnen<ArrowRight size={13}/></button>}

        <details className="r3-message-menu"><summary aria-label="Nachrichtenaktionen" title="Antworten, Aufgabe oder Entscheidung"><MoreHorizontal size={18}/></summary><div className="rw-message-actions">
         <button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');setReply(message);setTopicTask(linkedTaskId??'');setRecipient(sAgent?.id??(message.author!==userId?message.author:message.recipient??''));setSenderAgent('');setHandoffTo('');setHandoffSummary('');composerInput.current?.focus();}}><Reply size={14}/>Antworten</button>
         <button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');linkedTaskId?onTask(linkedTaskId):onConvert('task',message);}}><CheckCheck size={14}/>{linkedTaskId?'Aufgabe':'Als Aufgabe'}</button>
         <button onClick={e=>{e.currentTarget.closest('details')?.removeAttribute('open');onConvert('decision',message);}}><Pin size={14}/>Festhalten</button>
        </div></details>
       </div>
      </article>;
     })}
     {messages.length>0&&!visible.length&&<p className="rw-muted">Keine Nachricht passt zum aktuellen Filter.{filter.kind!=='all'&&<> <button className="rw-link" onClick={()=>selectFilter({kind:'all'})}>Alle Nachrichten zeigen</button></>}</p>}
     <div ref={end}/>
    </div>

    <div className="rw-composer-wrap">
     {error&&<p role="alert" className="rw-error">{error}</p>}
     {reply&&<div className="rw-reply-bar"><Reply size={14}/><span>Antwort auf: {reply.body.slice(0,140)}</span><button className="rw-icon" onClick={()=>setReply(null)} aria-label="Antwortbezug entfernen"><X size={14}/></button></div>}
     {(recipient||topicTask||senderAgent)&&<div className="r3-composer-scope" aria-live="polite">{recipient&&<span>An {targetName} · im Projekt</span>}{topicTask&&<span><Hash size={12}/>{room.tasks.find(t=>t.id===topicTask)?.title??'Aufgabe'}</span>}{senderAgent&&<span className="r3-manual-scope">Manuell für {selectedSenderAgent?.name??'Agent'}</span>}<button className="rw-icon" aria-label="Zusatzangaben zurücksetzen" onClick={resetComposer}><X size={13}/></button></div>}
     <div className="r3-compose-options" id="r3-compose-options" hidden={!composerOptions}>
      <div className="r3-options-head"><strong>Nachrichtenoptionen</strong><button className="rw-icon" aria-label="Nachrichtenoptionen schliessen" onClick={()=>setComposerOptions(false)}><X size={16}/></button></div>
     <div className="rw-composer-context">
      <label className="rw-context-select">
       <span>An (im Projektraum):</span>
       <select aria-label="Empfänger im Projekt" value={recipient} onChange={e=>{setRecipient(e.target.value);setHandoffTo('');setHandoffSummary('');}} disabled={busy}>
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
      {canDevelop&&writableAgents.length>0&&<label className="rw-context-select">
       <span>Beitrag erfassen als:</span>
       <select aria-label="Als Mensch oder manuell für ein KI-Teammitglied senden" value={senderAgent} onChange={e=>{setSenderAgent(e.target.value);setHandoffTo('');setHandoffSummary('');setRecipient(messengerComposerTarget(filter).recipient);}} disabled={busy}>
        <option value="">Ich selbst ({me?.name??'Mitglied'})</option>
        {writableAgents.map(a=><option key={a.id} value={a.id}>Manuell für 🤖 {a.name} ({agentRoleLabels[a.role]})</option>)}
       </select>
      </label>}
     </div>
     {canDelegate&&activeAgents.length>1&&<div className="rw-composer-handoff">
      <label className="rw-context-select">
       <span>Koordinator-Übergabe an:</span>
       <select aria-label="Ziel-Agent für Koordinator-Übergabe" value={handoffTo} onChange={e=>{setHandoffTo(e.target.value);setRecipient(e.target.value||messengerComposerTarget(filter).recipient);}} disabled={busy}>
        <option value="">Keine Übergabe (normaler Beitrag)</option>
        {activeAgents.filter(a=>a.id!==senderAgent).map(a=><option key={a.id} value={a.id}>🤖 {a.name} ({agentRoleLabels[a.role]} · {a.model})</option>)}
       </select>
      </label>
      {handoffTo&&<input className="rw-handoff-input" aria-label="Kurzauftrag für die Agenten-Übergabe" value={handoffSummary} onChange={e=>setHandoffSummary(e.target.value)} maxLength={300} placeholder="Kurzauftrag für den Ziel-Agenten (optional, sonst erste Zeile der Nachricht)"/>}
     </div>}
      {onFiles&&<button className="rw-button subtle" onClick={()=>{setComposerOptions(false);onFiles();}}><FolderOpen size={15}/>Projektdateien öffnen</button>}
     </div>
     <form className="rw-composer" onSubmit={e=>{e.preventDefault();void send();}}>
      <button type="button" className="r3-compose-plus r3-icon-button" aria-label="Nachrichtenoptionen" aria-expanded={composerOptions} aria-controls="r3-compose-options" onClick={()=>setComposerOptions(!composerOptions)}><Plus size={20}/></button>
      <label className="rw-sr" htmlFor="rw-message">Nachricht an den Projektraum</label>
      <textarea ref={composerInput} id="rw-message" rows={1} enterKeyHint="send" value={text} maxLength={4000} disabled={busy} onChange={e=>{setText(e.target.value);saveDraft(draftKey,e.target.value);}} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}} placeholder={senderAgent?`Manuell für ${selectedSenderAgent?.name??'Agent'} protokollieren …`:recipient?'Nachricht an '+targetName+' …':'Nachricht ans Projektteam …'}/>
      <button className="rw-send" disabled={busy||!text.trim()} aria-label="Nachricht senden"><Send size={18}/></button>
     </form>
    </div>
   </div>
   {hasDetail&&<MessengerInspector title={editingAgent?'Agentenprofil bearbeiten':profileAgent?profileAgent.name:detailTitle??'Details'} overlay={overlay} wide={detailKey==='files'||!!editingAgent} onClose={closeInspector} navigation={!profileAgent&&!editingAgent?detailNavigation:undefined}>
    {profileAgent&&!editingAgent&&<AgentProfileView
     agent={profileAgent}
     room={room}
     resources={resources}
     canDevelop={canDevelop}
     onEdit={()=>{setEditingAgent(profileAgent);setProfileAgentId(null);}}
     onOpenAvatarPicker={()=>setAvatarPickerOpen(true)}
     onAddressInChat={()=>{setProfileAgentId(null);selectFilter({kind:'agent',id:profileAgent.id});}}
     onActAsAgent={()=>{selectFilter({kind:'all'});setSenderAgent(profileAgent.id);setComposerOptions(true);}}
     onOpenTask={onTask}
     onClose={closeInspector}
    />}

    {editingAgent&&<form key={editingAgent.id??'new-agent'} className="rw-agent-form" onSubmit={saveAgent} aria-label="KI-Teammitglied einrichten">
     <div className="rw-agent-form-top">
      <div>
       <span className="rw-eyebrow">SCHMAQQ FIELD GUILD R2 · AGENTENPROFIL</span>
       <strong>{editingAgent.id?'KI-Teammitglied bearbeiten':'Neues KI-Teammitglied erstellen'}</strong>
      </div>
      <button type="button" className="rw-icon" onClick={closeInspector} aria-label="Formular schließen"><X size={16}/></button>
     </div>

     {/* AVATAR PICKER TRIGGER BAR */}
     <div className="rw-fg-form-avatar-bar">
      <button type="button" className="rw-avatar-btn" onClick={()=>setAvatarPickerOpen(true)} title="Avatar auswählen">
       <AgentAvatar
        presetId={editingAgent.avatarPresetId}
        name={editingAgent.name||'Agent'}
        fallbackCode={editingAgent.avatar}
        size="lg"
       />
      </button>
      <div className="rw-fg-form-avatar-meta">
       <strong>
        {findAvatarPreset(editingAgent.avatarPresetId)
         ?`Charakter: ${findAvatarPreset(editingAgent.avatarPresetId)!.name} (${findAvatarPreset(editingAgent.avatarPresetId)!.recommendedRoleLabel})`
         :'Individueller Kürzel-Avatar'}
       </strong>
       <small>Wähle eines der 12 Field-Guild-R2-Portraits. Avatar, Name, Rolle, Modell und Kommunikationsstil sind frei kombinierbar.</small>
       <div className="rw-fg-form-avatar-buttons">
        <button type="button" className="rw-button lime" onClick={()=>setAvatarPickerOpen(true)}>
         <Sparkles size={15}/>Avatar auswählen
        </button>
       </div>
      </div>
     </div>

     {/* 1. EINFACHE GRUNDEINSTELLUNGEN (SOFORT VERSTÄNDLICH) */}
     <fieldset className="rw-fg-fieldset">
      <legend>Grundeinstellungen (Identität, Rolle & Modell)</legend>
      <div className="rw-agent-form-grid">
       <label>Name des Agenten<input name="name" required maxLength={80} value={editingAgent.name??''} onChange={e=>setEditingAgent({...editingAgent,name:e.target.value})} placeholder="z. B. Herr Grau oder Leitwolf"/></label>
       <label>Optionaler Spitzname<input name="nickname" maxLength={40} value={editingAgent.nickname??''} onChange={e=>setEditingAgent({...editingAgent,nickname:e.target.value})} placeholder="z. B. Der Berater"/></label>
       <label>Rolle / Fachbereich
        <select name="role" value={editingAgent.role??'coordinator'} onChange={e=>setEditingAgent({...editingAgent,role:e.target.value as RoomAgentRole})}>
         {ALL_ROLES.map(r=><option key={r} value={r}>{agentRoleLabels[r]}</option>)}
        </select>
       </label>
       <label>Ausgewähltes KI-Modell
        <input name="model" list={'agent-models-'+room.project.id} required maxLength={120} value={editingAgent.model??(connectedModels[0]??'gpt-5-codex')} onChange={e=>setEditingAgent({...editingAgent,model:e.target.value})} placeholder="z. B. gpt-5-codex"/>
        <datalist id={'agent-models-'+room.project.id}>{modelOptions.map(m=><option key={m} value={m}/>)}</datalist>
       </label>
      </div>
      <label>Beschreibung & Auftrag im Projekt
       <input name="purpose" maxLength={400} value={editingAgent.purpose??''} onChange={e=>setEditingAgent({...editingAgent,purpose:e.target.value})} placeholder="z. B. Prüft Systemgrenzen, Datenmodelle und langfristige Wartbarkeit"/>
      </label>
      <label>Kommunikationsstil & Persönlichkeit
       <input name="personality" maxLength={400} value={editingAgent.personality??''} onChange={e=>setEditingAgent({...editingAgent,personality:e.target.value})} placeholder="z. B. Trockener Humor, analytisch, erkennt Probleme frühzeitig"/>
      </label>
     </fieldset>

     {/* 2. ERWEITERTE KONFIGURATION & SERVERSEITIGE BERECHTIGUNGEN */}
     <details className="rw-fg-advanced-details" open={Boolean(editingAgent.id)}>
      <summary>Erweiterte Konfiguration: Modellzugang, Kontextquellen, Fähigkeiten & Berechtigungen</summary>
      <div className="rw-fg-advanced-body">
       <fieldset className="rw-fg-fieldset">
        <legend>Technische Konfiguration & Projektkontext</legend>
        <div className="rw-agent-form-grid">
         <label>Zugeordneter Modellzugang / Rechner
          <select name="modelDevice" value={editingAgent.modelDevice??''} onChange={e=>setEditingAgent({...editingAgent,modelDevice:e.target.value})}>
           <option value="">Automatisch (freigegebener Projekt-Runner)</option>
           {resources.map(r=><option key={r.device} value={r.device}>{r.name} ({r.ownerName} · {r.online?'Online':'Offline'})</option>)}
          </select>
         </label>
         <label>Kürzel-Fallback (2–4 Zeichen)
          <input name="avatar" maxLength={4} value={editingAgent.avatar??''} onChange={e=>setEditingAgent({...editingAgent,avatar:e.target.value.toUpperCase()})} placeholder="z. B. HG"/>
         </label>
        </div>
        <label>Verantwortungsbereich
         <input name="responsibility" maxLength={500} value={editingAgent.responsibility??''} onChange={e=>setEditingAgent({...editingAgent,responsibility:e.target.value})} placeholder="Wofür ist dieser Agent im Projekt konkret zuständig?"/>
        </label>
        <label>Fachgebiete & Wissensbereiche
         <input name="knowledgeScope" maxLength={400} value={editingAgent.knowledgeScope??''} onChange={e=>setEditingAgent({...editingAgent,knowledgeScope:e.target.value})} placeholder="z. B. selfhost/, studio/, Architektur-Entscheidungen, Sicherheitsregeln"/>
        </label>
        <div className="rw-fg-check-group">
         <span>Kontextquellen:</span>
         {CONTEXT_SOURCE_KEYS.map(src=><label key={src} className="rw-cap-check">
          <input type="checkbox" name={'ctx-'+src} defaultChecked={(editingAgent.contextSources??['messages','tasks','decisions']).includes(src)}/>
          <span>{agentContextSourceLabels[src]}</span>
         </label>)}
        </div>
        <div className="rw-fg-check-group">
         <span>Fähigkeiten:</span>
         {ALL_CAPABILITIES.map(c=><label key={c} className="rw-cap-check">
          <input type="checkbox" name={'cap-'+c} defaultChecked={(editingAgent.capabilities??['chat','task-plan']).includes(c)}/>
          <span>{agentCapabilityLabels[c]}</span>
         </label>)}
        </div>
       </fieldset>

       <fieldset className="rw-fg-fieldset">
        <legend><Shield size={14}/> Serverseitig geprüfte Berechtigungen</legend>
        <p className="rw-muted">Die Avatar-Persönlichkeit vergibt niemals automatisch Rechte. Diese Berechtigungen werden bei jeder API-Aktion serverseitig geprüft.</p>
        <div className="rw-fg-perm-grid">
         {(Object.keys(agentPermissionLabels) as (keyof RoomAgentPermissions)[]).map(key=>(
          <label key={key} className="rw-cap-check">
           <input type="checkbox" name={'perm-'+key} defaultChecked={editingPerms[key]}/>
           <span>{agentPermissionLabels[key]}</span>
          </label>
         ))}
        </div>
       </fieldset>
      </div>
     </details>

     <footer className="rw-agent-form-actions">
      {editingAgent.id&&<button type="button" className="rw-button subtle" disabled={busy} onClick={()=>void removeAgent(editingAgent as RoomAgent)}>Aus Projekt entfernen</button>}
      <button type="button" className="rw-button subtle" disabled={busy} onClick={()=>setEditingAgent(null)}>Abbrechen</button>
      <button type="submit" className="rw-button lime" disabled={busy}>{busy?'Wird gespeichert …':'Agentenprofil speichern'}</button>
     </footer>
    </form>}

    {!profileAgent&&!editingAgent&&detail}
   </MessengerInspector>}
  </div>

  {avatarPickerOpen&&<AvatarConfigurator
   selectedPresetId={editingAgent?editingAgent.avatarPresetId:(profileAgent?.avatarPresetId)}
   customCode={editingAgent?editingAgent.avatar:(profileAgent?.avatar)}
   onSelect={(presetId,fallbackCode)=>{
    if(editingAgent){
     const preset=findAvatarPreset(presetId);
     setEditingAgent(prev=>prev?{
      ...prev,
      avatarPresetId:presetId,
      avatar:fallbackCode,
      ...(!prev.id&&preset&&(!prev.name||FIELD_GUILD_R2_PRESETS.some(p=>p.name===prev.name))?{name:preset.name}:{})
     }:prev);
    }else if(profileAgent){
     void updateAgentAvatarDirectly(profileAgent,presetId,fallbackCode);
    }
   }}
   onApplyRecommendation={editingAgent?applyPresetRecommendation:undefined}
   onClose={()=>setAvatarPickerOpen(false)}
  />}
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
