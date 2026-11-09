import {useState} from 'react';
import {ChevronDown,Crosshair,Play,Trash2} from 'lucide-react';
import type {RoomTab} from './room-model';

/**
 * "So funktioniert Studio": the way of a change as a tappable chain, what appears only later and why,
 * who may do what, and a personal practice round. Same sections as docs/ANLEITUNG.md – change both together.
 */
export type GuideTarget={page?:'rooms'|'team'|'account';project?:boolean;tab?:RoomTab;selector:string};
type Step={id:string;title:string;who:string;what:string;then:string;where:string;target?:GuideTarget};

export const guideSteps:Step[]=[
 {id:'startklar',title:'Projekt startklar machen',who:'Projekt-Admin, einmal pro Projekt',what:'Code auf GitHub auswählen, die Werkstatt einrichten (dort laufen Tests und Vorschau) und festlegen, wie ihr live geht.',then:'Danach gibt es bei Code-Aufgaben „Änderung machen“ und die Vorschau.',where:'Projekt → Einstellungen → Startklar machen',target:{project:true,tab:'connect',selector:'.po-ready'}},
 {id:'aufgabe',title:'Aufgabe anlegen',who:'Entwickler',what:'Im Projekt oben „+ Aufgabe“. Oder im Projektgespräch aus einer Nachricht eine Aufgabe machen.',then:'Die Aufgabe steht unter Aufgaben. Wer sie übernimmt, sieht sie unter „Meine Arbeit“.',where:'Projekt → „+ Aufgabe“',target:{project:true,tab:'overview',selector:'.team-head .rw-button.lime'}},
 {id:'aendern',title:'Ändern',who:'wer die Aufgabe übernommen hat',what:'„Aufgabe übernehmen“, dann unter „Ändern“: „Selbst bearbeiten“ im Editor oder mit deiner KI. Ohne KI geht es immer.',then:'Sobald eine Änderung gespeichert ist, erscheint „Zur Prüfung geben“.',where:'Projekt → Aufgaben → Aufgabe öffnen',target:{project:true,tab:'tasks',selector:'.team-task-list'}},
 {id:'pruefung',title:'Zur Prüfung geben',who:'wer geändert hat',what:'Studio testet die Änderung und baut eine Vorschau. Das dauert ein paar Minuten; du siehst, was gerade passiert.',then:'Die Prüfer sehen auf „Meine Arbeit“: „Bitte anschauen und freigeben“.',where:'In der Aufgabe, oben',target:{page:'rooms',selector:'.home-hero'}},
 {id:'passt',title:'Anschauen und freigeben',who:'Prüfer – eine zweite Person (oder der Admin allein, wenn das Projekt es erlaubt)',what:'Vorschau öffnen, Änderungen ansehen, dann „Diese Fassung freigeben“ oder „Änderungen anfordern“ mit einer kurzen Rückmeldung.',then:'Nach „Passt“ erscheint beim Autor „Änderung zusammenführen“. Nach „Ändern“ ist der Autor wieder dran.',where:'„Meine Arbeit“ → Aufgabe → Anschauen',target:{page:'rooms',selector:'.home-hero'}},
 {id:'uebernehmen',title:'Zusammenführen',who:'Autor oder Projekt-Admin',what:'„Änderung zusammenführen“. Bei GitHub-Projekten legt Studio einen Pull Request an und führt ihn zusammen – die Regeln auf GitHub gelten weiter.',then:'Danach kommt der Live-Schritt.',where:'In der Aufgabe, oben',target:{project:true,tab:'tasks',selector:'.team-task-list'}},
 {id:'live',title:'Live',who:'je nach Projekt',what:'Entweder geht es beim Zusammenführen von selbst live, oder ihr schaltet selbst live (z. B. über Hermes) und tippt danach „Ist jetzt live“.',then:'Die Aufgabe ist erledigt.',where:'Projekt → Einstellungen → Live gehen',target:{project:true,tab:'connect',selector:'.po-ready'}}
];

export const laterItems:[string,string][]=[
 ['„Zur Prüfung geben“','erst wenn du die Aufgabe übernommen und eine Änderung gespeichert hast.'],
 ['„Anschauen“ und „Diese Fassung freigeben“','erst wenn jemand anderes etwas zur Prüfung gegeben hat – und nur mit der Rolle Prüfer.'],
 ['„Änderung zusammenführen“','erst nach der Freigabe – und nur für den Autor oder den Projekt-Admin.'],
 ['„Ist jetzt live“','erst nach dem Zusammenführen, wenn ihr selbst live schaltet.'],
 ['Vorschau und „Änderung machen“','erst wenn das Projekt startklar ist (Werkstatt eingerichtet).'],
 ['„Code auf GitHub auswählen“, Live-Weg, „Wer darf was“ ändern','nur für den Projekt-Admin. Alle anderen sehen „Legt der Projekt-Admin fest“.'],
 ['„Einladungslink erstellen“, „Neues Passwort“, Mitglied „Entfernen“','nur für den Inhaber von Studio. Alle anderen können Leute vorschlagen. Das eigene Passwort ändert jeder unter Mein Konto.'],
 ['„Aufgabe abschliessen“','erst wenn alles erledigt ist: Ergebnis da, freigegeben, bei Code zusammengeführt.']
];

