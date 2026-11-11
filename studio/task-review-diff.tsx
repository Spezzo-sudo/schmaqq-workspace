import {useEffect,useState,useRef} from 'react';
import {GitCommitHorizontal,RefreshCw} from 'lucide-react';
import {roomRequest} from './room-model';

type DiffResult={review:string;owner:string;ownerName:string;state:string;checks:string;published:boolean;preview:string|null;previewExpired?:boolean;contractSnapshot?:{title:string;description:string;criteria:string}|null;commit:string|null;created:number;complete:boolean;diff:string;limited:boolean};
type DiffLine={kind:'add'|'remove'|'meta'|'context';old:number|null;next:number|null;text:string};
export function parseReviewDiff(diff:string):DiffLine[]{
 let old=0,next=0;
 return diff.split('\n').map(text=>{
  const hunk=text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if(hunk){old=Number(hunk[1]);next=Number(hunk[2]);return {kind:'meta',old:null,next:null,text};}
  if(/^(diff |index |--- |\+\+\+ |new file |deleted file |Binary |rename |similarity )/.test(text))return {kind:'meta',old:null,next:null,text};
  if(text.startsWith('+'))return {kind:'add',old:null,next:next++,text};
  if(text.startsWith('-'))return {kind:'remove',old:old++,next:null,text};
  if(text.startsWith(' '))return {kind:'context',old:old++,next:next++,text};
  return {kind:'meta',old:null,next:null,text};
 });
}
export default function TaskReviewDiff({task,review,changedAfter=false,onClose,userId,onChange,closed=false,canReview=true,selfApprove=false}:{task:string;review:string;changedAfter?:boolean;onClose:()=>void;userId?:string;onChange?:()=>void;closed?:boolean;canReview?:boolean;selfApprove?:boolean}){
 const [result,setResult]=useState<DiffResult|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const [revision,setRevision]=useState(0);
 const [body,setBody]=useState(''),[busy,setBusy]=useState(false);
 const [entries,setEntries]=useState<{id:string;name:string;commitSha:string;decision:string;body:string;created:number}[]>([]),attempt=useRef({fingerprint:'',id:''});
 async function vote(decision:'approved'|'changes'){
  if(!result?.commit)return;setBusy(true);setError('');
  const fingerprint=JSON.stringify({review,commit:result.commit,decision,body});if(attempt.current.fingerprint!==fingerprint)attempt.current={fingerprint,id:crypto.randomUUID()};
  try{await roomRequest('/api/development/reviews',{id:attempt.current.id,job:review,commit:result.commit,decision,body});setRevision(v=>v+1);onChange?.();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 useEffect(()=>{let alive=true;setLoading(true);setError('');setResult(null);
  Promise.all([roomRequest<DiffResult>('/api/collaboration/task-diff?task='+encodeURIComponent(task)+'&review='+encodeURIComponent(review)),roomRequest<{entries:typeof entries}>('/api/development/reviews?job='+encodeURIComponent(review))])
   .then(([r,v])=>{if(alive){setResult(r);setEntries(v.entries);}}).catch(e=>{if(alive)setError((e as Error).message);})
   .finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};
 },[task,review,revision]);
 const lines=result&&result.complete?parseReviewDiff(result.diff):[];
 // A snapshot that was never handed in ("Zur Prüfung geben") is only a look at work in progress, not a review request.
 const draft=!!result&&result.published===false;
 const stateText=draft?'Zwischenstand – noch nicht zur Prüfung gegeben.':result?.state==='approved'?'Freigegeben.':result?.state==='changes_requested'?'Es wurden Änderungen gewünscht.':'Wartet auf Freigabe.';
 // Own change: only an admin in a project with "Admin darf allein freigeben" reviews it. Others need the reviewer role.
 const mine=!!userId&&result?.owner===userId&&!selfApprove;
 // Order follows what a reviewer does: look at the preview, decide, read feedback. Code and test details stay folded.
 return <section className="r27-diff-panel review-simple" aria-label="Änderung anschauen">
  {loading&&<p role="status">Wird geladen …</p>}
  {error&&<p role="alert" className="rw-error">Die Änderung konnte nicht geladen werden: {error}</p>}
  {result&&<>
   <p className="review-head"><strong>Änderung von {result.ownerName}</strong> · {new Date(result.created).toLocaleString('de-CH',{dateStyle:'short',timeStyle:'short'})}<br/>{stateText}</p>
   {changedAfter&&<p role="alert" className="r27-diff-warning">Seitdem wurde noch etwas geändert. Freigeben geht erst, wenn die neue Fassung zur Prüfung gegeben ist.</p>}
   {result.preview?<a className="rw-button lime review-preview" href={result.preview} target="_blank" rel="noreferrer">Vorschau öffnen – so sieht es aus ↗</a>:result.previewExpired?<p className="muted">Die Live-Vorschau dieser Fassung ist abgelaufen: Sie läuft höchstens eine Stunde und nur bis zur nächsten Live-Vorschau auf dieser Werkstatt. Die Person, die geändert hat, kann sie unter „Ändern“ neu starten. Unten unter „Was wurde geändert“ siehst du die Änderung im Text.</p>:<p className="muted">Für diese Fassung gibt es keine Vorschau. Unten unter „Was wurde geändert“ siehst du die Änderung im Text.</p>}
   {userId&&!mine&&canReview&&!draft&&!closed&&result.state!=='approved'&&<ol className="review-checklist" aria-label="So prüfst du">
    <li><strong>Vorschau öffnen</strong> und durchklicken, am besten auch am Handy.</li>
    <li><strong>Prüfen:</strong> {result.contractSnapshot?.criteria?.trim()||'Macht die Änderung, was in der Aufgabe steht? Ist nichts anderes kaputtgegangen?'}</li>
    <li><strong>Entscheiden:</strong> „Diese Fassung freigeben“ oder „Änderungen anfordern“ mit einem Satz, was fehlt.</li>
   </ol>}
   {userId&&!mine&&canReview&&!draft&&!closed&&result.state!=='approved'&&<form className="team-review-actions" onSubmit={e=>e.preventDefault()}>
    <label>Deine Rückmeldung (bei „Änderungen anfordern“ nötig)<textarea aria-label="Rückmeldung zur Änderung" value={body} maxLength={4000} onChange={e=>setBody(e.target.value)} placeholder="Zum Beispiel: Der Satz ist zu lang."/></label>
    <div className="rw-row-actions"><button className="rw-button lime" disabled={busy||!result.complete||changedAfter} onClick={()=>void vote('approved')}>Diese Fassung freigeben</button><button className="rw-button" disabled={busy||!body.trim()} onClick={()=>void vote('changes')}>Änderungen anfordern</button></div>
   </form>}
   {mine&&!closed&&result.state!=='approved'&&<p className="muted">{draft?'Das ist dein Zwischenstand. Wenn du fertig bist, gib die Änderung oben zur Prüfung.':'Jemand anderes schaut sich das an und gibt es frei. Eigene Änderungen kann man nicht selbst freigeben.'}</p>}
   {!!entries.length&&<section aria-label="Rückmeldungen zu dieser Fassung"><h4>Rückmeldungen</h4>{entries.filter(e=>e.commitSha===result.commit).map(e=><blockquote key={e.id}><strong>{e.name}</strong> · {e.decision==='approved'?'Freigegeben':e.decision==='changes'?'Änderungen angefordert':'Kommentar'}{e.body&&<p>{e.body}</p>}<small>{new Date(e.created).toLocaleString('de-DE')}</small></blockquote>)}</section>}
   <details className="review-changes"><summary>Was wurde geändert</summary>
    <p className="r27-diff-disclaimer">Grün = neu, Rot = entfernt. Gezeigt wird genau die Fassung, die zur Prüfung gegeben wurde.</p>
    {!result.complete?<p role="alert" className="rw-error">Die Änderung ist zu gross, um sie hier vollständig zu zeigen. Bitte nicht anhand dieser Ansicht freigeben.</p>:
     <div className="r27-diff-content" role="region" aria-label="Geänderte Zeilen" tabIndex={0}>
      {lines.length===1&&!lines[0].text?<p>Keine Änderungen.</p>:lines.map((line,i)=><div key={i} className={'r27-diff-line '+line.kind}><span aria-hidden="true">{line.old??''}</span><span aria-hidden="true">{line.next??''}</span><code>{line.text||' '}</code></div>)}
     </div>}
   </details>
   <details className="review-developer"><summary>Für Entwickler</summary>
    <p className="r27-diff-source"><GitCommitHorizontal size={15}/> Commit {result.commit?.slice(0,12)??'unbestätigt'} · {result.published?'als Branch geteilt':'nur lokal'} <button className="rw-button subtle" onClick={()=>setRevision(v=>v+1)} aria-label="Neu laden"><RefreshCw size={15}/></button></p>
    <details><summary>Testprotokoll</summary><pre>{result.checks}</pre></details>
    {result.contractSnapshot&&<details><summary>Aufgabe zum Zeitpunkt dieser Fassung</summary><h4>{result.contractSnapshot.title}</h4><p>{result.contractSnapshot.description}</p><p>{result.contractSnapshot.criteria}</p></details>}
   </details>
  </>}
 </section>;
}
