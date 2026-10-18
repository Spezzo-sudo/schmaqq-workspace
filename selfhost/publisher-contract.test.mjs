import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePublisherRequest} from './publisher-contract.mjs';
const repo={internalProjectId:'studio',githubRepositoryId:'12345',owner:'Spezzo-sudo',name:'schmaqq-workspace',defaultBranch:'main',allowedToPublish:true};
const source='a'.repeat(40),base='b'.repeat(40);
const request={projectId:'studio',githubRepositoryId:'12345',branch:'studio/issue-10',commit:source,expectedBaseCommit:base,idempotencyKey:'pilot-submission-000001'};
test('publisher contract permits only a specifically authorized feature branch and exact Git revisions',()=>{
 const x=validatePublisherRequest(repo,request);
 assert.deepEqual({repo:x.repo,branch:x.branch,projectId:x.projectId,owner:x.owner},{repo:repo.name,branch:request.branch,projectId:'studio',owner:'Spezzo-sudo'});
 assert.ok(Object.isFrozen(x));
});
test('publisher contract blocks main, guessed repos, unbound projects, force and ambiguous commits',()=>{
 const invalid=[
 [{...repo,allowedToPublish:false},request],
 [repo,{...request,branch:'main'}],
 [repo,{...request,branch:'refs/heads/main'}],
 [repo,{...request,branch:'studio/../main'}],
 [repo,{...request,branch:'studio/Bad'}],
 [repo,{...request,branch:'studio/evil.lock'}],
 [repo,{...request,githubRepositoryId:'54321'}],
 [repo,{...request,projectId:'website'}],
 [repo,{...request,commit:base}],
 [repo,{...request,commit:'main'}],
 [repo,{...request,expectedBaseCommit:'origin/main'}],
 [repo,{...request,force:true}],
 [repo,{...request,delete:true}],
 [repo,{...request,merge:true}],
 [repo,{...request,idempotencyKey:''}],
 [{...repo,githubRepositoryId:null},request],
 ];
 for(const [binding,submit] of invalid)assert.throws(()=>validatePublisherRequest(binding,submit));
});
test('repository identity can change without changing the stable internal project binding',()=>{
 const moved={...repo,owner:'future-schmaqq-org',name:'schmaqq-studio',defaultBranch:'trunk'};
 const result=validatePublisherRequest(moved,{...request,branch:'studio/new-feature'});
 assert.equal(result.owner,'future-schmaqq-org');
 assert.equal(result.defaultBranch,'trunk');
});
