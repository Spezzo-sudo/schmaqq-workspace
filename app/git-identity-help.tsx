'use client';
import {useState} from 'react';

const commands = 'git -C "PFAD_ZUM_REPOSITORY" config --local user.name "DEIN NAME"\n'
 + 'git -C "PFAD_ZUM_REPOSITORY" config --local user.email "DEINE E-MAIL"';

export default function GitIdentityHelp(){
 const [copyState,setCopyState]=useState<'idle'|'copied'|'failed'>('idle');
 async function copy(){
  try{await navigator.clipboard.writeText(commands);setCopyState('copied');}
  catch{setCopyState('failed');}
 }
 return <section aria-label="Git-Identität einrichten">
  <h3>Git-Autor für dieses Projekt einrichten</h3>
  <p>Git benötigt deinen Namen und deine E-Mail für spätere Commits. Diese Angaben werden Teil der Git-Historie. Du kannst dafür auch deine GitHub-Noreply-Adresse verwenden.</p>
  <ol>
   <li>Öffne ein Terminal auf dem Ausführungs-PC dieses Prüfauftrags.</li>
   <li>Ersetze <code>PFAD_ZUM_REPOSITORY</code> in beiden Zeilen durch den Repository-Stammordner, den du für dieses Projekt eingerichtet hast. Beim neuen lokalen Startprojekt ist das der Unterordner <code>repository</code> im gewählten Projektordner.</li>
   <li>Ersetze <code>DEIN NAME</code> und <code>DEINE E-MAIL</code> durch deine gewünschten Autorenangaben. Die Anführungszeichen bleiben stehen. Führe dann beide Zeilen aus.</li>
  </ol>
  <pre className="dev-output">{commands}</pre>
  <button className="button" onClick={copy}>Git-Befehle kopieren</button>
  {copyState==='copied'&&<p role="status">Befehle kopiert. Ersetze vor dem Ausführen Pfad, Name und E-Mail.</p>}
  {copyState==='failed'&&<p role="status">Kopieren nicht möglich. Markiere und kopiere die beiden Befehle manuell.</p>}
  <p><code>--local</code> speichert die Angaben nur für das angegebene Repository. Der Runner kann weiterlaufen. Prüfe danach die Git-Verbindung erneut.</p>
 </section>;
}
