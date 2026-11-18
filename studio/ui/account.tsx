import {useCallback,useEffect,useState} from 'react';
import type {Studio} from './app';
import {api,q,signOut,type AccountArea} from './api';
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
   <Section title="Chat und Recherche">
    <p className="ui-fact"><span className={'ui-dot '+(agentsReady===false?'fail':agentsReady?'ok':'idle')}/>{agentsReady===false?'Gerade nicht erreichbar.':agentsReady?'Bereit.':'Noch nicht eingerichtet.'}</p>
    <p className="ui-muted">Fragst du einen Agenten, arbeitet er mit deinem Zugang. Andere im Team nutzen ihren eigenen.</p>
   </Section>
   <CodeSignIn studio={studio}/>
  </>}
  {area==='verwaltung'&&owner&&<TeamAccess studio={studio}/>}
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

export const projectVisibility='Du siehst Chat, Aufgaben mit Gesprächen, Wissen und Team in deinen Projekten, während andere Projekte und fremde private Chats mit Menschen oder Agenten verborgen bleiben.';

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
 return <section className="ui-screen page">
  <Bar onBack={back(studio)} title="So funktioniert Studio"/>
  <ol className="ui-guide">{steps.map(([t,d],i)=><li key={t}><span className="ui-step">{i+1}</span><div><b>{t}</b><p>{d}</p></div></li>)}</ol>
  <Section title="Agenten holen">
   <p><b>@Name</b> im Chat: genau dieser Agent antwortet. Ohne @Name schweigen alle.</p>
   <p><b>Markieren</b>: lange auf eine Nachricht drücken (oder den Stift neben dem Eingabefeld), weitere antippen, einen Agenten wählen und sagen, was er damit tun soll. Er liest nur diese.</p>
   <p><b>Privat</b>: oben auf ein Bild tippen öffnet den Einzelchat. Was dort zur Aufgabe wird, erscheint als Karte im Projekt.</p>
  </Section>
  <Section title="Das Team">
   <p>Jeder Agent hat einen Job: Entwicklung ändert Code, Recherche sucht im Internet, Prüfung prüft Änderungen. Herr Grau leitet und stellt ein. Höchstens sechs im Team, pro Job einer.</p>
   <p>Über die Projektinfo kannst du Menschen dazunehmen oder für das Projekt einladen, wenn du es leitest.</p>
   <p>{projectVisibility}</p>
  </Section>
  <Section title="Grenzen und Kosten">
   <p>Agenten geben Arbeit höchstens eine Stufe weiter und antworten pro Auftrag höchstens sechsmal, dann fragt Studio „Weitermachen?“. Stopp geht jederzeit.</p>
   <p>Wer einen Agenten fragt, zahlt mit dem eigenen KI-Zugang, auch für weitergegebene Schritte.</p>
  </Section>
  <Section title="Damit das Team Code ändern kann">
   <p>Einmal pro Projekt beantwortest du in der Projektinfo unter „Code“ die Frage „Wo liegt euer Code?“. Den Rest richtet Studio selbst ein. Das erste Mal, wenn Otto für dich programmieren soll, verbindest du dein ChatGPT, direkt in der Aufgabe.</p>
  </Section>
  <ScrollHint/>
 </section>;
}
