import {accessSync,constants,existsSync,lstatSync,mkdirSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {command} from './process.mjs';

const fail=message=>{throw new Error(message);};
const norm=value=>process.platform==='win32'?value.toLowerCase():value;
const within=(child,parent)=>norm(child)===norm(parent)||norm(child).startsWith(norm(parent)+path.sep);

// Only GitHub's own HTTPS and SSH URL forms. Credentials, URL fragments,
// encoded paths, flags and arbitrary git transports are never accepted.
export function githubRepository(value){
 if(typeof value!=='string'||value.length>250||value!==value.trim()||/[\x00-\x20\x7f]/.test(value))fail('GitHub-Adresse ungültig. Bitte die reine Repository-URL ohne Zugangsdaten angeben.');
 const https=/^https:\/\/github\.com\/([a-zA-Z0-9-]{1,39})\/([a-zA-Z0-9_.-]{1,100})$/.exec(value);
 const ssh=/^git@github\.com:([a-zA-Z0-9-]{1,39})\/([a-zA-Z0-9_.-]{1,100})$/.exec(value);
 const match=https??ssh;
 if(!match)fail('Nur direkte GitHub-Repositories via https://github.com/OWNER/REPO oder git@github.com:OWNER/REPO sind erlaubt.');
 const owner=match[1],repository=match[2].replace(/\.git$/i,'');
 if(!repository||repository==='.'||repository==='..'||repository.includes('..')||owner.startsWith('-')||owner.endsWith('-'))fail('GitHub-Repository-Name ungültig.');
 return {owner,repository,url:https?`https://github.com/${owner}/${repository}.git`:`git@github.com:${owner}/${repository}.git`};
}

export function importDestination(directory,config,configPath){
 if(typeof directory!=='string'||!path.isAbsolute(directory)||path.resolve(directory)===path.parse(path.resolve(directory)).root)fail('Einen eigenen absoluten Zielordner auf deinem Rechner wählen.');
 const target=path.resolve(directory),parent=path.dirname(target);
 if(existsSync(target))fail('Der Zielordner existiert bereits. Bitte einen neuen leeren Namen wählen; bestehende Daten werden nie ersetzt.');
 let actualParent;
 try{
  const info=lstatSync(parent);if(!info.isDirectory()||info.isSymbolicLink())throw Error();
  if(process.platform!=='win32'&&(info.uid!==process.getuid()||(info.mode&0o022)!==0))fail('Für den Import einen eigenen, nicht öffentlich beschreibbaren Arbeitsordner wählen.');
  actualParent=realpathSync(parent);accessSync(parent,constants.W_OK);
 }catch{fail('Der übergeordnete Ordner muss lokal existieren, beschreibbar sein und darf keine Verknüpfung sein.');}
 if(norm(actualParent)!==norm(parent)||parent===path.parse(parent).root)fail('Bitte einen direkten persönlichen Arbeitsordner ohne Verknüpfungen oder Laufwerkswurzel wählen.');
 const protectedPaths=[configPath,config.stateDir,...Object.values(config.projects??{}).map(v=>v?.repo)].filter(v=>typeof v==='string'&&path.isAbsolute(v)).map(p=>path.resolve(p));
 for(const protectedPath of protectedPaths)if(within(target,protectedPath)||within(protectedPath,target))fail('Der Zielordner darf keine bestehende Runnerkonfiguration, Arbeitskopie oder deren Unterordner enthalten.');
 return target;
}

export async function confirmProjectOwner(config,project){
 let response;
 try{
  response=await fetch(new URL('/api/runner/project-setup-verify',config.server),{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.token}`},
   body:JSON.stringify({project}),signal:AbortSignal.timeout(12000)
  });
 }catch{fail('Studio ist nicht erreichbar. Internetverbindung prüfen und den bestehenden persönlichen Runnerzugang verwenden.');}
 if(!response.ok)fail('Projekt und persönlicher Runner sind nicht gemeinsam freigegeben. Im Studio das eigene Projekt und die bestehende Geräteanmeldung prüfen.');
}

export async function cloneGithubRepository({url,base,directory,config,configPath,project}){
 const source=githubRepository(url),target=importDestination(directory,config,configPath);
 // Verify the Studio project/device ownership before creating files or contacting GitHub.
 await confirmProjectOwner(config,project);
 try{mkdirSync(target,{mode:0o700});}catch(e){if(e.code==='EEXIST')fail('Der Zielordner existiert bereits. Nichts überschrieben.');fail('Zielordner kann lokal nicht angelegt werden. Berechtigungen prüfen.');}
 try{
  await command(['git','-c','core.hooksPath='+path.join(target,'.schmaqq-disabled-hooks'),'-c','core.fsmonitor=false',
   '-c','protocol.file.allow=never','-c','protocol.ext.allow=never','clone','--origin','origin','--branch',base,'--',source.url,target],
   path.dirname(target),{timeout:300000,env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
  const root=realpathSync((await command(['git','rev-parse','--show-toplevel'],target,{timeout:20000})).trim());
  if(norm(root)!==norm(realpathSync(target)))fail('Clone-Stammordner stimmt nicht mit der Freigabe überein.');
  const origin=(await command(['git','config','--local','--get','remote.origin.url'],target,{timeout:20000})).trim();
  const actual=githubRepository(origin);
  if(actual.owner.toLowerCase()!==source.owner.toLowerCase()||actual.repository.toLowerCase()!==source.repository.toLowerCase())fail('GitHub-Origin weicht vom ausgewählten Repository ab.');
 }catch(error){
  const message=String(error);
  if(/not reachable|resolve host|network is unreachable|failed to connect|connection timed out|timed out/i.test(message))fail('GitHub-Netzwerk nicht erreichbar. Offline-Verbindung prüfen. Der angelegte Zielordner bleibt zur Kontrolle erhalten.');
  if(/authentication|permission denied|could not read username|repository not found|publickey|terminal prompts disabled/i.test(message))fail('GitHub-Zugriff fehlt. Bitte Git Credential Manager bzw. GitHub-Browseranmeldung oder deinen eigenen SSH-Schlüssel lokal einrichten. Zielordner prüfen; nichts überschrieben.');
  fail('Sicherer GitHub-Import fehlgeschlagen. Git-Version, Zugangsrechte und Branch prüfen. Der angelegte Zielordner bleibt erhalten; keine vorhandenen Projekte verändert.');
 }
 return target;
}
