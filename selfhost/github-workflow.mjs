import {metadata,storeMetadata,teamError,taskContract,completion,teamEvent} from './team-model.mjs';
import {transaction} from './store.mjs';
import {reviewState} from './reviews.mjs';

// Explicit per-member repository credentials, separate from identity-only OAuth.
// No token is persisted, returned to the browser, or included in provider errors.
export function githubMemberTokens(raw=''){
 if(!raw)return {};let value;try{value=JSON.parse(raw);}catch{throw Error('STUDIO_GITHUB_MEMBER_TOKENS benötigt ein JSON-Objekt.');}
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.entries(value).some(([id,t])=>!/^[\w-]{1,100}$/.test(id)||typeof t!=='string'||!t||t.length>10000))throw Error('Ungültige persönliche GitHub-Zuordnung.');return value;
}
export function createGithubWorkflow({db,tokens={},request=fetch}){
 async function client(member){
  const token=tokens[member.id];if(!token)throw teamError(409,'Dein persönlicher Repository-Zugang ist noch nicht eingerichtet. Unter Team & Verbindungen das eigene GitHub-Konto verbinden und den Repository-Zugang vom Betreiber einrichten lassen.');
  const call=async(method,path,body)=>{
   let response;try{response=await request('https://api.github.com'+path,{method,headers:{Accept:'application/vnd.github+json','User-Agent':'SCHMAQQ-Studio','X-GitHub-Api-Version':'2026-03-10',Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw teamError(503,'GitHub hat den Vorgang nicht bestätigt. Vor einer Wiederholung den Status abgleichen.');}
   if(!response.ok)throw teamError(response.status===403?403:409,response.status===403?'GitHub hat die Aktion für deinen persönlichen Zugang abgelehnt. Repository-Berechtigungen prüfen.':'GitHub hat die Aktion nicht bestätigt. Commit, Prüfungen und Branchschutz prüfen.');
   return response.status===204?null:response.json();
  };
  const profile=await call('GET','/user'),linked=db.prepare('SELECT subject FROM github_connections WHERE member=?').get(member.id);
  if(!linked||String(profile?.id)!==linked.subject)throw teamError(403,'Repository-Zugang und dein bestätigtes GitHub-Konto gehören nicht zur selben Person.');
  return call;
 }
 function source(jobId){
  const job=db.prepare("SELECT * FROM jobs WHERE id=? AND action='submit' AND status='completed'").get(jobId);if(!job)throw teamError(409,'Zuerst den Code als Branch mit dem Team teilen.');
  const result=JSON.parse(job.result??'{}'),meta=metadata(db,'room:v1:project:'+job.project),match=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/.exec(meta?.repository??'');
  if(result.workflow!=='pull-request'||result.published!==true||!match||!/^[a-f0-9]{40,64}$/.test(result.commit??'')||!/^studio\/[\w-]+$/.test(result.branch??''))throw teamError(409,'Gemeinsames GitHub-Repository oder vollständiger Prüfstand fehlt.');
  const task=db.prepare("SELECT t.* FROM tasks t JOIN workspaces w ON w.task=t.id WHERE w.job=json_extract(?,'$.worktree')").get(job.payload);
  const target=meta.base??'main';if(!/^[\w./-]{1,100}$/.test(target)||target.includes('..')||target.startsWith('-'))throw teamError(409,'Zielbranch ungültig.');
  return {job,result,task,repo:match[1],target};
 }
 function validate(pr,s){
  if(!Number.isSafeInteger(pr?.number)||pr.head?.sha!==s.result.commit||pr.head?.ref!==s.result.branch||pr.head?.repo?.full_name?.toLowerCase()!==s.repo.toLowerCase()||pr.base?.ref!==s.target||pr.base?.repo?.full_name?.toLowerCase()!==s.repo.toLowerCase())throw teamError(409,'Pull Request und geprüfte Fassung passen nicht mehr zusammen. Erneut einreichen.');
  return pr;
 }
 async function locate(call,s){
  const saved=metadata(db,'team:v1:github:'+s.job.id);
  if(saved)return validate(await call('GET',`/repos/${s.repo}/pulls/${saved.number}`),s);
  const params=new URLSearchParams({state:'all',head:s.repo.split('/')[0]+':'+s.result.branch,base:s.target,per_page:'100'});
  const list=await call('GET',`/repos/${s.repo}/pulls?${params}`);
  if(!Array.isArray(list)||list.length>=100)throw teamError(409,'Die Pull-Request-Liste ist unvollständig. Bitte in GitHub prüfen.');
  const match=list.find(p=>p.head?.sha===s.result.commit&&p.state==='open')??list.find(p=>p.head?.sha===s.result.commit);
  return match?validate(await call('GET',`/repos/${s.repo}/pulls/${match.number}`),s):null;
 }
 async function sync(call,s,pr){
  validate(pr,s);
  const reviews=await call('GET',`/repos/${s.repo}/pulls/${pr.number}/reviews?per_page=100`);
  if(!Array.isArray(reviews)||reviews.length>=100)throw teamError(409,'Reviewverlauf ist unvollständig. Freigabe kann noch nicht bestätigt werden.');
  transaction(db,()=>{
   db.prepare("DELETE FROM code_reviews WHERE job=? AND id LIKE 'github-%'").run(s.job.id);
   for(const r of reviews){
    const reviewer=db.prepare('SELECT member FROM github_connections WHERE subject=?').get(String(r.user?.id));
    if(!reviewer||reviewer.member===s.job.owner||r.commit_id!==s.result.commit||!Number.isSafeInteger(r.id)||!['APPROVED','CHANGES_REQUESTED'].includes(r.state))continue;
    db.prepare('INSERT OR IGNORE INTO code_reviews(id,job,commit_sha,reviewer,decision,body,created) VALUES(?,?,?,?,?,?,?)').run('github-'+r.id,s.job.id,s.result.commit,reviewer.member,r.state==='APPROVED'?'approved':'changes',typeof r.body==='string'?r.body.slice(0,4000):'',Date.parse(r.submitted_at)||Date.now());
   }
   storeMetadata(db,'team:v1:github:'+s.job.id,{number:pr.number,commit:s.result.commit,url:`https://github.com/${s.repo}/pull/${pr.number}`,merged:!!pr.merged_at,checked:Date.now()});
   if(pr.merged_at){
    db.prepare('UPDATE jobs SET result=? WHERE id=?').run(JSON.stringify({...s.result,githubMerged:true,githubMergeSha:pr.merge_commit_sha}),s.job.id);
    if(s.task&&completion(db,s.task).ready)db.prepare("UPDATE tasks SET status='done' WHERE id=?").run(s.task.id);
   }
  });
  return {configured:true,number:pr.number,url:`https://github.com/${s.repo}/pull/${pr.number}`,commit:s.result.commit,state:pr.merged_at?'merged':pr.state,review:reviewState(db,s.job),mergeable:pr.mergeable===true,checks:'Beim Zusammenführen werden GitHub-Prüfungen und Branchschutz erneut geprüft.'};
 }
 async function perform(action,jobId,member,decision,body=''){
  const s=source(jobId),call=await client(member);
  if(s.task&&action!=='refresh'){
   const contract=taskContract(db,s.task),payload=JSON.parse(s.job.payload);
   if(contract.revision!==(payload.contractRevision??0)||contract.blocked||contract.cancelled)throw teamError(409,'Auftrag oder Abschlussbedingungen haben sich geändert. Einen neuen Stand einreichen.');
   const current=completion(db,s.task).result;if(current?.id!==s.job.id||current.changedAfter)throw teamError(409,'Dieser Prüfstand ist nicht mehr der aktuelle Stand.');
  }
  let pr=await locate(call,s);
  if(action==='open'&&!pr){
   if(member.id!==s.job.owner)throw teamError(403,'Der Autor reicht seinen Stand als Pull Request ein.');
   pr=validate(await call('POST',`/repos/${s.repo}/pulls`,{title:s.task?.title??'SCHMAQQ: geprüfte Änderung',head:s.result.branch,base:s.target,body:`Aufgabe: ${s.task?.title??s.job.id}\n\nGeprüfter Commit: ${s.result.commit}\n\n${s.task?.description??''}`}),s);
  }
  if(!pr)return {configured:true,state:'missing',review:'pending'};
  if(action==='review'){
   if(member.id===s.job.owner)throw teamError(403,'Eigene Änderungen können nicht unabhängig freigegeben werden.');
   if(pr.state!=='open'||pr.merged_at)throw teamError(409,'Dieser Pull Request ist nicht mehr offen.');
   await call('POST',`/repos/${s.repo}/pulls/${pr.number}/reviews`,{commit_id:s.result.commit,event:decision==='approved'?'APPROVE':'REQUEST_CHANGES',body});
   if(s.task&&decision==='changes')db.prepare("UPDATE tasks SET status='doing' WHERE id=?").run(s.task.id);
  }
  if(action==='merge'&&!pr.merged_at){
   await sync(call,s,pr);
   if(reviewState(db,s.job)!=='approved')throw teamError(409,'Eine aktuelle unabhängige GitHub-Freigabe fehlt.');
   pr=validate(await call('GET',`/repos/${s.repo}/pulls/${pr.number}`),s);
   if(pr.draft||pr.mergeable!==true||pr.mergeable_state!=='clean')throw teamError(409,'GitHub bestätigt noch keinen konfliktfreien, vollständig geprüften Merge. Prüfungen oder Konflikte zuerst klären.');
   const merged=await call('PUT',`/repos/${s.repo}/pulls/${pr.number}/merge`,{sha:s.result.commit,merge_method:'merge'});
   if(merged?.merged!==true)throw teamError(409,'GitHub hat die Zusammenführung nicht bestätigt.');
   pr=validate(await call('GET',`/repos/${s.repo}/pulls/${pr.number}`),s);
   if(!pr.merged_at)throw teamError(409,'Zusammenführung noch nicht bestätigt. Status erneut abgleichen.');
  }
  const result=await sync(call,s,pr);
  if(action!=='refresh')teamEvent(db,{actor:member.id,project:s.job.project,task:s.task?.id??null,kind:'github-'+action,body:action==='merge'?'Pull Request zusammengeführt':action==='review'?'GitHub-Prüfung abgegeben':'Pull Request erstellt oder zugeordnet'});
  return result;
 }
 async function createRepository(member,{project,name,revision,id}){
  if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(name)||name.includes('..'))throw teamError(400,'Bitte einen einfachen Repository-Namen ohne Pfad angeben.');
  const current=metadata(db,'room:v1:project:'+project,{revision:0});
  const prior=metadata(db,'team:v1:create-repository:'+id);if(prior?.completed){if(prior.member!==member.id||prior.project!==project||prior.name!==name)throw teamError(409,'Diese Anfrage wurde bereits anders verwendet.');return prior.result;}
  if(current.revision!==revision||current.repository)throw teamError(409,'Das Projekt wurde bereits verbunden oder inzwischen geändert. Bitte neu laden.');
  const p=db.prepare('SELECT title,description FROM projects WHERE id=?').get(project);if(!p)throw teamError(404,'Projekt fehlt.');
  const call=await client(member),marker=`SCHMAQQ project ${project}; operation ${id}`;
  if(prior)throw teamError(409,'Für diesen Vorgang fehlt noch eine Bestätigung. Vor einer neuen Anlage das eigene GitHub-Konto auf das Repository prüfen.');
  storeMetadata(db,'team:v1:create-repository:'+id,{member:member.id,project,name,pending:true});
  const repo=await call('POST','/user/repos',{name,private:true,auto_init:true,description:marker});
  if(typeof repo?.full_name!=='string'||!/^[-\w.]+\/[-\w.]+$/.test(repo.full_name)||repo.private!==true||typeof repo.default_branch!=='string')throw teamError(409,'GitHub hat keine vollständige Repository-Anlage bestätigt. Bitte im eigenen Konto prüfen.');
  const latest=metadata(db,'room:v1:project:'+project,{revision:0});
  if(latest.revision!==revision||latest.repository)throw teamError(409,'Repository angelegt, aber Projekteinstellungen inzwischen geändert. Bitte das Repository ausdrücklich verbinden.');
  const result={ok:true,repository:'https://github.com/'+repo.full_name,base:repo.default_branch};
  storeMetadata(db,'room:v1:project:'+project,{...latest,repository:result.repository,base:result.base,teamShared:true,revision:revision+1});
  storeMetadata(db,'team:v1:create-repository:'+id,{member:member.id,project,name,completed:true,result});
  teamEvent(db,{actor:member.id,project,kind:'repository',body:'Privates gemeinsames Repository angelegt'});return result;
 }
 return {configured:member=>!!tokens[member.id],perform,createRepository};
}
