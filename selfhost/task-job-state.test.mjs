import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openStore} from './store.mjs';
import {taskJobState,copyHasChange} from './collaboration.mjs';

function fixture(){
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-task-state-')),db=openStore(path.join(dir,'studio.db'),{seedProjects:false});
 db.prepare("INSERT INTO members VALUES('a','Anna','a@x.invalid','x','member',0)").run();
 db.prepare("INSERT INTO devices(id,owner,name,hash) VALUES('d','a','Werkstatt','h')").run();
 db.prepare("INSERT INTO projects VALUES('p','Projekt','','sage','Im Aufbau',0)").run();
 db.prepare("INSERT INTO tasks VALUES('t','p','Startseite','','doing','Normal','a',0)").run();
 let clock=1;
 const job=(id,action,status,result={},payload={worktree:'copy'})=>db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'a','d','p',action,JSON.stringify(payload),status,clock++,JSON.stringify(result));
 job('copy','prepare','completed',{branch:'studio/copy'},{});
 db.prepare("INSERT INTO workspaces(job,title,scope,task,archived,revision) VALUES('copy','Kopie','','t',0,1)").run();
 return {db,job,close:()=>{db.close();rmSync(dir,{recursive:true,force:true});}};
}

test('the latest failed step of a task is reported until a later step succeeds',()=>{
 const f=fixture();
 try{
  assert.equal(taskJobState(f.db,'t').lastFailure,null);
  f.job('s1','submit','failed',{error:'Gebaute Vorschau fehlt index.html.'});
  const failed=taskJobState(f.db,'t').lastFailure;
  assert.equal(failed.action,'submit');assert.match(failed.text,/zur Prüfung/);assert.match(failed.detail,/index\.html/);assert.equal(failed.ownerName,'Anna');
  f.job('r1','read-file','failed',{error:'egal'});
  assert.equal(taskJobState(f.db,'t').lastFailure.id,'s1','reading files does not hide or replace the failure');
  f.job('c1','check','interrupted',{});
  assert.equal(taskJobState(f.db,'t').lastFailure.interrupted,true);
  f.job('s2','submit','completed',{commit:'a'.repeat(40)});
  assert.equal(taskJobState(f.db,'t').lastFailure,null);
 }finally{f.close();}
});

test('a working copy counts as changed only after something was saved or found changed',()=>{
 const f=fixture();
 try{
  assert.equal(copyHasChange(f.db,'copy'),false);
  f.job('st','status','completed',{status:''});assert.equal(copyHasChange(f.db,'copy'),false);
  f.job('cf','create-file','failed',{error:'x'});assert.equal(copyHasChange(f.db,'copy'),false);
  f.job('st2','status','completed',{status:' M site/index.html'});assert.equal(copyHasChange(f.db,'copy'),true);
 }finally{f.close();}
});
