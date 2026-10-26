import {useEffect,useState,useRef} from 'react';
import {GitCommitHorizontal,RefreshCw,X} from 'lucide-react';
import {roomRequest} from './room-model';

type DiffResult={review:string;owner:string;ownerName:string;state:string;checks:string;published:boolean;preview:string|null;contractSnapshot?:{title:string;description:string;criteria:string}|null;commit:string|null;created:number;complete:boolean;diff:string;limited:boolean};
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
export default function TaskReviewDiff({task,review,changedAfter=false,onClose,userId,onChange,closed=false}:{task:string;review:string;changedAfter?:boolean;onClose:()=>void;userId?:string;onChange?:()=>void;closed?:boolean}){
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
 return <section className="r27-diff-panel" aria-label="Änderungen dieses Prüfstands">
  <header><div><span className="rw-eyebrow">GIT · NUR DIESER PRÜFSTAND</span><h3><GitCommitHorizontal size={17}/>Codeänderungen ansehen</h3></div>
   <div className="r27-diff-actions"><button className="rw-button subtle" onClick={()=>setRevision(v=>v+1)} aria-label="Codeänderungen aktualisieren"><RefreshCw size={15}/></button><button className="rw-button subtle" onClick={onClose} aria-label="Codeänderungen schliessen"><X size={15}/></button></div></header>
  {loading&&<p role="status">Prüfstand wird geladen …</p>}
  {error&&<p role="alert" className="rw-error">Die Änderungen konnten nicht geladen werden: {error}</p>}
  {result&&<>
   <p className="r27-diff-source"><strong>{result.ownerName}</strong> · Commit {result.commit?.slice(0,12)??'unbestätigt'} · {new Date(result.created).toLocaleString('de-CH')}</p>
   <p><strong>{result.state==='approved'?'Freigegeben':result.state==='changes_requested'?'Änderungen angefordert':'Prüfung offen'}</strong> · {result.published?'Branch mit dem Team geteilt':'Lokaler Prüfstand; Code noch nicht gemeinsam gesichert'}</p>
   <details><summary>Testergebnis dieses Prüfstands</summary><pre>{result.checks}</pre></details>
   {result.contractSnapshot&&<details><summary>Auftrag und Abschlussbedingungen dieser Fassung</summary><h4>{result.contractSnapshot.title}</h4><p>{result.contractSnapshot.description}</p><p>{result.contractSnapshot.criteria}</p></details>}
   {result.preview&&<a className="rw-button" href={result.preview} target="_blank" rel="noreferrer">Vorschau genau dieser Fassung öffnen</a>}
   {!!entries.length&&<section aria-label="Rückmeldungen zu dieser Fassung"><h4>Rückmeldungen</h4>{entries.filter(e=>e.commitSha===result.commit).map(e=><blockquote key={e.id}><strong>{e.name}</strong> · {e.decision==='approved'?'Freigegeben':e.decision==='changes'?'Änderungen angefordert':'Kommentar'}{e.body&&<p>{e.body}</p>}<small>{new Date(e.created).toLocaleString('de-DE')}</small></blockquote>)}</section>}
   <p className="r27-diff-disclaimer">Grün = hinzugefügt, Rot = entfernt. Dieser Diff gehört zu einem abgeschlossenen Git-Prüfstand, <strong>nicht</strong> zu live mitgetippten oder ungespeicherten Änderungen. Eine Freigabe gilt ausschliesslich für diesen Commit.</p>
   {changedAfter&&<p role="alert" className="r27-diff-warning">Seit diesem Prüfstand wurde eine weitere Änderung oder ein unbestätigter Arbeitsvorgang erkannt. Dieser Diff kann veraltet sein. Eine erneute Codeprüfung ist nötig, bevor der aktuelle Stand freigegeben wird.</p>}
   {!result.complete?<p role="alert" className="rw-error">Der Diff ist nicht vollständig. Keine Freigabe anhand dieser Darstellung – bitte vollständigen Prüfstand verwenden.</p>:
    <div className="r27-diff-content" role="region" aria-label="Git-Diff mit Zeilennummern" tabIndex={0}>
     {lines.length===1&&!lines[0].text?<p>Keine Änderungen gegenüber der gemeinsamen Git-Basis.</p>:lines.map((line,i)=><div key={i} className={'r27-diff-line '+line.kind}><span aria-hidden="true">{line.old??''}</span><span aria-hidden="true">{line.next??''}</span><code>{line.text||' '}</code></div>)}
    </div>}
   {userId&&result.owner!==userId&&!closed&&<form className="team-review-actions" onSubmit={e=>e.preventDefault()}><label>Rückmeldung zu dieser Fassung<textarea aria-label="Rückmeldung zum Prüfstand" value={body} maxLength={4000} onChange={e=>setBody(e.target.value)}/></label><div className="rw-row-actions"><button className="rw-button lime" disabled={busy||!result.complete||changedAfter} onClick={()=>void vote('approved')}>Diese Fassung freigeben</button><button className="rw-button" disabled={busy||!body.trim()} onClick={()=>void vote('changes')}>Änderungen anfordern</button></div></form>}
   {userId&&result.owner===userId&&<p>Dein Kollege kann diese Fassung prüfen und freigeben. Eigene Freigaben sind gesperrt.</p>}
  </>}
 </section>;
}
