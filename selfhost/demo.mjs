import {mkdirSync,writeFileSync,readFileSync,existsSync,openSync,closeSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {command} from './process.mjs';
import {createStudioServer} from './server.mjs';
import {passwordHash,token,digest} from './store.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'.studio','local-demo'),origin='http://127.0.0.1:4320';
mkdirSync(directory,{recursive:true});
const app=createStudioServer({filename:path.join(directory,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:4321',sessionCookie:'studio_demo_session',demoMode:true});
const configFile=path.join(directory,'demo.private.json');
const git=(cwd,...args)=>command(['git',...args],cwd);
let settings;
if(!existsSync(configFile)){
 if(app.db.prepare('SELECT id FROM members LIMIT 1').get())throw new Error('Unvollständige Demo-Einrichtung. Vorhandene Daten prüfen; es wird nichts überschrieben.');
 const remote=path.join(directory,'example.git'),seed=path.join(directory,'seed');mkdirSync(seed,{recursive:true});mkdirSync(path.join(seed,'site'),{recursive:true});
 await git(directory,'init','--bare',remote);await git(seed,'init','-b','main');await git(seed,'config','user.name','Studio Demo');await git(seed,'config','user.email','demo@fixture.invalid');
 writeFileSync(path.join(seed,'.gitignore'),'dist/\n');
 writeFileSync(path.join(seed,'site','index.html'),'<!doctype html><html lang="de"><meta charset="utf-8"><title>SCHMAQQ Testprojekt</title><h1>SCHMAQQ · gemeinsamer Probelauf</h1><p>Diese Seite ist ein lokales Beispielprojekt.</p><a href="services.json">Service-Liste</a></html>\n');
 writeFileSync(path.join(seed,'site','services.json'),JSON.stringify([{name:'Webentwicklung',description:'Gemeinsam digitale Services entwickeln.'}],null,2)+'\n');
 writeFileSync(path.join(seed,'check.mjs'),"import{readFileSync}from'node:fs';import assert from'node:assert/strict';const html=readFileSync('site/index.html','utf8');assert.match(html,/<h1>/);const services=JSON.parse(readFileSync('site/services.json','utf8'));assert.ok(Array.isArray(services)&&services.length>0);for(const s of services){assert.ok(typeof s.name==='string'&&s.name.trim());assert.ok(typeof s.description==='string');}console.log('HTML und Service-Daten bestanden.');\n");
 writeFileSync(path.join(seed,'build.mjs'),"import{cpSync}from'node:fs';cpSync('site','dist',{recursive:true});console.log('Vorschau gebaut.');\n");
 await git(seed,'add','.');await git(seed,'commit','-m','Isolated collaboration example');await git(seed,'remote','add','origin',remote);await git(seed,'push','-u','origin','main');
 settings={accounts:[],origin};
 for(const [index,name] of ['Marco','Markus'].entries()){
  const member=randomUUID(),device=randomUUID(),access=token(),password=token().slice(0,20),email=name.toLowerCase()+'.demo@fixture.invalid',repo=path.join(directory,name.toLowerCase());
  await git(directory,'clone','--branch','main',remote,repo);await git(repo,'config','user.name',name+' (Testkonto)');await git(repo,'config','user.email',email);
  app.db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(member,name+' (Testkonto)',email,passwordHash(password),index===0?'owner':'member',Date.now());
  app.db.prepare('INSERT INTO devices(id,owner,name,hash) VALUES(?,?,?,?)').run(device,member,name+' · lokaler Test-Runner',digest(access));
  const config=path.join(directory,name.toLowerCase()+'.private.json');writeFileSync(config,JSON.stringify({server:origin,token:access,stateDir:path.join(directory,'runner-'+index),projects:{website:{repo,base:'main',check:[process.execPath,'check.mjs'],allowCodex:false,publish:true,preview:{build:[process.execPath,'build.mjs'],directory:'dist'}}}},null,2),{mode:0o600});
  const task=randomUUID(),job=randomUUID(),scope=index===0?'site/index.html':'site/services.json',title=index===0?'Startseitentext gemeinsam verbessern':'Service-Angebot ergänzen';
  app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(task,'website',title,'Lokaler Probelauf: Datei bearbeiten, Tests und Vorschau ausführen, dann Teamprüfung.','doing','Normal',member,Date.now());
  app.db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(job,member,device,'website','prepare','{}','queued',Date.now());
  app.db.prepare('INSERT INTO workspaces(job,title,scope,task) VALUES(?,?,?,?)').run(job,title,scope,task);
  settings.accounts.push({name,email,password,config,device,worktree:job});
 }
 app.db.prepare('UPDATE projects SET title=?,description=? WHERE id=?').run('SCHMAQQ · lokales Testprojekt','Isolierter Probelauf. Keine Verbindung zur echten Website oder zu GitHub.','website');
 writeFileSync(configFile,JSON.stringify(settings,null,2),{mode:0o600});
 const guide=`# Lokaler Probelauf für zwei Personen\n\nStudio: ${origin}\n\nDies sind ausschließlich lokale Testkonten. Beide Runner laufen auf diesem PC. Es besteht keine Verbindung zum echten NetzKontor-Repository, VPS oder persönlichen ChatGPT-Konten.\n\n${settings.accounts.map(a=>`- ${a.name}: ${a.email}\n  Testpasswort: ${a.password}`).join('\n\n')}\n\n## Ablauf\n\n1. Als Marco anmelden, Entwicklung öffnen und im eigenen Arbeitsbereich auf Weiterarbeiten klicken.\n2. Dateien laden, site/index.html bearbeiten und speichern. Tests und Vorschau ausführen.\n3. Zur Teamprüfung wählen. Zum Testen beider Rollen ein zweites Browserprofil verwenden oder abmelden und als Markus anmelden. Zwei normale Tabs teilen dieselbe Sitzung.\n4. Als Markus den Prüfstand ansehen, kommentieren, Änderungen anfordern oder freigeben. In Markus' eigener Arbeitskopie lässt sich site/services.json bearbeiten.\n5. Branch veröffentlichen pusht hier ausschließlich in das lokale Test-Repository. Den veröffentlichten Stand mit der zweiten Rolle freigeben; danach kann der Autor Zusammenführen testen.\n\nCodex ist im Testprojekt deaktiviert: Es werden keine Modellaufrufe oder Abo-Kontingente verbraucht. Vorschauen und Tests laufen tatsächlich. Für den späteren echten Betrieb verwendet jede Person ihren eigenen PC und Codex-Login.\n\nNeustart aus dem Studio-Quellordner: node selfhost/demo.mjs. Bestehende Testdaten und Arbeitskopien bleiben erhalten. Stoppen mit Strg+C im zugehörigen Terminal. Der persönliche Workspace auf Port 4310 bleibt separat; die Demo verwendet einen eigenen Sitzungscookie.\n`;
 writeFileSync(path.join(directory,'LOKAL-TESTEN.md'),guide,{mode:0o600});
}else settings=JSON.parse(readFileSync(configFile,'utf8'));

// Bind before launching runners; a second launch must not execute jobs twice.
await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(4320,'127.0.0.1',resolve);});
try{await new Promise((resolve,reject)=>{app.previewServer.once('error',reject);app.previewServer.listen(4321,'127.0.0.1',resolve);});}catch(e){app.server.close();throw e;}
const children=[];
for(const a of settings.accounts){const fd=openSync(path.join(directory,a.name.toLowerCase()+'.log'),'a');const child=spawn(process.execPath,[path.join(root,'selfhost/runner.mjs'),a.config],{cwd:root,windowsHide:true,stdio:['ignore',fd,fd]});closeSync(fd);children.push(child);child.on('error',e=>console.error(a.name+': '+e.message));}
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await Promise.all(children.map(async child=>{if(child.exitCode!==null)return;if(process.platform==='win32')await command(['taskkill','/PID',String(child.pid),'/T','/F'],root).catch(()=>{});else child.kill('SIGTERM');}));await Promise.all([new Promise(r=>app.server.close(r)),new Promise(r=>app.previewServer.close(r))]);app.db.close();}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
console.log('Lokaler Zwei-Personen-Test: '+origin+'\nAnmeldedaten und Ablauf: '+path.join(directory,'LOKAL-TESTEN.md'));
