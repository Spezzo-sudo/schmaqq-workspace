import {existsSync,lstatSync,readFileSync,realpathSync,accessSync,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';

export const PLAN_FILE='studio.project.json';
const fail=message=>{throw new Error(message);};
const command=value=>Array.isArray(value)&&value.length>0&&value.length<=30&&value.every(s=>typeof s==='string'&&s.length>0&&s.length<=4096&&!s.includes('\0'));
const program=value=>typeof value==='string'&&/^[\w.+-]{1,100}$/.test(value)&&!value.startsWith('-');
export function projectDirectory(value){
 return typeof value==='string'&&value.length<=240&&!path.isAbsolute(value)&&!/[\\:\x00-\x1f]/.test(value)&&value.split('/').every(p=>p&&p!=='.'&&p!=='..'&&p.toLowerCase()!=='.git');
}
// Folders Studio treats as build output: the preview output and declared generated
// folders. They are excluded from Git per work copy, so sources must not live there.
export function outputDirectories(p){
 return [...new Set([...(p?.preview?.directory?[p.preview.directory]:[]),...(p?.generated??[])])].map(d=>d.replace(/\/+$/,'')).filter(Boolean);
}
export function outputDirectoryOf(file,p){
 return outputDirectories(p).find(d=>file===d||file.startsWith(d+'/'))??null;
}
export function outputFolderMessage(file,folder){
 return `„${file}“ liegt im Ordner „${folder}/“. Diesen Ordner erzeugt Studio beim Bauen der Vorschau jedes Mal neu, deshalb kann dort keine Datei angelegt werden. Lege die Datei in einem anderen Ordner an oder bitte die Projektleitung, in den Projekteinstellungen unter „Vorschau“ einen eigenen Ausgabeordner einzutragen (zum Beispiel „dist“).`;
}
// Git's own text is English and names commands the person cannot run in Studio.
export function gitAddMessage(file,message=''){
 if(/ignored by one of your \.gitignore files/i.test(message))return `„${file}“ wird in diesem Projekt absichtlich nicht gespeichert: Der Pfad steht in einer Ausschlussliste (.gitignore). Die Datei wurde nicht angelegt. Wähle einen anderen Ordner oder bitte die Projektleitung, die Ausschlussregel im Repository anzupassen.`;
 return `„${file}“ konnte nicht zum Projekt hinzugefügt werden und wurde nicht angelegt. Versuche es erneut; wenn es wieder scheitert, gib der Projektleitung diese technische Meldung weiter: ${String(message).split('\n')[0].slice(0,300)}`;
}
export function validateProjectPlan(value){
 if(!value||Array.isArray(value)||value.version!==1)fail('Die Projektkonfiguration benötigt version: 1.');
 const allowed=['version','prepare','check','preview','requires','generated'];
 if(Object.keys(value).some(k=>!allowed.includes(k)))fail('Unbekannte Angabe in der Projektkonfiguration. Erlaubt: '+allowed.join(', '));
 if(!command(value.check))fail('Die Projektkonfiguration benötigt einen Testbefehl als Argumentliste.');
 const prepare=value.prepare??[],requires=value.requires??[],generated=value.generated??[];
 if(!Array.isArray(prepare)||prepare.length>8||!prepare.every(command))fail('Vorbereitung: höchstens acht Befehle als Argumentlisten angeben.');
 if(!Array.isArray(requires)||requires.length>20||!requires.every(program))fail('Erforderliche Programme als einfache Programmnamen angeben.');
 if(!Array.isArray(generated)||generated.length>12||!generated.every(projectDirectory))fail('Generierte Ordner müssen relativ innerhalb der Arbeitskopie liegen.');
 let preview;
 if(value.preview){
  const p=value.preview;
  if(p.serve){
   if(Object.keys(p).some(k=>k!=='serve')||Object.keys(p.serve).some(k=>!['argv','port'].includes(k))||!command(p.serve.argv)||!Number.isInteger(p.serve.port)||p.serve.port<1024||p.serve.port>65535)fail('Live-Vorschau benötigt eine Argumentliste und einen Port von 1024 bis 65535.');
   preview={serve:{argv:p.serve.argv,port:p.serve.port}};
  }else{
   if(Object.keys(p).some(k=>!['build','directory'].includes(k))||!command(p.build)||!projectDirectory(p.directory))fail('Statische Vorschau benötigt Build-Befehl und einen relativen Ausgabeordner.');
   preview={build:p.build,directory:p.directory};
  }
 }
 return {version:1,prepare,check:value.check,requires:[...new Set(requires)],generated:[...new Set(generated)],...(preview?{preview}:{})};
}

// Read only bounded regular root files; never follow repository links or execute
// a build system while identifying it. The bytes also bind approval to this plan.
function metadata(repo){
 const result={};
 for(const name of [PLAN_FILE,'package.json','package-lock.json','npm-shrinkwrap.json','Makefile','pyproject.toml','requirements.txt','requirements-build.txt']){
  const file=path.join(repo,name);let info;try{info=lstatSync(file);}catch(e){if(e.code==='ENOENT')continue;throw e;}
  if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size>2000000)fail('Projektdatei '+name+' ist keine unterstützte reguläre Datei (maximal 2 MB).');
  const root=realpathSync(repo);if(!realpathSync(file).startsWith(root+path.sep))fail('Projektdatei liegt außerhalb des Repositorys.');
  result[name]=readFileSync(file,'utf8');
 }
 return result;
}
function makePlan(text){
 const targets=new Set([...text.matchAll(/^([\w.-]+)\s*:(?!=)/gm)].map(m=>m[1]));
 const target=['build-check','test','check'].find(s=>targets.has(s));if(!target)return null;
 const prepare=targets.has('build-bootstrap')?[['make','build-bootstrap']]:[];
 // Only a literal relative output of the build target is a useful suggestion.
 // It is shown for confirmation, never treated as an instruction to run now.
 const block=/^build\s*:(?!=)[^\n]*\n((?:[\t ].*\n|\s*\n)*)/m.exec(text)?.[1]??'';
 const output=/--output\s+["']?\$\(CURDIR\)\/([\w./-]+)/.exec(block)?.[1];
 const preview=targets.has('build')&&projectDirectory(output)?{build:['make','build'],directory:output}:undefined;
 return {version:1,prepare,check:['make',target],requires:['make',...(/\bpython3\b/.test(text)?['python3']:[])],generated:prepare.length?['.venv-build']:[],...(preview?{preview}:{})};
}
export function proposeProjectPlan(repo,{configuration,serve,head=''}={}){
 const files=metadata(repo),notes=[];let config=null,source='unknown',label='Projekt noch nicht erkannt';
 if(configuration){config=validateProjectPlan(configuration);source='manual';label='Eigene Projektkonfiguration';}
 else if(files[PLAN_FILE]){try{config=validateProjectPlan(JSON.parse(files[PLAN_FILE]));}catch(e){fail(PLAN_FILE+': '+e.message);}source=PLAN_FILE;label='Projektkonfiguration aus dem Repository';}
 else if(files['package.json']){
  let pkg;try{pkg=JSON.parse(files['package.json']);}catch{fail('package.json ist kein gültiges JSON.');}
  const s=pkg.scripts??{};
  if(typeof s.test==='string'&&s.test.trim()){
   const build=typeof s.build==='string'?s.build.trim():'';
   let preview;
   if(build==='vite build')preview={build:['npm','run','build'],directory:'dist'};
   if(build==='node scripts/build.mjs')preview={build:['node','scripts/build.mjs'],directory:'dist'};
   config={version:1,prepare:files['package-lock.json']||files['npm-shrinkwrap.json']?[['npm','ci','--no-audit','--no-fund']]:[],check:s.test.trim()==='node --test'?['node','--test']:['npm','test'],requires:['node'],generated:['node_modules'],...(preview?{preview}:{})};
   if(build&&!preview&&!serve)notes.push('Der Build-Befehl ist vorhanden, sein Vorschau-Ausgabeordner ist nicht eindeutig. Unter Erweitert ergänzen.');
   source='node';label='Node-Projekt';
  }
 }
 else if(files.Makefile){config=makePlan(files.Makefile);source='make';label='Make-Projekt';}
 else if(files['pyproject.toml']&&/\[tool\.pytest(?:\.ini_options)?\]|pytest/.test(files['pyproject.toml'])){
  config={version:1,prepare:[],check:['python3','-m','pytest'],requires:['python3'],generated:['.venv','__pycache__','.pytest_cache']};source='python';label='Python-Projekt mit pytest';
  notes.push('Python-Abhängigkeiten müssen in der gewählten Umgebung vorhanden sein. Keine Installation wurde ausgeführt.');
 }
 if(config){
  config=validateProjectPlan(serve?{...config,preview:{serve}}:config);
  if(config.prepare.length)notes.push('Die Vorbereitung läuft erst beim Testen oder bei der Vorschau, in der jeweiligen Arbeitskopie. Paketdownloads benötigen erlaubte Quellen; diese Prüfung bestätigt noch keinen Download oder Build.');
  if(!config.preview)notes.push('Eine Vorschau ist noch nicht konfiguriert. Tests können unabhängig davon eingerichtet werden.');
 }else notes.push('Studio hat keine Tests gefunden. Ändern und Prüfen geht trotzdem, nur ohne automatische Tests und Vorschau. Für Entwickler: unter „eigene Konfiguration“ eine studio.project.json einfügen – eine KI kann sie aus den Projektdateien vorschlagen.');
 const revision=createHash('sha256').update(JSON.stringify({files,head,config,source})).digest('hex');
 return {revision,source,label,state:config?'proposed':'needs_configuration',configuration:config,notes,tools:[]};
}
export function requiredPrograms(config){
 return [...new Set([...config.requires,...config.prepare.map(c=>c[0]),config.check[0],...(config.preview?.build?[config.preview.build[0]]:[]),...(config.preview?.serve?[config.preview.serve.argv[0]]:[])].filter(program))];
}
export function findPrograms(programs,{directories=(process.env.PATH??'').split(path.delimiter),platform=process.platform}={}){
 if(!Array.isArray(programs)||programs.length>30||!programs.every(program))fail('Ungültige Programmprüfung.');
 return programs.map(name=>({program:name,available:directories.some(dir=>{
  if(!dir||!path.isAbsolute(dir))return false;
  return (platform==='win32'?['','.exe','.cmd','.bat']:['']).some(ext=>{try{const file=path.join(dir,name+ext);if(!lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink())return false;accessSync(file,platform==='win32'?constants.F_OK:constants.X_OK);return true;}catch{return false;}});
 })}));
}
