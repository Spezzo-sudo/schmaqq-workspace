// Synthetic night UI fixture: one owner, one PC and one server worker, a general analysis task with a
// read-only task copy (prepare + files + read-file jobs) and a project with a copy but no test command.
// No real accounts, repositories, runners or VPS. Start: node scripts/task-handoff-browser-fixture.mjs
import {mkdtempSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createStudioServer} from '../selfhost/server.mjs';
import {passwordHash,digest} from '../selfhost/store.mjs';
import {storeMetadata} from '../selfhost/team-model.mjs';
const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-night-ui-'));
const origin='http://127.0.0.1:45791';
const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:45792',resetMailer:null,sessionCookie:'night_fixture_session'});
const db=app.db,now=Date.now();
db.prepare('INSERT INTO members(id,email,name,role,password,seen) VALUES(?,?,?,?,?,?)').run('night-owner','night@fixture.invalid','Nacht Testkonto','owner',passwordHash('Synthetic-Night-2026'),now);
for(const [id,name,kind] of [['night-pc','Test-PC','pc'],['night-server','Test-Server','server']]){
 db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(id,'night-owner',name,digest(id+'-not-a-credential'),now+3600_000);
 storeMetadata(db,'executor:v1:host:'+id,{kind,os:'fixture',arch:'x64',node:'24',cpus:2,memoryMb:4096,setupPlanVersion:1});
}
const project='klimafinder-fixture';
db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(project,'Klimafinder (Test)','Synthetisches Projekt für die Nachtabnahme','sage','Test',now);
storeMetadata(db,'room:v1:project:'+project,{teamShared:true,repository:'https://github.com/fixture/klimafinder',base:'main',workflow:'pull-request',revision:1});
// Server reports a repository copy without a test command; the PC reports nothing for this project.
db.prepare('INSERT INTO runner_project_state(device,projects,updated) VALUES(?,?,?)').run('night-server',JSON.stringify([{id:project,setupVersion:1,check:false,preview:false,allowCodex:false,publish:false}]),now);
const task=randomUUID();
db.prepare("INSERT INTO tasks(id,project,title,description,status,priority,assignee,created) VALUES(?,?,?,?,?,'normal',?,?)").run(task,project,'Hauptseite analysieren','Nur lesen und Befunde mit Fundstellen festhalten.','doing','night-owner',now);
storeMetadata(db,'team:v1:task:'+task,{kind:'general',criteria:'Befunde mit Datei und Zeile; Vermutungen getrennt.',requiresReview:false,blocked:'',cancelled:false,revision:0});
const copy=randomUUID();
db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(copy,'night-owner','night-server',project,'prepare',JSON.stringify({task}),'completed',now,JSON.stringify({branch:'studio/'+copy,path:'/synthetic'}));
db.prepare('INSERT INTO workspaces(job,title,scope,task) VALUES(?,?,?,?)').run(copy,'Lesekopie','',task);
for(const action of ['files','read-file'])db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),'night-owner','night-server',project,action,JSON.stringify({worktree:copy,file:'home.js'}),'completed',now+1,'{}');
const fresh=randomUUID();
db.prepare("INSERT INTO tasks(id,project,title,description,status,priority,assignee,created) VALUES(?,?,?,?,?,'normal',?,?)").run(fresh,project,'Neue Recherche','Gerade übernommen, noch nichts erarbeitet.','todo','night-owner',now-1);
storeMetadata(db,'team:v1:task:'+fresh,{kind:'general',criteria:'',requiresReview:false,blocked:'',cancelled:false,revision:0});
// Overview fixture: a colleague's task, legacy read noise like the live 29.10. history, real work and one queued test run.
db.prepare('INSERT INTO members(id,email,name,role,password,seen) VALUES(?,?,?,?,?,?)').run('night-colleague','colleague@fixture.invalid','Kollege Test','member',passwordHash('Synthetic-Colleague-2026'),now);
const colleague=randomUUID();
db.prepare("INSERT INTO tasks(id,project,title,description,status,priority,assignee,created) VALUES(?,?,?,?,?,'normal',?,?)").run(colleague,project,'Texte der Startseite kürzen','Kürzere Einleitung.','doing','night-colleague',now-2);
storeMetadata(db,'team:v1:task:'+colleague,{kind:'general',criteria:'',requiresReview:false,blocked:'',cancelled:false,revision:0});
const minute=60_000,event=(actor,taskId,kind,body,ago)=>storeMetadata(db,'team:v1:event:'+randomUUID(),{id:randomUUID(),actor,project,task:taskId,kind,body,created:now-ago*minute});
event('night-owner',task,'create','Aufgabe angelegt: Hauptseite analysieren',900);
for(let i=0;i<12;i++)event('night-owner',task,'read-file','Bearbeitung aktualisiert',800-i*3);
for(let i=0;i<3;i++)event('night-colleague',colleague,'save-file','Datei gespeichert',120-i*4);
event('night-colleague',null,'message','Neue Nachricht im Projektgespräch',60);
db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),'night-owner','night-server',project,'check',JSON.stringify({worktree:copy}),'queued',now,null);
await new Promise(r=>app.server.listen(45791,'127.0.0.1',r));
// Report capabilities like a runner would, so the UI sees both executors (synthetic tokens only).
for(const [id,kind,development] of [['night-pc','pc',[]],['night-server','server',[{id:project,setupVersion:1,check:false,preview:false,allowCodex:false,publish:false}]]]){
 const r=await fetch(origin+'/api/runner/capabilities',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,Authorization:'Bearer '+id+'-not-a-credential'},body:JSON.stringify({models:[],status:'disabled',allowTeam:false,projects:[],codex:'disabled',development,host:{kind,os:'fixture',arch:'x64',node:'24.15',cpus:2,memoryMb:4096,setupPlanVersion:1}})});
 if(!r.ok)console.error('capabilities',id,r.status,await r.text());
}
setInterval(()=>db.prepare('UPDATE devices SET seen=? WHERE id IN (?,?)').run(Date.now(),'night-pc','night-server'),10000);
console.log(JSON.stringify({origin,project,task,fresh,dir,synthetic:true}));
