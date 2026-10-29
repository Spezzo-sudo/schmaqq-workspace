'use client';
import {useEffect,useRef,useState} from 'react';
import {letterPaths} from './brand-paths';

/** Original website outlines with a short, local wave. With onHome it returns to the Studio start
 * view inside the app (drafts stay stored); it never leaves Studio. */
export default function StudioBrand({compact=false,onHome}:{compact?:boolean;onHome?:()=>void}){
 const [playing,setPlaying]=useState(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function replay(){
  onHome?.();
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  if(playing||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  setPlaying(true);timer.current=setTimeout(()=>setPlaying(false),1000);
 }
 return <button type="button" className={`studio-brand${compact?' compact':''}${playing?' is-playing':''}`} aria-label={onHome?'SCHMAQQ Studio – zur Startansicht „Meine Arbeit“':'SCHMAQQ Studio – nach oben'} onClick={replay}>
  <svg viewBox="-12 -68 492 92" aria-hidden="true" focusable="false">{letterPaths.map((d,i)=><g key={i} style={{animationDelay:`${i*65}ms`}}><path d={d}/></g>)}<rect className="brand-period" x="444.17" y="-15.26" width="15.26" height="15.26"/></svg>
  {!compact&&<span className="brand-context">STUDIO / BUILD TOGETHER</span>}
 </button>;
}
