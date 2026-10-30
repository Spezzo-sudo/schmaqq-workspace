import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {transaction} from './store.mjs';
import {metadata,storeMetadata,teamEvent,taskContract,taskView,completion,latestGeneralResult,invalidateTaskResult,teamError,hasCodeChanges,quietJobActions} from './team-model.mjs';
const id=z.string().regex(/^[\w-]{1,100}$/),revision=z.number().int().min(0);
const actions=z.discriminatedUnion('action',[
 z.object({action:z.literal('read'),event:id}),
 z.object({action:z.literal('contract'),task:id,revision,kind:z.enum(['general','code']),criteria:z.string().trim().max(4000),requiresReview:z.boolean(),title:z.string().trim().min(1).max(160).optional(),description:z.string().trim().max(12000).optional(),briefRevision:revision.optional()}),
 z.object({action:z.literal('block'),task:id,revision,reason:z.string().trim().max(2000)}),
 z.object({action:z.literal('takeover'),task:id,expectedAssignee:id.nullable(),reason:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('result'),task:id,id,body:z.string().trim().min(1).max(12000),revision}),
 z.object({action:z.literal('vote'),task:id,result:id,decision:z.enum(['approved','changes']),body:z.string().trim().max(4000)}),
 z.object({action:z.literal('cancel'),task:id,revision,reason:z.string().trim().min(1).max(2000)}),
 z.object({action:z.literal('reopen'),task:id,revision}),
 z.object({action:z.literal('note'),project:id,note:id,revision,title:z.string().trim().min(1).max(160),body:z.string().trim().min(1).max(12000),archived:z.boolean()}),
 z.object({action:z.literal('project'),project:id,revision,title:z.string().trim().min(1).max(160),description:z.string().trim().max(12000),archived:z.boolean(),base:z.string().regex(/^[\w./-]{1,100}$/).refine(s=>!s.includes('..')&&!s.startsWith('-')).optional(),workflow:z.enum(['direct','pull-request']).optional()})
]);
export function createTeamRoute({db,user,readJSON,parse}){
 return async({route,method,req,url,send})=>{
  if(!['/api/team','/api/team/knowledge','/api/team/results'].includes(route))return false;const member=user(req);
  if(route==='/api/team/results'){
   if(method!=='GET')throw teamError(405,'Methode nicht erlaubt.');
   const task=parse(id,url.searchParams.get('task'));if(!db.prepare('SELECT id FROM tasks WHERE id=?').get(task))throw teamError(404,'Aufgabe fehlt.');
   const history=db.prepare("SELECT value FROM workspace_meta WHERE key LIKE 'team:v1:result-history:%' AND json_extract(value,'$.task')=? ORDER BY json_extract(value,'$.created') DESC LIMIT 1000").all(task).map(r=>JSON.parse(r.value));
   send({history});return true;
  }
  if(route==='/api/team/knowledge'){
   if(method!=='GET')throw teamError(405,'Methode nicht erlaubt.');
   const project=parse(id,url.searchParams.get('project'));
   const notes=db.prepare("SELECT d.*,m.value AS meta FROM documents d JOIN workspace_meta m ON m.key='room:v1:note:'||d.id WHERE json_extract(m.value,'$.project')=? ORDER BY d.updated DESC LIMIT 1000").all(project).map(({meta,...n})=>({...n,...JSON.parse(meta)}));
   const versions=db.prepare("SELECT value FROM workspace_meta WHERE key LIKE 'team:v1:note-version:%' AND json_extract(value,'$.project')=? ORDER BY json_extract(value,'$.revision') DESC LIMIT 1000").all(project).map(r=>JSON.parse(r.value));
   send({notes,versions});return true;
  }
  if(method==='GET'){
   const project=url.searchParams.get('project');
   const tasks=db.prepare('SELECT * FROM tasks WHERE (? IS NULL OR project=?) ORDER BY created DESC,id').all(project,project).map(t=>taskView(db,t));
   const quiet=quietJobActions.map(()=>'?').join(',');
   const events=db.prepare(`SELECT value FROM workspace_meta WHERE key LIKE 'team:v1:event:%' AND (? IS NULL OR json_extract(value,'$.project')=?) AND json_extract(value,'$.kind') NOT IN (${quiet}) ORDER BY json_extract(value,'$.created') DESC,rowid DESC LIMIT 40`).all(project,project,...quietJobActions).map(r=>JSON.parse(r.value));
   const unread=events.filter(e=>e.actor!==member.id&&!metadata(db,'team:v1:read:'+member.id+':'+e.id));
   // Only kind and state of unfinished work, never payloads or results.
   const active=db.prepare(`SELECT j.id,j.owner,j.project,j.action,j.status,j.created,w.task FROM jobs j LEFT JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree')
    WHERE j.status IN ('queued','running','cancelling') AND (? IS NULL OR j.project=?) ORDER BY j.created DESC LIMIT 20`).all(project,project);
   send({tasks,events,unread,active});return true;
  }
  if(method!=='POST')throw teamError(405,'Methode nicht erlaubt.');
  const v=parse(actions,await readJSON(req));
  transaction(db,()=>{
   if(v.action==='read'){
    if(!metadata(db,'team:v1:event:'+v.event))throw teamError(404,'Hinweis fehlt.');
    storeMetadata(db,'team:v1:read:'+member.id+':'+v.event,{at:Date.now()});return;
   }
   if(v.action==='note'){
    const note=db.prepare('SELECT * FROM documents WHERE id=?').get(v.note),meta=metadata(db,'room:v1:note:'+v.note);
    if(!note||meta?.project!==v.project)throw teamError(404,'Wissenseintrag gehört nicht zu diesem Projekt.');
    if(note.revision!==v.revision)throw teamError(409,'Dieser Eintrag wurde inzwischen geändert. Dein Entwurf bleibt erhalten.');
    storeMetadata(db,`team:v1:note-version:${note.id}:${note.revision}`,{...note,...meta});
    db.prepare('UPDATE documents SET title=?,body=?,author=?,revision=revision+1,updated=? WHERE id=?').run(v.title,v.body,member.id,Date.now(),note.id);
    storeMetadata(db,'room:v1:note:'+note.id,{...meta,archived:v.archived});
    teamEvent(db,{actor:member.id,project:v.project,kind:'knowledge',body:(v.archived?'Wissen archiviert: ':'Wissen aktualisiert: ')+v.title});return;
   }
   if(v.action==='project'){
    const p=db.prepare('SELECT * FROM projects WHERE id=?').get(v.project);if(!p)throw teamError(404,'Projekt fehlt.');
    const meta=metadata(db,'room:v1:project:'+p.id,{revision:0,repository:null});
    if(meta.revision!==v.revision)throw teamError(409,'Projekteinstellungen inzwischen geändert. Bitte neu laden.');
    if(v.archived&&db.prepare("SELECT id FROM tasks WHERE project=? AND status!='done'").get(p.id))throw teamError(409,'Vor der Archivierung offene Aufgaben abschließen oder abbrechen.');
    db.prepare('UPDATE projects SET title=?,description=? WHERE id=?').run(v.title,v.description,p.id);
    if((v.base&&v.base!==(meta.base??'main')||v.workflow&&v.workflow!==(meta.workflow??'pull-request'))){
     if(member.role!=='owner'&&meta.createdBy!==member.id)throw teamError(403,'Projektregeln ändert die Projekt- oder Workspace-Verwaltung.');
     if(db.prepare('SELECT w.job FROM workspaces w JOIN jobs j ON j.id=w.job WHERE j.project=? AND w.archived=0').get(p.id))throw teamError(409,'Aktive Bearbeitungen vor einer Änderung der Projektregeln abschließen.');
    }
    storeMetadata(db,'room:v1:project:'+p.id,{...meta,base:v.base??meta.base??'main',workflow:v.workflow??meta.workflow??'pull-request',archived:v.archived,revision:meta.revision+1});
    teamEvent(db,{actor:member.id,project:p.id,kind:'project',body:'Projekt aktualisiert: '+v.title});return;
   }
   const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(v.task);if(!task)throw teamError(404,'Aufgabe fehlt.');
   const contract=taskContract(db,task),key='team:v1:task:'+task.id;
   if(task.status==='done'&&['contract','result','vote','block'].includes(v.action))throw teamError(409,'Abgeschlossene Aufgabe zuerst ausdrücklich wieder öffnen.');
   if('revision' in v&&v.revision!==contract.revision)throw teamError(409,'Die Aufgabe wurde inzwischen geändert. Bitte aktuelle Fassung laden; dein Entwurf bleibt erhalten.');
   if(v.action==='takeover'){
    if(task.assignee!==v.expectedAssignee)throw teamError(409,'Zuständigkeit inzwischen geändert. Bitte neu laden.');
    if(task.status==='done'||contract.cancelled)throw teamError(409,'Aufgabe zuerst wieder öffnen.');
    const copies=db.prepare('SELECT w.*,j.device,d.seen FROM workspaces w JOIN jobs j ON j.id=w.job JOIN devices d ON d.id=j.device WHERE w.task=? AND w.archived=0').all(task.id);
    for(const copy of copies){
     const active=db.prepare("SELECT * FROM jobs WHERE (id=? OR json_extract(payload,'$.worktree')=?) AND status IN ('queued','running','cancelling')").all(copy.job,copy.job);
     for(const job of active){
      if(job.status!=='queued'&&(copy.seen>Date.now()-120000||job.heartbeat>Date.now()-120000))throw teamError(409,'Es läuft noch ein Auftrag. Zuerst stoppen und den bestätigten Abschluss abwarten.');
      storeMetadata(db,'team:v1:interrupted-job:'+job.id,{...job,lease:undefined,reason:v.reason,at:Date.now()});
      db.prepare('UPDATE jobs SET status=?,lease=NULL WHERE id=?').run(job.status==='queued'?'cancelled':'interrupted',job.id);
     }
    }
    for(const copy of copies)db.prepare('UPDATE workspaces SET archived=1,revision=revision+1 WHERE job=?').run(copy.job);
    storeMetadata(db,'team:v1:handoff:'+randomUUID(),{task:task.id,from:task.assignee,to:member.id,reason:v.reason,copies:copies.map(c=>c.job),created:Date.now()});
    db.prepare("UPDATE tasks SET assignee=?,status='doing' WHERE id=?").run(member.id,task.id);
   }else if(v.action==='contract'){
    if(task.assignee&&task.assignee!==member.id)throw teamError(403,'Abschlussbedingungen ändert die verantwortliche Person.');
    if(v.kind==='general'&&hasCodeChanges(db,task))throw teamError(409,'In der Arbeitskopie wurden bereits Dateien geändert; Aufgabe bleibt eine Codeaufgabe.');
    if(v.title!==undefined){
     const key='taskflow:v1:brief:'+task.id,brief=metadata(db,key,{revision:0});
     if(v.briefRevision!==brief.revision)throw teamError(409,'Die Beschreibung wurde inzwischen geändert. Dein Entwurf bleibt erhalten.');
     db.prepare('UPDATE tasks SET title=?,description=? WHERE id=?').run(v.title,v.description??task.description,task.id);
     storeMetadata(db,key,{revision:brief.revision+1,updatedBy:member.id,updated:Date.now()});
    }
    storeMetadata(db,key,{...contract,kind:v.kind,criteria:v.criteria,requiresReview:v.kind==='code'||v.requiresReview,revision:contract.revision+1});invalidateTaskResult(db,task);
   }else if(v.action==='block'){
    storeMetadata(db,key,{...contract,blocked:v.reason});
   }else if(v.action==='cancel'||v.action==='reopen'){
    if(task.assignee&&task.assignee!==member.id)throw teamError(403,'Aufgabe zuerst ausdrücklich übernehmen.');
    if(v.action==='cancel'&&db.prepare('SELECT job FROM workspaces WHERE task=? AND archived=0').get(task.id))throw teamError(409,'Aktive Bearbeitung zuerst abschließen.');
    storeMetadata(db,key,{...contract,revision:contract.revision+1,cancelled:v.action==='cancel',blocked:'',cancelReason:v.action==='cancel'?v.reason:''});
    db.prepare("UPDATE tasks SET status=? WHERE id=?").run(v.action==='cancel'?'done':'todo',task.id);
   }else if(v.action==='result'){
    if(contract.kind==='code')throw teamError(409,'Codeergebnisse werden als getesteter Git-Prüfstand eingereicht.');
    if(task.assignee&&task.assignee!==member.id)throw teamError(403,'Ergebnis bitte durch die verantwortliche Person einreichen.');
    const previous=latestGeneralResult(db,task);
    if(previous?.id===v.id){if(previous.body!==v.body||previous.owner!==member.id)throw teamError(409,'Ergebniskennung bereits anders verwendet.');return;}
    if(previous)storeMetadata(db,'team:v1:result-history:'+previous.id,{...previous,task:task.id});
    storeMetadata(db,'team:v1:result:'+task.id,{id:v.id,task:task.id,body:v.body,owner:member.id,created:Date.now(),contractRevision:contract.revision,contractSnapshot:{title:task.title,description:task.description,criteria:contract.criteria},state:contract.requiresReview?'pending':'accepted',votes:[]});
    db.prepare('UPDATE tasks SET assignee=COALESCE(assignee,?),status=? WHERE id=?').run(member.id,contract.requiresReview?'review':'doing',task.id);
   }else if(v.action==='vote'){
    const result=latestGeneralResult(db,task);if(!result||result.id!==v.result||result.contractRevision!==contract.revision)throw teamError(409,'Ergebnisfassung inzwischen geändert. Bitte neu laden.');
    if(result.owner===member.id)throw teamError(403,'Eigene Ergebnisse können nicht unabhängig freigegeben werden.');
    if(v.decision==='changes'&&!v.body)throw teamError(400,'Bitte die gewünschten Änderungen beschreiben.');
    const votes=[...(result.votes??[]),{reviewer:member.id,decision:v.decision,body:v.body,created:Date.now()}];
    storeMetadata(db,'team:v1:result:'+task.id,{...result,votes,state:v.decision==='approved'?'approved':'changes_requested'});
    if(v.decision==='changes')db.prepare("UPDATE tasks SET status='doing' WHERE id=?").run(task.id);
   }
   teamEvent(db,{actor:member.id,project:task.project,task:task.id,kind:v.action,body:({contract:'Abschlussbedingungen aktualisiert',block:v.reason?'Blockierung festgehalten':'Blockierung geklärt',takeover:'Aufgabe übernommen: '+v.reason,result:'Ergebnis eingereicht',vote:v.action==='vote'&&v.decision==='approved'?'Ergebnis freigegeben':'Änderungen angefordert',cancel:'Aufgabe abgebrochen',reopen:'Aufgabe wieder geöffnet'})[v.action]+': '+task.title});
  });send({ok:true});return true;
 };
}
