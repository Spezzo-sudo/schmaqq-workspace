import {randomUUID} from 'node:crypto';
import {reviewState} from './reviews.mjs';

// Versioned domain records reuse the existing persistence contract. All reads and
// transitions live here; UI and legacy endpoints must use the same rules.
export const teamError=(status,message)=>Object.assign(new Error(message),{status});
export function metadata(db,key,fallback=null){const r=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(key);return r?JSON.parse(r.value):fallback;}
export function storeMetadata(db,key,value){db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value));}
export function teamEvent(db,{actor,project,task=null,kind,body}){
 const value={id:randomUUID(),actor,project,task,kind,body,created:Date.now()};
 storeMetadata(db,'team:v1:event:'+value.id,value);return value;
}
// Reading files in a task copy keeps the task kind; only work that can change the copy
// (queued, running or finished, also interrupted) makes it a code task with code gates.
const changingActions=['save-file','create-file','codex','review','submit'];
export function hasCodeChanges(db,task){
 return !!db.prepare(`SELECT j.id FROM jobs j JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree')
 WHERE w.task=? AND j.action IN (${changingActions.map(()=>'?').join(',')}) AND j.status!='cancelled'
 AND NOT (j.action IN ('save-file','create-file') AND j.status='failed') LIMIT 1`).get(task.id,...changingActions);
}
export function taskContract(db,task){
 const saved=metadata(db,'team:v1:task:'+task.id,{});
 return {criteria:'',requiresReview:false,blocked:'',cancelled:false,revision:0,...saved,kind:hasCodeChanges(db,task)?'code':saved.kind??'general'};
}
export function latestCodeResult(db,task){
 const job=db.prepare(`SELECT j.* FROM jobs j JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree')
 WHERE w.task=? AND j.action IN ('review','submit') AND j.status='completed' ORDER BY j.created DESC,j.rowid DESC LIMIT 1`).get(task.id);
 if(!job)return null;
 const result=JSON.parse(job.result??'{}'),payload=JSON.parse(job.payload);
 const integration=db.prepare("SELECT * FROM jobs WHERE action='integrate' AND status='completed' AND json_extract(payload,'$.reviewJob')=? ORDER BY created DESC,rowid DESC LIMIT 1").get(job.id);
 const changed=!!db.prepare("SELECT id FROM jobs WHERE json_extract(payload,'$.worktree')=? AND rowid>(SELECT rowid FROM jobs WHERE id=?) AND action IN ('save-file','create-file','codex') AND status IN ('running','completed','interrupted','cancelling') LIMIT 1").get(payload.worktree,job.id);
 return {id:job.id,owner:job.owner,commit:result.commit,branch:result.branch,created:job.created,shared:job.action==='submit'&&result.published===true,state:reviewState(db,job),integrated:!!integration||result.githubMerged===true,changedAfter:changed,workflow:result.workflow??'direct',contractRevision:payload.contractRevision??0};
}
export function latestGeneralResult(db,task){return metadata(db,'team:v1:result:'+task.id);}
export function completion(db,task){
 const contract=taskContract(db,task),result=contract.kind==='code'?latestCodeResult(db,task):latestGeneralResult(db,task);
 const missing=[];
 if(contract.cancelled)missing.push('Diese Aufgabe wurde abgebrochen.');
 if(contract.blocked)missing.push('Blockierung zuerst klären: '+contract.blocked);
 if(contract.kind==='code'){
  if(!result)missing.push('Ein getesteter Prüfstand fehlt.');
  else{
   if(!result.shared)missing.push('Der Code ist noch nicht als Branch mit dem Team geteilt.');
   if(result.state!=='approved')missing.push('Die Freigabe einer zweiten Person fehlt.');
   if(!result.integrated)missing.push('Der freigegebene Stand ist noch nicht zusammengeführt.');
   if(result.changedAfter)missing.push('Nach dem Prüfstand wurde weitergearbeitet. Einen neuen Stand einreichen.');
   if(result.contractRevision!==contract.revision)missing.push('Die Abschlussbedingungen wurden geändert. Einen neuen Prüfstand erstellen.');
  }
 }else if(!result)missing.push('Das erreichte Ergebnis bitte zuerst festhalten.');
 else{
  if(result.contractRevision!==contract.revision)missing.push('Das Ergebnis gehört zu früheren Abschlussbedingungen. Erneut einreichen.');
  if(contract.requiresReview&&result.state!=='approved')missing.push('Die Freigabe einer zweiten Person fehlt.');
 }
 return {ready:missing.length===0,missing,result};
}
export function assertTaskStatus(db,task,status,actor){
 const contract=taskContract(db,task);
 if(contract.cancelled)throw teamError(409,'Abgebrochene Aufgabe zuerst wieder öffnen.');
 if(status==='done'){
  const gate=completion(db,task);if(!gate.ready)throw teamError(409,gate.missing.join(' '));
 }
 if(status==='review'){
  const result=contract.kind==='code'?latestCodeResult(db,task):latestGeneralResult(db,task);
  if(!result||(contract.kind==='code'&&!result.shared))throw teamError(409,'Zuerst ein Ergebnis mit dem Team zur Prüfung teilen.');
 }
 if(task.assignee&&task.assignee!==actor&&status!=='review')throw teamError(403,'Statusänderungen stimmen wir mit der verantwortlichen Person ab. Aufgabe bei Bedarf ausdrücklich übernehmen.');
}
export function taskView(db,task){
 const contract=taskContract(db,task),gate=completion(db,task);
 return {...task,contract,completion:gate};
}
export function invalidateTaskResult(db,task){
 if(task.status==='review'||task.status==='done')db.prepare("UPDATE tasks SET status='doing' WHERE id=?").run(task.id);
}
