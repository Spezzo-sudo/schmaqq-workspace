'use client';
import {guideIndex,type NextStep} from './workflow-step';
type Props={step:NextStep;active:boolean;onSetup:()=>void;onConfigure:()=>void;onInspect:()=>void;onCreate:()=>void;onReview:()=>void};
export default function DevelopmentGuide({step:next,active,onSetup,onConfigure,onInspect,onCreate,onReview}:Props){
 const step=guideIndex(next.stage);
 const button=next.action==='connect-pc'?<button className="button primary" onClick={onSetup}>PC verbinden</button>:next.action==='configure-project'?<button className="button primary" onClick={onConfigure}>Projekt lokal verbinden</button>:next.action==='inspect-git'?<button className="button primary" disabled={active} onClick={onInspect}>{next.tone==='error'?'Git erneut prüfen':'Git jetzt prüfen'}</button>:next.action==='create-copy'?<button className="button primary" onClick={onCreate}>Arbeitskopie anlegen</button>:next.action==='open-review'?<button className="button" onClick={onReview}>Prüfstände ansehen</button>:null;
 return <section className="development-guide" aria-label="Nächster Entwicklungsschritt"><ol>{['PC verbinden','Projekt & Git prüfen','Entwickeln & prüfen'].map((label,index)=><li key={label} aria-current={index===step?'step':undefined} className={index<=step?'reached':''}><span>{index<step?'✓':index+1}</span>{label}</li>)}</ol><div><div><h2>{next.title}</h2><p>{next.reason}</p>{next.cautions.map(text=><p key={text} className="muted">{text}</p>)}</div>{button}</div></section>;
}
