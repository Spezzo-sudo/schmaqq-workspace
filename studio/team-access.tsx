import {useCallback,useEffect,useState} from 'react';
import {Copy} from 'lucide-react';
import {initials,type RoomMember} from './room-model';

/** Studio is invitation-only: the owner invites, members propose, everyone sees who invited whom. */
type Invite={id:string;email:string;expires:number;invitedBy:string|null};
type Proposal={id:string;email:string;by:string;created:number};
const post=async(path:string,body:unknown)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({})) as {error?:string;link?:string;requested?:boolean;email?:string};if(!r.ok)throw new Error(d.error??'Das hat nicht geklappt. Versuch es noch einmal.');return d;};
const until=(t:number)=>new Date(t).toLocaleString('de-DE',{weekday:'short',hour:'2-digit',minute:'2-digit'});

function LinkBox({link,email,kind='invite'}:{link:string;email?:string;kind?:'invite'|'reset'}){
 const [copied,setCopied]=useState(false);
 return <div className="studio-invite-link" role="status"><p>{kind==='reset'?'Link für ein neues Passwort'+(email?' von '+email:'')+'. ':email?'Link für '+email+'. ':''}Schick ihn der Person direkt, zum Beispiel per WhatsApp. Er gilt 24 Stunden und nur einmal.{kind==='reset'?' Das alte Passwort gilt, bis sie ein neues setzt.':''}</p><div className="team-copy"><code>{link}</code><button className="rw-button" onClick={()=>void navigator.clipboard?.writeText(link).then(()=>setCopied(true))}><Copy size={16}/>{copied?'Kopiert':'Kopieren'}</button></div></div>;
}

export default function TeamAccess({members,userId,owner,onChanged}:{members:RoomMember[];userId:string;owner:boolean;onChanged:()=>void}){
 const [invites,setInvites]=useState<Invite[]>([]),[proposals,setProposals]=useState<Proposal[]>([]),[link,setLink]=useState<{link:string;email?:string;kind?:'invite'|'reset'}|null>(null);
 const [notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{try{const r=await fetch('/api/invites');const d=await r.json() as {invites?:Invite[];requests?:Proposal[];error?:string};if(!r.ok)throw new Error(d.error);setInvites(d.invites??[]);setProposals(d.requests??[]);}catch{/* lists stay as they are; the form still works */}},[]);
 useEffect(()=>{void load();},[load]);
 const act=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await fn();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
 const name=(id?:string|null)=>members.find(m=>m.id===id)?.name;
 const active=members.filter(m=>!m.removed);
 return <>
  <section aria-labelledby="team-members"><h2 id="team-members">Wer dabei ist</h2><ul className="team-members">{active.map(m=><li key={m.id}><span className="rw-avatar">{initials(m.name)}</span><span><strong>{m.name}{m.id===userId?' (du)':''}</strong><small>{m.role==='owner'?'Inhaber':'Mitglied'}{name(m.invitedBy)?' · eingeladen von '+name(m.invitedBy):''}</small></span>
   {owner&&m.id!==userId&&<button className="rw-link studio-reset" disabled={busy} onClick={()=>void act(async()=>{const d=await post('/api/members/reset',{member:m.id});setLink({link:d.link!,email:m.name,kind:'reset'});})}>Neues Passwort</button>}
   {owner&&m.role!=='owner'&&m.id!==userId&&<button className="rw-link studio-remove" disabled={busy} onClick={()=>{if(window.confirm(m.name+' aus dem Team entfernen? Anmeldung, verbundene KI-Assistenten und Rechner von '+m.name+' werden sofort getrennt. Nachrichten und Aufgaben bleiben erhalten.'))void act(async()=>{await post('/api/members/remove',{member:m.id});setNotice(m.name+' wurde entfernt.');onChanged();});}}>Entfernen</button>}
  </li>)}</ul></section>

  {owner&&!!proposals.length&&<section aria-labelledby="team-proposals"><h2 id="team-proposals">Vorschläge aus dem Team</h2>{proposals.map(p=><div className="studio-access-row" key={p.id}><span><strong>{p.email}</strong><small>vorgeschlagen von {p.by}</small></span><span className="rw-row-actions"><button className="rw-button lime" disabled={busy} onClick={()=>void act(async()=>{const d=await post('/api/invites/decide',{id:p.id,approve:true});setLink({link:d.link!,email:d.email});})}>Einladen</button><button className="rw-button" disabled={busy} onClick={()=>void act(async()=>{await post('/api/invites/decide',{id:p.id,approve:false});setNotice('Vorschlag abgelehnt.');})}>Ablehnen</button></span></div>)}</section>}

  <section className="panel team-invite" aria-labelledby="team-invite"><h2 id="team-invite">{owner?'Jemanden einladen':'Jemanden vorschlagen'}</h2>
   <p>{owner?'Studio erstellt einen persönlichen Link. Ohne Einladung kann sich niemand anmelden.':'Ohne Einladung kann sich niemand anmelden. Du schlägst vor, der Inhaber entscheidet und schickt den Link.'}</p>
   <form className="team-form" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,email=String(new FormData(form).get('email')??'');void act(async()=>{const d=await post('/api/invites',{email});if(d.link)setLink({link:d.link});else{setNotice('Vorschlag gesendet. Du siehst ihn unten, bis er entschieden ist.');}form.reset();});}}>
    <label>Benutzername oder E-Mail<input name="email" type="text" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="z. B. markus" required disabled={busy}/></label>
    <small className="rw-muted">Damit meldet sich die Person später an. Eine E-Mail-Adresse ist nicht nötig.</small>
    <button className="rw-button lime" disabled={busy}>{busy?'Einen Moment …':owner?'Einladungslink erstellen':'Vorschlagen'}</button>
   </form>
   {link&&<LinkBox {...link}/>}
   {notice&&<p role="status" className="rw-muted">{notice}</p>}
   {error&&<p className="rw-error" role="alert">{error}</p>}
  </section>

  {owner&&!!invites.length&&<section aria-labelledby="team-open-invites"><h2 id="team-open-invites">Offene Einladungen</h2>{invites.map(i=><div className="studio-access-row" key={i.id}><span><strong>{i.email}</strong><small>gilt bis {until(i.expires)}{i.invitedBy?' · von '+i.invitedBy:''}</small></span><button className="rw-button" disabled={busy} onClick={()=>void act(async()=>{await post('/api/invites/withdraw',{id:i.id});setNotice('Einladung zurückgenommen. Der Link funktioniert nicht mehr.');})}>Zurücknehmen</button></div>)}</section>}
  {!owner&&!!proposals.length&&<section aria-labelledby="team-my-proposals"><h2 id="team-my-proposals">Deine Vorschläge</h2>{proposals.map(p=><div className="studio-access-row" key={p.id}><span><strong>{p.email}</strong><small>Wartet auf den Inhaber</small></span></div>)}</section>}
 </>;
}
