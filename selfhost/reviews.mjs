export function reviewState(db,job){
 if(!['review','submit'].includes(job.action)||job.status!=='completed'||!job.result)return 'unavailable';
 const result=typeof job.result==='string'?JSON.parse(job.result):job.result;
 const votes=db.prepare("SELECT reviewer,decision FROM code_reviews WHERE job=? AND commit_sha=? AND decision!='comment' ORDER BY seq DESC").all(job.id,result.commit??'');
 const latest=new Map();for(const v of votes)if(v.reviewer!==job.owner&&!latest.has(v.reviewer))latest.set(v.reviewer,v.decision);
 if([...latest.values()].includes('changes'))return 'changes_requested';
 return [...latest.values()].includes('approved')?'approved':'pending';
}
export function completeReview(result){
 return /^[a-f0-9]{40,64}$/.test(result?.commit??'')&&typeof result.diff==='string'&&result.diff.length<50000&&result.diffTruncated!==true;
}
