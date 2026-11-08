import {useState} from 'react';
import {ArrowRightToLine,Eye,Flag,Globe,Pencil,type LucideIcon} from 'lucide-react';
import type {Stage} from './task-next-step';

const icons:Record<string,LucideIcon>={Ändern:Pencil,Erledigen:Pencil,Anschauen:Eye,Übernehmen:ArrowRightToLine,Live:Globe,Fertig:Flag};
const stateText={done:'Erledigt',now:'Jetzt',next:'Kommt noch'};

/** The way of a task as round symbols: lime = done, dark ring = now, light coral = still to come. Tap a step for a short explanation. */
export default function TaskTimeline({stages}:{stages:Stage[]}){
 const [open,setOpen]=useState<number|null>(null);
 const shown=open===null?null:stages[open];
 return <section className="task-timeline" aria-label="Weg dieser Aufgabe">
  <ol className="task-timeline-track">
   {stages.map((s,i)=>{const Icon=icons[s.label]??Pencil;return <li key={s.label} className={s.state}>
    <button className="task-timeline-dot" aria-label={`${i+1}. ${s.label} – ${stateText[s.state]}`} aria-expanded={open===i} aria-current={s.state==='now'?'step':undefined} onClick={()=>setOpen(open===i?null:i)}><Icon size={20} strokeWidth={2.2} aria-hidden="true"/></button>
   </li>;})}
  </ol>
  {shown&&<p className="task-timeline-tip" role="status"><strong>{shown.label}</strong><span className={'task-timeline-state '+shown.state}>{stateText[shown.state]}</span><br/>{shown.detail}</p>}
 </section>;
}
