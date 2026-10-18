// Offline test publisher only: accepts one verified bundle into a disposable local Git fixture.
// No server deployment, production repo, token, or GitHub API capability.
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,renameSync,realpathSync,lstatSync,existsSync,statSync,rmSync,mkdtempSync,readdirSync,openSync,fsyncSync,closeSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validatePublisherRequest} from './publisher-contract.mjs';

const SHA1=/^[a-f0-9]{40}$/;
const MAX_BUNDLE=5*1024*1024,MAX_OBJECT_BYTES=12*1024*1024,MAX_BLOB_BYTES=2*1024*1024;
const MAX_OBJECTS=2000,MAX_TREE_FILES=1000,MAX_COMMITS=200;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
function deny(message){throw new Error('Local publisher rejected: '+message);}
function verifyFixture(root,binding){
 const requested=path.resolve(root),actual=realpathSync(requested),temporary=realpathSync(os.tmpdir());
 if(requested!==actual||!actual.startsWith(path.join(temporary,'schmaqq-publisher-fixture-')))deny('Only an ephemeral test fixture is permitted.');
 const marker=path.join(actual,'fixture.json'),bare=path.join(actual,'remote.git'),incoming=path.join(actual,'incoming');
 for(const p of [marker,bare,incoming]){
  if(!existsSync(p)||realpathSync(p)!==p||lstatSync(p).isSymbolicLink())deny('Linked or missing fixture path.');
 }
 if(!statSync(bare).isDirectory()||!statSync(incoming).isDirectory()||!statSync(marker).isFile())deny('Fixture layout invalid.');
 let meta;
 try{meta=JSON.parse(readFileSync(marker,'utf8'));}catch{deny('Fixture manifest invalid.');}
 if(meta?.mode!=='local-test-only'||meta?.internalProjectId!==binding.internalProjectId||
 String(meta?.githubRepositoryId)!==String(binding.githubRepositoryId)||meta?.defaultBranch!==binding.defaultBranch)deny('Fixture binding mismatch.');
 return {root:actual,bare,incoming};
}
function safeGit(fixture,repository,args,{input}={}){
 // Fail closed on other operating systems. Restrict Git and its children, including index-pack/fsck.
 if(process.platform!=='linux'||!existsSync('/usr/bin/prlimit'))deny('Local publisher requires Linux process limits.');
 const noHooks=path.join(fixture.root,'no-hooks');mkdirSync(noHooks,{recursive:true});
 const env={PATH:process.env.PATH??'/usr/bin:/bin',HOME:fixture.root,TMPDIR:os.tmpdir(),
  GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:os.devNull,GIT_TERMINAL_PROMPT:'0',
  GIT_NO_REPLACE_OBJECTS:'1',GIT_ALLOW_PROTOCOL:'file',GIT_LFS_SKIP_SMUDGE:'1'};
 const argv=['git','-c','core.hooksPath='+noHooks,...(repository?['--git-dir',repository]:[]),...args];
 const p=spawnSync('/usr/bin/prlimit',['--as=805306368','--cpu=12','--fsize=16777216','--',...argv],{
  cwd:fixture.root,env,encoding:'utf8',input,timeout:20000,maxBuffer:500000,stdio:['pipe','pipe','pipe'],
 });
 if(p.error)deny('Git process timed out or exceeded process limits.');
 return {status:p.status,stdout:(p.stdout??'').trim(),stderr:(p.stderr??'').trim()};
}
function requireGit(fixture,repository,...args){
 const r=safeGit(fixture,repository,args);
 if(r.status!==0)deny('Git validation failed: '+args[0]+'.');
 return r.stdout;
}
function refAt(fixture,ref){
 const r=safeGit(fixture,fixture.bare,['for-each-ref','--format=%(objectname)',ref]);
 if(r.status!==0)deny('Unable to read Git reference.');
 if(!r.stdout)return null;
 if(!SHA1.test(r.stdout)||r.stdout.includes('\n'))deny('Git reference invalid.');
 return r.stdout;
}
function syncDir(dir){
 const fd=openSync(dir,'r');try{fsyncSync(fd);}finally{closeSync(fd);}
}
function journalFor(fixture,key){
 const folder=path.join(fixture.root,'journal');
 if(existsSync(folder)&&lstatSync(folder).isSymbolicLink())deny('Invalid journal directory.');
 mkdirSync(folder,{recursive:true});
 const file=path.join(folder,key+'.json');
 if(!existsSync(file))return {folder,file,record:null};
 if(lstatSync(file).isSymbolicLink()||!statSync(file).isFile())deny('Invalid journal file.');
 let record;
 try{record=JSON.parse(readFileSync(file,'utf8'));}catch{deny('Unparseable submission journal.');}
 return {folder,file,record};
}
function journalWrite(journal,value,initial){
 if(initial){
  try{writeFileSync(journal.file,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600,flush:true});syncDir(journal.folder);}
  catch{deny('Concurrent submission or journal write failure.');}
 }else{
  const temporary=path.join(journal.folder,'.finished-'+randomUUID());
  try{
   writeFileSync(temporary,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600,flush:true});
   renameSync(temporary,journal.file);syncDir(journal.folder);
  }finally{if(existsSync(temporary))rmSync(temporary);}
 }
}
function regularBundle(fixture,bundlePath){
 if(!path.isAbsolute(bundlePath))deny('Bundle must be an absolute file path.');
 const incoming=realpathSync(fixture.incoming),bundle=realpathSync(bundlePath);
 if(path.resolve(bundlePath)!==bundle||!bundle.startsWith(incoming+path.sep)||lstatSync(bundle).isSymbolicLink())deny('Bundle must be a regular incoming file.');
 const st=statSync(bundle);
 if(!st.isFile()||st.nlink!==1||st.size<100||st.size>MAX_BUNDLE)deny('Bundle size or type invalid.');
 return {bundle,hash:digest(readFileSync(bundle))};
}
function checkObjects(fixture,quarantine,base,commit){
 const list=requireGit(fixture,quarantine,'rev-list','--objects','--no-object-names',base+'..'+commit).split('\n').filter(Boolean);
 if(!list.length||list.length>MAX_OBJECTS||list.some(x=>!SHA1.test(x)))deny('Object count or identity invalid.');
 const check=safeGit(fixture,quarantine,["cat-file","--batch-check=%(objectname) %(objecttype) %(objectsize)"],{input:list.join('\n')+'\n'});
 if(check.status!==0)deny('Unable to verify Git object sizes.');
 const lines=check.stdout.split('\n');
 if(lines.length!==list.length)deny('Object inventory is incomplete.');
 let size=0;
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^([a-f0-9]{40}) (blob|tree|commit|tag) ([0-9]+)$/);
  if(!m||m[1]!==list[i]||m[2]==='tag')deny('Unsupported or missing Git object.');
  const bytes=Number(m[3]);if(!Number.isSafeInteger(bytes))deny('Invalid Git object size.');
  if(m[2]==='blob'&&bytes>MAX_BLOB_BYTES)deny('Oversized Git blob.');
  size+=bytes;if(size>MAX_OBJECT_BYTES)deny('Expanded Git objects exceed budget.');
 }
 const tree=requireGit(fixture,quarantine,'ls-tree','-r','-z','--long',commit);
 const files=tree.split('\0').filter(Boolean);
 if(files.length>MAX_TREE_FILES)deny('Too many checked-out files.');
 for(const entry of files){
  const match=entry.match(/^(100644|100755) blob ([a-f0-9]{40}) ([0-9]+)\t([\s\S]+)$/);
  if(!match)deny('Unsupported tree entry (symlink or submodule).');
  const p=match[4];
  if(p.startsWith('/')||p.includes('\\')||/[\x00-\x1f\x7f]/.test(p)||
     p.split('/').some(part=>!part||part==='.'||part==='..'||part.toLowerCase()==='.git'))deny('Unsafe filename in Git tree.');
  const bytes=Number(match[3]);
  if(!Number.isSafeInteger(bytes)||bytes>MAX_BLOB_BYTES)deny('Large tree blob.');
 }
}
function validateQuarantine(fixture,bundle,base,commit,featureRef){
 const quarantine=mkdtempSync(path.join(fixture.root,'quarantine-'));
 try{
  requireGit(fixture,null,'init','--bare','-q',quarantine);
  // Only the trusted fixture base object store can satisfy thin-bundle prerequisites.
  const alternate=path.join(quarantine,'objects','info','alternates');
  writeFileSync(alternate,path.join(fixture.bare,'objects')+'\n',{flag:'wx',mode:0o600});
  const heads=requireGit(fixture,quarantine,'bundle','list-heads',bundle).split('\n').filter(Boolean);
  if(heads.length!==1||heads[0]!==commit+' '+featureRef)deny('Bundle must contain the exact single review head.');
  requireGit(fixture,quarantine,'bundle','verify',bundle);
  requireGit(fixture,quarantine,'fetch','--no-tags','--no-write-fetch-head',bundle,featureRef);
  const ancestor=safeGit(fixture,quarantine,['merge-base','--is-ancestor',base,commit]);
  if(ancestor.status!==0)deny('Submitted commit is not descended from the pinned base.');
  const number=Number(requireGit(fixture,quarantine,'rev-list','--count',base+'..'+commit));
  if(!Number.isSafeInteger(number)||number<1||number>MAX_COMMITS)deny('Invalid commit count.');
  checkObjects(fixture,quarantine,base,commit);
  requireGit(fixture,quarantine,'fsck','--full','--strict','--no-reflogs');
  requireGit(fixture,quarantine,'update-ref',featureRef,commit,'0'.repeat(40));
  // Only sanitized quarantine objects can now be transferred into the fixture.
  requireGit(fixture,fixture.bare,'fetch','--no-tags','--no-write-fetch-head',quarantine,featureRef);
  if(safeGit(fixture,fixture.bare,['cat-file','-e',commit+'^{commit}']).status!==0)deny('Verified commit not imported.');
 }finally{rmSync(quarantine,{recursive:true,force:true});}
}
/**
 * A write-ahead journal allows safe resumption after interruption either just
 * before or just after an atomic ref transaction. Unknown states fail closed.
 * onCheckpoint is a local test-only injection; the HTTP route never supplies it.
 */
