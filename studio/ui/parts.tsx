import {useEffect,useRef,useState,type MouseEvent,type ReactNode} from 'react';
import {letterPaths} from './brand-paths';

// The few building blocks every screen uses. One look, one place.

export function Brand({onHome}:{onHome?:()=>void}={}){
 const mark=useRef<SVGSVGElement>(null),timer=useRef<ReturnType<typeof setTimeout>>(null);
 const [delays,setDelays]=useState<number[]|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 function activate(event:MouseEvent<HTMLAnchorElement>){
  if(event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!mark.current){
   if(onHome){event.preventDefault();onHome();}
   return;
  }
  event.preventDefault();
  if(timer.current)return;
  const box=mark.current.getBoundingClientRect();
  const origin=event.detail>0?Math.min(box.right,Math.max(box.left,event.clientX)):box.left;
  const parts=[...mark.current.querySelectorAll('g')];
  const wave=parts.map(part=>{
   const bounds=part.getBoundingClientRect();
   return Math.round(Math.abs(bounds.left+bounds.width/2-origin)/Math.max(box.width,1)*420);
  });
  const goHome=location.pathname!=='/'||location.search||location.hash;
  setDelays(wave);
  timer.current=setTimeout(()=>{
   timer.current=null;setDelays(null);
   if(onHome)onHome();
   else if(goHome)location.assign('/');
   else window.scrollTo(0,0);
  },Math.max(...wave,0)+360);
 }
 return <a href="/" onClick={activate} aria-label="SCHMAQQ Studio – Start" className={'ui-brand'+(delays?' is-playing':'')}>
  <svg ref={mark} viewBox="-12 -68 492 92" aria-hidden="true" focusable="false">
   {letterPaths.map((d,i)=><g key={i} style={{animationDelay:(delays?.[i]??0)+'ms'}}><path d={d}/></g>)}
   <g style={{animationDelay:(delays?.[letterPaths.length]??0)+'ms'}}><rect x="444.17" y="-15.26" width="15.26" height="15.26"/></g>
  </svg><b>STUDIO</b>
 </a>;
}

export function ScrollHint(){
 const anchor=useRef<HTMLDivElement>(null),[show,setShow]=useState(false);
 useEffect(()=>{
  const element=anchor.current,screen=element?.parentElement;
  if(!screen)return;
  const viewport=window.visualViewport;
  const update=()=>{
   const editing=document.activeElement?.matches('input,textarea,[contenteditable=true]');
   const keyboard=viewport&&window.innerHeight-viewport.height>120;
   setShow(!editing&&!keyboard&&screen.scrollHeight-screen.clientHeight-screen.scrollTop>28);
  };
  let frame=0;
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
  const observer=new ResizeObserver(schedule);
  const observeContent=()=>{
   observer.disconnect();observer.observe(screen);
   for(const child of screen.children)if(child!==element)observer.observe(child);
   schedule();
  };
  const changes=new MutationObserver(observeContent);
  changes.observe(screen,{childList:true,subtree:true});
  observeContent();
  screen.addEventListener('scroll',schedule,{passive:true});
  document.addEventListener('focusin',schedule);document.addEventListener('focusout',schedule);
  viewport?.addEventListener('resize',schedule);
  return ()=>{
   changes.disconnect();observer.disconnect();cancelAnimationFrame(frame);screen.removeEventListener('scroll',schedule);
   document.removeEventListener('focusin',schedule);document.removeEventListener('focusout',schedule);
   viewport?.removeEventListener('resize',schedule);
  };
 },[]);
 return <div className="ui-scroll-hint" ref={anchor}>{show&&<button className="ui-icon" aria-label="Weiter nach unten" onClick={()=>{
  const screen=anchor.current?.parentElement;
  screen?.scrollBy({top:screen.clientHeight*.75,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }}>⌄</button>}</div>;
}

export function Dialog({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 useEffect(()=>{const f=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};addEventListener('keydown',f);return()=>removeEventListener('keydown',f);},[onClose]);
 return <div className="ui-sheet-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
  <section className={'ui-dialog'+(wide?' wide':'')} role="dialog" aria-modal="true" aria-label={title}>
   <header><h2>{title}</h2><button className="ui-icon" aria-label="Schließen" onClick={onClose}><Close/></button></header>
   <div className="ui-dialog-body">{children}</div>
  </section>
 </div>;
}
export function Field({label,hint,children}:{label:string;hint?:string;children:ReactNode}){
 return <label className="ui-field"><span>{label}</span>{children}{hint&&<small>{hint}</small>}</label>;
}
/** A screen heading with room for a title, supporting text and one action. */
export function Bar({onBack,title,sub,onTitle,end}:{onBack?:()=>void;title:ReactNode;sub?:ReactNode;onTitle?:()=>void;end?:ReactNode}){
 const head=<><b>{title}</b>{sub&&<small>{sub}</small>}</>;
 return <header className="ui-bar">
  {onBack&&<button className="ui-icon ui-bar-back" aria-label="Zurück" onClick={onBack}><Back/></button>}
  <Brand/>
  <div className="ui-bar-heading">
   {onTitle?<button className="ui-bar-title" onClick={onTitle}>{head}</button>:<div className="ui-bar-title">{head}</div>}
   {end}
  </div>
 </header>;
}
export function Section({title,children,id,end}:{title:string;children:ReactNode;id?:string;end?:ReactNode}){
 return <section className="ui-section" id={id}><div className="ui-section-head"><h3 className="ui-label">{title}</h3>{end}</div>{children}</section>;
}
export const ErrorLine=({text}:{text:string})=>text?<p className="ui-error" role="alert">{text}</p>:null;

function icon(d:string){
 const Icon=()=><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
 Icon.displayName='Icon';return Icon;
}
export const Back=icon('M15 5l-7 7 7 7');
export const Close=icon('M6 6l12 12M18 6L6 18');
export const Plus=icon('M12 5v14M5 12h14');
export const Send=icon('M4 12l16-8-6 16-3-7-7-1z');
export const Info=icon('M12 8h.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z');
export const More=icon('M5 12h.01M12 12h.01M19 12h.01');
export const Mark=icon('M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4');

export function Checklist({title,items,selected,onChange}:{title:string;items:{id:string;name:string}[];selected:string[];onChange:(v:string[])=>void}){
 if(!items.length)return null;
 return <fieldset className="ui-check-options"><legend>{title}</legend>{items.map(item=><label key={item.id}>
  <input type="checkbox" checked={selected.includes(item.id)} onChange={e=>onChange(e.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/>
  {item.name}
 </label>)}</fieldset>;
}
