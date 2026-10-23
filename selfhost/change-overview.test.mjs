import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {changeOverview} from './change-overview.mjs';

test('change overview keeps failures and historical evidence honest without exposing job contents',()=>{
 const db=openStore(':memory:');
 try{
  for(const name of ['owner','peer'])db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(name,name,name+'@fixture.invalid','unused','member',0);
  db.prepare('INSERT INTO devices(id,owner,name,hash) VALUES(?,?,?,?)').run('pc','owner','PC','unused-device');
  const copy={id:'copy',owner:'owner',device:'pc',project:'website',taskId:'task'};
  const insert=db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)');
  let sequence=0;
  const job=(action,status,result={},overrides={})=>{const id='job-'+(++sequence);insert.run(id,overrides.owner??'owner','pc',overrides.project??'website',action,JSON.stringify({worktree:'copy',prompt:'private-input',file:'private-filename'}),status,100,JSON.stringify(result));return id;};
  const state=()=>changeOverview(db,[copy])[0];
  assert.equal(state().check,null);assert.equal(state().currentRevision,'unverified');
  const check=job('check','completed',{checks:'private-output',commit:'a'.repeat(40)});
  job('preview','completed',{url:'https://preview.invalid/private-capability',previewBundle:{'private-file':'private-bytes'}});
  const review=job('review','completed',{commit:'a'.repeat(40),diff:'private-diff',checks:'private-checks',published:false});
  assert.equal(state().check.id,review);assert.equal(state().check.via,'review');assert.equal(state().check.changedAfter,false);assert.equal(state().review.state,'pending');
  assert.notEqual(check,review); // The review re-ran the tests on its commit and replaces the older check.
  db.prepare('INSERT INTO code_reviews(id,job,commit_sha,reviewer,decision,body,created) VALUES(?,?,?,?,?,?,?)').run('approval',review,'a'.repeat(40),'peer','approved','private-review-body',100);
  assert.equal(state().review.state,'approved');
  // Same timestamp, later row: successful file save invalidates older evidence.
  job('save-file','completed',{content:'private-content'});
  assert.equal(state().check.changedAfter,true);assert.equal(state().preview.changedAfter,true);assert.equal(state().review.changedAfter,true);
  assert.equal(state().review.state,'approved'); // Historical vote remains, not current-code approval.
  job('check','failed',{error:'private-error'});
  assert.equal(state().check.status,'failed');assert.equal(state().check.commit,null);
  job('check','cancelled');assert.equal(state().check.status,'cancelled');
  job('check','running');assert.equal(state().check.status,'running');
  job('check','completed',{commit:'b'.repeat(40)});
  job('save-file','failed');assert.equal(state().check.changedAfter,false);
  job('codex','failed');assert.equal(state().check.changedAfter,true); // A stopped agent may have written files.
  job('check','completed',{commit:'c'.repeat(40)},{owner:'peer'});
  job('check','completed',{commit:'d'.repeat(40)},{project:'automation'});
  assert.equal(state().check.commit,'b'.repeat(40));
  job('submit','completed',{commit:'b'.repeat(40),published:true});
  assert.equal(state().publication.published,true);
  job('submit','failed',{published:true});assert.equal(state().publication.status,'completed');
  const safe=JSON.stringify(state());
  for(const marker of ['private-', 'prompt','url','diff','checks','content'])assert.ok(!safe.includes(marker),marker);
  assert.equal(state().currentRevision,'unverified'); // Never infer filesystem currency from job timestamps.
  const proof=(revision)=>({revision:revision.repeat(64),observedAt:200});
  job('check','completed',{commit:'b'.repeat(40),source:proof('1')});
  assert.equal(state().check.freshness,'same');assert.equal(state().currentRevision,'observed');
  job('status','completed',{source:proof('2')});
  assert.equal(state().check.freshness,'changed');assert.equal(state().check.changedAfter,true);
  job('status','completed',{source:proof('1')});
  assert.equal(state().check.freshness,'same');assert.equal(state().check.changedAfter,false);
  job('preview','completed',{source:{revision:null,observedAt:200,reason:'changed_during_run'}});
  assert.equal(state().check.freshness,'unverified');assert.equal(state().currentRevision,'unverified');
 }finally{db.close();}
});

test('review test evidence is revision-bound and a failed later review cannot become a passing test',()=>{
 const db=openStore(':memory:');
 try{
  db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run('owner','Owner','owner@fixture.invalid','unused','member',0);
  db.prepare('INSERT INTO devices(id,owner,name,hash) VALUES(?,?,?,?)').run('pc','owner','PC','unused');
  const copy={id:'copy',owner:'owner',device:'pc',project:'website',taskId:null};
  let created=0;
  const job=(id,action,status,revision)=>db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(id,'owner','pc','website',action,JSON.stringify({worktree:'copy'}),status,++created,JSON.stringify({commit:'a'.repeat(40),source:{revision:revision.repeat(64),observedAt:created}}));
  const state=()=>changeOverview(db,[copy])[0];
  job('review','review','completed','1');
  assert.equal(state().check.via,'review');assert.equal(state().check.freshness,'same');
  job('changed','status','completed','2');
  assert.equal(state().check.changedAfter,true);
  job('failed-review','review','failed','2');
  assert.equal(state().check.id,'review');assert.equal(state().check.changedAfter,true);
  job('new-test','check','completed','2');
  assert.equal(state().check.id,'new-test');assert.equal(state().check.via,undefined);
  job('published','submit','completed','2');
  assert.equal(state().check.id,'published');assert.equal(state().check.via,'review');assert.equal(state().check.freshness,'same');
  job('failed-test','check','failed','2');
  assert.equal(state().check.status,'failed');
 }finally{db.close();}
});