export function publishLocalBundle({binding,request,fixtureRoot,bundlePath,onCheckpoint}){
 const approved=validatePublisherRequest(binding,request),fixture=verifyFixture(fixtureRoot,binding);
 if(requireGit(fixture,fixture.bare,'rev-parse','--is-bare-repository')!=='true')deny('Not a bare repository.');
 if(requireGit(fixture,fixture.bare,'rev-parse','--show-object-format')!=='sha1')deny('SHA-1 fixture required.');
 const baseRef='refs/heads/'+approved.defaultBranch,featureRef='refs/heads/'+approved.branch;
 if(safeGit(fixture,fixture.bare,['check-ref-format','--branch',approved.branch]).status!==0)deny('Invalid feature branch.');
 const base=refAt(fixture,baseRef);
 if(!base||base!==approved.expectedBaseCommit)deny('Base revision missing or changed.');
 const {bundle,hash:bundleHash}=regularBundle(fixture,bundlePath);
 const requestHash=digest(JSON.stringify(approved)),journal=journalFor(fixture,approved.idempotencyKey);
 const current=refAt(fixture,featureRef);
 if(journal.record){
  const old=journal.record;
  if(old.requestHash!==requestHash||old.bundleHash!==bundleHash||old.commit!==approved.commit||
   old.base!==base||old.branch!==approved.branch)deny('Journal request or original bundle differs.');
  if(old.status==='complete'){
   if(current!==approved.commit)deny('Completed feature ref changed.');
   return Object.freeze({branch:approved.branch,commit:approved.commit,base,created:false,replayed:true});
  }
  if(old.status!=='pending'||(current!==null&&current!==approved.commit))deny('Pending journal has an unsafe state.');
  if(current===approved.commit){
   journalWrite(journal,{...old,status:'complete'},false);
   return Object.freeze({branch:approved.branch,commit:approved.commit,base,created:false,replayed:true,recovered:true});
  }
 }else if(current!==null)deny('Branch already exists without an authorized journal.');
 if(current===null){
  validateQuarantine(fixture,bundle,base,approved.commit,featureRef);
  if(refAt(fixture,baseRef)!==base||refAt(fixture,featureRef)!==null)deny('Git refs changed during validation.');
  const pending=journal.record??{status:'pending',requestHash,bundleHash,commit:approved.commit,base,branch:approved.branch};
  if(!journal.record){journalWrite(journal,pending,true);onCheckpoint?.('after-journal');}
  // Atomically verify the base and create only the requested development branch.
  const update='start\nverify '+baseRef+' '+base+'\ncreate '+featureRef+' '+approved.commit+'\nprepare\ncommit\n';
  if(safeGit(fixture,fixture.bare,['update-ref','--stdin'],{input:update}).status!==0)deny('Atomic Git branch transaction was rejected.');
  onCheckpoint?.('after-ref');
 }
 if(refAt(fixture,baseRef)!==base||refAt(fixture,featureRef)!==approved.commit)deny('Post-update Git references disagree.');
 journalWrite(journal,{status:'complete',requestHash,bundleHash,commit:approved.commit,base,branch:approved.branch},false);
 return Object.freeze({branch:approved.branch,commit:approved.commit,base,created:!journal.record,replayed:!!journal.record,recovered:!!journal.record});
}
