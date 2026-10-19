import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredRepos,createPullRequestReader} from './github-pr-status.mjs';

const commit='a'.repeat(40),newCommit='b'.repeat(40);
const repo='Spezzo-sudo/schmaqq-studio-pilot';
const base={id:'test-review',project:'website',status:'completed',action:'submit',result:{workflow:'pull-request',published:true,branch:'studio/qa-r23',commit}};
const makePR=(sha=commit,extras={})=>({number:42,state:'open',merged_at:null,head:{ref:base.result.branch,sha,repo:{full_name:repo}},base:{repo:{full_name:repo}},...extras});

test('GitHub-PR reader is fail-closed by default, including identity-only login',async()=>{
 const reader=createPullRequestReader();
 assert.deepEqual(await reader(base),{state:'not_configured',commit,branch:base.result.branch,mergeReady:false});
 assert.equal((await reader({...base,action:'review'})).state,'local_only');
 assert.equal((await reader({...base,result:{...base.result,published:false}})).state,'local_only');
 assert.equal((await reader({...base,result:{...base.result,workflow:'direct'}})).state,'not_required');
 assert.equal((await reader({...base,result:{...base.result,branch:'../../evil'}})).state,'invalid_result');
 assert.equal((await reader({...base,result:{...base.result,commit:'notasha'}})).state,'invalid_result');
 assert.equal((await reader({...base,status:'queued'})).state,'not_ready');
});

test('GitHub-PR reader checks configured repository, branch and exact commit; never authorizes merge',async()=>{
 let calls=0,lastUrl,lastOpts;
 let returned=[makePR()];
 const reader=createPullRequestReader({repositories:{website:repo},readToken:'fixture-read-only',
  request:async(url,opts)=>{calls++;lastUrl=url;lastOpts=opts;return Response.json(returned);}});
 const good=await reader(base);
 assert.equal(good.state,'matched');assert.equal(good.url,'https://github.com/'+repo+'/pull/42');
 assert.equal(good.mergeReady,false);assert.equal(good.ci,'not_verified');assert.equal(good.reviews,'not_verified');
 assert.equal(new URL(lastUrl).origin,'https://api.github.com');
 assert.equal(new URL(lastUrl).searchParams.get('head'),'Spezzo-sudo:studio/qa-r23');
 assert.equal(lastOpts.redirect,'error');
 assert.equal(lastOpts.headers.Authorization,'Bearer fixture-read-only');
 returned=[makePR(newCommit)];assert.equal((await reader(base)).state,'stale_commit');
 returned=[makePR(commit,{state:'closed',merged_at:null})];assert.equal((await reader(base)).state,'closed');
 returned=[makePR(commit,{state:'closed',merged_at:'2026-10-01T11:00:00Z'})];assert.equal((await reader(base)).state,'already_merged');
 returned=[makePR(commit,{base:{repo:{full_name:'other/repo'}}})];assert.equal((await reader(base)).state,'not_found');
 returned=[];assert.equal((await reader(base)).state,'not_found');
 const missing=createPullRequestReader({repositories:{},readToken:'fixture',request:()=>{throw new Error('must never call');}});
 assert.equal((await missing(base)).state,'not_configured');
 assert.equal(calls,6);
});

test('Provider failures, invalid config and untrusted responses never become green',async()=>{
 const errors=[()=>{throw new Error('network error')},()=>Response.json({message:'unauthorized'},{status:401}),()=>Response.json({message:'rate limited'},{status:429}),()=>Response.json({foo:'bar'})];
 for(const request of errors){
  const reader=createPullRequestReader({repositories:{website:repo},readToken:'fixture',request});
  const value=await reader(base);assert.equal(value.state,'provider_unavailable');assert.equal(value.mergeReady,false);
 }
 assert.deepEqual(configuredRepos(''),{});
 assert.deepEqual(configuredRepos('{"website":"Spezzo-sudo/schmaqq-studio-pilot"}'),{website:repo});
 for(const config of ['[]','null','{oops}','{"x":"http://evil.invalid"}','{"x":"../../../evil"}','{"x":"foo/bar","y":"../oops"}'])assert.throws(()=>configuredRepos(config));
});
