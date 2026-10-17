'use client';
import {useEffect,useRef,useState} from 'react';
import {letterPaths} from './brand-paths';

/** Original website outlines with a short, local wave; never navigates away from drafts. */
export default function StudioBrand({compact=false}:{compact?:boolean}){
 const [playing,setPlaying]=useState(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function replay(){
  window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  if(playing||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  setPlaying(true);timer.current=setTimeout(()=>setPlaying(false),1000);
 }
 return <button type="button" className={`studio-brand${compact?' compact':''}${playing?' is-playing':''}`} aria-label="SCHMAQQ Studio – nach oben" onClick={replay}>
  <svg viewBox="-12 -68 492 92" aria-hidden="true" focusable="false">{letterPaths.map((d,i)=><g key={i} style={{animationDelay:`${i*65}ms`}}><path d={d}/></g>)}<rect className="brand-period" x="444.17" y="-15.26" width="15.26" height="15.26"/></svg>
  {!compact&&<span className="brand-context">STUDIO / BUILD TOGETHER</span>}
 </button>;
}
