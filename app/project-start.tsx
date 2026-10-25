'use client';
import {useRef,useState} from 'react';

type SetupMode='github'|'existing'|'new';
export default function ProjectStart({project,onComplete}:{project?:{id:string;title:string};onComplete:(id:string)=>void}){
 const [title,setTitle]=useState(project?.title??'');
 const [description,setDescription]=useState('');
 const [mode,setMode]=useState<SetupMode>('github');
 const [repository,setRepository]=useState('');
 const [directory,setDirectory]=useState('');
 const [approved,setApproved]=useState(false);
 const [base,setBase]=useState('main');
 const [check,setCheck]=useState('["node","--test"]');
 const [previewBuild,setPreviewBuild]=useState('');
 const [previewDirectory,setPreviewDirectory]=useState('dist');
 const [created,setCreated]=useState(project?.id??'');
 const [pending,setPending]=useState(false);
 const [error,setError]=useState('');
 const [saved,setSaved]=useState(false);
 const [copied,setCopied]=useState('');
 const id=useRef('');
 if(!id.current)id.current=crypto.randomUUID();
 const reset=()=>{setSaved(false);setError('');};

 function plan(){
  if(!created)throw Error('Erst ein Studio-Projekt vorbereiten.');
  const destination=directory.trim();
  if(!destination||!(/^[A-Za-z]:[\\/]/.test(destination)||destination.startsWith('/')))throw Error('Bitte auf deinem eigenen Rechner einen absoluten Zielordner festlegen.');
  if(mode==='github'){
   if(!/^(https:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+|git@github\.com:[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+)$/.test(repository.trim()))throw Error('Nur eine reine GitHub-Repository-URL ohne Zugangsdaten eintragen.');
   if(!approved)throw Error('Bitte die Freigabe des lokalen Zielordners bestätigen.');
  }
  let command:unknown;
  try{command=JSON.parse(check);}catch{throw Error('Testbefehl als Argumentliste angeben, zum Beispiel ["npm","test"].');}
  if(!Array.isArray(command)||!command.length||!command.every(a=>typeof a==='string'&&a.length>0))throw Error('Testbefehl benötigt eine nicht leere Argumentliste.');
  let preview;
  if(mode!=='new'&&previewBuild.trim()){
   let build:unknown;
   try{build=JSON.parse(previewBuild);}catch{throw Error('Vorschau-Build als Argumentliste angeben.');}
   if(!Array.isArray(build)||!build.length||!build.every(a=>typeof a==='string'&&a.length>0))throw Error('Vorschau-Build benötigt eine nicht leere Argumentliste.');
   if(!previewDirectory.trim()||/^[\\/]|^[A-Za-z]:/.test(previewDirectory.trim())||previewDirectory.trim().split(/[\\/]/).some(p=>!p||p==='.'||p==='..'))throw Error('Relativen Vorschau-Ausgabeordner innerhalb der Arbeitskopie angeben.');
   preview={build,directory:previewDirectory.trim()};
  }
  return {schema:'schmaqq-project-setup-v1',server:location.origin,project:created,mode,
   directory:destination,base,check:command,...(mode==='github'?{repository:repository.trim()}:{}),...(preview?{preview}:{})};
 }

 async function create(e:React.FormEvent){
  e.preventDefault();setPending(true);setError('');
  try{
   const response=await fetch('/api/project-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id.current,title,description,mode})});
   const data=await response.json() as {project:string;error?:string};
   if(!response.ok)throw Error(data.error??'Projekt konnte nicht vorbereitet werden.');
   setCreated(data.project);
  }catch(e){setError(e instanceof Error?e.message:'Projektstart fehlgeschlagen.');}
  finally{setPending(false);}
 }
 function download(){
  setError('');
  try{
   const settings=plan();
   const url=URL.createObjectURL(new Blob([JSON.stringify(settings,null,2)+'\n'],{type:'application/json'}));
   const a=document.createElement('a');a.href=url;a.download='schmaqq-project-setup.private.json';a.click();URL.revokeObjectURL(url);setSaved(true);
  }catch(e){setError(e instanceof Error?e.message:'Plan konnte nicht erstellt werden.');}
 }
 async function copy(label:string,value:string){
  try{await navigator.clipboard.writeText(value);setCopied(label);setError('');}
  catch{setCopied('');setError('Kopieren nicht möglich. Bitte den Befehl markieren und manuell kopieren.');}
 }
 const apply='node selfhost/project-setup.mjs --apply PFAD_ZUM_PLAN PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL';
 const restart='node selfhost/runner.mjs PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL';
 return <section className="project-start" aria-label="Geführter Projektstart">
  <ol className="project-start-steps"><li>{created?'✓':'1'} Projekt beschreiben</li><li>2 Eigenen Rechner freigeben</li><li>3 Git prüfen & loslegen</li></ol>
  <p>Der Import läuft nur auf deinem eigenen Rechner. Studio erhält weder Zugriff auf deine gesamte Festplatte noch deine GitHub-Zugangsdaten.</p>
  {!created?<form onSubmit={create}>
   <label>Projektname<input required disabled={pending} maxLength={160} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Ziel und gewünschtes Ergebnis<textarea disabled={pending} maxLength={12000} value={description} onChange={e=>setDescription(e.target.value)}/></label>
   <label>Wie möchtest du starten?<select value={mode} disabled={pending} onChange={e=>{setMode(e.target.value as SetupMode);reset();}}>
    <option value="github">Bestehendes GitHub-Repository importieren</option>
    <option value="existing">Bereits lokales Git-Repository verbinden</option>
    <option value="new">Neues lokales Startprojekt</option>
   </select></label>
   <button className="button primary" disabled={pending}>{pending?'Wird vorbereitet …':'Projekt vorbereiten'}</button>
  </form>:<>
   <h3>{project?'Projekt auf deinem Rechner verbinden':'Projekt im Studio angelegt'}</h3>
   <p>Verwende deinen <strong>bereits registrierten persönlichen Runner</strong>. Falls er noch nicht verbunden ist: unter Entwicklung → PC verbinden die vorhandene Geräteanmeldung prüfen, statt einen zweiten Runner anzulegen.</p>
   <div className="project-location-fields">
    <label>Startart<select value={mode} onChange={e=>{setMode(e.target.value as SetupMode);setApproved(false);reset();}}>
     <option value="github">Bestehendes GitHub-Repository importieren</option>
     <option value="existing">Bereits lokales Git-Repository verbinden</option>
     <option value="new">Neues lokales Startprojekt</option>
    </select></label>
    {mode==='github'&&<label>GitHub-Repository (HTTPS oder SSH)
     <input required value={repository} onChange={e=>{setRepository(e.target.value);reset();}} placeholder="https://github.com/OWNER/REPOSITORY"/>
    </label>}
    <label>{mode==='existing'?'Bestehender lokaler Git-Stammordner':'Neuer Zielordner auf deinem eigenen Rechner'}
     <input required value={directory} onChange={e=>{setDirectory(e.target.value);setApproved(false);reset();}} placeholder="C:\\Users\\Name\\Projekte\\mein-repo"/>
    </label>
    <p>{mode==='github'?'Wähle einen neuen, noch nicht existierenden Ordner in deinem persönlichen Projektverzeichnis. Dessen übergeordneter Ordner muss bereits existieren. Der lokale Helfer klont nur dieses Repository; bestehende Ordner und andere Projekte bleiben unangetastet.':mode==='new'?'Der neue Ordner muss frei sein. Der Helfer erstellt ein lokales Git-Projekt ohne GitHub-Anlage.':'Der Helfer prüft den vorhandenen Git-Stammordner und ein bestehendes origin. Er klont nichts.'}</p>
    {mode!=='new'&&<details><summary>Hauptzweig, Tests und Vorschau festlegen</summary>
     <label>Gemeinsamer Hauptzweig<input required value={base} onChange={e=>{setBase(e.target.value);reset();}}/></label>
     <label>Testbefehl als Argumentliste<input required value={check} onChange={e=>{setCheck(e.target.value);reset();}}/></label>
     <label>Vorschau-Build als Argumentliste · optional<input value={previewBuild} onChange={e=>{setPreviewBuild(e.target.value);reset();}} placeholder='["npm","run","build"]'/></label>
     {previewBuild.trim()&&<label>Relativer Vorschau-Ausgabeordner<input required value={previewDirectory} onChange={e=>{setPreviewDirectory(e.target.value);reset();}}/></label>}
     <p>Tests und Build werden erst bei späteren, ausdrücklich angeforderten Runnerjobs ausgeführt. Nutze nur dir bekannte Befehle.</p>
    </details>}
    {mode==='github'&&<label className="project-consent"><input type="checkbox" checked={approved} onChange={e=>{setApproved(e.target.checked);reset();}}/> Ich habe das Repository und den neuen lokalen Zielordner bewusst ausgewählt. Keine bestehenden Daten sollen ersetzt werden.</label>}
   </div>
   <button className="button" onClick={download}>Einrichtungsplan herunterladen</button>
   {saved&&<div className="project-local-next"><h3>Einmalig auf deinem Rechner ausführen</h3>
    <ol>
     <li>Privaten Plan lokal speichern. Er enthält <strong>kein</strong> GitHub-Passwort oder Runner-Token.</li>
     <li>Git und Node.js ≥24.15 auf deinem Lenovo prüfen. Für ein privates Repository meldest du dich bei GitHub <strong>lokal</strong> über Git Credential Manager oder einen eigenen SSH-Key an, nicht im Studio-Chat.</li>
     <li>Im vorhandenen SCHMAQQ-Quellordner den Helfer mit dem Plan und dem <strong>bestehenden</strong> Runnerprofil starten. Beide Platzhalter durch lokale Dateipfade ersetzen.</li>
    </ol>
    <pre>{apply}</pre><button className="button" onClick={()=>copy('apply',apply)}>Befehl kopieren</button>
    {copied==='apply'&&<p role="status">Befehl kopiert. Beide Platzhalter ersetzen.</p>}
    <p>Bei erfolgreichem Import wird das bestehende Runnerprofil gesichert und nur um diese Projektfreigabe ergänzt. Codex und Veröffentlichung bleiben zunächst gesperrt. Bei fehlender Berechtigung bleibt die neue Arbeitskopie zur lokalen Prüfung erhalten.</p>
    <p>Danach nur den vorhandenen Runner mit seinem ergänzten Profil neu starten:</p>
    <pre>{restart}</pre><button className="button" onClick={()=>copy('restart',restart)}>Neustartbefehl kopieren</button>
    {copied==='restart'&&<p role="status">Neustartbefehl kopiert. Dateipfad ersetzen.</p>}
    <p>Im Studio danach „Zum Projekt und Bereitschaft prüfen“ wählen. Ein Git-Check bestätigt den Import; die persönliche Codex-Anmeldung erfolgt später separat.</p>
   </div>}
   <button className="button primary" onClick={()=>onComplete(created)}>Zum Projekt und Bereitschaft prüfen</button>
  </>}
  {error&&<p className="form-error" role="alert">{error}</p>}
 </section>;
}
