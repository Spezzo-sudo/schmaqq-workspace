'use client';
import {CheckCheck,Monitor,RefreshCw,Save,ShieldCheck} from 'lucide-react';
import {workActionState} from './workflow-step';

type Props={dirty:boolean;saving:boolean;canSave:boolean;canRun:boolean;status:string;
 onSave:()=>void;onChanges:()=>void;onCheck:()=>void;onPreview:()=>void;onReview:()=>void};

/** Action bar that stays at the top of the editor while scrolling. */
export default function WorkActions({dirty,saving,canSave,canRun,status,onSave,onChanges,onCheck,onPreview,onReview}:Props){
 const can=workActionState({dirty,canSave,canRun});
 return <div className="work-actions" role="toolbar" aria-label="Arbeitskopie speichern und prüfen">
  <div className="work-actions-buttons">
   <button className="button primary" disabled={!can.save} onClick={onSave}><Save size={15}/> {saving?'Speichert …':'Speichern'}</button>
   <button className="button" disabled={!can.changes} onClick={onChanges}><RefreshCw size={15}/> Änderungen</button>
   <button className="button" disabled={!can.check} onClick={onCheck}><CheckCheck size={15}/> Tests</button>
   <button className="button" disabled={!can.preview} onClick={onPreview}><Monitor size={15}/> Vorschau</button>
   <button className="button" disabled={!can.review} onClick={onReview}><ShieldCheck size={15}/> Prüfstand erstellen</button>
  </div>
  <p className="work-actions-note" role="status">{can.note??status}</p>
 </div>;
}
