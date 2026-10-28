import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {transaction} from './store.mjs';
const id=z.string().regex(/^[\w-]{1,100}$/),model=z.string().min(1).max(200);
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function aiAccess(db,job){
 const r=db.prepare('SELECT r.*,d.owner,d.revoked FROM ai_resources r JOIN devices d ON d.id=r.device WHERE r.device=?').get(job.device);
 if(!r||r.revoked||r.status!=='ready'||Date.now()-r.updated>60000)return false;
 const p=typeof job.payload==='string'?JSON.parse(job.payload):job.payload;
 return JSON.parse(r.models).includes(p.model)&&JSON.parse(r.projects).includes(job.project)&&(r.owner===job.owner||(r.allow_team&&!!db.prepare('SELECT member FROM ai_grants WHERE device=? AND member=?').get(job.device,job.owner)));
}
export async function aiRoute({route,method,req,db,user,device,send,readJSON,parse}){
 if(route==='/api/runner/capabilities'&&method==='POST'){
  const d=device(req),v=parse(z.object({models:z.array(model).max(30),status:z.enum(['disabled','unreachable','no-models','ready']),allowTeam:z.boolean(),projects:z.array(id).max(30),codex:z.enum(['disabled','not-connected','chatgpt']),development:z.array(z.object({id,setupVersion:z.number().int().min(1).optional(),check:z.boolean(),preview:z.boolean(),allowCodex:z.boolean(),publish:z.boolean()})).max(30).optional()}),await readJSON(req));
  transaction(db,()=>{
   db.prepare('INSERT INTO ai_resources VALUES(?,?,?,?,?,?,?) ON CONFLICT(device) DO UPDATE SET models=excluded.models,status=excluded.status,allow_team=excluded.allow_team,projects=excluded.projects,codex=excluded.codex,updated=excluded.updated').run(d.id,JSON.stringify(v.models),v.status,Number(v.allowTeam),JSON.stringify(v.projects),v.codex,Date.now());
   db.prepare('DELETE FROM runner_project_state WHERE device=?').run(d.id);
   if(v.development)db.prepare('INSERT INTO runner_project_state VALUES(?,?,?)').run(d.id,JSON.stringify(v.development),Date.now());
  });send({ok:true});return true;
 }
 if(route!=='/api/ai')return false;
 const m=user(req);
 if(method==='GET'){
  const resources=db.prepare('SELECT r.device,r.models,r.status,r.allow_team AS allowTeam,r.projects,r.codex,r.updated,d.owner,d.name,m.name AS ownerName FROM ai_resources r JOIN devices d ON r.device=d.id JOIN members m ON d.owner=m.id WHERE d.revoked=0 AND (d.owner=? OR (r.allow_team=1 AND EXISTS(SELECT 1 FROM ai_grants g WHERE g.device=d.id AND g.member=?)))').all(m.id,m.id).map(r=>({...r,models:JSON.parse(r.models),projects:JSON.parse(r.projects),grants:r.owner===m.id?db.prepare('SELECT member FROM ai_grants WHERE device=?').all(r.device).map(x=>x.member):[],codex:r.owner===m.id?r.codex:'private',online:Date.now()-r.updated<60000}));
  const jobs=db.prepare("SELECT j.id,j.owner,j.device,j.project,j.status,j.created,json_extract(j.payload,'$.model') AS model FROM jobs j JOIN devices d ON d.id=j.device WHERE j.action='local-ai' AND (j.owner=? OR d.owner=?) ORDER BY j.created DESC LIMIT 30").all(m.id,m.id);
  for(const resource of resources){const state=db.prepare('SELECT projects FROM runner_project_state WHERE device=?').get(resource.device);resource.development=resource.owner===m.id&&state?JSON.parse(state.projects):[];}
  send({resources,jobs,members:db.prepare('SELECT id,name FROM members').all()});return true;
 }
 if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');const v=await readJSON(req);
 if(v.action==='share'){
  const value=parse(z.object({action:z.literal('share'),device:id,members:z.array(id).max(50)}),v);
  const own=db.prepare('SELECT * FROM devices WHERE id=? AND owner=? AND revoked=0').get(value.device,m.id);if(!own)throw fail(403,'Nur der Besitzer kann seinen Rechner freigeben.');
  if(value.members.length&&!db.prepare('SELECT allow_team FROM ai_resources WHERE device=?').get(own.id)?.allow_team)throw fail(409,'Team-Nutzung zuerst lokal auf diesem PC freigeben.');
  transaction(db,()=>{for(const member of value.members)if(!db.prepare('SELECT id FROM members WHERE id=?').get(member))throw fail(400,'Mitglied fehlt.');db.prepare('DELETE FROM ai_grants WHERE device=?').run(own.id);for(const member of new Set(value.members))if(member!==m.id)db.prepare('INSERT INTO ai_grants VALUES(?,?)').run(own.id,member);
   for(const job of db.prepare("SELECT * FROM jobs WHERE device=? AND action='local-ai' AND status IN ('queued','running')").all(own.id))if(job.owner!==m.id&&!value.members.includes(job.owner))db.prepare('UPDATE jobs SET status=? WHERE id=?').run(job.status==='queued'?'cancelled':'cancelling',job.id);
  });send({ok:true});return true;
 }
 const value=parse(z.object({action:z.literal('run'),device:id,project:id,model,prompt:z.string().trim().min(1).max(12000)}),v);
 if(!db.prepare('SELECT id FROM projects WHERE id=?').get(value.project))throw fail(404,'Projekt fehlt.');
 const payload={model:value.model,prompt:value.prompt},job={owner:m.id,device:value.device,project:value.project,payload};
 if(!aiAccess(db,job))throw fail(403,'Dieses Modell ist nicht erreichbar oder nicht für dich freigegeben.');
 if(db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE device=? AND status IN ('queued','running','cancelling')").get(value.device).n>=3)throw fail(409,'Dieser PC hat bereits drei Aufträge. Bitte kurz warten.');
 const jid=randomUUID();db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(jid,m.id,value.device,value.project,'local-ai',JSON.stringify(payload),'queued',Date.now());send({ok:true,id:jid});return true;
}
