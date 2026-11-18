import {useEffect,useState} from 'react';
import {resumeURL,routeURL} from './api';
import {ErrorLine,Field} from './parts';

// Signing in, accepting an invitation, setting up Studio, and a forgotten password. Nothing else.

/** A reset token travels in the URL fragment (never sent to a server or a Referer); it is removed at once. */
export function readResetToken():string{
 const hash=location.hash;if(!hash.startsWith('#reset='))return '';
 const token=new URLSearchParams(hash.slice(1)).get('reset')??'';
 history.replaceState(null,'',location.pathname+location.search);
 return /^[a-zA-Z0-9_-]{43}$/.test(token)?token:'';
}

export function Login({resetToken}:{resetToken:string}){
 const p=new URLSearchParams(location.search),invite=p.get('invite'),setup=p.get('setup'),joining=!!(invite||setup);
 const [mode,setMode]=useState<'login'|'forgot'|'reset'>(resetToken?'reset':'login');
 const [busy,setBusy]=useState(false),[error,setError]=useState(p.has('auth_error')?'Die Anmeldung über den Anbieter hat nicht geklappt. Bitte nochmal.':''),[show,setShow]=useState(false),[info,setInfo]=useState('');
 const [chatgpt,setChatgpt]=useState(false);
 useEffect(()=>{fetch('/api/auth/providers').then(r=>r.ok?r.json() as Promise<{providers:{id:string;enabled:boolean}[]}>:{providers:[]}).then(d=>setChatgpt(d.providers.some(x=>x.id==='chatgpt'&&x.enabled))).catch(()=>{});},[]);
 async function post(path:string,body:unknown){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({})) as {error?:string;message?:string;url?:string;project?:string};if(!r.ok)throw new Error(d.error??'Das hat nicht geklappt.');return d;}
 async function run(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError((e as Error).message);setBusy(false);}}
 function signIn(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const f=new FormData(e.currentTarget);
  void run(async()=>{
   const data=setup?{setup,email:f.get('email'),name:f.get('name'),password:f.get('password')}:invite?{invite,name:f.get('name'),password:f.get('password')}:{email:f.get('email'),password:f.get('password')};
   const joined=await post('/api/auth/'+(setup?'bootstrap':invite?'register':'login'),data);
   location.replace(joining?routeURL({project:joined.project}):resumeURL(location.search));
  });
 }
 return <main className="ui-login">
  <div className="ui-login-card">
   <span className="ui-brand">SCHMAQQ<b>STUDIO</b></span>
   {mode==='login'&&<>
    <h1>{setup?'Studio einrichten':invite?'Willkommen im Team':'Anmelden'}</h1>
    <p className="ui-muted">{invite?'Leg dein Konto an. Deine eingeladenen Projekte sind danach sofort für dich da.':'Eure Projekte, euer Team aus Menschen und Agenten.'}</p>
    <form className="ui-form" onSubmit={signIn}>
     {joining&&<Field label="Dein Name"><input name="name" required maxLength={160} autoComplete="name"/></Field>}
     {(!invite||setup)&&<Field label={setup?'E-Mail':'Benutzername oder E-Mail'}><input name="email" type={setup?'email':'text'} autoCapitalize="none" autoCorrect="off" spellCheck={false} required autoComplete="username"/></Field>}
     <Field label="Passwort" hint={joining?'Mindestens 12 Zeichen.':undefined}><input name="password" type={show?'text':'password'} required minLength={joining?12:1} maxLength={200} autoComplete={joining?'new-password':'current-password'}/></Field>
     <label className="ui-check"><input type="checkbox" checked={show} onChange={e=>setShow(e.target.checked)}/> Passwort anzeigen</label>
     <ErrorLine text={error}/>
     <button className="ui-btn primary wide" disabled={busy}>{busy?'Einen Moment …':setup?'Einrichten':invite?'Beitreten':'Anmelden'}</button>
    </form>
    {chatgpt&&<button className="ui-btn wide" disabled={busy} onClick={()=>void run(async()=>{const d=await post('/api/auth/provider/start',{provider:'chatgpt',purpose:'login',invite,setup});location.assign(d.url!);})}>Mit ChatGPT anmelden</button>}
    {!joining&&<button className="ui-link" onClick={()=>{setMode('forgot');setError('');}}>Passwort vergessen?</button>}
   </>}
   {mode==='forgot'&&<>
    <h1>Passwort vergessen</h1>
    <p className="ui-muted">Gib deine E-Mail ein. Du bekommst einen Link, der 15 Minuten gilt. Ohne E-Mail: frag den Inhaber nach einem Link für ein neues Passwort.</p>
    {info?<p className="ui-note" role="status">{info}</p>:<form className="ui-form" onSubmit={e=>{e.preventDefault();const email=new FormData(e.currentTarget).get('email');void run(async()=>{const d=await post('/api/auth/recovery/request',{email});setInfo(d.message??'Falls das Konto existiert, kommt gleich eine E-Mail.');setBusy(false);});}}>
     <Field label="E-Mail"><input type="email" name="email" required autoComplete="username" maxLength={200}/></Field>
     <ErrorLine text={error}/><button className="ui-btn primary wide" disabled={busy}>Link schicken</button></form>}
    <button className="ui-link" onClick={()=>setMode('login')}>Zurück zur Anmeldung</button>
   </>}
   {mode==='reset'&&<>
    <h1>Neues Passwort</h1>
    {info?<><p className="ui-note" role="status">{info}</p><button className="ui-btn primary wide" onClick={()=>{setMode('login');setInfo('');}}>Jetzt anmelden</button></>
    :<form className="ui-form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget),password=String(f.get('password')??'');
      if(password!==f.get('repeat')){setError('Die beiden Passwörter sind nicht gleich.');return;}
      void run(async()=>{await post('/api/auth/recovery/confirm',{token:resetToken,password});setInfo('Gespeichert. Du kannst dich jetzt mit dem neuen Passwort anmelden.');setBusy(false);});}}>
     <Field label="Neues Passwort" hint="Mindestens 12 Zeichen."><input type="password" name="password" required minLength={12} maxLength={200} autoComplete="new-password"/></Field>
     <Field label="Nochmal"><input type="password" name="repeat" required minLength={12} maxLength={200} autoComplete="new-password"/></Field>
     <ErrorLine text={error}/><button className="ui-btn primary wide" disabled={busy}>Speichern</button></form>}
   </>}
  </div>
 </main>;
}