const roles:[string,string][]=[['Admin','alles im Projekt, auch Rollen, Prüfregel, Repo und Zusammenführen'],['Entwickler','Aufgaben anlegen, ändern, zur Prüfung geben'],['Prüfer','„Diese Fassung freigeben“ oder „Änderungen anfordern“'],['Zuschauer','lesen und im Gespräch mitreden']];
const places:[string,string][]=[['Arbeit','was bei dir ansteht – der nächste Schritt steht ganz oben'],['Projekte','alle Projekte; darin Übersicht, Aufgaben, Gespräch, Wissen, Einstellungen. Unten: Allgemeines Wissen'],['Gespräche','„Allgemein“ für alle, darunter die Gespräche der Projekte'],['Team','wer dabei ist, einladen oder vorschlagen'],['Mein Konto (am Handy: deine Initialen oben rechts)',' ChatGPT verbinden, Assistenten trennen, Daten, Abmelden – und diese Anleitung']];

export default function GuidePage({practice,onShow,onPractice,onDeletePractice,busy}:{practice:string|null;onShow:(t:GuideTarget)=>void;onPractice:()=>void;onDeletePractice:()=>void;busy:boolean}){
 const [open,setOpen]=useState<string|null>(guideSteps[0].id);
 return <div className="rw-page team-page studio-guide-page">
  <h1>So funktioniert Studio</h1>
  <p className="studio-page-intro">Eine Änderung geht immer denselben Weg. Vieles erscheint erst, wenn es dran ist – hier siehst du den ganzen Weg im Voraus. Tippe einen Schritt an.</p>

  <section className="studio-guide-practice" aria-labelledby="guide-practice">
   <h2 id="guide-practice">Einmal selbst ausprobieren</h2>
   {practice?<><p>Dein Übungsprojekt ist bereit. Nur du siehst es. Darin darfst du dich selbst freigeben.</p><div className="rw-row-actions"><button className="rw-button lime" disabled={busy} onClick={onPractice}><Play size={16}/>Zur Übung</button><button className="rw-button" disabled={busy} onClick={onDeletePractice}><Trash2 size={16}/>Übung löschen</button></div></>
    :<><p>Studio legt ein Übungsprojekt mit einer Aufgabe an, das nur du siehst. Du gehst den Weg einmal durch und löschst es danach. An euren echten Projekten ändert sich nichts.</p><button className="rw-button lime" disabled={busy} onClick={onPractice}><Play size={16}/>Übung starten</button></>}
  </section>

  <section aria-labelledby="guide-way"><h2 id="guide-way">Der Weg einer Änderung</h2>
   <ol className="studio-guide-steps">{guideSteps.map((s,i)=><li key={s.id} id={'schritt-'+s.id} className={open===s.id?'open':''}>
    <button className="studio-guide-step" aria-expanded={open===s.id} onClick={()=>setOpen(open===s.id?null:s.id)}><span className="studio-guide-num">{i+1}</span><span><strong>{s.title}</strong><small>{s.who}</small></span><ChevronDown size={18} aria-hidden="true"/></button>
    {open===s.id&&<div className="studio-guide-body"><p>{s.what}</p><p><strong>Danach:</strong> {s.then}</p><p className="rw-muted">Wo: {s.where}</p>{s.target&&<button className="rw-button" onClick={()=>onShow(s.target!)}><Crosshair size={16}/>Zeig mir wo</button>}</div>}
   </li>)}</ol>
   <p className="rw-muted">Aufgaben ohne Code gehen kürzer: Ergebnis aufschreiben → anschauen und freigeben → abschliessen.</p>
  </section>

  <section aria-labelledby="guide-later"><h2 id="guide-later">Warum sehe ich das noch nicht?</h2>
   <dl className="studio-guide-later">{laterItems.map(([what,when])=><div key={what}><dt>{what}</dt><dd>{when}</dd></div>)}</dl>
  </section>

  <section aria-labelledby="guide-roles"><h2 id="guide-roles">Wer darf was</h2>
   <dl className="studio-guide-later">{roles.map(([r,d])=><div key={r}><dt>{r}</dt><dd>{d}</dd></div>)}</dl>
   <p className="rw-muted">Der Projekt-Admin vergibt die Rollen unter Projekt → Einstellungen → „Wer darf was“. Dort wählt er auch, ob eine zweite Person prüfen muss.</p>
  </section>

  <section aria-labelledby="guide-places"><h2 id="guide-places">Wo finde ich was</h2>
   <dl className="studio-guide-later">{places.map(([r,d])=><div key={r}><dt>{r}</dt><dd>{d}</dd></div>)}</dl>
  </section>
 </div>;
}
