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
 if(!['/api/collaboration','/api/collaboration/task'].includes(route))return false;
 const member=user(req);
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
  send({task,reviews,changes:changeOverview(db,workspaces),comments:db.prepare('SELECT c.id,c.author,m.name AS authorName,c.body,c.created FROM task_comments c JOIN members m ON m.id=c.author WHERE c.task=? ORDER BY c.created,c.rowid').all(task.id),workspaces});return true;
 }
 if(route!=='/api/collaboration/task'||method!=='POST')throw fail(405,'Methode nicht erlaubt.');
 const value=parse(z.discriminatedUnion('action',[
  z.object({action:z.literal('comment'),task:id,id,body:z.string().trim().min(1).max(4000)}),
  z.object({action:z.literal('claim'),task:id}),z.object({action:z.literal('release'),task:id}),
  z.object({action:z.literal('status'),task:id,status:z.enum(['todo','doing','review','done'])})
 ]),await readJSON(req));
 transaction(db,()=>{
  const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(value.task);if(!task)throw fail(404,'Aufgabe fehlt.');
  if(value.action==='comment'){
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
  db.prepare('INSERT INTO activities VALUES(?,?,?,?)').run(randomUUID(),member.id,`${value.action==='comment'?'Kommentar zu':value.action==='claim'?'Übernommen:':value.action==='status'?'Status geändert:':'Freigegeben:'} ${task.title}`,Date.now());
 });
 send({ok:true});return true;
}
