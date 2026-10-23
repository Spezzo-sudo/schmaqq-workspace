'use client';
import {useId,useState} from 'react';
import {glossary} from './workflow-terms';

/** A technical word with a short explanation that opens on click or tap, also on touch devices. */
export default function Term({name,children}:{name:keyof typeof glossary|string;children?:React.ReactNode}){
 const [open,setOpen]=useState(false),id=useId();
 const text=glossary[name];
 if(!text)return <>{children??name}</>;
 return <span className="term">{children??name}<button type="button" className="term-help" aria-expanded={open} aria-controls={id} aria-label={`Was bedeutet „${name}“?`} onClick={()=>setOpen(!open)}>?</button>{open&&<span id={id} role="note" className="term-text">{text}</span>}</span>;
}
