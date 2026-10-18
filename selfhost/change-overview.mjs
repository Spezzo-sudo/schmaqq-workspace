import {reviewState} from './reviews.mjs';

const commit=value=>typeof value==='string'&&/^[a-f0-9]{40,64}$/.test(value)?value:null;
// Read model only. No prompts, file paths, preview capabilities or command output
// belong in the shared board. A heartbeat is not a current filesystem snapshot.
export function changeOverview(db,workspaces){
 const query=db.prepare(`SELECT id,action,status,created,result FROM jobs
  WHERE json_extract(payload,'$.worktree')=? AND owner=? AND device=? AND project=?
  AND action IN ('check','preview','review','submit','save-file','codex')
  ORDER BY created DESC,rowid DESC LIMIT 100`);
 return workspaces.map(w=>{
  const jobs=query.all(w.id,w.owner,w.device,w.project);
  const mutation=jobs.findIndex(j=>j.action==='save-file'&&j.status==='completed'||j.action==='codex'&&j.status!=='queued');
  const evidence=job=>{
   if(!job)return null;let result={};try{result=JSON.parse(job.result??'{}');}catch{}
   const index=jobs.indexOf(job);
   return {id:job.id,status:job.status,created:job.created,commit:commit(result.commit),
    changedAfter:mutation>=0&&mutation<index,
    ...(job.action==='review'||job.action==='submit'?{state:reviewState(db,job),published:job.action==='submit'&&result.published===true}:{}),
   };
  };
  return {workspace:w.id,task:w.taskId,project:w.project,
   check:evidence(jobs.find(j=>j.action==='check')),
   preview:evidence(jobs.find(j=>j.action==='preview')),
   review:evidence(jobs.find(j=>['review','submit'].includes(j.action)&&j.status==='completed')),
   publication:evidence(jobs.find(j=>j.action==='submit'&&j.status==='completed')),
   currentRevision:'unverified',
  };
 });
}
