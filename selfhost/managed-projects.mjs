import {existsSync,lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {githubRepository} from './github-import.mjs';
import {proposeProjectPlan,requiredPrograms,findPrograms} from './project-plan.mjs';
import {launcherPrograms} from './job-client.mjs';

export function managedProjects(state){
 const file=path.join(state,'connected-projects.private.json');if(!existsSync(file))return {};
 const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size>128000)throw Error('Persönliche Projektfreigaben sind keine reguläre Konfigurationsdatei.');
 const data=JSON.parse(readFileSync(file,'utf8')),root=realpathSync(state)+path.sep;
 if(!data||Array.isArray(data)||typeof data!=='object')throw Error('Persönliche Projektfreigaben ungültig.');
 for(const [id,p] of Object.entries(data))if(!/^[\w-]{1,100}$/.test(id)||!p||typeof p.repo!=='string'||!realpathSync(p.repo).startsWith(root))throw Error('Projektfreigabe zeigt außerhalb des persönlichen Runnerbereichs.');
 return data;
}
export async function connectManagedProject(runner,job){
 let p={...job.payload};const source=githubRepository(p.repository),managed=managedProjects(runner.state);
 if(!/^[\w-]{1,100}$/.test(job.project)||!/^[\w./-]{1,100}$/.test(p.base??'')||p.base.startsWith('-')||p.base.includes('..'))throw Error('Projekt oder Zielbranch ungültig.');
 if(p.automatic===true||p.mode)p.check=['node','--test'];
 if(!Array.isArray(p.check)||!p.check.length||!p.check.every(s=>typeof s==='string'&&s.length>0&&s.length<=4096))throw Error('Ein gültiger Testbefehl ist erforderlich.');
 if(p.preview&&(!Array.isArray(p.preview.build)||!p.preview.build.length||!p.preview.build.every(s=>typeof s==='string'&&s.length>0&&s.length<=4096)||typeof p.preview.directory!=='string'||p.preview.directory.split(/[\\/]/).some(s=>!s||s==='.'||s==='..')||path.isAbsolute(p.preview.directory)))throw Error('Vorschau-Konfiguration ungültig.');
 // Live preview (server worker): app command and port; it runs isolated like a job.
 if(p.serve&&(!Array.isArray(p.serve.argv)||!p.serve.argv.length||p.serve.argv.length>30||!p.serve.argv.every(s=>typeof s==='string'&&s.length>0&&s.length<=4096)||!Number.isInteger(p.serve.port)||p.serve.port<1024||p.serve.port>65535))throw Error('Live-Vorschau-Konfiguration ungültig.');
 const existing=runner.config.projects?.[job.project];
 const projects=path.join(runner.state,'projects');mkdirSync(projects,{recursive:true});if(lstatSync(projects).isSymbolicLink())throw Error('Der persönliche Projektordner darf keine Verknüpfung sein.');
 const target=existing?.repo??path.join(projects,job.project);
 if(existing){
  const remote=githubRepository((await runner.git(existing.repo,'remote','get-url','origin')).trim());
  if(remote.owner.toLowerCase()!==source.owner.toLowerCase()||remote.repository.toLowerCase()!==source.repository.toLowerCase())throw Error('Vorhandene Arbeitskopie gehört zu einem anderen Repository.');
 }else{
  if(existsSync(target))throw Error('Ein Projektordner ist bereits vorhanden. Nichts überschrieben; den lokalen Stand vor einem erneuten Versuch prüfen.');
  // Server worker with a deploy key: SSH through the egress proxy; the repository keeps that command.
  const ssh=runner.deployKeyCommand?.(job.project);
  try{
   if(ssh){
    const url=`git@github.com:${source.owner}/${source.repository}`;
    await runner.git(runner.state,'-c',`core.sshCommand=${ssh}`,'clone','--origin','origin','--branch',p.base,'--',url,target);
    await runner.git(target,'config','core.sshCommand',ssh);
   }else await runner.git(runner.state,'clone','--origin','origin','--branch',p.base,'--',source.url,target);
  }catch(e){
   if(ssh&&/Permission denied \(publickey\)|Repository not found|access rights/i.test(e.message))throw Error('GitHub hat den Schlüssel des Server-Workers nicht angenommen. Ist er im Repository unter Settings → Deploy keys eingetragen?');
   throw e;
  }
  // Retain a successful clone if metadata detection fails, so the UI can retry
  // with advanced settings. No commands/model/publish permission are granted yet.
  const pending={repo:realpathSync(target),base:p.base,check:[],publish:false,allowCodex:false,workflow:'pull-request'};
  const temporary=path.join(runner.state,randomUUID()+'.private.json');
  writeFileSync(temporary,JSON.stringify({...managed,[job.project]:pending}),{flag:'wx',mode:0o600});renameSync(temporary,path.join(runner.state,'connected-projects.private.json'));
  runner.config.projects={...runner.config.projects,[job.project]:pending};
 }
 let confirmed;
 if(p.mode){
  if(!['plan','apply'].includes(p.mode))throw Error('Unbekannter Einrichtungsschritt.');
  const head=await runner.git(target,'rev-parse','HEAD');
  const plan=proposeProjectPlan(target,{configuration:p.configuration,serve:p.serve,head});
  if(plan.configuration){
   const names=requiredPrograms(plan.configuration);
   plan.tools=runner.config.launcher?await launcherPrograms(runner.config.launcher,names,{signal:runner.control?.signal}):findPrograms(names);
   if(plan.tools.some(t=>!t.available)){
    plan.state='missing_tools';
    plan.notes.push('Auf diesem Rechner fehlen benötigte Programme. Die Einrichtung installiert keine Systemsoftware. Einen passenden Rechner wählen oder die Umgebung gesondert bereitstellen lassen.');
   }
   if(plan.configuration.preview?.serve&&(!runner.config.launcher||runner.config.kind!=='server')){
    plan.state='needs_configuration';plan.notes.push('Diese Live-Vorschau benötigt einen Server-Worker mit isoliertem Job-Starter.');
   }
  }
  if(p.mode==='plan')return {setupPlan:plan};
  if(!p.expectedPlan||p.expectedPlan!==plan.revision)throw Error('Der Projektstand oder die Konfiguration hat sich geändert. Projekt erneut prüfen und den neuen Vorschlag bestätigen.');
  if(plan.state!=='proposed')throw Error('Die Einrichtung ist noch nicht vollständig: '+plan.notes.join(' '));
  confirmed=plan.configuration;
  p={...p,...confirmed};
 }else if(p.automatic===true){
  // With a live preview, an unknown static build output is no reason to stop.
  const detected=detectProject(target,{staticPreviewOptional:!!p.serve});p={...p,...detected};
 }
 const preview=p.preview||p.serve?{...(p.preview??{}),...(p.serve?{serve:{argv:p.serve.argv,port:p.serve.port}}:{})}:undefined;
 const config={...existing,preview:undefined,prepare:[],requires:[],generated:[],projectPlanVersion:undefined,repo:realpathSync(target),base:p.base,check:p.check,publish:p.publish===true,allowCodex:p.allowCodex===true,workflow:p.workflow==='direct'?'direct':'pull-request',...(preview?{preview}:{}),...(confirmed?{prepare:confirmed.prepare,requires:confirmed.requires,generated:confirmed.generated,projectPlanVersion:1}:{})};
 if(existing&&!managed[job.project]){
  saveProjectSettings(runner.state,job.project,config);
  runner.config.projects={...runner.config.projects,[job.project]:config};
  return {configured:true,project:job.project,base:p.base,publish:config.publish,allowCodex:config.allowCodex,check:config.check,preview:!!config.preview};
 }
 const updated={...managed,[job.project]:config},temporary=path.join(runner.state,randomUUID()+'.private.json');
 writeFileSync(temporary,JSON.stringify(updated,null,2),{flag:'wx',mode:0o600});renameSync(temporary,path.join(runner.state,'connected-projects.private.json'));
 runner.config.projects={...runner.config.projects,[job.project]:config};
 return {configured:true,project:job.project,base:p.base,publish:config.publish,allowCodex:config.allowCodex};
}

