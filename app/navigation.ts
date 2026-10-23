/**
 * Sidebar groups and orientation helpers. Labels of the entries stay in the
 * sidebar; this file only decides grouping, order and which entry is active.
 */
export const navGroups=[
 {id:'work',label:'ARBEITEN',views:['overview','projects','tasks']},
 {id:'team',label:'TEAM',views:['chat','docs','team']},
 {id:'settings',label:'EINSTELLUNGEN',views:['setup','models','ai','development']}
] as const;

/** Views without an own entry highlight the entry they belong to. */
export function activeNav(view:string){return view==='task'?'tasks':view;}

type ContinueTask={id:string;project:string;title:string;status:string;assignee:string|null};
const order:Record<string,number>={doing:0,review:1,todo:2};
/** Own open tasks for the start page, the ones in progress first. */
export function continueTasks<T extends ContinueTask>(tasks:T[],userId:string,limit=3){
 return tasks.filter(t=>t.assignee===userId&&t.status!=='done').sort((a,b)=>(order[a.status]??3)-(order[b.status]??3)).slice(0,limit);
}

/** Only current, pending peer reviews; offline authors can still be reviewed. */
export function pendingReviews<T extends ContinueTask>(tasks:T[],copies:{id:string;taskId:string|null;owner:string;status:string;archived:number;revoked:number}[],changes:{workspace:string;review?:{id:string;status:string;state?:string;changedAfter:boolean;freshness?:string}|null}[],userId:string){
 return copies.flatMap(copy=>{
  const task=tasks.find(t=>t.id===copy.taskId&&t.status!=='done');
  const review=changes.find(c=>c.workspace===copy.id)?.review;
  return task&&copy.owner!==userId&&!copy.archived&&!copy.revoked&&copy.status==='completed'&&review?.status==='completed'&&review.state==='pending'&&!review.changedAfter&&review.freshness==='same'
   ?[{task,review:review.id}]:[];
 });
}
