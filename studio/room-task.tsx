import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,CheckCheck,ChevronDown,Code2,FileText,GitBranch,Link2,MessageSquare,Monitor,Save,Send,ShieldCheck,Sparkles,UserRound,Users,X} from 'lucide-react';
import Development from '../app/development';
import TaskDiscussion,{type TaskComment} from '../app/task-discussion';
import {statuses,type Task} from '../app/workspace-model';
import RoomAssistant from './room-assistant';
import TaskReviewDiff from './task-review-diff';
import TeamInvite from '../app/team-invite';
import {roomRequest,saveDraft,storedDraft,type RoomState,type ContextPreview,type Resource} from './room-model';

type Review={id:string;ownerName:string;commit:string;state:string};
type Change={workspace:string;lastActivity?:{kind:string;status:string;created:number}|null;check?:{status:string};preview?:{id:string;status:string};review?:{id:string;state:string;changedAfter?:boolean}};
type Detail={task:Task;brief:{revision:number};comments:TaskComment[];reviews:Review[];workspaces:{id:string;owner:string;status?:string;deviceName?:string}[];changes:Change[]};
type WorkingMode='choose'|'people'|'self'|'ai';
const modes:[WorkingMode,string,typeof Users][]=[['people','Mit dem Team',Users],['self','Selbst bearbeiten',Code2],['ai','Mit KI',Sparkles]];

