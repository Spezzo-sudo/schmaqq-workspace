import {z} from 'zod';
import {metadata,storeMetadata} from './team-model.mjs';

/** Executor availability and placement v1.
 * An executor is a runner device. Placement only ever chooses among the
 * requesting member's own, non-revoked devices: the own-device boundary for
 * code jobs is unchanged. A server worker is such a device whose runner
 * reports kind "server". Older runners without a host report count as PCs.
 * Host facts and project rules live in workspace_meta, so the database schema
 * stays exactly the pinned baseline (schema changes need a versioned migration).
 */
export const ONLINE_MS=30000;
export const placementModes=['auto','pc','server'];
export const hostSchema=z.object({
 kind:z.enum(['pc','server']),os:z.string().max(40),arch:z.string().max(20),node:z.string().max(40),
 cpus:z.number().int().min(1).max(4096),memoryMb:z.number().int().min(1).max(16777216),label:z.string().trim().max(80).optional()
});
const fail=(status,message)=>Object.assign(new Error(message),{status});
const modeText={auto:'Automatisch: zuerst ein erreichbarer Server, sonst ein eigener PC',pc:'Nur eigener PC',server:'Nur Server-Worker'};

const hostKey=device=>'executor:v1:host:'+device,placementKey=project=>'executor:v1:placement:'+project;
export function recordHost(db,deviceId,host,now=Date.now()){storeMetadata(db,hostKey(deviceId),{...host,updated:now});}
export function deviceHost(db,deviceId){return metadata(db,hostKey(deviceId));}
export function placementMode(db,project){const mode=metadata(db,placementKey(project))?.mode;return placementModes.includes(mode)?mode:'auto';}
export function canConfigurePlacement(db,member,project){
 return member.role==='owner'||db.prepare('SELECT owner FROM project_starts WHERE project=?').get(project)?.owner===member.id;
}
export function setPlacement(db,{member,project,mode},now=Date.now()){
 if(!placementModes.includes(mode))throw fail(400,'Unbekannte Ausführungsregel.');
 if(!db.prepare('SELECT id FROM projects WHERE id=?').get(project))throw fail(404,'Projekt nicht gefunden.');
 if(!canConfigurePlacement(db,member,project))throw fail(403,'Nur die verantwortliche Person kann die Ausführungsregel ändern.');
 storeMetadata(db,placementKey(project),{mode,updatedBy:member.id,updated:now});
}

/** Own executors with availability and reported capabilities. */
export function executors(db,memberId,now=Date.now()){
 return db.prepare(`SELECT d.id,d.name,d.seen,s.projects,
  EXISTS(SELECT 1 FROM jobs j WHERE j.device=d.id AND j.status IN ('queued','running','cancelling')) AS busy
  FROM devices d LEFT JOIN runner_project_state s ON s.device=d.id
  WHERE d.owner=? AND d.revoked=0 ORDER BY d.name`).all(memberId).map(d=>{
  const stored=deviceHost(db,d.id),host=stored?{kind:stored.kind,os:stored.os,arch:stored.arch,node:stored.node,cpus:stored.cpus,memoryMb:stored.memoryMb,...(stored.label?{label:stored.label}:{})}:null;
  const projects=d.projects?JSON.parse(d.projects).map(p=>p.id):null;
  return {id:d.id,name:d.name,kind:host?.kind==='server'?'server':'pc',online:now-d.seen<ONLINE_MS,seen:d.seen,busy:!!d.busy,host,projects};
 });
}
const allowed=(mode,executor)=>mode==='auto'||executor.kind===mode;
const label=executor=>`${executor.name} (${executor.kind==='server'?'Server':'PC'})`;

/** Pick an executor for a new project-level job (inspect/prepare).
 * Rule v1, deterministic: the project's placement mode filters by kind; only
 * online executors that report the project as configured qualify; servers
 * come first (the VPS is the main machine), idle before busy, then the most
 * recently seen. No silent fallback outside the project rule.
 */
export function chooseExecutor(db,{memberId,project,now=Date.now()}){
 const mode=placementMode(db,project),own=executors(db,memberId,now);
 const candidates=own.filter(e=>allowed(mode,e)&&e.online&&e.projects?.includes(project));
 candidates.sort((a,b)=>(a.kind==='server'?0:1)-(b.kind==='server'?0:1)||Number(a.busy)-Number(b.busy)||b.seen-a.seen);
 const chosen=candidates[0];
 if(!chosen){
  const configured=own.filter(e=>allowed(mode,e)&&e.projects?.includes(project));
  throw fail(409,configured.length?`Kein passender Ausführer ist gerade erreichbar (${modeText[mode]}). Eingerichtet: ${configured.map(label).join(', ')}.`:`Für dieses Projekt ist kein passender Ausführer eingerichtet (${modeText[mode]}).`);
 }
 return {device:chosen.id,mode,reason:`${modeText[mode]} → ${label(chosen)}${chosen.busy?', Auftrag wartet auf laufende Arbeit':''}`};
}

/** Resolve the device of a job request. "auto" follows the placement rule or,
 * for jobs inside an existing copy, the device that holds that copy. Explicit
 * choices must also satisfy the project rule.
 */
export function resolveDevice(db,{member,project,device,worktree,now=Date.now()}){
 const mode=placementMode(db,project);
 let placement;
 if(device==='auto'){
  if(worktree){
   const base=db.prepare("SELECT device FROM jobs WHERE id=? AND owner=? AND project=? AND action='prepare'").get(worktree,member.id,project);
   if(!base)throw fail(403,'Eine eigene vorbereitete Arbeitskopie wird benötigt.');
   placement={device:base.device,mode,reason:'Arbeitskopie liegt auf diesem Ausführer'};
  }else placement=chooseExecutor(db,{memberId:member.id,project,now});
 }else placement={device,mode,reason:'Ausdrücklich gewählt'};
 const executor=executors(db,member.id,now).find(e=>e.id===placement.device);
 if(!executor)throw fail(403,'Wähle deinen eigenen Runner.');
 if(!allowed(mode,executor))throw fail(409,`Die Projektregel erlaubt hier nur: ${modeText[mode]}.`);
 return {...placement,kind:executor.kind,name:executor.name};
}
export function placementView(db,member,project,now=Date.now()){
 const mode=placementMode(db,project);let recommendation;
 try{recommendation=chooseExecutor(db,{memberId:member.id,project,now});}catch(e){recommendation={error:e.message};}
 return {project,mode,modes:placementModes.map(id=>({id,text:modeText[id]})),canEdit:canConfigurePlacement(db,member,project),executors:executors(db,member.id,now),recommendation};
}
