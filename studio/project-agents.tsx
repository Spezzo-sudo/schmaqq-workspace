import {useCallback,useEffect,useRef,useState} from 'react';
import {Bot,Plus} from 'lucide-react';
import {initials,operationId,roomRequest,stateLabel,type TeamTask} from './room-model';

/** The project team: the people of this project and the AI agents they brought in.
 * An agent is a named team member with a role and a model. It only works when a person gives it an order,
 * and it then works with that person's own AI access. */
type Role='developer'|'reviewer'|'research';
type Effort='low'|'medium'|'high';
type Run={id:string;status:string;created:number;by:string;byName:string;task:string|null;taskTitle:string|null;output:string|null;error:string|null};
type Agent={id:string;name:string;role:Role;purpose:string;engine:'codex'|'local';model:string;effort:Effort;device:string|null;deviceName:string|null;paused:boolean;revision:number;created:number;createdBy:{kind:string;id:string;name:string};editable:boolean;runs:Run[]};
type Options={local:{device:string;name:string;model:string;online:boolean}[];codex:{device:string;name:string;online:boolean;signedIn:boolean}[]};
type State={agents:Agent[];options:Options;canCreate:boolean;limit:number};
type People={members:{id:string;name:string;owner:boolean;roles:string[]}[]};
const roleLabels:Record<Role,string>={developer:'Entwickler',reviewer:'Prüfer',research:'Recherche'};
const roleMeaning:Record<Role,string>={developer:'setzt Änderungen am Code um',reviewer:'schaut Ergebnisse kritisch an',research:'sammelt, liest und fasst zusammen'};
const effortLabels:Record<Effort,string>={low:'leicht',medium:'mittel',high:'hoch'};
const personRoles:Record<string,string>={admin:'Admin',developer:'Entwickler',reviewer:'Prüfer',viewer:'Zuschauer'};
const active=(r:Run)=>['queued','running','cancelling'].includes(r.status);
const day=(value:number)=>new Date(value).toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit',year:'numeric'});
const moment=(value:number)=>new Date(value).toLocaleString('de-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const works=(a:Agent)=>a.engine==='codex'?`Codex · ${a.model||'Standardmodell'} · ${effortLabels[a.effort]}`:`Lokales Modell · ${a.model}${a.deviceName?' auf '+a.deviceName:''}`;
type Draft={name:string;role:Role;purpose:string;engine:'codex'|'local';model:string;effort:Effort;local:string};
const emptyDraft:Draft={name:'',role:'developer',purpose:'',engine:'codex',model:'',effort:'medium',local:''};

export default function ProjectAgents({project,tasks,userId,onOpenTask}:{project:string;tasks:TeamTask[];userId:string;onOpenTask:(task:TeamTask)=>void}){
 const [state,setState]=useState<State|null>(null),[people,setPeople]=useState<People|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [form,setForm]=useState<{id:string;agent?:Agent;draft:Draft}|null>(null),[order,setOrder]=useState<{agent:string;task:string;prompt:string;id:string}|null>(null);
 const formRef=useRef<HTMLFormElement>(null);
 const load=useCallback(async()=>{try{setState(await roomRequest<State>('/api/agents?project='+encodeURIComponent(project)));}catch(e){setError((e as Error).message);}},[project]);
 useEffect(()=>{void load();roomRequest<People>('/api/project-roles?project='+encodeURIComponent(project)).then(setPeople).catch(()=>{});},[load,project]);
 const working=!!state?.agents.some(a=>a.runs.some(active));
 useEffect(()=>{if(!working)return;const timer=setInterval(()=>{if(!document.hidden)void load();},4000);return()=>clearInterval(timer);},[working,load]);
 useEffect(()=>{if(form)formRef.current?.querySelector<HTMLInputElement>('input[name=name]')?.focus();},[form?.id]);
 if(!state)return error?<p className="rw-error" role="alert">{error}</p>:<p className="rw-muted" role="status">Team wird geladen …</p>;
 const send=async(body:unknown)=>{setBusy(true);setError('');try{await roomRequest('/api/agents',body);await load();return true;}catch(e){setError((e as Error).message);return false;}finally{setBusy(false);}};
 const {options}=state,codexReady=options.codex.some(c=>c.signedIn),openTasks=tasks.filter(t=>t.status!=='done');
 const start=(agent?:Agent)=>{setError('');setOrder(null);setForm({id:agent?.id??operationId(),agent,draft:agent?{name:agent.name,role:agent.role,purpose:agent.purpose,engine:agent.engine,model:agent.engine==='codex'?agent.model:'',effort:agent.effort,local:agent.engine==='local'?agent.device+'|'+agent.model:''}:{...emptyDraft,engine:codexReady||!options.local.length?'codex':'local',local:options.local[0]?options.local[0].device+'|'+options.local[0].model:''}});};
 const change=(patch:Partial<Draft>)=>setForm(f=>f&&{...f,draft:{...f.draft,...patch}});
 async function save(e:React.FormEvent){
  e.preventDefault();if(!form)return;const d=form.draft,[device,localModel]=d.local.split('|');
  const fields={project,name:d.name,role:d.role,purpose:d.purpose,...(d.engine==='local'?{model:localModel??'',device}:{model:d.model.trim(),effort:d.effort})};
  if(await send(form.agent?{action:'update',agent:form.agent.id,revision:form.agent.revision,paused:form.agent.paused,...fields}:{action:'create',id:form.id,engine:d.engine,...fields}))setForm(null);
 }
 async function give(e:React.FormEvent){e.preventDefault();if(!order)return;if(await send({action:'run',id:order.id,agent:order.agent,project,prompt:order.prompt,...(order.task?{task:order.task}:{})}))setOrder(null);}
 const draft=form?.draft;
 return <section className="studio-agents" aria-labelledby="project-team">
  <h2 id="project-team">Projektteam</h2>
  <p className="studio-page-intro">Menschen und KI-Agenten dieses Projekts. Ein Agent arbeitet nur, wenn ihm jemand einen Auftrag gibt, und dann mit dem KI-Zugang dieser Person.</p>
  {error&&<p className="rw-error" role="alert">{error}</p>}
  <h3>Menschen</h3>
  <ul className="team-members">{(people?.members??[]).map(m=><li key={m.id}><span className="rw-avatar">{initials(m.name)}</span><span><strong>{m.name}{m.id===userId?' (du)':''}</strong><small>{m.owner?'Admin (Inhaber von Studio)':m.roles.map(r=>personRoles[r]??r).join(', ')||'Keine Rolle'}</small></span></li>)}</ul>
  <div className="studio-agents-head"><h3>Agenten</h3>{state.canCreate&&!form&&state.agents.length<state.limit&&<button className="rw-button lime" onClick={()=>start()}><Plus size={16} aria-hidden="true"/>Agent hinzufügen</button>}</div>
  {!state.agents.length&&!form&&<p className="rw-muted">Noch kein Agent im Projekt.{state.canCreate?' Hol dir einen dazu, zum Beispiel einen Entwickler oder einen Prüfer.':' Entwickler und Admins des Projekts können Agenten dazuholen.'}</p>}
  {form&&draft&&<form ref={formRef} className="team-form studio-agent-form" onSubmit={save} aria-label={form.agent?form.agent.name+' ändern':'Agent hinzufügen'}>
   <label>Name<input name="name" required maxLength={40} value={draft.name} onChange={e=>change({name:e.target.value})} placeholder="zum Beispiel Terra"/></label>
   <label>Rolle<select value={draft.role} onChange={e=>change({role:e.target.value as Role})}>{(Object.keys(roleLabels) as Role[]).map(r=><option key={r} value={r}>{roleLabels[r]} – {roleMeaning[r]}</option>)}</select></label>
   <label>Wofür ist dieser Agent da? (optional)<textarea maxLength={400} value={draft.purpose} onChange={e=>change({purpose:e.target.value})} placeholder="Ein Satz, zum Beispiel: kümmert sich um die Finder-Oberfläche."/></label>
   {!form.agent&&<fieldset className="studio-agent-engine"><legend>Womit arbeitet er?</legend>
    <label className={draft.engine==='codex'?'on':''}><input type="radio" name="engine" checked={draft.engine==='codex'} onChange={()=>change({engine:'codex'})}/><span><strong>Codex mit deinem ChatGPT</strong><small>{codexReady?'Ändert Code in deiner Arbeitskopie einer Aufgabe.':'Auf keinem deiner Rechner ist Codex gerade angemeldet. Du kannst den Agenten anlegen; arbeiten kann er, sobald Codex angemeldet ist.'}</small></span></label>
    <label className={(draft.engine==='local'?'on':'')+(options.local.length?'':' off')}><input type="radio" name="engine" disabled={!options.local.length} checked={draft.engine==='local'} onChange={()=>change({engine:'local'})}/><span><strong>Lokales Modell auf einem verbundenen PC</strong><small>{options.local.length?'Liest den Projektstand und antwortet. Ändert keinen Code.':'Für dieses Projekt ist kein lokales Modell freigegeben. Das stellst du auf dem eigenen PC ein.'}</small></span></label>
   </fieldset>}
   {draft.engine==='codex'?<>
    <label>Modell (optional)<input value={draft.model} maxLength={80} pattern="[\w.:\/\-]*" onChange={e=>change({model:e.target.value})} placeholder="leer = Standardmodell deines Codex"/><small>Der Name, wie Codex ihn kennt. Studio kann ihn nicht vorab prüfen; ein unbekannter Name scheitert beim ersten Auftrag mit einer Meldung.</small></label>
    <label>Stärke<select value={draft.effort} onChange={e=>change({effort:e.target.value as Effort})}>{(Object.keys(effortLabels) as Effort[]).map(x=><option key={x} value={x}>{effortLabels[x]}</option>)}</select></label>
   </>:<label>Modell<select required value={draft.local} onChange={e=>change({local:e.target.value})}>{options.local.map(o=><option key={o.device+o.model} value={o.device+'|'+o.model}>{o.model} auf {o.name}{o.online?'':' (gerade aus)'}</option>)}</select></label>}
   <div className="studio-agent-actions"><button className="rw-button lime" disabled={busy}>{form.agent?'Speichern':'Agent hinzufügen'}</button><button type="button" className="rw-button subtle" onClick={()=>setForm(null)}>Abbrechen</button></div>
  </form>}
  <ul className="studio-agent-list">{state.agents.map(a=>{
   const run=a.runs.find(active),ordering=order?.agent===a.id;
   return <li key={a.id} className="studio-agent">
    <div className="studio-agent-top"><span className="rw-avatar agent" aria-hidden="true"><Bot size={18}/></span>
     <span className="studio-agent-who"><strong>{a.name}</strong><small>{roleLabels[a.role]} · {works(a)}</small></span>
     <span className={'studio-agent-state'+(run?' busy':a.paused?' paused':'')} role="status">{run?(run.status==='queued'?'Wartet auf den Rechner':'Arbeitet gerade'):a.paused?'Pausiert':'Bereit'}</span></div>
    {a.purpose&&<p>{a.purpose}</p>}
    <p className="rw-muted">Ins Team geholt von {a.createdBy.name} am {day(a.created)}.</p>
    {state.canCreate&&!ordering&&<div className="studio-agent-actions">
     {!a.paused&&<button className="rw-button" disabled={busy} onClick={()=>{setError('');setForm(null);setOrder({agent:a.id,task:'',prompt:'',id:operationId()});}}>Auftrag geben</button>}
     {a.editable&&<><button className="rw-button subtle" disabled={busy} onClick={()=>start(a)}>Ändern</button>
      <button className="rw-button subtle" disabled={busy} onClick={()=>void send({action:'update',agent:a.id,project,revision:a.revision,name:a.name,role:a.role,purpose:a.purpose,model:a.model,effort:a.effort,...(a.device?{device:a.device}:{}),paused:!a.paused})}>{a.paused?'Wieder aktivieren':'Pausieren'}</button>
      <button className="rw-button subtle" disabled={busy} onClick={()=>{if(confirm(`„${a.name}“ aus dem Projektteam entfernen? Der Verlauf seiner Aufträge bleibt in den Aufgaben erhalten.`))void send({action:'remove',agent:a.id,project});}}>Entfernen</button></>}
    </div>}
    {ordering&&order&&<form className="team-form studio-agent-order" onSubmit={give} aria-label={'Auftrag an '+a.name}>
     <label>{a.engine==='codex'?'Aufgabe':'Aufgabe (optional)'}<select required={a.engine==='codex'} value={order.task} onChange={e=>setOrder({...order,task:e.target.value})}><option value="">{a.engine==='codex'?'Aufgabe wählen …':'Ohne Aufgabe – nur zum Projekt'}</option>{openTasks.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select>
      {a.engine==='codex'&&<small>{a.name} ändert Code in deiner Arbeitskopie dieser Aufgabe auf deinem eigenen Rechner. Die Arbeitskopie legst du in der Aufgabe mit „Selbst bearbeiten“ an.</small>}</label>
     <label>Was soll {a.name} tun?<textarea required maxLength={8000} value={order.prompt} onChange={e=>setOrder({...order,prompt:e.target.value})} placeholder="Beschreibe das Ergebnis, das du sehen willst."/></label>
     <div className="studio-agent-actions"><button className="rw-button lime" disabled={busy||!order.prompt.trim()}>{busy?'Wird gestartet …':'Auftrag geben'}</button><button type="button" className="rw-button subtle" onClick={()=>setOrder(null)}>Abbrechen</button></div>
    </form>}
    {a.runs.length>0&&<details className="team-secondary studio-agent-runs"><summary>Aufträge ({a.runs.length})</summary><ul>{a.runs.map(r=>{
     const task=r.task?tasks.find(t=>t.id===r.task):undefined;
     return <li key={r.id}><span><strong>{r.byName}</strong> · {moment(r.created)} · {a.engine==='codex'&&r.status==='completed'?'Fertig':stateLabel(r.status)}</span>
      {task?<button className="team-link" onClick={()=>onOpenTask(task)}>{task.title}</button>:r.taskTitle&&<span>{r.taskTitle}</span>}
      {r.error&&<p className="rw-error">{r.error}</p>}
      {r.output&&<details><summary>Antwort ansehen</summary><pre className="studio-agent-output">{r.output}</pre></details>}
      {!r.output&&!r.error&&r.status==='completed'&&r.by!==userId&&<small className="rw-muted">Die Antwort sieht {r.byName}.</small>}
     </li>;})}</ul></details>}
   </li>;})}</ul>
 </section>;
}
