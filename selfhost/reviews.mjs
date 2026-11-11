import {can,selfApproval} from './project-roles.mjs';
export function reviewState(db,job){
 if(!['review','submit'].includes(job.action)||job.status!=='completed'||!job.result)return 'unavailable';
 const result=typeof job.result==='string'?JSON.parse(job.result):job.result;
 const votes=db.prepare("SELECT reviewer,decision FROM code_reviews WHERE job=? AND commit_sha=? AND decision!='comment' ORDER BY seq DESC").all(job.id,result.commit??'');
 // Count only people who may review in this project; the author only when the project lets its admin approve alone.
 const own=selfApproval(db,job.owner,job.project),person=id=>db.prepare('SELECT id,role FROM members WHERE id=?').get(id);
 const latest=new Map();for(const v of votes)if((v.reviewer!==job.owner||own)&&!latest.has(v.reviewer)&&can(db,person(v.reviewer),job.project,'review'))latest.set(v.reviewer,v.decision);
 if([...latest.values()].includes('changes'))return 'changes_requested';
 return [...latest.values()].includes('approved')?'approved':'pending';
}
/** Names of people whose approval of exactly this version no longer counts because they lost the reviewer role. */
export function droppedApprovals(db,job){
 if(!['review','submit'].includes(job.action)||job.status!=='completed'||!job.result)return [];
 const result=typeof job.result==='string'?JSON.parse(job.result):job.result;
 const votes=db.prepare("SELECT c.reviewer,c.decision,m.id,m.role,m.name FROM code_reviews c JOIN members m ON m.id=c.reviewer WHERE c.job=? AND c.commit_sha=? AND c.decision!='comment' ORDER BY c.seq DESC").all(job.id,result.commit??'');
 const own=selfApproval(db,job.owner,job.project),seen=new Set(),names=[];
 for(const v of votes){if(seen.has(v.reviewer)||v.reviewer===job.owner&&!own)continue;seen.add(v.reviewer);if(v.decision==='approved'&&!can(db,{id:v.id,role:v.role},job.project,'review'))names.push(v.name);}
 return names;
}
export function completeReview(result){
 return /^[a-f0-9]{40,64}$/.test(result?.commit??'')&&typeof result.diff==='string'&&result.diff.length<50000&&result.diffTruncated!==true;
}
