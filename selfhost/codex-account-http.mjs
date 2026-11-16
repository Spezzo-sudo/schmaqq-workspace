// Studio route for each member's own ChatGPT sign-in on the server worker.
// Strict separation: a member only ever starts, sees or removes their own sign-in. The job owner is
// always the signed-in member; the worker derives the sign-in folder from that owner, never from input.
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {requirePermission} from './project-roles.mjs';
import {usableExecutors} from './team-workshop.mjs';
import {accountState,codexAccountModes} from './codex-account.mjs';
import {transaction} from './store.mjs';

const fail=(status,message)=>Object.assign(new Error(message),{status});
const id=z.string().regex(/^[\w-]{1,100}$/);
const actions={connect:'login',check:'status',disconnect:'logout'};

/** Projects in which this member may use a server worker (own, or the project's team workshop). */
function serverPlaces(db,member){
 const places=[];
 for(const p of db.prepare('SELECT id,title FROM projects ORDER BY title').all()){
  try{requirePermission(db,member,p.id,'develop');}catch{continue;}
  const server=usableExecutors(db,member,p.id).find(e=>e.kind==='server');
  if(server)places.push({project:p.id,title:p.title,device:server.id,name:server.name});
 }
 return places;
}
function ownJobs(db,member){
 return db.prepare("SELECT id,device,project,payload,status,created,result FROM jobs WHERE owner=? AND action='codex-account' ORDER BY created DESC LIMIT 10").all(member.id);
}
function loginPrompts(db,jobs){
 const sessions=new Map();
 for(const j of jobs.filter(j=>['queued','running','cancelling'].includes(j.status))){
  const row=db.prepare("SELECT text FROM job_events WHERE job=? AND type='session' ORDER BY seq DESC LIMIT 1").get(j.id);
  if(row){try{const v=JSON.parse(row.text);if(typeof v.url==='string'&&typeof v.code==='string')sessions.set(j.id,{url:v.url,code:v.code});}catch{/* ignore */}}
 }
 return sessions;
}

export async function codexAccountRoute({route,method,req,db,user,send,readJSON,parse,now=Date.now}){
 if(route!=='/api/codex-account')return false;
 const m=user(req);
 if(method==='GET'){
  const jobs=ownJobs(db,m);
  send({...accountState(jobs,loginPrompts(db,jobs)),places:serverPlaces(db,m)});return true;
 }
 if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
 const v=parse(z.object({action:z.enum(['connect','check','disconnect']),project:id.optional()}),await readJSON(req));
 const mode=actions[v.action];if(!codexAccountModes.includes(mode))throw fail(400,'Unbekannter Schritt.');
 const places=serverPlaces(db,m);
 const place=v.project?places.find(p=>p.project===v.project):places[0];
 if(!place)throw fail(409,'Kein Server-Worker verfügbar. Er wird in einem Projekt als Team-Werkstatt eingerichtet.');
 const job=randomUUID();
 transaction(db,()=>{
  if(db.prepare("SELECT id FROM jobs WHERE owner=? AND action='codex-account' AND status IN ('queued','running','cancelling')").get(m.id))throw fail(409,'Ein Schritt für dein ChatGPT-Konto läuft bereits.');
  db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(job,m.id,place.device,place.project,'codex-account',JSON.stringify({mode}),'queued',now());
 });
 send({ok:true,job});return true;
}
