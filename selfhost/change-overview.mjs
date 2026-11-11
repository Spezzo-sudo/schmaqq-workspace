import {reviewState} from './reviews.mjs';
import {sourceEvidence} from './source-evidence.mjs';

const commit=value=>typeof value==='string'&&/^[a-f0-9]{40,64}$/.test(value)?value:null;
// Read model only. No prompts, file paths, preview capabilities or command output
// belong in the shared board. A heartbeat is not a current filesystem snapshot.
export function changeOverview(db,workspaces){
 const query=db.prepare(`SELECT id,action,status,created,result FROM jobs
  WHERE json_extract(payload,'$.worktree')=? AND owner=? AND device=? AND project=?
  AND action IN ('status','check','preview','review','submit','save-file','create-file','codex','update')
  ORDER BY created DESC,rowid DESC LIMIT 100`);
 return workspaces.map(w=>{
  const jobs=query.all(w.id,w.owner,w.device,w.project).map(j=>{let data={};try{data=JSON.parse(j.result??'{}')??{};}catch{}return {...j,data,source:sourceEvidence(data.source)};});
  const mutation=jobs.findIndex(j=>['save-file','create-file','update'].includes(j.action)&&j.status==='completed'||j.action==='codex'&&j.status!=='queued'||['check','preview','review','submit'].includes(j.action)&&['failed','cancelled','interrupted'].includes(j.status));
  const observed=jobs.findIndex(j=>j.status==='completed'&&j.source);
  const observation=observed>=0?{...jobs[observed].source,valid:!(mutation>=0&&mutation<observed)}:null;
  const evidence=job=>{
   if(!job)return null;const result=job.data;
   const index=jobs.indexOf(job);
   const freshness=job.source?.revision&&observation?.valid&&observation.revision?(job.source.revision===observation.revision?'same':'changed'):'unverified';
   return {id:job.id,status:job.status,created:job.created,commit:commit(result.commit),
    freshness,changedAfter:freshness==='changed'||freshness==='unverified'&&mutation>=0&&mutation<index,
    ...(job.action==='review'||job.action==='submit'?{state:reviewState(db,job),published:job.action==='submit'&&result.published===true}:{}),
   };
  };
  const lastActivity=jobs.find(j=>['save-file','create-file','codex','check','preview','review','submit'].includes(j.action));
  return {workspace:w.id,task:w.taskId,project:w.project,
   // Metadata only: last acknowledged action, never job result, prompt, file path or private draft.
   lastActivity:lastActivity?{kind:lastActivity.action,status:lastActivity.status,created:lastActivity.created}:null,
   // A completed review or submit ran the configured tests on exactly its committed state.
   check:(job=>!job?null:{...evidence(job),...(job.action==='check'?{}:{via:'review'})})(jobs.find(j=>j.action==='check'||['review','submit'].includes(j.action)&&j.status==='completed')),
   preview:evidence(jobs.find(j=>j.action==='preview')),
   review:evidence(jobs.find(j=>['review','submit'].includes(j.action)&&j.status==='completed')),
   publication:evidence(jobs.find(j=>j.action==='submit'&&j.status==='completed')),
   currentRevision:observation?.valid&&observation.revision?'observed':'unverified',observation,
   observationJob:(()=>{const job=jobs.find(j=>j.action==='status');return job?{id:job.id,status:job.status,created:job.created}:null;})(),
   note:db.prepare('SELECT kind,body,revision,author,updated FROM change_notes WHERE workspace=?').get(w.id)??{kind:'unspecified',body:'',revision:0,author:null,updated:null},
  };
 });
}
