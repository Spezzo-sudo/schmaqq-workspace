import {useEffect,type ReactNode} from 'react';

// The few building blocks every screen uses. One look, one place.

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
/** A header line for a screen: back, title (optionally tappable), and room for one action. */
export function Bar({onBack,title,sub,onTitle,end}:{onBack?:()=>void;title:ReactNode;sub?:ReactNode;onTitle?:()=>void;end?:ReactNode}){
 const head=<><b>{title}</b>{sub&&<small>{sub}</small>}</>;
 return <header className="ui-bar">
  {onBack&&<button className="ui-icon" aria-label="Zurück" onClick={onBack}><Back/></button>}
  {onTitle?<button className="ui-bar-title" onClick={onTitle}>{head}</button>:<div className="ui-bar-title">{head}</div>}
  {end}
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
