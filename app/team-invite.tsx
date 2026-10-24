'use client';
import {useState} from 'react';

/** Same owner-only endpoint as before; invitations belong with the team. */
export default function TeamInvite(){
 const [link,setLink]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState(false),[copied,setCopied]=useState(false);
 return <section className="panel team-invite"><h2>Teammitglied einladen</h2><p>Erstelle einen persönlichen Einladungslink. Er wird nicht automatisch versendet; jede Person erhält ihr eigenes Studio-Konto.</p><form className="invite-form" onSubmit={async e=>{
  e.preventDefault();if(pending)return;const form=new FormData(e.currentTarget);setPending(true);setError('');setLink('');setCopied(false);
  try{const r=await fetch('/api/invites',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.get('email')})});const d=await r.json() as {link:string;error?:string};if(!r.ok)throw new Error(d.error??'Einladung fehlgeschlagen.');setLink(d.link);}catch(e){setError(e instanceof Error?e.message:'Einladung fehlgeschlagen.');}finally{setPending(false);}
 }}><label>E-Mail-Adresse<input name="email" type="email" required disabled={pending}/></label><button className="button" disabled={pending}>{pending?'Wird erstellt …':'Einladungslink erstellen'}</button></form>{link&&<><label>Persönlicher Einladungslink<input className="invite-link" readOnly value={link}/></label><button className="button" onClick={async()=>{try{await navigator.clipboard.writeText(link);setCopied(true);}catch{setError('Kopieren nicht möglich. Bitte den Link markieren und manuell kopieren.');}}}>Link kopieren</button>{copied&&<p role="status">Einladungslink kopiert.</p>}</>}{error&&<p role="alert" className="form-error">{error}</p>}</section>;
}
