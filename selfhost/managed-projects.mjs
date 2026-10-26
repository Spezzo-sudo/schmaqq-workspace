import {existsSync,lstatSync,mkdirSync,readFileSync,realpathSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {githubRepository} from './github-import.mjs';

export function managedProjects(state){
 const file=path.join(state,'connected-projects.private.json');if(!existsSync(file))return {};
 const info=lstatSync(file);if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size>128000)throw Error('Persönliche Projektfreigaben sind keine reguläre Konfigurationsdatei.');
 const data=JSON.parse(readFileSync(file,'utf8')),root=realpathSync(state)+path.sep;
 if(!data||Array.isArray(data)||typeof data!=='object')throw Error('Persönliche Projektfreigaben ungültig.');
 for(const [id,p] of Object.entries(data))if(!/^[\w-]{1,100}$/.test(id)||!p||typeof p.repo!=='string'||!realpathSync(p.repo).startsWith(root))throw Error('Projektfreigabe zeigt außerhalb des persönlichen Runnerbereichs.');
 return data;
}
export async function connectManagedProject(runner,job){
 const p=job.payload,source=githubRepository(p.repository),managed=managedProjects(runner.state);
 if(!/^[\w-]{1,100}$/.test(job.project)||!/^[\w./-]{1,100}$/.test(p.base??'')||p.base.startsWith('-')||p.base.includes('..'))throw Error('Projekt oder Zielbranch ungültig.');
 if(!Array.isArray(p.check)||!p.check.length||!p.check.every(s=>typeof s==='string'&&s.length>0&&s.length<=4096))throw Error('Ein gültiger Testbefehl ist erforderlich.');
 if(p.preview&&(!Array.isArray(p.preview.build)||!p.preview.build.length||!p.preview.build.every(s=>typeof s==='string'&&s.length>0&&s.length<=4096)||typeof p.preview.directory!=='string'||p.preview.directory.split(/[\\/]/).some(s=>!s||s==='.'||s==='..')||path.isAbsolute(p.preview.directory)))throw Error('Vorschau-Konfiguration ungültig.');
 if(runner.config.projects?.[job.project]&&!managed[job.project])throw Error('Dieses Projekt wurde bereits lokal eingerichtet. Vorhandene persönliche Freigaben werden nicht überschrieben.');
 const projects=path.join(runner.state,'projects');mkdirSync(projects,{recursive:true});if(lstatSync(projects).isSymbolicLink())throw Error('Der persönliche Projektordner darf keine Verknüpfung sein.');
 const target=path.join(projects,job.project);
 if(managed[job.project]){
  const remote=githubRepository((await runner.git(managed[job.project].repo,'remote','get-url','origin')).trim());
  if(remote.owner.toLowerCase()!==source.owner.toLowerCase()||remote.repository.toLowerCase()!==source.repository.toLowerCase())throw Error('Vorhandene Arbeitskopie gehört zu einem anderen Repository.');
 }else{
  if(existsSync(target))throw Error('Ein Projektordner ist bereits vorhanden. Nichts überschrieben; den lokalen Stand vor einem erneuten Versuch prüfen.');
  await runner.git(runner.state,'clone','--origin','origin','--branch',p.base,'--',source.url,target);
 }
 const config={repo:realpathSync(target),base:p.base,check:p.check,publish:p.publish===true,allowCodex:p.allowCodex===true,workflow:p.workflow==='direct'?'direct':'pull-request',...(p.preview?{preview:p.preview}:{})};
 const updated={...managed,[job.project]:config},temporary=path.join(runner.state,randomUUID()+'.private.json');
 writeFileSync(temporary,JSON.stringify(updated,null,2),{flag:'wx',mode:0o600});renameSync(temporary,path.join(runner.state,'connected-projects.private.json'));
 runner.config.projects={...runner.config.projects,[job.project]:config};
 return {configured:true,project:job.project,base:p.base,publish:config.publish,allowCodex:config.allowCodex};
}