// Versioned project data, separate from registration credentials and runner software.
function settingsFile(state){return path.join(state,'project-settings.private.json');}
function readSettings(state){
 const file=settingsFile(state);if(!existsSync(file))return {version:1,projects:{}};
 const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size>128000)throw Error('Projekteinstellungen sind keine reguläre Datei.');
 const data=JSON.parse(readFileSync(file,'utf8'));if(data.version!==1||!data.projects||Array.isArray(data.projects))throw Error('Version der Projekteinstellungen wird nicht unterstützt.');return data;
}
function saveProjectSettings(state,id,config){
 const data=readSettings(state);data.projects[id]={...config};
 const temp=path.join(state,randomUUID()+'.private.json');writeFileSync(temp,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});renameSync(temp,settingsFile(state));
}
export function applyProjectSettings(state,projects){
 const result={...projects};for(const [id,saved] of Object.entries(readSettings(state).projects)){
  const current=projects[id];if(!current||realpathSync(current.repo)!==realpathSync(saved.repo))throw Error('Gespeicherte Einstellungen passen nicht zur lokalen Projektfreigabe.');
  result[id]={...current,...saved,repo:current.repo};
 }return result;
}
export function detectProject(repo,{staticPreviewOptional=false}={}){
 const file=path.join(repo,'package.json');
 if(!existsSync(file))throw Error('Dieses Projekt wird noch nicht automatisch erkannt. Unter erweiterten Einstellungen Tests und Vorschau angeben.');
 const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.size>128000)throw Error('Projektbeschreibung ist keine reguläre Datei.');
 const scripts=JSON.parse(readFileSync(file,'utf8')).scripts??{};
 if(typeof scripts.test!=='string'||!scripts.test.trim())throw Error('Kein Testablauf im Projekt gefunden. Erweiterte Einstellungen verwenden.');
 const check=scripts.test.trim()==='node --test'?['node','--test']:['npm','test'];
 const build=scripts.build?.trim();
 // Only known static output conventions; never guess Next/server build output.
 let preview;
 if(build==='node scripts/build.mjs')preview={build:['node','scripts/build.mjs'],directory:'dist'};
 else if(build==='vite build')preview={build:['npm','run','build'],directory:'dist'};
 else if(build&&!staticPreviewOptional)throw Error('Vorschau-Ausgabe dieses Projekts noch nicht automatisch erkannt. Erweiterte Einstellungen verwenden.');
 return {check,...(preview?{preview}:{})};
}
