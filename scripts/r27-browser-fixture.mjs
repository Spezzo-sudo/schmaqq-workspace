// Isolated browser fixture. No real accounts, providers, repository or personal runner.
import {mkdtempSync,writeFileSync,chmodSync,mkdirSync,readFileSync} from 'node:fs';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.R27_FIXTURE_RELEASE?path.resolve(process.env.R27_FIXTURE_RELEASE):root;
if(process.env.R27_FIXTURE_RELEASE){const identity=JSON.parse(readFileSync(path.join(runtime,'release-source.json'),'utf8'));if(!process.env.R27_FIXTURE_SOURCE||identity.sourceCommit!==process.env.R27_FIXTURE_SOURCE)throw Error('Wrong immutable fixture release');}
const {createStudioServer}=await import(pathToFileURL(path.join(runtime,'selfhost/server.mjs')).href);
const {passwordHash,token,digest}=await import(pathToFileURL(path.join(runtime,'selfhost/store.mjs')).href);
const directory=mkdtempSync(path.join(os.tmpdir(),'schmaqq-r27-browser-'));
chmodSync(directory,0o700);
const port=Number(process.env.R27_FIXTURE_PORT??45631),previewPort=port+1;
if(port<45000||port>49000)throw Error('Use an isolated high loopback port for fixtures.');
const origin=`http://127.0.0.1:${port}`;
const app=createStudioServer({filename:path.join(directory,'studio.sqlite'),origin,previewOrigin:`http://127.0.0.1:${previewPort}`,resetMailer:null,demoMode:true,sessionCookie:'room_design_session',staticDir:path.join(runtime,'studio-dist')});
const accounts=[];
for(const [id,name,role] of [['marco-fixture','Marco Testkonto','owner'],['markus-fixture','Markus Testkonto','member'],['observer-fixture','Teammitglied Testkonto','member']]){
 const password=token().slice(0,24),email=id+'@fixture.invalid';
 app.db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(id,name,email,passwordHash(password),role,Date.now());accounts.push({id,name,email,password});
}
app.db.prepare('UPDATE projects SET title=?,description=? WHERE id=?').run('SCHMAQQ Website','Ein klarer Auftritt. Gemeinsam entwerfen, umsetzen und prüfen.','website');
app.db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run('klimafinder-fixture','Klimafinder.ch','Die passende Klimalösung finden. Einfach, verständlich und gemeinsam entwickelt.','sage','In Entwicklung',Date.now());
const now=Date.now();
const messages=[['message-fixture-a','marco-fixture','Lasst uns mit der Suche beginnen. Der Nutzer soll zuerst seine Region wählen können.'],['message-fixture-b','markus-fixture','Passt. Ich prüfe die verfügbaren Daten und bringe einen ersten Vorschlag mit.'],['message-fixture-c','marco-fixture','Eine Entscheidung halten wir schon fest: zuerst eine einfache, mobile Suche. Keine zusätzliche Cloud-Infrastruktur.']];
for(const [i,[id,author,body]] of messages.entries())app.db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(id,'klimafinder-fixture',author,body,now-180000+i*60000);
app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run('task-fixture-first','klimafinder-fixture','Ersten Suchablauf skizzieren','Region wählen, passende Angebote sehen und eine klare Kontaktmöglichkeit finden.','doing','Normal','markus-fixture',now-60000);
app.db.prepare('INSERT INTO documents VALUES(?,?,?,?,1,?)').run('decision-fixture','Mobil zuerst','Wir beginnen mit einer einfachen mobilen Suche. Bestehende Infrastruktur verwenden.','marco-fixture',now-30000);
app.db.prepare('INSERT INTO workspace_meta VALUES(?,?)').run('room:v1:note:decision-fixture',JSON.stringify({project:'klimafinder-fixture',kind:'decision',source:'message-fixture-c'}));
const device='fixture-markus-device',access=token();
app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(device,'markus-fixture','Markus · Testrechner',digest(access),now);
app.db.prepare('INSERT INTO ai_resources VALUES(?,?,?,?,?,?,?)').run(device,JSON.stringify(['Fixture-Testmodell']),'ready',1,JSON.stringify(['klimafinder-fixture']),'disabled',now);
const heartbeat=setInterval(()=>{app.db.prepare('UPDATE ai_resources SET updated=? WHERE device=?').run(Date.now(),device);app.db.prepare('UPDATE devices SET seen=? WHERE id=?').run(Date.now(),device);},10000);
// Two real Git/Node runners, isolated to disposable local repositories.
const codeDevices=[],children=[];
const git=(cwd,...args)=>execFileSync('git',['-c','commit.gpgsign=false','-c','core.hooksPath='+path.join(directory,'no-hooks'),...args],{cwd,encoding:'utf8',stdio:'pipe',timeout:15000});
const seed=path.join(directory,'seed'),remote=path.join(directory,'shared-fixture.git');
mkdirSync(seed);mkdirSync(path.join(seed,'site'));mkdirSync(path.join(directory,'no-hooks'));
writeFileSync(path.join(seed,'.gitignore'),'dist/\n');
writeFileSync(path.join(seed,'site/index.html'),'<!doctype html><html lang="de"><meta charset="utf-8"><title>Isolierte Vorschau</title><h1>Gemeinsamer Teststand</h1></html>\n');
writeFileSync(path.join(seed,'check.mjs'),"import{readFileSync}from'node:fs';import assert from'node:assert/strict';assert.match(readFileSync('site/index.html','utf8'),/<h1>/);console.log('HTML-Pruefung bestanden.');\n");
writeFileSync(path.join(seed,'build.mjs'),"import{cpSync}from'node:fs';cpSync('site','dist',{recursive:true});console.log('Statische Vorschau erstellt.');\n");
git(directory,'init','--bare',remote);git(seed,'init','-b','main');git(seed,'config','user.name','R25 Fixture');git(seed,'config','user.email','fixture@example.invalid');git(seed,'add','.');git(seed,'commit','-m','Isolated R25 source');git(seed,'remote','add','origin',remote);git(seed,'push','-u','origin','main');
for(const person of accounts.slice(0,2)){
 const id=person.id+'-code',runnerToken=token(),repo=path.join(directory,person.id+'-repo');
 git(directory,'clone','--branch','main',remote,repo);git(repo,'config','user.name',person.name);git(repo,'config','user.email',person.email);
 app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(id,person.id,person.name.split(' ')[0]+' · Code-Testrechner',digest(runnerToken),now);
 const config={server:origin,token:runnerToken,stateDir:path.join(directory,person.id+'-runner'),projects:{'klimafinder-fixture':{repo,base:'main',check:[process.execPath,'check.mjs'],allowCodex:false,publish:false,preview:{build:[process.execPath,'build.mjs'],directory:'dist'}}}};
 const configPath=path.join(directory,person.id+'.runner.private.json');writeFileSync(configPath,JSON.stringify(config),{mode:0o600});codeDevices.push({id,configPath});
}
app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run('task-fixture-code','klimafinder-fixture','Startseite gemeinsam verbessern','Bearbeite site/index.html, teste und teile einen pruefbaren Stand.','todo','Normal','marco-fixture',now);
// Synthetic review is for UI verification only: not evidence that the runner executed it.
const pinnedReviewId='r27-fixture-review',pinnedCopy='r27-fixture-copy',fakeCommit='b'.repeat(40);
const fakeReviewDiff=['diff --git a/site/index.html b/site/index.html','index 0000000..1111111 100644','--- a/site/index.html','+++ b/site/index.html','@@ -1,2 +1,2 @@',' <!doctype html>','-<h1>Alte Designfarben</h1>','+<h1>SCHMAQQ Designfarben</h1>'].join('\n');
app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(pinnedCopy,'markus-fixture','markus-fixture-code','klimafinder-fixture','prepare',JSON.stringify({task:'task-fixture-first',issue:'fixture-review'}),'completed',now-60000,JSON.stringify({branch:'fixture-review-branch'}));
app.db.prepare('INSERT INTO workspaces(job,title,scope,task,archived,revision) VALUES(?,?,?,?,0,1)').run(pinnedCopy,'Design-Review-Test','site/index.html','task-fixture-first');
app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,?,?,?,?,?)').run(pinnedReviewId,'markus-fixture','markus-fixture-code','klimafinder-fixture','review',JSON.stringify({worktree:pinnedCopy}),'completed',now-10000,JSON.stringify({commit:fakeCommit,diff:fakeReviewDiff,checks:'Fixture-Tests synthetisch'}));
writeFileSync(path.join(directory,'fixture.private.json'),JSON.stringify({origin,directory,accounts,device,access,codeDevices}),{mode:0o600});
await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(port,'127.0.0.1',resolve);});
await new Promise((resolve,reject)=>{app.previewServer.once('error',reject);app.previewServer.listen(previewPort,'127.0.0.1',resolve);});
for(const d of codeDevices){const child=spawn(process.execPath,[path.join(root,'selfhost/runner.mjs'),d.configPath],{cwd:root,stdio:'ignore'});children.push(child);}
console.log(JSON.stringify({fixtureDirectory:directory,origin}));
let stopped=false;async function stop(){if(stopped)return;stopped=true;clearInterval(heartbeat);await Promise.all(children.map(child=>new Promise(resolve=>{if(child.exitCode!==null)return resolve();const kill=setTimeout(()=>child.kill('SIGKILL'),4500);child.once('exit',()=>{clearTimeout(kill);resolve();});child.kill('SIGTERM');})));await new Promise(resolve=>app.server.close(resolve));await new Promise(resolve=>app.previewServer.close(resolve));app.db.close();process.exit(0);}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
