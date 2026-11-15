import {useCallback,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {ArrowUpRight,FolderOpen,RefreshCw,Save,X} from 'lucide-react';
import SourceEditor from '../app/source-editor';
import type {TeamWorkspace} from '../app/team-workspaces';
import type {Device} from '../app/development-model';
import {ownProjectCopies} from './messenger-state';
import {roomRequest,type RoomState} from './room-model';

export function MessengerInspector({title,overlay=false,wide=false,onClose,navigation,children}:{title:string;overlay?:boolean;wide?:boolean;onClose:()=>void;navigation?:ReactNode;children:ReactNode}){
 const panel=useRef<HTMLElement|null>(null),heading=useId();
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const frame=requestAnimationFrame(()=>panel.current?.querySelector<HTMLButtonElement>('[data-close-detail]')?.focus({preventScroll:true}));
  return()=>{cancelAnimationFrame(frame);if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});};
 },[]);
 return <>
  {overlay&&<button className="r3-detail-backdrop" tabIndex={-1} aria-label="Detailbereich schliessen" onClick={onClose}/>}
  <aside ref={panel} className={'r3-inspector'+(wide?' wide':'')} role={overlay?'dialog':'complementary'} aria-modal={overlay||undefined} aria-labelledby={heading} onKeyDown={event=>{
   const modal=document.activeElement?.closest('[role="dialog"][aria-modal="true"]');
   if(event.defaultPrevented||(modal&&modal!==panel.current))return;
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();return;}
   if(!overlay||event.key!=='Tab')return;
   const items=[...panel.current!.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex="0"]')].filter(n=>n.getClientRects().length&&!n.closest('[hidden],[inert]'));
   const first=items[0],last=items.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }}>
   <header className="r3-inspector-head"><h2 id={heading}>{title}</h2><button type="button" className="r3-icon-button" data-close-detail aria-label="Detailbereich schliessen" onClick={onClose}><X size={20}/></button></header>
   {navigation&&<div className="r3-inspector-navigation">{navigation}</div>}
   <div className="r3-inspector-body">{children}</div>
  </aside>
 </>;
}

type FileState={devices:Device[];workspaces:TeamWorkspace[];activeDeviceIds:string[]};
/** Reuses the real runner file API, editor, revision checks and draft store. */
export function ProjectFiles({room,userId,onTask,onTasks,onSetup}:{room:RoomState;userId:string;onTask:(id:string)=>void;onTasks:()=>void;onSetup:()=>void}){
 const selectionKey='studio:files-copy:'+userId+':'+room.project.id;
 const [data,setData]=useState<FileState|null>(null),[error,setError]=useState(''),[selected,setSelected]=useState(()=>{try{return sessionStorage.getItem(selectionKey)??'';}catch{return '';}}),[dirty,setDirty]=useState(false);
 const alive=useRef(true),sequence=useRef(0);
 const refresh=useCallback(async()=>{
  const current=++sequence.current;
  try{
   const next=await roomRequest<FileState>('/api/development');
   if(alive.current&&current===sequence.current){setData(next);setError('');}
  }catch(e){if(alive.current&&current===sequence.current)setError((e as Error).message);}
 },[]);
 useEffect(()=>{
  alive.current=true;void refresh();
  const timer=setInterval(()=>{if(!document.hidden)void refresh();},10000);
  return()=>{alive.current=false;sequence.current++;clearInterval(timer);};
 },[refresh]);
 const copies=ownProjectCopies(data?.workspaces??[],userId,room.project.id);
 // Pin the selected copy. A polling update must never switch the editor to a newly created copy.
 useEffect(()=>{if(!selected&&copies[0])setSelected(copies[0].id);},[selected,data?.workspaces]);
 useEffect(()=>{if(selected){try{sessionStorage.setItem(selectionKey,selected);}catch{}}},[selected,selectionKey]);
 const copy=copies.find(w=>w.id===selected)??(!selected?copies[0]:undefined);
 const device=data?.devices.find(d=>d.id===copy?.device),online=!!device&&Date.now()-device.seen<30000;
 const active=!!copy&&!!data?.activeDeviceIds.includes(copy.device);
 return <section className="r3-project-files" aria-label="Projektdateien">
  <p className="r3-panel-intro">Dateien deiner Arbeitskopie. Gemeinsame Dokumentation liegt unter Wissen; Änderungen und Vorschauen bleiben mit ihrer Aufgabe verknüpft.</p>
  {error&&<p className="rw-error" role="alert">{error}<button type="button" className="rw-link" onClick={()=>void refresh()}>Erneut laden</button></p>}
  {!data&&!error&&<p role="status">Arbeitskopien werden geladen …</p>}
  {data&&!copies.length&&<div className="r3-empty-panel"><FolderOpen size={30}/><h3>Noch keine eigene Arbeitskopie</h3><p>Öffne eine Aufgabe und starte dort die Bearbeitung. Studio verwendet anschliessend genau diese Dateien – kein zweites Dateisystem.</p><button className="rw-button lime" onClick={onTasks}>Aufgaben öffnen</button><button className="rw-link" onClick={onSetup}>Projekteinrichtung ansehen</button></div>}
  {!!copies.length&&<>
   <label className="r3-copy-picker">Arbeitskopie<select aria-label="Arbeitskopie für Projektdateien" value={copy?.id??selected} disabled={dirty} onChange={e=>setSelected(e.target.value)}>{copies.map(w=><option value={w.id} key={w.id}>{w.title} · {w.deviceName}</option>)}</select></label>
   {copy?<>
    <div className="r3-file-context"><span>{online?'Verbunden':'Werkstatt offline'}{dirty?' · Ungespeicherter Entwurf':''}</span>{copy.taskId&&<button className="rw-link" onClick={()=>onTask(copy.taskId!)}>Zur Aufgabe<ArrowUpRight size={14}/></button>}</div>
    {!online&&<p className="r3-panel-intro">Die Dateizugriffe warten auf die freigegebene Werkstatt. Dein vorhandener Entwurf bleibt erhalten.</p>}
    <SourceEditor key={copy.device+':'+copy.id} userId={userId} project={room.project.id} device={copy.device} worktree={copy.id} scope={copy.scope} tree busy={!online||active||!!error} onChange={refresh} onDirtyChange={setDirty} toolbar={editor=><div className="r3-editor-toolbar"><button className="rw-button lime" disabled={!editor.canSave} onClick={editor.save}><Save size={15}/>{editor.saving?'Speichert …':'Speichern'}</button><span>{editor.dirty?'Noch nicht gespeichert':'Revisionengebundener Dateizugriff'}</span><button className="r3-icon-button" aria-label="Arbeitskopien aktualisieren" disabled={editor.pending} onClick={()=>void refresh()}><RefreshCw size={15}/></button></div>}/>
   </>:<p role="status">Diese Arbeitskopie ist nicht mehr verfügbar. Wähle eine aktuelle eigene Kopie.</p>}
  </>}
 </section>;
}
