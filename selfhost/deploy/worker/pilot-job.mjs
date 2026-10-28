/** Operator acceptance: run one real code job sequence for the Studio owner
 * through placement "auto" and wait for the executor's results. Job rows are
 * the same the Studio API creates and appear in the owner's history, titled as
 * operator-started. Prints only states, executor and bounded check output.
 * Usage: STUDIO_DATA_DIR=... node pilot-job.mjs PROJECT_ID
 */
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {resolveDevice} from '../../placement.mjs';

const project=process.argv[2];
if(!/^[\w-]{1,100}$/.test(project??''))throw new Error('Project id required.');
const db=new DatabaseSync(path.join(path.resolve(process.env.STUDIO_DATA_DIR??'.studio'),'studio.sqlite'));
db.exec('PRAGMA busy_timeout=5000');
const owners=db.prepare("SELECT * FROM members WHERE role='owner'").all();
if(owners.length!==1)throw new Error('Exactly one Studio owner is required.');
const member=owners[0];
function queue(operation,worktree){
 const placed=resolveDevice(db,{member,project,device:'auto',worktree});
 const id=randomUUID(),payload={...(worktree?{worktree}:{}),placement:{mode:placed.mode,kind:placed.kind,reason:placed.reason}};
 db.exec('BEGIN IMMEDIATE');
 try{
  db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(id,member.id,placed.device,project,operation,JSON.stringify(payload),'queued',Date.now());
  if(operation==='prepare')db.prepare('INSERT INTO workspaces(job,title,scope,task) VALUES(?,?,?,?)').run(id,'VPS-Worker Pilot (vom Betrieb gestartet)','',null);
  db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e;}
 return {id,placed};
}
async function wait(id){
 for(let i=0;i<300;i++){
  const job=db.prepare('SELECT status,result FROM jobs WHERE id=?').get(id);
  if(!['queued','running','cancelling'].includes(job.status))return {status:job.status,result:job.result?JSON.parse(job.result):null};
  await new Promise(r=>setTimeout(r,2000));
 }
 return {status:'timeout'};
}
const summary=[];
async function step(operation,worktree){
 const {id,placed}=queue(operation,worktree),done=await wait(id);
 const r=done.result??{};
 summary.push({operation,job:id,executor:placed.name,kind:placed.kind,reason:placed.reason,status:done.status,
  detail:r.error?String(r.error).slice(0,300):operation==='inspect'?{ready:r.ready,checks:r.checks}:operation==='prepare'?{branch:r.branch,commit:r.commit}:operation==='check'?{commit:r.commit,output:String(r.checks??'').slice(-400)}:operation==='preview'?{url:r.url?'erstellt':null,files:r.files}:undefined});
 return {id,done};
}
try{
 await step('inspect');
 const prepared=await step('prepare');
 if(prepared.done.status==='completed'){await step('check',prepared.id);await step('preview',prepared.id);}
}finally{
 console.log(JSON.stringify(summary,null,1));db.close();
}
