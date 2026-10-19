'use client';
import {useEffect,useState} from 'react';

type Entry={id:string;commitSha:string;reviewer:string;name:string;decision:string;body:string;created:number};
type State={state:string;entries:Entry[]};
type GithubPR={state:string;repository?:string;commit?:string;branch?:string;number?:number;url?:string;headCommit?:string;expectedBase?:string;actualBase?:string|null;ci?:string;reviews?:string;mergeReady:false};
const githubLabels:Record<string,string>={
 local_only:'Dieser Prüfstand ist lokal. Es wurde kein GitHub-PR verifiziert.',
 not_configured:'GitHub-PR-Lesezugriff ist noch nicht eingerichtet. Die persönliche GitHub-Anmeldung bestätigt nur die Identität.',
 not_found:'Für diesen Branch wurde im freigegebenen Repository kein PR gefunden.',
 stale_commit:'Der PR verweist auf einen anderen Commit. Die Studio-Prüfung gilt nicht für den geänderten GitHub-Stand.',
 matched:'GitHub-PR und lokaler Prüfcommit stimmen überein.',
 already_merged:'Der PR wurde auf GitHub bereits zusammengeführt.',
 closed:'Der PR ist geschlossen.',
 provider_unavailable:'GitHub-PR konnte momentan nicht sicher geprüft werden.',
 invalid_result:'Ungültiger Branch-/Commitnachweis für den PR-Abgleich.',
 not_ready:'Der Prüfstand ist noch nicht abgeschlossen.',
 not_required:'Für diesen Stand ist kein GitHub-PR-Workflow konfiguriert.',
 base_unverified:'Der erwartete Zielbranch ist noch nicht konfiguriert. Eine GitHub-PR-Zuordnung kann nicht bestätigt werden.',
 target_mismatch:'Der PR zielt auf einen anderen Branch als den freigegebenen Projekt-Zielbranch.',
 unsupported_fork:'Dieser PR verwendet einen Fork. Fork-PRs werden in dieser Studio-Version noch nicht unterstützt.',
 listing_incomplete:'Die GitHub-PR-Liste ist unvollständig. Eine zuverlässige Zuordnung ist nicht möglich.'
};
const labels:Record<string,string>={pending:'Zweite Prüfung ausstehend',approved:'Von zweiter Person freigegeben',changes_requested:'Änderungen angefordert',unavailable:'Noch kein prüfbarer Stand'};
const decisions:Record<string,string>={approved:'Freigegeben',changes:'Änderungen angefordert',comment:'Kommentar'};

