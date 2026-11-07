'use client';
import {useState} from 'react';
import type {StatusSuggestion} from './workflow-step';

/** One explicit button for a suggested task status; the status never changes without it. */
export default function StatusSuggestionBox({suggestion,disabled=false,onApply}:{suggestion:StatusSuggestion|null;disabled?:boolean;onApply:(status:string)=>Promise<void>}){
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 if(!suggestion)return null;
 async function apply(){if(!suggestion)return;setPending(true);setError('');try{await onApply(suggestion.status);}catch(e){setError(e instanceof Error?e.message:'Status konnte nicht geändert werden.');}finally{setPending(false);}}
 return <div className="status-suggestion" role="group" aria-label="Vorschlag für den Aufgabenstatus"><p><small>{suggestion.reason}</small></p><button className="button" disabled={pending||disabled} onClick={()=>void apply()}>{pending?'Wird gesetzt …':suggestion.label}</button>{error&&<p className="form-error" role="alert">{error}</p>}</div>;
}
