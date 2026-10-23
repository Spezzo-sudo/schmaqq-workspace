/**
 * One shared, testable decision for the next development step. Used by the
 * development guide (personal setup) and the change overview (one copy).
 * It only reads already loaded state; it never starts jobs or grants rights.
 */
export type StepAction='connect-pc'|'reconnect-pc'|'configure-project'|'inspect-git'|'create-copy'|'wait'|'run-check'|'run-preview'|'observe'|'create-review'|'request-review'|'open-review'|'review-feedback'|'publish'|'edit'|'none';
export type StepStage='pc'|'project'|'copy'|'work'|'review'|'done';
export type NextStep={stage:StepStage;action:StepAction;title:string;reason:string;tone:'info'|'warning'|'error';cautions:string[]};

export type SetupInput={hasDevice:boolean;online:boolean;projectStatus:'configured'|'missing'|'unknown';inspection?:{status:string;ready:boolean}|null};
export type CopyInput={status:string;own:boolean;online:boolean;revoked?:boolean;archived?:boolean};
export type Evidence={status:string;changedAfter:boolean;freshness?:'same'|'changed'|'unverified';state?:string;published?:boolean}|null|undefined;
export type EvidenceInput={check?:Evidence;preview?:Evidence;review?:Evidence;published?:boolean;observed?:boolean;observing?:boolean;previewConfigured?:boolean};
export type StepInput={setup?:SetupInput;hasCopy?:boolean;copy?:CopyInput;active?:boolean;reviewCount?:number;evidence?:EvidenceInput};

const running=['queued','running','cancelling'],failed=['failed','interrupted','cancelled'];
const failureLabel:Record<string,string>={failed:'fehlgeschlagen',interrupted:'unterbrochen',cancelled:'abgebrochen'};
const step=(stage:StepStage,action:StepAction,title:string,reason:string,tone:NextStep['tone']='info',cautions:string[]=[]):NextStep=>({stage,action,title,reason,tone,cautions});

function setupStep({hasDevice,online,projectStatus,inspection}:SetupInput,hasCopy:boolean,cautions:string[]):NextStep|null{
 if(!hasDevice)return step('pc','connect-pc','Verbinde zuerst deinen PC','Dein PC führt Code, Tests und Codex aus. Das Studio verbindet eure Arbeit.');
 if(!online)return step('pc','reconnect-pc','Deinen PC wieder verbinden','Der ausgewählte PC meldet sich gerade nicht. Starte auf diesem PC den bereits eingerichteten Studio-Runner. Du musst keinen neuen PC registrieren. Deine Arbeitskopien bleiben erhalten.','warning');
 if(projectStatus==='missing')return step('project','configure-project','Dieses Projekt auf deinem PC einrichten','Dein PC ist verbunden, aber dieses Projekt ist dort noch nicht freigegeben. Ergänze die bestehende Runner-Konfiguration, statt einen neuen Zugang anzulegen.','warning');
 // Older runners never report projects; keep working but say what is unconfirmed.
 if(projectStatus==='unknown')cautions.push('Dein PC hat dieses Projekt noch nicht aktuell gemeldet. Runner neu starten oder aktualisieren; die Online-Anzeige allein bestätigt keinen Projektzugriff.');
 if(hasCopy)return null;
 if(inspection&&running.includes(inspection.status))return step('project','wait','Git-Verbindung wird geprüft','Das Ergebnis erscheint, sobald dein PC die Prüfung abgeschlossen hat.','info',cautions);
 if(inspection&&(inspection.status!=='completed'||!inspection.ready))return step('project','inspect-git','Git-Verbindung braucht Aufmerksamkeit','Die letzte Prüfung von Repository, Hauptzweig oder Git-Identität war nicht erfolgreich. Ergebnis im Entwicklungsverlauf lesen, den genannten Punkt beheben und erneut prüfen.','error',cautions);
 if(!inspection)return step('project','inspect-git','Git-Verbindung für dieses Projekt prüfen','Prüfe zuerst Repository, Hauptzweig und lokale Git-Identität. Eine Online-Meldung allein bestätigt diese Verbindung nicht.','info',cautions);
 return step('copy','create-copy','Erstelle deine erste Arbeitskopie','Gib deiner Arbeit einen Namen und wähle eine Aufgabe. Du erhältst eine eigene Arbeitskopie.','info',cautions);
}

