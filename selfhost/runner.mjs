import { spawn } from 'node:child_process';
import { mkdirSync,readFileSync,readdirSync,lstatSync,existsSync,realpathSync,appendFileSync,rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {aiCapabilities,runLocalAi} from './local-ai.mjs';
import {command} from './process.mjs';
import {launcherCommand,launcherServe,launcherPrograms} from './job-client.mjs';
import {projectDirectory,findPrograms,requiredPrograms,outputDirectories,outputDirectoryOf,outputFolderMessage,gitAddMessage} from './project-plan.mjs';
import {allowedFile,readSource,readSourceSection,saveSource,createSource} from './files.mjs';
import {runCodex} from './codex-run.mjs';
import {sourceRevision,stableSource} from './source-revision.mjs';
import {managedProjects,connectManagedProject,applyProjectSettings} from './managed-projects.mjs';
import {githubRepository} from './github-import.mjs';
export {command} from './process.mjs';
/** Git access with a GitHub App token on the server worker. The token reaches only the runner's own
 * Git commands through the environment (not argv, not repository config, never project code), and
 * SSH remotes from earlier deploy-key setups are rewritten to HTTPS for that command. */
export function githubGitEnv(github,kind){
 if(!github||kind!=='server')return undefined;
 if(typeof github.token!=='string'||!/^[\w.-]{20,4096}$/.test(github.token))throw new Error('GitHub-Zugang für diesen Auftrag ungültig.');
 const header='AUTHORIZATION: basic '+Buffer.from('x-access-token:'+github.token).toString('base64');
 // Entries are appended, so Git settings already given through the environment stay in effect.
 const start=/^\d{1,3}$/.test(process.env.GIT_CONFIG_COUNT??'')?Number(process.env.GIT_CONFIG_COUNT):0;
 return {...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:String(start+2),
  [`GIT_CONFIG_KEY_${start}`]:'http.https://github.com/.extraheader',[`GIT_CONFIG_VALUE_${start}`]:header,
  [`GIT_CONFIG_KEY_${start+1}`]:'url.https://github.com/.insteadOf',[`GIT_CONFIG_VALUE_${start+1}`]:'git@github.com:'};
}
export class LocalRunner{
 constructor(config){
  this.config=config;this.state=path.resolve(config.stateDir??'.studio-runner');mkdirSync(this.state,{recursive:true});mkdirSync(path.join(this.state,'no-hooks'),{recursive:true});this.previews=new Map();
  this.config.projects=applyProjectSettings(this.state,{...managedProjects(this.state),...this.config.projects});
 }
 async git(repo,...args){return this.execute(['git','-c',`core.hooksPath=${path.join(this.state,'no-hooks')}`,...args],repo,this.gitEnv?{env:this.gitEnv}:{});}
 project(id){const project=this.config.projects?.[id];if(!project?.repo)throw new Error('Dieses Projekt ist auf diesem PC nicht freigegeben.');if(!/^[\w./-]+$/.test(project.base??'main')||(project.base??'main').startsWith('-'))throw new Error('Ungültiger Basiszweig.');return {...project,repo:realpathSync(project.repo),base:project.base??'main'};}
 worktree(job,p){const key=job.action==='prepare'||job.action==='integrate'?job.id:job.payload.worktree;if(!/^[\w-]{1,100}$/.test(key??''))throw new Error('Ungültige Arbeitskopie.');const dir=path.join(this.state,'worktrees',`${job.project}-${key}`);const branch=p.requireIssue?`codex/${job.payload.issue}-studio-${key}`:`studio/${key}`;if(p.requireIssue&&(!Number.isSafeInteger(job.payload.issue)||job.payload.issue<1))throw new Error('Für dieses Repository zuerst die Nummer des begrenzten GitHub-Issues angeben.');return {key,dir,branch};}
 async execute(argv,cwd,options={}){return command(argv,cwd,{signal:this.control?.signal,onOutput:text=>this.control?.onEvent?.({type:'output',text:text.slice(-4000)}),...options});}
 /** Project code (tests, preview builds). On a server worker with a job launcher it runs
  * as a separate user that sees only this copy; on a personal PC it runs as before. */
 /** Server worker only: per-project GitHub deploy key in the runner's private state
  * (never visible to jobs). Returns the ssh command git uses for that repository. */
 deployKey(project){
  if(!/^[\w-]{1,100}$/.test(project??''))throw new Error('Ungültiges Projekt.');
  return path.join(this.state,'keys',project,'id_ed25519');
 }
 deployKeyCommand(project){
  const key=this.deployKey(project);if(!existsSync(key))return null;
  const worker=path.join(path.dirname(fileURLToPath(import.meta.url)),'deploy','worker');
  // ssh starts ProxyCommand with the login shell, which is nologin for the worker account.
  return `env SHELL=/bin/sh ssh -i ${key} -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=${path.join(worker,'github_known_hosts')} -o HostKeyAlias=github.com -o HostName=ssh.github.com -o Port=443 -o ProxyCommand="${process.execPath} ${path.join(worker,'ssh-connect-proxy.mjs')} %h %p"`;
 }
 async untrusted(argv,cwd,options={}){
  if(!path.isAbsolute(argv[0])&&/[\\/]/.test(argv[0])){
   const relative=argv[0].replaceAll('\\','/').replace(/^(?:\.\/)+/,'');
   if(!projectDirectory(relative))throw new Error('Relatives Programm muss innerhalb der Arbeitskopie liegen.');
   argv=[path.resolve(cwd,relative),...argv.slice(1)];
  }
  // A PC runs project code as its owner; the network mode only applies to the server's job launcher.
  if(!this.config.launcher){const {network:_,...local}=options;return this.execute(argv,cwd,local);}
  return launcherCommand(this.config.launcher,argv,cwd,{signal:this.control?.signal,onOutput:text=>this.control?.onEvent?.({type:'output',text:text.slice(-4000)}),...options});
 }
 async excludeBuildOutput(dir,p){
  const outputs=[...new Set([...(p.generated??[]),...(p.preview?.directory?[p.preview.directory]:[])])];
  if(!outputs.length)return;
  if(!outputs.every(projectDirectory))throw new Error('Vorschau-Ausgabeordner oder generierter Ordner ungültig.');
  const filename=path.resolve(dir,await this.git(dir,'rev-parse','--git-path','info/exclude'));
  mkdirSync(path.dirname(filename),{recursive:true});
  if(lstatSync(path.dirname(filename)).isSymbolicLink()||existsSync(filename)&&(lstatSync(filename).isSymbolicLink()||lstatSync(filename).nlink!==1))throw new Error('Lokale Git-Ausnahmen sind keine reguläre Datei.');
  const existing=existsSync(filename)?readFileSync(filename,'utf8'):'';
  const lines=outputs.map(output=>'/'+output.replace(/[ *?\[\]#!]/g,'\\$&')+'/').filter(line=>!existing.split(/\r?\n/).includes(line));
  if(lines.length)appendFileSync(filename,'\n'+lines.join('\n')+'\n',{mode:0o600});
 }
 async prepareEnvironment(dir,p){
  if(!p.projectPlanVersion)return;
  await this.excludeBuildOutput(dir,p);
  const names=requiredPrograms({...p,prepare:p.prepare??[],requires:p.requires??[]});
  const tools=this.config.launcher?await launcherPrograms(this.config.launcher,names,{signal:this.control?.signal}):findPrograms(names);
  const missing=tools.filter(t=>!t.available).map(t=>t.program);
  if(missing.length)throw new Error('Benötigte Programme fehlen auf diesem Rechner: '+missing.join(', ')+'. Die Umgebung muss gesondert bereitgestellt werden.');
  if(!p.prepare?.length)return;
  const before=await sourceRevision(dir,this.control);
  if(!before.revision)throw new Error('Vorbereitung gestoppt: Der Quellstand ist nicht vollständig prüfbar.');
  for(const argv of p.prepare){
   this.control?.onEvent?.({type:'status',text:'Projektumgebung wird in der Arbeitskopie vorbereitet.'});
   try{await this.untrusted(argv,dir,{timeout:600000});}catch(e){this.control?.signal?.throwIfAborted();throw new Error('Projektvorbereitung fehlgeschlagen. Benötigte Pakete oder erlaubte Downloadquellen prüfen. '+e.message);}
  }
  const after=await sourceRevision(dir,this.control);
  if(!after.revision||before.revision!==after.revision)throw new Error('Die Vorbereitung hat Quelldateien verändert oder nicht deklarierte Dateien erzeugt. Generierte Ordner in der Projektkonfiguration prüfen; vor Tests und Veröffentlichung stoppen.');
 }
 async run(job,control={}){
  this.control=control;this.gitEnv=githubGitEnv(job.github,this.config.kind);control.signal?.throwIfAborted();control.onEvent?.({type:'status',text:'Runner hat den Auftrag übernommen.'});
  if(job.action==='local-ai')return runLocalAi(this.config,job,control.signal);
  if(job.action==='connect-project')return connectManagedProject(this,job);
  if(job.action==='deploy-key'){
   if(this.config.kind!=='server'||!this.config.launcher)throw new Error('Deploy-Keys gibt es nur auf dem Server-Worker. Dein PC nutzt deinen eigenen GitHub-Zugang.');
   const key=this.deployKey(job.project);
   if(!existsSync(key)){mkdirSync(path.dirname(key),{recursive:true,mode:0o700});await this.execute(['ssh-keygen','-q','-t','ed25519','-N','','-C',`schmaqq-worker ${job.project}`,'-f',key],path.dirname(key),{timeout:20000});}
   const publicKey=readFileSync(key+'.pub','utf8').trim();
   if(!/^ssh-ed25519 [A-Za-z0-9+/=]{60,100}( [\w .-]{0,120})?$/.test(publicKey))throw new Error('Öffentlicher Schlüssel unerwartet.');
   return {publicKey};
  }
  const p=this.project(job.project);
  if(job.payload?.expectedRepository){
   const expected=githubRepository(job.payload.expectedRepository),actual=githubRepository(await this.git(p.repo,'remote','get-url','origin'));
   if(expected.owner.toLowerCase()!==actual.owner.toLowerCase()||expected.repository.toLowerCase()!==actual.repository.toLowerCase()||job.payload.expectedBase!==p.base)throw new Error('Deine lokale Arbeitskopie passt nicht zum gemeinsamen Repository oder Zielbranch. Projekteinstellung prüfen.');
  }
  if(job.action==='inspect'){
   const checks=[];
   const probe=async(label,args)=>{try{const value=await command(['git','-c',`core.hooksPath=${path.join(this.state,'no-hooks')}`,...args],p.repo,{signal:control.signal,timeout:20000,...(this.gitEnv?{env:this.gitEnv}:{})});checks.push({label,ok:true});return value;}catch(e){if(control.signal?.aborted)throw e;checks.push({label,ok:false});return '';}};
   await probe('Git-Repository',['rev-parse','--show-toplevel']);
   const remote=await probe('Gemeinsames origin-Repository',['remote','get-url','origin']);
   // No remote URL or command output in shared logs: a configured URL may contain credentials.
   const remoteBranches=await probe('Hauptzweig erreichbar (Lesezugriff)',['ls-remote','--exit-code','origin',`refs/heads/${p.base}`]);
   const author=await probe('Lokale Git-Identität',['var','GIT_AUTHOR_IDENT']);
   // A preview output folder that already holds project files would be excluded from Git
   // and overwritten by the build: creating or saving sources there can never work.
   const outputs=outputDirectories(p);
   if(outputs.length&&remoteBranches){let clash=[];try{clash=(await this.git(p.repo,'ls-tree','-r','--name-only',`origin/${p.base}`,'--',...outputs)).split('\n').filter(f=>outputs.some(d=>f.startsWith(d+'/')));}catch{}
    const folder=clash.length?outputs.find(d=>clash.some(f=>f.startsWith(d+'/'))):null;
    checks.push({label:'Vorschau-Ausgabeordner getrennt von Projektdateien',ok:!clash.length,...(folder?{hint:`Im Ausgabeordner „${folder}/“ liegen bereits Projektdateien (zum Beispiel ${clash[0]}). Studio würde sie beim Bauen überschreiben und neue Dateien dort nicht speichern. In den Projekteinstellungen unter „Vorschau“ einen eigenen Ausgabeordner eintragen.`}:{})});}
   const configured=Array.isArray(p.check)&&p.check.length>0&&p.check.every(x=>typeof x==='string');
   checks.push({label:'Lokaler Testbefehl konfiguriert',ok:configured},{label:'Codex lokal freigegeben',ok:!!p.allowCodex,optional:true});
   return {ready:!!remote&&!!remoteBranches&&!!author&&configured&&checks.filter(c=>!c.optional).every(c=>c.ok),base:p.base,checks,note:'Nur Lesezugriff geprüft. Schreibrechte und Testausführung folgen beim Einreichen.'};
  }
  if(job.action==='integrate'&&p.workflow==='pull-request')throw new Error('Dieses Repository verlangt Pull Request, CI und Review. Direkte Zusammenführung im Runner ist gesperrt.');
  // On the server worker, a GitHub App token for this job means the repository was released to Studio on GitHub;
  // an older local profile without upload permission (deploy-key era) no longer blocks sharing a task branch.
  if(job.action==='submit'&&p.publish===false&&!this.gitEnv)throw new Error('Veröffentlichen ist in diesem lokalen Projektprofil noch gesperrt.');
  // Trial run on the shared main state: the Werkstatt counts as ready only after tests
  // (and the preview build, if configured) passed here once.
  if(job.action==='probe'){
   const key='probe-'+String(job.id).replace(/[^\w-]/g,'').slice(0,80),inner={...job,payload:{...job.payload,worktree:key}};
   const w=this.worktree({...inner,action:'check'},p);mkdirSync(path.dirname(w.dir),{recursive:true});
   await this.git(p.repo,'fetch','origin');await this.git(p.repo,'worktree','add','-b',w.branch,w.dir,`origin/${p.base}`);
   try{
    const checked=await this.run({...inner,action:'check'},control);
    let preview=false;
    if(p.preview?.build&&p.preview?.directory){await this.run({...inner,action:'preview'},control);preview=true;}
    else if(p.preview?.serve)preview=null;
    return {ready:true,checks:checked.checks,preview,base:p.base,commit:await this.git(w.dir,'rev-parse','HEAD')};
   }finally{
    await this.git(p.repo,'worktree','remove','--force',w.dir).catch(()=>{});
    await this.git(p.repo,'branch','-D',w.branch).catch(()=>{});
   }
  }
  const w=this.worktree(job,p);mkdirSync(path.dirname(w.dir),{recursive:true});
  if(job.action==='prepare'){
   await this.git(p.repo,'fetch','origin');await this.git(p.repo,'worktree','add','-b',w.branch,w.dir,`origin/${p.base}`);
   await this.excludeBuildOutput(w.dir,p);
   return {path:w.dir,branch:w.branch,commit:await this.git(w.dir,'rev-parse','HEAD')};
  }
  if(job.action==='integrate'){
   if(!/^[a-f0-9]{40,64}$/.test(job.payload.commit)||!/^studio\/[\w-]+$/.test(job.payload.branch))throw new Error('Ungültiger Prüfstand.');
   await this.git(p.repo,'fetch','origin');const remote=await this.git(p.repo,'rev-parse',`origin/${job.payload.branch}`);if(remote!==job.payload.commit)throw new Error('Der eingereichte Branch wurde inzwischen verändert. Erneut einreichen.');
   await this.git(p.repo,'worktree','add','--detach',w.dir,`origin/${p.base}`);
   try{await this.git(w.dir,'merge','--no-ff','--no-edit',job.payload.commit);}catch(e){await this.git(w.dir,'merge','--abort').catch(()=>{});throw new Error('Zusammenführung gestoppt: Git-Konflikt. Der gemeinsame Hauptzweig bleibt unverändert. '+e.message);}
   const checks=await this.check(w.dir,p);if(await this.git(w.dir,'status','--porcelain'))throw new Error('Tests haben die Integrations-Arbeitskopie verändert. Zusammenführung gestoppt.');const commit=await this.git(w.dir,'rev-parse','HEAD');
   // No force push: concurrent integration is rejected by the remote.
   await this.git(w.dir,'push','origin',`HEAD:refs/heads/${p.base}`);return {commit,checks,integrated:true};
  }
  if(!existsSync(w.dir))throw new Error('Arbeitskopie fehlt auf diesem PC.');
  if(await this.git(w.dir,'rev-parse','--show-toplevel')!==w.dir.replaceAll('\\','/')){
   const actual=realpathSync(await this.git(w.dir,'rev-parse','--show-toplevel'));if(actual!==realpathSync(w.dir))throw new Error('Arbeitskopie zeigt auf ein anderes Repository.');
  }
  if(await this.git(w.dir,'branch','--show-current')!==w.branch)throw new Error('Arbeitszweig wurde außerhalb des Workspace geändert.');
  if(job.action==='create-file'){
   const folder=outputDirectoryOf(String(job.payload.file??''),p);if(folder)throw new Error(outputFolderMessage(job.payload.file,folder));
   const created=createSource(w.dir,job.payload.file,job.payload.content??'');
   try{await this.git(w.dir,'add','--',job.payload.file);}catch(e){rmSync(path.join(w.dir,...job.payload.file.split('/')),{force:true});throw new Error(gitAddMessage(job.payload.file,e.message));}
   control.onEvent?.({type:'files',text:'Datei erstellt: '+job.payload.file});
   return {...created,source:await sourceRevision(w.dir,control)};
  }
  if(['files','read-file','save-file'].includes(job.action)){
   const tracked=(await this.git(w.dir,'ls-files','-z','--')).split('\0').filter(allowedFile);
   if(job.action==='files'){
    // Emit bounded filename-only audit metadata. This event route is owner-scoped;
    // never include file contents or credentials in runner event logs.
    control.onEvent?.({type:'files',text:'Dateiliste: '+tracked.slice(0,2000).join(', ').slice(0,3500)});
    return {files:tracked.slice(0,2000),truncated:tracked.length>2000};
   }
   if(!tracked.includes(job.payload.file))throw new Error('Nur bereits in Git erfasste Dateien können geöffnet werden.');
   if(job.action==='read-file'){
    const result=job.payload.offset===undefined?readSource(w.dir,job.payload.file):readSourceSection(w.dir,job.payload.file,job.payload.offset,job.payload.revision);
    control.onEvent?.({type:'files',text:'Datei geöffnet: '+job.payload.file});
    return result;
   }
   const saved=saveSource(w.dir,job.payload.file,job.payload.revision,job.payload.content),source=await sourceRevision(w.dir,control);
   control.onEvent?.({type:'files',text:'Datei gespeichert: '+job.payload.file});
   return {...saved,source};
  }
  if(job.action==='status')return {branch:w.branch,status:await this.git(w.dir,'status','--short'),diff:(await this.git(w.dir,'diff','HEAD','--')).slice(0,50000),commit:await this.git(w.dir,'rev-parse','HEAD'),source:await sourceRevision(w.dir,control)};
  if(['check','review','submit','preview'].includes(job.action))await this.excludeBuildOutput(w.dir,p);
  if(job.action==='check'){const before=await sourceRevision(w.dir,control),checks=await this.check(w.dir,p);return {checks,commit:await this.git(w.dir,'rev-parse','HEAD'),source:stableSource(before,await sourceRevision(w.dir,control))};}
  if(['review','submit'].includes(job.action)){
   await this.git(w.dir,'fetch','origin');
   await this.git(w.dir,'add','--all');
   const staged=await this.git(w.dir,'diff','--cached','--name-only');if(staged)await this.git(w.dir,'commit','-m','Schmaqq Studio: Änderungen zur Prüfung');
   // Nothing to review: stop before tests and upload instead of sharing an empty version.
   if(!await this.git(w.dir,'diff','--name-only',await this.git(w.dir,'merge-base','HEAD',`origin/${p.base}`),'HEAD','--'))throw new Error('Es gibt noch keine Änderung gegenüber dem gemeinsamen Stand. Ändere und speichere zuerst etwas, dann gib es zur Prüfung.');
   const before=await sourceRevision(w.dir,control),checks=await this.check(w.dir,p);if(await this.git(w.dir,'status','--porcelain'))throw new Error('Arbeitskopie hat sich während der Prüfung verändert. Bitte erneut prüfen und einreichen.');
   const commit=await this.git(w.dir,'rev-parse','HEAD'),base=await this.git(w.dir,'merge-base','HEAD',`origin/${p.base}`);
   const diff=await this.git(w.dir,'diff','--no-ext-diff','--no-textconv','--no-color',base,commit,'--');
   const result={checks,workflow:p.workflow??'direct',branch:w.branch,commit,base,diff:diff.slice(0,50000),diffTruncated:diff.length>=50000,published:job.action==='submit',source:stableSource(before,await sourceRevision(w.dir,control))};
   if(p.preview?.build&&p.preview?.directory){
    const preview=await this.run({...job,action:'preview'},control);
    if(await this.git(w.dir,'status','--porcelain'))throw new Error('Der Vorschau-Build hat Quelldateien verändert. Erneut testen und einreichen.');
    result.previewBundle=preview.previewBundle;result.source=stableSource(before,await sourceRevision(w.dir,control));
   }
   if(job.action==='submit')await this.git(w.dir,'push','--set-upstream','origin',`HEAD:refs/heads/${w.branch}`);
   return result;
  }
  if(job.action==='preview'){
   await this.prepareEnvironment(w.dir,p);
   // Server worker: a full-stack preview (app with backend) runs isolated as a live job.
   if(this.config.launcher&&p.preview?.serve){
    const {argv,port}=p.preview.serve;
    if(!Array.isArray(argv)||!argv.length||!Number.isInteger(port))throw new Error('Live-Vorschau ist nicht vollständig eingerichtet.');
    const before=await sourceRevision(w.dir,control);
    const live=await launcherServe(this.config.launcher,argv,w.dir,{port,ttlSeconds:p.preview.serve.ttlSeconds??1800});
    return {live:{port:live.port,expires:live.expires},source:stableSource(before,await sourceRevision(w.dir,control))};
   }
   if(p.preview?.build&&p.preview?.directory){
    await this.excludeBuildOutput(w.dir,p);
    const before=await sourceRevision(w.dir,control);await this.untrusted(p.preview.build,w.dir,{network:'private'});const output=path.resolve(w.dir,p.preview.directory);if(!existsSync(output))throw new Error(`Die Vorschau wurde gebaut, aber der Ausgabeordner „${p.preview.directory}/“ fehlt. Prüfe, ob der Build-Befehl dorthin schreibt und ob in den Projekteinstellungen der richtige Ausgabeordner eingetragen ist.`);const real=realpathSync(output),workspace=realpathSync(w.dir);
    if(!real.startsWith(workspace+path.sep)||real===workspace)throw new Error('Vorschau-Ausgabe muss innerhalb der Arbeitskopie liegen.');
    const files={};let bytes=0,count=0;
    function collect(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,item.name);if(lstatSync(full).isSymbolicLink())throw new Error('Symlinks sind in Vorschauen nicht erlaubt.');if(item.isDirectory())collect(full);else{const data=readFileSync(full);bytes+=data.length;if(bytes>5000000||++count>500)throw new Error('Vorschau überschreitet 5 MB oder 500 Dateien.');files[path.relative(real,full).split(path.sep).join('/')]=data.toString('base64');}}}
    collect(real);if(!files['index.html'])throw new Error(`Die Vorschau wurde gebaut, aber im Ausgabeordner „${p.preview.directory}/“ liegt keine index.html. Prüfe, ob der Build-Befehl dorthin schreibt und ob in den Projekteinstellungen der richtige Ausgabeordner eingetragen ist.`);return {previewBundle:files,source:stableSource(before,await sourceRevision(w.dir,control))};
   }
   if(!p.preview?.argv||!p.preview?.url)throw new Error('Vorschau auf diesem PC noch nicht konfiguriert.');
   // A long-running preview server would execute project code outside the job launcher.
   if(this.config.launcher)throw new Error('Auf dem Server-Worker ist nur eine gebaute Vorschau erlaubt.');const u=new URL(p.preview.url);if(!['http:','https:'].includes(u.protocol))throw new Error('Ungültige Vorschau-Adresse.');
   const existing=this.previews.get(w.key);if(existing?.exitCode===null)return {url:p.preview.url,scope:'runner',alreadyRunning:true};
   try{const response=await fetch(p.preview.url,{signal:AbortSignal.timeout(1000)});if(response)throw new Error('An der Vorschau-Adresse läuft bereits ein anderer Prozess.');}catch(e){if(e.message.includes('anderer Prozess'))throw e;}
   let output='';const child=spawn(p.preview.argv[0],p.preview.argv.slice(1),{cwd:w.dir,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>output=(output+b).slice(-10000));child.stderr.on('data',b=>output=(output+b).slice(-10000));let failure;child.on('error',e=>{failure=e;});this.previews.set(w.key,child);
   for(let i=0;i<30;i++){if(failure||child.exitCode!==null)throw new Error('Vorschau konnte nicht starten. '+(failure?.message??output));try{const r=await fetch(p.preview.url,{signal:AbortSignal.timeout(1000)});if(r.ok)return {url:p.preview.url,scope:'runner',output};}catch{}await new Promise(r=>setTimeout(r,500));}
   child.kill();throw new Error('Vorschau innerhalb des Zeitlimits nicht erreichbar. '+output);
  }
  if(job.action==='codex'){
   if(!p.allowCodex)throw new Error('Codex für dieses lokale Projekt noch nicht freigegeben.');
   const result=await runCodex({executable:this.config.codex??'codex',cwd:w.dir,prompt:job.payload.prompt,sessionFile:path.join(this.state,`codex-${job.project}-${w.key}.session`),signal:control.signal,onEvent:control.onEvent});
   return {...result,branch:w.branch,status:await this.git(w.dir,'status','--short')};
  }
  throw new Error('Unbekannter Auftrag.');
 }
 async check(dir,p){if(!p.check?.length)throw new Error('Vor Einreichung muss ein lokaler Testbefehl konfiguriert werden.');await this.prepareEnvironment(dir,p);return this.untrusted(p.check,dir,{timeout:600000,network:'private'});}
 close(){for(const child of this.previews.values())child.kill();}
}

export async function startRunner(config){
 const runner=new LocalRunner(config),server=new URL(config.server);if(server.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(server.hostname))throw new Error('Runner-Verbindung benötigt HTTPS.');
 if(!config.token)throw new Error('Gerätetoken fehlt in der lokalen Konfiguration.');let stopped=false,current,lastCapabilities=0;
 async function request(route,value){const response=await fetch(new URL(route,server),{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${config.token}`},body:JSON.stringify(value),signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw new Error(result.error??'Runner-Verbindung fehlgeschlagen.');return result;}
 const stop=()=>{stopped=true;current?.abort();runner.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 console.log('Schmaqq Runner verbunden. Freigegebene Projekte: '+Object.keys(config.projects??{}).join(', '));
 while(!stopped){try{
  if(Date.now()-lastCapabilities>30000){await request('/api/runner/capabilities',await aiCapabilities(config));lastCapabilities=Date.now();}
  const {job}=await request('/api/runner/poll',{});if(job){
   current=new AbortController();const controller=current;let events=[],sequence=0,syncing=false,failures=0;
   const flush=async()=>{
    if(syncing)return;syncing=true;const batch=events.slice(0,40);
    try{if(Date.now()-lastCapabilities>30000){await request('/api/runner/capabilities',await aiCapabilities(config));lastCapabilities=Date.now();}const reply=await request('/api/runner/report',{id:job.id,lease:job.lease,heartbeat:true,events:batch});events.splice(0,batch.length);failures=0;if(reply.cancel)controller.abort();}
    catch(e){if(++failures>=3)controller.abort();console.error(e.message);}
    finally{syncing=false;}
   };
   const timer=setInterval(flush,1000),onEvent=event=>{events.push({...event,seq:++sequence});if(events.length>400)events.splice(0,events.length-400);};
   try{const result=await runner.run(job,{signal:controller.signal,onEvent});if(job.action==='connect-project')lastCapabilities=0;clearInterval(timer);while(syncing)await new Promise(r=>setTimeout(r,20));while(events.length){await flush();if(failures)break;}await request('/api/runner/report',{id:job.id,lease:job.lease,ok:true,result});}
   catch(e){await request('/api/runner/report',{id:job.id,lease:job.lease,ok:false,result:{error:e.message}}).catch(()=>{});}
   finally{clearInterval(timer);current=null;}
  }
 }catch(e){console.error(e.message);}await new Promise(r=>setTimeout(r,3000));}
}
// Compare real paths: started through a symlinked release directory (server
// worker: .../current/selfhost/runner.mjs) Node reports the resolved module URL.
if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(path.resolve(process.argv[1]))===realpathSync(fileURLToPath(import.meta.url))){
 const file=process.argv[2];if(!file)throw new Error('Aufruf: node selfhost/runner.mjs PFAD_ZUR_LOKALEN_KONFIGURATION');const config=JSON.parse(readFileSync(file,'utf8'));await startRunner(config);
}
