import {useCallback,useEffect,useState} from 'react';
import type {Studio} from './app';
import {api,q,signOut,type AccountArea,type CatalogModel} from './api';
import {Face,photoOf} from './avatar';
import {Bar,Checklist,ErrorLine,Field,ScrollHint,Section} from './parts';

const back=(studio:Studio)=>()=>studio.go({page:'start',project:''});

const accountLabels:Record<AccountArea,string>={profil:'Profil',sicherheit:'Sicherheit',ki:'KI-Zugänge',daten:'Deine Daten',verwaltung:'Studio verwalten'};

export function AccountScreen({studio}:{studio:Studio}){
 const {me,agentsReady,members,go,route}=studio;
 const person=members.find(m=>m.id===me.id),owner=person?.role==='owner';
 const area=route.account==='verwaltung'&&!owner?undefined:route.account;
 const photo=photoOf(person);
 const closeArea=()=>history.state?.accountOverview?history.back():go({page:'account'},true);
 return <section className="ui-screen page account" key={area??'overview'}>
  <Bar onBack={area?closeArea:back(studio)} title={area?accountLabels[area]:'Mein Konto'}/>
  {!area&&<>
   <div className="ui-info-head"><Face name={me.name} photo={photo} size={64}/><h2>{me.name}</h2><p className="ui-muted">{me.email}</p></div>
   <nav className="ui-account-nav" aria-label="Mein Konto">{Object.entries(accountLabels).filter(([key])=>key!=='verwaltung'||owner).map(([key,label])=>
    <button className="ui-row" key={key} onClick={()=>go({page:'account',account:key as AccountArea})}><b>{label}</b><span aria-hidden="true">›</span></button>)}</nav>
  </>}
  {area==='profil'&&<Profile studio={studio} photo={photo}/>}
  {area==='sicherheit'&&<><Password/><Section title="Anmeldung"><p>{me.email}</p><button className="ui-btn" onClick={()=>void signOut()}>Abmelden</button></Section></>}
  {area==='ki'&&<>
   <ChatSignIn studio={studio}/>
   <CodeSignIn studio={studio}/>
  </>}
  {area==='verwaltung'&&owner&&<><TeamAccess studio={studio}/><ModelCatalogAdmin studio={studio}/></>}
  {area==='daten'&&<Section title="Datenauszug"><p className="ui-muted">Deine sichtbaren Projekte, Aufgaben und Dokumente sowie bis zu 500 Nachrichten.</p><button className="ui-btn" onClick={()=>void download()}>Datenauszug herunterladen</button></Section>}
  <ScrollHint/>
 </section>;
}

async function portrait(file:File){
 if(file.size>12*1024*1024)throw new Error('Wähle ein Foto bis 12 MB.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Wähle ein Foto im Format JPG, PNG oder WebP.');
 const photo=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Das Foto konnte nicht vorbereitet werden.');
  const side=Math.min(photo.width,photo.height);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);
  ctx.drawImage(photo,(photo.width-side)/2,(photo.height-side)/2,side,side,0,0,256,256);
  return canvas.toDataURL('image/jpeg',.85);
 }finally{photo.close();}
}

function Profile({studio,photo}:{studio:Studio;photo?:string}){
 const [preview,setPreview]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 async function select(file:File){
  setBusy(true);setError('');setPreview('');setNotice('');
  try{setPreview(await portrait(file));}catch(e){setError(e instanceof Error?e.message:'Das Foto konnte nicht geöffnet werden.');}finally{setBusy(false);}
 }
 async function save(jpeg:string|null){
  setBusy(true);setError('');setNotice('');
  try{await api('/api/auth/photo',{jpeg});setPreview('');await studio.reload();setNotice(jpeg?'Foto gespeichert.':'Foto entfernt.');}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Section title="Profilfoto">
  <div className="ui-profile-card"><Face name={studio.me.name} photo={preview||photo} size={88}/><div><h2>{studio.me.name}</h2><p className="ui-muted">{studio.me.email}</p></div></div>
  <p className="ui-muted">Dein Projektteam sieht das Foto im Chat und im Team.</p>
  <div className="ui-actions left">
   <label className="ui-btn ui-photo-picker">Foto auswählen<input type="file" aria-label="Foto auswählen" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{
    const file=e.target.files?.[0];e.target.value='';if(file)void select(file);
   }}/></label>
   {preview&&<button className="ui-btn primary" disabled={busy} onClick={()=>void save(preview.slice(preview.indexOf(',')+1))}>Foto speichern</button>}
   {photo&&!preview&&<button className="ui-btn danger" disabled={busy} onClick={()=>void save(null)}>Foto entfernen</button>}
  </div>
  {notice&&<p role="status">{notice}</p>}<ErrorLine text={error}/>
 </Section>;
}
async function download(){
 const r=await fetch('/api/workspace',{cache:'no-store'});if(!r.ok)return;
 const url=URL.createObjectURL(new Blob([JSON.stringify(await r.json(),null,2)],{type:'application/json'})),a=document.createElement('a');
 a.href=url;a.download='schmaqq-studio-'+new Date().toISOString().slice(0,10)+'.json';a.click();URL.revokeObjectURL(url);
}

