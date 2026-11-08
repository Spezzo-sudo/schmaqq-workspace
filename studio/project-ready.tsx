import {useEffect,useRef,useState} from 'react';
import {Check} from 'lucide-react';
import ProjectConnect from './project-connect';
import {roomRequest,type Resource,type RoomMember,type RoomState} from './room-model';
import {githubState,githubNotice,linkGithub,type GithubAccess,type GithubApp} from './github-link';

/**
 * "Startklar": everything a project needs before work starts, in one place and in order.
 * Code on GitHub → Werkstatt ready → how changes go live. Each open step has one sentence and one button.
 */
export default function ProjectReady({room,resources,members,userId,onRepository,onRefresh}:{room:RoomState;resources:Resource[];members:RoomMember[];userId:string;onRepository:()=>void;onRefresh:()=>Promise<void>}){
 const [app,setApp]=useState<GithubApp|null>(null),[access,setAccess]=useState<GithubAccess|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[setup,setSetup]=useState(false),[open,setOpen]=useState(false);
 const setupPanel=useRef<HTMLDivElement|null>(null);
 const project=room.project.id,meta=room.meta as RoomState['meta']&{live?:'merge'|'manual';liveHow?:string;createdBy?:string};
 const [liveHow,setLiveHow]=useState(meta.liveHow??'');
 const decides=members.find(m=>m.id===userId)?.role==='owner'||meta.createdBy===userId;
 useEffect(()=>{let active=true;githubState(project).then(s=>{if(active){setApp(s.app);setAccess(s.access);}});
  const back=githubNotice();if(back){setNotice(back.notice);if(back.error)setError(back.error);}
  return()=>{active=false;};},[project,meta.repository]);
 const ready=resources.filter(r=>r.online&&r.development?.some(p=>p.id===project));
 const own=resources.find(r=>r.owner===userId);
 // Done only with Studio's GitHub App access. An older deploy-key setup counts only where the app
 // cannot be set up at all; otherwise the card offers the connection instead of a false check mark.
 const appPossible=!!app&&(app.configured||app.canCreate);
 const code=!!meta.repository&&(access?.access===true||!appPossible&&ready.length>0);
 const workshop=ready.length>0;
 const live=!!meta.live;
 const done=[code,workshop,live].filter(Boolean).length;
 async function act(run:()=>Promise<unknown>){setBusy(true);setError('');try{await run();}catch(e){setError((e as Error).message);setBusy(false);}}
 async function chooseLive(value:'merge'|'manual',how?:string){setBusy(true);setError('');try{await roomRequest('/api/team',{action:'live',project,revision:meta.revision,live:value,...(how!==undefined?{liveHow:how}:{})});await onRefresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(!app||!access)return <section className="po-ready" aria-label="Startklar"><p role="status">Einrichtung wird geprüft …</p></section>;
 // Complete: one quiet line; details stay reachable.
 if(done===3&&!open)return <section className="po-ready done" aria-label="Startklar"><p><Check size={16} aria-hidden="true"/> <strong>Startklar.</strong> Code, Werkstatt und Live-Weg sind eingerichtet.</p><button className="rw-button subtle" onClick={()=>setOpen(true)}>Ansehen</button></section>;
 const step=(ok:boolean,title:string,body:React.ReactNode)=><li className={ok?'ok':''}><span className="po-ready-mark" aria-hidden="true">{ok?<Check size={14}/>:null}</span><div><strong>{title}</strong>{body}</div></li>;
 return <section className="po-ready" aria-labelledby="po-ready-title">
  <h2 id="po-ready-title">Startklar machen <span>{done} von 3</span></h2>
  {notice&&<p role="status">{notice}</p>}{error&&<p className="rw-error" role="alert">{error}</p>}
  <ol>
   {step(code,'Code auf GitHub',code?<p>{access.access?'Studio arbeitet mit '+access.repository+'.':'Verbunden mit '+meta.repository?.replace('https://github.com/','')+'.'}{access.access&&access.protected===false&&<> Tipp: <a href={`https://github.com/${access.repository}/settings/branches`} target="_blank" rel="noreferrer">„{access.base}“ bei GitHub schützen ↗</a></>}</p>
    :!meta.repository?<><p>Mit welchem Code arbeitet ihr?</p><button className="rw-button lime" disabled={busy} onClick={onRepository}>Code auf GitHub auswählen</button></>
    :app.configured?<><p>Studio braucht einmal Zugriff auf {meta.repository.replace('https://github.com/','')}. GitHub fragt dich, welche Projekte Studio sehen darf.</p><button className="rw-button lime" disabled={busy} onClick={()=>void act(()=>linkGithub('install'))}>Zugriff bei GitHub erlauben</button></>
    :app.canCreate?<><p>Einmalig: Studio meldet sich bei GitHub an. GitHub zeigt dir, was Studio darf, und du bestätigst.</p><button className="rw-button lime" disabled={busy} onClick={()=>void act(()=>linkGithub('create'))}>Mit GitHub verbinden</button></>
    :<p>Der Inhaber verbindet Studio einmal mit GitHub. Danach geht es hier weiter.</p>)}
   {step(workshop,'Werkstatt',workshop?<p>Bereit: Tests und Vorschau laufen auf {ready.map(r=>r.name).join(', ')}.</p>
    :!code?<p>Kommt nach dem Code.</p>
    :own?<><p>Die Werkstatt baut, testet und zeigt euch eine Vorschau. Einmal einrichten, dann läuft sie von selbst.</p><button className="rw-button lime" disabled={busy} aria-expanded={setup} onClick={()=>{setSetup(!setup);requestAnimationFrame(()=>setupPanel.current?.scrollIntoView({block:'nearest'}));}}>{setup?'Einrichtung schliessen':'Werkstatt einrichten'}</button></>
    :<p>Die Werkstatt wird noch vom Inhaber eingerichtet.</p>)}
   {step(live,'Live gehen',<>
    {/* Two calm choices. Studio itself never puts anything online; the choice only tells Studio whether a separate live step exists. */}
    {decides?<div className="po-live-choice" role="radiogroup" aria-label="Wie kommt eine Änderung online?">
     <button role="radio" aria-checked={meta.live==='manual'} disabled={busy} onClick={()=>void chooseLive('manual')}><strong>Wir schalten selbst live</strong><small>Nach dem Übernehmen macht jemand den Livegang, z. B. über Hermes.</small></button>
     <button role="radio" aria-checked={meta.live==='merge'} disabled={busy} onClick={()=>void chooseLive('merge')}><strong>Geht von selbst live</strong><small>Nur wählen, wenn euer Hoster jede übernommene Änderung selbst veröffentlicht.</small></button>
    </div>:<p>{meta.live==='merge'?'Übernommene Änderungen gehen von selbst live.':meta.live==='manual'?'Ihr schaltet selbst live.':'Legt der Inhaber fest.'}</p>}
    {meta.live==='manual'&&(decides?<form className="po-live-how" onSubmit={e=>{e.preventDefault();void chooseLive('manual',liveHow.trim());}}><label>Wie genau? (sieht jeder in der Aufgabe)<input value={liveHow} maxLength={300} onChange={e=>setLiveHow(e.target.value)} placeholder="Zum Beispiel: Marco startet den Hermes-Auftrag production-deploy-main."/></label>{liveHow.trim()!==(meta.liveHow??'')&&<button className="rw-button" disabled={busy}>Speichern</button>}</form>
     :meta.liveHow&&<p>So geht's: <strong>{meta.liveHow}</strong></p>)}
   </>)}
  </ol>
  {setup&&<div ref={setupPanel} tabIndex={-1}><ProjectConnect project={project} projectTitle={room.project.title} initialDevice={own?.device??''} resources={resources} userId={userId} onDone={async()=>{setSetup(false);await onRefresh();}}/></div>}
  {done===3&&<button className="rw-button subtle" onClick={()=>setOpen(false)}>Zuklappen</button>}
 </section>;
}
