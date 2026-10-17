type TaskCopy={id:string;owner:string;project:string;taskId:string|null;status:string;archived:number;revoked:number;device:string};

export function ownTaskCopy<T extends TaskCopy>(copies:T[],owner:string,project:string,task:string):T|undefined{
 return copies.find(copy=>copy.owner===owner&&copy.project===project&&copy.taskId===task&&copy.status==='completed'&&!copy.archived&&!copy.revoked);
}
