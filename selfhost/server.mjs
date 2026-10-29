import http from 'node:http';
import {Readable} from 'node:stream';
import {DatabaseSync} from 'node:sqlite';
import {createPluginHttpRoutes} from './studio-plugin-http.mjs';
import {createOidcRoutes} from './oidc.mjs';
import {createConnectionRoutes} from './connections.mjs';
import {collaborationRoute} from './collaboration.mjs';
import { readFileSync,writeFileSync,existsSync,statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {aiRoute,aiAccess} from './ai-routes.mjs';
import {listWorkspaces,validScope,assertAvailable} from './workspaces.mjs';
import {reviewState,completeReview} from './reviews.mjs';
import {createPullRequestReader,configuredRepos} from './github-pr-status.mjs';
import {sourceEvidence} from './source-evidence.mjs';
import {projectStartRoute,projectReadiness} from './project-start.mjs';
import {createAuthHttpRoute} from './auth-http.mjs';
import {createLoginLimiter} from './login-rate-limit.mjs';
import {createResetMailer, createPasswordRecovery} from './password-recovery.mjs';
import {createWorkspaceHttpRoute} from './workspace-http.mjs';
import {createRoomRoute} from './room-http.mjs';
import {createTeamRoute} from './team-http.mjs';
import {createGithubWorkflow,githubMemberTokens} from './github-workflow.mjs';
import {taskContract,completion,teamEvent,storeMetadata,metadata} from './team-model.mjs';
import { openStore,digest,token,transaction } from './store.mjs';
import {resolveDevice,placementView,setPlacement,placementModes,executors} from './placement.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=path.resolve(process.env.STUDIO_DATA_DIR??path.join(root,'.studio'));
const uuid=()=>randomUUID(),now=()=>Date.now();
const text=z.string().trim().min(1).max(160),id=z.string().regex(/^[\w-]{1,100}$/);
function fail(status,message){return Object.assign(new Error(message),{status});}
async function readJSON(req,limit=160000){const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>limit)throw fail(413,'Eingabe zu lang.');parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw fail(400,'Ungültiges JSON.');}}
function parse(schema,data){const r=schema.safeParse(data);if(!r.success)throw fail(400,'Bitte Eingaben prüfen.');return r.data;}
export function createStudioServer({oidcProvider,githubProvider,pullRequestReader, demoMode=false,seedProjects=demoMode,sessionCookie='studio_session',filename=path.join(dataDir,'studio.sqlite'),origin=process.env.STUDIO_ORIGIN??'http://127.0.0.1:4310',previewOrigin=process.env.STUDIO_PREVIEW_ORIGIN??'http://127.0.0.1:4311',staticDir=path.join(root,'studio-dist'),trustedProxyIps=process.env.STUDIO_TRUSTED_PROXY_IPS??'',resetMailer=undefined,recoveryNow=Date.now,pluginClients=JSON.parse(process.env.STUDIO_PLUGIN_CLIENTS??'[]'),pluginDynamicClients=process.env.STUDIO_PLUGIN_DYNAMIC_CLIENTS==='1',pluginFetchMetadata}={}){
 if(!/^[a-z_]{1,60}$/.test(sessionCookie))throw new Error('Ungültiger Sitzungsname.');
 if(!Array.isArray(pluginClients)||pluginClients.length>20)throw new Error('Ungueltige Plugin-Clientliste.');
 if(new URL(origin).origin===new URL(previewOrigin).origin)throw new Error('Studio und Vorschau benötigen unterschiedliche Origins.');
 // Reject unsafe proxy trust settings before opening the SQLite store.
 const loginLimiter=createLoginLimiter({trustedProxyIps,now});
 // A partially configured mailer refuses startup before touching persistent data.
 const configuredMailer=resetMailer===undefined?
   (demoMode?null:createResetMailer({origin})):resetMailer;
 const db=openStore(filename,{seedProjects}),secure=new URL(origin).protocol==='https:';
 const passwordRecovery=createPasswordRecovery({
  db,origin,mailer:configuredMailer,now:recoveryNow,trustedProxyIps
 });
 const internalMembers=new WeakMap();
 function user(req){const memberId=internalMembers.get(req);if(memberId){const member=db.prepare('SELECT * FROM members WHERE id=?').get(memberId);if(!member)throw fail(401,'Mitglied nicht mehr vorhanden.');return member;}const cookie=req.headers.cookie?.match(new RegExp('(?:^|;\\s*)'+sessionCookie+'=([\\w-]+)'))?.[1];if(!cookie)throw fail(401,'Bitte anmelden.');const m=db.prepare('SELECT members.* FROM sessions JOIN members ON member=members.id WHERE hash=? AND expires>?').get(digest(cookie),now());if(!m)throw fail(401,'Bitte erneut anmelden.');return m;}
 function device(req){const t=req.headers.authorization?.match(/^Bearer ([\w-]+)$/)?.[1];if(!t)throw fail(401,'Geräteanmeldung fehlt.');const d=db.prepare('SELECT * FROM devices WHERE hash=? AND revoked=0').get(digest(t));if(!d)throw fail(401,'Gerätezugang ungültig.');return d;}
 function session(res,member){const t=token();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(t),member,now()+7*86400000);res.setHeader('Set-Cookie',`${sessionCookie}=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure?'; Secure':''}`);}
 function record(author,message){db.prepare('INSERT INTO activities VALUES(?,?,?,?)').run(uuid(),author,message,now());}
 const oidcRoute=createOidcRoutes({db,origin,sessionCookie,user,session,readJSON,provider:demoMode?null:oidcProvider});
 const connectionRoute=createConnectionRoutes({db,origin,sessionCookie,user,provider:demoMode?null:githubProvider});
 // Route modules share the host's request parsing and origin/CSRF boundary.
 const authHttpRoute=createAuthHttpRoute({
  db,origin,sessionCookie,user,session,readJSON,parse,fail,uuid,now,loginLimiter,passwordRecovery
 });
 const roomRoute=createRoomRoute({db,user,readJSON,parse});
 const teamRoute=createTeamRoute({db,user,readJSON,parse});
 const githubWorkflow=createGithubWorkflow({db,tokens:demoMode?{}:githubMemberTokens(process.env.STUDIO_GITHUB_MEMBER_TOKENS)});
 const workspaceHttpRoute=createWorkspaceHttpRoute({
  db,user,readJSON,parse,record,fail
 });
 // Identity-only OAuth is not a repository permission. PR inspection requires
 // a separate optional, operator-configured read-only credential and project allowlist.
 const inspectPullRequest=pullRequestReader??createPullRequestReader({repositories:demoMode?{}:configuredRepos(process.env.STUDIO_GITHUB_PROJECT_REPOS),readToken:demoMode?'':process.env.STUDIO_GITHUB_PR_READ_TOKEN??''});
 // This dispatcher is private to the validated plugin host. Network request
 // headers cannot set its WeakMap identity; ordinary API auth stays unchanged.
 async function executeAsMember(memberId,route,value){
  if(!/^\/api\/(rooms|room\/context|development(?:\/job|\/workspaces)?|executors)(?:\?|$)/.test(route)||/^\/api\/(executors|development\/workspaces)/.test(route)&&value)throw fail(403,'Pluginoperation nicht freigegeben.');
  const req=Readable.from(value?[Buffer.from(JSON.stringify(value))]:[]);req.url=route;req.method=value?'POST':'GET';req.headers={origin,'content-type':'application/json'};req.socket={remoteAddress:'127.0.0.1'};
  internalMembers.set(req,memberId);
  let status=200,body;
  const res={setHeader(){},writeHead(code){status=code;},end(data){body=JSON.parse(String(data));}};
  try{await handleRequest(req,res);return {status,data:body};}finally{internalMembers.delete(req);}
 }
 let plugin,ledgerDb;
 if(pluginClients.length||pluginDynamicClients){
  ledgerDb=new DatabaseSync(path.join(path.dirname(filename),'plugin-mutations.sqlite'));
  try{plugin=createPluginHttpRoutes({db,ledgerDb,origin,clients:pluginClients,dynamic:pluginDynamicClients,fetchMetadata:pluginFetchMetadata,user,readJSON,execute:executeAsMember});}catch(e){ledgerDb.close();db.close();throw e;}
 }
 const handleRequest=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  try{
   const url=new URL(req.url,origin),route=url.pathname,method=req.method;
   if(route==='/api/studio'&&method==='GET'){send({mode:demoMode?'demo':'private'});return;}
   if(route==='/healthz'){send({ok:true});return;}
   if(plugin&&await plugin.route({req,res,url,send}))return;
   if(method==='POST'&&!route.startsWith('/api/runner/')){if(req.headers.origin!==origin)throw fail(403,'Ungültiger Ursprung.');if(!req.headers['content-type']?.includes('application/json'))throw fail(415,'JSON erforderlich.');}
   if(await oidcRoute({route,method,req,res,url,send}))return;
   if(await connectionRoute({route,method,req,res,url,send}))return;
   if(await collaborationRoute({route,method,req,url,db,user,send,readJSON,parse}))return;
   if(await teamRoute({route,method,req,url,db,user,send,readJSON,parse}))return;
   if(route==='/api/team/project-connect'){
    const member=user(req);if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
    const command=z.array(z.string().min(1).max(4096)).min(1).max(30);
    const value=parse(z.object({project:id,device:id,check:command.optional(),automatic:z.boolean().optional(),publish:z.boolean(),allowCodex:z.boolean(),workflow:z.enum(['direct','pull-request']),preview:z.object({build:command,directory:z.string().min(1).max(240)}).optional()}),await readJSON(req));
    if(!db.prepare('SELECT id FROM devices WHERE id=? AND owner=? AND revoked=0').get(value.device,member.id))throw fail(403,'Nur deinen eigenen Rechner einrichten.');
    const meta=metadata(db,'room:v1:project:'+value.project);if(!meta?.teamShared||!meta.repository)throw fail(409,'Zuerst das gemeinsame Repository in diesem Projekt festlegen.');
    if(value.workflow!==(meta.workflow??'pull-request'))throw fail(409,'Die gewählte Übernahmeregel passt nicht zum gemeinsamen Projekt.');
    if(db.prepare("SELECT id FROM jobs WHERE device=? AND status IN ('queued','running','cancelling')").get(value.device))throw fail(409,'Den laufenden Vorgang auf deinem Rechner zuerst abschließen lassen.');
    const job=uuid(),payload={repository:meta.repository,base:meta.base??'main',check:value.check,automatic:value.automatic,publish:value.publish,allowCodex:value.allowCodex,workflow:value.workflow,...(value.preview?{preview:value.preview}:{})};
    db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(job,member.id,value.device,value.project,'connect-project',JSON.stringify(payload),'queued',now());send({id:job});return;
   }
   if(route==='/api/github-project'){
    const member=user(req);if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
    const value=parse(z.object({project:id,id:z.string().uuid(),name:text,revision:z.number().int().min(0)}),await readJSON(req));
    send(await githubWorkflow.createRepository(member,value));return;
   }
   if(route==='/api/github-workflow'){
    const member=user(req);
    if(method==='GET'){
     const job=parse(id,url.searchParams.get('job'));
     send(githubWorkflow.configured(member)?await githubWorkflow.perform('refresh',job,member):{configured:false,state:'not_configured',reason:'Persönlicher Repository-Zugang noch nicht eingerichtet. Die Kontoanmeldung allein erlaubt keine Repository-Aktionen.'});return;
    }
    if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
    const value=parse(z.object({action:z.enum(['open','merge','refresh']),job:id}),await readJSON(req));
    send(await githubWorkflow.perform(value.action,value.job,member));return;
   }
   if(await projectStartRoute({route,method,req,db,user,send,readJSON,parse}))return;
   if(route==='/api/runner/project-setup-verify'&&method==='POST'){
    const d=device(req),v=parse(z.object({project:id,repository:z.string().max(250).optional(),base:z.string().max(100).optional()}),await readJSON(req));
    const selected=db.prepare('SELECT id FROM projects WHERE id=?').get(v.project);
    const started=db.prepare('SELECT owner FROM project_starts WHERE project=?').get(v.project);
    const role=db.prepare('SELECT role FROM members WHERE id=?').get(d.owner)?.role;
    const shared=metadata(db,'room:v1:project:'+v.project)?.teamShared===true;
    if(!selected||(!shared&&(started?started.owner!==d.owner:role!=='owner')))throw fail(403,'Projekt und persönlicher Runner sind nicht gemeinsam freigegeben.');
    const sharedMeta=metadata(db,'room:v1:project:'+v.project);
    if(sharedMeta?.repository&&v.repository){const canonical=s=>s.replace(/^git@github.com:/,'https://github.com/').replace(/\.git$/,'').replace(/\/$/,'').toLowerCase();if(canonical(sharedMeta.repository)!==canonical(v.repository))throw fail(409,'Dieses Repository passt nicht zum gemeinsamen Projekt.');}
    send({ok:true,repository:sharedMeta?.repository??null,base:sharedMeta?.base??'main'});return;
   }
   if(await aiRoute({route,method,req,db,user,device,send,readJSON,parse}))return;
   if(await authHttpRoute({route,method,req,res,send}))return;
   if(await roomRoute({route,method,req,res,url,send}))return;
   if(route==='/api/runner/poll'&&method==='POST'){
    const d=device(req);db.prepare('UPDATE devices SET seen=? WHERE id=?').run(now(),d.id);
    // A lost acknowledgement must never execute a code job a second time.
    db.prepare("UPDATE jobs SET status='interrupted',result=? WHERE device=? AND status IN ('running','cancelling') AND heartbeat<?").run(JSON.stringify({error:'Verbindung zum Runner verloren. Ergebnis vor erneutem Start lokal prüfen.'}),d.id,now()-120000);
    const job=transaction(db,()=>{if(db.prepare("SELECT id FROM jobs WHERE device=? AND status IN ('running','cancelling')").get(d.id))return null;const j=db.prepare("SELECT * FROM jobs WHERE device=? AND status='queued' ORDER BY created LIMIT 1").get(d.id);if(!j)return null;
     if(j.action==='local-ai'&&!aiAccess(db,j)){db.prepare("UPDATE jobs SET status='failed',result=? WHERE id=?").run(JSON.stringify({error:'Modellzugang vor dem Start nicht mehr verfügbar.'}),j.id);return null;}
     if(j.action==='integrate'){
      const payload=JSON.parse(j.payload),source=db.prepare('SELECT * FROM jobs WHERE id=?').get(payload.reviewJob??'');
      const task=source?db.prepare("SELECT t.* FROM tasks t JOIN workspaces w ON w.task=t.id WHERE w.job=json_extract(?,'$.worktree')").get(source.payload):null;
      const current=task?completion(db,task).result:null,meta=metadata(db,'room:v1:project:'+j.project);
      if(!source||reviewState(db,source)!=='approved'||meta?.repository&&(meta.workflow??'pull-request')==='pull-request'||task&&(!current||current.id!==source.id||current.changedAfter||current.contractRevision!==taskContract(db,task).revision)){
       db.prepare("UPDATE jobs SET status='failed',result=? WHERE id=?").run(JSON.stringify({error:'Die Freigabe wurde vor dem Start zurückgenommen. Bitte erneut prüfen lassen.'}),j.id);return null;
      }
     }
     const lease=token();db.prepare("UPDATE jobs SET status='running',lease=?,started=?,heartbeat=? WHERE id=? AND status='queued'").run(digest(lease),now(),now(),j.id);return {...j,runnerOwner:d.owner,payload:JSON.parse(j.payload),lease};});send({job});return;
   }
   if(route==='/api/runner/report'&&method==='POST'){
    const d=device(req),v=parse(z.object({id,lease:z.string().max(100),heartbeat:z.boolean().optional(),events:z.array(z.object({seq:z.number().int().positive(),type:z.enum(['status','output','session','message','command','files','error']),text:z.string().max(4000)})).max(40).optional(),result:z.unknown().optional(),ok:z.boolean().optional()}),await readJSON(req,9000000));
    const job=db.prepare("SELECT * FROM jobs WHERE id=? AND device=? AND status IN ('running','cancelling') AND lease=?").get(v.id,d.id,digest(v.lease));if(!job)throw fail(409,'Auftrag nicht mehr aktiv.');
    if(v.heartbeat){
     db.prepare('UPDATE devices SET seen=? WHERE id=?').run(now(),d.id);
     transaction(db,()=>{db.prepare('UPDATE jobs SET heartbeat=? WHERE id=?').run(now(),job.id);for(const e of v.events??[])db.prepare('INSERT OR IGNORE INTO job_events VALUES(?,?,?,?,?)').run(job.id,e.seq,e.type,e.text,now());db.prepare('DELETE FROM job_events WHERE job=? AND seq NOT IN (SELECT seq FROM job_events WHERE job=? ORDER BY seq DESC LIMIT 200)').run(job.id,job.id);db.prepare('DELETE FROM job_events WHERE rowid NOT IN (SELECT rowid FROM job_events ORDER BY created DESC,rowid DESC LIMIT 4000)').run();});
     send({ok:true,cancel:job.status==='cancelling'||(job.action==='local-ai'&&!aiAccess(db,job))});return;
    }else{
     let result=v.result??{};
     if(v.ok&&['preview','review','submit'].includes(job.action)&&result.previewBundle){
      // Reject oversized containers before building Zod issue collections.
      const rawBundle=result.previewBundle;
      if(!rawBundle||typeof rawBundle!=='object'||Array.isArray(rawBundle)||Object.keys(rawBundle).length>500)throw fail(413,'Vorschau hat zu viele Dateien.');
      const bundle=parse(z.record(z.string(),z.string().max(7000000)),rawBundle);let bytes=0;const entries=Object.entries(bundle);
      if(entries.length>500||!bundle['index.html'])throw fail(400,'Vorschau benötigt index.html und höchstens 500 Dateien.');
      for(const [name,value] of entries){if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..')||/[\u0000-\u001f]/.test(name))throw fail(400,'Ungültiger Vorschau-Pfad.');bytes+=Buffer.from(value,'base64').length;}
      if(bytes>5000000)throw fail(413,'Vorschau darf höchstens 5 MB groß sein.');const previewId=token();
      transaction(db,()=>{db.prepare('INSERT INTO previews VALUES(?,?,?,?)').run(previewId,job.id,now(),JSON.stringify(bundle));});
      const preview={url:`${previewOrigin}/${previewId}/index.html`,scope:'shared',files:entries.length,bytes,source:sourceEvidence(result.source)};
      result=job.action==='preview'?preview:{...result,previewBundle:undefined,preview};
     }
     const resultText=JSON.stringify(result);
     // A 64 KiB text file can expand heavily when JSON escapes control bytes.
     const maxResultLength=job.action==='read-file'?500000:150000;
     if(resultText.length>maxResultLength)throw fail(413,'Ergebnis zu groß.');
     db.prepare('UPDATE jobs SET status=?,result=?,lease=NULL WHERE id=?').run(job.status==='cancelling'?'cancelled':v.ok?'completed':'failed',resultText,job.id);
     if(v.ok&&job.status!=='cancelling'){
      const payload=JSON.parse(job.payload),copy=payload.worktree?db.prepare('SELECT task FROM workspaces WHERE job=?').get(payload.worktree):null;
      if(copy?.task){
       const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(copy.task);
       if(task&&job.action==='submit'&&result.published===true)db.prepare("UPDATE tasks SET status='review' WHERE id=?").run(task.id);
       if(task&&['save-file','create-file','codex'].includes(job.action)&&task.status==='review')db.prepare("UPDATE tasks SET status='doing' WHERE id=?").run(task.id);
       if(task)teamEvent(db,{actor:job.owner,project:job.project,task:task.id,kind:job.action,body:({submit:'Code zur Prüfung geteilt','save-file':'Datei gespeichert','create-file':'Datei erstellt',review:'Prüfstand erstellt',check:'Tests abgeschlossen',preview:'Vorschau erstellt',codex:'KI-Bearbeitung abgeschlossen'})[job.action]??'Bearbeitung aktualisiert'});
      }
      if(job.action==='integrate'){
       const source=db.prepare('SELECT payload FROM jobs WHERE id=?').get(payload.reviewJob),base=source?JSON.parse(source.payload).worktree:null;
       const linked=base?db.prepare('SELECT task FROM workspaces WHERE job=?').get(base):null;
       const task=linked?.task?db.prepare('SELECT * FROM tasks WHERE id=?').get(linked.task):null;
       if(task&&completion(db,task).ready){db.prepare("UPDATE tasks SET status='done' WHERE id=?").run(task.id);teamEvent(db,{actor:job.owner,project:job.project,task:task.id,kind:'integrated',body:'Freigegebener Code zusammengeführt · '+task.title});}
      }
     }
    }send({ok:true});return;
   }
   if(route==='/api/development/reviews'){
    const m=user(req);
    if(method==='GET'){
     const jid=parse(id,url.searchParams.get('job')),job=db.prepare('SELECT * FROM jobs WHERE id=?').get(jid);if(!job)throw fail(404,'Prüfauftrag fehlt.');
     send({state:reviewState(db,job),entries:db.prepare('SELECT code_reviews.id,commit_sha AS commitSha,reviewer,members.name AS name,decision,body,created FROM code_reviews JOIN members ON members.id=reviewer WHERE job=? ORDER BY seq').all(jid)});return;
    }
    if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
    const v=parse(z.object({id,job:id,commit:z.string().regex(/^[a-f0-9]{40,64}$/),decision:z.enum(['approved','changes','comment']),body:z.string().trim().max(4000)}),await readJSON(req));
    const job=db.prepare("SELECT * FROM jobs WHERE id=? AND action IN ('review','submit') AND status='completed'").get(v.job);if(!job)throw fail(409,'Ein abgeschlossener Prüfauftrag wird benötigt.');
    const result=JSON.parse(job.result??'{}');if(result.commit!==v.commit)throw fail(409,'Der angezeigte Code-Stand stimmt nicht mehr. Bitte neu laden.');
    if(v.decision!=='comment'&&job.owner===m.id)throw fail(403,'Die Prüfung muss die zweite Person übernehmen.');
    if(v.decision==='approved'&&!completeReview(result))throw fail(409,'Dieser Diff ist unvollständig. Für eine Freigabe einen vollständig prüfbaren Stand erstellen.');
    if(v.decision!=='approved'&&!v.body)throw fail(400,'Bitte eine Rückmeldung eingeben.');
    if(result.workflow==='pull-request'&&v.decision!=='comment'){
     send(await githubWorkflow.perform('review',job.id,m,v.decision,v.body));return;
    }
    const linkedTask=db.prepare("SELECT t.* FROM tasks t JOIN workspaces w ON w.task=t.id WHERE w.job=json_extract(?,'$.worktree')").get(job.payload);
    if(v.decision==='approved'&&linkedTask&&taskContract(db,linkedTask).revision!==(JSON.parse(job.payload).contractRevision??0))throw fail(409,'Die Abschlussbedingungen wurden geändert. Einen neuen Prüfstand einreichen.');
    const existing=db.prepare('SELECT * FROM code_reviews WHERE id=?').get(v.id);
    if(existing){if(existing.job!==v.job||existing.reviewer!==m.id||existing.commit_sha!==v.commit||existing.decision!==v.decision||existing.body!==v.body)throw fail(409,'Diese Rückmeldung wurde bereits anders gespeichert.');}
    else db.prepare('INSERT INTO code_reviews(id,job,commit_sha,reviewer,decision,body,created) VALUES(?,?,?,?,?,?,?)').run(v.id,job.id,v.commit,m.id,v.decision,v.body,now());
    const linked=db.prepare("SELECT task FROM workspaces WHERE job=json_extract(?,'$.worktree')").get(job.payload);
    if(linked?.task){if(v.decision==='changes')db.prepare("UPDATE tasks SET status='doing' WHERE id=?").run(linked.task);teamEvent(db,{actor:m.id,project:job.project,task:linked.task,kind:'review',body:v.decision==='approved'?'Prüfstand freigegeben':v.decision==='changes'?'Änderungen angefordert':'Rückmeldung zum Prüfstand'});}
    send({ok:true,state:reviewState(db,job)});return;
   }
   if(route==='/api/development/github-pr'){
    if(method!=='GET')throw fail(405,'Methode nicht erlaubt.');
    user(req);
    const jid=parse(id,url.searchParams.get('job'));
    const job=db.prepare("SELECT id,owner,project,action,status,result FROM jobs WHERE id=? AND action IN ('review','submit')").get(jid);
    if(!job)throw fail(404,'Prüfauftrag fehlt.');
    send(await inspectPullRequest(job));return;
   }
   if(route==='/api/development/job'&&method==='GET'){
    const m=user(req);const jid=parse(id,url.searchParams.get('id'));
    const job=db.prepare('SELECT id,owner,device,project,action,payload,status,created,started,result FROM jobs WHERE id=?').get(jid);
    if(!job)throw fail(404,'Auftrag fehlt.');if(job.action==='local-ai'&&job.owner!==m.id&&!db.prepare('SELECT id FROM devices WHERE id=? AND owner=?').get(job.device,m.id))throw fail(403,'KI-Anfrage ist nur für Absender und Rechnerbesitzer sichtbar.');if(['files','read-file','save-file','create-file'].includes(job.action)&&job.owner!==m.id)throw fail(403,'Dateiinhalte sind nur in der eigenen Arbeitskopie verfügbar.');send({job:{...job,payload:JSON.parse(job.payload),result:job.result?JSON.parse(job.result):null}});return;
   }
   if(route==='/api/development/events'&&method==='GET'){
    const m=user(req);const jid=parse(id,url.searchParams.get('job'));
    const eventJob=db.prepare('SELECT * FROM jobs WHERE id=?').get(jid);if(!eventJob)throw fail(404,'Auftrag fehlt.');if(eventJob.action==='local-ai'&&eventJob.owner!==m.id&&!db.prepare('SELECT id FROM devices WHERE id=? AND owner=?').get(eventJob.device,m.id))throw fail(403,'KI-Auftrag ist privat.');
    if(['files','read-file','save-file','create-file'].includes(eventJob.action)&&eventJob.owner!==m.id)throw fail(403,'Dateiprotokolle sind nur in der eigenen Arbeitskopie verfügbar.');
    const after=parse(z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),url.searchParams.get('after')??0);
    send({events:db.prepare('SELECT seq,type,text,created FROM job_events WHERE job=? AND seq>? ORDER BY seq').all(jid,after)});return;
   }
   if(route==='/api/development'){
    const m=user(req);
    if(method==='GET'){const devices=db.prepare("SELECT d.id,d.owner,d.name,d.seen,d.revoked,CASE WHEN json_extract(h.value,'$.kind')='server' THEN 'server' ELSE 'pc' END AS kind FROM devices d LEFT JOIN workspace_meta h ON h.key='executor:v1:host:'||d.id WHERE d.revoked=0").all();const jobs=db.prepare(`SELECT id,owner,device,project,action,json_object('worktree',json_extract(payload,'$.worktree')) AS payload,status,created,started,CASE WHEN result IS NULL THEN NULL ELSE json_object('branch',json_extract(result,'$.branch'),'commit',json_extract(result,'$.commit'),'url',json_extract(result,'$.url'),'scope',json_extract(result,'$.scope'),'workflow',json_extract(result,'$.workflow')) END AS result FROM jobs ORDER BY created DESC LIMIT 100`).all().map(j=>({...j,payload:JSON.parse(j.payload),result:j.result?JSON.parse(j.result):null}));send({devices,activeDeviceIds:db.prepare("SELECT DISTINCT device FROM jobs WHERE status IN ('queued','running','cancelling')").all().map(j=>j.device),workspaces:listWorkspaces(db),tasks:db.prepare("SELECT id,project,title,assignee,status FROM tasks WHERE status!='done' ORDER BY created DESC").all(),jobs:jobs.map(j=>({...j,reviewState:reviewState(db,j)})),readiness:projectReadiness(db,m.id)});return;}
    if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
    // Bound editor payloads by the runner's 64 KiB byte limit and by
    // Zod's 65536-character cap; JSON escaping needs a separate wire limit.
    const v=await readJSON(req,500000);
    if(v.action==='workspace'){
     const value=parse(z.object({action:z.literal('workspace'),id,revision:z.number().int().min(0),title:text,scope:z.string().max(240).refine(validScope),archived:z.boolean()}),v);
     transaction(db,()=>{
      const current=listWorkspaces(db).find(w=>w.id===value.id&&w.owner===m.id);if(!current)throw fail(404,'Eigene Arbeitskopie fehlt.');
      if(current.revision!==value.revision)throw fail(409,'Arbeitsbereich wurde inzwischen geändert. Bitte neu laden.');
      if(current.status!=='completed'&&current.status!=='interrupted')throw fail(409,'Erstellung zuerst beenden lassen.');
      if(db.prepare("SELECT id FROM jobs WHERE (id=? OR json_extract(payload,'$.worktree')=?) AND status IN ('queued','running','cancelling')").get(value.id,value.id))throw fail(409,'In dieser Arbeitskopie ist noch ein Auftrag aktiv.');
      if(!value.archived)assertAvailable(db,{project:current.project,issue:current.issue,scope:value.scope,task:current.taskId},value.id);
      db.prepare('INSERT INTO workspaces(job,title,scope,task,archived,revision) VALUES(?,?,?,?,?,?) ON CONFLICT(job) DO UPDATE SET title=excluded.title,scope=excluded.scope,archived=excluded.archived,revision=excluded.revision').run(value.id,value.title,value.scope,current.taskId,Number(value.archived),value.revision+1);
     });send({ok:true});return;
    }
    if(v.action==='cancel'){
     const jid=parse(id,v.id),j=db.prepare("SELECT * FROM jobs WHERE id=? AND (owner=? OR (action='local-ai' AND device IN (SELECT id FROM devices WHERE owner=?)))").get(jid,m.id,m.id);
     if(!j)throw fail(404,'Eigener Auftrag nicht gefunden.');
     if(j.status==='running'&&!['codex','check','local-ai'].includes(j.action))throw fail(409,'Diesen Git-Schritt bitte erst beenden lassen.');
     if(!['queued','running','cancelling'].includes(j.status))throw fail(409,'Auftrag ist bereits beendet.');
     db.prepare('UPDATE jobs SET status=? WHERE id=?').run(j.status==='queued'?'cancelled':'cancelling',jid);send({ok:true});return;
    }
    if(v.action==='device'){const name=parse(text,v.name),t=token(),did=uuid();db.prepare('INSERT INTO devices(id,owner,name,hash) VALUES(?,?,?,?)').run(did,m.id,name,digest(t));send({id:did,token:t});return;}
    if(v.action==='revoke'){const did=parse(id,v.id);if(!db.prepare('UPDATE devices SET revoked=1 WHERE id=? AND owner=?').run(did,m.id).changes)throw fail(404,'Gerät nicht gefunden.');db.prepare("UPDATE jobs SET status='cancelled' WHERE device=? AND status='queued'").run(did);send({ok:true});return;}
    const value=parse(z.object({action:z.literal('job'),device:id,project:id,title:text.optional(),scope:z.string().max(240).refine(validScope).optional(),task:id.optional(),operation:z.enum(['inspect','prepare','status','check','review','submit','preview','integrate','codex','files','read-file','save-file','create-file','create-file']),file:z.string().min(1).max(400).optional(),revision:z.string().regex(/^[a-f0-9]{64}$/).optional(),content:z.string().max(65536).optional(),worktree:id.optional(),source:id.optional(),issue:z.number().int().positive().max(2147483647).optional(),prompt:z.string().trim().max(12000).optional()}),v);
    if(!db.prepare('SELECT id FROM projects WHERE id=?').get(value.project))throw fail(404,'Projekt nicht gefunden.');
    // "auto" is resolved here, once; the job row then names the executor that runs it.
    const placed=resolveDevice(db,{member:m,project:value.project,device:value.device,worktree:value.operation==='integrate'?undefined:value.worktree});
    value.device=placed.device;
    let payload={};
    if(['inspect','prepare'].includes(value.operation))payload=value.issue?{issue:value.issue}:{};
    else if(value.operation==='integrate'){
     const source=db.prepare("SELECT * FROM jobs WHERE id=? AND project=? AND action='submit' AND status='completed'").get(value.source??'',value.project);if(!source)throw fail(400,'Ein erfolgreich eingereichter Stand wird benötigt.');const result=JSON.parse(source.result);if(reviewState(db,source)!=='approved')throw fail(409,'Die zweite Person muss genau diesen eingereichten Stand zuerst freigeben.');if(result.workflow==='pull-request'||metadata(db,'room:v1:project:'+value.project)?.repository&&(metadata(db,'room:v1:project:'+value.project).workflow??'pull-request')==='pull-request')throw fail(409,'Dieses Repository wird ausschließlich über Pull Request, CI und Review zusammengeführt.');
     const linked=db.prepare("SELECT t.* FROM tasks t JOIN workspaces w ON w.task=t.id WHERE w.job=json_extract(?,'$.worktree')").get(source.payload);
     if(linked){const current=completion(db,linked).result;if(!current||current.id!==source.id||current.changedAfter||current.contractRevision!==taskContract(db,linked).revision)throw fail(409,'Der Prüfstand ist nicht mehr aktuell. Erneut einreichen und prüfen lassen.');}
     if(!/^[a-f0-9]{40,64}$/.test(result.commit)||!/^studio\/[\w-]+$/.test(result.branch))throw fail(400,'Ungültiger Git-Stand.');payload={commit:result.commit,branch:result.branch,reviewJob:source.id};
    }else{
     const base=db.prepare("SELECT * FROM jobs WHERE id=? AND owner=? AND device=? AND project=? AND action='prepare' AND status='completed'").get(value.worktree??'',m.id,value.device,value.project);if(!base)throw fail(403,'Eine eigene vorbereitete Arbeitskopie wird benötigt.');if(db.prepare('SELECT archived FROM workspaces WHERE job=?').get(base.id)?.archived)throw fail(409,'Arbeitsbereich zuerst wieder öffnen.');payload={worktree:base.id,...(JSON.parse(base.payload).issue?{issue:JSON.parse(base.payload).issue}:{}),...(value.operation==='codex'?{prompt:value.prompt??''}:{})};if(value.operation==='codex'&&!payload.prompt)throw fail(400,'Auftrag fehlt.');
    }
    if(['files','read-file','save-file','create-file'].includes(value.operation)){
     if(value.operation!=='files'&&!value.file)throw fail(400,'Dateipfad fehlt.');
     if(value.operation==='save-file'&&(value.content===undefined||!value.revision))throw fail(400,'Dateistand fehlt.');
     if(['save-file','create-file'].includes(value.operation)&&Buffer.byteLength(value.content??'','utf8')>65536)throw fail(413,'UTF-8-Datei ist größer als 64 KiB.');
     if(db.prepare("SELECT id FROM jobs WHERE device=? AND status IN ('queued','running','cancelling')").get(value.device))throw fail(409,'Bitte den laufenden Auftrag zuerst beenden lassen.');
     payload={...payload,file:value.file,revision:value.revision,content:value.content};
    }
    if(payload.worktree){
     const linked=db.prepare('SELECT t.* FROM tasks t JOIN workspaces w ON w.task=t.id WHERE w.job=?').get(payload.worktree);
     if(linked&&linked.assignee!==m.id)throw fail(409,'Diese Aufgabe wurde inzwischen übergeben. Bitte den aktuellen Stand prüfen.');
     if(linked&&linked.status==='done'&&['save-file','create-file','codex','submit','review'].includes(value.operation))throw fail(409,'Abgeschlossene Aufgabe zuerst wieder öffnen.');
     if(linked){const contract=taskContract(db,linked);payload.contractRevision=contract.revision;payload.contractSnapshot={title:linked.title,description:linked.description,criteria:contract.criteria};}
    }
    const sharedProject=metadata(db,'room:v1:project:'+value.project);
    if(sharedProject?.repository){payload.expectedRepository=sharedProject.repository;payload.expectedBase=sharedProject.base??'main';}
    if(['review','submit','integrate'].includes(value.operation)&&db.prepare("SELECT id FROM jobs WHERE device=? AND status IN ('queued','running','cancelling')").get(value.device))throw fail(409,'Auf deinem Rechner läuft noch ein Vorgang. Den bestätigten Abschluss abwarten.');
    payload.placement={mode:placed.mode,kind:placed.kind,reason:placed.reason};
    const jid=uuid();transaction(db,()=>{
     if(value.operation==='prepare'){
      assertAvailable(db,{project:value.project,issue:value.issue,scope:value.scope,task:value.task});
      if(value.task){const task=db.prepare('SELECT * FROM tasks WHERE id=? AND project=?').get(value.task,value.project);if(!task||task.status==='done')throw fail(409,'Eine offene Aufgabe dieses Projekts wählen.');if(task.assignee&&task.assignee!==m.id)throw fail(409,'Diese Aufgabe ist der anderen Person zugeordnet.');}
     }
     db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(jid,m.id,value.device,value.project,value.operation,JSON.stringify(payload),'queued',now());
     if(value.operation==='prepare'){
      db.prepare('INSERT INTO workspaces(job,title,scope,task) VALUES(?,?,?,?)').run(jid,value.title??(value.issue?'Issue #'+value.issue:'Arbeitskopie'),value.scope??'',value.task??null);
      if(value.task)db.prepare("UPDATE tasks SET assignee=?,status=CASE WHEN status='todo' THEN 'doing' ELSE status END WHERE id=?").run(m.id,value.task);
     }
    });send({ok:true,id:jid,device:value.device,placement:payload.placement});return;
   }
   if(route==='/api/development/workspaces'&&method==='GET'){
    // Own copies only: code jobs can run only in a copy the member prepared.
    const m=user(req),project=parse(id,url.searchParams.get('project')),archived=url.searchParams.get('archived')==='1';
    if(!db.prepare('SELECT id FROM projects WHERE id=?').get(project))throw fail(404,'Projekt nicht gefunden.');
    const kinds=new Map(executors(db,m.id).map(e=>[e.id,e]));
    send({workspaces:listWorkspaces(db).filter(w=>w.owner===m.id&&w.project===project&&!w.revoked&&(archived||!w.archived)).map(w=>({id:w.id,title:w.title,status:w.status,created:w.created,branch:w.branch,scope:w.scope,task:w.taskId?{id:w.taskId,title:w.taskTitle}:null,archived:!!w.archived,device:w.device,deviceName:w.deviceName,deviceKind:kinds.get(w.device)?.kind??'pc',deviceOnline:!!kinds.get(w.device)?.online}))});return;
   }
   if(route==='/api/executors'){
    const m=user(req);
    if(method==='GET'){const project=parse(id,url.searchParams.get('project'));if(!db.prepare('SELECT id FROM projects WHERE id=?').get(project))throw fail(404,'Projekt nicht gefunden.');send(placementView(db,m,project));return;}
    if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
    const value=parse(z.object({project:id,mode:z.enum(placementModes)}),await readJSON(req));
    setPlacement(db,{member:m,project:value.project,mode:value.mode});record(m.id,'Ausführungsregel geändert');send(placementView(db,m,value.project));return;
   }
   if(await workspaceHttpRoute({route,method,req,send}))return;
   if(route.startsWith('/api/'))throw fail(404,'Schnittstelle nicht gefunden.');
   if(method!=='GET'&&method!=='HEAD')throw fail(405,'Methode nicht erlaubt.');
   const filename=path.resolve(staticDir,'.'+decodeURIComponent(route));if(!filename.startsWith(path.resolve(staticDir)+path.sep)&&filename!==path.resolve(staticDir))throw fail(403,'Ungültiger Pfad.');
   const target=existsSync(filename)&&statSync(filename).isFile()?filename:path.join(staticDir,'index.html');
   if(!existsSync(target))throw fail(503,'Oberfläche zuerst mit npm run studio:build erstellen.');
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(target)]??'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(readFileSync(target));
  }catch(e){if(!e.status)console.error('studio request failed',e.message);send({error:e.status?e.message:'Anfrage fehlgeschlagen.'},e.status??500);}
 };
 const server=http.createServer(handleRequest);
 server.once('close',()=>ledgerDb?.close());
 const previewServer=http.createServer((req,res)=>{
  // A different origin prevents project JavaScript from reading Studio sessions.
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
  const match=new URL(req.url,previewOrigin).pathname.match(/^\/([\w-]{40,60})\/(.*)$/);if(!match){res.writeHead(404);res.end();return;}
  const preview=db.prepare('SELECT manifest FROM previews WHERE id=?').get(match[1]);const files=preview?JSON.parse(preview.manifest):null;let name;try{name=decodeURIComponent(match[2])||'index.html';}catch{res.writeHead(400);res.end();return;}
  if(!files||!Object.hasOwn(files,name)){res.writeHead(404);res.end('Vorschau nicht gefunden oder abgelaufen.');return;}
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'}[path.extname(name)]??'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});res.end(Buffer.from(files[name],'base64'));
 });
 return {server,previewServer,db};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {server,previewServer,db}=createStudioServer();
 if(!db.prepare('SELECT id FROM members LIMIT 1').get()){
  const filename=path.join(dataDir,'setup-link.txt');if(!existsSync(filename)||!db.prepare("SELECT value FROM workspace_meta WHERE key='bootstrap'").get()){
   const setup=token();db.prepare("INSERT OR REPLACE INTO workspace_meta VALUES('bootstrap',?)").run(digest(setup));writeFileSync(filename,(process.env.STUDIO_ORIGIN??'http://127.0.0.1:4310')+'/?setup='+setup,{mode:0o600});
  }
  console.log('Ersteinrichtung: privaten Link aus .studio/setup-link.txt im Browser öffnen.');
 }
 server.listen(Number(process.env.PORT??4310),process.env.STUDIO_BIND??'127.0.0.1',()=>console.log('Schmaqq Studio: '+(process.env.STUDIO_ORIGIN??'http://127.0.0.1:4310')));previewServer.listen(Number(process.env.STUDIO_PREVIEW_PORT??4311),process.env.STUDIO_BIND??'127.0.0.1');
}
