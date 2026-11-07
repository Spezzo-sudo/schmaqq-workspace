import {ExternalLink,Palette} from 'lucide-react';
const root='https://github.com/Spezzo-sudo/NetzKontor/blob/92aad74781c03c7414d5a7adfd6c0568ad82c99b/';
const colors=[
 {name:'Ink',value:'#111225'},
 {name:'Paper',value:'#f1efe8'},
 {name:'Acid',value:'#d9ff6b'},
 {name:'Coral',value:'#ff6f59'}
] as const;
/** Source-backed read-only built-in design reference, never a new invented theme. */
export default function DesignReference(){
 return <section className="rw-design-reference" aria-label="SCHMAQQ-Designsystem – gemeinsame Designvorlage">
  <header><span className="rw-eyebrow"><Palette size={16}/> SCHMAQQ / VERBINDLICHE GESTALTUNGSBASIS</span></header>
  <h3>Unsere Designvorlage ist hier zu finden.</h3>
  <p>Diese produktive Workspace-Oberfläche übernimmt die Farb- und Formgrundlagen der bestehenden SCHMAQQ-Website. Die Website bleibt die Referenz für Marke, Typografie, Abstände und Bewegung. Ein Workspace muss nicht identisch aussehen, aber erkennbar zur selben Marke gehören.</p>
  <div className="rw-design-swatches">{colors.map(color=><div key={color.name} className="rw-design-swatch"><i style={{background:color.value}}/><span>{color.name}<br/>{color.value}</span></div>)}</div>
  <div className="rw-design-links">
   <a href={root+'marketing/site/assets/entry-root.css'} target="_blank" rel="noopener noreferrer">Website-Tokens <ExternalLink size={12}/></a>
   <a href={root+'marketing/site/assets/styles.css'} target="_blank" rel="noopener noreferrer">Website-Komponenten <ExternalLink size={12}/></a>
   <a href={root+'docs/DESIGN_SYSTEM_CONVERGENCE_PLAN.md'} target="_blank" rel="noopener noreferrer">Gestaltungsregeln <ExternalLink size={12}/></a>
   <a href={root+'brand/v1-chaos-to-order/BRAND_DIRECTION_V1.md'} target="_blank" rel="noopener noreferrer">Neuere Markenrichtung V1 <ExternalLink size={12}/></a>
  </div>
  <small>Quelle: NetzKontor (historischer Repositoryname), Commit 92aad747. Die V1-Markenrichtung enthält alternative Farbtöne und ist nicht automatisch eine Freigabe, das funktionierende animierte SCHMAQQ-Logo zu ersetzen.</small>
 </section>;
}
