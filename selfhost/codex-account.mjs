// ChatGPT sign-in per member on the server worker (Codex device code login).
// Pure helpers shared by the runner and the Studio server; no I/O here.

export const codexAccountModes=['login','status','logout'];

const ansi=/\u001b\[[0-9;?]*[ -\/]*[@-~]/g;
/** Link and one-time code from `codex login --device-auth` output. Only an https link on an
 * OpenAI/ChatGPT host is accepted, so foreign output can never send someone to another site. */
export function deviceLoginPrompt(text){
 const plain=String(text??'').replace(ansi,'');
 let url=null;
 for(const m of plain.matchAll(/https:\/\/[^\s"'<>)]+/g)){
  try{const u=new URL(m[0]);if(/(^|\.)(openai\.com|chatgpt\.com)$/.test(u.hostname)){url=u.toString();break;}}catch{/* not a URL */}
 }
 const code=plain.match(/\b([A-Z0-9]{4,6}-[A-Z0-9]{4,6})\b/)?.[1]??null;
 return url&&code?{url,code}:null;
}

/** The member's current state from their own codex-account jobs (newest first). */
export function accountState(jobs,sessions=new Map()){
 const pending=jobs.find(j=>['queued','running','cancelling'].includes(j.status))??null;
 const done=jobs.find(j=>['completed','failed','interrupted','cancelled'].includes(j.status)&&j!==pending)??null;
 let connected=false,checked=null,error=null;
 if(done){
  const result=done.result?JSON.parse(done.result):{};
  checked=done.created;
  if(done.status==='completed')connected=result.connected===true;
  else error=result.error?String(result.error).slice(0,300):'Der letzte Schritt ist nicht abgeschlossen.';
  // A failed check or sign-in does not prove a previous connection is gone; keep the last known one.
  if(done.status!=='completed'){const before=jobs.find(j=>j!==done&&j!==pending&&j.status==='completed');if(before)connected=JSON.parse(before.result??'{}').connected===true;}
 }
 const mode=pending?JSON.parse(pending.payload??'{}').mode??null:null;
 return {
  connected,checked,error,
  pending:pending?{job:pending.id,mode,status:pending.status,created:pending.created,login:mode==='login'?sessions.get(pending.id)??null:null}:null
 };
}