export default function RoomTask({taskId,room,resources,userId,onClose,onRefresh,onConnect,onTeam}:{
 taskId:string;room:RoomState;resources:Resource[];userId:string;onClose:()=>void;onRefresh:()=>Promise<void>;onConnect:()=>void;onTeam:()=>void
}){
 const [detail,setDetail]=useState<Detail|null>(null),[mode,setMode]=useState<WorkingMode>(()=>{const m=storedDraft('r26-mode:'+userId+':'+taskId);return ['people','self','ai'].includes(m)?m as WorkingMode:'choose';});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[editing,setEditing]=useState(false),[selectedReview,setSelectedReview]=useState(''),[context,setContext]=useState<ContextPreview|null>(null),[include,setInclude]=useState(true);
 const [inviteOpen,setInviteOpen]=useState(false);
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[editRevision,setEditRevision]=useState(0);
 const commentKey='room-comment:'+userId+':'+taskId;const [draft,setDraft]=useState(()=>storedDraft(commentKey));
 const panel=useRef<HTMLElement|null>(null),latest=useRef<Detail|null>(null);
 const refresh=useCallback(async()=>{try{const next=await roomRequest<Detail>('/api/collaboration/task?id='+encodeURIComponent(taskId));latest.current=next;setDetail(next);}catch(e){setError((e as Error).message);}},[taskId]);
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},5000);return()=>clearInterval(timer);},[refresh]);
 useEffect(()=>{let active=true;roomRequest<ContextPreview>('/api/room/context?project='+encodeURIComponent(room.project.id)+'&task='+encodeURIComponent(taskId)).then(next=>{if(active)setContext(next);}).catch(()=>{});return()=>{active=false;};},[taskId,room.project.id,room.messages.length,room.notes.length,detail?.brief.revision]);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;const root=panel.current;root?.querySelector<HTMLButtonElement>('button')?.focus();const key=(e:KeyboardEvent)=>{if(document.querySelector('body > .modal-backdrop'))return;if(e.key==='Escape'&&!editing){onClose();return;}if(e.key!=='Tab'||!root)return;const list=[...root.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href]')].filter(n=>n.getClientRects().length);const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);if(previous?.isConnected)previous.focus();};},[onClose,editing]);
 const task=detail?.task??room.tasks.find(t=>t.id===taskId);
 const selected=room.members.find(m=>m.id===task?.assignee);
 const myWorkspace=detail?.workspaces.find(w=>w.owner===userId&&w.status!=='cancelled');
 const ongoing=!!myWorkspace||!!detail?.workspaces.length;
 const lastReview=detail?.reviews[0];
 const phase=task?.status==='done'?'Erledigt':lastReview?'Ergebnis zur Prüfung':ongoing?'Bearbeitung vorhanden':task?.assignee?'Verantwortung vergeben, Bearbeitung noch nicht gestartet':'Noch niemand zuständig';
 const source=room.messages.find(m=>m.taskId===taskId);
 const people=room.members.filter(m=>m.id!==userId);
 const isOwner=room.members.some(m=>m.id===userId&&m.role==='owner');
 function choose(next:WorkingMode){setMode(next);saveDraft('r26-mode:'+userId+':'+taskId,next);}
 async function action(data:Record<string,unknown>){setBusy(true);setError('');try{await roomRequest('/api/collaboration/task',{task:taskId,...data});await Promise.all([refresh(),onRefresh()]);return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}}
 async function beginEdit(){if(!detail)return;setTitle(detail.task.title);setDescription(detail.task.description);setEditRevision(detail.brief.revision);setEditing(true);}
 async function saveBrief(){if(!title.trim())return;if(await action({action:'brief',title:title.trim(),description,revision:editRevision}))setEditing(false);}
 const runnerCount=resources.filter(r=>r.owner===userId&&r.online&&r.projects.includes(room.project.id)).length;
 const summary=detail?.changes[0];
 return <div className="rw-drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="rw-drawer r26-task" ref={panel} role="dialog" aria-modal="true" aria-label="Aufgabe im Projektraum">
   <header><button className="rw-icon" onClick={onClose} aria-label="Aufgabe schließen"><ArrowLeft size={20}/></button><div className="rw-drawer-heading"><small>{room.project.title} / GEMEINSAME AUFGABE</small><h2>{task?.title??'Aufgabe wird geladen …'}</h2></div><button className="rw-icon" onClick={onClose} aria-label="Zurück zum Raum"><X size={20}/></button></header>
   <div className="rw-drawer-body r26-task-body">
    {error&&<p role="alert" className="rw-error">{error}<button className="rw-button compact" onClick={()=>setError('')}>Schliessen</button></p>}
    <div className="r26-task-overview">
     <div className="r26-section-kicker"><span className="r26-step">01</span> WAS WOLLEN WIR ERREICHEN?</div>
     {editing?<form className="r26-brief-edit" onSubmit={e=>{e.preventDefault();void saveBrief();}}>
       <label>Aufgabe<input aria-label="Aufgabentitel bearbeiten" value={title} maxLength={160} required onChange={e=>setTitle(e.target.value)}/></label>
       <label>Gewünschtes Ergebnis<textarea aria-label="Aufgabenbeschreibung bearbeiten" value={description} maxLength={12000} onChange={e=>setDescription(e.target.value)}/></label>
       <div className="rw-row-actions"><button type="submit" className="rw-button lime" disabled={busy||!title.trim()}><Save size={15}/>Änderung speichern</button><button type="button" className="rw-button subtle" onClick={()=>setEditing(false)}>Abbrechen</button></div>
       <small>Änderungen am Auftrag werden versioniert. Bei gleichzeitiger Bearbeitung bleibt dein Entwurf erhalten.</small>
      </form>:<div className="r26-brief"><p>{task?.description||'Noch kein Ergebnis beschrieben. Ergänze kurz, was erreicht werden soll.'}</p><button className="rw-button subtle" disabled={!detail} onClick={()=>void beginEdit()}><FileText size={15}/>Auftrag präzisieren</button></div>}
     {source&&<p className="rw-provenance"><Link2 size={14}/>Entstand aus einer Nachricht dieses Raums.</p>}
    </div>
    <div className="r26-flow-status" aria-live="polite">
     <div><span className="r26-section-kicker"><span className="r26-step">02</span> WO STEHEN WIR?</span><strong>{phase}</strong><small>{task?.assignee?selected?.name+' ist verantwortlich':'Noch offen, wer die Umsetzung betreut'} · {ongoing?'Arbeitsstand vorhanden':'Keine laufende Codebearbeitung'}</small></div>
     <span className={'rw-badge '+(task?.status==='done'?'green':'')}>{statuses.find(s=>s[0]===task?.status)?.[1]??'Offen'}</span>
    </div>
    <section className="r26-next">
     <div className="r26-section-kicker"><span className="r26-step">03</span> WIE GEHT ES WEITER?</div>
     <h3>Ein Auftrag. Ihr entscheidet, wer ihn weiterbringt.</h3>
     <div className="r26-mode-choices">{modes.map(([id,label,Icon])=><button key={id} onClick={()=>choose(id)} className={'r26-mode-choice '+(mode===id?'selected':'')} aria-pressed={mode===id}><Icon size={20}/><span>{label}</span><ArrowRight size={14}/></button>)}</div>
     {mode==='people'&&<div className="r26-mode-panel"><strong>Mit wem möchtest du arbeiten?</strong><p>Die Übergabe ist sofort in diesem Raum sichtbar. Markus sieht denselben Auftrag und kann hier antworten. Ein Rechner oder Git ist dafür noch nicht nötig.</p>
      {!people.length&&<div className="r26-prerequisite"><Users size={18}/><div><strong>Noch kein zweites Teamkonto</strong><p>Der Auftrag bleibt hier gespeichert. Markus benötigt einmalig ein eigenes Konto – keinen Zugang zu deinem Konto.</p>{isOwner?<><button className="rw-button" onClick={()=>setInviteOpen(!inviteOpen)} aria-expanded={inviteOpen}>{inviteOpen?'Einladung schliessen':'Markus direkt hier einladen'}</button>{inviteOpen&&<TeamInvite compact/>}<button className="rw-button subtle" onClick={()=>void onRefresh()}>Team aktualisieren</button></>:<button className="rw-button" onClick={onTeam}>Eigentümer um Einladung bitten</button>}</div></div>}
      {people.map(person=><div className="r26-person" key={person.id}><span className="rw-avatar">{person.name.slice(0,2).toUpperCase()}</span><div><strong>{person.name}</strong><small>{task?.assignee===person.id?'Ist zuständig':'Kann die Aufgabe übernehmen'}</small></div><button disabled={busy||task?.status==='done'||!!task?.assignee&&task.assignee!==userId} className="rw-button" onClick={()=>void action({action:'handoff',assignee:person.id,expectedAssignee:task?.assignee??null})}>{task?.assignee===person.id?'Bereits übergeben':'Übergeben'}</button></div>)}
      {task?.assignee===userId&&<button disabled={busy||ongoing} className="rw-button subtle" onClick={()=>void action({action:'handoff',assignee:null,expectedAssignee:userId})}>Meine Zuständigkeit freigeben</button>}
      {task?.assignee&&task.assignee!==userId&&<p className="r26-handoff-note"><CheckCheck size={16}/>{selected?.name} ist verantwortlich. Rückfragen und Ergebnisse bleiben weiter unten im Gespräch.</p>}
     </div>}
     {mode==='self'&&<div className="r26-mode-panel"><strong>Selbst weiterarbeiten</strong>
      {task?.assignee&&task.assignee!==userId?<div className="r26-prerequisite"><UserRound size={19}/><p>Diese Aufgabe gehört {selected?.name}. Ihr könnt unten weiter diskutieren; für einen eigenen Code-Arbeitsbereich muss die Zuständigkeit zuerst abgestimmt werden.</p></div>:
      <>{!task?.assignee&&<button disabled={busy} className="rw-button lime" onClick={()=>void action({action:'handoff',assignee:userId,expectedAssignee:null})}>Ich kümmere mich darum <ArrowRight size={15}/></button>}
       {!runnerCount&&<div className="r26-prerequisite"><Monitor size={20}/><div><strong>Dein Arbeitsrechner ist noch nicht verbunden.</strong><p>Das kann nach einem Passwortwechsel passieren. Verbinde den vorhandenen Rechner einmal neu. Am Handy musst du keinen Ordnerpfad angeben.</p><button className="rw-button" onClick={onConnect}>Verbindung einrichten</button></div></div>}
       {!!task?.assignee&&<details className="r26-work-details" open={!!myWorkspace}><summary><Code2 size={17}/>{myWorkspace?'Arbeitsstand öffnen':'Code bearbeiten und Tests ausführen'}<ChevronDown size={16}/></summary><div className="r26-work-content"><details className="rw-context-card"><summary>Welcher Kontext wird Codex mitgegeben?</summary><label><input type="checkbox" checked={include} onChange={e=>setInclude(e.target.checked)}/>Gemeinsames Projektziel, diese Aufgabe und relevante Entscheidungen</label><pre>{context?.text??'Wird geladen …'}</pre></details><Development key={taskId} projects={[room.project]} userId={userId} initialProject={room.project.id} initialTask={taskId} mode="focused" panel="edit" contextPrefix={include?context?.text:undefined} onOpenSetup={onConnect}/></div></details>}</>}
     </div>}
     {mode==='ai'&&<div className="r26-mode-panel"><strong>KI zu dieser Aufgabe hinzunehmen</strong><p>Verfügbare Modelle werden mit ihrem Rechner angezeigt. Ein ChatGPT-Link ist noch keine ChatGPT-Integration; lokale Modelle brauchen die Freigabe ihres Besitzers.</p><RoomAssistant key={'task-ai-'+taskId} taskId={taskId} room={room} resources={resources} userId={userId} onClose={()=>choose('choose')} onRefresh={onRefresh} onConnect={onConnect}/></div>}
     {mode==='choose'&&<p className="r26-hint">Du kannst auch zuerst mit Markus diskutieren. Die Aufgabe bleibt bestehen, selbst wenn gerade kein Rechner verbunden ist.</p>}
    </section>
    <section className="r26-task-results"><div className="r26-section-kicker"><span className="r26-step">04</span> ERGEBNIS & PRÜFUNG</div>
     {!detail?.reviews.length&&!detail?.changes.length?<p className="rw-muted">Noch kein Code-Ergebnis. Sobald eine Arbeitskopie, Vorschau oder ein Prüfstand entsteht, findest du ihn hier – bei derselben Aufgabe.</p>:<>
      {detail?.changes.map(change=><div className="r26-result" key={change.workspace}><GitBranch size={18}/><div><strong>Arbeitsstand</strong><small>{change.check?.status==='completed'?'Tests ausgeführt':'Tests noch nicht bestätigt'} · {change.review?.state==='approved'?'Geprüft':'Review offen'} · nicht automatisch veröffentlicht</small>
       {change.lastActivity&&<small className="r27-activity">Letzte bestätigte Aktion: {({ 'save-file':'Datei gespeichert','codex':'Codex-Auftrag','check':'Testlauf','preview':'Vorschau','review':'Prüfstand','submit':'Veröffentlichung' } as Record<string,string>)[change.lastActivity.kind]??'Aktualisierung'} · {change.lastActivity.status==='completed'?'Abgeschlossen':change.lastActivity.status==='running'?'In Ausführung':change.lastActivity.status==='queued'?'Wartet':'Nicht abgeschlossen'} · {new Date(change.lastActivity.created).toLocaleString('de-CH')}<br/>Gespeicherte Ereignisse werden regelmässig abgeglichen, keine Live-Cursor oder ungespeicherten Entwürfe.</small>}</div></div>)}
      {detail?.reviews.map(review=><div className="r26-result" key={review.id}><ShieldCheck size={18}/><div><strong>Prüfstand von {review.ownerName}</strong><small>{review.commit.slice(0,10)} · {review.state==='approved'?'freigegeben':'Prüfung offen'}</small></div><button className="rw-button" onClick={()=>setSelectedReview(review.id)}>Prüfen</button></div>)}
      {selectedReview&&<TaskReviewDiff key={selectedReview} task={taskId} review={selectedReview} changedAfter={detail?.changes.some(c=>c.review?.id===selectedReview&&c.review.changedAfter)??false} onClose={()=>setSelectedReview('')}/>}
      {mode==='self'?<p className="rw-muted">Deine Vorschau, Tests und Codeänderungen öffnest du direkt bei „Selbst bearbeiten“ – dieselbe Arbeitskopie, kein zweiter Editor.</p>:<details className="r26-work-details"><summary><Monitor size={17}/>Vorschau ansehen oder aktualisieren <ChevronDown size={16}/></summary><Development projects={[room.project]} userId={userId} initialProject={room.project.id} initialTask={taskId} mode="focused" panel="preview" onOpenSetup={onConnect}/></details>}
     </>}
    </section>
    <section className="r26-task-conversation"><div className="r26-section-kicker"><span className="r26-step">05</span> GEMEINSAM DRANBLEIBEN</div><h3>Rückfragen, Ideen und Entscheidungen</h3><p className="rw-muted">Marco und Markus sprechen hier über dieselbe Aufgabe. Keine separate Unterhaltung suchen.</p>
     {detail&&<div className="task-discussion"><TaskDiscussion taskId={taskId} comments={detail.comments} draft={draft} onDraft={value=>{setDraft(value);saveDraft(commentKey,value);}} onPosted={refresh}/></div>}
    </section>
   </div>

  </section>
 </div>;
}
