type TaskCopy={id:string;owner:string;project:string;taskId:string|null;status:string;archived:number;revoked:number;device:string};

/** The task workspace must never offer or execute work in a different task's copy. */
export function selectableCopies<T extends TaskCopy>(copies:T[],owner:string,project:string,device:string,task?:string):T[]{
 return copies.filter(copy=>copy.owner===owner&&copy.project===project&&copy.device===device&&copy.status==='completed'&&!copy.archived&&!copy.revoked&&(!task||copy.taskId===task));
}

export function ownTaskCopy<T extends TaskCopy>(copies:T[],owner:string,project:string,task:string):T|undefined{
 return copies.find(copy=>copy.owner===owner&&copy.project===project&&copy.taskId===task&&copy.status==='completed'&&!copy.archived&&!copy.revoked);
}


type SoloDevice={id:string;owner:string;seen:number;revoked?:number};
type SoloCopy=TaskCopy&{created:number};

/** Suggest an existing personal workspace only when no explicit project/task was chosen.
 * Never use another member's worktree to choose a default development context.
 */
export function preferredSoloWorkspace<T extends SoloCopy>(
 copies:readonly T[],owner:string,projectIds:readonly string[],devices:readonly SoloDevice[],now=Date.now()
):T|undefined{
 const available=new Map(devices.filter(d=>d.owner===owner&&!d.revoked).map(d=>[d.id,d]));
 const known=new Set(projectIds);
 return copies.filter(copy=>copy.owner===owner&&copy.status==='completed'&&!copy.archived&&!copy.revoked&&
  known.has(copy.project)&&available.has(copy.device))
  .sort((a,b)=>{
   const aOnline=Number(now-(available.get(a.device)?.seen??0)<30000);
   const bOnline=Number(now-(available.get(b.device)?.seen??0)<30000);
   return bOnline-aOnline||b.created-a.created||a.id.localeCompare(b.id);
  })[0];
}
