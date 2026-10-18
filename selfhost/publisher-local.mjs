// Offline-only Git handoff into an explicitly prepared synthetic bare repository.
// No Studio API, GitHub App, token, runner, or production integration here.
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,realpathSync,lstatSync,existsSync,statSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validatePublisherRequest} from './publisher-contract.mjs';

const SHA1=/^[a-f0-9]{40}$/;
const MAX_BYTES=5*1024*1024;
function deny(message){throw new Error('Local publisher rejected: '+message);}
function within(folder,filename){return filename.startsWith(folder+path.sep);}
function loadFixture(root,binding){
 const requested=path.resolve(root),actual=realpathSync(requested),temporary=realpathSync(os.tmpdir());
 if(requested!==actual||!actual.startsWith(path.join(temporary,'schmaqq-publisher-fixture-')))deny('Only a real, ephemeral test fixture is supported.');
 const marker=path.join(actual,'fixture.json'),bare=path.join(actual,'remote.git'),incoming=path.join(actual,'incoming');
 for(const location of [marker,bare,incoming]){
  if(!existsSync(location)||realpathSync(location)!==location||lstatSync(location).isSymbolicLink())deny('Fixture contains an invalid or linked path.');
 }
 if(!statSync(bare).isDirectory()||!statSync(incoming).isDirectory()||!statSync(marker).isFile())deny('Fixture layout is invalid.');
 let meta;
 try{meta=JSON.parse(readFileSync(marker,'utf8'));}catch{deny('Fixture manifest is invalid.');}
 if(meta?.mode!=='local-test-only'||meta?.internalProjectId!==binding.internalProjectId||
    String(meta?.githubRepositoryId)!==String(binding.githubRepositoryId)||
    meta?.defaultBranch!==binding.defaultBranch)deny('Fixture binding does not match the selected repository.');
 return {root:actual,bare,incoming};
}
function git(fixture,...args){
 // No shell, network remote or personal Git config; hooks and inherited GIT_* settings excluded.
 const hooks=path.join(fixture.root,'no-hooks');
 mkdirSync(hooks,{recursive:true});
 const env={
  PATH:process.env.PATH??'',HOME:fixture.root,TMPDIR:os.tmpdir(),
  GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:os.devNull,
  GIT_TERMINAL_PROMPT:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_PROTOCOL_FROM_USER:'0',
 };
 const p=spawnSync('git',['-c','core.hooksPath='+hooks,'--git-dir',fixture.bare,...args],{
  cwd:fixture.root,env,encoding:'utf8',timeout:30000,maxBuffer:128*1024,
 });
 if(p.error)deny('Git execution unavailable or timed out.');
 return {status:p.status,stdout:p.stdout.trim(),stderr:p.stderr.trim()};
}
function checked(fixture,...args){
 const r=git(fixture,...args);
 if(r.status!==0)deny('Git validation or update failed: '+args[0]+'.');
 return r.stdout;
}
function refAt(fixture,ref){
 const r=git(fixture,'show-ref','--verify','--hash',ref);
 if(r.status===1)return null;
 if(r.status!==0||!SHA1.test(r.stdout))deny('Unable to read Git reference.');
 return r.stdout;
}
function objectExists(fixture,sha){return git(fixture,'cat-file','-e',sha+'^{commit}').status===0;}
function journalState(fixture,key){
 const dir=path.join(fixture.root,'journal');mkdirSync(dir,{recursive:true});
 const location=path.join(dir,key+'.json');
 if(!existsSync(location))return {location};
 if(lstatSync(location).isSymbolicLink()||!statSync(location).isFile())deny('Invalid journal file.');
 let record;
 try{record=JSON.parse(readFileSync(location,'utf8'));}catch{deny('Journal cannot be parsed.');}
 return {location,record};
}
const digest=data=>createHash('sha256').update(data).digest('hex');

/**
 * Create-only offline fixture publisher. Imports a single-head Git bundle without
 * altering refs, verifies ancestry, then atomically creates refs/heads/studio/*.
 * A pending journal blocks automatic replay until an operator reconciles it.
 */
