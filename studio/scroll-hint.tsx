import {useEffect,useState} from 'react';
import {ChevronDown} from 'lucide-react';

/** A small ink square with a lime chevron (like the period in the logo) when the page goes on below.
 * Disappears at the end of the page; a tap scrolls most of a screen further. */
export default function ScrollHint(){
 const [box,setBox]=useState<HTMLElement|null>(null);
 useEffect(()=>{
  const check=()=>{
   // The scrolling area differs per page (page, project content, main); take the tallest one that scrolls.
   const areas=[...document.querySelectorAll<HTMLElement>('.rw-main, .rw-main > *, .rw-main > * > *, .team-project-content > *, .r3-inspector-body, .r5-chat-list')]
    .filter(e=>e.scrollHeight>e.clientHeight+40&&['auto','scroll'].includes(getComputedStyle(e).overflowY)).sort((a,b)=>b.clientHeight-a.clientHeight);
   const panel=areas.find(e=>e.classList.contains('r3-inspector-body'));
   const found=panel??areas[0]??(document.documentElement.scrollHeight>innerHeight+40?document.scrollingElement as HTMLElement:null);
   const more=found&&found.scrollTop+found.clientHeight<found.scrollHeight-48;
   setBox(more?found:null);
  };
  check();const timer=setInterval(check,700);
  document.addEventListener('scroll',check,true);addEventListener('resize',check);
  return()=>{clearInterval(timer);document.removeEventListener('scroll',check,true);removeEventListener('resize',check);};
 },[]);
 if(!box)return null;
 return <div className="studio-scroll-hint" aria-hidden="false"><button aria-label="Weiter nach unten" onClick={()=>box.scrollBy({top:box.clientHeight*.75,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}><ChevronDown size={16} strokeWidth={3}/></button></div>;
}