function copyStep({status,own,online,revoked,archived}:CopyInput):NextStep|null{
 if(archived)return step('done','none','Arbeitskopie abgeschlossen','Die Reservierung ist freigegeben; die Dateien bleiben auf dem PC erhalten.');
 if(status==='queued')return step('copy','wait','Arbeitskopie wartet auf den PC','Die Erstellung beginnt, sobald der PC den Auftrag übernimmt.');
 if(status==='running')return step('copy','wait','Arbeitskopie wird erstellt','Die Erstellung läuft auf dem PC.');
 if(status==='cancelling')return step('copy','wait','Erstellung wird abgebrochen','Der PC bestätigt den Abbruch.');
 if(failed.includes(status))return own
  ?step('copy',status==='interrupted'?'reconnect-pc':'create-copy',`Erstellung ${failureLabel[status]}`,status==='interrupted'?'PC wieder verbinden und den unterbrochenen Start im Entwicklungsverlauf prüfen.':'Details stehen im Entwicklungsverlauf. Danach eine neue Arbeitskopie anlegen.','error')
  :step('copy','none',`Erstellung ${failureLabel[status]}`,'Die zuständige Person muss die Arbeitskopie neu starten.','warning');
 if(status!=='completed')return step('copy','none','Status der Arbeitskopie unbekannt','Entwicklungsverlauf prüfen.','warning');
 if(own&&revoked)return step('pc','connect-pc','PC-Zugang widerrufen','Dieser PC darf keine Aufträge mehr ausführen. Verbinde einen PC neu; gespeicherte Dateien bleiben erhalten.','error');
 if(own&&!online)return step('pc','reconnect-pc','Deinen PC wieder verbinden, um weiterzuarbeiten.','Tests, Vorschau und Dateiaufträge laufen nur, wenn dein PC verbunden ist.','warning');
 return null;
}

function evidenceStep(own:boolean,e:EvidenceInput,cautions:string[]):NextStep{
 const {check,preview,review}=e;
 if(preview&&failed.includes(preview.status))cautions.push(`Letzte Vorschau ${failureLabel[preview.status]}.`);
 else if(preview?.changedAfter)cautions.push('Letzte Vorschau zeigt einen älteren Stand.');
 if(!own){
  if(!review)return step('work','none','Aufgabe und Anforderungen abstimmen.','Die zuständige Person hat noch keinen Prüfstand erstellt.','info',cautions);
  if(review.changedAfter)return step('review','none','Neueren Prüfstand bei der zuständigen Person anfordern.','Seit diesem Prüfstand wurde weiter geändert.','warning',cautions);
  if(review.state==='approved')return step('done','none','Freigabe und weitere Schritte gemeinsam abstimmen.','Dieser Commit ist freigegeben.','info',cautions);
  if(review.state==='changes_requested')return step('review','none','Überarbeiteten Stand abwarten.','Für diesen Prüfstand wurden Änderungen angefordert.','info',cautions);
  return step('review','open-review','Prüfstand öffnen und Rückmeldung geben.','Die zuständige Person wartet auf eine zweite Prüfung.','info',cautions);
 }
 if(e.observing)return step('work','wait','Dateiabgleich läuft.','Das Ergebnis erscheint, sobald dein PC den Abgleich abgeschlossen hat.','info',cautions);
 if(!check)return step('work','run-check','Änderungen ansehen und Tests ausführen.','Für diese Arbeitskopie gibt es noch keinen Testlauf.','info',cautions);
 if(running.includes(check.status))return step('work','wait','Tests laufen.','Das Ergebnis erscheint, sobald dein PC den Testlauf abgeschlossen hat.','info',cautions);
 if(failed.includes(check.status))return step('work','run-check',`Letzter Test ${failureLabel[check.status]}: Ausgabe ansehen, Fehler beheben und erneut testen.`,'Ein nicht bestandener Test ist kein Nachweis für den aktuellen Stand.','error',cautions);
 if(check.status!=='completed')return step('work','run-check','Teststatus unbekannt: Tests erneut ausführen.','Der letzte Testlauf hat keinen bekannten Abschluss.','warning',cautions);
 if(check.changedAfter)return step('work','run-check','Seit dem letzten Test geändert: Tests erneut ausführen.','Der bestandene Test gilt für einen älteren Stand.','warning',cautions);
 if(check.freshness!=='same'){
  if(!e.observed)return step('work','observe','Dateistand abgleichen.','Der Testlauf ist noch keinem Dateistand zugeordnet. Ein Abgleich zeigt, ob er zum aktuellen Stand passt.','warning',cautions);
  cautions.push('Der Testlauf hat keinen Dateinachweis, zum Beispiel von einem älteren Runner.');
 }
 // Suggest a preview before the first review only when this PC reports a preview build.
 if(!review&&e.previewConfigured&&(!preview||preview.status!=='completed'||preview.changedAfter))return step('work','run-preview','Vorschau erstellen und ansehen.','Tests sind bestanden. Prüfe das Ergebnis in der Vorschau, bevor du den Stand einreichst.','info',cautions.filter(text=>!/Vorschau/.test(text)));
 if(!review)return step('review','create-review','Aktuellen Stand zur Teamprüfung einreichen.','Tests sind bestanden; es gibt noch keinen Prüfstand.','info',cautions);
 if(review.changedAfter)return step('review','create-review','Aktuellen Stand zur Teamprüfung einreichen.','Seit dem letzten Prüfstand wurde weiter geändert.','warning',cautions);
 if(review.state==='unavailable'||!review.state)return step('review','create-review','Neuen Prüfstand erstellen.','Der letzte Prüfstand hat keinen prüfbaren Commit.','error',cautions);
 if(review.state==='changes_requested')return step('review','review-feedback','Rückmeldung lesen und Änderungen abstimmen.','Die zweite Person hat Änderungen angefordert.','warning',cautions);
 if(review.state!=='approved')return step('review','request-review','Zweite Person um Prüfung dieses Commits bitten.','Ein Prüfstand gilt erst nach unabhängiger Freigabe.','info',cautions);
 return (e.published??review.published)
  ?step('done','none','PR und gemeinsame Übernahme prüfen.','Branch ist veröffentlicht; PR, Merge und Live-Status sind nicht bestätigt.','info',cautions)
  :step('done','publish','Freigegebenen Stand prüfen und bei Bedarf veröffentlichen.','Dieser Commit ist unabhängig freigegeben.','info',cautions);
}

