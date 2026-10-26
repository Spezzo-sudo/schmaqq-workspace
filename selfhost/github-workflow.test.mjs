import test from 'node:test';
import assert from 'node:assert/strict';
import {openStore} from './store.mjs';
import {createGithubWorkflow} from './github-workflow.mjs';
import {storeMetadata,completion} from './team-model.mjs';
function fixture(t){
 const db=openStore(':memory:');t.after(()=>db.close());
 db.exec('CREATE TABLE github_connections(member TEXT PRIMARY KEY,subject TEXT,login TEXT,verified INTEGER)');
 for(const [id,subject] of [['author','11'],['peer','22']]){db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(id,id,id+'@fixture.invalid','unused','member',0);db.prepare('INSERT INTO github_connections VALUES(?,?,?,?)').run(id,subject,id,0);}
 db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run('task','website','Change','Goal','review','Normal','author',0);
 db.prepare('INSERT INTO devices VALUES(?,?,?,?,?,?)').run('device','author','Fixture','unused',0,0);
 db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run('copy','author','device','website','prepare','{}','completed',1,'{}');
 db.prepare('INSERT INTO workspaces(job,title,scope,task) VALUES(?,?,?,?)').run('copy','Change','','task');
 const sha='a'.repeat(40),result={workflow:'pull-request',published:true,commit:sha,branch:'studio/copy',diff:'diff',checks:'passed'};
 db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run('submission','author','device','website','submit',JSON.stringify({worktree:'copy',contractRevision:0}),'completed',2,JSON.stringify(result));
 storeMetadata(db,'room:v1:project:website',{revision:0,repository:'https://github.com/fixture/project',base:'main'});
 const state={pr:null,reviews:[],calls:[],mergeable:true};
 const makePr=()=>({number:7,state:'open',draft:false,merged_at:null,head:{ref:'studio/copy',sha,repo:{full_name:'fixture/project'}},base:{ref:'main',repo:{full_name:'fixture/project'}},mergeable:state.mergeable,mergeable_state:'clean'});
 const request=async(url,options)=>{
  const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null,peer=options.headers.Authorization==='Bearer fixture-peer';state.calls.push({path,method:options.method,body});
  let value;
  if(path==='/user')value={id:peer?22:11};
  else if(path==='/user/repos')value={full_name:'fixture/'+body.name,private:true,default_branch:'main'};
  else if(path.endsWith('/reviews')){
   if(options.method==='POST')state.reviews.push({id:state.reviews.length+1,user:{id:peer?22:11},commit_id:body.commit_id,state:body.event==='APPROVE'?'APPROVED':'CHANGES_REQUESTED',body:body.body,submitted_at:new Date().toISOString()});
   value=options.method==='POST'?state.reviews.at(-1):state.reviews;
  }else if(path.endsWith('/merge')){assert.equal(body.sha,sha);state.pr={...state.pr,merged_at:new Date().toISOString(),merge_commit_sha:'b'.repeat(40),state:'closed'};value={merged:true,sha:'b'.repeat(40)};}
  else if(path.endsWith('/pulls')){if(options.method==='POST'){state.pr=makePr();value=state.pr;}else value=state.pr?[state.pr]:[];}
  else if(path.endsWith('/pulls/7'))value={...state.pr,mergeable:state.mergeable};
  else throw Error('Unexpected provider path '+path);
  return {ok:true,status:200,json:async()=>structuredClone(value)};
 };
 const workflow=createGithubWorkflow({db,tokens:{author:'fixture-author',peer:'fixture-peer'},request});
 return {db,state,workflow,sha,author:{id:'author'},peer:{id:'peer'}};
}
test('GitHub workflow creates exact PR, uses personal independent review, pins merge SHA and confirms completion',async t=>{
 const f=fixture(t);assert.equal((await f.workflow.perform('open','submission',f.author)).number,7);
 await assert.rejects(()=>f.workflow.perform('review','submission',f.author,'approved',''),{status:403});
 await assert.rejects(()=>f.workflow.perform('merge','submission',f.author),{status:409});
 await f.workflow.perform('review','submission',f.peer,'approved','Reviewed');
 assert.equal((await f.workflow.perform('merge','submission',f.author)).state,'merged');
 assert.equal(f.db.prepare('SELECT status FROM tasks WHERE id=?').get('task').status,'done');
 assert.equal(completion(f.db,f.db.prepare('SELECT * FROM tasks WHERE id=?').get('task')).ready,true);
 const merge=f.state.calls.find(c=>c.method==='PUT');assert.equal(merge.body.sha,f.sha);
});
test('GitHub workflow refuses stale HEAD, wrong target and unknown mergeability',async t=>{
 const f=fixture(t);await f.workflow.perform('open','submission',f.author);
 f.state.pr.head.sha='c'.repeat(40);await assert.rejects(()=>f.workflow.perform('refresh','submission',f.peer),{status:409});
 f.state.pr.head.sha=f.sha;f.state.pr.base.ref='other';await assert.rejects(()=>f.workflow.perform('refresh','submission',f.peer),{status:409});
 f.state.pr.base.ref='main';await f.workflow.perform('review','submission',f.peer,'approved','');f.state.mergeable=null;
 await assert.rejects(()=>f.workflow.perform('merge','submission',f.author),{status:409});assert.equal(f.state.calls.some(c=>c.method==='PUT'),false);
});
test('GitHub revocation is authoritative and an identity token cannot silently become repository access',async t=>{
 const f=fixture(t);await f.workflow.perform('open','submission',f.author);await f.workflow.perform('review','submission',f.peer,'approved','');
 f.state.reviews[0].state='DISMISSED';await assert.rejects(()=>f.workflow.perform('merge','submission',f.author),{status:409});
 const none=createGithubWorkflow({db:f.db,tokens:{},request:()=>{throw Error('Must not call provider');}});await assert.rejects(()=>none.perform('open','submission',f.author),{status:409});
 f.db.prepare('UPDATE github_connections SET subject=? WHERE member=?').run('99','peer');await assert.rejects(()=>f.workflow.perform('refresh','submission',f.peer),{status:403});
});
test('GitHub refuses changed requirements and newly mutated code before provider write',async t=>{
 const f=fixture(t);await f.workflow.perform('open','submission',f.author);
 storeMetadata(f.db,'team:v1:task:task',{kind:'code',revision:1});await assert.rejects(()=>f.workflow.perform('review','submission',f.peer,'approved',''),{status:409});
 storeMetadata(f.db,'team:v1:task:task',{kind:'code',revision:0});
 f.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run('new-save','author','device','website','save-file',JSON.stringify({worktree:'copy'}),'completed',3,'{}');
 await assert.rejects(()=>f.workflow.perform('merge','submission',f.author),{status:409});
});

test('new private GitHub project creation is explicit, identity-bound and idempotent',async t=>{
 const f=fixture(t);f.db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('new-project','New idea','Goal','sage','Im Aufbau',0);storeMetadata(f.db,'room:v1:project:new-project',{revision:0,repository:null,teamShared:true});
 const request={project:'new-project',name:'new-shared-project',revision:0,id:'fixture-operation'};
 const result=await f.workflow.createRepository(f.author,request);assert.equal(result.repository,'https://github.com/fixture/new-shared-project');
 assert.deepEqual(await f.workflow.createRepository(f.author,request),result);
 assert.equal(f.state.calls.filter(c=>c.path==='/user/repos').length,1);
 await assert.rejects(()=>f.workflow.createRepository(f.peer,request),{status:409});
 assert.equal(f.db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('room:v1:project:new-project').value.includes('new-shared-project'),true);
});
