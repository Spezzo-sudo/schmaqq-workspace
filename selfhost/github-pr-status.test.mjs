import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredRepos,createPullRequestReader} from './github-pr-status.mjs';

const commit='a'.repeat(40),otherCommit='b'.repeat(40);
const repo='Spezzo-sudo/schmaqq-studio-pilot';
const project={website:{repository:repo,base:'main'}};
const source={id:'r23-review',project:'website',status:'completed',action:'submit',result:{workflow:'pull-request',published:true,branch:'studio/qa-r23',commit}};
const makePR=(options={})=>({
 number:42,state:'open',merged_at:null,
 head:{ref:source.result.branch,sha:commit,repo:{full_name:repo}},
 base:{ref:'main',repo:{full_name:repo}},
 ...options
});

test('PR reader defaults to fail-closed, including legacy repository-only settings',async()=>{
 const reader=createPullRequestReader();
 assert.deepEqual(await reader(source),{state:'not_configured',commit,branch:source.result.branch,mergeReady:false});
 assert.equal((await reader({...source,action:'review'})).state,'local_only');
 assert.equal((await reader({...source,result:{...source.result,published:false}})).state,'local_only');
 assert.equal((await reader({...source,result:{...source.result,workflow:'direct'}})).state,'not_required');
 assert.equal((await reader({...source,result:{...source.result,branch:'../../unsafe'}})).state,'invalid_result');
 assert.equal((await reader({...source,result:{...source.result,commit:'invalid'}})).state,'invalid_result');
 assert.equal((await reader({...source,status:'running'})).state,'not_ready');
 const legacy=createPullRequestReader({repositories:{website:repo},readToken:'fixture',
  request:()=>{throw new Error('MUST NOT access GH without verified base');}});
 const value=await legacy(source);
 assert.equal(value.state,'base_unverified');assert.equal(value.mergeReady,false);
 assert.equal((await reader({...source,project:'constructor'})).state,'not_configured');
});

test('PR reader: repository, target branch and exact commit all required; never merge',async()=>{
 let calls=0,lastUrl,lastOpts,returned=[makePR()];
 const reader=createPullRequestReader({repositories:project,readToken:'fixture-read-only',
  request:async(url,opts)=>{calls++;lastUrl=url;lastOpts=opts;return Response.json(returned);}});
 const good=await reader(source);
 assert.equal(good.state,'matched');assert.equal(good.url,'https://github.com/'+repo+'/pull/42');
 assert.equal(good.expectedBase,'main');assert.equal(good.actualBase,'main');
 assert.equal(good.mergeReady,false);assert.equal(good.ci,'not_verified');assert.equal(good.reviews,'not_verified');
 assert.equal(new URL(lastUrl).origin,'https://api.github.com');
 assert.equal(new URL(lastUrl).searchParams.get('state'),'all');
 assert.equal(new URL(lastUrl).searchParams.get('per_page'),'100');
 assert.equal(new URL(lastUrl).searchParams.get('head'),null,'Fork PRs must not be excluded');
 assert.equal(lastOpts.redirect,'error');
 assert.equal(lastOpts.headers.Authorization,'Bearer fixture-read-only');
 returned=[makePR({head:{ref:source.result.branch,sha:otherCommit,repo:{full_name:repo}}})];
 assert.equal((await reader(source)).state,'stale_commit');
 returned=[makePR({state:'closed'})];assert.equal((await reader(source)).state,'closed');
 returned=[makePR({state:'closed',merged_at:'2026-10-01T11:00:00Z'})];
 assert.equal((await reader(source)).state,'already_merged');
 returned=[makePR({base:{ref:'main',repo:{full_name:'other/repo'}}})];
 assert.equal((await reader(source)).state,'not_found');
 returned=[];assert.equal((await reader(source)).state,'not_found');
 assert.equal(calls,6);
});

test('Wrong base is NOT matched even if HEAD branch and SHA match; correct base wins',async()=>{
 let returned=[makePR({base:{ref:'experimental',repo:{full_name:repo}}})];
 const reader=createPullRequestReader({repositories:project,readToken:'fixture',
  request:async()=>Response.json(returned)});
 const wrong=await reader(source);
 assert.equal(wrong.state,'target_mismatch');assert.equal(wrong.expectedBase,'main');
 assert.equal(wrong.actualBase,'experimental');assert.equal(wrong.mergeReady,false);
 returned=[makePR({base:{ref:'experimental',repo:{full_name:repo}}}),makePR({number:51})];
 const preferred=await reader(source);
 assert.equal(preferred.state,'matched');assert.equal(preferred.number,51);
 assert.equal(preferred.actualBase,'main');
 returned=[makePR({base:{ref:'main',repo:{full_name:repo}},head:{ref:source.result.branch,sha:otherCommit,repo:{full_name:repo}}}),
  makePR({number:70,base:{ref:'experimental',repo:{full_name:repo}}})];
 assert.equal((await reader(source)).state,'stale_commit');
});

test('Forks are explicitly unsupported, not wrongly reported absent; bounded list is fail-closed',async()=>{
 let returned=[makePR({head:{ref:source.result.branch,sha:commit,repo:{full_name:'other-person/fork'}}})];
 const reader=createPullRequestReader({repositories:project,readToken:'fixture',
  request:async()=>Response.json(returned)});
 const fork=await reader(source);
 assert.equal(fork.state,'unsupported_fork');assert.equal(fork.mergeReady,false);
 returned=[makePR({head:{ref:source.result.branch,sha:otherCommit,repo:{full_name:'other-person/fork'}}})];
 assert.equal((await reader(source)).state,'unsupported_fork');
 returned=[...Array.from({length:100},(_,n)=>makePR({number:n+1}))];
 const capped=await reader(source);
 assert.equal(capped.state,'listing_incomplete');assert.equal(capped.mergeReady,false);
});

test('Provider failure and invalid config cannot produce positive PR status',async()=>{
 const requestFailures=[()=>{throw new Error('network')},()=>Response.json({error:'unauthorized'},{status:401}),
  ()=>Response.json({error:'rate-limited'},{status:429}),()=>Response.json({error:'bad-shape'})];
 for(const request of requestFailures){
  const reader=createPullRequestReader({repositories:project,readToken:'fixture',request});
  const value=await reader(source);assert.equal(value.state,'provider_unavailable');assert.equal(value.mergeReady,false);
 }
 assert.deepEqual(configuredRepos(''),{});
 assert.deepEqual(configuredRepos(JSON.stringify(project)),project);
 assert.deepEqual(configuredRepos('{"website":"Spezzo-sudo/schmaqq-studio-pilot"}'),{website:repo});
 for(const bad of ['[]','null','{oops}','{"website":"http://unsafe"}',
  '{"website":{"repository":"Spezzo-sudo/schmaqq-studio-pilot","base":"../invalid"}}',
  '{"website":{"repository":"Spezzo-sudo/schmaqq-studio-pilot"}}',
  '{"website":{"repository":"Spezzo-sudo/schmaqq-studio-pilot","base":"main","secret":"no"}}']){
  assert.throws(()=>configuredRepos(bad));
 }
});