export function nextStep(input:StepInput):NextStep{
 const cautions:string[]=[];
 const hasCopy=input.hasCopy??!!input.copy;
 if(input.setup){const s=setupStep(input.setup,hasCopy,cautions);if(s)return s;}
 if(input.copy){const s=copyStep(input.copy);if(s)return {...s,cautions:[...cautions,...s.cautions]};}
 if(input.active)return step('work','wait','Dein PC arbeitet am Auftrag','Du kannst den Fortschritt im Verlauf verfolgen. Weitere Änderungen starten, sobald dieser Auftrag beendet ist.','info',cautions);
 if(input.evidence)return evidenceStep(input.copy?.own??true,input.evidence,cautions);
 if(input.reviewCount)return step('review','open-review',`${input.reviewCount} ${input.reviewCount===1?'Prüfstand wartet':'Prüfstände warten'} auf dich`,'Öffne die gemeinsame Prüfung, lies die Änderungen und gib eine Rückmeldung.','info',cautions);
 return step('work','edit','Deine Arbeitskopie ist bereit','Bearbeite eine Datei oder gib Codex einen Auftrag. Prüfe das Ergebnis mit Tests und Vorschau und teile es zur Teamprüfung.','info',cautions);
}

/** Jobs whose result is shown on the page instead of a dialog. */
export const inlineOperations=['check','preview','status','inspect'];

/** Own-copy job a step can start directly, with its button label; other steps have no direct job. */
export const stepJobs:Partial<Record<StepAction,{operation:string;label:string}>>={
 'run-check':{operation:'check',label:'Tests ausführen'},
 'run-preview':{operation:'preview',label:'Vorschau erstellen'},
 observe:{operation:'status',label:'Dateistand abgleichen'},
 'create-review':{operation:'review',label:'Prüfstand erstellen'},
 'inspect-git':{operation:'inspect',label:'Git erneut prüfen'}
};

/** Which editor bar actions are available. Tests, preview and review check saved files only. */
export function workActionState({dirty,canSave,canRun}:{dirty:boolean;canSave:boolean;canRun:boolean}){
 const verify=canRun&&!dirty;
 return {save:canSave,changes:canRun,check:verify,preview:verify,review:verify,
  note:dirty?'Erst speichern: Tests, Vorschau und Prüfstand prüfen den gespeicherten Stand.':null};
}

/** Guide position: 0 PC, 1 project/Git/copy, 2 develop and verify. */
export function guideIndex(stage:StepStage){return stage==='pc'?0:stage==='project'||stage==='copy'?1:2;}
