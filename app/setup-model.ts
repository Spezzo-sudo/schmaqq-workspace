/**
 * One-time setup as a checklist. Pure: it only reads reported state and never
 * treats an online heartbeat as project access or a Git check as write rights.
 */
export type SetupState='done'|'todo'|'attention'|'wait'|'blocked'|'optional';
export type SetupStep={id:'pc'|'project'|'git'|'trial'|'ai'|'publish';label:string;state:SetupState;detail:string;required:boolean};
export type SetupInput={hasDevice:boolean;online:boolean;revoked?:boolean;projectStatus:'configured'|'missing'|'unknown';
 inspection?:{status:string;ready:boolean}|null;hasCopy:boolean;checkPassed:boolean;codexReady:boolean;codexAllowed:boolean;publishAllowed:boolean};

const running=['queued','running','cancelling'];

export function setupSteps(i:SetupInput){
 const pc:SetupStep=!i.hasDevice?{id:'pc',label:'PC verbinden',state:'todo',required:true,detail:'Dein PC führt Dateien, Tests und Vorschauen aus. Lege einmal einen Runner-Zugang an und starte den Runner auf deinem PC.'}
  :i.revoked?{id:'pc',label:'PC verbinden',state:'attention',required:true,detail:'Der Zugang dieses PCs wurde widerrufen. Verbinde den PC neu; gespeicherte Dateien bleiben erhalten.'}
  :!i.online?{id:'pc',label:'PC verbinden',state:'attention',required:true,detail:'Dein PC ist eingerichtet, meldet sich aber gerade nicht. Starte dort den vorhandenen Runner neu; ein neuer Zugang ist nicht nötig.'}
  :{id:'pc',label:'PC verbinden',state:'done',required:true,detail:'Dein PC ist verbunden.'};
 const pcReady=pc.state==='done';
 const project:SetupStep=!pcReady?{id:'project',label:'Projekt auf deinem PC einrichten',state:'blocked',required:true,detail:i.hasDevice?'Wird bestätigt, sobald dein PC wieder verbunden ist.':'Zuerst muss dein PC verbunden sein.'}
  :i.projectStatus==='configured'?{id:'project',label:'Projekt auf deinem PC einrichten',state:'done',required:true,detail:'Dein PC hat dieses Projekt freigegeben.'}
  :i.projectStatus==='missing'?{id:'project',label:'Projekt auf deinem PC einrichten',state:'todo',required:true,detail:'Dein PC ist verbunden, kennt dieses Projekt aber noch nicht. Ergänze das vorhandene Runnerprofil mit dem Einrichtungsplan und starte den Runner neu.'}
  :{id:'project',label:'Projekt auf deinem PC einrichten',state:'attention',required:true,detail:'Dein PC hat noch keine aktuelle Projektmeldung geschickt. Starte den Runner neu oder aktualisiere ihn; die Online-Anzeige allein bestätigt keinen Projektzugriff.'};
 // A legacy runner without project reports may still pass the Git check, so "unknown" does not block it.
 // Results already reached stay done while the PC is offline; only open steps wait for it.
 const gitOpen=pcReady&&i.projectStatus!=='missing';
 const git:SetupStep=i.inspection?.status==='completed'&&i.inspection.ready?{id:'git',label:'Git-Verbindung prüfen',state:'done',required:true,detail:'Letzter Lesecheck bestanden. Schreibrechte und Tests werden separat geprüft.'}
  :!gitOpen?{id:'git',label:'Git-Verbindung prüfen',state:'blocked',required:true,detail:'Zuerst müssen PC und Projekt eingerichtet sein.'}
  :i.inspection&&running.includes(i.inspection.status)?{id:'git',label:'Git-Verbindung prüfen',state:'wait',required:true,detail:'Dein PC prüft Repository, Hauptzweig und Git-Identität.'}
  :i.inspection?{id:'git',label:'Git-Verbindung prüfen',state:'attention',required:true,detail:'Die letzte Prüfung war nicht erfolgreich. Ergebnis lesen, den genannten Punkt beheben und erneut prüfen.'}
  :{id:'git',label:'Git-Verbindung prüfen',state:'todo',required:true,detail:'Prüfe einmal Repository, Hauptzweig und lokale Git-Identität.'};
 const trial:SetupStep=i.hasCopy&&i.checkPassed?{id:'trial',label:'Probelauf: Arbeitskopie und Tests',state:'done',required:true,detail:'Eine eigene Arbeitskopie besteht und Tests liefen erfolgreich.'}
  :git.state!=='done'||!pcReady?{id:'trial',label:'Probelauf: Arbeitskopie und Tests',state:'blocked',required:true,detail:'Zuerst müssen PC und Git-Prüfung bereit sein.'}
  :{id:'trial',label:'Probelauf: Arbeitskopie und Tests',state:'todo',required:true,detail:i.hasCopy?'Führe in deiner Arbeitskopie einmal die Tests aus.':'Lege eine eigene Arbeitskopie an und führe einmal die Tests aus.'};
 const ai:SetupStep={id:'ai',label:'Persönliche KI (optional)',required:false,state:i.codexReady?'done':'optional',
  detail:i.codexReady?'Deine Codex-Anmeldung ist für dieses Projekt gemeldet.':!i.codexAllowed?'Für dieses Projekt lokal gesperrt. Dateien, Tests und Vorschau funktionieren ohne KI.':'Erlaubt, aber deine eigene Codex-Anmeldung auf dem PC fehlt.'};
 const publish:SetupStep={id:'publish',label:'Veröffentlichen (optional)',required:false,state:i.publishAllowed?'done':'optional',
  detail:i.publishAllowed?'Branches dürfen von deinem PC zum Git-Remote übertragen werden. Das ist kein Deployment.':'Lokal gesperrt. Tests, Vorschau und Prüfstände bleiben nutzbar.'};
 const steps=[pc,project,git,trial,ai,publish],required=steps.filter(s=>s.required);
 const done=required.filter(s=>s.state==='done').length;
 return {steps,done,total:required.length,complete:done===required.length,current:required.find(s=>s.state!=='done')?.id??null};
}
