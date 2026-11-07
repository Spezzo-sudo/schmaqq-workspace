import {openSync,closeSync,fstatSync,fchmodSync,readFileSync,writeFileSync,lstatSync,mkdirSync,realpathSync,constants} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {startRunner} from './runner.mjs';

export const pilotProject='986b71a9-48e4-49d8-97bd-f2156bbf61c8';
const origin='https://studio.schmaqq.com';
const remotes=new Set(['https://github.com/Spezzo-sudo/schmaqq-studio-pilot.git','git@github.com:Spezzo-sudo/schmaqq-studio-pilot.git']);
const fail=message=>{throw new Error(message);};
function owned(info,privateOnly){
 if(process.platform!=='win32'&&(info.uid!==process.getuid()||(privateOnly&&(info.mode&0o077))))fail('Datei oder Ordner muss dir gehören und darf nicht für andere Benutzer freigegeben sein.');
}
function directory(dir){
 try{mkdirSync(dir,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
 const info=lstatSync(dir);if(!info.isDirectory()||info.isSymbolicLink())fail('Privater Ordner darf keine Verknüpfung sein.');owned(info,true);
}
export function readConfiguration(filename,{privateOnly=true}={}){
 const fd=openSync(filename,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
 try{
  const info=fstatSync(fd);if(!info.isFile()||info.nlink!==1||info.size>65536)fail('Konfiguration muss eine kleine reguläre Datei ohne Verknüpfungen sein.');
  if(lstatSync(filename).isSymbolicLink())fail('Konfigurations-Verknüpfungen sind nicht erlaubt.');owned(info,privateOnly);
  if(!privateOnly&&process.platform!=='win32')fchmodSync(fd,0o600);
  try{return JSON.parse(readFileSync(fd,'utf8'));}catch{fail('Konfiguration ist kein gültiges JSON. Inhalt wird nicht ausgegeben.');}
 }finally{closeSync(fd);}
}
export function restrictedConfiguration(input,repository,stateDir){
 if(!input||input.server!==origin||typeof input.token!=='string'||!/^[A-Za-z0-9_-]{32,200}$/.test(input.token))fail('Persönliche Pilot-Konfiguration benötigt den richtigen HTTPS-Server und ein Gerätetoken.');
 if(!input.projects||Object.keys(input.projects).length!==1||!Object.hasOwn(input.projects,pilotProject))fail('Nur das freigegebene Studio-Pilotprojekt ist erlaubt.');
 if(input.projects[pilotProject].allowCodex===true||input.ai?.ollama?.enabled===true)fail('KI ist in diesem Pilotstarter gesperrt.');
 if(!path.isAbsolute(repository)||!path.isAbsolute(stateDir))fail('Repository und Runnerzustand benötigen absolute Pfade.');
 const repo=realpathSync(repository),state=path.resolve(stateDir);
 if(state===repo||state.startsWith(repo+path.sep)||repo.startsWith(state+path.sep))fail('Runnerzustand und Repository müssen getrennt bleiben.');
 let remote,top;
 try{
  const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',timeout:10000,windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
  top=realpathSync(git('rev-parse','--show-toplevel'));remote=git('remote','get-url','origin');
 }catch{fail('Eigenes Git-Repository oder origin fehlt. Git-Ausgaben werden nicht veröffentlicht.');}
 if(top!==repo||!remotes.has(remote))fail('Nur ein eigener Checkout von Spezzo-sudo/schmaqq-studio-pilot ist freigegeben.');
 // Do not execute commands supplied by a downloaded profile.
 return {server:origin,token:input.token,stateDir:state,projects:{[pilotProject]:{
  repo,base:'main',check:[process.execPath,'--test'],allowCodex:false,publish:false,workflow:'pull-request',
  preview:{build:[process.execPath,'scripts/build.mjs'],directory:'dist'}
 }}};
}
export function personalPaths(home=os.homedir()){
 const base=path.join(realpathSync(home),'.schmaqq-studio');
 return {base,folder:path.join(base,'pilot'),state:path.join(base,'pilot','state'),configuration:path.join(base,'pilot','runner.private.json')};
}
export function verifyPackage(){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 const manifest=JSON.parse(readFileSync(path.join(root,'runner-manifest.json'),'utf8'));
 return import('node:crypto').then(({createHash})=>{
  for(const file of manifest.files){
   if(!/^(selfhost\/[a-z-]+\.mjs|Start-Pilot\.command|README\.md)$/.test(file.path))fail('Ungültiger Paketpfad.');
   const full=path.join(root,file.path),info=lstatSync(full);
   if(!info.isFile()||info.isSymbolicLink())fail('Paketdatei fehlt oder ist verknüpft.');
   const bytes=readFileSync(full);if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)fail('Paketdatei wurde verändert. Nicht starten.');
  }
 });
}
async function main(){
 const [major,minor]=process.versions.node.split('.').map(Number);
 if(major<24||major===24&&minor<15)fail('Node >=24.15 ist erforderlich. Es wird nichts automatisch installiert.');
 await verifyPackage();
 const paths=personalPaths(),args=process.argv.slice(2);
 if(args[0]==='--configure'){
  if(args.length!==3)fail('Aufruf: --configure PFAD_ZUM_PERSÖNLICHEN_DOWNLOAD ABSOLUTER_PILOT_CHECKOUT');
  const input=readConfiguration(path.resolve(args[1]),{privateOnly:false});
  const config=restrictedConfiguration(input,args[2],paths.state);
  directory(paths.base);directory(paths.folder);directory(paths.state);
  // Exclusive creation: do not replace an existing personal registration.
  writeFileSync(paths.configuration,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Private Pilot-Konfiguration gespeichert. Den ursprünglichen Download ebenfalls privat aufbewahren.');return;
 }
 if(args.length>1||args.length===1&&args[0]!=='--check')fail('Nur --check oder --configure ist erlaubt.');
 for(const dir of [paths.base,paths.folder,paths.state]){const s=lstatSync(dir);if(!s.isDirectory()||s.isSymbolicLink())fail('Privater Runnerordner ungültig.');owned(s,true);}
 const input=readConfiguration(paths.configuration);
 const config=restrictedConfiguration(input,input.projects?.[pilotProject]?.repo??'',paths.state);
 if(args[0]==='--check'){console.log('Pilot-Konfiguration geprüft; keine Verbindung und kein Auftrag gestartet.');return;}
 process.umask(0o077);console.log('Nur Pilotprojekt freigegeben. KI und Veröffentlichung gesperrt. Beenden: Ctrl+C.');
 await startRunner(config);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(error=>{const safe=error.code==='EEXIST'?'Konfiguration existiert bereits. Vorhandenen Zugang verwenden.':error.code==='ENOENT'?'Benötigte Datei oder privater Ordner fehlt. Einrichtung prüfen.':error.message;console.error(safe);process.exitCode=1;});
}