export default function CodeReview({jobId,owner,userId,result,onChange}:{jobId:string;owner:string;userId:string;result:Record<string,unknown>;onChange:()=>void}){
 const [data,setData]=useState<State>({state:'pending',entries:[]}),[body,setBody]=useState(''),[decision,setDecision]=useState('comment'),[pending,setPending]=useState(false),[error,setError]=useState('');
 const [github,setGithub]=useState<GithubPR|null>(null),[githubError,setGithubError]=useState(''),[githubLoading,setGithubLoading]=useState(false);
 const [githubCheckedAt,setGithubCheckedAt]=useState<number|null>(null),[githubRefresh,setGithubRefresh]=useState(0);
 useEffect(()=>{
  if(result.workflow!=='pull-request')return;
  let alive=true,request:AbortController|null=null;
  const load=async()=>{
   request?.abort();
   const controller=new AbortController();request=controller;
   // A stale positive status must not remain visible during a subsequent verification.
   setGithub(null);setGithubError('');setGithubLoading(true);setGithubCheckedAt(null);
   try{
    const response=await fetch('/api/development/github-pr?job='+encodeURIComponent(jobId),{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('GitHub-PR-Zustand konnte nicht geprüft werden.');
    const value=await response.json() as GithubPR;
    if(alive&&!controller.signal.aborted)setGithub(value);
   }catch{
    if(alive&&!controller.signal.aborted)setGithubError('GitHub-PR-Zustand konnte nicht geprüft werden.');
   }finally{
    if(alive&&!controller.signal.aborted){setGithubLoading(false);setGithubCheckedAt(Date.now());}
   }
  };
  void load();
  const timer=setInterval(()=>{if(!document.hidden)void load();},30000);
  const visible=()=>{if(!document.hidden)void load();};
  document.addEventListener('visibilitychange',visible);
  return()=>{alive=false;request?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[jobId,result.workflow,githubRefresh]);
 const commit=typeof result.commit==='string'?result.commit:'',diff=typeof result.diff==='string'?result.diff:'';
 const complete=typeof result.diff==='string'&&result.diffTruncated!==true&&diff.length<50000;
 useEffect(()=>{let alive=true;const load=async()=>{if(document.hidden)return;try{const r=await fetch('/api/development/reviews?job='+encodeURIComponent(jobId));if(!r.ok)throw new Error('Prüfverlauf konnte nicht geladen werden.');const value=await r.json() as State;if(alive)setData(value);}catch(e){if(alive)setError(e instanceof Error?e.message:'Verbindungsfehler.');}};load();const timer=setInterval(load,10000);document.addEventListener('visibilitychange',load);return()=>{alive=false;clearInterval(timer);document.removeEventListener('visibilitychange',load)};},[jobId]);
 let oldLine=0,newLine=0;
 return <section className="code-review" aria-label="Gemeinsame Codeprüfung"><div className="review-identity"><span className="label sage">{labels[data.state]??data.state}</span><p><strong>Geprüfter Commit</strong> <code>{commit}</code></p><small>{result.published===true?'Branch veröffentlicht':'Lokaler Prüfstand · noch nicht veröffentlicht'} · Die Rückmeldung gilt genau für diesen Prüfauftrag.</small></div>
 <h3>Testergebnis</h3><pre className="dev-output">{String(result.checks??'Kein Testergebnis verfügbar.')}</pre>
 <h3>Codeänderungen</h3><p className="review-explainer">Prüfe die Änderungen und die Tests für genau diesen Commit. Erst danach unten eine Rückmeldung speichern. Die Freigabe veröffentlicht noch keinen Branch.</p>{!complete&&<p className="form-error" role="alert">Die Änderung ist zu groß für eine vollständige Anzeige. Eine Freigabe im Studio ist für diesen Stand gesperrt.</p>}
 <div className="review-diff" role="region" aria-label="Änderungen im Code" tabIndex={0}>{diff?diff.split('\n').map((line,index)=>{const hunk=line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);if(hunk){oldLine=Number(hunk[1]);newLine=Number(hunk[2]);}const meta=hunk||/^(diff |index |--- |\+\+\+ |new file |deleted file |Binary |rename |similarity )/.test(line),add=!meta&&line.startsWith('+'),remove=!meta&&line.startsWith('-'),content=!meta&&(add||remove||line.startsWith(' '));const old=content&&!add?oldLine++:'',next=content&&!remove?newLine++:'';return <div key={index} className={`diff-line ${meta?'meta':add?'add':remove?'remove':''}`}><span aria-hidden="true">{old}</span><span aria-hidden="true">{next}</span><code>{line||' '}</code></div>}):<p>Keine Codeänderungen gegenüber der gemeinsamen Basis.</p>}</div>
 <h3>Rückmeldungen</h3><div className="review-discussion">{data.entries.length?data.entries.map(e=><article key={e.id}><div><strong>{e.name}</strong><span className="label neutral">{decisions[e.decision]}</span><small>{new Date(e.created).toLocaleString('de-DE')}</small></div>{e.body&&<p>{e.body}</p>}</article>):<p className="muted">Hier könnt ihr den Stand gemeinsam besprechen.</p>}</div>
 <form onSubmit={async e=>{e.preventDefault();setPending(true);setError('');try{const r=await fetch('/api/development/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),job:jobId,commit,decision,body})});const value=await r.json() as {error?:string};if(!r.ok)throw new Error(value.error??'Rückmeldung fehlgeschlagen.');const updated=await fetch('/api/development/reviews?job='+encodeURIComponent(jobId));if(updated.ok)setData(await updated.json() as State);setBody('');onChange();}catch(e){setError(e instanceof Error?e.message:'Rückmeldung fehlgeschlagen.');}finally{setPending(false);}}}>
 <label>Deine Rückmeldung<select aria-label="Art der Codeprüfung" value={decision} onChange={e=>setDecision(e.target.value)}><option value="comment">Kommentar</option>{owner!==userId&&<><option value="changes">Änderungen anfordern</option><option value="approved" disabled={!complete}>Diesen Stand freigeben</option></>}</select></label>
 <textarea aria-label="Rückmeldung zum Code" placeholder="Was passt, was soll geändert werden?" value={body} maxLength={4000} onChange={e=>setBody(e.target.value)}/>{owner===userId&&<p className="muted">Die zweite Person übernimmt die Freigabe deiner Änderungen.</p>}{error&&<p role="alert" className="form-error">{error}</p>}<button className="button primary" disabled={pending||(!body.trim()&&decision!=='approved')||(decision==='approved'&&!complete)}>Rückmeldung speichern</button></form>
 {result.workflow==='pull-request'&&<section className="github-pr-status" aria-label="GitHub-Pull-Request-Zuordnung"><h3>GitHub-Übergang · nur lesend</h3>
 {githubLoading?<p role="status">PR-Zuordnung wird gelesen …</p>:<p role={githubError?'alert':'status'}>{githubError||(githubLabels[github?.state??'']??'PR-Zustand nicht bestätigt.')}</p>}
 <button type="button" className="button compact" disabled={githubLoading} onClick={()=>setGithubRefresh(v=>v+1)}>GitHub-Status erneut prüfen</button>
 {githubCheckedAt&&<small role="status">Letzter Prüfversuch: {new Date(githubCheckedAt).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</small>}
 {github?.url&&<a href={github.url} target="_blank" rel="noopener noreferrer">PR #{github.number} in GitHub öffnen</a>}
 {github?.state==='target_mismatch'&&<p>Erwarteter Zielbranch: <code>{github.expectedBase}</code>. GitHub-Zielbranch: <code>{github.actualBase??'unbekannt'}</code>.</p>}
 {github?.state==='stale_commit'&&<p>Erwarteter Commit: <code>{github.commit}</code>. GitHub-HEAD: <code>{github.headCommit}</code>.</p>}
 <p className="muted">CI, GitHub-Reviews und Branchschutz sind hier noch nicht attestiert. Eine Studio-Freigabe bewirkt weder Push noch GitHub-Merge.</p>
 </section>}
 </section>;
}
