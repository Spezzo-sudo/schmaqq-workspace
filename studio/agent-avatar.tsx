import {useEffect,useState} from 'react';
import {Check,Cpu,Layers,MessageSquare,Sparkles,UserCheck,Wrench,X} from 'lucide-react';
import {
 FIELD_GUILD_R2_PACK_ID,FIELD_GUILD_R2_PRESETS,filterAvatarPresets,findAvatarPreset,resolveAgentAvatar,
 type AvatarFilterKind,type AvatarPreset
} from './avatar-catalog';
import {
 agentRoleLabels,agentContextSourceLabels,agentJob,
 agentEffectivePermissions,agentExecutionStatus,time,
 type RoomAgent,type RoomAgentPermissions,type RoomState,type Resource,type HermesAvailability
} from './room-model';

export function AgentAvatar({
 agent,
 presetId,
 name,
 fallbackCode,
 size='md',
 statusDot,
 className='',
 onAssetState
}:{
 agent?:Pick<RoomAgent,'name'|'avatar'|'avatarPresetId'|'role'>|null;
 presetId?:string|null;
 name?:string;
 fallbackCode?:string;
 size?:'xs'|'sm'|'md'|'lg'|'xl';
 statusDot?:'idle'|'ready'|'running'|'offline';
 className?:string;
 onAssetState?:(loaded:boolean)=>void;
}){
 const resolved=resolveAgentAvatar(agent??{name:name??'Agent',avatar:fallbackCode,avatarPresetId:presetId});
 const [imgFailed,setImgFailed]=useState(false);
 const [imgLoaded,setImgLoaded]=useState(false);

 useEffect(()=>{
  setImgFailed(false);
  setImgLoaded(false);
 },[resolved.assetPath]);

 const showImage=Boolean(resolved.assetPath&&!imgFailed);
 const useThumb=size==='xs'||size==='sm'||size==='md';
 const preferredWebp=useThumb?(resolved.thumbWebpPath??resolved.webpPath):resolved.webpPath;

 return <span
  className={`rw-fg-avatar rw-fg-${size} rw-fg-accent-${resolved.accent}${showImage&&imgLoaded?' has-image':''}${className?' '+className:''}`}
  title={resolved.preset?`${resolved.preset.name} (${resolved.preset.recommendedRoleLabel})`:(agent?.name??name??'KI-Teammitglied')}
 >
  {showImage&&<picture className="rw-fg-picture">
   {preferredWebp&&<source srcSet={preferredWebp} type="image/webp"/>}
   <img
    src={resolved.assetPath!}
    alt={resolved.preset?`Portrait ${resolved.preset.name}`:`Avatar ${agent?.name??name??'Agent'}`}
    style={{objectPosition:resolved.objectPosition}}
    loading="lazy"
    decoding="async"
    onLoad={()=>{setImgLoaded(true);onAssetState?.(true);}}
    onError={()=>{setImgFailed(true);setImgLoaded(false);onAssetState?.(false);}}
   />
  </picture>}
  {(!showImage||!imgLoaded)&&<span className="rw-fg-fallback" aria-hidden={showImage&&imgLoaded}>
   {resolved.fallbackCode}
  </span>}
  {statusDot&&<i className={`rw-fg-status ${statusDot}`} aria-hidden="true"/>}
 </span>;
}

