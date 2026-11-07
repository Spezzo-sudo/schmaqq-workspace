import type {ChangeSummary} from './change-overview';

export type ReviewFreshness='same'|'changed'|'unverified';
/** Historical reviews need their own source binding, not the newest review's verdict. */
export function reviewFreshness(jobId:string,source:unknown,change?:ChangeSummary):ReviewFreshness{
 if(!change)return 'unverified';
 if(change.review?.id===jobId){
  if(change.review.changedAfter)return 'changed';
  return change.review.freshness??'unverified';
 }
 const revision=source&&typeof source==='object'&&'revision' in source?source.revision:undefined;
 const observation=change.observation;
 if(typeof revision!=='string'||!revision||!observation?.valid||!observation.revision)return 'unverified';
 return revision===observation.revision?'same':'changed';
}
