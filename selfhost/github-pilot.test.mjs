import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {planGithubDraftPilot,simulateGithubDraftPilot,MemoryGithubPilot} from './github-pilot.mjs';

const BASE='a'.repeat(40),FEATURE='b'.repeat(40),OTHER='c'.repeat(40);
function fixture(){
 const jobId=randomUUID();
 const binding={internalProjectId:'studio-pilot',githubRepositoryId:'987654321',owner:'Spezzo-sudo',
  name:'schmaqq-pilot-sandbox',defaultBranch:'main',allowedToPublish:true,
  pilotOnly:true,private:true,purpose:'throwaway-pilot'};
 const submission={projectId:'studio-pilot',githubRepositoryId:'987654321',
  branch:'studio/sandbox-feature',commit:FEATURE,expectedBaseCommit:BASE,
  idempotencyKey:'review-'+jobId};
 const installation={kind:'github-app',pilotEnabled:true,installationId:'12345',
  selectedRepositoryIds:['987654321']};
 const review={jobId,authorId:'author-fixture',reviewerId:'reviewer-fixture',
  state:'approved',complete:true,commit:FEATURE,base:BASE,branch:'studio/sandbox-feature'};
 const args={binding,submission,installation,review,title:'Pilotfunktion testen',description:'Nur synthetische Daten'};
 const remote=new MemoryGithubPilot({id:'987654321',owner:binding.owner,name:binding.name,baseCommit:BASE});
 return {args,remote};
}
test('pilot plan stays tied to a single private throwaway repository, app installation and independent review',()=>{
 const {args}=fixture(),plan=planGithubDraftPilot(args);
 assert.equal(plan.kind,'simulation-only');
 assert.equal(plan.repositoryId,'987654321');
 assert.equal(plan.installationId,'12345');
 assert.equal(plan.headCommit,FEATURE);
 assert.equal(plan.baseCommit,BASE);
 assert.equal(plan.head,'studio/sandbox-feature');
 assert.ok(plan.title.startsWith('[SCHMAQQ-Pilot] '));
 assert.ok(Object.isFrozen(plan));
 assert.ok(!JSON.stringify(plan).includes('token'));
});
test('pilot planner blocks real repositories, wrong install, wrong review, unapproved and forged submissions',()=>{
 const {args}=fixture();
 const cases=[
  {...args,binding:{...args.binding,name:'schmaqq-workspace'}},
  {...args,binding:{...args.binding,name:'NetzKontor'}},
  {...args,binding:{...args.binding,pilotOnly:false}},
  {...args,binding:{...args.binding,private:false}},
  {...args,binding:{...args.binding,purpose:'production'}},
  {...args,binding:{...args.binding,name:'generic-repo'}},
  {...args,installation:{...args.installation,pilotEnabled:false}},
  {...args,installation:{...args.installation,selectedRepositoryIds:['987654321','999999']}},
  {...args,installation:{...args.installation,selectedRepositoryIds:['999999']}},
  {...args,installation:{...args.installation,kind:'user-oauth'}},
  {...args,installation:{...args.installation,installationId:null}},
  {...args,review:{...args.review,state:'changes_requested'}},
  {...args,review:{...args.review,complete:false}},
  {...args,review:{...args.review,reviewerId:args.review.authorId}},
  {...args,review:{...args.review,commit:OTHER}},
  {...args,review:{...args.review,base:OTHER}},
  {...args,review:{...args.review,branch:'studio/other'}},
  {...args,review:{...args.review,jobId:randomUUID()}},
  {...args,submission:{...args.submission,branch:'main'}},
  {...args,submission:{...args.submission,githubRepositoryId:'999999'}},
  {...args,title:'bad\nheader'},
 ];
 for(const [index,item] of cases.entries())assert.throws(()=>planGithubDraftPilot(item),undefined,'case '+index);
});
test('mock PR is created only for already published exact feature ref, then reused without duplication',async()=>{
 const {args,remote}=fixture(),plan=planGithubDraftPilot(args);
 await assert.rejects(simulateGithubDraftPilot({plan,remote}),/feature branch is missing/);
 assert.equal(remote.count(),0);
 remote.publishSyntheticBranch(plan.head,plan.headCommit);
 const first=await simulateGithubDraftPilot({plan,remote});
 assert.equal(first.outcome,'draft_created');
 assert.equal(first.pr.draft,true);
 assert.equal(first.pr.commit,FEATURE);
 assert.equal(remote.count(),1);
 const second=await simulateGithubDraftPilot({plan,remote});
 assert.equal(second.outcome,'existing_verified');
 assert.equal(second.pr.number,first.pr.number);
 assert.equal(remote.count(),1);
});
test('ref drift, incorrect installation repository and moved main prohibit Draft PR creation',async()=>{
 for(const kind of ['bad-repo','stale-main','stale-feature']){
  const {args,remote}=fixture(),plan=planGithubDraftPilot(args);
  remote.publishSyntheticBranch(plan.head,plan.headCommit);
  if(kind==='bad-repo'){
   const foreign=new MemoryGithubPilot({id:'2',owner:plan.owner,name:plan.repo,baseCommit:BASE});
   foreign.publishSyntheticBranch(plan.head,FEATURE);
   await assert.rejects(simulateGithubDraftPilot({plan,remote:foreign}),/Remote repository identity/);
  }else{
   if(kind==='stale-main')remote.setBaseForTest(OTHER);
   else remote.publishSyntheticBranch(plan.head,OTHER);
   await assert.rejects(simulateGithubDraftPilot({plan,remote}),/moved|missing or changed/);
  }
  assert.equal(remote.count(),0);
 }
});
test('in-memory simulator cannot be replaced by a network-enabled arbitrary callback object',async()=>{
 const {args,remote}=fixture(),plan=planGithubDraftPilot(args);
 remote.publishSyntheticBranch(plan.head,FEATURE);
 await assert.rejects(simulateGithubDraftPilot({plan,remote:{...remote,createDraftPR:async()=>{throw Error('network');}}}),/Only the built-in memory pilot/);
 assert.equal(remote.count(),0);
});
test('simulated upstream PR-create failure is unknown, never reported as success; explicit retry reconciles',async()=>{
 const {args,remote}=fixture(),plan=planGithubDraftPilot(args);
 remote.publishSyntheticBranch(plan.head,FEATURE);
 remote.failNextCreate();
 await assert.rejects(simulateGithubDraftPilot({plan,remote}),/Synthetic provider create failed/);
 assert.equal(remote.count(),0);
 const next=await simulateGithubDraftPilot({plan,remote});
 assert.equal(next.outcome,'draft_created');
 assert.equal(remote.count(),1);
});
test('a pinned review cannot silently approve a different SHA or a changed base branch',()=>{
 const {args}=fixture();
 assert.throws(()=>planGithubDraftPilot({...args,submission:{...args.submission,commit:OTHER}}));
 assert.throws(()=>planGithubDraftPilot({...args,submission:{...args.submission,expectedBaseCommit:OTHER}}));
});
