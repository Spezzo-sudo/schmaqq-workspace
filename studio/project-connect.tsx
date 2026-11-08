import {useState,useEffect,useRef} from 'react';
import {parseCommand} from '../app/setup-command';
import {roomRequest,type Resource} from './room-model';
import {githubState,githubNotice,linkGithub as openGithub,type GithubApp,type GithubAccess} from './github-link';

type Configuration={version:1;prepare:string[][];check:string[];requires:string[];generated:string[];preview?:{build:string[];directory:string}|{serve:{argv:string[];port:number}}};
type SetupPlan={revision:string;source:string;label:string;state:'proposed'|'needs_configuration'|'missing_tools';configuration:Configuration|null;notes:string[];tools:{program:string;available:boolean}[]};
type JobResult={error?:string;publicKey?:string;setupPlan?:SetupPlan;configured?:boolean};
export default function ProjectConnect({project,projectTitle='Projekt',initialDevice='',resources,userId,onDone}:{project:string;projectTitle?:string;initialDevice?:string;resources:Resource[];userId:string;onDone:()=>Promise<void>}){
 const own=resources.filter(r=>r.owner===userId);
 const [device,setDevice]=useState(own.some(r=>r.device===initialDevice)?initialDevice:own.find(r=>r.online)?.device??''),[automatic,setAutomatic]=useState(true);
 const [check,setCheck]=useState(''),[prepare,setPrepare]=useState(''),[requires,setRequires]=useState(''),[generated,setGenerated]=useState(''),[configurationJSON,setConfigurationJSON]=useState('');
 const [build,setBuild]=useState(''),[directory,setDirectory]=useState('dist'),[publish,setPublish]=useState(false),[codex,setCodex]=useState(false);
 const [busy,setBusy]=useState(false),[operation,setOperation]=useState<'plan'|'apply'>('plan'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[plan,setPlan]=useState<SetupPlan|null>(null),[advanced,setAdvanced]=useState(false);
 const [kinds,setKinds]=useState<Record<string,string>>({}),[planVersions,setPlanVersions]=useState<Record<string,number>>({}),[executorsLoaded,setExecutorsLoaded]=useState(false),[repository,setRepository]=useState(''),[publicKey,setPublicKey]=useState(''),[keyBusy,setKeyBusy]=useState(false),[copied,setCopied]=useState(false);
 const [serveCommand,setServeCommand]=useState(''),[servePort,setServePort]=useState('3000');
 const [githubApp,setGithubApp]=useState<GithubApp|null>(null),[access,setAccess]=useState<GithubAccess|null>(null),[linkBusy,setLinkBusy]=useState(false);
 const feedback=useRef<HTMLDivElement|null>(null),advancedPanel=useRef<HTMLDetailsElement|null>(null),alive=useRef(true);
 const cap=own.find(r=>r.device===device)?.development?.find(p=>p.id===project),server=kinds[device]==='server';
 const outdated=executorsLoaded&&(planVersions[device]??0)<1;
 const servePortValid=/^\d{4,5}$/.test(servePort)&&Number(servePort)>=1024&&Number(servePort)<=65535;
 const github=/^(?:https:\/\/github\.com\/|git@github\.com:)([\w-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(repository)?.[1];
 const online=own.some(r=>r.device===device&&r.online);
 const appAccess=access?.access===true;
 const invalid=!executorsLoaded||outdated||!online||server&&!publicKey&&!cap&&!appAccess||server&&!!serveCommand.trim()&&!servePortValid;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 // With the Studio GitHub App, sharing finished changes as a pull request is part of connecting the repository.
 useEffect(()=>{setPublish(appAccess&&server||cap?.publish===true);setCodex(cap?.allowCodex===true);},[device,cap?.publish,cap?.allowCodex,appAccess,server]);
 useEffect(()=>{let active=true;
  githubState(project).then(({app,access})=>{if(active){setGithubApp(app);setAccess(access);}});
  const back=githubNotice();if(back){setNotice(back.notice);if(back.error)setError(back.error);}
  return()=>{active=false;};
 },[project]);
 async function linkGithub(kind:'create'|'install'){
  setLinkBusy(true);setError('');
  try{await openGithub(kind);}catch(e){if(alive.current){setError((e as Error).message);setLinkBusy(false);}}
 }

 useEffect(()=>{setPublicKey('');setCopied(false);},[device]);
 useEffect(()=>{setPlan(null);setNotice('');setError('');},[project,device,repository,automatic,check,prepare,requires,generated,configurationJSON,build,directory,serveCommand,servePort,publish,codex]);
 useEffect(()=>{let active=true;setExecutorsLoaded(false);
  roomRequest<{executors:{id:string;kind:string;setupPlanVersion?:number}[]}>('/api/executors?project='+encodeURIComponent(project)).then(d=>{if(active){setKinds(Object.fromEntries(d.executors.map(e=>[e.id,e.kind])));setPlanVersions(Object.fromEntries(d.executors.map(e=>[e.id,e.setupPlanVersion??0])));setExecutorsLoaded(true);}}).catch(()=>{if(active)setError('Die Fähigkeiten deiner Rechner konnten nicht geladen werden. Öffne die Einrichtung erneut, sobald die Verbindung wieder besteht.');});
  roomRequest<{meta:{repository?:string}}>('/api/room?project='+encodeURIComponent(project)).then(d=>{if(active)setRepository(d.meta.repository??'');}).catch(()=>{});
  return()=>{active=false;};
 },[project]);
 useEffect(()=>{if(plan||error||notice)requestAnimationFrame(()=>{feedback.current?.scrollIntoView({block:'nearest'});feedback.current?.focus({preventScroll:true});});},[plan,error,notice]);

 async function waitForJob(id:string):Promise<JobResult>{
  for(let i=0;i<600;i++){
   if(!alive.current)throw Error('Ansicht geschlossen. Der Auftrag kann auf dem Rechner noch laufen; vor einer Wiederholung den Verlauf prüfen.');
   const {job}=await roomRequest<{job:{status:string;result?:JobResult}}>('/api/development/job?id='+encodeURIComponent(id));
   if(job.status==='completed')return job.result??{};
   if(!['queued','running'].includes(job.status))throw Error(job.result?.error??'Vorgang unterbrochen. Prüfe den Auftragsverlauf, bevor du es erneut versuchst.');
   await new Promise(r=>setTimeout(r,1000));
  }
  throw Error('Der Rechner hat noch keinen Abschluss bestätigt. Prüfe vor einem erneuten Versuch den Auftragsverlauf.');
 }
 async function showKey(){
  setKeyBusy(true);setError('');
  try{
   const queued=await roomRequest<{id:string}>('/api/development',{action:'job',device,project,operation:'deploy-key'}),result=await waitForJob(queued.id);
   if(!result.publicKey)throw Error('Der Server-Worker hat keinen öffentlichen Schlüssel geliefert.');
   if(alive.current)setPublicKey(result.publicKey);
  }catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setKeyBusy(false);}
 }
 function manualConfiguration():Configuration{
  if(configurationJSON.trim()){
   let value;try{value=JSON.parse(configurationJSON);}catch{throw Error('Die Projektkonfiguration ist kein gültiges JSON.');}
   if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Die Projektkonfiguration muss ein JSON-Objekt sein.');
   return value;
  }
  const serve=server&&serveCommand.trim()?{argv:parseCommand(serveCommand),port:Number(servePort)}:undefined;
  if(build.trim()&&serve)throw Error('Wähle für die Vorschau entweder einen Build mit Ausgabeordner oder eine Live-App.');
  return {version:1,prepare:prepare.split(/\r?\n/).filter(line=>line.trim()).map(parseCommand),check:parseCommand(check),requires:requires.split(',').map(s=>s.trim()).filter(Boolean),generated:generated.split(',').map(s=>s.trim()).filter(Boolean),...(serve?{preview:{serve}}:build.trim()?{preview:{build:parseCommand(build),directory}}:{})};
 }
 async function connect(mode:'plan'|'apply'){
  if(mode==='apply'&&(!plan?.configuration||plan.state!=='proposed'))return;
  setBusy(true);setOperation(mode);setError('');setNotice(mode==='plan'?'Repository und benötigte Programme werden geprüft. Projektbefehle werden dabei nicht ausgeführt.':'Die bestätigte Konfiguration wird gespeichert.');
  try{
   const settings=await roomRequest<{meta:{workflow?:string}}>('/api/room?project='+encodeURIComponent(project));
   const selection=automatic?{automatic:true,...(server&&serveCommand.trim()?{serve:{argv:parseCommand(serveCommand),port:Number(servePort)}}:{})}:{automatic:false,configuration:manualConfiguration()};
   const queued=await roomRequest<{id:string}>('/api/team/project-connect',{project,device,mode,...selection,publish:mode==='apply'&&publish,allowCodex:mode==='apply'&&!server&&codex,workflow:settings.meta.workflow??'pull-request',...(mode==='apply'?{expectedPlan:plan!.revision}:{})});
   const result=await waitForJob(queued.id);if(!alive.current)return;
   if(mode==='plan'){
    if(!result.setupPlan)throw Error('Dieser Runner unterstützt den Einrichtungsplan noch nicht. Aktualisiere den Runner vor einem erneuten Versuch.');
    setPlan(result.setupPlan);setNotice('');
   }else{
    if(result.configured!==true)throw Error('Der Rechner hat die Speicherung der Projektkonfiguration nicht bestätigt.');
    setPlan(null);setNotice('Projektkonfiguration gespeichert. Vorbereitung, Tests und Vorschau wurden noch nicht ausgeführt. Du kannst jetzt eine Aufgabe mit eigener Arbeitskopie starten.');await onDone();
   }
  }catch(e){if(alive.current){setError((e as Error).message);setNotice('');if(mode==='apply')setPlan(null);}}finally{if(alive.current)setBusy(false);}
 }
 const proposed=plan?.configuration;
 return <form className="team-form team-callout" aria-label={projectTitle+' einrichten'} onSubmit={e=>{e.preventDefault();void connect('plan');}}>
  <h3>{projectTitle} einrichten</h3>
  <p>Wähle den PC oder Server, auf dem {projectTitle} bearbeitet werden soll. Studio liest die Projektkonfiguration oder schlägt einen Ablauf aus den vorhandenen Projektdateien vor. Du prüfst den Vorschlag vor dem Speichern.</p>
  <label>Rechner auswählen<select value={device} onChange={e=>setDevice(e.target.value)} disabled={busy||keyBusy}><option value="">Rechner auswählen …</option>{own.map(r=><option key={r.device} value={r.device}>{r.name}{kinds[r.device]==='server'?' (Server)':''} · {r.online?'Erreichbar':'Nicht erreichbar'}</option>)}</select></label>
  {server&&<section className="server-github" aria-label="Verbindung mit GitHub">
   <h4>1. Mit GitHub verbinden</h4>
   {!githubApp||!access?<p role="status">Verbindung mit GitHub wird geprüft …</p>:appAccess?<>
    <p><strong>Verbunden.</strong> Studio arbeitet mit {access.repository}. Fertige Änderungen kommen als Vorschlag (Pull Request) auf GitHub und werden erst nach eurer Freigabe übernommen.</p>
    {access.protected===false&&<div className="rw-error" role="alert"><span>Der Hauptzweig „{access.base}“ ist auf GitHub nicht geschützt. Damit nichts ohne Vorschlag auf „{access.base}“ gelangt, lege eine Schutzregel mit „Require a pull request before merging“ an: <a href={`https://github.com/${access.repository}/settings/branches`} target="_blank" rel="noreferrer">Schutzregel bei GitHub anlegen ↗</a></span></div>}
   </>:githubApp.configured?<>
    <p>Studio braucht einmalig Zugriff auf {access.repository??'das Repository'}. Die Person, der das Repository gehört, gibt es auf GitHub frei und wählt selbst, welche ihrer Repositories Studio sehen darf, private eingeschlossen.</p>
    <button type="button" className="rw-button lime" disabled={linkBusy||busy} onClick={()=>void linkGithub('install')}>{linkBusy?'GitHub wird geöffnet …':'Zugriff bei GitHub erlauben'}</button>
   </>:githubApp.canCreate?<>
    <p>Einmalig: Studio meldet sich bei GitHub an. GitHub zeigt dir, was Studio darf (Code lesen und schreiben, Vorschläge anlegen), und du bestätigst.</p>
    <button type="button" className="rw-button lime" disabled={linkBusy||busy} onClick={()=>void linkGithub('create')}>{linkBusy?'GitHub wird geöffnet …':'Mit GitHub verbinden'}</button>
   </>:<p>Der Inhaber muss Studio einmalig mit GitHub verbinden. Danach kannst du hier den Zugriff auf das Repository erlauben.</p>}
   {access&&!appAccess&&<details><summary>Für Entwickler: Zugang per Deploy-Key</summary>
    {cap&&<p>Eine Repository-Kopie ist auf dem Server-Worker vorhanden. Prüfe jetzt die Projektkonfiguration.</p>}
    <p>Der Server-Worker verwendet einen eigenen Schlüssel für genau dieses Repository. Trage dessen öffentlichen Teil einmalig bei GitHub unter <em>Settings → Deploy keys</em> ein.</p>
    {!publicKey?<button type="button" className="rw-button" disabled={keyBusy||busy||!online} onClick={()=>void showKey()}>{keyBusy?'Schlüssel wird geladen …':'Schlüssel anzeigen'}</button>:<>
     <label>Öffentlicher Schlüssel<textarea readOnly rows={3} value={publicKey} onFocus={e=>e.currentTarget.select()}/></label>
     <div className="rw-row-actions"><button type="button" className="rw-button" onClick={()=>{void navigator.clipboard?.writeText(publicKey).then(()=>setCopied(true)).catch(()=>setError('Kopieren nicht möglich. Markiere den öffentlichen Schlüssel und kopiere ihn selbst.'));}}>{copied?'Kopiert':'Schlüssel kopieren'}</button>{github&&<a className="rw-button" href={`https://github.com/${github}/settings/keys/new`} target="_blank" rel="noreferrer">Bei GitHub eintragen ↗</a>}</div>
     <p className="muted">Titel zum Beispiel „SCHMAQQ Server-Worker“. „Allow write access“ nur aktivieren, wenn fertige Änderungen hochgeladen werden sollen. Erlaube das dann zusätzlich unten in Studio.</p>
    </>}
   </details>}
  </section>}
  <h4>{server?'2. Projekt prüfen':'Projekt prüfen'}</h4>
  <p>Eine vorhandene <code>studio.project.json</code> beschreibt Vorbereitung, Tests und Vorschau unabhängig von der Programmiersprache. Bekannte Projektdateien können ebenfalls einen Vorschlag liefern.</p>
  <details ref={advancedPanel} tabIndex={-1} open={advanced} onToggle={e=>setAdvanced(e.currentTarget.open)}><summary>Erweiterte Projektkonfiguration</summary>
   <label className="team-check"><input type="checkbox" checked={automatic} disabled={busy||keyBusy} onChange={e=>setAutomatic(e.target.checked)}/>Konfiguration aus dem Repository erkennen</label>
   {!automatic&&<>
    <p>Du kannst eine mit deiner verbundenen KI erarbeitete Konfiguration einfügen oder die Befehle selbst angeben. Hier wird kein zusätzlicher KI-Dienst aufgerufen.</p>
    <label>Projektkonfiguration als JSON (optional)<textarea rows={5} value={configurationJSON} disabled={busy} onChange={e=>setConfigurationJSON(e.target.value)} placeholder={'{"version":1,"prepare":[],"check":["make","test"],"requires":["make"],"generated":[]}'}/></label>
    {configurationJSON.trim()?<p>Die eingefügte JSON-Konfiguration ersetzt die einzelnen Befehlsfelder.</p>:<>
     <label>Vorbereitung (ein Befehl pro Zeile)<textarea rows={3} value={prepare} disabled={busy} onChange={e=>setPrepare(e.target.value)} placeholder="Zum Beispiel: make build-bootstrap"/></label>
     <label>Testbefehl<input value={check} disabled={busy} onChange={e=>setCheck(e.target.value)} placeholder="Zum Beispiel: make build-check oder npm test"/></label>
     <label>Benötigte Programme (kommagetrennt)<input value={requires} disabled={busy} onChange={e=>setRequires(e.target.value)} placeholder="Zum Beispiel: make, python3"/></label>
     <label>Generierte Ordner (kommagetrennt)<input value={generated} disabled={busy} onChange={e=>setGenerated(e.target.value)} placeholder="Zum Beispiel: .venv-build, build"/></label>
     <details><summary>Gebaute Website als Vorschau</summary><label>Build-Befehl<input value={build} disabled={busy} onChange={e=>setBuild(e.target.value)} placeholder="Zum Beispiel: make build"/></label><label>Ausgabeordner<input value={directory} disabled={busy} onChange={e=>setDirectory(e.target.value)}/></label></details>
    </>}
   </>}
   {server&&(automatic||!configurationJSON.trim())&&<details className="server-github"><summary>Live-App als Vorschau (optional)</summary>
    <p>Die App läuft abgeschottet auf dem Server, höchstens 30 Minuten. Sie muss auf <code>HOST</code> und <code>PORT</code> hören; eingebettete Datenbanken wie SQLite sind möglich.</p>
    <label>Startbefehl der App<input value={serveCommand} disabled={busy} onChange={e=>setServeCommand(e.target.value)} placeholder="Zum Beispiel: npm start"/></label><label>Port<input value={servePort} inputMode="numeric" disabled={busy} onChange={e=>setServePort(e.target.value.trim())}/></label>
    {serveCommand.trim()&&!servePortValid&&<p className="rw-error" role="alert">Port zwischen 1024 und 65535 angeben.</p>}
   </details>}
  </details>
  {!(server&&appAccess)&&<details><summary>Optionale Freigaben</summary><label className="team-check"><input type="checkbox" checked={publish} disabled={busy||keyBusy} onChange={e=>setPublish(e.target.checked)}/>Fertige Änderungen als Vorschlag (Pull Request) auf GitHub hochladen.</label>
   {!server&&<label className="team-check"><input type="checkbox" checked={codex} disabled={busy||keyBusy} onChange={e=>setCodex(e.target.checked)}/>Meine persönliche Codex-Anmeldung auf diesem PC für dieses Projekt verwenden.</label>}
   <p>Die Prüfung erteilt keine neuen Freigaben. Deine Auswahl wird erst mit „Einrichtung bestätigen“ gespeichert.</p>
  </details>}
  <button className="rw-button" disabled={invalid||busy||keyBusy}>{busy&&operation==='plan'?'Projekt wird geprüft …':'Projekt prüfen'}</button>
  {!executorsLoaded&&!error&&<p role="status">Die Fähigkeiten deiner Rechner werden geladen …</p>}
  {outdated&&device&&<p role="status">Dieser Runner unterstützt die Projektprüfung noch nicht. Aktualisiere ihn und öffne die Einrichtung anschließend erneut. Es wird kein Einrichtungsauftrag an den alten Runner gesendet.</p>}
  <div ref={feedback} tabIndex={-1} aria-label="Ergebnis der Projektprüfung">
   {notice&&<p role="status">{notice}</p>}{error&&<p className="rw-error" role="alert">{error}</p>}
   {plan&&<section className="team-callout" aria-label={'Einrichtungsvorschlag für '+projectTitle}><h4>Einrichtungsvorschlag für {projectTitle}</h4>
    <p>{plan.state==='missing_tools'?'Auf diesem Rechner fehlen benötigte Programme. Es wird keine Software automatisch auf dem Server installiert.':plan.state==='needs_configuration'?'Für dieses Projekt fehlt noch eine vollständige Konfiguration.':'Studio kann Tests und Vorschau für dieses Projekt so ausführen. Bestätigen speichert nur den Ablauf; ob Abhängigkeiten passen, zeigt erst der erste Testlauf.'}</p>
    {plan.tools.length>0&&<><p><strong>Programme auf diesem Rechner:</strong> {plan.tools.map(tool=>`${tool.program} ${tool.available?'vorhanden':'fehlt'}`).join(' · ')}</p>
     <p className="muted">Vorhandene Programme belegen nicht, dass benötigte Module oder Pakete (zum Beispiel Python-Module wie ensurepip) installiert sind.</p></>}
    {plan.notes.length>0&&<ul aria-label="Hinweise zur Prüfung">{plan.notes.map((note,index)=><li key={index}>{note}</li>)}</ul>}
    {proposed&&<><p><strong>Vorbereitung:</strong> {proposed.prepare.length?`${proposed.prepare.length} Schritt${proposed.prepare.length===1?'':'e'} vor Tests und Vorschau in der jeweiligen Arbeitskopie.`:'Keine zusätzlichen Vorbereitungsschritte.'}</p>
     <p><strong>Tests:</strong> {proposed.check.length?'Testbefehl erkannt.':'Kein Testbefehl.'} <strong>Vorschau:</strong> {proposed.preview?('serve' in proposed.preview?'Live-App auf dem Server.':'Gebaute Website.'):'Noch nicht konfiguriert; Tests sind unabhängig davon möglich.'}</p>
     <details><summary>Technische Details: {plan.label}, Befehle und Konfiguration</summary>
      <p><strong>Testbefehl:</strong> <code>{proposed.check.map(arg=>/^[\w./:@=-]+$/.test(arg)?arg:JSON.stringify(arg)).join(' ')}</code></p>
      {proposed.preview&&!('serve' in proposed.preview)&&<p><strong>Ausgabeordner:</strong> <code>{proposed.preview.directory}</code></p>}
      <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(proposed,null,2)}</pre></details>
     <p>Mit der Bestätigung speicherst du diese Konfiguration{publish?' und erlaubst, fertige Änderungen als Vorschlag auf GitHub zu stellen':''}. Projektbefehle und mögliche Paketdownloads starten erst, wenn du Tests oder Vorschau ausführst.</p>
    </>}
    {plan.state==='needs_configuration'&&<button type="button" className="rw-button" disabled={busy} onClick={()=>{setAutomatic(false);setAdvanced(true);requestAnimationFrame(()=>{advancedPanel.current?.scrollIntoView({block:'start'});advancedPanel.current?.focus({preventScroll:true});});}}>Konfiguration ergänzen</button>}
    {plan.state==='proposed'&&proposed&&<button type="button" className="rw-button lime" disabled={invalid||busy||keyBusy} onClick={()=>void connect('apply')}>{busy&&operation==='apply'?'Konfiguration wird gespeichert …':'Einrichtung bestätigen'}</button>}
   </section>}
  </div>
 </form>;
}