export function AvatarConfigurator({
 selectedPresetId,
 customCode,
 onSelect,
 onApplyRecommendation,
 onClose
}:{
 selectedPresetId?:string|null;
 customCode?:string|null;
 onSelect:(presetId:string,fallbackCode:string)=>void;
 onApplyRecommendation?:(preset:AvatarPreset)=>void;
 onClose:()=>void;
}){
 const [kindFilter,setKindFilter]=useState<AvatarFilterKind>('all');
 const [query,setQuery]=useState('');
 const [previewId,setPreviewId]=useState<string>(selectedPresetId||FIELD_GUILD_R2_PRESETS[0].id);
 const [fallbackInput,setFallbackInput]=useState(customCode??'');
 const [previewAssetLoaded,setPreviewAssetLoaded]=useState(false);

 const filtered=filterAvatarPresets(kindFilter,query);
 const activePreset=findAvatarPreset(previewId)??filtered[0]??FIELD_GUILD_R2_PRESETS[0];
 const humanCount=FIELD_GUILD_R2_PRESETS.filter(p=>p.kind==='human').length;
 const animalCount=FIELD_GUILD_R2_PRESETS.filter(p=>p.kind==='animal').length;

 return <div className="rw-modal-backdrop rw-fg-configurator-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="rw-fg-configurator" role="dialog" aria-modal="true" aria-label="Avatar auswählen – SCHMAQQ Field Guild R2">
   <header className="rw-fg-configurator-head">
    <div>
     <span className="rw-eyebrow">SCHMAQQ FIELD GUILD R2 · AVATAR-BIBLIOTHEK</span>
     <h2>Charakter & Avatar auswählen</h2>
     <p>Wähle eines der zwölf offiziellen Charakterportraits. Avatar, Name, Rolle, Modell und Kommunikationsstil lassen sich unabhängig voneinander anpassen.</p>
    </div>
    <button type="button" className="rw-icon" onClick={onClose} aria-label="Avatar-Auswahl schließen"><X size={20}/></button>
   </header>

   <div className="rw-fg-toolbar">
    <div className="rw-fg-filter-tabs" role="tablist" aria-label="Charakterfilter">
     <button type="button" role="tab" aria-selected={kindFilter==='all'} className={kindFilter==='all'?'active':''} onClick={()=>setKindFilter('all')}>
      Alle ({FIELD_GUILD_R2_PRESETS.length})
     </button>
     <button type="button" role="tab" aria-selected={kindFilter==='human'} className={kindFilter==='human'?'active':''} onClick={()=>setKindFilter('human')}>
      Menschen ({humanCount})
     </button>
     <button type="button" role="tab" aria-selected={kindFilter==='animal'} className={kindFilter==='animal'?'active':''} onClick={()=>setKindFilter('animal')}>
      Tiere ({animalCount})
     </button>
    </div>
    <input
     type="search"
     className="rw-fg-search"
     aria-label="Charakter oder Fachbereich suchen"
     value={query}
     onChange={e=>setQuery(e.target.value)}
     placeholder="Name, Fachbereich oder Charakterzug suchen …"
    />
   </div>

   <div className="rw-fg-configurator-body">
    <div className="rw-fg-gallery" role="listbox" aria-label="Verfügbare Avatare">
     {filtered.map(preset=>{
      const selected=activePreset.id===preset.id;
      return <button
       type="button"
       role="option"
       aria-selected={selected}
       key={preset.id}
       className={`rw-fg-card rw-fg-accent-${preset.accent}${selected?' selected':''}`}
       onClick={()=>{setPreviewId(preset.id);setFallbackInput(preset.fallbackCode);}}
      >
       <AgentAvatar presetId={preset.id} name={preset.name} fallbackCode={preset.fallbackCode} size="lg"/>
       <div className="rw-fg-card-meta">
        <div className="rw-fg-card-title">
         <strong>{preset.name}</strong>
         <span className="rw-fg-kind-pill">{preset.kind==='human'?'Mensch':'Tier'}</span>
        </div>
        <small>{preset.recommendedRoleLabel}</small>
        <code className="rw-fg-preset-id">{preset.id}.png</code>
       </div>
      </button>;
     })}
     {!filtered.length&&<p className="rw-muted">Kein Charakter passt zur Suche.</p>}
    </div>

    {activePreset&&<aside className="rw-fg-preview" aria-label="Große Charaktervorschau">
     <div className={`rw-fg-preview-stage rw-fg-accent-${activePreset.accent}`}>
      <AgentAvatar
       presetId={activePreset.id}
       name={activePreset.name}
       fallbackCode={fallbackInput||activePreset.fallbackCode}
       size="xl"
       onAssetState={setPreviewAssetLoaded}
      />
      <div className="rw-fg-preview-badges">
       <span className="rw-badge">{activePreset.kind==='human'?'Mensch':'Tier'}</span>
       <span className="rw-badge">{previewAssetLoaded?'Portrait geladen':'Kürzel-Fallback aktiv'}</span>
      </div>
     </div>

     <div className="rw-fg-preview-info">
      <div className="rw-fg-preview-head">
       <h3>{activePreset.name}</h3>
       <code>{activePreset.id}.png</code>
      </div>
      <p className="rw-fg-preview-role">Empfohlener Fachbereich: <strong>{activePreset.recommendedRoleLabel}</strong> <small>(frei kombinierbar)</small></p>
      <p className="rw-fg-preview-traits">{activePreset.traits}</p>
      <div className="rw-fg-preview-box">
       <strong>Empfohlener Auftrag</strong>
       <p>{activePreset.defaultPurpose}</p>
       <strong>Kommunikationsstil & Persönlichkeit</strong>
       <p>{activePreset.defaultPersonality}</p>
      </div>
      <div className="rw-fg-asset-meta">
       <small>Paket: <code>{FIELD_GUILD_R2_PACK_ID}</code> · Datei: <code>{activePreset.assetPath}</code></small>
      </div>
      <label className="rw-fg-fallback-field">
       <span>Kürzel-Fallback (für Text-Badges / eigene Kürzel)</span>
       <input
        value={fallbackInput||activePreset.fallbackCode}
        maxLength={4}
        onChange={e=>setFallbackInput(e.target.value.toUpperCase())}
        placeholder={activePreset.fallbackCode}
       />
      </label>
     </div>

     <footer className="rw-fg-preview-actions">
      {onApplyRecommendation&&<button
       type="button"
       className="rw-button subtle"
       onClick={()=>{
        onApplyRecommendation(activePreset);
        onSelect(activePreset.id,(fallbackInput||activePreset.fallbackCode).slice(0,4));
        onClose();
       }}
      >
       Avatar + Charakter-Vorschlag übernehmen
      </button>}
      <button
       type="button"
       className="rw-button lime"
       onClick={()=>{
        onSelect(activePreset.id,(fallbackInput||activePreset.fallbackCode).slice(0,4));
        onClose();
       }}
      >
       <Check size={16}/>Nur Avatar wählen & speichern
      </button>
     </footer>
    </aside>}
   </div>
  </section>
 </div>;
}

