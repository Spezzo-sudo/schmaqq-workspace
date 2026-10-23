'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {readDraft,storeDraft,type EditorSnapshot as Snapshot} from './editor-drafts';
import {autoOpenFile,groupFiles} from './editor-files';
export type EditorState={dirty:boolean;pending:boolean;saving:boolean;canSave:boolean;save:()=>void};
export default function SourceEditor({userId,device,project,worktree,scope='',busy,onChange,toolbar,onDirtyChange,children}:{userId:string;device:string;project:string;worktree:string;scope?:string;busy:boolean;onChange:()=>Promise<void>;toolbar?:(editor:EditorState)=>ReactNode;onDirtyChange?:(dirty:boolean)=>void;children?:ReactNode}){
 const [wrap,setWrap]=useState(true),[saving,setSaving]=useState(false),[showAll,setShowAll]=useState(false);
 const draftKey=[userId,device,project,worktree].join(':');
 const [remembered]=useState(()=>readDraft(draftKey));
 const [showRestoredDraft,setShowRestoredDraft]=useState(!!remembered);
 const [files,setFiles]=useState<string[]>([]),[snapshot,setSnapshot]=useState<Snapshot|null>(remembered?.snapshot??null),[draft,setDraft]=useState(remembered?.text??''),[current,setCurrent]=useState<Snapshot|null>(null),[pending,setPending]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[filter,setFilter]=useState('');
 const dirty=!!snapshot&&draft!==snapshot.content;
 useEffect(()=>{if(snapshot)storeDraft(draftKey,snapshot,draft);},[draftKey,snapshot,draft]);
 useEffect(()=>{onDirtyChange?.(dirty);},[dirty]);
 useEffect(()=>()=>onDirtyChange?.(false),[]);
 async function run(operation:string,extra:Record<string,string>={}){
  setPending(true);setError('');setNotice('');
  try{
   const r=await fetch('/api/development',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'job',operation,device,project,worktree,...extra})});const data=await r.json() as {id:string;error?:string};if(!r.ok)throw new Error(data.error);
   await onChange();
   for(let n=0;n<120;n++){
    const response=await fetch('/api/development/job?id='+encodeURIComponent(data.id));const result=await response.json() as {error?:string;job:{status:string;result:Snapshot&{files:string[];truncated?:boolean;error?:string}}};if(!response.ok)throw new Error(result.error);
    if(result.job.status==='completed'){await onChange();return result.job.result;}
    if(!['queued','running'].includes(result.job.status))throw new Error(result.job.result?.error??'Dateiauftrag wurde gestoppt.');
    await new Promise(resolve=>setTimeout(resolve,1000));
   }
   throw new Error('Der PC antwortet noch nicht. Der Auftrag bleibt im Entwicklungsverlauf sichtbar. Dort den Abschluss prüfen, bevor du erneut speicherst.');
  }catch(e){setError(e instanceof Error?e.message:'Dateiauftrag fehlgeschlagen.');return null;}finally{setPending(false);}
 }
 async function loadFiles(){const r=await run('files');if(r){setFiles(r.files);setNotice(r.truncated?'Die ersten 2.000 Dateien werden angezeigt.':'Dateiliste aktualisiert.');}return r?.files??null;}
 // Only the path of the last opened file is remembered in this browser, never its content.
 const lastFileKey='studio:last-file:'+draftKey;
 async function openFile(file:string){const r=await run('read-file',{file});if(r){setSnapshot(r);setDraft(r.content);setCurrent(null);setShowRestoredDraft(false);try{localStorage.setItem(lastFileKey,file);}catch{}}}
 async function save(){if(!snapshot)return;setSaving(true);try{const r=await run('save-file',{file:snapshot.file,revision:snapshot.revision,content:draft});if(r){setSnapshot({...snapshot,content:draft,revision:r.revision});setCurrent(null);setShowRestoredDraft(false);setNotice('Datei auf deinem PC gespeichert.');}}finally{setSaving(false);}}
 // Load the file list once as soon as the PC can answer; the button stays for manual reloads.
 const listed=useRef(false);
 useEffect(()=>{if(busy||listed.current)return;listed.current=true;const restored=!!snapshot;void loadFiles().then(list=>{
  if(!list||restored)return;let last:string|null=null;try{last=localStorage.getItem(lastFileKey);}catch{}
  const file=autoOpenFile(list,scope,last);if(file)void openFile(file);
 });},[busy]);
 const canSave=dirty&&!pending&&!busy;
 const groups=groupFiles(files,scope,filter),listFiles=groups.task.length&&!showAll&&!filter.trim()?[]:groups.other;
 const fileButton=(file:string)=><button className={`text-button${snapshot?.file===file?' active':''}`} aria-current={snapshot?.file===file?'true':undefined} title={file} key={file} disabled={pending||busy||dirty} onClick={()=>void openFile(file)}>{file}</button>;
 return <section id="source-editor" className="panel source-editor"><div className="section-title"><h2>Dateien bearbeiten</h2><button id="source-files-load" className="button" disabled={busy||pending} onClick={loadFiles}>Dateien laden</button></div>{toolbar?.({dirty,pending,saving,canSave,save:()=>void save()})}{children}<p>Hier änderst du Dateien deiner eigenen Arbeitskopie. Gespeichert wird auf deinem PC; andere sehen die Änderung erst, wenn du sie zur Prüfung gibst. Bearbeitbar sind Textdateien bis 64 KB.</p>{error&&<p className="form-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{pending&&<p role="status">{saving?'Wird auf deinem PC gespeichert …':'Warte auf deinen PC …'}</p>}<div className="source-layout"><div className="source-browser"><label htmlFor="source-filter">Datei auswählen</label><input id="source-filter" aria-label="Dateien filtern" placeholder="Datei suchen" value={filter} onChange={e=>setFilter(e.target.value)}/>{!!groups.task.length&&<><p className="source-group-label">Dateien dieser Aufgabe</p><div className="source-file-list task-files">{groups.task.map(fileButton)}</div>{!filter.trim()&&!!groups.other.length&&<button className="text-button source-show-all" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll?'Weitere Dateien ausblenden':`Alle weiteren Dateien (${groups.other.length})`}</button>}</>}<div className="source-file-list">{listFiles.map(fileButton)}</div></div><div className="source-document">{snapshot?<><div className="source-document-head"><strong className="source-filename">{snapshot.file}</strong><label className="source-wrap"><input type="checkbox" checked={wrap} onChange={e=>setWrap(e.target.checked)}/> Zeilen umbrechen</label></div>{showRestoredDraft&&dirty&&<p className="draft-indicator">Ungespeicherter Entwurf in diesem Tab erhalten.</p>}<textarea className={`source-code${wrap?' wrap':''}`} wrap={wrap?'soft':'off'} aria-label="Dateiinhalt" spellCheck={false} value={draft} disabled={pending} onChange={e=>setDraft(e.target.value)}/><p className="muted">{dirty?'Ungespeicherter Entwurf. Vor dem Dateiwechsel speichern oder verwerfen.':'Stand gespeichert.'} Beim Wechsel zwischen Bereichen bleibt dein Entwurf in diesem Tab erhalten. Vor dem Schließen speichern oder herunterladen.</p><div className="dev-buttons editor-actions"><button className="button primary" disabled={!canSave} onClick={()=>void save()}>Speichern</button><button className="button" disabled={pending||busy} onClick={async()=>{const r=await run('read-file',{file:snapshot.file});if(r)setCurrent(r);}}>Aktuellen Stand vergleichen</button><button className="button" disabled={!dirty||pending} onClick={()=>{if(window.confirm('Ungespeicherten Entwurf verwerfen?')){setDraft(snapshot.content);setShowRestoredDraft(false);}}}>Entwurf verwerfen</button><button className="button" onClick={()=>{const url=URL.createObjectURL(new Blob([draft],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=snapshot.file.split('/').at(-1)??'entwurf.txt';a.click();URL.revokeObjectURL(url);}}>Entwurf herunterladen</button></div>{current&&<><h3>Aktueller Stand auf deinem PC</h3><pre className="dev-output">{current.content}</pre><p>Dein Entwurf oben bleibt erhalten. Übertrage die gewünschten Änderungen und bestätige diesen Vergleichsstand vor dem erneuten Speichern.</p><button className="button" disabled={pending} onClick={()=>{setSnapshot(current);setCurrent(null);setNotice('Vergleichsstand übernommen. Dein Entwurf ist unverändert und kann jetzt gespeichert werden.');}}>Vergleichsstand als Basis übernehmen</button></>}</>:<p className="muted">{files.length?'Wähle eine Datei aus der Liste.':'Die Dateiliste wird geladen, sobald dein PC verbunden ist.'} Dateien mit Zugangsdaten und Verknüpfungen sind gesperrt.</p>}</div></div></section>;
}
