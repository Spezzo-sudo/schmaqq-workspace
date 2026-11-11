import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {command} from './process.mjs';
import {LocalRunner} from './runner.mjs';

async function fixture(){
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-update-')),seed=path.join(dir,'seed'),origin=path.join(dir,'origin.git'),repo=path.join(dir,'repo');
 mkdirSync(seed,{recursive:true});writeFileSync(path.join(seed,'page.txt'),'eins\nzwei\ndrei\n');writeFileSync(path.join(seed,'other.txt'),'a\n');
 const at=cwd=>(...args)=>command(['git',...args],cwd);
 await at(seed)('init','-b','main');await at(seed)('config','user.name','Fixture');await at(seed)('config','user.email','fixture@invalid.local');
 await at(seed)('add','.');await at(seed)('commit','-m','fixture');
 await command(['git','clone','--bare',seed,origin],dir);await command(['git','clone',origin,repo],dir);
 await at(repo)('config','user.name','Fixture');await at(repo)('config','user.email','fixture@invalid.local');
 const runner=new LocalRunner({stateDir:path.join(dir,'state'),projects:{website:{repo,base:'main',publish:true,workflow:'direct',check:[process.execPath,'-e','0']}}});
 const run=(id,action,payload={})=>runner.run({id,project:'website',action,payload});
 const copyDir=id=>path.join(dir,'state','worktrees','website-'+id);
 // Someone else's change lands on the shared main state.
 const land=async(file,content)=>{const other=path.join(dir,'other-'+Math.random().toString(36).slice(2));await command(['git','clone',origin,other],dir);await at(other)('config','user.name','Other');await at(other)('config','user.email','other@invalid.local');writeFileSync(path.join(other,file),content);await at(other)('commit','-am','other');await at(other)('push','origin','main');};
 return {dir,run,copyDir,land,close:()=>rmSync(dir,{recursive:true,force:true})};
}

test('a copy behind the shared state is reported and brought up to date, keeping saved work',async()=>{
 const f=await fixture();
 try{
  await f.run('copy','prepare');
  writeFileSync(path.join(f.copyDir('copy'),'page.txt'),'eins\nzwei geändert\ndrei\n');
  await f.land('other.txt','b\n');
  await command(['git','fetch','origin'],f.copyDir('copy'));
  assert.equal((await f.run('s1','status',{worktree:'copy'})).behind,1);
  const updated=await f.run('u1','update',{worktree:'copy'});
  assert.equal(updated.behind,0);
  assert.equal(readFileSync(path.join(f.copyDir('copy'),'other.txt'),'utf8'),'b\n','the new shared state arrived');
  assert.match(readFileSync(path.join(f.copyDir('copy'),'page.txt'),'utf8'),/zwei geändert/,'own saved work stays');
 }finally{f.close();}
});

test('a conflicting update names the files and leaves the copy as it was',async()=>{
 const f=await fixture();
 try{
  await f.run('copy','prepare');
  writeFileSync(path.join(f.copyDir('copy'),'page.txt'),'eins\nzwei von mir\ndrei\n');
  await f.land('page.txt','eins\nzwei von jemand anderem\ndrei\n');
  await assert.rejects(f.run('u1','update',{worktree:'copy'}),/dieselben Stellen.*page\.txt/);
  assert.match(readFileSync(path.join(f.copyDir('copy'),'page.txt'),'utf8'),/zwei von mir/);
  assert.equal(await command(['git','status','--porcelain'],f.copyDir('copy')),'','no half-finished merge is left behind');
 }finally{f.close();}
});