export function AgentProfileView({
 agent,
 room,
 resources,
 canDevelop,
 onEdit,
 onOpenAvatarPicker,
 onAddressInChat,
 onOpenTask,
 onClose,
 hermes=null
}:{
 agent:RoomAgent;
 room:RoomState;
 resources:Resource[];
 canDevelop:boolean;
 onEdit:()=>void;
 onOpenAvatarPicker:()=>void;
 onAddressInChat:()=>void;
 onOpenTask:(taskId:string)=>void;
 onClose:()=>void;
 hermes?:HermesAvailability|null;
}){
 const preset=findAvatarPreset(agent.avatarPresetId);
 const perms:RoomAgentPermissions=agentEffectivePermissions(agent);
 const job=agentJob(agent);
 const execStatus=agentExecutionStatus(agent,room,resources,hermes);
 const assignedDevice=agent.modelDevice?resources.find(r=>r.device===agent.modelDevice):null;

 const agentMessages=room.messages.filter(m=>m.senderAgent===agent.id||m.recipient===agent.id||m.handoff?.toAgent===agent.id);
 const relatedTaskIds=new Set<string>();
 for(const m of agentMessages){
  if(m.taskId)relatedTaskIds.add(m.taskId);
  if(m.topicTask)relatedTaskIds.add(m.topicTask);
 }
 const assignedTasks=room.tasks.filter(t=>relatedTaskIds.has(t.id));
 const projectRuns=room.runs.slice(0,6);

 const statusDot=execStatus.state==='running'?'running':execStatus.state==='ready'?'ready':'idle';

 return <section className="rw-fg-profile" aria-label={`Agentenprofil: ${agent.name}`}>
  <header className="rw-fg-profile-top">
   <div>
    <span className="rw-eyebrow">KI-TEAMMITGLIED · PROFIL & BERECHTIGUNGEN</span>
    <h2>{agent.name}{agent.nickname?<span className="rw-fg-nickname"> „{agent.nickname}“</span>:null}</h2>
   </div>
   <div className="rw-fg-profile-top-actions">
    {canDevelop&&<button type="button" className="rw-button subtle" onClick={onOpenAvatarPicker}><Sparkles size={14}/>Avatar wechseln</button>}
    {canDevelop&&<button type="button" className="rw-button subtle" onClick={onEdit}><Wrench size={14}/>Profil bearbeiten</button>}
    <button type="button" className="rw-icon" onClick={onClose} aria-label="Profil schließen"><X size={18}/></button>
   </div>
  </header>

  {/* 1. IDENTITÄT & GROSSES CHARAKTERPORTRAIT */}
  <div className="rw-fg-profile-hero">
   <div className="rw-fg-profile-portrait">
    <AgentAvatar agent={agent} size="xl" statusDot={statusDot}/>
    {canDevelop&&<button type="button" className="rw-link rw-fg-change-avatar" onClick={onOpenAvatarPicker}>Portrait ändern</button>}
   </div>
   <div className="rw-fg-profile-identity">
    <div className="rw-fg-identity-badges">
     <span className="rw-badge">{agentRoleLabels[agent.role]??agent.role}</span>
     {preset&&<span className="rw-badge">Charakter: {preset.name} ({preset.kind==='human'?'Mensch':'Tier'})</span>}
     <span className={`rw-fg-exec-pill ${execStatus.state}`}>{execStatus.label}</span>
    </div>
    <h3>Identität, Rolle & Charakter</h3>
    <dl className="rw-fg-dl">
     <div><dt>Name</dt><dd>{agent.name}{agent.nickname?` (Spitzname: ${agent.nickname})`:''}</dd></div>
     <div><dt>Rolle / Fachbereich</dt><dd>{agentRoleLabels[agent.role]??agent.role}</dd></div>
     <div><dt>Avatar-Portrait</dt><dd>{preset?`${preset.name} (${preset.id}.png)`:`Individuelles Kürzel (${agent.avatar||agent.name.slice(0,2).toUpperCase()})`}</dd></div>
     <div><dt>Beschreibung & Auftrag</dt><dd>{agent.purpose||preset?.defaultPurpose||'Noch keine Kurzbeschreibung hinterlegt.'}</dd></div>
     <div><dt>Kommunikationsstil & Persönlichkeit</dt><dd>{agent.personality||preset?.defaultPersonality||preset?.traits||'Sachlich, präzise und teamorientiert.'}</dd></div>
    </dl>
    <div className="rw-fg-profile-quick-actions">
     <button type="button" className="rw-button lime" onClick={onAddressInChat}><MessageSquare size={15}/>Zum Chat mit {agent.name}</button>
     {canDevelop&&<button type="button" className="rw-button subtle" onClick={onEdit}><Wrench size={15}/>Eigenschaften anpassen</button>}
    </div>
   </div>
  </div>

  <div className="rw-fg-profile-sections">
   {/* 2. TECHNISCHE KONFIGURATION */}
   <article className="rw-fg-section-card">
    <div className="rw-fg-section-head"><Cpu size={16}/><h3>Modell, Fachgebiete & Projektkontext</h3></div>
    <dl className="rw-fg-dl">
     <div>
      <dt>Ausgewähltes KI-Modell</dt>
      <dd><code>{agent.model}</code></dd>
     </div>
     <div>
      <dt>Tatsächlicher Modellzugang</dt>
      <dd>
       {execStatus.via==='hermes'
        ?execStatus.modelAvailable||execStatus.state==='running'
         ?<span className="rw-fg-ok">Verbunden – antwortet, wenn du schreibst</span>
         :<span className="rw-fg-warn">Verbunden, aber gerade nicht erreichbar</span>
        :execStatus.modelAvailable
        ?<span className="rw-fg-ok">Verfügbar über verbundenen Rechner{assignedDevice?` (${assignedDevice.name})`:''}</span>
        :<span className="rw-fg-warn">Kein verbundener Runner für <code>{agent.model}</code> aktiv – dient zur Planung & manuellen Koordination</span>}
      </dd>
     </div>
     <div>
      <dt>Zugeordneter Rechner</dt>
      <dd>{assignedDevice?`${assignedDevice.name} (${assignedDevice.online?'Online':'Offline'})`:agent.modelDevice?`Gerät ${agent.modelDevice} (nicht verbunden)`:'Automatisch (erster freigegebener Projekt-Runner)'}</dd>
     </div>
     <div>
      <dt>Projektkontext</dt>
      <dd>{room.project.title} (<code>{room.project.id}</code>)</dd>
     </div>
     <div>
      <dt>Verantwortungsbereich</dt>
      <dd>{agent.responsibility||agent.purpose||'Unterstützt das Projektteam innerhalb der freigegebenen Projektgrenzen.'}</dd>
     </div>
     <div>
      <dt>Fachgebiete & Wissen</dt>
      <dd>{agent.knowledgeScope||'Projektgespräch, Aufgaben, Entscheidungen und verknüpftes Repository.'}</dd>
     </div>
    </dl>

    <div className="rw-fg-subsection">
     <strong>Freigegebene Kontextquellen</strong>
     <div className="rw-fg-tag-row">
      {(agent.contextSources?.length?agent.contextSources:(['messages','tasks','decisions'] as const)).map(src=>(
       <span key={src} className="rw-cap-pill">{agentContextSourceLabels[src]??src}</span>
      ))}
     </div>
    </div>

    {/* Honest: only what the server really grants today (agent-run-http: read context, propose task, lead plans). */}
    <div className="rw-fg-subsection">
     <strong>Job im Team: {job.text}</strong>
     <ul className="rw-fg-can">
      {perms.readProject&&perms.writeMessages?<li className="yes">Antwortet, wenn man ihn holt (@Name, Direktchat, in einer Aufgabe)</li>:<li className="no">Antwortet gerade nicht (im Projekt pausiert)</li>}
      {job.lead&&<li className="yes">Plant, schlägt Aufgaben vor und gibt sie an das passende Teammitglied</li>}
      {job.lead&&<li className="yes">Stellt ein, wenn für etwas niemand da ist (höchstens 6 im Team, jede Rolle einmal)</li>}
      {!job.lead&&perms.manageTasks&&<li className="yes">Schlägt Aufgaben vor</li>}
      {job.code&&<li className="yes">Ändert Code in deiner Arbeitskopie einer Code-Aufgabe; du prüfst und gibst ab</li>}
      {job.web&&<li className="yes">Liest öffentliche Webseiten (höchstens drei pro Antwort)</li>}
      {job.review&&<li className="yes">Liest eingereichte Änderungen und gibt Rückmeldung</li>}
     </ul>
     <strong>Nicht sein Job</strong>
     <ul className="rw-fg-can">
      {!job.code&&<li className="no">Code ändern – das macht die Entwicklung</li>}
      {!job.web&&<li className="no">Im Web recherchieren – das macht die Recherche</li>}
      <li className="no">Zusammenführen oder live stellen – das entscheidest du</li>
     </ul>
    </div>
   </article>

   {/* 4. AKTIVITÄT & ARBEITSSTATUS */}
   <article className="rw-fg-section-card rw-fg-section-wide">
    <div className="rw-fg-section-head"><Layers size={16}/><h3>Arbeitsstatus, Aufgaben & Übergaben</h3></div>
    <div className="rw-fg-activity-grid">
     <div>
      <h4>Tatsächlicher Arbeitsstatus</h4>
      <p className="rw-fg-status-box">
       <strong>{execStatus.label}</strong>
       <small>Es werden keine KI-Unterhaltungen oder Ausführungen vorgetäuscht. Echte Läufe erscheinen nur bei aktivem Runner-Job.</small>
      </p>
      <h4>Zugeordnete Aufgaben ({assignedTasks.length})</h4>
      {!assignedTasks.length
       ?<p className="rw-muted">Noch keine Aufgaben mit diesem Agenten verknüpft.</p>
       :<ul className="rw-fg-mini-list">
        {assignedTasks.map(t=><li key={t.id}>
         <button type="button" className="rw-link" onClick={()=>onOpenTask(t.id)}>{t.title}</button>
         <small>{t.status==='done'?'Erledigt':t.status==='review'?'In Prüfung':t.status==='doing'?'In Arbeit':'Offen'}</small>
        </li>)}
       </ul>}
     </div>

     <div>
      <h4>Übergaben & Beiträge ({agentMessages.length})</h4>
      {!agentMessages.length
       ?<p className="rw-muted">Noch keine Nachrichten oder Übergaben.</p>
       :<ul className="rw-fg-mini-list">
        {agentMessages.slice(-5).reverse().map(m=>{
         const isHandoff=Boolean(m.handoff);
         const originLabel=m.origin==='verified-run'?'Verifizierter Modelllauf':'Manuell im Projekt erfasst';
         return <li key={m.id}>
          <strong>{isHandoff?`Übergabe: ${m.handoff?.summary}`:m.body.slice(0,90)}</strong>
          <small>{originLabel} · {time(m.created)}</small>
         </li>;
        })}
       </ul>}

      {projectRuns.length>0&&<>
       <h4>Projekt-Modellläufe ({projectRuns.length})</h4>
       <ul className="rw-fg-mini-list">
        {projectRuns.slice(0,3).map(r=><li key={r.id}>
         <strong>{r.deviceName} · {r.model}</strong>
         <small>Status: {r.status} · {time(r.updated??r.created)}</small>
        </li>)}
       </ul>
      </>}
     </div>
    </div>
   </article>
  </div>
 </section>;
}
