import {useEffect, useState} from 'react';

// A URL fragment is never sent in the HTTP request or Referer.
// Erase it from history before any application content is rendered.
export function readRecoveryTokenFromFragment(): string {
 const hash=window.location.hash;
 if (!hash.startsWith('#reset=')) return '';
 const token=new URLSearchParams(hash.slice(1)).get('reset')??'';
 window.history.replaceState(null,'',window.location.pathname+window.location.search);
 return /^[a-zA-Z0-9_-]{43}$/.test(token)?token:'';
}

type Props={initialToken:string; onBack:()=>void};
export default function PasswordRecovery({initialToken,onBack}:Props) {
 const [step,setStep]=useState<'request'|'confirm'|'done'>(initialToken?'confirm':'request');
 const [available,setAvailable]=useState<boolean|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  fetch('/api/auth/recovery/status')
   .then(async response=>response.ok?await response.json() as {available:boolean}:{available:false})
   .then(result=>{if(active)setAvailable(result.available===true);})
   .catch(()=>{if(active)setAvailable(false);});
  return ()=>{active=false;};
 },[]);

 async function request(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault();if(busy)return;
  setBusy(true);setError('');setMessage('');
  try {
   const data=new FormData(event.currentTarget);
   const response=await fetch('/api/auth/recovery/request',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:data.get('email')})
   });
   const result=await response.json() as {error?:string;message?:string};
   if(!response.ok)throw new Error(result.error??'Der Reset ist derzeit nicht verfügbar.');
   setMessage(result.message??'Falls das Konto existiert, erhältst du eine E-Mail.');
  }catch(e) {setError(e instanceof Error?e.message:'Die Anfrage konnte nicht gesendet werden.');}
  finally {setBusy(false);}
 }
 async function confirm(event:React.FormEvent<HTMLFormElement>) {
  event.preventDefault();if(busy)return;
  setError('');
  const data=new FormData(event.currentTarget);
  const password=String(data.get('password')??'');
  if(password!==data.get('repeatPassword')) {setError('Die Passwörter stimmen nicht überein.');return;}
  setBusy(true);
  try {
   const response=await fetch('/api/auth/recovery/confirm',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({token:initialToken,password})
   });
   const result=await response.json() as {error?:string};
   if(!response.ok)throw new Error(result.error??'Der Reset ist fehlgeschlagen.');
   setStep('done');
  }catch(e) {setError(e instanceof Error?e.message:'Der Reset ist fehlgeschlagen.');}
  finally {setBusy(false);}
 }

 return <>
  <div className="eyebrow">ZUGANG SICHER WIEDERHERSTELLEN</div>
  {step==='request'?<>
   <h1>Passwort vergessen?</h1>
   <p>Gib deine Studio-E-Mail ein. Ein gültiger Reset-Link ist nur einmal und 15 Minuten lang nutzbar.</p>
   {available===false?
    <div className="form-error" role="alert">Die E-Mail-Wiederherstellung ist noch nicht eingerichtet. Bitte kontaktiere den Studio-Betreiber. Teile niemals dein bisheriges Passwort.</div>
    :<form onSubmit={request}>
      <label>E-Mail<input type="email" name="email" required autoComplete="username" maxLength={200} disabled={busy||available===null}/></label>
      {message&&<p className="muted" role="status">{message}</p>}
      {error&&<div className="form-error" role="alert">{error}</div>}
      <button className="button primary" disabled={busy||available===null}>{busy?'Anfrage läuft …':'Reset-Link anfordern'}</button>
     </form>}
   <button className="text-button" type="button" onClick={onBack}>Zur Anmeldung</button>
  </>:step==='confirm'?<>
   <h1>Neues Passwort</h1>
   <p>Wähle ein neues Passwort nur für Studio. Alte Sitzungen und Gerätezugänge werden widerrufen.</p>
   <form onSubmit={confirm}>
    <label>Neues Passwort<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={200} required disabled={busy}/></label>
    <label>Passwort wiederholen<input name="repeatPassword" type="password" autoComplete="new-password" minLength={12} maxLength={200} required disabled={busy}/></label>
    <small>Mindestens 12 Zeichen. Kein Passwort per E-Mail oder Chat weitergeben.</small>
    {error&&<div className="form-error" role="alert">{error}</div>}
    <button className="button primary" disabled={busy}>{busy?'Wird geändert …':'Passwort zurücksetzen'}</button>
   </form>
   <button className="text-button" type="button" onClick={()=>setStep('request')}>Neuen Link anfordern</button>
  </>:<>
   <h1>Passwort geändert.</h1>
   <p role="status">Dein neues Passwort wurde gespeichert. Bitte melde dich erneut an und verbinde vertrauenswürdige Geräte bei Bedarf neu.</p>
   <button className="button primary" type="button" onClick={onBack}>Zur Anmeldung</button>
  </>}
 </>;
}
