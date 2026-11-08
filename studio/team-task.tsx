import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,Code2,MessageSquare,Pencil,ShieldCheck,Sparkles,X} from 'lucide-react';
import Development from '../app/development';
import TaskDiscussion,{type TaskComment} from '../app/task-discussion';
import {statuses} from '../app/workspace-model';
import RoomAssistant from './room-assistant';
import ExternalAssistant from './external-assistant';
import TaskReviewDiff from './task-review-diff';
import GithubWorkflow from './github-workflow';
import {taskNextStep,type TaskStepAction} from './task-next-step';
import {roomRequest,saveDraft,storedDraft,operationId,type RoomState,type Resource,type TeamTask,type TaskContract,type TaskResult} from './room-model';
type Copy={id:string;owner:string;device:string;title:string;scope:string;revision:number;status:string;deviceName:string};
type Detail={source?:{id:string;body:string;authorName:string;created:number}|null;activeJobs?:{id:string;action:string;status:string;ownerName:string}[];task:TeamTask;brief:{revision:number};comments:TaskComment[];reviews:{id:string;owner:string;ownerName:string;commit:string;state:string;created?:number}[];workspaces:Copy[];changes:{workspace:string;review?:{id:string;changedAfter?:boolean}}[]};
type Pane='conversation'|'work'|'review';
export default function TeamTaskView({taskId,room,resources,userId,onClose,onRefresh,onConnect}:{taskId:string;room:RoomState;resources:Resource[];userId:string;onClose:()=>void;onRefresh:()=>Promise<void>;onConnect:()=>void}){
 const [detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[wide,setWide]=useState(false);
 const [pane,setPane]=useState<Pane>(()=>{const p=new URLSearchParams(location.search).get('pane');return p==='work'||p==='review'?p:p==='result'?'work':'conversation';});
 // "Ergebnis festhalten" from the overview opens the task directly at the result field once it is rendered.
 const wantsResult=useRef(new URLSearchParams(location.search).get('pane')==='result');
 const [editing,setEditing]=useState(false),[assistant,setAssistant]=useState<''|'local'|'external'>(''),[selectedReview,setSelectedReview]=useState('');
 const assistantPanel=useRef<HTMLDivElement|null>(null),localButton=useRef<HTMLButtonElement|null>(null),externalButton=useRef<HTMLButtonElement|null>(null),resultField=useRef<HTMLTextAreaElement|null>(null),tabs=useRef<HTMLElement|null>(null);
 // Deliberate clicks reveal what they opened below the sticky header; background polling never scrolls or moves focus.
 const reveal=(target:HTMLElement|null|undefined,focus?:HTMLElement|null)=>requestAnimationFrame(()=>{target?.scrollIntoView({block:'nearest'});(focus??target)?.focus({preventScroll:true});});
 function toggleAssistant(kind:'local'|'external'){if(assistant===kind){closeAssistant();return;}setAssistant(kind);requestAnimationFrame(()=>reveal(assistantPanel.current,assistantPanel.current?.querySelector<HTMLElement>('textarea:not([readonly]),select')));}
 function closeAssistant(){const trigger=assistant==='local'?localButton.current:externalButton.current;setAssistant('');trigger?.focus();}
 function openResultForm(){changePane('work');requestAnimationFrame(()=>reveal(resultField.current));}
 const [copyState,setCopyState]=useState({id:'',dirty:false,active:false}),[running,setRunning]=useState(''),[selfEdit,setSelfEdit]=useState(false),[editorUsed,setEditorUsed]=useState(false),[fullText,setFullText]=useState(false);
 const [generalHistory,setGeneralHistory]=useState<TaskResult[]>([]),[selectedGeneral,setSelectedGeneral]=useState('');
 const [utility,setUtility]=useState<''|'takeover'|'block'|'cancel'>(''),[utilityText,setUtilityText]=useState('');
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[criteria,setCriteria]=useState(''),[kind,setKind]=useState<'general'|'code'>('general'),[peer,setPeer]=useState(false),[editRevision,setEditRevision]=useState(0),[briefRevision,setBriefRevision]=useState(0);
 const commentKey='room-comment:'+userId+':'+taskId,resultKey='room-result:'+userId+':'+taskId;
 const [draft,setDraft]=useState(()=>storedDraft(commentKey)),[resultDraft,setResultDraft]=useState(()=>storedDraft(resultKey)),[reply,setReply]=useState('');
 const resultAttempt=useRef({body:'',id:''}),panel=useRef<HTMLElement|null>(null);
 const briefKey='room-brief:'+userId+':'+taskId;
 useEffect(()=>{const stored=storedDraft(briefKey);if(stored){try{const v=JSON.parse(stored);setTitle(v.title);setDescription(v.description);setCriteria(v.criteria);setKind(v.kind);setPeer(v.peer);setEditRevision(v.editRevision);setBriefRevision(v.briefRevision);setEditing(true);}catch{}}},[briefKey]);
 useEffect(()=>{if(editing)saveDraft(briefKey,JSON.stringify({title,description,criteria,kind,peer,editRevision,briefRevision}));},[editing,title,description,criteria,kind,peer,editRevision,briefRevision,briefKey]);
 const refresh=useCallback(async()=>{try{setDetail(await roomRequest<Detail>('/api/collaboration/task?id='+encodeURIComponent(taskId)));}catch(e){setError((e as Error).message);}},[taskId]);
 useEffect(()=>{let pending=false;const tick=async()=>{if(pending||document.hidden)return;pending=true;try{await refresh();}finally{pending=false;}};void tick();const timer=setInterval(tick,5000);return()=>clearInterval(timer);},[refresh]);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;panel.current?.querySelector<HTMLButtonElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(document.querySelector('body > .modal-backdrop'))return;if(e.key==='Escape'&&!editing){onClose();return;}if(e.key!=='Tab')return;const items=[...panel.current!.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]')].filter(n=>n.getClientRects().length);if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};},[onClose,editing]);
 const task=detail?.task,contract=task?.contract,own=task?.assignee===userId,person=room.members.find(m=>m.id===task?.assignee),myCopy=detail?.workspaces.find(w=>w.owner===userId),currentResult=task?.completion.result;
 const result=contract?.kind==='general'&&selectedGeneral?generalHistory.find(r=>r.id===selectedGeneral)??currentResult:currentResult;
 const staleResult=contract?.kind==='code'&&!!result&&!result.integrated&&(result.changedAfter===true||(result.contractRevision??0)!==contract.revision);
 useEffect(()=>{if(contract?.kind==='general')roomRequest<{history:TaskResult[]}>('/api/team/results?task='+encodeURIComponent(taskId)).then(r=>setGeneralHistory(r.history)).catch(e=>setError((e as Error).message));},[taskId,currentResult?.id,contract?.kind]);
 const device=resources.find(r=>r.owner===userId&&r.online&&r.development?.some(p=>p.id===room.project.id));
 function changePane(next:Pane){setPane(next);const url=new URL(location.href);url.searchParams.set('pane',next);history.replaceState(null,'',url);}
 useEffect(()=>{if(!wantsResult.current||!detail)return;wantsResult.current=false;changePane('work');if(resultField.current)reveal(resultField.current);},[detail]);
 async function action(path:string,data:Record<string,unknown>){setBusy(true);setError('');try{await roomRequest(path,data);await Promise.all([refresh(),onRefresh()]);return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}}
 const taskAction=(data:Record<string,unknown>)=>action('/api/collaboration/task',{task:taskId,...data});
 const teamAction=(data:Record<string,unknown>)=>action('/api/team',{task:taskId,...data});
 async function utilitySubmit(e:React.FormEvent){e.preventDefault();if(!contract||!task)return;const data=utility==='takeover'?{action:utility,expectedAssignee:task.assignee,reason:utilityText}:{action:utility,revision:contract.revision,reason:utilityText};if(await teamAction(data)){setUtility('');setUtilityText('');}}
 function edit(){if(!task||!contract||!detail)return;setTitle(task.title);setDescription(task.description);setCriteria(contract.criteria);setKind(contract.kind);setPeer(contract.requiresReview);setEditRevision(contract.revision);setBriefRevision(detail.brief.revision);setEditing(true);}
 async function save(){if(await teamAction({action:'contract',revision:editRevision,kind,criteria,requiresReview:peer,title,description,briefRevision})){saveDraft(briefKey,'');setEditing(false);}}
 async function codeJob(operation:string,source?:string){
  if(copyState.dirty||copyState.active){setError('Zuerst den Entwurf speichern und den laufenden Vorgang beenden lassen.');return;}
  if(!device){setError('Das Projekt ist noch nicht startklar. Die Einrichtung findest du auf der Projektübersicht.');return;}
  setBusy(true);setError('');setRunning(operation);
  try{
   // The Werkstatt may still be finishing a short job (e.g. opening a file); wait briefly instead of failing.
   const start=()=>roomRequest<{id:string}>('/api/development',{action:'job',operation,device:device.device,project:room.project.id,...(source?{source}:{worktree:myCopy?.id})});
   let queued:{id:string}|null=null;
   for(let attempt=0;!queued;attempt++){try{queued=await start();}catch(e){if(attempt>=9||!/läuft noch ein Vorgang/.test((e as Error).message))throw e;await new Promise(r=>setTimeout(r,2000));}}
   for(let i=0;i<600;i++){
    const {job}=await roomRequest<{job:{status:string;result?:{error?:string}}}>('/api/development/job?id='+encodeURIComponent(queued.id));
    if(job.status==='completed'){if(operation==='submit')setSelectedReview(queued.id);await Promise.all([refresh(),onRefresh()]);return;}
    if(!['queued','running'].includes(job.status))throw Error(job.result?.error??'Der Vorgang wurde unterbrochen. Der letzte bestätigte Stand bleibt erhalten.');
    await new Promise(r=>setTimeout(r,1000));
   }
   throw Error('Der Rechner hat noch keinen Abschluss bestätigt. Vor einer Wiederholung den Vorgang prüfen.');
  }catch(e){setError((e as Error).message);}finally{setBusy(false);setRunning('');}
 }
 async function submitResult(){if(!contract)return;if(resultAttempt.current.body!==resultDraft)resultAttempt.current={body:resultDraft,id:operationId()};if(await teamAction({action:'result',id:resultAttempt.current.id,body:resultDraft,revision:contract.revision})){setResultDraft('');saveDraft(resultKey,'');setSelectedGeneral('');changePane('review');}}
 const chooseReview=selectedReview||detail?.reviews[0]?.id||'';
 const step=task&&contract?taskNextStep({kind:contract.kind,status:task.status,own,assigned:!!task.assignee,person:person?.name??'Jemand',cancelled:contract.cancelled,blocked:contract.blocked,
  ready:task.completion.ready,requiresReview:contract.kind==='code'||contract.requiresReview,activeJob:running||detail?.activeJobs?.[0]?.action,
  result:currentResult?{shared:currentResult.shared,state:currentResult.state,integrated:currentResult.integrated,stale:staleResult,mine:currentResult.owner===userId,automatic:currentResult.workflow==='pull-request'}:null,
  hasCopy:!!myCopy,hasWorkshop:!!device}):null;
 function go(next:TaskStepAction){
  if(next==='claim')void taskAction({action:'claim'});
  else if(next==='start')void taskAction({action:'status',status:'doing'});
  else if(next==='finish')void taskAction({action:'status',status:'done'});
  else if(next==='reopen'&&contract)void teamAction({action:'reopen',revision:contract.revision});
  else if(next==='submit'||next==='resubmit')void codeJob('submit');
  else if(next==='integrate'&&currentResult)void codeJob('integrate',currentResult.id);
  else if(next==='edit'){changePane('work');reveal(tabs.current);}
  else if(next==='result')openResultForm();
  else if(next==='look'){changePane('review');reveal(tabs.current);}
  else if(next==='setup')onConnect();
 }
 const stepBlocked=(step?.action==='submit'||step?.action==='resubmit')&&(copyState.dirty||!!contract?.blocked);
 return <div className="rw-drawer-backdrop"><section ref={panel} className={'rw-drawer team-task'+(wide?' expanded':'')} role="dialog" aria-modal="true" aria-label="Gemeinsame Aufgabe">
  <header><button className="rw-icon" aria-label="Zurück zum Projekt" onClick={onClose}><ArrowLeft size={20}/></button><div className="rw-drawer-heading"><small>{room.project.title}</small><h2>{task?.title??'Aufgabe wird geladen …'}</h2></div><button className="rw-icon team-wide" onClick={()=>setWide(!wide)} aria-label={wide?'Kompakte Ansicht':'Breite Arbeitsansicht'}><ArrowUpRight size={17}/></button><button className="rw-icon" aria-label="Aufgabe schließen" onClick={onClose}><X size={20}/></button></header>
  <div className="team-task-scroll">
   {error&&<p className="rw-error" role="alert">{error}</p>}
   {task&&contract&&step&&<>
    <section className="team-task-summary">
     {/* The one next step: a sentence and at most one button. Nothing else on the page repeats it. */}
     <div className={'team-next'+(step.waiting?' waiting':'')} role="status" aria-live="polite">
      <p>{step.waiting&&<span className="team-spinner" aria-hidden="true"/>}{step.text}</p>
      {step.action&&<button className="rw-button lime" disabled={busy||stepBlocked} onClick={()=>go(step.action!)}>{step.label}</button>}
      {stepBlocked&&copyState.dirty&&<small>Speichere zuerst deine Datei unter „Ändern“.</small>}
     </div>
     {!editing?<div className="team-brief"><h3>Worum es geht</h3><p className={'team-goal'+(fullText?'':' clamped')}>{task.description||'Noch keine Beschreibung.'}</p>{task.description.length>220&&<button className="rw-link" onClick={()=>setFullText(!fullText)}>{fullText?'Weniger anzeigen':'Ganze Beschreibung lesen'}</button>}</div>
      :<form className="team-form" onSubmit={e=>{e.preventDefault();void save();}}><label>Titel<input value={title} required maxLength={160} onChange={e=>setTitle(e.target.value)}/></label><label>Gewünschtes Ergebnis<textarea value={description} maxLength={12000} onChange={e=>setDescription(e.target.value)}/></label><label>Art der Aufgabe<select value={kind} onChange={e=>setKind(e.target.value as TaskContract['kind'])}><option value="general">Planung, Recherche oder Organisation</option><option value="code">Code ändern</option></select></label><label>Fertig, wenn …<textarea value={criteria} maxLength={4000} onChange={e=>setCriteria(e.target.value)}/></label><label className="team-check"><input type="checkbox" checked={kind==='code'||peer} disabled={kind==='code'} onChange={e=>setPeer(e.target.checked)}/>Eine zweite Person gibt das Ergebnis frei</label><div className="rw-row-actions"><button className="rw-button lime" disabled={busy}>Speichern</button><button type="button" className="rw-button" onClick={()=>{saveDraft(briefKey,'');setEditing(false);}}>Abbrechen</button></div></form>}
     <details className="team-secondary"><summary>Mehr zur Aufgabe</summary>
      <p><strong>Fertig, wenn:</strong> {contract.criteria||'Das erreichte Ergebnis ist festgehalten.'} {contract.kind==='code'?'Eine zweite Person hat die Änderung angeschaut und freigegeben.':contract.requiresReview?'Eine zweite Person gibt das Ergebnis frei.':''}</p>
      {detail?.source&&<p><strong>Entstanden im Projektgespräch:</strong> „{detail.source.body}“ <small>({detail.source.authorName}, {new Date(detail.source.created).toLocaleString('de-DE')})</small></p>}
      {!editing&&task.status!=='done'&&(!task.assignee||own)&&<button className="rw-button" disabled={busy} onClick={edit}>Aufgabe bearbeiten</button>}
      {own&&<label>Aufgabe weitergeben<select aria-label="Aufgabe weitergeben" value="" disabled={busy||!!detail?.workspaces.length} onChange={e=>{if(e.target.value)void taskAction({action:'handoff',assignee:e.target.value,expectedAssignee:userId});}}><option value="">Person wählen …</option>{room.members.filter(m=>m.id!==userId).map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label>}
      {!own&&task.assignee&&task.status!=='done'&&<button className="rw-button" disabled={busy} onClick={()=>{setUtility('takeover');setUtilityText('');}}>Aufgabe selbst übernehmen</button>}
      {own&&task.status!=='done'&&<><button className="rw-button" disabled={busy} onClick={()=>{setUtility('block');setUtilityText(contract.blocked);}}>{contract.blocked?'Grund ändern, warum es festhängt':'Hängt fest …'}</button>{contract.blocked&&<button className="rw-button" disabled={busy} onClick={()=>void teamAction({action:'block',revision:contract.revision,reason:''})}>Geht wieder weiter</button>}<button className="rw-button" disabled={busy||!!detail?.workspaces.length} onClick={()=>{setUtility('cancel');setUtilityText('');}}>Aufgabe abbrechen</button></>}
     {utility&&<form className="team-form team-callout" onSubmit={utilitySubmit}><label>{utility==='takeover'?'Warum übernimmst du die Aufgabe?':utility==='block'?'Woran hängt es?':'Warum wird die Aufgabe abgebrochen?'}<textarea aria-label="Begründung der Aufgabenaktion" value={utilityText} required maxLength={2000} onChange={e=>setUtilityText(e.target.value)}/></label>{utility==='takeover'&&<p>Was bisher geteilt wurde, bleibt erhalten. Du machst vom letzten geteilten Stand aus weiter.</p>}<div className="rw-row-actions"><button className="rw-button" disabled={busy||!utilityText.trim()}>{utility==='takeover'?'Übernahme bestätigen':utility==='block'?'Speichern':'Aufgabe abbrechen'}</button><button type="button" className="rw-button subtle" onClick={()=>setUtility('')}>Zurück</button></div></form>}</details>
    </section>
    <nav ref={tabs} className="team-task-tabs" aria-label="Bereiche der Aufgabe">{([['conversation','Gespräch',MessageSquare],['work','Ändern',Code2],['review','Anschauen',ShieldCheck]] as const).map(([id,label,Icon])=><button key={id} className={pane===id?'active':''} aria-current={pane===id?'page':undefined} onClick={()=>changePane(id)}><Icon size={16}/>{label}</button>)}</nav>
    <section className="team-task-pane task-discussion" hidden={pane!=='conversation'}><TaskDiscussion taskId={taskId} comments={detail?.comments??[]} draft={draft} onDraft={v=>{setDraft(v);saveDraft(commentKey,v);}} onPosted={refresh}/></section>
    <section className="team-task-pane" hidden={pane!=='work'}>
     {task.status==='done'?<p>Die Aufgabe ist abgeschlossen. Ergebnis und Rückmeldungen findest du unter „Anschauen“.</p>
      :!own?<p>{(person?.name??'Die verantwortliche Person')+' arbeitet daran. Sobald es etwas anzuschauen gibt, findest du es unter „Anschauen“.'}</p>
      :contract.kind==='general'?<><h3>Ergebnis festhalten</h3><p>Dokumentiere, was erreicht wurde. Bei erforderlicher Teamprüfung erhält dein Kollege diese feste Fassung.</p><form className="team-form" onSubmit={e=>{e.preventDefault();void submitResult();}}><label>Ergebnis<textarea ref={resultField} aria-label="Ergebnis der Aufgabe" value={resultDraft} maxLength={12000} required disabled={!own} onChange={e=>{setResultDraft(e.target.value);saveDraft(resultKey,e.target.value);}}/></label><button className="rw-button lime" disabled={busy||!own||!resultDraft.trim()}>{contract.requiresReview?'Ergebnis zur Prüfung geben':'Ergebnis festhalten'}</button></form></>
      :<div className="team-change">
       <div className="team-change-way"><button className="rw-button lime" disabled={!device} onClick={()=>{setEditorUsed(true);setSelfEdit(true);}}><Pencil size={16}/>Selbst bearbeiten</button><p>Dateien öffnen, ändern und speichern. Funktioniert immer, auch ohne KI.</p></div>
       <div className="team-change-way"><button ref={externalButton} className="rw-button" aria-expanded={assistant==='external'} onClick={()=>toggleAssistant('external')}><Sparkles size={16}/>KI helfen lassen</button><p>Dein ChatGPT macht die Änderung. Studio gibt dir den Auftrag zum Einfügen.</p></div>
       {!device&&<p className="muted">Das Projekt ist noch nicht startklar. <button className="rw-link" onClick={onConnect}>Zur Einrichtung</button></p>}
      </div>}
     {assistant&&<div ref={assistantPanel} tabIndex={-1} className="team-assistant-panel">{assistant==='local'
      ?<RoomAssistant room={room} resources={resources} userId={userId} taskId={taskId} onClose={closeAssistant} onRefresh={onRefresh} onConnect={onConnect}/>
      :<ExternalAssistant projectTitle={room.project.title} project={room.project.id} taskTitle={task.title} task={taskId} kind={contract.kind} onClose={closeAssistant} onResult={own&&task.status!=='done'?()=>{setAssistant('');openResultForm();}:undefined}/>}</div>}
     {own&&task.status!=='done'&&<details className="team-secondary team-developer"><summary>Für Entwickler</summary>
      <button ref={localButton} className="rw-button subtle" aria-expanded={assistant==='local'} onClick={()=>toggleAssistant('local')}>Lokale KI auf dem eigenen PC fragen</button>
      {myCopy&&<div><p>Deine Arbeitskopie liegt auf {myCopy.deviceName}.</p><button className="rw-button" disabled={busy||copyState.dirty||copyState.active} onClick={()=>void action('/api/development',{action:'workspace',id:myCopy.id,revision:myCopy.revision,title:myCopy.title,scope:myCopy.scope,archived:true})}>Persönliche Bearbeitung abschließen</button><small>Lokale Dateien und vorhandene Prüfstände bleiben erhalten. Nicht geteilte Änderungen sind auf anderen Rechnern nicht verfügbar.</small></div>}
     </details>}
    </section>
    {/* "Selbst bearbeiten" is its own full screen. It loads on first use (opening a task starts no Werkstatt work)
        and then stays mounted while closed, so the open file and draft are kept. */}
    {contract.kind==='code'&&own&&task.status!=='done'&&editorUsed&&<section className={'team-self-edit'+(selfEdit?' open':'')} hidden={!selfEdit} role="dialog" aria-modal="true" aria-label="Selbst bearbeiten">
     <header><button className="rw-icon" aria-label="Zurück zur Aufgabe" onClick={()=>setSelfEdit(false)}><ArrowLeft size={20}/></button><div className="rw-drawer-heading"><small>Selbst bearbeiten</small><h2>{task.title}</h2></div></header>
     <div className="team-self-edit-body"><Development projects={[room.project]} userId={userId} initialProject={room.project.id} initialTask={taskId} mode="focused" panel="edit" onCopyState={setCopyState} onSubmitForReview={()=>void codeJob('submit')} onOpenSetup={onConnect}/></div>
     <footer><button className="rw-button lime" onClick={()=>setSelfEdit(false)}>{copyState.dirty?'Zurück (Entwurf bleibt erhalten)':'Fertig – zurück zur Aufgabe'}</button></footer>
    </section>}
    <section className="team-task-pane" hidden={pane!=='review'}>
     {contract.kind==='general'&&!!generalHistory.length&&<label>Ergebnisfassung<select value={selectedGeneral} onChange={e=>setSelectedGeneral(e.target.value)}><option value="">Aktuelle Ergebnisfassung</option>{generalHistory.map(r=><option key={r.id} value={r.id}>{new Date(r.created).toLocaleString('de-DE')} · frühere Fassung</option>)}</select></label>}{contract.kind==='general'?result?<article className="team-result"><span className="rw-badge">{result.state==='approved'?'Freigegeben':result.state==='changes_requested'?'Änderungen angefordert':contract.requiresReview?'Prüfung offen':'Ergebnis festgehalten'}</span><p>{result.body}</p><small>{room.members.find(m=>m.id===result.owner)?.name} · {new Date(result.created).toLocaleString('de-DE')}</small>{result.votes?.map((v,i)=><blockquote key={i}>{room.members.find(m=>m.id===v.reviewer)?.name}: {v.decision==='approved'?'Freigegeben':'Änderungen angefordert'}{v.body&&' · '+v.body}</blockquote>)}{!selectedGeneral&&task.status!=='done'&&contract.requiresReview&&result.owner!==userId&&<form className="team-form" onSubmit={e=>e.preventDefault()}><label>Rückmeldung<textarea value={reply} maxLength={4000} onChange={e=>setReply(e.target.value)}/></label><div className="rw-row-actions"><button className="rw-button lime" disabled={busy} onClick={()=>void teamAction({action:'vote',result:result.id,decision:'approved',body:reply})}>Diese Fassung freigeben</button><button className="rw-button" disabled={busy||!reply.trim()} onClick={()=>void teamAction({action:'vote',result:result.id,decision:'changes',body:reply})}>Änderungen anfordern</button></div></form>}</article>:<p>Noch kein Ergebnis eingereicht.</p>:
      <>{!detail?.reviews.length&&<p>Noch nichts zum Anschauen. Sobald die Änderung zur Prüfung gegeben ist, erscheint sie hier.</p>}{!!detail?.reviews.length&&<>{detail.reviews.length>1&&<label>Fassung<select value={chooseReview} onChange={e=>setSelectedReview(e.target.value)}>{detail.reviews.map(r=><option key={r.id} value={r.id}>{r.ownerName} · {new Date(r.created??0).toLocaleString('de-DE')} · {r.state==='approved'?'freigegeben':r.state==='changes_requested'?'Änderungen angefordert':'Prüfung offen'}</option>)}</select></label>}<TaskReviewDiff key={chooseReview} task={taskId} review={chooseReview} userId={userId} closed={task.status==='done'} onChange={()=>{void refresh();void onRefresh();}} changedAfter={(chooseReview===currentResult?.id&&staleResult)||detail.changes.some(c=>c.review?.id===chooseReview&&c.review.changedAfter)} onClose={()=>changePane('conversation')}/></>}
       {result?.shared&&(staleResult||result.workflow==="pull-request")&&<div className="team-callout" aria-label="Nächster Schritt für den Codeabschluss">{staleResult&&<p>Seit dieser Fassung wurde noch etwas geändert. Die Freigabe gilt erst für eine neue Fassung.</p>}{result.workflow==='pull-request'&&!staleResult&&<GithubWorkflow job={result.id} owner={result.owner} userId={userId} onChange={()=>{void refresh();void onRefresh();}}/>}</div>}
      </>}
    </section>
   </>}
  </div>
 </section></div>;
}
