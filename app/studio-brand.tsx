'use client';
import {useEffect,useRef,useState} from 'react';
import {letterPaths} from './brand-paths';

/** Original website outlines with a short, local wave. With onHome it returns to the Studio start
 * view inside the app (drafts stay stored); it never leaves Studio. */
export default function StudioBrand({compact=false,onHome,tag=false}:{compact?:boolean;onHome?:()=>void;tag?:boolean}){
 const [playing,setPlaying]=useState(false),[delays,setDelays]=useState<number[]>([]),timer=useRef<ReturnType<typeof setTimeout>|null>(null),svg=useRef<SVGSVGElement|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 /** The wave starts where the finger or mouse touched the word and runs outwards (keyboard: from the left). */
 function replay(e:React.MouseEvent<HTMLButtonElement>){
  onHome?.();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({top:0,behavior:reduced?'auto':'smooth'});
  if(playing||reduced)return;
  const box=svg.current?.getBoundingClientRect(),parts=[...(svg.current?.querySelectorAll<SVGGraphicsElement>('g,.brand-period')??[])];
  const origin=box&&e.detail>0?e.clientX:box?.left??0;
  setDelays(parts.map(part=>{const r=part.getBoundingClientRect();return Math.round(Math.abs(r.left+r.width/2-origin)/Math.max(box?.width??1,1)*420);}));
  setPlaying(true);timer.current=setTimeout(()=>setPlaying(false),1100);
 }
 const delay=(i:number)=>({animationDelay:(delays[i]??i*65)+'ms'});
 return <button type="button" className={`studio-brand${compact?' compact':''}${tag?' with-tag':''}${playing?' is-playing':''}`} aria-label={onHome?'SCHMAQQ Studio – zur Startansicht „Meine Arbeit“':'SCHMAQQ Studio – nach oben'} onClick={replay}>
  <svg ref={svg} viewBox="-12 -68 492 92" aria-hidden="true" focusable="false">{letterPaths.map((d,i)=><g key={i} style={delay(i)}><path d={d}/></g>)}<rect className="brand-period" style={delay(letterPaths.length)} x="444.17" y="-15.26" width="15.26" height="15.26"/></svg>
  {tag&&<span className="brand-tag" aria-hidden="true">Studio</span>}
  {!compact&&<span className="brand-context">STUDIO / BUILD TOGETHER</span>}
 </button>;
}
