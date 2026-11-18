import {mayRead} from './chat-scope.mjs';
import {taskThread} from './room-http.mjs';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {transaction} from './store.mjs';
import {listWorkspaces} from './workspaces.mjs';
import {reviewState,droppedApprovals} from './reviews.mjs';
import {requirePermission,can} from './project-roles.mjs';
import {changeOverview} from './change-overview.mjs';
import {taskView,assertTaskStatus,teamEvent,taskContract,invalidateTaskResult,storeMetadata,metadata} from './team-model.mjs';

const id=z.string().regex(/^[\w-]{1,100}$/);
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function taskWorkspaces(db,task){return listWorkspaces(db).filter(w=>w.taskId===task&&!w.archived);}
export function assertAssignment(db,task,assignee){
 if(taskWorkspaces(db,task).some(w=>w.owner!==assignee))throw fail(409,'Für diese Aufgabe ist noch ein Arbeitsbereich reserviert. Erst abstimmen und den Arbeitsbereich abschließen.');
}
// The task's own server-side state for the next step. The latest relevant job decides:
// a failure stays visible after reloading until a later step of the task succeeds.
const stepActions=['prepare','create-file','save-file','codex','update','check','preview','review','submit','integrate'];
const failureText={prepare:'Die Arbeitskopie konnte nicht angelegt werden.','create-file':'Die Datei konnte nicht angelegt werden.','save-file':'Die Datei konnte nicht gespeichert werden.',codex:'Die KI-Bearbeitung ist nicht fertig geworden.',update:'Die Arbeitskopie konnte nicht auf den neuen Stand gebracht werden.',check:'Die Tests sind nicht durchgelaufen.',preview:'Die Vorschau konnte nicht gebaut werden.',review:'Die Prüffassung konnte nicht erstellt werden.',submit:'Die Änderung konnte nicht zur Prüfung gegeben werden.',integrate:'Die Änderung konnte nicht zusammengeführt werden.'};
export function taskJobState(db,taskId){
 const jobs=db.prepare(`SELECT j.id,j.action,j.status,j.created,j.result,j.owner,m.name AS ownerName FROM jobs j JOIN members m ON m.id=j.owner
  WHERE j.status IN ('completed','failed','interrupted') AND j.action IN (${stepActions.map(()=>'?').join(',')}) AND (
   j.id IN (SELECT job FROM workspaces WHERE task=? AND archived=0)
   OR json_extract(j.payload,'$.worktree') IN (SELECT job FROM workspaces WHERE task=? AND archived=0)
   OR (j.action='integrate' AND json_extract(j.payload,'$.reviewJob') IN (SELECT r.id FROM jobs r JOIN workspaces w ON w.job=json_extract(r.payload,'$.worktree') WHERE w.task=?)))
  ORDER BY j.created DESC,j.rowid DESC LIMIT 1`).get(...stepActions,taskId,taskId,taskId);
 if(!jobs||jobs.status==='completed')return {lastFailure:null};
 let result={};try{result=JSON.parse(jobs.result??'{}')??{};}catch{}
 const detail=typeof result.error==='string'&&result.error.trim()?result.error.trim().slice(0,600):jobs.status==='interrupted'?'Die Verbindung zur Werkstatt ist abgerissen.':'';
 return {lastFailure:{id:jobs.id,action:jobs.action,owner:jobs.owner,ownerName:jobs.ownerName,at:jobs.created,interrupted:jobs.status==='interrupted',text:failureText[jobs.action],detail}};
}
// Whether a working copy holds a change of its own: saved or created files, a finished
// AI edit, uncommitted files seen by the runner, or an earlier submitted version.
// How far the copy is behind the shared main state, as last measured by the runner.
export function copyBehind(db,workspaceId){
 for(const j of db.prepare(`SELECT result FROM jobs WHERE json_extract(payload,'$.worktree')=? AND status='completed' AND action IN ('status','review','submit','update') ORDER BY created DESC,rowid DESC LIMIT 5`).all(workspaceId)){
  try{const r=JSON.parse(j.result??'{}');if(Number.isInteger(r.behind))return Math.max(0,r.behind);}catch{}
 }
 return 0;
}
export function copyHasChange(db,workspaceId){
 return db.prepare(`SELECT action,result FROM jobs WHERE json_extract(payload,'$.worktree')=? AND status='completed'
  AND action IN ('save-file','create-file','codex','status','review','submit') ORDER BY created DESC`).all(workspaceId).some(j=>{
  if(j.action!=='status')return true;
  try{const r=JSON.parse(j.result??'{}');return typeof r.status==='string'&&r.status.trim()!=='';}catch{return false;}
 });
}
// A live preview (app with server) runs at most an hour and only until the next live preview on
// the same Werkstatt. An expired link is not offered as if it still worked.
function previewLink(db,preview){
 if(typeof preview?.url!=='string')return {preview:null};
 if(preview.scope!=='live')return {preview:preview.url};
 const live=metadata(db,'preview:v1:live:'+(preview.url.match(/\/([\w-]{40,60})\/?$/)?.[1]??''));
 return live&&live.expires>Date.now()?{preview:preview.url}:{preview:null,previewExpired:true};
}
export async function collaborationRoute({route,method,req,url,db,user,send,readJSON,parse}){
 if(!['/api/collaboration','/api/collaboration/task','/api/collaboration/task-diff','/api/collaboration/change'].includes(route))return false;
 const member=user(req);
 // A review diff is shared only after a completed task-bound review/submit.
 // Never expose draft, file content, job output or another task's worktree.
 if(route==='/api/collaboration/task-diff'){
  if(method!=='GET')throw fail(405,'Methode nicht erlaubt.');
  const taskId=parse(id,url.searchParams.get('task'));
  const reviewId=parse(id,url.searchParams.get('review'));
  const task=db.prepare('SELECT id,project FROM tasks WHERE id=?').get(taskId);
  if(!task)throw fail(404,'Aufgabe fehlt.');requirePermission(db,member,task.project,'view');
  const job=db.prepare(`SELECT j.id,j.owner,j.created,j.result,m.name AS ownerName FROM jobs j
   JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree')
   JOIN members m ON m.id=j.owner
   WHERE j.id=? AND w.task=? AND j.status='completed' AND j.action IN ('review','submit')
   AND j.owner=(SELECT owner FROM jobs WHERE id=w.job)
   LIMIT 1`).get(reviewId,taskId);
  if(!job)throw fail(404,'Kein fertiger Prüfstand für diese Aufgabe.');
  let result={};try{result=JSON.parse(job.result??'{}')??{};}catch{}
  const diff=typeof result.diff==='string'?result.diff:'';
  const complete=typeof result.diff==='string'&&result.diffTruncated!==true&&diff.length<50000;
  const contractSnapshot=JSON.parse(db.prepare('SELECT payload FROM jobs WHERE id=?').get(job.id).payload).contractSnapshot??null;
  send({review:job.id,owner:job.owner,ownerName:job.ownerName,state:reviewState(db,{...job,action:'review',status:'completed'}),checks:typeof result.checks==='string'?result.checks:'Kein Testprotokoll vorhanden.',published:result.published===true,commit:typeof result.commit==='string'&&/^[a-f0-9]{40,64}$/.test(result.commit)?result.commit:null,
   created:job.created,complete,diff:complete?diff:'',limited:!complete,contractSnapshot,...previewLink(db,result.preview)});return true;
 }
 if(route==='/api/collaboration/change'){
  if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
  const value=parse(z.object({workspace:id,revision:z.number().int().min(0),kind:z.enum(['unspecified','feature','fix','maintenance']),body:z.string().trim().max(4000)}),await readJSON(req));
  transaction(db,()=>{
   const workspace=db.prepare('SELECT j.owner FROM workspaces w JOIN jobs j ON j.id=w.job WHERE w.job=?').get(value.workspace);
   if(!workspace)throw fail(404,'Arbeitskopie fehlt.');if(workspace.owner!==member.id)throw fail(403,'Nur die eigene Änderung kann beschrieben werden.');
   const note=db.prepare('SELECT revision FROM change_notes WHERE workspace=?').get(value.workspace);
   if((note?.revision??0)!==value.revision)throw fail(409,'Beschreibung inzwischen geändert. Dein Entwurf bleibt erhalten; öffne zum Vergleichen einen zweiten Tab.');
   db.prepare('INSERT INTO change_notes(workspace,kind,body,revision,author,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(workspace) DO UPDATE SET kind=excluded.kind,body=excluded.body,revision=excluded.revision,author=excluded.author,updated=excluded.updated').run(value.workspace,value.kind,value.body,value.revision+1,member.id,Date.now());
  });send({ok:true});return true;
 }
 if(route==='/api/collaboration'&&method==='GET'){
  const project=parse(id,url.searchParams.get('project')??'all');
  if(project!=='all'&&!db.prepare('SELECT id FROM projects WHERE id=?').get(project))throw fail(404,'Projekt fehlt.');
  if(project!=='all')requirePermission(db,member,project,'view');
  const visible=p=>can(db,member,p,'view');
  const tasks=db.prepare(`SELECT t.*,(SELECT count(*) FROM task_comments c WHERE c.task=t.id) AS commentCount FROM tasks t WHERE (?='all' OR project=?) ORDER BY created DESC,id`).all(project,project);
  const workspaces=listWorkspaces(db).filter(w=>project==='all'||w.project===project);
  const shown=workspaces.filter(w=>visible(w.project));
  send({tasks:tasks.filter(t=>visible(t.project)),workspaces:shown,changes:changeOverview(db,shown)});return true;
 }
 if(route==='/api/collaboration/task'&&method==='GET'){
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(parse(id,url.searchParams.get('id')));if(!task)throw fail(404,'Aufgabe fehlt.');requirePermission(db,member,task.project,'view');
  const reviews=db.prepare("SELECT j.*,m.name AS ownerName FROM jobs j JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree') JOIN members m ON m.id=j.owner WHERE w.task=? AND j.action IN ('review','submit') AND j.status='completed' ORDER BY j.created DESC,j.id").all(task.id).map(j=>({id:j.id,owner:j.owner,ownerName:j.ownerName,created:j.created,commit:JSON.parse(j.result??'{}').commit??'',state:reviewState(db,j),dropped:droppedApprovals(db,j),mergeWait:metadata(db,'team:v1:merge-wait:'+j.id)??null}));
  // This is the existing single private Studio team, not a public/tenant API.
  const workspaces=taskWorkspaces(db,task.id);
  const briefRow=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('taskflow:v1:brief:'+task.id);
  const brief={revision:briefRow?JSON.parse(briefRow.value).revision:0};
  const sourceMeta=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('room:v1:task-source:'+task.id);
  const sourceId=sourceMeta?JSON.parse(sourceMeta.value).message:null;
  // The message a task came from may sit in someone's private chat; then only its participants see it here.
  const source=sourceId&&mayRead(db,sourceId,member.id)?db.prepare("SELECT m.id,m.body,m.created,m.channel,n.name AS authorName FROM messages m JOIN members n ON n.id=m.author WHERE m.id=? AND (m.channel=? OR m.channel='general')").get(sourceId,task.project):null;
  const activeJobs=db.prepare(`SELECT j.id,j.action,j.status,m.name AS ownerName FROM jobs j JOIN members m ON m.id=j.owner WHERE j.status IN ('queued','running','cancelling') AND (json_extract(j.payload,'$.worktree') IN (SELECT job FROM workspaces WHERE task=?) OR (j.action='integrate' AND json_extract(j.payload,'$.reviewJob') IN (SELECT r.id FROM jobs r JOIN workspaces w ON w.job=json_extract(r.payload,'$.worktree') WHERE w.task=?))) AND j.action NOT IN ('files','read-file','save-file') ORDER BY j.created`).all(task.id,task.id);
  // A queued job of this task may wait behind someone else's work on the same Werkstatt.
  for(const j of activeJobs)if(j.status==='queued'){const ahead=db.prepare("SELECT m.name FROM jobs o JOIN members m ON m.id=o.owner WHERE o.device=(SELECT device FROM jobs WHERE id=?) AND o.status IN ('running','cancelling') AND o.id<>? LIMIT 1").get(j.id,j.id);if(ahead)j.behind=ahead.name;}
  send({task:taskView(db,task),brief,reviews,activeJobs,...taskJobState(db,task.id),source,changes:changeOverview(db,workspaces),comments:db.prepare('SELECT c.id,c.author,m.name AS authorName,c.body,c.created FROM task_comments c JOIN members m ON m.id=c.author WHERE c.task=? ORDER BY c.created,c.rowid').all(task.id),thread:taskThread(db,task.id,member),workspaces:workspaces.map(w=>({...w,changed:copyHasChange(db,w.id),behind:copyBehind(db,w.id)}))});return true;
 }
 if(route!=='/api/collaboration/task'||method!=='POST')throw fail(405,'Methode nicht erlaubt.');
 const value=parse(z.discriminatedUnion('action',[
  z.object({action:z.literal('comment'),task:id,id,body:z.string().trim().min(1).max(4000)}),
  z.object({action:z.literal('claim'),task:id}),z.object({action:z.literal('release'),task:id}),
  z.object({action:z.literal('handoff'),task:id,assignee:id.nullable(),expectedAssignee:id.nullable()}),
  z.object({action:z.literal('brief'),task:id,title:z.string().trim().min(1).max(160),description:z.string().trim().max(12000),revision:z.number().int().min(0)}),
  z.object({action:z.literal('status'),task:id,status:z.enum(['todo','doing','review','done'])})
 ]),await readJSON(req));
 {const project=db.prepare('SELECT project FROM tasks WHERE id=?').get(value.task)?.project;if(project)requirePermission(db,user(req),project,value.action==='comment'?'talk':'develop');}
 transaction(db,()=>{
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(value.task);if(!task)throw fail(404,'Aufgabe fehlt.');
  if(value.action==='brief'){
   const metaKey='taskflow:v1:brief:'+task.id;
   const prior=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(metaKey);
   const revision=prior?JSON.parse(prior.value).revision:0;
   if(revision!==value.revision)throw fail(409,'Der Auftrag wurde inzwischen geändert. Bitte die aktuelle Fassung prüfen.');
   if(task.title===value.title&&task.description===value.description)return;
   db.prepare('UPDATE tasks SET title=?,description=? WHERE id=?').run(value.title,value.description,task.id);
   const contract=taskContract(db,task);storeMetadata(db,'team:v1:task:'+task.id,{...contract,revision:contract.revision+1});invalidateTaskResult(db,task);
   db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(metaKey,JSON.stringify({revision:revision+1,updatedBy:member.id,updated:Date.now()}));
  }else if(value.action==='handoff'){
   if(task.status==='done')throw fail(409,'Abgeschlossene Aufgabe zuerst wieder öffnen.');
   if(task.assignee!==value.expectedAssignee)throw fail(409,'Die Zuständigkeit hat sich inzwischen geändert. Neu laden, bevor du jemanden übergehst.');
   if(task.assignee&&task.assignee!==member.id)throw fail(403,'Nur die zuständige Person kann eine bereits übernommene Aufgabe weitergeben.');
   if(value.assignee&&!db.prepare('SELECT id FROM members WHERE id=?').get(value.assignee))throw fail(400,'Dieses Teammitglied ist nicht verfügbar.');
   if(task.assignee===value.assignee)return;
   if(value.assignee)assertAssignment(db,task.id,value.assignee);
   else if(taskWorkspaces(db,task.id).length)throw fail(409,'Erst den eigenen Arbeitsbereich abschliessen, bevor die Zuständigkeit entfernt wird.');
   db.prepare('UPDATE tasks SET assignee=? WHERE id=?').run(value.assignee,task.id);
  }else if(value.action==='comment'){
   const existing=db.prepare('SELECT * FROM task_comments WHERE id=?').get(value.id);
   if(existing){if(existing.author!==member.id||existing.task!==task.id||existing.body!==value.body)throw fail(409,'Dieser Kommentar wurde bereits mit anderem Inhalt gesendet.');return;}
   db.prepare('INSERT INTO task_comments VALUES(?,?,?,?,?)').run(value.id,task.id,member.id,value.body,Date.now());
  }else if(value.action==='claim'){
   if(task.status==='done')throw fail(409,'Diese Aufgabe ist bereits abgeschlossen.');
   if(task.assignee&&task.assignee!==member.id){const owner=db.prepare('SELECT name FROM members WHERE id=?').get(task.assignee);throw fail(409,`${owner.name} hat diese Aufgabe bereits übernommen. Bitte direkt an der Aufgabe abstimmen.`);}
   assertAssignment(db,task.id,member.id);
   if(task.assignee===member.id&&task.status!=='todo')return;
   db.prepare("UPDATE tasks SET assignee=?,status=CASE WHEN status='todo' THEN 'doing' ELSE status END WHERE id=?").run(member.id,task.id);
  }else if(value.action==='status'){
   if(task.status===value.status)return;
   assertTaskStatus(db,task,value.status,member.id);
   db.prepare('UPDATE tasks SET status=? WHERE id=?').run(value.status,task.id);
  }else{
   if(task.assignee!==member.id)throw fail(403,'Nur die zuständige Person kann ihre Aufgabe freigeben.');
   if(taskWorkspaces(db,task.id).length)throw fail(409,'Schließe zuerst deinen Arbeitsbereich ab. Deine Dateien bleiben dabei erhalten.');
   db.prepare("UPDATE tasks SET assignee=NULL,status=CASE WHEN status='doing' THEN 'todo' ELSE status END WHERE id=?").run(task.id);
  }
  db.prepare('INSERT INTO activities VALUES(?,?,?,?)').run(randomUUID(),member.id,`${value.action==='comment'?'Kommentar zu':value.action==='claim'?'Übernommen:':value.action==='status'?'Status geändert:':value.action==='brief'?'Auftrag präzisiert:':value.action==='handoff'?'Auftrag übergeben:':'Freigegeben:'} ${task.title}`,Date.now());
  teamEvent(db,{actor:member.id,project:task.project,task:task.id,kind:value.action,body:`${value.action==='status'?'Status: '+value.status:value.action==='comment'?'Neuer Kommentar':value.action==='brief'?'Aufgabe präzisiert':'Zuständigkeit geändert'} · ${task.title}`});
 });
 send({ok:true});return true;
}
