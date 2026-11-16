import type {MessengerFilter,RoomState} from './room-model';

/** A view inside a shared project, never a private-message ACL. */
export function messengerFilterKey(filter:MessengerFilter):string{
 if(filter.kind==='member'||filter.kind==='agent')return `${filter.kind}:${filter.id}`;
 if(filter.kind==='topic')return `topic:${filter.taskId}`;
 return filter.kind;
}

export function readMessengerFilter(search:string,room?:Pick<RoomState,'members'|'agents'|'tasks'>):MessengerFilter{
 const value=new URLSearchParams(search).get('chat')??'all';
 if(value==='handoffs')return {kind:'handoffs'};
 const match=/^(member|agent|topic):([\w-]{1,100})$/.exec(value);
 if(!match)return {kind:'all'};
 const [,kind,id]=match;
 if(kind==='member'&&(!room||room.members.some(m=>m.id===id&&!m.removed)))return {kind:'member',id};
 if(kind==='agent'&&(!room||room.agents?.some(a=>a.id===id&&a.active!==false)))return {kind:'agent',id};
 if(kind==='topic'&&(!room||room.tasks.some(t=>t.id===id)))return {kind:'topic',taskId:id};
 return {kind:'all'};
}

/** Keep the old project-wide draft key; other views receive independent drafts. */
export function messengerDraftKey(user:string,project:string,filter:MessengerFilter):string{
 const base=`room-chat:${user}:${project}`;
 return filter.kind==='all'?base:`${base}:${messengerFilterKey(filter)}`;
}

/** Changing a view must reset BOTH fields; otherwise an old recipient/topic leaks. */
export function messengerComposerTarget(filter:MessengerFilter):{recipient:string;topicTask:string}{
 return {
  recipient:filter.kind==='member'||filter.kind==='agent'?filter.id:'',
  topicTask:filter.kind==='topic'?filter.taskId:''
 };
}

type OwnedCopy={owner:string;project:string;status:string;archived?:number|boolean;revoked?:number|boolean};
/** UX restriction only. The existing backend still authorizes every file operation. */
export function ownProjectCopies<T extends OwnedCopy>(copies:T[],user:string,project:string):T[]{
 return copies.filter(copy=>copy.owner===user&&copy.project===project&&copy.status==='completed'&&!copy.archived&&!copy.revoked);
}