type SignIn={connected:boolean;checked:number|null;error:string|null;places:{name:string}[];
 pending:{job:string;mode:'login'|'status'|'logout'|null;status:string;login:{url:string;code:string}|null}|null};
type ChatConnection={state:'none'|'requested'|'code'|'connected'|'failed'|'unavailable';free?:boolean;online?:boolean;url?:string;code?:string;error?:string};
/** Once per person, for all agents: lets the agents answer you (chat and research) with your own ChatGPT. */
function ChatSignIn({studio}:{studio:Studio}){
 const [state,setState]=useState<ChatConnection|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 const load=useCallback(async()=>{try{setState(await api<ChatConnection>('/api/chat-connection'));setError('');}catch(e){setError((e as Error).message);}},[]);
 useEffect(()=>{let alive=true;api<ChatConnection>('/api/chat-connection').then(s=>{if(alive)setState(s);}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[]);
 const waiting=state?.state==='requested'||state?.state==='code';
 useEffect(()=>{if(!waiting)return;const t=setInterval(()=>void load(),2500);return()=>clearInterval(t);},[waiting,load]);
 useEffect(()=>{if(state?.state==='connected')void studio.reloadRuns();},[state?.state]);// eslint-disable-line react-hooks/exhaustive-deps
 async function start(){setBusy(true);setError('');try{setState(await api<ChatConnection>('/api/chat-connection',{action:'start'}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Section title="Gespräche und Recherche">
  <p className="ui-muted">Damit die Agenten dir antworten, verbinde einmal dein ChatGPT. Gilt für alle Agenten und alle deine Projekte. Nur du nutzt diese Anmeldung.</p>
  {state?.state==='unavailable'&&<p className="ui-muted">Agenten sind auf diesem Studio noch nicht eingerichtet.</p>}
  {state?.state==='connected'&&<p className="ui-fact"><span className={'ui-dot '+(state.online===false?'fail':'ok')}/>{state.online===false?'Verbunden, der Dienst ist gerade nicht erreichbar.':'Verbunden.'}</p>}
  {state?.state==='none'&&(state.free?<button className="ui-btn primary" disabled={busy} onClick={()=>void start()}>Mit ChatGPT verbinden</button>:<p className="ui-muted">Im Moment sind alle Plätze vergeben. Bitte frag den Inhaber von Studio.</p>)}
  {state?.state==='requested'&&<p className="ui-muted" role="status">Wird vorbereitet …</p>}
  {state?.state==='code'&&state.url&&state.code&&<ol className="ui-checklist plain">
   <li><span className="ui-step">1</span><div><a className="ui-btn primary" href={state.url} target="_blank" rel="noreferrer noopener">ChatGPT-Anmeldung öffnen</a></div></li>
   <li><span className="ui-step">2</span><div>Mit deinem ChatGPT anmelden und diesen Code eingeben: <code className="ui-code">{state.code}</code> <button className="ui-link" onClick={()=>void navigator.clipboard?.writeText(state.code!).then(()=>setCopied(true))}>{copied?'Kopiert':'Kopieren'}</button></div></li>
   <li><span className="ui-step">3</span><div>Zurückkommen. Hier steht dann „Verbunden“. Der Code gilt 15 Minuten.</div></li>
  </ol>}
  {state?.state==='failed'&&<><ErrorLine text={state.error??'Die Anmeldung hat nicht geklappt.'}/><button className="ui-btn primary" disabled={busy} onClick={()=>void start()}>Nochmal</button></>}
  <ErrorLine text={error}/>
 </Section>;
}

/** Once per person, for all agents: lets the team change code on the server with your ChatGPT. */
export function CodeSignIn({studio,compact=false,who}:{studio:Studio;compact?:boolean;who?:string}){
 const [state,setState]=useState<SignIn|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState(false);
 const load=useCallback(async()=>{try{setState(await api<SignIn>('/api/codex-account'));setError('');}catch(e){setError((e as Error).message);}},[]);
 useEffect(()=>{let alive=true;api<SignIn>('/api/codex-account').then(s=>{if(alive)setState(s);}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[]);
 useEffect(()=>{if(!state?.pending)return;const t=setInterval(()=>void load(),3000);return()=>clearInterval(t);},[state?.pending,load]);
 async function act(action:'connect'|'check'|'disconnect'){
  if(action==='disconnect'&&!confirm('ChatGPT fürs Programmieren trennen? Das Team kann dann für dich keinen Code mehr ändern, bis du neu verbindest.'))return;
  setBusy(true);setError('');try{await api('/api/codex-account',{action});await load();await studio.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 if(compact&&state?.connected)return null;
 const login=state?.pending?.login;
 const body=<>
  {!compact&&<p className="ui-muted">Einmal verbinden, dann kann jeder Agent in der Entwicklung für dich Code ändern. Gilt für alle Agenten und Projekte. Nur du nutzt diese Anmeldung.</p>}
  {compact&&<p className="ui-muted">Damit {who??'das Team'} für dich programmieren kann, verbinde einmal dein ChatGPT. Gilt danach für alle Agenten.</p>}
  {state&&!state.places.length&&<p className="ui-muted">Geht, sobald ein Projekt seinen Code hat.</p>}
  {state&&state.places.length>0&&!state.pending&&(state.connected
   ?<><p className="ui-fact"><span className="ui-dot ok"/>Verbunden.</p><div className="ui-actions left"><button className="ui-btn" disabled={busy} onClick={()=>void act('check')}>Prüfen</button><button className="ui-btn" disabled={busy} onClick={()=>void act('disconnect')}>Trennen</button></div></>
   :<button className="ui-btn primary" disabled={busy} onClick={()=>void act('connect')}>Mit ChatGPT verbinden</button>)}
  {state?.pending&&(state.pending.mode==='login'&&login?<ol className="ui-checklist plain">
   <li><span className="ui-step">1</span><div><a className="ui-btn primary" href={login.url} target="_blank" rel="noreferrer noopener">ChatGPT-Anmeldung öffnen</a></div></li>
   <li><span className="ui-step">2</span><div>Mit deinem ChatGPT anmelden und diesen Code eingeben: <code className="ui-code">{login.code}</code> <button className="ui-link" onClick={()=>void navigator.clipboard?.writeText(login.code).then(()=>setCopied(true))}>{copied?'Kopiert':'Kopieren'}</button></div></li>
   <li><span className="ui-step">3</span><div>Zurückkommen. Hier steht dann „Verbunden“.</div></li>
  </ol>:<p className="ui-muted" role="status">{state.pending.mode==='logout'?'Wird getrennt …':'Wird vorbereitet …'}</p>)}
  {state?.error&&!state.pending&&<ErrorLine text={state.error}/>}<ErrorLine text={error}/>
 </>;
 return compact?<div className="ui-signin">{body}</div>:<Section title="ChatGPT fürs Programmieren">{body}</Section>;
}

export type Invite={id:string;email:string;expires:number;projects:string[];projectCount:number};
type Suggestion={id:string;email:string;by:string};

export const projectVisibility='Du siehst Chat, Aufgaben mit Gesprächen, Wissen und Team in deinen Projekten. Andere Projekte bleiben verborgen, fremde private Chats auch, solange sie nicht fürs Team sichtbar gemacht wurden.';

export function InviteLink({link}:{link:string}){
 const [copied,setCopied]=useState(false);
 const [error,setError]=useState('');
 return <div className="ui-note">
  <p>Schick den Link direkt an die Person. Er gilt 24 Stunden und nur einmal.</p>
  <div className="ui-inline"><input aria-label="Einladungslink" readOnly value={link} onFocus={e=>e.target.select()}/>
   <button className="ui-link" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);setError('');}catch{setError('Markiere den Link und kopiere ihn von Hand.');}}}>{copied?'Kopiert':'Kopieren'}</button></div>
  <ErrorLine text={error}/>
 </div>;
}

export function InviteRows({invites,busy,onWithdraw,showProjects=false}:{invites:Invite[];busy:boolean;onWithdraw:(id:string)=>void;showProjects?:boolean}){
 return <>{invites.map(i=><div key={i.id} className="ui-row static"><span className="ui-row-text"><b>{i.email}</b>
  {showProjects&&<small>{i.projectCount?i.projects.join(', ')||'Projekteinladung':'Nur Studio'}</small>}
  <small>Einladung offen bis {new Date(i.expires).toLocaleString('de-CH',{weekday:'short',hour:'2-digit',minute:'2-digit'})}</small></span>
  <button className="ui-link" disabled={busy} onClick={()=>onWithdraw(i.id)}>Zurücknehmen</button>
 </div>)}</>;
}

function TeamAccess({studio}:{studio:Studio}){
 const {members,me}=studio;
 const [invites,setInvites]=useState<Invite[]>([]),[suggestions,setSuggestions]=useState<Suggestion[]>([]),[available,setAvailable]=useState<{id:string;name:string}[]>([]);
 const [link,setLink]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [email,setEmail]=useState(''),[projects,setProjects]=useState<string[]>([]),[suggestion,setSuggestion]=useState('');
 const load=useCallback(async()=>{
  const d=await api<{invites:Invite[];requests:Suggestion[];projects:{id:string;name:string}[]}>('/api/invites');
  setInvites(d.invites);setSuggestions(d.requests);setAvailable(d.projects);
 },[]);
 useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
 async function act(fn:()=>Promise<void>){setBusy(true);setError('');setNotice('');try{await fn();await load();await studio.reload();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 function invite(e:React.FormEvent){
  e.preventDefault();
  void act(async()=>{
   const d=suggestion
    ?await api<{link:string}>('/api/invites/decide',{id:suggestion,approve:true,projects})
    :await api<{link:string}>('/api/invites',{email:email.trim(),projects});
   setLink(d.link);setEmail('');setProjects([]);setSuggestion('');
  });
 }
 return <Section title="Team" id="invite">
  {members.filter(m=>!m.removed).map(m=><div key={m.id} className="ui-row static"><Face name={m.name} photo={photoOf(m)} size={32}/><span className="ui-row-text"><b>{m.name}{m.id===me.id?' (du)':''}</b><small>{m.role==='owner'?'Inhaber':'Mitglied'}</small></span>
   {m.id!==me.id&&<span className="ui-row-end">
    {m.role!=='owner'&&<button className="ui-link danger" disabled={busy} onClick={()=>{if(confirm(m.name+' aus dem Studio entfernen? Nachrichten und Aufgaben bleiben.'))void act(async()=>{await api('/api/members/remove',{member:m.id});setNotice(m.name+' wurde entfernt.');});}}>Entfernen</button>}
   </span>}
  </div>)}
  {suggestions.map(p=><div key={p.id} className="ui-row static"><span className="ui-row-text"><b>{p.email}</b><small>vorgeschlagen von {p.by}</small></span><span className="ui-row-end">
   <button className="ui-link" disabled={busy} onClick={()=>{setSuggestion(p.id);setEmail(p.email);}}>Auswählen</button>
   <button className="ui-link" disabled={busy} onClick={()=>void act(async()=>{await api('/api/invites/decide',{id:p.id,approve:false});if(suggestion===p.id){setSuggestion('');setEmail('');}})}>Ablehnen</button></span></div>)}
  <form className="ui-form" onSubmit={invite}>
   <Field label="E-Mail"><input type="email" value={email} onChange={e=>{setEmail(e.target.value);setSuggestion('');}} autoCapitalize="none" required/></Field>
   <Checklist title="Für welche Projekte?" items={available} selected={projects} onChange={setProjects}/>
   <small className="ui-muted">Ohne Projektauswahl kann die Person eigene Projekte anlegen.</small>
   <div className="ui-actions left"><button className="ui-btn primary" disabled={busy||!email.trim()}>Einladen</button></div>
  </form>
  {link&&<InviteLink key={link} link={link}/>}
  <InviteRows invites={invites} busy={busy} showProjects onWithdraw={id=>void act(async()=>{await api('/api/invites/withdraw',{id});setLink('');})}/>
  {notice&&<p className="ui-muted" role="status">{notice}</p>}<ErrorLine text={error}/>
 </Section>;
}

function Password(){
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(''),[busy,setBusy]=useState(false);
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget),form=e.currentTarget;
  if(f.get('password')!==f.get('repeat')){setError('Die beiden neuen Passwörter sind nicht gleich.');return;}
  setBusy(true);setError('');try{await api('/api/auth/password',{current:f.get('current'),password:f.get('password')});form.reset();setOpen(false);setDone('Neues Passwort gespeichert. Andere Anmeldungen sind beendet.');}
  catch(err){setError((err as Error).message);}finally{setBusy(false);}
 }
 return <Section title="Passwort">
  {done&&<p className="ui-muted" role="status">{done}</p>}
  {!open?<button className="ui-btn" onClick={()=>setOpen(true)}>Passwort ändern</button>:<form className="ui-form" onSubmit={save}>
   <Field label="Bisheriges Passwort"><input name="current" type="password" autoComplete="current-password" required/></Field>
   <Field label="Neues Passwort" hint="Mindestens 12 Zeichen."><input name="password" type="password" autoComplete="new-password" minLength={12} required/></Field>
   <Field label="Neues Passwort wiederholen"><input name="repeat" type="password" autoComplete="new-password" minLength={12} required/></Field>
   <ErrorLine text={error}/><div className="ui-actions"><button type="button" className="ui-btn" onClick={()=>setOpen(false)}>Abbrechen</button><button className="ui-btn primary" disabled={busy}>Speichern</button></div>
  </form>}
 </Section>;
}

/** Projects and archive: active ones, and archived ones to bring back. */
export function ArchiveScreen({studio}:{studio:Studio}){
 const [archived,setArchived]=useState<{id:string;title:string}[]>([]),[error,setError]=useState('');
 const load=useCallback(()=>api<{rooms:{id:string;title:string}[]}>('/api/rooms?archived=1').then(r=>setArchived(r.rooms)).catch(e=>setError((e as Error).message)),[]);
 useEffect(()=>{let alive=true;api<{rooms:{id:string;title:string}[]}>('/api/rooms?archived=1').then(r=>{if(alive)setArchived(r.rooms);}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[]);
 async function restore(p:{id:string}){
  try{const r=await api<{project:{title:string;description:string};meta:{revision:number;base?:string;workflow?:string}}>('/api/room?project='+q(p.id));
   await api('/api/team',{action:'project',project:p.id,revision:r.meta.revision,title:r.project.title,description:r.project.description,archived:false,base:r.meta.base??'main',workflow:r.meta.workflow??'pull-request'});
   await load();await studio.reload();}catch(e){setError((e as Error).message);}
 }
 return <section className="ui-screen page">
  <Bar onBack={back(studio)} title="Projekte und Archiv"/>
  <Section title="Aktiv">{studio.projects.map(p=><button key={p.id} className="ui-row" onClick={()=>studio.go({page:'project',project:p.id})}><span className="ui-row-text"><b>{p.title}</b><small>{p.description}</small></span></button>)}</Section>
  <Section title="Archiviert">{!archived.length&&<p className="ui-muted">Nichts archiviert.</p>}
   {archived.map(p=><div key={p.id} className="ui-row static"><span className="ui-row-text"><b>{p.title}</b></span><button className="ui-link" onClick={()=>void restore(p)}>Wiederherstellen</button></div>)}</Section>
  <ErrorLine text={error}/>
 </section>;
}

/** So funktioniert Studio. Same content as docs/ANLEITUNG.md – change both together. */
export function GuideScreen({studio}:{studio:Studio}){
 const steps:[string,string][]=[
  ['Ziel sagen','Leg ein Projekt an und schreib Herrn Grau, eurer Projektleitung, was ihr erreichen wollt.'],
  ['Herr Grau plant','Er schlägt einen Plan mit wenigen Aufgaben vor und sagt, wer sie macht. Fehlt jemand, schlägt er vor, wen ihr einstellt. Du nimmst an oder lehnst ab.'],
  ['Das Team arbeitet','Jede Aufgabe hat ihr Gespräch. Dort siehst du, wer gerade was macht: Otto ändert den Code, Eule sucht im Internet, Frau Kern prüft.'],
  ['Du gibst frei','Ist eine Änderung fertig, tippst du „Ansehen“, schaust sie an und gibst frei oder gibst sie mit einem Satz zurück. Danach „Übernehmen“. Beim ersten Mal fragt Studio, wie eine Änderung online kommt.']
 ];
 const owner=studio.members.find(m=>m.id===studio.me.id)?.role==='owner';
 const to=(label:string,next:Parameters<Studio['go']>[0])=><button className="ui-link" onClick={()=>studio.go(next)}>{label} ›</button>;
 return <section className="ui-screen page">
  <Bar onBack={back(studio)} title="So funktioniert Studio"/>
  <ol className="ui-guide">{steps.map(([t,d],i)=><li key={t}><span className="ui-step">{i+1}</span><div><b>{t}</b><p>{d}</p></div></li>)}</ol>
  <Section title="Agenten holen">
   <p><b>@Name</b> im Chat: genau dieser Agent antwortet. Ohne @Name schweigen alle.</p>
   <p><b>Markieren</b>: lange auf eine Nachricht drücken (oder den Stift neben dem Eingabefeld), weitere antippen, einen Agenten wählen und sagen, was er damit tun soll. Er liest nur diese.</p>
   <p><b>Antworten</b>: unter jeder Nachricht eines Agenten steht „Antworten“. Dann antwortet dieser Agent, auch ohne @Name.</p>
   <p><b>Privat</b>: unter „Gespräche“ (am Computer links) oder oben auf ein Bild tippen öffnet den Einzelchat. Was dort zur Aufgabe wird, erscheint als Karte im Projekt.</p>
   <p><b>Fürs Team sichtbar</b>: oben im Einzelchat kannst du ihn fürs Team sichtbar machen. Dann können alle im Projekt mitlesen, schreiben können nur ihr. Ein Chat zwischen zwei Menschen wird erst sichtbar, wenn beide zustimmen. „Wieder privat“ macht ihn wieder privat.</p>
  </Section>
  <Section title="Das Team">
   <p>Jeder Agent hat einen Job: Entwicklung ändert Code, Recherche sucht im Internet, Prüfung prüft Änderungen. Herr Grau leitet und stellt ein. Höchstens sechs im Team, pro Job einer.</p>
   <p>Über „Team erweitern“ im Projekt stellst du einen Agenten ein (Job wählen, Name ist vorgeschlagen) oder lädst Personen ein, wenn du das Projekt leitest. Du kannst auch Herrn Grau fragen, wen ihr braucht.</p>
   <p>{projectVisibility}</p>
  </Section>
  <Section title="Agenten einstellen">
   <p>Jeder Agent lässt sich einzeln einstellen: Bild lange drücken oder im Einzelchat auf Bild und Namen tippen. Dort änderst du Name, Bild und Persönlichkeit. Unter „Erweitert“ wählst du das KI-Modell und die Denkstufe, getrennt für das Gespräch und, bei Agenten die Code ändern, für das Programmieren. „Standard“ lässt es offen. Stärkere Modelle und höhere Stufen denken gründlicher, kosten aber mehr von deinem Kontingent.</p>
   <p>Die Liste der Modelle pflegt der Inhaber von Studio. Neue Modelle trägt er dort ein, ohne dass Studio ein Update braucht.</p>
   {owner&&to('KI-Modelle verwalten',{page:'account',account:'verwaltung'})}
  </Section>
  <Section title="Grenzen und Kosten">
   <p>Agenten geben Arbeit höchstens eine Stufe weiter und antworten pro Auftrag höchstens sechsmal, dann fragt Studio „Weitermachen?“. Stopp geht jederzeit.</p>
   <p>Wer einen Agenten fragt, zahlt mit dem eigenen KI-Zugang, auch für weitergegebene Schritte. Hat die Entwicklung gearbeitet, steht an der Aufgabe eine Zeile Verbrauch.</p>
  </Section>
  <Section title="Dein ChatGPT verbinden">
   <p><b>Du musst das nur ein einziges Mal tun.</b> Nicht pro Agent und nicht pro Projekt.</p>
   <p><b>Zwei Anmeldungen, beide machst du selbst, jede nur einmal:</b></p>
   <p><b>1. Gespräche und Recherche</b>, damit dir die Agenten antworten. Unter „KI-Zugänge“ bei „Gespräche und Recherche“ auf „Mit ChatGPT verbinden“ tippen, die Seite öffnen, den Code eintippen.</p>
   <p><b>2. Code ändern</b>, damit zum Beispiel Otto für dich programmiert. Im Abschnitt darunter genauso.</p>
   <p>Warum zwei? Gespräche und Code laufen auf getrennten Wegen, und jeder Weg braucht seine Anmeldung. Es ist dasselbe ChatGPT-Konto mit demselben Limit.</p>
   <p><b>Neues Projekt, neuer Otto, neuer Agent:</b> du verbindest nichts neu.</p>
   <p><b>Jede Person verbindet ihr eigenes ChatGPT.</b> Wer einen Agenten beauftragt, verbraucht das eigene Limit.</p>
   {to('Zu „KI-Zugänge“',{page:'account',account:'ki'})}
  </Section>
  <Section title="Damit das Team Code ändern kann">
   <p>Öffne einmal pro Projekt in der Projektinfo unter „Code“ den Bereich „GitHub einrichten“. Füge den Link zu deinem Projekt auf GitHub ein und tippe auf „Verbinden“. Studio richtet den Rest ein. Das erste Mal, wenn Otto für dich programmieren soll, verbindest du dein ChatGPT, direkt in der Aufgabe oder unter „KI-Zugänge“.</p>
   <p>Das Projekt öffnest du über die Startseite, dort findest du „Projektinfo“ oben rechts im Projekt.</p>
   {to('Zu deinen Projekten',{page:'start',project:''})}
  </Section>
  <ScrollHint/>
 </section>;
}

/** The model list agents choose from. The owner keeps it: a new model is entered here, no update of Studio needed. */
function ModelCatalogAdmin({studio}:{studio:Studio}){
 const [list,setList]=useState<CatalogModel[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [id,setId]=useState(''),[label,setLabel]=useState(''),[efforts,setEfforts]=useState('low, medium, high');
 useEffect(()=>{let alive=true;api<{catalog:CatalogModel[]}>('/api/model-catalog').then(r=>{if(alive)setList(r.catalog);}).catch(e=>{if(alive)setError((e as Error).message);});return()=>{alive=false;};},[]);
 async function save(next:CatalogModel[]){
  setBusy(true);setError('');
  try{const r=await api<{catalog:CatalogModel[]}>('/api/model-catalog',{catalog:next});setList(r.catalog);await studio.reloadRuns();}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 function add(e:React.FormEvent){
  e.preventDefault();if(list.some(m=>m.id===id.trim())){setError('Dieses Modell steht schon in der Liste.');return;}
  const levels=efforts.split(/[ ,]+/).map(v=>v.trim().toLowerCase()).filter(Boolean);
  void save([...list,{id:id.trim(),label:label.trim()||id.trim(),efforts:levels,defaultEffort:levels[0]??null,context:null,note:'',enabled:true}]).then(()=>{setId('');setLabel('');});
 }
 return <Section title="KI-Modelle">
  <p className="ui-muted">Diese Liste bieten die Agentenprofile an. Neue Modelle trägst du hier ein; ausgeschaltete verschwinden aus der Auswahl, bestehende Agenten behalten ihre Wahl.</p>
  {list.map(m=><div key={m.id} className="ui-row static"><span className="ui-row-text"><b>{m.label}</b><small>{m.id} · {m.efforts.join(', ')||'keine Stufen'}</small></span>
   <button className="ui-link" disabled={busy||list.length<2&&m.enabled} onClick={()=>void save(list.map(x=>x.id===m.id?{...x,enabled:!x.enabled}:x))}>{m.enabled?'Ausschalten':'Einschalten'}</button>
   <button className="ui-link" disabled={busy||list.length<2} onClick={()=>{if(confirm(m.label+' aus der Liste nehmen?'))void save(list.filter(x=>x.id!==m.id));}}>Entfernen</button></div>)}
  <form className="ui-form" onSubmit={add}>
   <Field label="Neues Modell" hint="Name genau so, wie ihn der Anbieter nennt."><input value={id} onChange={e=>setId(e.target.value)} required maxLength={100} pattern="[A-Za-z0-9][A-Za-z0-9_.:/\\-]*"/></Field>
   <Field label="Anzeigename (freiwillig)"><input value={label} onChange={e=>setLabel(e.target.value)} maxLength={80}/></Field>
   <Field label="Denkstufen" hint="Durch Komma getrennt, zum Beispiel low, medium, high."><input value={efforts} onChange={e=>setEfforts(e.target.value)} maxLength={120}/></Field>
   <ErrorLine text={error}/>
   <div className="ui-actions"><button className="ui-btn primary" disabled={busy||!id.trim()}>Hinzufügen</button></div>
  </form>
 </Section>;
}
