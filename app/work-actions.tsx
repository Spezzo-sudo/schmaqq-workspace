'use client';
import {CheckCheck,Monitor,RefreshCw,Save,ShieldCheck} from 'lucide-react';
import {workActionState,type BarAction} from './workflow-step';

type Props={dirty:boolean;saving:boolean;loading:boolean;canSave:boolean;canRun:boolean;online:boolean;activeWork:boolean;recommended:BarAction|null;
 onSave:()=>void;onChanges:()=>void;onCheck:()=>void;onPreview:()=>void;onReview:()=>void};

/** Action bar that stays at the top of the editor while scrolling; only the recommended button is highlighted. */
export default function WorkActions({dirty,saving,loading,canSave,canRun,online,activeWork,recommended,onSave,onChanges,onCheck,onPreview,onReview}:Props){
 const can=workActionState({dirty,canSave,canRun,saving,loading,online,activeWork});
 const style=(action:BarAction)=>`button${recommended===action?' primary recommended':''}`;
 const hint=(action:BarAction)=>recommended===action?{'aria-describedby':'work-actions-recommended'}:{};
 return <div className="work-actions" role="toolbar" aria-label="Arbeitskopie speichern und prüfen">
  <div className="work-actions-buttons">
   <button className={style('save')} {...hint('save')} disabled={!can.save} onClick={onSave}><Save size={15}/> {can.saveLabel}</button>
   <button className={style('changes')} {...hint('changes')} disabled={!can.changes} onClick={onChanges}><RefreshCw size={15}/> Änderungen</button>
   <button className={style('check')} {...hint('check')} disabled={!can.check} onClick={onCheck}><CheckCheck size={15}/> Tests</button>
   <button className={style('preview')} {...hint('preview')} disabled={!can.preview} onClick={onPreview}><Monitor size={15}/> Vorschau</button>
   <button className={style('review')} {...hint('review')} disabled={!can.review} onClick={onReview}><ShieldCheck size={15}/> Prüfstand erstellen</button>
  </div>
  <p className="work-actions-note" role="status">{can.note}{recommended&&<span id="work-actions-recommended" className="visually-hidden"> Empfohlener nächster Schritt.</span>}</p>
 </div>;
}
