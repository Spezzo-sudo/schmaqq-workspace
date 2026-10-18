// GitHub pilot coordination contract. No Github credentials, HTTP client or
// production route. Actual execution is limited to the in-memory fixture below.
import {validatePublisherRequest} from './publisher-contract.mjs';

const sha=/^[a-f0-9]{40}$/;
const numeric=/^[1-9][0-9]*$/;
const member=/^[a-zA-Z0-9_-]{1,100}$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const slug=/^schmaqq-pilot-[a-z0-9][a-z0-9-]{1,55}$/;
const error=message=>{throw new Error('GitHub pilot rejected: '+message);};
function id(value){return String(value??'');}
function fixedString(value,min,max,label){
 if(typeof value!=='string'||value.length<min||value.length>max||/[\r\n\x00-\x1f\x7f]/.test(value))error('Invalid '+label+'.');
 return value;
}
export function planGithubDraftPilot({binding,submission,installation,review,title,description='' }={}){
 const approved=validatePublisherRequest(binding,submission);
 // Deliberately impossible to target either live SCHMAQQ source repository.
 if(binding?.pilotOnly!==true||binding?.private!==true||
  binding?.purpose!=='throwaway-pilot'||!slug.test(binding?.name??'')||
  /^netzkontor$|^schmaqq-workspace$/i.test(binding.name))error('Only a distinct private throwaway pilot repository is eligible.');
 if(installation?.kind!=='github-app'||installation?.pilotEnabled!==true||
  !numeric.test(id(installation?.installationId))||!Array.isArray(installation?.selectedRepositoryIds)||
  installation.selectedRepositoryIds.length!==1||
  id(installation.selectedRepositoryIds[0])!==approved.githubRepositoryId)
  error('One explicitly selected GitHub App installation/repository is required.');
 if(review?.state!=='approved'||review?.complete!==true||
  !uuid.test(review?.jobId??'')||!member.test(review?.authorId??'')||
  !member.test(review?.reviewerId??'')||review.authorId===review.reviewerId||
  review.jobId!==submission.idempotencyKey.replace(/^review-/,'')||
  review.commit!==approved.commit||review.base!==approved.expectedBaseCommit||review.branch!==approved.branch)
  error('Exact independent server-verified review is required.');
 const subject=fixedString(title,3,96,'title');
 const note=description===''?'':fixedString(description,1,1000,'description');
 return Object.freeze({
  kind:'simulation-only',installationId:id(installation.installationId),
  repositoryId:approved.githubRepositoryId,owner:approved.owner,repo:approved.repo,
  base:approved.defaultBranch,baseCommit:approved.expectedBaseCommit,
  head:approved.branch,headCommit:approved.commit,reviewId:review.jobId,
  title:'[SCHMAQQ-Pilot] '+subject,
  body:'Isolierter Pilot – kein Merge und kein Deployment.\n'+
   'Review: '+review.jobId+'\nBasis: '+approved.expectedBaseCommit+'\nCommit: '+approved.commit+
   (note?'\nBeschreibung: '+note:''),
 });
}
function assertRepository(plan,repo){
 if(id(repo?.id)!==plan.repositoryId||repo?.owner!==plan.owner||repo?.name!==plan.repo||
  repo?.private!==true||repo?.archived!==false||repo?.defaultBranch!==plan.base)
  error('Remote repository identity, visibility or base does not match.');
}
function assertRefs(plan,base,head){
 if(base!==plan.baseCommit)error('Base moved; review is stale.');
 if(head!==plan.headCommit)error('Published feature branch is missing or changed.');
}
function checkedPR(plan,pr){
 if(!Number.isSafeInteger(pr?.number)||pr.number<1||pr?.draft!==true||
  pr.state!=='open'||id(pr.repositoryId)!==plan.repositoryId||
  pr.head?.branch!==plan.head||pr.head?.sha!==plan.headCommit||
  pr.base?.branch!==plan.base||pr.base?.sha!==plan.baseCommit)
  error('Remote PR response cannot be verified against the reviewed revision.');
 return Object.freeze({number:pr.number,state:'open',draft:true,head:plan.head,commit:plan.headCommit});
}

/**
 * In-memory pilot simulator only. No user-supplied callbacks or network client
 * may be passed to this entry point. Production GitHub adapter is NOT included.
 */
export async function simulateGithubDraftPilot({plan,remote}={}){
 if(plan?.kind!=='simulation-only'||!(remote instanceof MemoryGithubPilot))
  error('Only the built-in memory pilot simulator is supported.');
 assertRepository(plan,remote.repository());
 assertRefs(plan,remote.ref(plan.base),remote.ref(plan.head));
 const existing=remote.openPRs(plan.head,plan.base);
 if(existing.length>1)error('Multiple open PRs require operator reconciliation.');
 if(existing.length===1)return Object.freeze({outcome:'existing_verified',pr:checkedPR(plan,existing[0])});
 const created=remote.createDraftPR({head:plan.head,base:plan.base,title:plan.title,body:plan.body});
 // Do not infer success from a 201-like response alone. Check the newly created PR and both refs.
 const verified=remote.pullRequest(created?.number);
 assertRepository(plan,remote.repository());
 assertRefs(plan,remote.ref(plan.base),remote.ref(plan.head));
 return Object.freeze({outcome:'draft_created',pr:checkedPR(plan,verified)});
}

/** An intentionally fake provider. All records exist only in process memory. */
export class MemoryGithubPilot{
 #repo;#refs;#prs=[];#next=1;#createFailure=false;
 constructor({id:repositoryId,owner,name,base='main',baseCommit}={}){
  if(!numeric.test(id(repositoryId))||!sha.test(baseCommit??''))error('Invalid synthetic repository fixture.');
  this.#repo={id:id(repositoryId),owner,name,private:true,archived:false,defaultBranch:base};
  this.#refs=new Map([[base,baseCommit]]);
 }
 repository(){return {...this.#repo};}
 ref(branch){return this.#refs.get(branch)??null;}
 publishSyntheticBranch(branch,commit){
  if(!/^studio\/[a-z0-9][a-z0-9._-]{0,99}$/.test(branch)||!sha.test(commit??''))
   error('Synthetic feature branch invalid.');
  this.#refs.set(branch,commit);
 }
 setBaseForTest(commit){if(!sha.test(commit??''))error('Invalid synthetic SHA.');this.#refs.set(this.#repo.defaultBranch,commit);}
 failNextCreate(){this.#createFailure=true;}
 openPRs(head,base){return this.#prs.filter(pr=>pr.state==='open'&&pr.head.branch===head&&pr.base.branch===base).map(pr=>structuredClone(pr));}
 createDraftPR({head,base,title,body}){
  if(this.#createFailure){this.#createFailure=false;error('Synthetic provider create failed.');}
  if(!this.#refs.has(head)||!this.#refs.has(base))error('Synthetic branch missing.');
  if(this.openPRs(head,base).length)error('Synthetic duplicate PR is blocked.');
  const pr={number:this.#next++,state:'open',draft:true,repositoryId:this.#repo.id,
   head:{branch:head,sha:this.ref(head)},base:{branch:base,sha:this.ref(base)},
   title,body};
  this.#prs.push(pr);return structuredClone(pr);
 }
 pullRequest(number){const found=this.#prs.find(pr=>pr.number===number);return found?structuredClone(found):null;}
 count(){return this.#prs.length;}
}
