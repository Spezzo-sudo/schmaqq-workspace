import http from 'node:http';
import {createOidcRoutes} from './oidc.mjs';
import {createConnectionRoutes} from './connections.mjs';
import {collaborationRoute,assertAssignment} from './collaboration.mjs';
import { readFileSync,writeFileSync,existsSync,statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {aiRoute,aiAccess} from './ai-routes.mjs';
import {listWorkspaces,validScope,assertAvailable} from './workspaces.mjs';
import {reviewState,completeReview} from './reviews.mjs';
import { openStore,digest,token,passwordHash,passwordValid,createInvite,transaction } from './store.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=path.resolve(process.env.STUDIO_DATA_DIR??path.join(root,'.studio'));
const uuid=()=>randomUUID(),now=()=>Date.now();
const text=z.string().trim().min(1).max(160),id=z.string().regex(/^[\w-]{1,100}$/),body=z.string().trim().max(12000);
const actions=z.discriminatedUnion('action',[
 z.object({action:z.literal('project'),title:text,description:body,color:z.enum(['sage','sand','blue','violet','rose']),stage:z.enum(['Im Aufbau','In Entwicklung','Verfügbar'])}),
 z.object({action:z.literal('task'),project:id,title:text,description:body,priority:z.enum(['Normal','Hoch']),assignee:id.nullable()}),
 z.object({action:z.literal('status'),id,status:z.enum(['todo','doing','review','done'])}),
 z.object({action:z.literal('assign'),id,assignee:id.nullable()}),
 z.object({action:z.literal('message'),id,channel:id,body:z.string().trim().min(1).max(4000)}),
 z.object({action:z.literal('document'),id:id.optional(),title:text,body,revision:z.number().int().positive().optional()})]);

function fail(status,message){return Object.assign(new Error(message),{status});}
async function readJSON(req,limit=160000){const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>limit)throw fail(413,'Eingabe zu lang.');parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw fail(400,'Ungültiges JSON.');}}
function parse(schema,data){const r=schema.safeParse(data);if(!r.success)throw fail(400,'Bitte Eingaben prüfen.');return r.data;}
export function createStudioServer({oidcProvider,githubProvider, demoMode=false,sessionCookie='studio_session',filename=path.join(dataDir,'studio.sqlite'),origin=process.env.STUDIO_ORIGIN??'http://127.0.0.1:4310',previewOrigin=process.env.STUDIO_PREVIEW_ORIGIN??'http://127.0.0.1:4311',staticDir=path.join(root,'studio-dist')}={}){
 if(!/^[a-z_]{1,60}$/.test(sessionCookie))throw new Error('Ungültiger Sitzungsname.');
 if(new URL(origin).origin===new URL(previewOrigin).origin)throw new Error('Studio und Vorschau benötigen unterschiedliche Origins.');
 const db=openStore(filename),secure=new URL(origin).protocol==='https:';const rate=new Map();
 function publicMember(m){return {id:m.id,name:m.name,email:m.email,seen:m.seen,role:m.role};}
 function user(req){const cookie=req.headers.cookie?.match(new RegExp('(?:^|;\\s*)'+sessionCookie+'=([\\w-]+)'))?.[1];if(!cookie)throw fail(401,'Bitte anmelden.');const m=db.prepare('SELECT members.* FROM sessions JOIN members ON member=members.id WHERE hash=? AND expires>?').get(digest(cookie),now());if(!m)throw fail(401,'Bitte erneut anmelden.');return m;}
 function device(req){const t=req.headers.authorization?.match(/^Bearer ([\w-]+)$/)?.[1];if(!t)throw fail(401,'Geräteanmeldung fehlt.');const d=db.prepare('SELECT * FROM devices WHERE hash=? AND revoked=0').get(digest(t));if(!d)throw fail(401,'Gerätezugang ungültig.');return d;}
 function session(res,member){const t=token();db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(t),member,now()+7*86400000);res.setHeader('Set-Cookie',`${sessionCookie}=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secure?'; Secure':''}`);}
 function record(author,message){db.prepare('INSERT INTO activities VALUES(?,?,?,?)').run(uuid(),author,message,now());}
 const oidcRoute=createOidcRoutes({db,origin,sessionCookie,user,session,readJSON,provider:demoMode?null:oidcProvider});
 const connectionRoute=createConnectionRoutes({db,origin,sessionCookie,user,provider:demoMode?null:githubProvider});
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
  const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  try{
   const url=new URL(req.url,origin),route=url.pathname,method=req.method;
   if(route==='/api/studio'&&method==='GET'){send({mode:demoMode?'demo':'private'});return;}
   if(route==='/healthz'){send({ok:true});return;}
   if(method==='POST'&&!route.startsWith('/api/runner/')){if(req.headers.origin!==origin)throw fail(403,'Ungültiger Ursprung.');if(!req.headers['content-type']?.includes('application/json'))throw fail(415,'JSON erforderlich.');}
   if(await oidcRoute({route,method,req,res,url,send}))return;
   if(await connectionRoute({route,method,req,res,url,send}))return;
   if(await collaborationRoute({route,method,req,url,db,user,send,readJSON,parse}))return;
   if(await aiRoute({route,method,req,db,user,device,send,readJSON,parse}))return;
   if(route==='/api/auth/session'){send({user:publicMember(user(req))});return;}
   if(route==='/api/auth/login'&&method==='POST'){
    const key=req.socket.remoteAddress;let bucket=rate.get(key);if(!bucket||bucket.until<now()){bucket={n:0,until:now()+60000};rate.set(key,bucket);}if(++bucket.n>12)throw fail(429,'Bitte eine Minute warten.');
    const v=parse(z.object({email:z.string().email().max(200),password:z.string().min(1).max(200)}),await readJSON(req));const m=db.prepare('SELECT * FROM members WHERE email=?').get(v.email.toLowerCase());
    if(!m||!passwordValid(v.password,m.password))throw fail(401,'E-Mail oder Passwort stimmen nicht.');session(res,m.id);send({ok:true});return;
   }
   if(route==='/api/auth/register'&&method==='POST'){
    const v=parse(z.object({invite:z.string().min(20).max(100),name:text,password:z.string().min(12).max(200)}),await readJSON(req));
    const invite=db.prepare('SELECT * FROM invites WHERE hash=? AND expires>?').get(digest(v.invite),now());if(!invite)throw fail(403,'Einladung ungültig oder abgelaufen.');
    if(db.prepare('SELECT id FROM members WHERE email=?').get(invite.email))throw fail(409,'Dieses Konto existiert bereits.');const memberId=uuid(),hash=passwordHash(v.password);
    transaction(db,()=>{if(!db.prepare('DELETE FROM invites WHERE hash=?').run(invite.hash).changes)throw fail(409,'Einladung bereits verwendet.');db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(memberId,v.name,invite.email,hash,invite.role,now());});session(res,memberId);send({ok:true});return;
   }
   if(route==='/api/auth/bootstrap'&&method==='POST'){
    const v=parse(z.object({setup:z.string().min(20).max(100),email:z.string().email().max(200),name:text,password:z.string().min(12).max(200)}),await readJSON(req));
    const expected=db.prepare("SELECT value FROM workspace_meta WHERE key='bootstrap'").get();
    if(!expected||expected.value!==digest(v.setup)||db.prepare('SELECT id FROM members LIMIT 1').get())throw fail(403,'Einrichtungslink ungültig oder bereits verwendet.');
    const memberId=uuid(),hash=passwordHash(v.password);
    transaction(db,()=>{if(db.prepare('SELECT id FROM members LIMIT 1').get())throw fail(409,'Workspace bereits eingerichtet.');db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(memberId,v.name,v.email.toLowerCase(),hash,'owner',now());db.prepare("DELETE FROM workspace_meta WHERE key='bootstrap'").run();});session(res,memberId);send({ok:true});return;
   }
   if(route==='/api/auth/logout'&&method==='POST'){const t=req.headers.cookie?.match(new RegExp('(?:^|;\\s*)'+sessionCookie+'=([\\w-]+)'))?.[1];if(t)db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(t));res.setHeader('Set-Cookie',`${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);send({ok:true});return;}
   if(route==='/api/invites'&&method==='POST'){const m=user(req);if(m.role!=='owner')throw fail(403,'Nur der Workspace-Eigentümer kann einladen.');const v=parse(z.object({email:z.string().email().max(200)}),await readJSON(req));send({link:`${origin}/?invite=${createInvite(db,v.email)}`});return;}
   if(route==='/api/runner/poll'&&method==='POST'){
    const d=device(req);db.prepare('UPDATE devices SET seen=? WHERE id=?').run(now(),d.id);
    // A lost acknowledgement must never execute a code job a second time.
    db.prepare("UPDATE jobs SET status='interrupted',result=? WHERE device=? AND status IN ('running','cancelling') AND heartbeat<?").run(JSON.stringify({error:'Verbindung zum Runner verloren. Ergebnis vor erneutem Start lokal prüfen.'}),d.id,now()-120000);
    const job=transaction(db,()=>{if(db.prepare("SELECT id FROM jobs WHERE device=? AND status IN ('running','cancelling')").get(d.id))return null;const j=db.prepare("SELECT * FROM jobs WHERE device=? AND status='queued' ORDER BY created LIMIT 1").get(d.id);if(!j)return null;
     if(j.action==='local-ai'&&!aiAccess(db,j)){db.prepare("UPDATE jobs SET status='failed',result=? WHERE id=?").run(JSON.stringify({error:'Modellzugang vor dem Start nicht mehr verfügbar.'}),j.id);return null;}
     if(j.action==='integrate'){
      const payload=JSON.parse(j.payload),source=db.prepare('SELECT * FROM jobs WHERE id=?').get(payload.reviewJob??'');
      if(!source||reviewState(db,source)!=='approved'){
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
     if(v.ok&&job.action==='preview'&&result.previewBundle){
      const bundle=parse(z.record(z.string().max(7000000)),result.previewBundle);let bytes=0;const entries=Object.entries(bundle);
      if(entries.length>500||!bundle['index.html'])throw fail(400,'Vorschau benötigt index.html und höchstens 500 Dateien.');
      for(const [name,value] of entries){if(!name||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>!p||p==='.'||p==='..')||/[\u0000-\u001f]/.test(name))throw fail(400,'Ungültiger Vorschau-Pfad.');bytes+=Buffer.from(value,'base64').length;}
      if(bytes>5000000)throw fail(413,'Vorschau darf höchstens 5 MB groß sein.');const previewId=token();
      transaction(db,()=>{db.prepare('INSERT INTO previews VALUES(?,?,?,?)').run(previewId,job.id,now(),JSON.stringify(bundle));db.prepare('DELETE FROM previews WHERE id NOT IN (SELECT id FROM previews ORDER BY created DESC LIMIT 10)').run();});
      result={url:`${previewOrigin}/${previewId}/index.html`,scope:'shared',files:entries.length,bytes};
     }
     const resultText=JSON.stringify(result);if(resultText.length>150000)throw fail(413,'Ergebnis zu groß.');
     db.prepare('UPDATE jobs SET status=?,result=?,lease=NULL WHERE id=?').run(job.status==='cancelling'?'cancelled':v.ok?'completed':'failed',resultText,job.id);
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
    const existing=db.prepare('SELECT * FROM code_reviews WHERE id=?').get(v.id);
    if(existing){if(existing.job!==v.job||existing.reviewer!==m.id||existing.commit_sha!==v.commit||existing.decision!==v.decision||existing.body!==v.body)throw fail(409,'Diese Rückmeldung wurde bereits anders gespeichert.');}
    else db.prepare('INSERT INTO code_reviews(id,job,commit_sha,reviewer,decision,body,created) VALUES(?,?,?,?,?,?,?)').run(v.id,job.id,v.commit,m.id,v.decision,v.body,now());
    send({ok:true,state:reviewState(db,job)});return;
   }
   if(route==='/api/development/job'&&method==='GET'){
    const m=user(req);const jid=parse(id,url.searchParams.get('id'));
    const job=db.prepare('SELECT id,owner,device,project,action,payload,status,created,started,result FROM jobs WHERE id=?').get(jid);
    if(!job)throw fail(404,'Auftrag fehlt.');if(job.action==='local-ai'&&job.owner!==m.id&&!db.prepare('SELECT id FROM devices WHERE id=? AND owner=?').get(job.device,m.id))throw fail(403,'KI-Anfrage ist nur für Absender und Rechnerbesitzer sichtbar.');if(['files','read-file','save-file'].includes(job.action)&&job.owner!==m.id)throw fail(403,'Dateiinhalte sind nur in der eigenen Arbeitskopie verfügbar.');send({job:{...job,payload:JSON.parse(job.payload),result:job.result?JSON.parse(job.result):null}});return;
   }
   if(route==='/api/development/events'&&method==='GET'){
    const m=user(req);const jid=parse(id,url.searchParams.get('job'));
    const eventJob=db.prepare('SELECT * FROM jobs WHERE id=?').get(jid);if(!eventJob)throw fail(404,'Auftrag fehlt.');if(eventJob.action==='local-ai'&&eventJob.owner!==m.id&&!db.prepare('SELECT id FROM devices WHERE id=? AND owner=?').get(eventJob.device,m.id))throw fail(403,'KI-Auftrag ist privat.');
    const after=parse(z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER),url.searchParams.get('after')??0);
    send({events:db.prepare('SELECT seq,type,text,created FROM job_events WHERE job=? AND seq>? ORDER BY seq').all(jid,after)});return;
   }
   if(route==='/api/development'){
    const m=user(req);
    if(method==='GET'){const devices=db.prepare('SELECT id,owner,name,seen,revoked FROM devices WHERE revoked=0').all();const jobs=db.prepare(`SELECT id,owner,device,project,action,json_object('worktree',json_extract(payload,'$.worktree')) AS payload,status,created,started,CASE WHEN result IS NULL THEN NULL ELSE json_object('branch',json_extract(result,'$.branch'),'commit',json_extract(result,'$.commit'),'url',json_extract(result,'$.url'),'scope',json_extract(result,'$.scope'),'workflow',json_extract(result,'$.workflow')) END AS result FROM jobs ORDER BY created DESC LIMIT 100`).all().map(j=>({...j,payload:JSON.parse(j.payload),result:j.result?JSON.parse(j.result):null}));send({devices,activeDeviceIds:db.prepare("SELECT DISTINCT device FROM jobs WHERE status IN ('queued','running','cancelling')").all().map(j=>j.device),workspaces:listWorkspaces(db),tasks:db.prepare("SELECT id,project,title,assignee,status FROM tasks WHERE status!='done' ORDER BY created DESC").all(),jobs:jobs.map(j=>({...j,reviewState:reviewState(db,j)}))});return;}
    if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
    const v=await readJSON(req);
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
    const value=parse(z.object({action:z.literal('job'),device:id,project:id,title:text.optional(),scope:z.string().max(240).refine(validScope).optional(),task:id.optional(),operation:z.enum(['inspect','prepare','status','check','review','submit','preview','integrate','codex','files','read-file','save-file']),file:z.string().min(1).max(400).optional(),revision:z.string().regex(/^[a-f0-9]{64}$/).optional(),content:z.string().max(24000).optional(),worktree:id.optional(),source:id.optional(),issue:z.number().int().positive().max(2147483647).optional(),prompt:z.string().trim().max(12000).optional()}),v);
    if(!db.prepare('SELECT id FROM devices WHERE id=? AND owner=? AND revoked=0').get(value.device,m.id))throw fail(403,'Wähle deinen eigenen Runner.');
    if(!db.prepare('SELECT id FROM projects WHERE id=?').get(value.project))throw fail(404,'Projekt nicht gefunden.');
    let payload={};
    if(['inspect','prepare'].includes(value.operation))payload=value.issue?{issue:value.issue}:{};
    else if(value.operation==='integrate'){
     const source=db.prepare("SELECT * FROM jobs WHERE id=? AND project=? AND action='submit' AND status='completed'").get(value.source??'',value.project);if(!source)throw fail(400,'Ein erfolgreich eingereichter Stand wird benötigt.');const result=JSON.parse(source.result);if(reviewState(db,source)!=='approved')throw fail(409,'Die zweite Person muss genau diesen eingereichten Stand zuerst freigeben.');if(result.workflow==='pull-request')throw fail(409,'Dieses Repository wird ausschließlich über Pull Request, CI und Review zusammengeführt.');if(!/^[a-f0-9]{40,64}$/.test(result.commit)||!/^studio\/[\w-]+$/.test(result.branch))throw fail(400,'Ungültiger Git-Stand.');payload={commit:result.commit,branch:result.branch,reviewJob:source.id};
    }else{
     const base=db.prepare("SELECT * FROM jobs WHERE id=? AND owner=? AND device=? AND project=? AND action='prepare' AND status='completed'").get(value.worktree??'',m.id,value.device,value.project);if(!base)throw fail(403,'Eine eigene vorbereitete Arbeitskopie wird benötigt.');if(db.prepare('SELECT archived FROM workspaces WHERE job=?').get(base.id)?.archived)throw fail(409,'Arbeitsbereich zuerst wieder öffnen.');payload={worktree:base.id,...(JSON.parse(base.payload).issue?{issue:JSON.parse(base.payload).issue}:{}),...(value.operation==='codex'?{prompt:value.prompt??''}:{})};if(value.operation==='codex'&&!payload.prompt)throw fail(400,'Auftrag fehlt.');
    }
    if(['files','read-file','save-file'].includes(value.operation)){
     if(value.operation!=='files'&&!value.file)throw fail(400,'Dateipfad fehlt.');
     if(value.operation==='save-file'&&(value.content===undefined||!value.revision))throw fail(400,'Dateistand fehlt.');
     if(db.prepare("SELECT id FROM jobs WHERE device=? AND status IN ('queued','running','cancelling')").get(value.device))throw fail(409,'Bitte den laufenden Auftrag zuerst beenden lassen.');
     payload={...payload,file:value.file,revision:value.revision,content:value.content};
    }
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
    });send({ok:true,id:jid});return;
   }
   if(route==='/api/workspace'){
    const m=user(req);db.prepare('UPDATE members SET seen=? WHERE id=?').run(now(),m.id);
    if(method==='GET'){send({projects:db.prepare('SELECT * FROM projects ORDER BY created,id').all(),tasks:db.prepare('SELECT * FROM tasks ORDER BY created DESC').all(),members:db.prepare('SELECT id,name,email,role,seen FROM members ORDER BY name').all(),messages:db.prepare('SELECT * FROM (SELECT * FROM messages ORDER BY created DESC LIMIT 500) ORDER BY created').all(),documents:db.prepare('SELECT * FROM documents ORDER BY updated DESC').all(),activities:db.prepare('SELECT * FROM activities ORDER BY created DESC LIMIT 30').all()});return;}
    const v=parse(actions,await readJSON(req));
    if(v.action==='project')db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(uuid(),v.title,v.description,v.color,v.stage,now());
    else if(v.action==='task'){if(!db.prepare('SELECT id FROM projects WHERE id=?').get(v.project))throw fail(404,'Projekt fehlt.');if(v.assignee&&!db.prepare('SELECT id FROM members WHERE id=?').get(v.assignee))throw fail(400,'Mitglied fehlt.');db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(uuid(),v.project,v.title,v.description,'todo',v.priority,v.assignee,now());}
    else if(v.action==='status'||v.action==='assign'){if(v.action==='assign'&&v.assignee&&!db.prepare('SELECT id FROM members WHERE id=?').get(v.assignee))throw fail(400,'Mitglied fehlt.');if(v.action==='assign')assertAssignment(db,v.id,v.assignee);const r=v.action==='status'?db.prepare('UPDATE tasks SET status=? WHERE id=?').run(v.status,v.id):db.prepare('UPDATE tasks SET assignee=? WHERE id=?').run(v.assignee,v.id);if(!r.changes)throw fail(404,'Aufgabe fehlt.');}
    else if(v.action==='message'){if(v.channel!=='general'&&!db.prepare('SELECT id FROM projects WHERE id=?').get(v.channel))throw fail(404,'Raum fehlt.');db.prepare('INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?)').run(v.id,v.channel,m.id,v.body,now());}
    else if(v.id){if(!db.prepare('UPDATE documents SET title=?,body=?,author=?,updated=?,revision=revision+1 WHERE id=? AND revision=?').run(v.title,v.body,m.id,now(),v.id,v.revision??0).changes)throw fail(409,'Dokument inzwischen geändert. Entwurf kopieren und neu laden.');}
    else db.prepare('INSERT INTO documents VALUES(?,?,?,?,1,?)').run(uuid(),v.title,v.body,m.id,now());
    if(v.action!=='message')record(m.id,`${v.action==='project'?'Projekt':v.action==='task'?'Aufgabe':v.action==='document'?'Dokument':'Aufgabenstatus'} aktualisiert`);send({ok:true});return;
   }
   if(route.startsWith('/api/'))throw fail(404,'Schnittstelle nicht gefunden.');
   if(method!=='GET'&&method!=='HEAD')throw fail(405,'Methode nicht erlaubt.');
   const filename=path.resolve(staticDir,'.'+decodeURIComponent(route));if(!filename.startsWith(path.resolve(staticDir)+path.sep)&&filename!==path.resolve(staticDir))throw fail(403,'Ungültiger Pfad.');
   const target=existsSync(filename)&&statSync(filename).isFile()?filename:path.join(staticDir,'index.html');
   if(!existsSync(target))throw fail(503,'Oberfläche zuerst mit npm run studio:build erstellen.');
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(target)]??'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(readFileSync(target));
  }catch(e){if(!e.status)console.error('studio request failed',e.message);send({error:e.status?e.message:'Anfrage fehlgeschlagen.'},e.status??500);}
 });
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
