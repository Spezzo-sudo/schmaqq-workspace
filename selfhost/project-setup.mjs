import {mkdirSync,writeFileSync,readFileSync,lstatSync,realpathSync,renameSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readConfiguration} from './pilot-runner.mjs';
import {command} from './process.mjs';
import {cloneGithubRepository,githubRepository} from './github-import.mjs';
const fail=message=>{throw Error(message);};
function origin(value){let u;try{u=new URL(value);}catch{fail('Studio-Adresse ungültig.');}if(u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))fail('Studio-Adresse benötigt HTTPS oder Loopback.');return u.origin;}
export async function setupProject(planFile,configurationFile){
 const plan=readConfiguration(path.resolve(planFile),{privateOnly:false}),configPath=path.resolve(configurationFile),config=readConfiguration(configPath),original=readFileSync(configPath);
 if(plan.schema!=='schmaqq-project-setup-v1'||!/^[\w-]{1,100}$/.test(plan.project??'')||!['existing','new','github'].includes(plan.mode))fail('Kein unterstützter Projektplan.');
 if(origin(plan.server)!==origin(config.server)||typeof config.token!=='string'||!config.token)fail('Plan und persönlicher Runner müssen zum selben Studio gehören.');
 if(!config.projects||typeof config.projects!=='object'||Array.isArray(config.projects)||Object.hasOwn(config.projects,plan.project))fail('Bestehende Projektfreigabe wird nicht überschrieben.');
 if(typeof plan.directory!=='string'||!path.isAbsolute(plan.directory)||path.resolve(plan.directory)===path.parse(path.resolve(plan.directory)).root)fail('Eigenen absoluten Projektordner wählen, kein Laufwerkswurzelverzeichnis.');
 const directory=path.resolve(plan.directory),parent=path.dirname(directory);
 if(path.relative(realpathSync(parent),parent)!=='')fail('Übergeordneter Ordner darf keine Verknüpfung sein.');
 const base=plan.mode==='new'?'main':plan.base;
 if(typeof base!=='string'||!base||base.startsWith('-')||base.length>100)fail('Hauptzweig ungültig.');
 const check=plan.mode==='new'?[process.execPath,'--test','check.test.mjs']:plan.check;
 if(!Array.isArray(check)||!check.length||check.length>30||!check.every(a=>typeof a==='string'&&a.length>0&&a.length<=4096&&!a.includes('\0')))fail('Testbefehl muss eine geprüfte Argumentliste sein.');
 let preview;
 if(plan.mode!=='new'&&plan.preview){
  const {build,directory:output}=plan.preview;
  if(!Array.isArray(build)||!build.length||build.length>30||!build.every(a=>typeof a==='string'&&a.length>0&&a.length<=4096&&!a.includes('\0'))||typeof output!=='string'||!output||output.length>240||path.isAbsolute(output)||output.split(/[\\/]/).some(p=>!p||p==='.'||p==='..')||output.includes('\0'))fail('Vorschau benötigt eine geprüfte Build-Argumentliste und einen relativen Ausgabeordner innerhalb der Arbeitskopie.');
  preview={build,directory:output};
 }
 if(plan.mode==='github')githubRepository(plan.repository);
 const git=async(cwd,...args)=>{try{return await command(['git','-c','core.hooksPath='+path.join(directory,'.setup-no-hooks'),'-c','core.fsmonitor=false',...args],cwd,{timeout:20000});}catch{fail('Git-Einrichtung fehlgeschlagen. Bestehendes Projekt/Runnerprofil nicht überschrieben; neu angelegte Dateien zur Prüfung erhalten.');}};
 await git(parent,'check-ref-format','--branch',base);
 let repository=directory;
 if(plan.mode==='existing'){
  const entry=lstatSync(directory);if(!entry.isDirectory()||entry.isSymbolicLink())fail('Repository muss ein eigener regulärer Ordner sein.');
  if(path.relative(realpathSync(await git(directory,'rev-parse','--show-toplevel')),realpathSync(directory))!=='')fail('Den tatsächlichen Repository-Stammordner auswählen.');
  await git(directory,'remote','get-url','origin');
 }else if(plan.mode==='github'){
  repository=await cloneGithubRepository({url:plan.repository,base,directory,config,configPath,project:plan.project});
 }else{
  // Exclusive root creation, no cleanup/delete or reuse of an existing target.
  mkdirSync(directory,{mode:0o700});repository=path.join(directory,'repository');const remote=path.join(directory,'remote.git');mkdirSync(repository,{mode:0o700});mkdirSync(path.join(directory,'.setup-no-hooks'));
  await git(directory,'init','--bare',remote);await git(repository,'init','-b','main');
  mkdirSync(path.join(repository,'site'));
  writeFileSync(path.join(repository,'.gitignore'),'dist/\n.studio/\n');
  writeFileSync(path.join(repository,'site/index.html'),'<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Gemeinsames Projekt</title><h1>Unser neues Projekt</h1><p>Aufgaben gemeinsam planen, Änderungen prüfen und Ergebnisse teilen.</p></html>\n');
  writeFileSync(path.join(repository,'check.test.mjs'),"import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';test('Startseite hat Titel und Hauptüberschrift',()=>{const html=readFileSync('site/index.html','utf8');assert.ok(html.includes('<title>')&&html.includes('<h1>'));});\n");
  writeFileSync(path.join(repository,'build.mjs'),"import {cpSync} from 'node:fs';cpSync('site','dist',{recursive:true});\n");
  await git(repository,'add','.');await git(repository,'-c','user.name=SCHMAQQ Project Setup','-c','user.email=project-setup@schmaqq.invalid','commit','-m','Initial local SCHMAQQ project');
  await git(repository,'remote','add','origin',remote);await git(repository,'push','-u','origin','main');
 }
 const project={repo:realpathSync(repository),base,check,allowCodex:false,publish:false,workflow:'pull-request',...(plan.mode==='new'?{preview:{build:[process.execPath,'build.mjs'],directory:'dist'}}:preview?{preview}:{})};
 const next={...config,projects:{...config.projects,[plan.project]:project}};
 const info=lstatSync(configPath);if(info.isSymbolicLink()||info.nlink!==1||!readFileSync(configPath).equals(original))fail('Runnerprofil inzwischen geändert; nicht überschrieben.');
 const suffix=randomUUID(),backup=configPath+'.before-'+suffix+'.private.json',temporary=configPath+'.tmp-'+suffix+'.private.json';
 writeFileSync(backup,original,{flag:'wx',mode:0o600});
 try{writeFileSync(temporary,JSON.stringify(next,null,2)+'\n',{flag:'wx',mode:0o600});renameSync(temporary,configPath);}catch{try{unlinkSync(temporary);}catch{}fail('Runnerprofil konnte nicht gespeichert werden. Sicherung und Projektdateien bleiben erhalten.');}
 return {project:plan.project,repository,backup,allowCodex:false,publish:false,restartRequired:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length!==5||process.argv[2]!=='--apply'){console.error('Aufruf: node selfhost/project-setup.mjs --apply PFAD_ZUM_PLAN PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL');process.exitCode=1;}
 else try{await setupProject(process.argv[3],process.argv[4]);console.log('Projekt lokal eingerichtet. Bestehender Zugang beibehalten, Sicherung angelegt. Runner einmal mit dem bestehenden Profil neu starten; KI und Veröffentlichung bleiben für das neue Projekt gesperrt.');}catch(e){console.error(e.message);process.exitCode=1;}
}
