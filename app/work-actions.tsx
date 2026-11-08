'use client';
import {CheckCheck,Monitor,RefreshCw,Save,ShieldCheck} from 'lucide-react';
import {workActionState,type BarAction} from './workflow-step';

type Props={checkReady?:boolean;previewReady?:boolean;publishReady?:boolean;dirty:boolean;saving:boolean;loading:boolean;canSave:boolean;canRun:boolean;online:boolean;activeWork:boolean;recommended:BarAction|null;sharedReview?:boolean;
 onSave:()=>void;onChanges:()=>void;onCheck:()=>void;onPreview:()=>void;onReview:()=>void};

/** Short, visible explanations also describe disabled controls. */
export default function WorkActions({dirty,saving,loading,canSave,canRun,online,activeWork,recommended,onSave,onChanges,onCheck,onPreview,onReview,sharedReview=false,checkReady=true,previewReady=true,publishReady=true}:Props){
 const can=workActionState({dirty,canSave,canRun,saving,loading,online,activeWork});
 const actions=[
  {key:'save' as const,label:can.saveLabel,Icon:Save,run:onSave,enabled:can.save,help:'Datei auf deinem PC speichern. Kein Livegang.'},
  {key:'changes' as const,label:'Änderungen ansehen',Icon:RefreshCw,run:onChanges,enabled:can.changes,help:'Unterschiede zum letzten gesicherten Stand ansehen.'},
  {key:'check' as const,label:'Tests starten',Icon:CheckCheck,run:onCheck,enabled:can.check&&checkReady,help:'Eingerichtete Tests am gespeicherten Stand ausführen.'},
  {key:'preview' as const,label:'Vorschau erstellen',Icon:Monitor,run:onPreview,enabled:can.preview&&previewReady,help:previewReady?'Gespeicherten Stand bauen, danach im Browser ansehen.':'Vorschau zuerst in den Projekteinstellungen einrichten.'},
  {key:'review' as const,label:sharedReview?'Code zur Prüfung teilen':'Prüfstand erstellen',Icon:ShieldCheck,run:onReview,enabled:can.review&&(!sharedReview||publishReady),help:sharedReview?'Stand sichern, testen, Vorschau bauen und Branch mit dem Team teilen.':'Stand sichern, testen und im Studio zur Prüfung bereitstellen.'}
 ];
 // In a task, sharing for review is the task's own next step at the top; here only saving and the preview are main buttons.
 if(sharedReview){
  // Only say something when it matters; where the work runs (PC or server) is not the person's concern here.
  const simpleNote=saving?'Wird gespeichert …':loading?'Datei wird geladen …':dirty?'Noch nicht gespeichert.':!online?'Die Werkstatt ist gerade nicht erreichbar.':activeWork?'Die Werkstatt arbeitet gerade. Danach geht es weiter.':'';
  const main=actions.filter(a=>a.key==='save'||a.key==='preview'),more=actions.filter(a=>a.key==='check'||a.key==='changes');
  const button=({key,label,Icon,run,enabled}:typeof actions[number])=><button key={key} className={`button${key==='save'&&enabled?' primary recommended':''}`} disabled={!enabled} onClick={run}><Icon size={15}/> {label}</button>;
  return <div className="work-actions simple" role="group" aria-label="Speichern und Vorschau"><div className="work-actions-buttons">{main.map(button)}</div>{simpleNote&&<p className="work-actions-note" role="status">{simpleNote}</p>}<details className="work-actions-more"><summary>Tests und Unterschiede</summary><div className="work-actions-buttons">{more.map(button)}</div></details></div>;
 }
 return <div className="work-actions" role="group" aria-label="Speichern, Ergebnis ansehen und prüfen"><div className="work-actions-buttons">{actions.map(({key,label,Icon,run,enabled,help})=><div className="work-action" key={key}><button className={`button${recommended===key?' primary recommended':''}`} aria-describedby={`work-action-${key}-help work-actions-note`} disabled={!enabled} onClick={run}><Icon size={15}/> {label}</button><small id={`work-action-${key}-help`}>{help}</small></div>)}</div><p id="work-actions-note" className="work-actions-note" role="status">{can.note}</p></div>;
}
