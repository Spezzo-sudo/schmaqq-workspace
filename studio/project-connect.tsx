import {useState,useEffect} from 'react';
import {parseCommand} from '../app/setup-command';
import {roomRequest,type Resource} from './room-model';
export default function ProjectConnect({project,resources,userId,onDone}:{project:string;resources:Resource[];userId:string;onDone:()=>Promise<void>}){
 const [automatic,setAutomatic]=useState(true);
 const own=resources.filter(r=>r.owner===userId),[device,setDevice]=useState(own.find(r=>r.online)?.device??''),[check,setCheck]=useState(''),[build,setBuild]=useState(''),[directory,setDirectory]=useState('dist'),[publish,setPublish]=useState(false),[codex,setCodex]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const cap=own.find(r=>r.device===device)?.development?.find(p=>p.id===project);
 useEffect(()=>{setPublish(cap?.publish===true);setCodex(cap?.allowCodex===true);},[device,cap?.publish,cap?.allowCodex]);
 const outdated=!!cap&&!cap.setupVersion;
 // Server worker: GitHub access with a deploy key of this one repository (no extra account).
 const [kinds,setKinds]=useState<Record<string,string>>({}),[repository,setRepository]=useState(''),[publicKey,setPublicKey]=useState(''),[keyBusy,setKeyBusy]=useState(false),[copied,setCopied]=useState(false);
 useEffect(()=>{let alive=true;
  roomRequest<{executors:{id:string;kind:string}[]}>('/api/executors?project='+encodeURIComponent(project)).then(d=>{if(alive)setKinds(Object.fromEntries(d.executors.map(e=>[e.id,e.kind])));}).catch(()=>{});
  roomRequest<{meta:{repository?:string}}>('/api/room?project='+encodeURIComponent(project)).then(d=>{if(alive)setRepository(d.meta.repository??'');}).catch(()=>{});
  return()=>{alive=false};},[project]);
 const server=kinds[device]==='server';
 useEffect(()=>{setPublicKey('');setCopied(false);},[device]);
 const github=/^(?:https:\/\/github\.com\/|git@github\.com:)([\w-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(repository)?.[1];
 async function showKey(){
  setKeyBusy(true);setError('');
  try{const queued=await roomRequest<{id:string}>('/api/development',{action:'job',device,project,operation:'deploy-key'});
   for(let i=0;i<60;i++){const {job}=await roomRequest<{job:{status:string;result?:{publicKey?:string;error?:string}}}>('/api/development/job?id='+encodeURIComponent(queued.id));
    if(job.status==='completed'&&job.result?.publicKey){setPublicKey(job.result.publicKey);return;}
    if(!['queued','running'].includes(job.status))throw Error(job.result?.error??'Schlüssel konnte nicht erzeugt werden.');
    await new Promise(r=>setTimeout(r,1000));}
   throw Error('Der Server-Worker hat nicht geantwortet.');
  }catch(e){setError((e as Error).message);}finally{setKeyBusy(false);}
 }
 async function connect(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setNotice('Dein Rechner wird beauftragt. Bestehende Ordner und andere Projekte bleiben erhalten.');
  try{const settings=await roomRequest<{meta:{workflow?:string}}>('/api/room?project='+encodeURIComponent(project));const queued=await roomRequest<{id:string}>('/api/team/project-connect',{project,device,...(automatic?{automatic:true}:{check:parseCommand(check)}),publish,allowCodex:codex,workflow:settings.meta.workflow??'pull-request',...(!automatic&&build.trim()?{preview:{build:parseCommand(build),directory}}:{})});
   for(let i=0;i<600;i++){
    const {job}=await roomRequest<{job:{status:string;result?:{error?:string}}}>('/api/development/job?id='+encodeURIComponent(queued.id));
    if(job.status==='completed'){setNotice('Projekt auf deinem Rechner eingerichtet. Die Bereitschaftsmeldung wird automatisch aktualisiert.');await onDone();return;}
    if(!['queued','running'].includes(job.status))throw Error(job.result?.error??'Einrichtung wurde unterbrochen. Vorhandene Dateien bleiben erhalten.');
    await new Promise(r=>setTimeout(r,1000));
   }throw Error('Dein Rechner hat den Abschluss noch nicht bestätigt. Vor einem erneuten Versuch den lokalen Stand prüfen.');
  }catch(e){setError((e as Error).message);setNotice('');}finally{setBusy(false);}
 }
 return <form className="team-form team-callout" onSubmit={connect}><h3>Projekt auf meinem Rechner einrichten</h3><p>Tests und Vorschau werden bei unterstützten Projekten automatisch erkannt. Dein Runner übernimmt die Einstellungen und verwendet sie sofort, ohne Neustart oder Dateibearbeitung. Projektbefehle werden erst ausgeführt, wenn du Tests oder Vorschau startest.</p><p>{server?'Studio verwendet das gemeinsame Repository dieses Projekts. Der Server-Worker holt es mit seinem eigenen Schlüssel für genau dieses Repository; Projektcode sieht diesen Schlüssel nicht.':'Studio verwendet das gemeinsame Repository dieses Projekts. Git-Zugang und Code bleiben auf deinem persönlichen Rechner. Eine Anmeldung bei GitHub auf diesem Rechner kann einmalig erforderlich sein.'}</p><label>Mein Rechner<select value={device} onChange={e=>setDevice(e.target.value)} disabled={busy}><option value="">Rechner auswählen …</option>{own.map(r=><option key={r.device} value={r.device}>{r.name}{kinds[r.device]==='server'?' (Server)':''} · {r.online?'Erreichbar':'Nicht erreichbar'}</option>)}</select></label>
  {server&&<section className="server-github" aria-label="GitHub-Zugang des Server-Workers">
   <h4>Schritt 1: GitHub-Zugang für den Server-Worker</h4>
   <p>Der Server-Worker bekommt einen eigenen Schlüssel nur für dieses Repository. Kein zusätzliches Konto: Du trägst den öffentlichen Teil im bestehenden Repository unter <em>Settings → Deploy keys</em> ein. Löschen dort beendet den Zugang sofort.</p>
   {!publicKey?<button type="button" className="rw-button" disabled={keyBusy||!own.some(r=>r.device===device&&r.online)} onClick={()=>void showKey()}>{keyBusy?'Schlüssel wird erstellt …':'Schlüssel anzeigen'}</button>:<>
    <label>Öffentlicher Schlüssel<textarea readOnly rows={3} value={publicKey} onFocus={e=>e.currentTarget.select()}/></label>
    <div className="rw-row-actions"><button type="button" className="rw-button" onClick={()=>{void navigator.clipboard?.writeText(publicKey).then(()=>setCopied(true));}}>{copied?'Kopiert':'Schlüssel kopieren'}</button>
     {github&&<a className="rw-button" href={`https://github.com/${github}/settings/keys/new`} target="_blank" rel="noreferrer">Bei GitHub eintragen ↗</a>}</div>
    <p className="muted">Titel zum Beispiel „SCHMAQQ Server-Worker“. „Allow write access“ nur anhaken, wenn der Worker Aufgaben-Branches hochladen soll (dann unten auch die Übertragung erlauben). Danach Schritt 2.</p>
   </>}
  </section>}<label className="team-check"><input type="checkbox" checked={automatic} disabled={busy} onChange={e=>setAutomatic(e.target.checked)}/>Tests und Vorschau automatisch aus dem Projekt erkennen</label>{!automatic&&<><label>Testbefehl des Projekts<input value={check} required disabled={busy} onChange={e=>setCheck(e.target.value)} placeholder="Zum Beispiel: npm test oder node --test"/></label><details><summary>Vorschau einrichten</summary><label>Build-Befehl<input value={build} disabled={busy} onChange={e=>setBuild(e.target.value)} placeholder="Zum Beispiel: npm run build"/></label><label>Ausgabeordner<input value={directory} disabled={busy} onChange={e=>setDirectory(e.target.value)}/></label></details></>}<label className="team-check"><input type="checkbox" checked={publish} disabled={busy} onChange={e=>setPublish(e.target.checked)}/>Mein Runner darf Projektbranches zum gemeinsamen Repository übertragen.</label><label className="team-check"><input type="checkbox" checked={codex} disabled={busy} onChange={e=>setCodex(e.target.checked)}/>Meine persönliche Codex-Anmeldung für dieses Projekt verwenden.</label><button className="rw-button lime" disabled={outdated||busy||server&&!publicKey||!automatic&&!check.trim()||!own.some(r=>r.device===device&&r.online)}>{busy?'Einrichtung läuft …':server?'Schritt 2: Auf dem Server-Worker einrichten':'Auf meinem Rechner einrichten'}</button>{outdated&&<p role="status">Dieser Runner benötigt einmalig ein Softwareupdate für die geführte Einrichtung. Deine bestehende Verbindung bleibt erhalten.</p>}{notice&&<p role="status">{notice}</p>}{error&&<p className="rw-error" role="alert">{error}</p>}</form>;
}
