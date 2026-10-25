import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {transaction} from './store.mjs';
import {listWorkspaces} from './workspaces.mjs';
import {reviewState} from './reviews.mjs';
import {changeOverview} from './change-overview.mjs';

const id=z.string().regex(/^[\w-]{1,100}$/);
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function taskWorkspaces(db,task){return listWorkspaces(db).filter(w=>w.taskId===task&&!w.archived);}
export function assertAssignment(db,task,assignee){
 if(taskWorkspaces(db,task).some(w=>w.owner!==assignee))throw fail(409,'Für diese Aufgabe ist noch ein Arbeitsbereich reserviert. Erst abstimmen und den Arbeitsbereich abschließen.');
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
  const task=db.prepare('SELECT id FROM tasks WHERE id=?').get(taskId);
  if(!task)throw fail(404,'Aufgabe fehlt.');
  const job=db.prepare(`SELECT j.id,j.owner,j.created,j.result,m.name AS ownerName FROM jobs j
   JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree')
   JOIN members m ON m.id=j.owner
   WHERE j.id=? AND w.task=? AND j.status='completed' AND j.action IN ('review','submit')
   AND w.archived=0 AND j.owner=(SELECT owner FROM jobs WHERE id=w.job)
   LIMIT 1`).get(reviewId,taskId);
  if(!job)throw fail(404,'Kein fertiger Prüfstand für diese Aufgabe.');
  let result={};try{result=JSON.parse(job.result??'{}')??{};}catch{}
  const diff=typeof result.diff==='string'?result.diff:'';
  const complete=typeof result.diff==='string'&&result.diffTruncated!==true&&diff.length<50000;
  send({review:job.id,ownerName:job.ownerName,commit:typeof result.commit==='string'&&/^[a-f0-9]{40,64}$/.test(result.commit)?result.commit:null,
   created:job.created,complete,diff:complete?diff:'',limited:!complete});return true;
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
  const tasks=db.prepare(`SELECT t.*,(SELECT count(*) FROM task_comments c WHERE c.task=t.id) AS commentCount FROM tasks t WHERE (?='all' OR project=?) ORDER BY created DESC,id`).all(project,project);
  const workspaces=listWorkspaces(db).filter(w=>project==='all'||w.project===project);
  send({tasks,workspaces,changes:changeOverview(db,workspaces)});return true;
 }
 if(route==='/api/collaboration/task'&&method==='GET'){
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(parse(id,url.searchParams.get('id')));if(!task)throw fail(404,'Aufgabe fehlt.');
  const reviews=db.prepare("SELECT j.*,m.name AS ownerName FROM jobs j JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree') JOIN members m ON m.id=j.owner WHERE w.task=? AND j.action IN ('review','submit') AND j.status='completed' ORDER BY j.created DESC,j.id").all(task.id).map(j=>({id:j.id,owner:j.owner,ownerName:j.ownerName,created:j.created,commit:JSON.parse(j.result??'{}').commit??'',state:reviewState(db,j)}));
  // This is the existing single private Studio team, not a public/tenant API.
  const workspaces=taskWorkspaces(db,task.id);
  const briefRow=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('taskflow:v1:brief:'+task.id);
  const brief={revision:briefRow?JSON.parse(briefRow.value).revision:0};
  send({task,brief,reviews,changes:changeOverview(db,workspaces),comments:db.prepare('SELECT c.id,c.author,m.name AS authorName,c.body,c.created FROM task_comments c JOIN members m ON m.id=c.author WHERE c.task=? ORDER BY c.created,c.rowid').all(task.id),workspaces});return true;
 }
 if(route!=='/api/collaboration/task'||method!=='POST')throw fail(405,'Methode nicht erlaubt.');
 const value=parse(z.discriminatedUnion('action',[
  z.object({action:z.literal('comment'),task:id,id,body:z.string().trim().min(1).max(4000)}),
  z.object({action:z.literal('claim'),task:id}),z.object({action:z.literal('release'),task:id}),
  z.object({action:z.literal('handoff'),task:id,assignee:id.nullable(),expectedAssignee:id.nullable()}),
  z.object({action:z.literal('brief'),task:id,title:z.string().trim().min(1).max(160),description:z.string().trim().max(12000),revision:z.number().int().min(0)}),
  z.object({action:z.literal('status'),task:id,status:z.enum(['todo','doing','review','done'])})
 ]),await readJSON(req));
 transaction(db,()=>{
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(value.task);if(!task)throw fail(404,'Aufgabe fehlt.');
  if(value.action==='brief'){
   const metaKey='taskflow:v1:brief:'+task.id;
   const prior=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(metaKey);
   const revision=prior?JSON.parse(prior.value).revision:0;
   if(revision!==value.revision)throw fail(409,'Der Auftrag wurde inzwischen geändert. Bitte die aktuelle Fassung prüfen.');
   if(task.title===value.title&&task.description===value.description)return;
   db.prepare('UPDATE tasks SET title=?,description=? WHERE id=?').run(value.title,value.description,task.id);
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
   db.prepare('UPDATE tasks SET status=? WHERE id=?').run(value.status,task.id);
  }else{
   if(task.assignee!==member.id)throw fail(403,'Nur die zuständige Person kann ihre Aufgabe freigeben.');
   if(taskWorkspaces(db,task.id).length)throw fail(409,'Schließe zuerst deinen Arbeitsbereich ab. Deine Dateien bleiben dabei erhalten.');
   db.prepare("UPDATE tasks SET assignee=NULL,status=CASE WHEN status='doing' THEN 'todo' ELSE status END WHERE id=?").run(task.id);
  }
  db.prepare('INSERT INTO activities VALUES(?,?,?,?)').run(randomUUID(),member.id,`${value.action==='comment'?'Kommentar zu':value.action==='claim'?'Übernommen:':value.action==='status'?'Status geändert:':value.action==='brief'?'Auftrag präzisiert:':value.action==='handoff'?'Auftrag übergeben:':'Freigegeben:'} ${task.title}`,Date.now());
 });
 send({ok:true});return true;
}
