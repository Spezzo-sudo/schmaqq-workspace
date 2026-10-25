import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {createInvite,openStore} from './store.mjs';

test('parallel task ownership, durable task discussion and active workspace assignment protection',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-collaboration-')),origin='http://127.0.0.1:44346',filename=path.join(dir,'studio.sqlite');
 const app=createStudioServer({filename,origin,previewOrigin:'http://127.0.0.1:44347'});await new Promise(r=>app.server.listen(44346,'127.0.0.1',r));
 async function request(route,data,cookie,from=origin){const r=await fetch(origin+route,{method:data?'POST':'GET',headers:{...(data?{Origin:from,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const act=(account,action,task,extra={})=>request('/api/collaboration/task',{action,task,...extra},account.cookie);
 try{
  assert.equal((await request('/api/collaboration')).status,401);
  const accounts=[];for(const name of ['a','b']){
   const account=await request('/api/auth/register',{invite:createInvite(app.db,name+'@fixture.invalid'),name,password:'fixture-password-1234'});account.id=app.db.prepare('SELECT id FROM members WHERE name=?').get(name).id;
   account.device=(await request('/api/development',{action:'device',name},account.cookie)).data;accounts.push(account);
  }
  const [a,b]=accounts,task=randomUUID(),other=randomUUID();
  app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(task,'website','Startseite','Erstes Thema','todo','Normal',null,Date.now());
  app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(other,'automation','Automation','Anderes Projekt','todo','Normal',null,Date.now());
  const race=await Promise.all(accounts.map(account=>act(account,'claim',task)));assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  const owner=race[0].status===200?a:b,peer=owner===a?b:a;
  assert.equal(app.db.prepare('SELECT status FROM tasks WHERE id=?').get(task).status,'doing');
  assert.equal((await act(peer,'release',task)).status,403);
  const cid=randomUUID(),body='Frage zur Funktion: Soll diese Änderung auch mobil gelten?';
  assert.equal((await act(peer,'comment',task,{id:cid,body})).status,200);
  assert.equal((await act(peer,'comment',task,{id:cid,body})).status,200); // Retried save is idempotent.
  assert.equal((await act(owner,'comment',task,{id:cid,body})).status,409);
  assert.equal((await act(peer,'comment',task,{id:cid,body:'anderer Inhalt'})).status,409);
  assert.equal((await request('/api/collaboration/task',{action:'comment',task,id:randomUUID(),body:'blocked'},a.cookie,'https://foreign.invalid')).status,403);
  assert.equal((await act(a,'comment',task,{id:randomUUID(),body:'   '})).status,400);
  const detail=(await request('/api/collaboration/task?id='+task,null,owner.cookie)).data;assert.equal(detail.comments.length,1);assert.equal(detail.comments[0].author,peer.id);assert.equal(detail.comments[0].body,body);
  const board=(await request('/api/collaboration?project=website',null,peer.cookie)).data;assert.equal(board.tasks.length,1);assert.equal(board.tasks[0].commentCount,1);
  assert.equal((await request('/api/collaboration?project=absent',null,a.cookie)).status,404);
  const copy=await request('/api/development',{action:'job',operation:'prepare',project:'website',device:owner.device.id,task,title:'Startseite',scope:'site/index.html'},owner.cookie);assert.equal(copy.status,200);
  const reviewId=randomUUID();app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(reviewId,owner.id,owner.device.id,'website','review',JSON.stringify({worktree:copy.data.id}),'completed',Date.now(),JSON.stringify({commit:'a'.repeat(40),diff:'diff --git a/file b/file\n+change',output:'private fixture detail'}));
  const withReview=(await request('/api/collaboration/task?id='+task,null,peer.cookie)).data;
  assert.equal(withReview.reviews[0].id,reviewId);assert.equal(withReview.reviews[0].state,'pending');assert.ok(!JSON.stringify(withReview.reviews).includes('private fixture detail'));
  const diffRoute='/api/collaboration/task-diff?task='+task+'&review='+reviewId;
  assert.equal((await request(diffRoute,null)).status,401,'Public review content must stay private');
  const diffResponse=await request(diffRoute,null,peer.cookie);
  assert.equal(diffResponse.status,200);assert.equal(diffResponse.data.complete,true);
  assert.equal(diffResponse.data.diff,'diff --git a/file b/file\n+change');
  assert.equal(diffResponse.data.ownerName,app.db.prepare('SELECT name FROM members WHERE id=?').get(owner.id).name);
  assert.ok(!JSON.stringify(diffResponse.data).includes('private fixture detail'));
  assert.equal((await request('/api/collaboration/task-diff?task='+other+'&review='+reviewId,null,peer.cookie)).status,404,'No cross-task diff');
  assert.equal((await request('/api/collaboration/task-diff?task='+task+'&review=missing',null,peer.cookie)).status,404);
  assert.equal((await request('/api/collaboration/task-diff?task='+task+'&review=bad%2Fslash',null,peer.cookie)).status,400);
  app.db.prepare('UPDATE jobs SET result=? WHERE id=?').run(JSON.stringify({commit:'a'.repeat(40),diff:'<secret in truncated file>',diffTruncated:true}),reviewId);
  const truncated=(await request(diffRoute,null,peer.cookie)).data;
  assert.equal(truncated.complete,false);assert.equal(truncated.diff,'');
  app.db.prepare('UPDATE jobs SET result=? WHERE id=?').run(JSON.stringify({commit:'a'.repeat(40),diff:'diff --git a/file b/file\n+change'}),reviewId);
  assert.equal(withReview.changes[0].workspace,copy.data.id);assert.equal(withReview.changes[0].review.id,reviewId);
  assert.equal(withReview.changes[0].currentRevision,'unverified');assert.ok(!JSON.stringify(withReview.changes).includes('private fixture detail'));
  const changeBoard=(await request('/api/collaboration?project=website',null,peer.cookie)).data;
  assert.equal(changeBoard.changes[0].task,task);assert.equal(changeBoard.changes[0].review.commit,'a'.repeat(40));
  assert.equal((await request('/api/collaboration?project=automation',null,peer.cookie)).data.changes.length,0);
  const note={workspace:copy.data.id,revision:0,kind:'feature',body:'Neue gemeinsame Startseite; Anforderungen aus der Aufgabe umgesetzt.'};
  assert.equal((await request('/api/collaboration/change',note,peer.cookie)).status,403);
  assert.equal((await request('/api/collaboration/change',note,owner.cookie,'https://foreign.invalid')).status,403);
  assert.equal((await request('/api/collaboration/change',note,owner.cookie)).status,200);
  assert.equal((await request('/api/collaboration/change',{...note,body:'Stale overwrite'},owner.cookie)).status,409);
  assert.equal((await request('/api/collaboration/task?id='+task,null,peer.cookie)).data.changes[0].note.body,note.body);
  assert.equal((await request('/api/collaboration/change',{...note,revision:1,kind:'fix',body:'Korrigiert'},owner.cookie)).status,200);
  assert.equal((await request('/api/collaboration/task?id='+task,null,peer.cookie)).data.changes[0].note.revision,2);
  assert.equal((await request('/api/development/reviews',{id:randomUUID(),job:reviewId,commit:'a'.repeat(40),decision:'approved',body:'Geprüft'},peer.cookie)).status,200);
  assert.equal((await request('/api/collaboration/task?id='+task,null,owner.cookie)).data.reviews[0].state,'approved');
  assert.equal((await act(owner,'release',task)).status,409);
  assert.equal((await request('/api/workspace',{action:'assign',id:task,assignee:peer.id},peer.cookie)).status,409);
  assert.equal((await request('/api/workspace',{action:'assign',id:task,assignee:null},owner.cookie)).status,409);
  assert.equal((await request('/api/collaboration/task?id='+task,null,peer.cookie)).data.workspaces[0].owner,owner.id);
  assert.equal((await request('/api/development',{action:'job',operation:'prepare',project:'website',device:peer.device.id,task},peer.cookie)).status,409);
  await request('/api/development',{action:'cancel',id:copy.data.id},owner.cookie);
  assert.equal((await act(owner,'release',task)).status,200);
  assert.equal((await act(peer,'claim',task)).status,200);
  assert.equal((await act(peer,'status',task,{status:'done'})).status,200);assert.equal((await act(peer,'claim',task)).status,409);
  const reopened=openStore(filename);try{assert.equal(reopened.prepare('SELECT body FROM task_comments WHERE id=?').get(cid).body,body);}finally{reopened.close();}
 }finally{await new Promise(r=>app.server.close(r));app.db.close();assert.ok(dir.startsWith(path.join(os.tmpdir(),'studio-collaboration-')));rmSync(dir,{recursive:true,force:true});}
});