export function publishLocalBundle({binding,request,fixtureRoot,bundlePath}){
 const approved=validatePublisherRequest(binding,request),fixture=loadFixture(fixtureRoot,binding);
 if(checked(fixture,'rev-parse','--is-bare-repository')!=='true')deny('Target is not bare.');
 if(checked(fixture,'rev-parse','--show-object-format')!=='sha1')deny('The fixture requires Git SHA-1 objects.');
 const baseRef='refs/heads/'+approved.defaultBranch,featureRef='refs/heads/'+approved.branch;
 if(!approved.branch.startsWith('studio/')||approved.branch===approved.defaultBranch)deny('Unsafe branch.');
 if(git(fixture,'check-ref-format','--branch',approved.branch).status!==0)deny('Invalid Git branch name.');
 const base=refAt(fixture,baseRef);
 if(!base||base!==approved.expectedBaseCommit)deny('Base revision changed or missing.');
 const hash=digest(JSON.stringify(approved)),journal=journalState(fixture,approved.idempotencyKey);
 if(journal.record){
  if(journal.record.requestHash!==hash)deny('Idempotency key was reused for a different request.');
  if(journal.record.status!=='complete')deny('Unresolved previous submission requires operator review.');
  if(refAt(fixture,featureRef)!==approved.commit)deny('Previously submitted branch no longer matches.');
  return Object.freeze({branch:approved.branch,commit:approved.commit,base,created:false,replayed:true});
 }
 if(refAt(fixture,featureRef)!==null)deny('Feature branch already exists; update workflow not implemented.');
 const incoming=realpathSync(fixture.incoming),bundle=realpathSync(bundlePath);
 if(!within(incoming,bundle)||path.resolve(bundlePath)!==bundle||lstatSync(bundle).isSymbolicLink())deny('Bundle must be a regular file inside fixture/incoming.');
 const info=statSync(bundle);
 if(!info.isFile()||info.nlink!==1||info.size<100||info.size>MAX_BYTES)deny('Bundle size or type invalid.');
 const heads=git(fixture,'bundle','list-heads',bundle);
 if(heads.status!==0)deny('Invalid Git bundle.');
 const lines=heads.stdout.split('\n').filter(Boolean);
 if(lines.length!==1||lines[0]!==approved.commit+' '+featureRef)deny('Bundle must expose exactly the requested feature revision.');
 checked(fixture,'bundle','verify',bundle);
 // No destination refspec: import objects, never update a named reference.
 checked(fixture,'fetch','--no-tags','--no-write-fetch-head',bundle,featureRef);
 if(!objectExists(fixture,approved.commit))deny('Commit was not imported.');
 if(git(fixture,'merge-base','--is-ancestor',base,approved.commit).status!==0)deny('Commit is not based on approved base.');
 const count=Number(checked(fixture,'rev-list','--count',base+'..'+approved.commit));
 if(!Number.isSafeInteger(count)||count<1||count>200)deny('Commit count out of bounds.');
 if(refAt(fixture,baseRef)!==base||refAt(fixture,featureRef)!==null)deny('References changed during validation.');
 const audit={status:'pending',requestHash:hash,bundleHash:digest(readFileSync(bundle)),commit:approved.commit,base,branch:approved.branch};
 try{writeFileSync(journal.location,JSON.stringify(audit)+'\n',{flag:'wx',mode:0o600});}
 catch{deny('Submission in progress or journal write failed.');}
 checked(fixture,'update-ref',featureRef,approved.commit,'0'.repeat(40));
 if(refAt(fixture,featureRef)!==approved.commit||refAt(fixture,baseRef)!==base)deny('Git reference postcondition failed.');
 const done=journal.location+'.complete';
 writeFileSync(done,JSON.stringify({...audit,status:'complete'})+'\n',{flag:'wx',mode:0o600});
 renameSync(done,journal.location);
 return Object.freeze({branch:approved.branch,commit:approved.commit,base,created:true,replayed:false});
}
