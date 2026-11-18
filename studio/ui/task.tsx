import {useCallback,useEffect,useMemo,useState} from 'react';
import type {Studio} from './app';
import {accessOf,api,newId,q,type Resource,type TaskDetail} from './api';
import {Chat} from './chat';
import {agentOnTask} from './project';
import {activeAgents,jobOf,taskState} from './model';
import {taskNextStep,type TaskStepAction} from './next-step';
import {Bar,Dialog,ErrorLine,Field,More} from './parts';
import {outsideScope,splitDiff} from './diff';

/** Is the server ready for this project's code (its trial run passed)? */
export function serverFor(resources:Resource[],project:string,me:string){
 const ready=(r:Resource)=>r.online&&!!r.development?.some(p=>p.id===project&&p.readiness?.ready);
 return resources.find(r=>r.owner===me&&ready(r))??resources.find(r=>r.team&&ready(r))??null;
}

/** A task: what happens now (one step, one button), and its conversation with the team. */
export function TaskScreen({studio}:{studio:Studio}){
 const {route,go,me,room,roles,resources,desktop}=studio;
 const [detail,setDetail]=useState<TaskDetail|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[change,setChange]=useState<'own'|'review'|null>(null);
 const [menu,setMenu]=useState(false),[editing,setEditing]=useState(false),[resultForm,setResultForm]=useState(false);
 const load=useCallback(async()=>{try{setDetail(await api<TaskDetail>('/api/collaboration/task?id='+q(route.task)));setError('');}catch(e){setError((e as Error).message);}},[route.task]);
 useEffect(()=>{let alive=true;api<TaskDetail>('/api/collaboration/task?id='+q(route.task)).then(d=>{if(alive){setDetail(d);setError('');}}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[route.task,room]);
 const close=()=>go({task:''});
 if(!room)return null;
 if(!detail)return <section className="ui-screen"><Bar onBack={close} title="Aufgabe"/><ErrorLine text={error}/>{!error&&<p className="ui-loading">Wird geladen …</p>}</section>;
 const task=detail.task,contract=task.contract,access=accessOf(roles,me.id),state=taskState(task);
 const own=task.assignee===me.id,person=room.members.find(m=>m.id===task.assignee)?.name??'Jemand';
 const result=task.completion.result,myCopy=detail.workspaces.find(w=>w.owner===me.id);
 const server=serverFor(resources,room.project.id,me.id);
 const stale=contract.kind==='code'&&!!result&&!result.integrated&&(result.changedAfter===true||(result.contractRevision??0)!==contract.revision);
 const review=detail.reviews[0];
 const meta=room.meta;
 const step=taskNextStep({kind:contract.kind,status:task.status,own,assigned:!!task.assignee,person,cancelled:contract.cancelled,blocked:contract.blocked,
  ready:task.completion.ready,requiresReview:contract.kind==='code'||contract.requiresReview,activeJob:busy||detail.activeJobs[0]?.action,activeBehind:detail.activeJobs[0]?.behind,
  result:result?{shared:result.shared,state:result.state,integrated:result.integrated,stale,mine:result.owner===me.id,automatic:result.workflow==='pull-request',dropped:review?.dropped}:null,
  hasCopy:!!myCopy,hasWorkshop:!!server||!!myCopy,hasChange:myCopy?.changed,behind:myCopy?.behind,
  failure:busy?null:detail.lastFailure?{action:detail.lastFailure.action,text:detail.lastFailure.text,detail:detail.lastFailure.detail,mine:detail.lastFailure.owner===me.id,interrupted:detail.lastFailure.interrupted}
   :review?.mergeWait?{action:'integrate',text:'Die Änderung konnte nicht übernommen werden.',detail:review.mergeWait.reason,mine:result?.owner===me.id||access.admin}:null,
  awaitingLive:!!task.awaitingLive,liveHow:meta.liveHow,canDevelop:access.develop,canReview:access.review,isAdmin:access.loaded?access.admin:undefined,
  selfApprove:access.selfApprove,reviewers:access.loaded?access.reviewers:undefined});
 const coder=activeAgents(room.agents).find(a=>jobOf(a).code);

 async function run<T>(label:string,fn:()=>Promise<T>):Promise<T|undefined>{
  setBusy(label);setError('');
  try{const r=await fn();await Promise.all([load(),studio.reload()]);return r;}catch(e){setError((e as Error).message);}finally{setBusy('');}
 }
 /** A step on the server (share for approval, take over, bring up to date): start it and wait until it is done. */
 async function serverStep(operation:string,source?:string){
  const start=()=>api<{id:string}>('/api/development',{action:'job',operation,device:operation==='integrate'&&server?server.device:'auto',project:room!.project.id,...(source?{source}:{worktree:myCopy?.id})});
  let queued:{id:string}|null=null;
  for(let i=0;!queued;i++){try{queued=await start();}catch(e){if(i>=9||!/läuft (noch|gerade) ein Vorgang/.test((e as Error).message))throw e;await new Promise(r=>setTimeout(r,2000));}}
  for(let i=0;i<900;i++){
   const {job}=await api<{job:{status:string;result?:{error?:string;commit?:string;diff?:string}}}>('/api/development/job?id='+q(queued.id));
   if(job.status==='completed')return {id:queued.id,result:job.result??{}};
   if(!['queued','running','cancelling'].includes(job.status))throw new Error(job.result?.error??'Das hat auf dem Server nicht geklappt.');
   await new Promise(r=>setTimeout(r,1000));
  }
  throw new Error('Der Server hat noch nicht geantwortet. Schau gleich nochmal nach.');
 }
 async function approveOwn(){
  await run('submit',async()=>{
   const shared=await serverStep('submit');
   // In projects where the admin may approve alone, "Freigeben" is one step for the admin.
   if(access.selfApprove&&shared.result.commit)await api('/api/development/reviews',{id:newId(),job:shared.id,commit:shared.result.commit,decision:'approved',body:'Freigegeben.'});
  });setChange(null);
 }
 function act(next:TaskStepAction){
  const failed=detail!.lastFailure?.action??(review?.mergeWait?'integrate':undefined);
  if(next==='claim'||next==='start'||next==='edit'){if(coder)void sendToCoder();else void run('status',()=>api('/api/collaboration/task',{task:task.id,action:'claim'}));}
  else if(next==='submit'||next==='resubmit')setChange('own');
  else if(next==='look'){if(contract.kind==='code')setChange('review');else setResultForm(true);}
  else if((next==='integrate'||next==='retry'&&failed==='integrate')&&result?.workflow==='pull-request')void run('integrate',()=>api('/api/github-workflow',{action:'merge',job:result.id}));
  else if((next==='integrate'||next==='retry'&&failed==='integrate')&&result)void run('integrate',()=>serverStep('integrate',result.id));
  else if(next==='retry')void run('submit',()=>serverStep('submit'));
  else if(next==='update')void run('update',()=>serverStep('update'));
  else if(next==='finish')void run('finish',()=>api('/api/collaboration/task',{task:task.id,action:'status',status:'done'}));
  else if(next==='reopen')void run('reopen',()=>api('/api/team',{task:task.id,action:'reopen',revision:contract.revision}));
  else if(next==='live')void run('live',()=>api('/api/team',{task:task.id,action:'went-live'}));
  else if(next==='result')setResultForm(true);
  else if(next==='setup')go({info:true,task:''});
 }
 async function sendToCoder(){
  await run('message',async()=>{
   const id=newId(),sent=await api<{ask?:string|null}>('/api/room',{action:'message',id,project:room!.project.id,topicTask:task.id,body:'@'+coder!.name+' bitte übernimm diese Aufgabe.'});
   if(sent.ask&&studio.runs.configured)await api('/api/agent-runs',{project:room!.project.id,agent:sent.ask,message:id});
   await studio.reloadRuns();
  });
 }
 // Code tasks need the project's code connected first; until then that is the one next step.
 const unconnected=contract.kind==='code'&&!server&&!myCopy&&!result&&task.status!=='done';
 // The step text in the words of the company: the team changes code, people look and approve.
 const label=unconnected?'Code verbinden':step.action==='claim'||step.action==='start'||step.action==='edit'?(coder?coder.name+' beauftragen':'Übernehmen')
  :step.action==='submit'||step.action==='resubmit'?'Ansehen':step.action==='look'?'Ansehen':step.label;
const text=unconnected?`Damit ${coder?.name??'die Entwicklung'} Code ändern kann, verbindet einmal den Code des Projekts (GitHub und Server).`
  :step.action==='claim'||step.action==='start'||step.action==='edit'
  ?(contract.kind==='code'?(coder?`${coder.name} kann das machen. Oder schreib im Gespräch, wer es machen soll.`:'Noch macht niemand den Code. Stell jemanden für die Entwicklung ein oder frag Herrn Grau.')
   :'Schreib im Gespräch, wer sich darum kümmert, oder kümmere dich selbst.')
  :step.action==='submit'||step.action==='resubmit'?'Es gibt eine Änderung. Schau sie an und gib sie frei.':step.text;
 return <section className="ui-screen task">
  <Bar onBack={close} title={task.title} sub={<><span className={'ui-dot '+state.tone}/>{state.label} · {agentOnTask(studio,task.id)??(task.assignee?person:'noch niemand')}</>}
   end={<button className="ui-icon" aria-label="Mehr" onClick={()=>setMenu(m=>!m)}><More/></button>}/>
  {menu&&<div className="ui-popover" onMouseLeave={()=>setMenu(false)}>
   <button onClick={()=>{setMenu(false);setEditing(true);}}>Bearbeiten</button>
   {task.status==='done'&&<button onClick={()=>{setMenu(false);act('reopen');}}>Wieder öffnen</button>}
   {!desktop&&<button onClick={()=>go({task:'',info:true})}>Projektinfo</button>}
  </div>}
  <details className="ui-about"><summary>Worum es geht</summary>
   {task.description&&<p>{task.description}</p>}{contract.criteria&&<p><b>Fertig, wenn:</b> {contract.criteria}</p>}
   <p className="ui-muted">{contract.kind==='code'?'Code-Aufgabe':'Sonstige Aufgabe'}</p>
  </details>
  <div className={'ui-now '+state.tone}>
   <span className="ui-label">Jetzt</span>
   <p>{busy?busyText(busy):text}</p>
   {!busy&&(unconnected||step.action)&&label&&<button className="ui-btn primary" onClick={()=>unconnected?go({info:true,task:''}):act(step.action!)}>{label}</button>}
   <ErrorLine text={error}/>
  </div>
  <Chat studio={studio} place={{kind:'task',task:task.id,thread:detail.thread,onChanged:()=>void load()}} key={task.id}/>
  {change==='own'&&<ChangeView studio={studio} title="Die Änderung" load={async()=>(await serverStep('status')).result.diff??''}
   onClose={()=>setChange(null)} coder={coder?.name} task={task.id}
   approve={{label:access.selfApprove?'Freigeben':'Zur Freigabe geben',hint:access.selfApprove?'Danach übernimmst du sie mit einem Tipp.':'Jemand anderes im Team schaut sie an und gibt sie frei'+(access.reviewers?' ('+access.reviewers+').':'.'),run:approveOwn}}/>}
  {change==='review'&&review&&<ChangeView studio={studio} title={'Änderung von '+review.ownerName} task={task.id} onClose={()=>setChange(null)}
   load={async()=>{const d=await api<{diff:string;preview:string|null}>('/api/collaboration/task-diff?task='+q(task.id)+'&review='+q(review.id));return d.preview?{diff:d.diff,preview:d.preview}:d.diff;}}
   approve={{label:'Freigeben',hint:'Danach wird sie übernommen.',run:async()=>{await run('vote',()=>api('/api/development/reviews',{id:newId(),job:review.id,commit:review.commit,decision:'approved',body:'Freigegeben.'}));setChange(null);}}}
   reject={async note=>{await run('vote',()=>api('/api/development/reviews',{id:newId(),job:review.id,commit:review.commit,decision:'changes',body:note}));setChange(null);}}/>}
  {editing&&<EditTask studio={studio} detail={detail} onClose={()=>setEditing(false)} onSaved={()=>void load()}/>}
  {resultForm&&<ResultForm studio={studio} detail={detail} mine={own} onClose={()=>setResultForm(false)} onSaved={()=>void load()}/>}
 </section>;
}
const busyText=(what:string)=>({submit:'Die Änderung wird geprüft und zur Freigabe gegeben …',integrate:'Die Änderung wird übernommen …',update:'Wird auf den neuen Stand gebracht …',
 vote:'Wird gespeichert …',message:'Wird beauftragt …'} as Record<string,string>)[what]??'Einen Moment …';

/** Files and lines of a change; approve it, or send it back with a note. */
function ChangeView({studio,title,load,onClose,approve,reject,coder,task}:{studio:Studio;title:string;load:()=>Promise<string|{diff:string;preview:string}>;onClose:()=>void;task:string;
 approve:{label:string;hint:string;run:()=>Promise<void>};reject?:(note:string)=>Promise<void>;coder?:string}){
 const [diff,setDiff]=useState<string|null>(null),[preview,setPreview]=useState(''),[error,setError]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let alive=true;load().then(d=>{if(!alive)return;if(typeof d==='string')setDiff(d);else{setDiff(d.diff);setPreview(d.preview);}}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[]);// eslint-disable-line react-hooks/exhaustive-deps
 const files=useMemo(()=>splitDiff(diff??''),[diff]);
 const room=studio.room!,outside=outsideScope(diff??'',room.meta.scope,room.neighbours);
 async function back(){
  if(reject){setBusy(true);try{await reject(note.trim());}finally{setBusy(false);}return;}
  // Own change: the note goes to the colleague in the task's conversation.
  setBusy(true);setError('');
  try{const id=newId(),sent=await api<{ask?:string|null}>('/api/room',{action:'message',id,project:room.project.id,topicTask:task,body:(coder?'@'+coder+' ':'')+note.trim()});
   if(sent.ask&&studio.runs.configured)await api('/api/agent-runs',{project:room.project.id,agent:sent.ask,message:id});await studio.reload();await studio.reloadRuns();onClose();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Dialog title={title} onClose={onClose} wide>
  {diff===null&&!error&&<p className="ui-loading">Die Änderung wird geholt …</p>}
  <ErrorLine text={error}/>
  {diff!==null&&!files.length&&<p className="ui-muted">Noch keine Änderung im Code.</p>}
  {preview&&<a className="ui-btn" href={preview} target="_blank" rel="noreferrer">Vorschau öffnen</a>}
  {outside.length>0&&<p className="ui-warn">Ändert Dateien außerhalb des Bereichs dieses Projekts: {outside.map(o=>o.file+(o.owner?' ('+o.owner+')':'')).join(', ')}</p>}
  {files.map(f=><details key={f.name} className="ui-file" open={files.length<=3}><summary><b>{f.name}</b><small>+{f.added} −{f.removed}</small></summary>
   <pre>{f.lines.map((l,i)=><span key={i} className={l.startsWith('+')?'add':l.startsWith('-')?'del':l.startsWith('@@')?'hunk':''}>{l+'\n'}</span>)}</pre></details>)}
  {diff!==null&&files.length>0&&<div className="ui-decide">
   <Field label={reject?'Was soll anders werden?':'Zurück an '+(coder??'das Team')+': was soll anders werden?'}><textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} maxLength={4000}/></Field>
   <div className="ui-actions">
    <button className="ui-btn" disabled={busy||!note.trim()} onClick={()=>void back()}>{reject?'Änderungen wünschen':'Zurückgeben'}</button>
    <button className="ui-btn primary" disabled={busy} onClick={()=>{setBusy(true);void approve.run().finally(()=>setBusy(false));}}>{approve.label}</button>
   </div>
   <small className="ui-muted">{approve.hint}</small>
  </div>}
 </Dialog>;
}
function EditTask({studio,detail,onClose,onSaved}:{studio:Studio;detail:TaskDetail;onClose:()=>void;onSaved:()=>void}){
 const t=detail.task;
 const [title,setTitle]=useState(t.title),[description,setDescription]=useState(t.description),[criteria,setCriteria]=useState(t.contract.criteria),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');
  try{await api('/api/team',{action:'contract',task:t.id,revision:t.contract.revision,title:title.trim(),description,kind:t.contract.kind,criteria,requiresReview:t.contract.requiresReview,blocked:t.contract.blocked,cancelled:t.contract.cancelled});
   await studio.reload();onSaved();onClose();}
  catch(err){setError((err as Error).message);}finally{setBusy(false);}
 }
 return <Dialog title="Aufgabe bearbeiten" onClose={onClose}><form className="ui-form" onSubmit={save}>
  <Field label="Titel"><input value={title} onChange={e=>setTitle(e.target.value)} required maxLength={160}/></Field>
  <Field label="Worum es geht"><textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} maxLength={12000}/></Field>
  <Field label="Fertig, wenn …"><textarea rows={2} value={criteria} onChange={e=>setCriteria(e.target.value)} maxLength={4000}/></Field>
  <ErrorLine text={error}/>
  <div className="ui-actions"><button type="button" className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={busy||!title.trim()}>Speichern</button></div>
 </form></Dialog>;
}

/** Tasks without code: write down what came out, or approve someone else's result. */
function ResultForm({studio,detail,mine,onClose,onSaved}:{studio:Studio;detail:TaskDetail;mine:boolean;onClose:()=>void;onSaved:()=>void}){
 const t=detail.task,result=t.completion.result;
 const [body,setBody]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [id]=useState(newId);
 async function call(data:Record<string,unknown>){setBusy(true);setError('');try{await api('/api/team',{task:t.id,...data});await studio.reload();onSaved();onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const deciding=!mine&&result&&result.state!=='approved';
 return <Dialog title={deciding?'Ergebnis ansehen':'Ergebnis festhalten'} onClose={onClose}>
  {result?.body&&<blockquote className="ui-quote">{result.body}</blockquote>}
  {deciding?<>
   <Field label="Rückmeldung (optional)"><textarea rows={2} value={body} onChange={e=>setBody(e.target.value)} maxLength={4000}/></Field>
   <ErrorLine text={error}/>
   <div className="ui-actions"><button className="ui-btn" disabled={busy||!body.trim()} onClick={()=>void call({action:'vote',result:result!.id,decision:'changes',body})}>Änderungen wünschen</button>
    <button className="ui-btn primary" disabled={busy} onClick={()=>void call({action:'vote',result:result!.id,decision:'approved',body})}>Freigeben</button></div>
  </>:<>
   <Field label="Was ist herausgekommen?"><textarea rows={5} value={body} onChange={e=>setBody(e.target.value)} maxLength={12000}/></Field>
   <ErrorLine text={error}/>
   <div className="ui-actions"><button className="ui-btn" onClick={onClose}>Abbrechen</button><button className="ui-btn primary" disabled={busy||!body.trim()} onClick={()=>void call({action:'result',id,body,revision:t.contract.revision})}>Festhalten</button></div>
  </>}
 </Dialog>;
}
