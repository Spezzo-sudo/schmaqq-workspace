import {useState} from 'react';
import {Copy,X} from 'lucide-react';

/** Task handoff to a ChatGPT/Claude chat that already has the Studio connection.
 * Only IDs and instructions; no credentials, no provider deep link, and no model is started here. */
export function externalHandoff({projectTitle,project,taskTitle,task,kind}:{projectTitle:string;project:string;taskTitle:string;task:string;kind:'general'|'code'}){
 return [
  `Bitte bearbeite diese SCHMAQQ-Studio-Aufgabe über die verbundene Studio-Verbindung.`,
  `Projekt: ${projectTitle} (project: ${project})`,
  `Aufgabe: ${taskTitle} (task: ${task})`,
  `Art: ${kind==='code'?'Codeaufgabe':'Allgemeine Aufgabe'}`,
  '',
  '1. Rufe project_context mit project und task auf. Dort stehen Ziel und Abschlusskriterien.',
  '2. Lies Quelltext nur über Studio: list_workspaces, dann start_code_job (prepare mit task, files, read-file; größere Dateien abschnittsweise mit offset).',
  kind==='code'
   ?'3. Speichere Änderungen mit save-file, führe check aus und erstelle mit review einen Prüfstand. Nichts veröffentlichen; Teilen und Freigabe passieren in Studio.'
   :'3. Ändere keine Dateien. Fasse das Ergebnis mit Fundstellen zusammen und trenne Nachweise von Vermutungen. Ich trage es in Studio unter „Ergebnis festhalten“ ein.',
  '4. Nenne Job-IDs und berichte Testergebnisse als vom Rechner gemeldet.'
 ].join('\n');
}

export default function ExternalAssistant(props:{projectTitle:string;project:string;taskTitle:string;task:string;kind:'general'|'code';onClose:()=>void;onResult?:()=>void}){
 const text=externalHandoff(props),[copied,setCopied]=useState(''),[failed,setFailed]=useState(false);
 return <section className="team-callout external-assistant" aria-label="Mit ChatGPT oder Claude bearbeiten">
  <header className="rw-row-actions"><h3>Mit ChatGPT oder Claude bearbeiten</h3><button type="button" className="rw-icon" aria-label="Übergabe schließen" onClick={props.onClose}><X size={18}/></button></header>
  <p>Die KI arbeitet in deinem eigenen Chat mit der dort verbundenen Studio-Verbindung. Dieser Bereich startet kein Modell. Kopiere den Auftrag und füge ihn dort ein. Verbindungen verwaltest du unter <strong>Mein Konto → Verbundene KI-Assistenten</strong>.</p>
  <label>Auftrag für den Chat<textarea readOnly rows={9} value={text} onFocus={e=>e.currentTarget.select()}/></label>
  <div className="rw-row-actions">
   <button type="button" className="rw-button lime" onClick={()=>{setFailed(false);void navigator.clipboard?.writeText(text).then(()=>setCopied(text)).catch(()=>setFailed(true));}}><Copy size={16}/>{copied===text?'Kopiert':'Auftrag kopieren'}</button>
   {props.kind==='general'&&props.onResult&&<button type="button" className="rw-button" onClick={props.onResult}>Antwort als Ergebnis festhalten</button>}
  </div>
  {failed&&<p className="rw-error" role="alert">Kopieren nicht möglich. Markiere den Text im Feld und kopiere ihn selbst.</p>}
  <small>Noch nicht verbunden? Die Adresse zum Verbinden steht unter Mein Konto → „Dein ChatGPT verbinden“; dort siehst und trennst du auch verbundene Assistenten.</small>
 </section>;
}
