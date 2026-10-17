// A worktree remains addressable even when its prepare job leaves the recent history.
export function listWorkspaces(db){
 return db.prepare(`SELECT j.id,j.owner,j.device,j.project,j.status,j.created,
  m.name AS ownerName,d.name AS deviceName,d.revoked,d.seen,
  json_extract(j.payload,'$.issue') AS issue,
  json_extract(j.result,'$.branch') AS branch,
  COALESCE(w.title,'Arbeitskopie') AS title,COALESCE(w.scope,'') AS scope,
  w.task AS taskId,t.title AS taskTitle,COALESCE(w.archived,0) AS archived,COALESCE(w.revision,0) AS revision
  FROM jobs j JOIN members m ON m.id=j.owner JOIN devices d ON d.id=j.device
  LEFT JOIN workspaces w ON w.job=j.id LEFT JOIN tasks t ON t.id=w.task
  WHERE j.action='prepare' AND j.status IN ('queued','running','completed','interrupted') ORDER BY j.created DESC,j.id`).all();
}
export function validScope(scope){return scope===''||scope.length<=240&&!scope.startsWith('/')&&!/[\\:*?\x00-\x1f]/.test(scope)&&scope.split('/').every(x=>x&&x!=='.'&&x!=='..'&&x!=='.git');}
export function assertAvailable(db,{project,issue,scope,task},exclude=''){
 const conflict=listWorkspaces(db).find(w=>w.id!==exclude&&w.project===project&&!w.archived&&(
  (issue&&w.issue===issue)||(task&&w.taskId===task)||
  (scope&&w.scope&&(scope.toLowerCase()===w.scope.toLowerCase()||scope.toLowerCase().startsWith(w.scope.toLowerCase()+'/')||w.scope.toLowerCase().startsWith(scope.toLowerCase()+'/')))
 ));
 if(conflict)throw Object.assign(new Error(`${conflict.ownerName} hat diesen Bereich bereits übernommen: ${conflict.title}. Erst abstimmen und den bisherigen Arbeitsbereich abschließen.`),{status:409});
}
