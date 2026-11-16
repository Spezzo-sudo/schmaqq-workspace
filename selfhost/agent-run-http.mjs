import {randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {digest,token,transaction} from './store.mjs';
import {can,requirePermission} from './project-roles.mjs';
import {agentsFor,buildRoomContext} from './room-http.mjs';

const fail=(status,message)=>Object.assign(new Error(message),{status});
const id=z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const runCreate=z.object({project:id,agent:id,message:id}).strict();
const workRun=z.object({run:id,lease:z.string().regex(/^[a-zA-Z0-9_-]{43}$/)}).strict();
const finishRun=workRun.extend({status:z.enum(['completed','failed','cancelled']),output:z.string().trim().max(4000).optional(),errorCode:z.enum(['provider-unavailable','quota-exceeded','timeout','crash','cancelled','protocol-error']).optional()}).strict();
const prefix='hermes:v1:run:';
const readMeta=(db,key)=>{const record=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(key);return record?JSON.parse(record.value):{};};
function secureMatch(a,b){
 const x=Buffer.from(digest(a)),y=Buffer.from(digest(b));
 return timingSafeEqual(x,y);
}
const summary=run=>({
 id:run.id,agent:run.agent,owner:run.owner,project:run.project,message:run.source_message,
 status:run.status,created:run.created,updated:run.updated,model:run.model,
 completedMessage:run.completed_message??null,errorCode:run.error_code??null
});

/**
 * Stage-1 durable queue uses the existing audited workspace_meta table.
 * No schema drift, no production migration; atomic row replacement under BEGIN IMMEDIATE.
 * A later scaled rollout may introduce a separately reviewed schema migration.
 */
export function createAgentRunRoute({db,user,readJSON,parse,workers=[]}){
 if(!Array.isArray(workers)||workers.some(w=>!w||typeof w.owner!=='string'||typeof w.token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(w.token)))throw new Error('Ungültige Hermes-Worker-Konfiguration.');
 if(new Set(workers.map(w=>w.owner)).size!==workers.length||new Set(workers.map(w=>w.token)).size!==workers.length)throw new Error('Hermes-Worker müssen getrennte Benutzer und Tokens haben.');
 const registered=workers.map(({owner,token:secret})=>({owner,secret}));
 const allowed=memberId=>registered.some(w=>w.owner===memberId);
 const putRun=run=>db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(prefix+run.id,JSON.stringify(run));
 const findRun=id=>{const item=readMeta(db,prefix+id);return item.id===id?item:null;};
 const ownedRuns=(owner,project=null)=>db.prepare("SELECT value FROM workspace_meta WHERE key LIKE 'hermes:v1:run:%' AND json_extract(value,'$.owner')=?"+(project!==null?" AND json_extract(value,'$.project')=?":"")+" ORDER BY json_extract(value,'$.created') DESC,key DESC LIMIT 200").all(...(project!==null?[owner,project]:[owner])).map(row=>JSON.parse(row.value));
 const runningFor=owner=>ownedRuns(owner).some(r=>['queued','running','cancelling'].includes(r.status));
 function authenticate(req){
  const bearer=req.headers.authorization?.match(/^Bearer ([a-zA-Z0-9_-]{43})$/)?.[1];
  if(!bearer)throw fail(401,'Hermes-Dienstanmeldung erforderlich.');
  const worker=registered.find(w=>secureMatch(w.secret,bearer));
  if(!worker)throw fail(401,'Hermes-Dienstanmeldung ungültig.');
  if(!req.socket?.remoteAddress||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))throw fail(403,'Hermes-Dienst nur auf localhost.');
  return worker.owner;
 }
 function expire(now){
  for(const r of db.prepare("SELECT value FROM workspace_meta WHERE key LIKE 'hermes:v1:run:%' AND json_extract(value,'$.status') IN ('queued','running','cancelling')").all().map(row=>JSON.parse(row.value))){
   if(r.status==='queued'&&now-r.created>600000||r.status!=='queued'&&now-(r.heartbeat??r.claimed??r.created)>120000){
    putRun({...r,status:'failed',error_code:'timeout',updated:now,lease_hash:null});
   }
  }
 }
 function ownerRun(runId,owner){const run=findRun(runId);if(!run||run.owner!==owner)throw fail(404,'Dieser Agentenlauf gehört nicht zu deinem Konto.');return run;}
 function currentAgent(run){return agentsFor(db,run.project).find(a=>a.id===run.agent&&a.active!==false);}
 async function route({route,method,req,url,send}){
  if(!['/api/agent-runs','/api/agent-runs/cancel','/api/hermes-worker/claim','/api/hermes-worker/heartbeat','/api/hermes-worker/finish'].includes(route))return false;
  const now=Date.now();
  if(route.startsWith('/api/hermes-worker/')){
   const owner=authenticate(req);
   if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
   if(route==='/api/hermes-worker/claim'){
    const result=transaction(db,()=>{
     expire(now);
     const entries=ownedRuns(owner);
     if(entries.some(r=>r.status==='running'||r.status==='cancelling'))return null;
     const run=entries.filter(r=>r.status==='queued').sort((a,b)=>a.created-b.created||a.id.localeCompare(b.id))[0];
     if(!run)return null;
     const member=db.prepare('SELECT * FROM members WHERE id=?').get(owner),agent=currentAgent(run);
     const source=db.prepare('SELECT * FROM messages WHERE id=? AND channel=? AND author=?').get(run.source_message,run.project,owner);
     if(!member||!source||!agent||agent.createdBy!==owner||!can(db,member,run.project,'view')||agent.permissions?.readProject===false){
      putRun({...run,status:'failed',error_code:'protocol-error',updated:now});
      return null;
     }
     const context=buildRoomContext(db,run.project);
     const lease=token();
     putRun({...run,status:'running',lease_hash:digest(lease),claimed:now,heartbeat:now,updated:now});
     return {run:run.id,lease,owner,project:run.project,agent:run.agent,model:run.model,prompt:source.body,
      replyTo:source.id,context:context.text,
      profile:{name:agent.name,role:agent.role,purpose:agent.purpose,personality:agent.personality,responsibility:agent.responsibility},
      toolPolicy:{mode:'no-tools',allowed:[]}};
    });
    send({job:result});return true;
   }
   const request=parse(route==='/api/hermes-worker/finish'?finishRun:workRun,await readJSON(req,6000));
   const run=ownerRun(request.run,owner);
   if(!run.lease_hash||!secureMatch(run.lease_hash,digest(request.lease)))throw fail(403,'Die Ausführungsberechtigung ist abgelaufen.');
   if(route==='/api/hermes-worker/heartbeat'){
    if(run.status==='running')putRun({...run,heartbeat:now,updated:now});
    send({status:run.status,cancel:run.status==='cancelling'});return true;
   }
   const outcome=transaction(db,()=>{
    const fresh=ownerRun(request.run,owner);
    if(!fresh.lease_hash||!secureMatch(fresh.lease_hash,digest(request.lease)))throw fail(403,'Ausführung nicht mehr gültig.');
    if(!['running','cancelling'].includes(fresh.status))throw fail(409,'Dieser Agentenlauf wurde bereits beendet.');
    const cancellation=fresh.status==='cancelling'||request.status==='cancelled';
    const success=!cancellation&&request.status==='completed';
    if(success&&!request.output)throw fail(400,'Echte Modellantwort fehlt.');
    const member=db.prepare('SELECT * FROM members WHERE id=?').get(owner),agent=currentAgent(fresh);
    if(success&&(!member||!agent||agent.createdBy!==owner||!can(db,member,run.project,'view')||agent.permissions?.writeMessages===false))throw fail(403,'Agent oder Projektberechtigung wurde widerrufen.');
    const status=cancellation?'cancelled':success?'completed':'failed';
    let messageId=null;
    if(success){
     messageId=randomUUID();
     db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(messageId,fresh.project,owner,request.output,now);
     const meta={kind:'agent',origin:'verified-run',senderAgent:fresh.agent,model:fresh.model,replyTo:fresh.source_message,recipient:owner,recipientKind:'member',runId:fresh.id};
     db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?)').run('room:v1:message:'+messageId,JSON.stringify(meta));
    }
    putRun({...fresh,status,updated:now,lease_hash:null,completed_message:messageId,error_code:status==='failed'?(request.errorCode??'crash'):status==='cancelled'?'cancelled':null});
    return {ok:true,status,message:messageId};
   });
   send(outcome);return true;
  }
  const member=user(req);
  if(method==='GET'&&route==='/api/agent-runs'){
   const project=parse(id,url.searchParams.get('project'));
   requirePermission(db,member,project,'view');
   transaction(db,()=>expire(now));
   send({configured:allowed(member.id),runs:ownedRuns(member.id,project).slice(0,40).map(summary)});return true;
  }
  if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
  if(route==='/api/agent-runs/cancel'){
   const body=parse(z.object({run:id}).strict(),await readJSON(req,1024));
   const run=ownerRun(body.run,member.id);
   const next=run.status==='queued'?'cancelled':run.status==='running'?'cancelling':run.status;
   if(next!==run.status)putRun({...run,status:next,updated:now,error_code:next==='cancelled'?'cancelled':null});
   send({ok:true,status:next});return true;
  }
  const request=parse(runCreate,await readJSON(req,2048));
  if(!allowed(member.id))throw fail(503,'Noch keine persönlich zugewiesene Hermes-Instanz. Keine KI-Antwort gestartet.');
  requirePermission(db,member,request.project,'view');
  const agent=agentsFor(db,request.project).find(a=>a.id===request.agent&&a.active!==false);
  if(!agent||agent.createdBy!==member.id||agent.permissions?.readProject===false||agent.permissions?.writeMessages===false)throw fail(403,'Dieser Agent wurde nicht von dir freigegeben.');
  const source=db.prepare('SELECT * FROM messages WHERE id=? AND channel=? AND author=?').get(request.message,request.project,member.id);
  const meta=readMeta(db,'room:v1:message:'+request.message);
  if(!source||meta.origin!=='human'||meta.recipient!==agent.id||meta.senderAgent)throw fail(400,'Agentenauftrag braucht eine eigene, direkt an diesen Agenten gerichtete Nachricht.');
  const outcome=transaction(db,()=>{
   expire(now);
   const existing=ownedRuns(member.id).find(r=>r.agent===agent.id&&r.source_message===request.message);
   if(existing)return {run:existing.id,status:existing.status,reused:true};
   if(runningFor(member.id))throw fail(409,'Zuerst den laufenden Agentenauftrag abschliessen oder abbrechen.');
   const run=randomUUID();
   putRun({id:run,owner:member.id,project:request.project,agent:agent.id,source_message:request.message,model:agent.model,status:'queued',created:now,updated:now});
   return {run,status:'queued',reused:false};
  });
  send(outcome,202);return true;
 }
 return route;
}
