// Pure, fail-closed contract for the future isolated GitHub publisher.
// This file deliberately holds no API client, token, git subprocess or HTTP route.
const shaRe=/^[a-f0-9]{40}$/;
const idRe=/^[1-9][0-9]*$/;
const slugRe=/^[A-Za-z0-9_.-]+$/;
const branchRe=/^studio\/[a-z0-9][a-z0-9._-]{0,99}$/;
function reject(message){throw new Error(message);}
function verifyRepository(binding){
 if(!binding||typeof binding!=='object'||Array.isArray(binding))reject('Repository binding missing.');
 if(typeof binding.internalProjectId!=='string'||!/^[a-z0-9][a-z0-9_-]{0,95}$/.test(binding.internalProjectId))reject('Invalid project ID.');
 if(!idRe.test(String(binding.githubRepositoryId??'')))reject('Stable GitHub repository ID required.');
 if(typeof binding.owner!=='string'||!slugRe.test(binding.owner)||typeof binding.name!=='string'||!slugRe.test(binding.name))reject('Invalid repository name.');
 if(typeof binding.defaultBranch!=='string'||!slugRe.test(binding.defaultBranch))reject('Invalid default branch.');
 if(binding.allowedToPublish!==true)reject('Repository publishing is not explicitly enabled.');
 return {internalProjectId:binding.internalProjectId,githubRepositoryId:String(binding.githubRepositoryId),owner:binding.owner,name:binding.name,defaultBranch:binding.defaultBranch};
}
export function validatePublisherRequest(binding,request){
 const repo=verifyRepository(binding);
 if(!request||typeof request!=='object'||Array.isArray(request))reject('Submission missing.');
 if(typeof request.projectId!=='string'||request.projectId!==repo.internalProjectId)reject('Wrong project binding.');
 if(!idRe.test(String(request.githubRepositoryId??''))||String(request.githubRepositoryId)!==repo.githubRepositoryId)reject('Wrong GitHub repository.');
 if(typeof request.branch!=='string'||!branchRe.test(request.branch)||request.branch.endsWith('.lock'))reject('Only studio/* feature branches may be published.');
 if(request.branch===repo.defaultBranch)reject('Default branch is not publishable.');
 if(!shaRe.test(request.commit??'')||!shaRe.test(request.expectedBaseCommit??''))reject('Exact Git SHA is required.');
 if(request.commit===request.expectedBaseCommit)reject('Empty change cannot be published.');
 if(request.force===true||request.delete===true||request.merge===true)reject('Unsafe publisher operation.');
 if(typeof request.idempotencyKey!=='string'||!/^[-\w]{20,100}$/.test(request.idempotencyKey))reject('Idempotency key required.');
 return Object.freeze({projectId:repo.internalProjectId,githubRepositoryId:repo.githubRepositoryId,owner:repo.owner,repo:repo.name,defaultBranch:repo.defaultBranch,branch:request.branch,commit:request.commit,expectedBaseCommit:request.expectedBaseCommit,idempotencyKey:request.idempotencyKey});
}
