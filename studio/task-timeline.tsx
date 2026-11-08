import {useState} from 'react';
import {Check} from 'lucide-react';
import type {Stage} from './task-next-step';

/** The whole way of a task at a glance: done, now, next. Details for every step one tap away. */
export default function TaskTimeline({stages}:{stages:Stage[]}){
 const [open,setOpen]=useState(false);
 const now=stages.find(s=>s.state==='now');
 return <section className="task-timeline" aria-label="So geht es mit dieser Aufgabe weiter">
  <ol className="task-timeline-track" style={{gridTemplateColumns:`repeat(${stages.length},minmax(0,1fr))`}}>
   {stages.map((s,i)=><li key={s.label} className={s.state} aria-current={s.state==='now'?'step':undefined}>
    <span className="task-timeline-dot" aria-hidden="true">{s.state==='done'?<Check size={14} strokeWidth={3}/>:i+1}</span>
    <span className="task-timeline-label">{s.label}<span className="sr-only">{s.state==='done'?' (erledigt)':s.state==='now'?' (jetzt)':''}</span></span>
   </li>)}
  </ol>
  {now&&<p className="task-timeline-now"><strong>Jetzt: {now.label}.</strong> {now.detail}</p>}
  <button className="rw-link" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?'Weniger anzeigen':'Alle Schritte erklären'}</button>
  {open&&<ol className="task-timeline-list">{stages.map((s,i)=><li key={s.label} className={s.state}><strong>{i+1}. {s.label}</strong> {s.detail}</li>)}</ol>}
 </section>;
}
