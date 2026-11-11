# SCHMAQQ Studio – Systemprüfung des Arbeitsablaufs

Stand: 9. November 2026, Quellstand `main` (Team-Werkstatt, Rollen pro Projekt).
Untersucht: `selfhost/` (Server, Runner), `studio/` und `app/` (Oberfläche), `docs/ANLEITUNG.md`.
Nicht untersucht: `app/api/`, `db/`, `build/`, `docs/archive/`.
In dieser Sitzung wurde kein Anwendungscode geändert.

**Wie die Belege entstanden sind.** Jeder Befund nennt Datei und Funktion. „Belegt (ausgeführt)“
heisst: Das Verhalten wurde zusätzlich mit einem Wegwerf-Skript gegen einen lokalen Testserver
(`createStudioServer`, leere Datenbank, simulierter Runner über `/api/runner/poll` und
`/api/runner/report`) nachgestellt. „Belegt (Code)“ heisst: aus dem Quelltext eindeutig ablesbar,
aber nicht ausgeführt (zum Beispiel alles, was eine echte GitHub-Verbindung braucht).
„Vermutet“ heisst: plausible Folge, nicht nachgewiesen. Es gab keinen Browsertest und keine
Verbindung zur laufenden Instanz. Die vorhandenen Tests `team-workflow`, `project-roles`,
`task-next-step`, `review`, `team-workshop` und `placement` laufen grün (unter Node 22; das Projekt
verlangt Node 24).

---

## 1. Kurzfazit

Das Arbeitsmodell trägt im Kern: Eine Freigabe gilt serverseitig immer für genau eine Fassung
(einen Commit), erneutes Speichern entwertet sie zuverlässig, und Schreibrechte werden auf dem
Server geprüft, nicht nur in der Oberfläche. Diese Teile sind solide und getestet.

Unzuverlässig wird es an vier Stellen. Erstens ist „ein Rechner“ eine globale Sperre: Seit sich
mehrere Personen eine Server-Werkstatt teilen, blockiert der Test der einen Person das Speichern
und Einreichen der anderen, und ein hängengebliebener Auftrag blockiert alle, bis der Runner sich
wieder meldet. Zweitens gibt es keinen einzigen, vom Server berechneten Zustand einer Aufgabe:
Die Aufgabenseite, der eingebettete Editor und die Projektübersicht leiten „startklar“, „arbeitet
gerade“, „welcher Rechner“ und „was ist der nächste Schritt“ jeweils selbst ab. Daraus entstehen
die meisten Widersprüche aus dem Bedienungstest (Fehler und „arbeitet gerade“ gleichzeitig,
Fehler nach Neuladen weg, „Zur Prüfung geben“ ohne Änderung). Drittens heisst „Startklar“ nur
„ein Runner hat das Projekt gemeldet“, nicht „Tests und Vorschau funktionieren“. Viertens kennt
Studio keinen Weg, eine Arbeitskopie auf den neuen Stand des Hauptzweigs zu bringen; wer nach
einer anderen Person zusammenführen will und einen Konflikt hat, steht ohne nächsten Schritt da.

Bei den Rollen schützt der Server das Ändern korrekt, aber die Regeln sind in Schichten gewachsen:
„Projekt-Admin“ bedeutet an drei Stellen etwas anderes, Lesen ist gar nicht an eine Rolle gebunden,
und im GitHub-App-Betrieb löst die Freigabe des Prüfers das Zusammenführen direkt aus, obwohl die
Anleitung das dem Autor oder Admin zuschreibt. Die Oberfläche blendet nur den Hauptknopf nach
Rolle aus; Nebenaktionen bleiben für Zuschauer sichtbar und scheitern erst beim Antippen.

---

## 2. Befunde nach Priorität

### A – blockiert den Ablauf

#### A1. Geteilte Werkstatt: Ein laufender Auftrag sperrt alle anderen Personen aus
- **Was passiert:** Solange auf einem Rechner irgendein Auftrag wartet oder läuft, lehnt der Server
  für *alle* Personen auf diesem Rechner das Öffnen, Speichern und Anlegen von Dateien ab
  („Bitte den laufenden Auftrag zuerst beenden lassen.“) und ebenso „Zur Prüfung geben“ und
  Zusammenführen („Auf deinem Rechner läuft noch ein Vorgang.“). Tests dürfen bis zu zehn Minuten
  laufen.
- **Beleg:** `selfhost/server.mjs`, Route `/api/development`, Aktion `job`: Prüfung
  `SELECT id FROM jobs WHERE device=? AND status IN ('queued','running','cancelling')` für
  Dateiaufträge und für `review`/`submit`/`integrate`. In der Oberfläche zählt
  `app/development.tsx` (`activeWork`) alle Aufträge des Rechners, auch fremde; daraufhin sperrt
  `studio/team-task.tsx` (`codeJob`, `stepBlocked`) mit „Zuerst den Entwurf speichern und den
  laufenden Vorgang beenden lassen.“
- **Reproduktion:** Person A startet Tests in ihrer Arbeitskopie auf der Server-Werkstatt.
  Person B öffnet währenddessen in ihrer eigenen Arbeitskopie auf derselben Werkstatt eine Datei
  oder gibt zur Prüfung. Ergebnis: 409 für B.
- **Status:** Belegt (ausgeführt).
- **Zusatz:** Die Meldung „Auf deinem Rechner“ ist auf einer Team-Werkstatt falsch, und B erfährt
  nicht, dass A's Auftrag der Grund ist. `team-task.tsx` wiederholt nur beim Einreichen bis zu
  zehnmal im Abstand von zwei Sekunden; das reicht für einen Testlauf nicht.

#### A2. Hängender Auftrag bleibt für immer „läuft“ und sperrt den Rechner
- **Was passiert:** Ein Auftrag wird nur dann als „unterbrochen“ markiert, wenn *derselbe Runner*
  sich wieder meldet (`/api/runner/poll`) und der letzte Herzschlag älter als zwei Minuten ist.
  Meldet sich der Runner nicht mehr (Rechner aus, Dienst abgestürzt), bleibt der Auftrag „läuft“
  beziehungsweise „wartet“. Die Aufgabe zeigt dauerhaft „Die Werkstatt arbeitet gerade“, und wegen
  A1 sind alle Dateiaktionen auf diesem Rechner gesperrt.
- **Beleg:** `selfhost/server.mjs`, `/api/runner/poll` (einzige Stelle, die `status='interrupted'`
  nach Zeit setzt). Abbrechen hilft nicht: Aktion `cancel` erlaubt bei laufenden Aufträgen nur
  `codex`, `check` und `local-ai`, sonst „Diesen Git-Schritt bitte erst beenden lassen.“, und nur
  für die Person, die den Auftrag gestartet hat. Einziger Ausweg ist „Aufgabe selbst übernehmen“
  (`selfhost/team-http.mjs`, Aktion `takeover`), das Aufträge einer Aufgabe nach zwei Minuten
  Funkstille beendet; für Aufträge ohne Aufgabe gibt es keinen Ausweg.
- **Reproduktion:** Auftrag starten, Runner beenden, eine Stunde warten: Status bleibt `running`,
  Projektübersicht listet ihn weiter als aktiv, Dateizugriff liefert 409.
- **Status:** Belegt (ausgeführt).

#### A3. Aufgabenseite schickt Aufträge an den falschen Rechner
- **Was passiert:** „Zur Prüfung geben“ und „Änderung zusammenführen“ auf der Aufgabenseite wählen
  den Rechner selbst: zuerst einen eigenen erreichbaren Rechner mit diesem Projekt, sonst die
  Team-Werkstatt. Liegt die Arbeitskopie auf einem anderen Rechner, lehnt der Server ab mit
  „Eine eigene vorbereitete Arbeitskopie wird benötigt.“ Die Meldung nennt die Ursache nicht.
- **Beleg:** `studio/team-task.tsx`, Konstante `device` (eigener Rechner vor Team-Werkstatt) und
  `codeJob` (`device:device.device,…worktree:myCopy?.id`). Der Server verlangt in
  `selfhost/server.mjs` (`action='prepare' AND device=?`), dass Rechner und Arbeitskopie
  zusammenpassen. Der eingebettete Editor (`app/development.tsx`) stellt dagegen auf den Rechner
  der Arbeitskopie um; die zwei Teile derselben Seite entscheiden also verschieden.
- **Reproduktion:** B hat eine Arbeitskopie auf der Team-Werkstatt und zusätzlich einen eigenen PC,
  der das Projekt meldet und erreichbar ist. „Zur Prüfung geben“ → 403. Derselbe Aufruf mit
  `device:'auto'` funktioniert, weil `resolveDevice` (`selfhost/placement.mjs`) dann den Rechner
  der Arbeitskopie nimmt. Umgekehrt genauso: Kopie auf dem eigenen PC, PC aus, Team-Werkstatt an.
- **Status:** Serverseite belegt (ausgeführt); Auswahl in der Oberfläche belegt (Code).

#### A4. Arbeitskopie auf altem Stand: kein Weg, sie zu aktualisieren; Wartegrund bleibt unsichtbar
- **Was passiert:** Eine Arbeitskopie entsteht vom damaligen Hauptzweig und wird nie aktualisiert.
  Der Runner kennt keinen Auftrag „Stand des Hauptzweigs übernehmen“. Führt Person A zuerst
  zusammen, dann gilt für Person B:
  - *GitHub-Projekte (Pull Request):* Studio führt nur zusammen, wenn GitHub „konfliktfrei und
    vollständig geprüft“ meldet. Sonst bleibt die Freigabe stehen und Studio versucht es bei jedem
    Statusabgleich erneut. Die Aufgabe zeigt dabei dauerhaft „Freigegeben. Studio führt die
    Änderung jetzt zusammen.“ ohne Knopf und ohne Grund.
  - *Direkte Übernahme:* Der Runner führt probeweise zusammen und testet. Bei Konflikt endet der
    Auftrag mit „Zusammenführung gestoppt: Git-Konflikt. …“ plus englischem Git-Text.
  In beiden Fällen kann die Person den Konflikt in Studio nicht lösen (auf der Server-Werkstatt
  gar nicht, auf dem eigenen PC nur mit Git von Hand).
- **Beleg:** `selfhost/runner.mjs`, `run`: `review`/`submit` machen `fetch`, `add --all`, `commit`,
  Tests und Diff gegen `merge-base`, aber kein Zusammenführen mit dem Hauptzweig; getestet wird
  also der alte Stand. `selfhost/github-workflow.mjs`, `perform('merge')`: verlangt
  `mergeable===true` und `mergeable_state==='clean'`. `selfhost/server.mjs`, Route
  `/api/development/reviews`: Fehler beim Zusammenführen wird zu
  `github={state:'waiting',reason}`; `studio/task-review-diff.tsx` (`vote`) wertet die Antwort
  nicht aus. `GET /api/github-workflow` verschluckt denselben Fehler (`catch{}`).
  `studio/task-next-step.ts`: Zweig `r.state==='approved'` mit `r.automatic` hat keinen Knopf.
  Sichtbar wird der Grund nur, wer im Reiter „Anschauen“ im Kasten „Gemeinsamer Pull Request“
  selbst „Freigegebenen Stand zusammenführen“ drückt (`studio/github-workflow.tsx`).
- **Reproduktion:** Zwei Aufgaben ändern dieselbe Datei; beide werden freigegeben; die zweite
  bleibt bei „Studio führt die Änderung jetzt zusammen“ stehen.
- **Status:** Belegt (Code). Welchen Zustand GitHub bei „nur veraltet, kein Konflikt“ meldet, hängt
  vom Branch-Schutz ab und wurde nicht geprüft (vermutet: ohne Pflicht „Branch aktuell“ geht es
  durch, dann aber ohne Test des zusammengeführten Stands, falls keine GitHub-Prüfung existiert).

#### A5. „Startklar“ bedeutet nicht, dass der Ablauf funktioniert
- **Was passiert:** Die Karte „Startklar“ und die Aufgabenseite halten die Werkstatt für bereit,
  sobald ein erreichbarer Rechner das Projekt in seiner Liste meldet. Ob ein Testbefehl hinterlegt
  ist, ob Hochladen erlaubt ist und ob die Vorschau baut, geht nicht ein. Ohne Testbefehl scheitert
  aber jedes „Zur Prüfung geben“ („Vor Einreichung muss ein lokaler Testbefehl konfiguriert
  werden.“), und eine Vorschau, die keine `index.html` erzeugt, lässt das ganze Einreichen
  scheitern, auch wenn die Tests bestanden sind.
- **Beleg:** `studio/project-ready.tsx` (`ready`, `workshop`) und `studio/team-task.tsx`
  (`device`): nur `r.online&&r.development?.some(p=>p.id===project)`. Der Runner meldet die
  Merkmale `check`, `preview`, `publish` zwar mit (`selfhost/local-ai.mjs`, `aiCapabilities`),
  aber nur als „eingetragen“, nicht als „hat funktioniert“. `selfhost/placement.mjs`
  (`executors`, Feld `testable`) kennt den Unterschied bereits; nur `app/executors.tsx` nutzt ihn.
  `selfhost/runner.mjs`: `check()` wirft ohne Testbefehl; im Zweig `review`/`submit` wird der
  Vorschau-Bau als Teil des Einreichens ausgeführt und sein Fehler bricht alles ab.
- **Reproduktion:** Runner meldet ein Projekt mit `check:false`. Übersicht zeigt „Startklar“,
  Aufgabe bietet „Selbst bearbeiten“ und „Zur Prüfung geben“ an, Einreichen scheitert.
- **Status:** Gemeldeter Zustand belegt (ausgeführt); Folgefehler belegt (Code).
- **Zusatz:** „Startklar“ ist ausserdem pro Betrachter verschieden, weil `/api/ai` jeder Person nur
  eigene Rechner und die Team-Werkstatt zeigt (`selfhost/ai-routes.mjs`). Ein Admin mit eigenem PC
  sieht „Startklar“, während Entwickler ohne Team-Werkstatt nicht arbeiten können. Zuschauer und
  reine Prüfer sehen nie „Startklar“ (`teamDevices` verlangt die Entwicklerrolle).

#### A6. „Zur Prüfung geben“ ist ohne jede Änderung möglich
- **Was passiert:** Der Knopf erscheint, sobald eine eigene Arbeitskopie existiert, nicht erst nach
  einer gespeicherten Änderung (so steht es in der Anleitung). Der Runner reicht auch einen leeren
  Unterschied ein, der Server setzt die Aufgabe auf „in Prüfung“, und Prüfer bekommen „Bitte
  anschauen und freigeben“ für nichts.
- **Beleg:** `studio/task-next-step.ts`, `taskNextStep`: `if(t.hasCopy) … 'Zur Prüfung geben'`.
  `selfhost/runner.mjs`: kein Abbruch bei leerem Diff. `selfhost/server.mjs`,
  `/api/runner/report`: `submit` mit `published===true` setzt `tasks.status='review'`;
  `completeReview` (`selfhost/reviews.mjs`) akzeptiert einen leeren Diff.
- **Reproduktion:** Arbeitskopie anlegen, nichts speichern (oder das Anlegen einer Datei scheitert
  wie im Bedienungstest), „Zur Prüfung geben“.
- **Status:** Belegt (ausgeführt, mit simuliertem Runner-Ergebnis).

### B – strukturelle Schwäche

#### B1. Fehlermeldungen leben nur im Browser; Fehler und „arbeitet gerade“ kommen aus zwei Quellen
- **Was passiert:** Scheitert ein Auftrag, steht der Grund zwar in der Datenbank (`jobs.result`),
  die Aufgabenseite zeigt ihn aber nur aus ihrem eigenen Zwischenspeicher. Nach Schliessen und
  Öffnen ist die Meldung weg, der nächste Schritt lautet wieder „Zur Prüfung geben“, als wäre
  nichts gewesen. Gleichzeitig kommt „Die Werkstatt arbeitet gerade“ aus einer anderen Quelle (alle
  fünf Sekunden vom Server); eine alte Fehlermeldung wird davon nicht gelöscht.
- **Beleg:** `studio/team-task.tsx`: `const [error,setError]`, gesetzt in `codeJob`, gelöscht nur
  beim nächsten eigenen Klick. `activeJob:running||detail?.activeJobs?.[0]?.action`.
  `selfhost/collaboration.mjs`, `GET /api/collaboration/task`: `activeJobs` enthält nur wartende
  und laufende Aufträge und schliesst nur `files`, `read-file`, `save-file` aus; `status`,
  `create-file`, `prepare` zählen als „arbeitet“. Einen „letzten Fehlschlag“ liefert die Route
  nicht. Der eingebettete Editor (`app/development.tsx`) hat zusätzlich eine eigene Fehleranzeige.
- **Reproduktion:** Einreichen scheitern lassen, Aufgabe schliessen und öffnen. Für die
  Gleichzeitigkeit: nach dem Fehler löst der Editor einen Hintergrundauftrag aus (zum Beispiel
  `status`), oder ein Auftrag hängt (A2).
- **Status:** Verschwinden belegt (Code). Mechanismus der Gleichzeitigkeit belegt (Code); welcher
  Hintergrundauftrag im Bedienungstest der Auslöser war, ist vermutet.

#### B2. „Projekt-Admin“ ist an drei Stellen unterschiedlich definiert
- **Was passiert:** Die Rollenverwaltung kennt die Rolle Admin. Der Live-Weg, Hauptzweig und
  Übernahmeregel verlangen zusätzlich, dass die Person Studio-Inhaber ist oder das Projekt
  angelegt hat. Die Ausführungsregel (PC oder Server) verlangt Inhaber oder den Eintrag in einer
  älteren Tabelle. Ein vom Admin ernannter zweiter Admin sieht die Knöpfe und bekommt 403.
- **Beleg:** `selfhost/project-roles.mjs` (`can(…,'admin')`); `selfhost/team-http.mjs`, Aktionen
  `live` und `project` (`member.role!=='owner'&&meta.createdBy!==member.id` → „Wie das Projekt live
  geht, legt der Inhaber fest.“); `selfhost/placement.mjs`, `canConfigurePlacement`
  (`project_starts.owner`). Die Oberfläche (`studio/project-ready.tsx`, `decides`) fragt die
  Rolle ab und zeigt die Auswahl.
- **Reproduktion:** Inhaber gibt B die Rolle Admin. B wählt den Live-Weg → 403. B ändert die
  Ausführungsregel → 403.
- **Status:** Belegt (ausgeführt). Widerspricht der Anleitung („Admin: alles im Projekt, auch …
  Live-Weg“).

#### B3. Im GitHub-App-Betrieb führt die Freigabe des Prüfers selbst zusammen
- **Was passiert:** Gibt ein Prüfer frei, öffnet der Server sofort den Pull Request und führt ihn
  zusammen, im Namen des Prüfers und ohne zu prüfen, ob dieser Autor oder Admin ist. Scheitert das,
  holt es jeder spätere Statusabruf (ein lesender Aufruf) von Autor oder Admin nach. Der Schritt
  „Zusammenführen – Autor oder Projekt-Admin“ aus der Anleitung existiert in dieser Betriebsart
  nicht als Handlung einer Person.
- **Beleg:** `selfhost/server.mjs`, `/api/development/reviews` (nach dem Speichern der Freigabe:
  `githubWorkflow.perform('open',…)` und `perform('merge',job.id,m)`), und `GET
  /api/github-workflow` (führt bei `approved` für Autor oder Admin zusammen). Die Oberfläche weiss
  es (`automatic` in `studio/task-next-step.ts`), die Anleitung und die Rollentabelle nicht.
  Der Kasten in `studio/github-workflow.tsx` sagt zudem „Die Aktion verwendet deinen persönlichen
  Repository-Zugang“, was im App-Betrieb nicht stimmt.
- **Status:** Belegt (Code), nicht ausgeführt (braucht GitHub). Ob das so gewollt ist, ist eine
  Produktentscheidung (siehe offene Fragen); der Befund ist die Abweichung von Anleitung und
  Rollenmodell.

#### B4. Eine Freigabe kann rückwirkend verschwinden
- **Was passiert:** Ob eine Fassung freigegeben ist, wird bei jedem Lesen neu berechnet, mit den
  *heutigen* Rollen und der *heutigen* Prüfregel. Verliert die Prüferin später die Rolle, wird sie
  aus dem Team entfernt oder stellt der Admin von „Admin darf allein freigeben“ auf „Zweite Person“
  um, fällt eine bereits erteilte Freigabe auf „offen“ zurück. Bei schon zusammengeführten
  Aufgaben, die noch nicht abgeschlossen sind, lässt sich die Aufgabe dann nicht mehr abschliessen
  („Die Freigabe einer zweiten Person fehlt.“), und der nächste Schritt hat keinen Knopf.
- **Beleg:** `selfhost/reviews.mjs`, `reviewState` (`selfApproval(…)` und `can(…,'review')` zur
  Lesezeit); `selfhost/team-model.mjs`, `completion`.
- **Reproduktion:** C gibt frei (Zustand „freigegeben“), Admin nimmt C die Prüferrolle → Zustand
  „offen“.
- **Status:** Belegt (ausgeführt).

#### B5. Lesen ist an keine Rolle gebunden; einzelne Schreibwege prüfen die Projektrolle nicht
- **Was passiert:** Die Erlaubnis „ansehen“ wird nur beim Schreiben einer Nachricht geprüft. Alle
  lesenden Aufrufe (Projekt, Aufgaben, Änderungen mit Diff, Prüfverlauf, Auftragsliste aller
  Projekte) verlangen nur eine Anmeldung. Wer im Projekt keine Rolle mehr hat, liest weiter alles,
  darf aber nicht mehr schreiben („Du bist in diesem Projekt nicht eingetragen.“).
- **Beleg:** `selfhost/room-http.mjs` (GET ohne `requirePermission`), `selfhost/collaboration.mjs`
  (`task`, `task-diff`), `selfhost/team-http.mjs` (GET, `results`, `knowledge`),
  `selfhost/server.mjs` (`GET /api/development`, `GET /api/development/reviews`,
  `GET /api/development/github-pr`).
- **Weitere Lücken gleicher Art (Belegt, Code):**
  - `/api/github-project` (`createRepository` in `selfhost/github-workflow.mjs`): legt ein Repository
    an und verbindet es mit dem Projekt, ohne Admin-Prüfung. Nötig ist nur ein persönlicher
    GitHub-Zugang; betrifft nur Projekte ohne Repository und nur den Betrieb ohne GitHub-App.
  - `/api/team/project-connect`: verlangt den eigenen Rechner, aber keine Projektrolle. Eine
    Team-Werkstatt entsteht daraus nur, wenn der Besitzer Projekt-Admin ist
    (`selfhost/team-workshop.mjs`), deshalb geringe Wirkung.
  - `/api/development`, Aktion `workspace` (Arbeitskopie umbenennen, freigeben): nur Besitz, keine
    Rolle.
- **Reproduktion:** Admin entfernt alle Rollen von C. C ruft Projekt und Diff ab → 200.
- **Status:** Belegt (ausgeführt für Projekt und Diff). Einordnung: Das Datenmodell ist bewusst
  „ein kleines Team teilt alles“ (`docs/ARCHITECTURE.md`); der Befund ist, dass die Anleitung
  Zuschauern „lesen“ als Recht zuschreibt, das es als Grenze nicht gibt.

#### B6. Zwei Ableitungen für den nächsten Schritt, zwei für Bereitschaft, Rollen nur in der neuen Oberfläche
- **Was passiert:** `studio/task-next-step.ts` berechnet den nächsten Schritt der Aufgabenseite.
  `app/workflow-step.ts` berechnet einen eigenen nächsten Schritt für den eingebetteten Editor
  („Selbst bearbeiten“), die Ergebnisanzeige und ältere Ansichten. Beide sind in derselben Aufgabe
  gleichzeitig sichtbar und nutzen verschiedene Eingaben (Aufgabe und Prüfzustand gegenüber
  Rechnerstatus, Einrichtungsprüfung und Änderungsübersicht). Rollen kennt nur `studio/`
  (`useProjectAccess`); alles unter `app/` ist rollenblind.
- **Beleg:** Importe in `studio/team-task.tsx` (`../app/development`, `./task-next-step`);
  `app/development.tsx` (`nextStep`, `setupSteps`, `readinessFor`);
  `selfhost/project-start.mjs` (`projectReadiness`) gegenüber `/api/ai` (`development`).
- **Status:** Belegt (Code). Das ist die Ursache hinter A3, A5, B1 und C1, kein eigener Fehler.

#### B7. Freigabe von Ergebnissen ohne Code zählt anders als bei Code
- **Was passiert:** Bei Aufgaben ohne Code bestimmt die *letzte* Stimme den Zustand. Fordert Prüfer
  1 Änderungen und gibt Prüfer 2 danach frei, gilt das Ergebnis als freigegeben. Bei Code blockiert
  jede offene Änderungsanforderung, bis dieselbe Person neu entscheidet oder eine neue Fassung kommt.
- **Beleg:** `selfhost/team-http.mjs`, Aktion `vote` (`state:v.decision==='approved'?'approved':…`)
  gegenüber `selfhost/reviews.mjs`, `reviewState`.
- **Status:** Belegt (Code).

#### B8. Live-Vorschau: eine pro Werkstatt, höchstens eine Stunde
- **Was passiert:** Für Projekte mit laufender Vorschau (App mit Server) gibt es pro Werkstatt nur
  eine Vorschau. Reicht Person B ein, wird A's Vorschau-Adresse ungültig; nach spätestens einer
  Stunde läuft jede ab. Der Knopf „Vorschau öffnen“ bleibt in der Prüfansicht trotzdem stehen.
- **Beleg:** `selfhost/server.mjs`, `/api/runner/report` (Kommentar „One live preview per worker“,
  `expires=Math.min(…,now()+3600000)`); `selfhost/collaboration.mjs`, `task-diff` liefert die
  gespeicherte Adresse ohne Gültigkeitsprüfung.
- **Status:** Belegt (Code). Gebaute Vorschauen (statische Dateien) sind nicht betroffen. Ob das
  „Anschauen blieb leer“ aus dem Bedienungstest hiermit zusammenhängt: nein, dort gab es wegen
  der fehlenden `index.html` gar keine Vorschau (siehe Abschnitt 3).

### C – Verständlichkeit

#### C1. Zuschauer sehen Schreibaktionen
- **Ursache:** Nur der eine Hauptknopf (nächster Schritt) und das Freigabeformular fragen die Rolle
  ab. Nicht nach Rolle gesteuert sind in `studio/team-task.tsx`: „Aufgabe bearbeiten“, „Aufgabe
  selbst übernehmen“, „KI helfen lassen“; in `studio/team-workspace.tsx` und
  `studio/room-components.tsx`: „+ Aufgabe“, „Als Aufgabe“ und das Festhalten von Nachrichten; dazu
  das Bearbeiten von Wissen. `useProjectAccess` gilt vor dem Laden als „alles erlaubt“.
- **Serverseite:** abgesichert. `selfhost/room-http.mjs`, `selfhost/collaboration.mjs`,
  `selfhost/team-http.mjs` und `selfhost/server.mjs` verlangen die Entwicklerrolle; der Test
  `selfhost/project-roles.test.mjs` deckt das ab.
- **Status:** Belegt (Code). Keine Sicherheitslücke, aber ein Zuschauer erfährt erst nach dem
  Antippen, dass er nicht darf.

#### C2. „Zweite Person“ steht fest im Text, auch wenn Selbstfreigabe erlaubt ist
- **Ursache:** Die Prüfregel („Admin darf allein freigeben“) steuert die Rechte, aber nicht die
  Texte. Rund dreissig Stellen nennen fest die zweite Person, unter anderem `selfhost/team-model.mjs`
  (`completion`: „Die Freigabe einer zweiten Person fehlt.“), `studio/team-task.tsx` („Fertig, wenn:
  … Eine zweite Person hat die Änderung angeschaut“), `studio/task-next-step.ts` (`taskStages`:
  „Jemand anderes öffnet die Vorschau“) und Fehlermeldungen in `selfhost/server.mjs`.
- **Status:** Belegt (Code). Die Übungsrunde nutzt genau diese Regel (`selfhost/practice.mjs`),
  deshalb fällt es dort jedem neuen Mitglied auf.

#### C3. Begriffe und Anleitung weichen vom Verhalten ab
- „Zur Prüfung geben erscheint erst, wenn du … eine Änderung gespeichert hast“ (Anleitung) stimmt
  nicht (A6).
- „Zusammenführen: Autor oder Projekt-Admin“ stimmt im GitHub-App-Betrieb nicht (B3).
- „Admin: alles im Projekt“ stimmt für ernannte Admins nicht (B2).
- Code-Prüfung heisst „Passt – freigeben“ und „Änderung wünschen“ (`studio/task-review-diff.tsx`);
  Anleitung und Ergebnisse ohne Code heissen „Diese Fassung freigeben“ und „Änderungen anfordern“.
- Meldungen aus der Zeit persönlicher PCs passen nicht zur Server-Werkstatt: „Auf deinem Rechner
  läuft noch ein Vorgang“, „Verbindung zum Runner verloren. Ergebnis vor erneutem Start lokal
  prüfen.“, „PC wieder verbinden“ (`app/workflow-step.ts`).
- **Status:** Belegt (Code).

#### C4. Allgemeines Gespräch ohne „Antworten“ und „Als Aufgabe“
- **Ursache:** Das allgemeine Gespräch ist eine eigene Komponente (`studio/studio-general.tsx`) auf
  dem älteren Datenweg `/api/workspace` (`selfhost/workspace-http.mjs`). Die Aktionen gibt es nur
  in der Nachrichtenkomponente der Projektgespräche (`studio/room-components.tsx`, `/api/room`).
  Eine Aufgabe braucht ausserdem ein Projekt; im allgemeinen Gespräch fehlt die Projektwahl.
- **Status:** Belegt (Code). Unabhängig von den anderen Befunden, ausser dass es dasselbe Muster
  zeigt (zwei parallele Umsetzungen).

#### C5. Die Übungsrunde zeigt den Code-Weg nicht
- **Ursache:** `selfhost/practice.mjs` legt ein Projekt ohne Repository und eine Aufgabe ohne Code
  an. Arbeitskopie, Werkstatt, Vorschau, Einreichen und Zusammenführen kommen nicht vor. Ein neues
  Teammitglied trifft diese Schritte zum ersten Mal im echten Projekt, wo A1 bis A6 liegen.
- **Status:** Belegt (Code).

#### C6. Wer keinen eigenen Rechner hat, bekommt bei „automatisch“ eine irreführende Absage
- **Ursache:** `chooseExecutor` (`selfhost/placement.mjs`) wählt nur unter eigenen Rechnern; die
  Team-Werkstatt wird erst bei ausdrücklicher Auswahl geprüft. Die Aufgabenseite wählt
  ausdrücklich, deshalb fällt es dort nicht auf.
- **Status:** Belegt (Code). Vermutet: betrifft Aufrufe über den KI-Assistenten-Zugang
  (`selfhost/studio-mcp.mjs`), der nicht geprüft wurde.

### D – später

- **D1.** Beim Einreichen wird zuerst hochgeladen, dann gemeldet. Lehnt der Server die Meldung ab
  (Ergebnis über 150 000 Zeichen, Vorschau über 5 MB), ist der Zweig auf GitHub, der Auftrag aber
  „fehlgeschlagen“. Erneutes Einreichen heilt das. `selfhost/runner.mjs` (`startRunner`),
  `selfhost/server.mjs` (`/api/runner/report`). Belegt (Code).
- **D2.** Wird ein Pull Request direkt auf GitHub zusammengeführt, ohne Freigabe in Studio, gilt die
  Aufgabe als zusammengeführt, aber nicht freigegeben und lässt sich nicht abschliessen.
  `selfhost/github-workflow.mjs` (`sync`). Vermutet (aus Code abgeleitet).
- **D3.** Fehlgeschlagene Zusammenführungen (direkter Weg) lassen ihre Hilfs-Arbeitskopie auf dem
  Runner liegen. `selfhost/runner.mjs`, Zweig `integrate`. Vermutet.
- **D4.** „Erreichbar“ hat zwei Definitionen (30 Sekunden nach letztem Kontakt in
  `selfhost/placement.mjs`, 60 Sekunden nach letzter Fähigkeitsmeldung in
  `selfhost/ai-routes.mjs`). Kurze Abweichungen möglich. Belegt (Code).
- **D5.** `GET /api/team/results` und `/api/team/knowledge` blenden fremde Übungsprojekte nicht aus
  (nur über die Kennung erreichbar). Belegt (Code).

---

## 3. Gemeinsame Ursachen

**U1 – Kein einziger, vom Server berechneter Aufgabenzustand.** Die Oberfläche setzt den Zustand
aus Einzelteilen zusammen und hält Fehler lokal. Betroffen: A3, A5, A6, B1, B6, C1, C3.

**U2 – Der Rechner als globale Sperre aus der Zeit „ein PC pro Person“.** Sperre und Meldungen
gehen davon aus, dass der Rechner einer Person gehört. Betroffen: A1, A2, Teile von C3.

**U3 – Rollen wurden nachträglich über ältere Besitzprüfungen gelegt.** Inhaber, Anleger,
Projektstart-Eintrag und Rollenliste existieren nebeneinander; die Oberfläche fragt nur an neuen
Stellen. Betroffen: B2, B3, B4, B5, C1, C2.

**U4 – Die Werkstatt wird geglaubt statt geprüft.** „Eingetragen“ gilt als „funktioniert“.
Betroffen: A5, A6 (Vorschau als Teil des Einreichens) und der bekannte Fall mit dem
Vorschau-Ausgabeordner.

**U5 – Bewegung des Hauptzweigs ist nicht modelliert.** Betroffen: A4.

### Einordnung der bekannten Punkte aus dem Bedienungstest

| Beobachtung | Ursache | Zusammenhang |
|---|---|---|
| Anlegen von `site/index.html` scheitert mit englischem Git-Fehler | `excludeBuildOutput` (`selfhost/runner.mjs`) schliesst den Vorschau-Ausgabeordner von Git aus; `create-file` schreibt die Datei und ruft danach `git add` auf. Die Datei bleibt dabei unsichtbar auf der Platte liegen. | U4. Der Fix auf `ccr-977b2f78-m9ef6r` meldet den Fall auf Deutsch, räumt die Datei weg und ergänzt eine Prüfung im Einrichtungs-Check. Er verhindert nicht, dass ein solcher Ordner eingestellt wird, und entfernt bereits eingetragene Ausschlüsse in bestehenden Arbeitskopien nicht. |
| „Zur Prüfung geben“ trotzdem verfügbar, scheitert an fehlender `index.html` | A6 (Knopf hängt nur an der Arbeitskopie) plus A5 (Vorschau-Bau ist Teil des Einreichens, „Startklar“ prüft ihn nicht). | U1, U4. Vom Fix-Branch nicht gelöst. |
| „Anschauen“ bleibt leer | Es entstand keine eingereichte Fassung, also zeigt der Reiter „Noch nichts zum Anschauen“. Folge des gescheiterten Einreichens. | Folge von A5/A6. |
| Fehlermeldung und „Die Werkstatt arbeitet gerade“ gleichzeitig | B1: zwei unabhängige Quellen. | U1. |
| Fehlermeldung nach erneutem Öffnen weg | B1: Fehler nur im Browserzustand. | U1. |
| Selbstfreigabe geht, Texte verlangen zweite Person | C2: Texte kennen die Prüfregel nicht. | U3. |
| Allgemeines Gespräch ohne „Antworten“ / „Als Aufgabe“ | C4: eigene ältere Komponente und eigener Datenweg. | Unabhängig. |
| Zuschauer sieht schreibend wirkende Aktionen | C1: Nebenaktionen nicht nach Rolle gesteuert; Server lehnt ab. | U3. |

Die ersten fünf Beobachtungen sind eine Kette: geglaubte Einrichtung (U4) → Aktion wird angeboten,
die nicht gelingen kann (U1) → Fehler wird nicht dauerhaft erklärt (U1).

---

## 4. Verbesserungsplan in Paketen

Jedes Paket ist einzeln umsetzbar. Reihenfolge nach Wirkung, siehe Abschnitt 7.

### Paket 1 – Ein Aufgabenzustand vom Server, Fehler bleiben sichtbar
- **Löst:** B1, A3, A6, Teile von A4 und C3.
- **Inhalt:**
  1. `GET /api/collaboration/task` liefert zusätzlich: den letzten fehlgeschlagenen oder
     unterbrochenen Auftrag der Aufgabe seit dem letzten Erfolg (Aktion, Zeitpunkt, Meldung), ob es
     seit der Arbeitskopie eine gespeicherte Änderung gibt, und auf welchem Rechner die Arbeitskopie
     liegt.
  2. `taskNextStep` bekommt diese Eingaben: Fehlschlag wird als Satz mit Knopf „Nochmal versuchen“
     gezeigt und überlebt das Neuladen; „Zur Prüfung geben“ erst mit Änderung; „arbeitet gerade“
     und Fehler schliessen sich aus.
  3. `codeJob` schickt `device:'auto'` mit der Arbeitskopie; der Server wählt den Rechner.
  4. Der Server lehnt `submit` ohne Unterschied zum Hauptzweig mit einer klaren Meldung ab
     (Prüfung im Runner vor dem Hochladen).
- **Dateien:** `selfhost/collaboration.mjs`, `selfhost/team-model.mjs`, `selfhost/runner.mjs`,
  `studio/task-next-step.ts`, `studio/team-task.tsx`.
- **Erfolg prüfen:** `selfhost/task-next-step.test.mjs` um die Fälle „letzter Auftrag
  fehlgeschlagen“, „Kopie ohne Änderung“ erweitern; `selfhost/team-workflow.test.mjs`: nach
  gemeldetem Fehlschlag enthält die Aufgabenantwort die Meldung; neuer Fall „Arbeitskopie auf
  Rechner X, Auftrag mit `auto` landet auf X“ in `selfhost/placement.test.mjs`.

### Paket 2 – Auftragslebenszyklus und Sperre pro Arbeitskopie
- **Löst:** A1, A2, Teile von C3.
- **Inhalt:**
  1. Abgelaufene Aufträge unabhängig vom Runner beenden: beim Lesen der Auftragslisten oder per
     Zeitgeber alles ohne Herzschlag seit zwei Minuten auf „unterbrochen“ setzen; wartende Aufträge
     eines nicht erreichbaren Rechners nach einer festen Frist ebenso, mit verständlicher Meldung.
  2. Dateiaufträge und Einreichen nicht mehr abweisen, wenn ein *fremder* Auftrag läuft, sondern
     einreihen (der Runner arbeitet ohnehin nacheinander) und in der Aufgabe sagen: „Die Werkstatt
     ist gerade mit einer Aufgabe von … beschäftigt. Deine Änderung ist als Nächstes dran.“
     Die harte Sperre nur noch für dieselbe Arbeitskopie.
  3. Abbrechen auch für hängende Git-Schritte erlauben, sobald der Herzschlag fehlt; für den
     Projekt-Admin auch bei fremden Aufträgen auf der Team-Werkstatt.
- **Dateien:** `selfhost/server.mjs` (`/api/runner/poll`, `/api/development` Aktionen `job` und
  `cancel`), `selfhost/placement.mjs`, `app/development.tsx` (`activeWork`),
  `studio/team-task.tsx`, `studio/task-next-step.ts`.
- **Erfolg prüfen:** neuer Test `selfhost/job-lifecycle.test.mjs` mit zwei Personen auf einem
  Server-Rechner: (a) B's Dateiauftrag wird angenommen, während A's Test läuft; (b) ein Auftrag
  ohne Herzschlag ist nach Fristablauf „unterbrochen“, ohne dass der Runner sich meldet;
  (c) danach sind Dateiaufträge wieder möglich. `selfhost/team-workshop.test.mjs` bleibt grün.

### Paket 3 – „Startklar“ heisst: einmal bewiesen
- **Löst:** A5, die Kette aus dem Bedienungstest, Teile von A6.
- **Inhalt:**
  1. Fix-Branch `ccr-977b2f78-m9ef6r` übernehmen.
  2. Beim Einrichten der Werkstatt prüfen, dass im Vorschau-Ausgabeordner keine Projektdateien
     liegen, und das Speichern sonst ablehnen (nicht erst beim Anlegen einer Datei).
  3. Bereitschaft der Werkstatt aus Belegen ableiten: Testbefehl eingetragen, Hochladen erlaubt,
     letzter Probelauf (Tests und Vorschau-Bau auf dem Hauptzweig) erfolgreich. Die Karte zeigt
     „Startklar“ nur dann; sonst den konkreten offenen Punkt mit Knopf „Probelauf starten“.
  4. Dieselbe Ableitung für die Aufgabenseite (`hasWorkshop`), serverseitig berechnet und für alle
     Personen gleich.
  5. Entscheiden, ob ein fehlgeschlagener Vorschau-Bau das Einreichen verhindern soll oder die
     Fassung ohne Vorschau eingereicht wird (siehe offene Fragen).
- **Dateien:** `selfhost/runner.mjs`, `selfhost/project-plan.mjs`, `selfhost/managed-projects.mjs`,
  `selfhost/local-ai.mjs` (`aiCapabilities`), `selfhost/ai-routes.mjs`,
  `studio/project-ready.tsx`, `studio/project-connect.tsx`, `studio/team-task.tsx`.
- **Erfolg prüfen:** `selfhost/output-folder.test.mjs` (kommt mit dem Fix-Branch);
  `selfhost/project-plan.test.mjs` um „Ausgabeordner enthält Projektdateien → Plan abgelehnt“;
  `selfhost/project-overview.test.mjs` um „Projekt gemeldet, aber ohne Testbefehl → nicht
  startklar“.

### Paket 4 – Rollen an einer Stelle, Anleitung und Oberfläche folgen
- **Löst:** B2, B3, B4, B5, C1, C2, Teile von C3.
- **Inhalt:**
  1. Alle Besitzprüfungen (`createdBy`, `project_starts.owner`, Inhaber) durch
     `can(…,'admin')` ersetzen; Admin-Prüfung für `/api/github-project` ergänzen.
  2. Entscheiden und umsetzen: Soll Lesen an eine Rolle gebunden sein? Wenn ja, `view` in allen
     lesenden Projekt-Routen prüfen; wenn nein, die Meldung „nicht eingetragen“ und die Anleitung
     anpassen.
  3. Freigaben beim Abgeben festschreiben (Berechtigung zum Zeitpunkt der Stimme speichern) statt
     bei jedem Lesen neu zu bewerten; ausdrücklich festlegen, was eine Änderung der Prüfregel für
     offene Fassungen bedeutet.
  4. Zusammenführen im App-Betrieb entweder als bewusste Regel dokumentieren („Freigabe führt
     zusammen“) oder an Autor/Admin binden und den Knopf zeigen.
  5. Oberfläche: alle Schreibknöpfe über `useProjectAccess` steuern; statt Ausblenden ein Satz, wer
     es darf. Texte zur Prüfung aus der Prüfregel ableiten (eine Funktion, überall benutzt).
  6. `docs/ANLEITUNG.md` und `studio/guide.tsx` an das tatsächliche Verhalten angleichen.
- **Dateien:** `selfhost/project-roles.mjs`, `selfhost/team-http.mjs`, `selfhost/placement.mjs`,
  `selfhost/server.mjs`, `selfhost/github-workflow.mjs`, `selfhost/reviews.mjs`,
  `selfhost/team-model.mjs`, `studio/team-task.tsx`, `studio/team-workspace.tsx`,
  `studio/room-components.tsx`, `studio/task-next-step.ts`, `studio/guide.tsx`,
  `docs/ANLEITUNG.md`.
- **Erfolg prüfen:** `selfhost/project-roles.test.mjs` als Tabelle Rolle × Aktion gegen die
  Rollentabelle im Anhang ausbauen (inklusive „ernannter Admin setzt Live-Weg“ und „Freigabe
  bleibt nach Rollenwechsel“); `selfhost/plain-language.test.mjs` um die Regel „kein fester Text
  ‚zweite Person‘ ausserhalb der Ableitungsfunktion“.

### Paket 5 – Veralteter Stand und Zusammenführen mit Erklärung
- **Löst:** A4, D2.
- **Inhalt:**
  1. Neuer Runner-Auftrag „Stand übernehmen“: Hauptzweig in die Arbeitskopie zusammenführen; bei
     Konflikt abbrechen und die betroffenen Dateien auf Deutsch nennen.
  2. Beim Einreichen mitmelden, wie weit die Arbeitskopie hinter dem Hauptzweig liegt; die
     Aufgabenseite bietet dann „Erst auf den neuen Stand bringen“ an.
  3. Wartegrund des Zusammenführens speichern und im nächsten Schritt zeigen („GitHub meldet einen
     Konflikt mit …“, „GitHub-Prüfung läuft noch“), für Autor und Prüfer.
  4. Den Fall „auf GitHub zusammengeführt, in Studio nicht freigegeben“ ausdrücklich behandeln.
- **Dateien:** `selfhost/runner.mjs`, `selfhost/server.mjs`, `selfhost/github-workflow.mjs`,
  `studio/task-next-step.ts`, `studio/task-review-diff.tsx`, `studio/github-workflow.tsx`.
- **Erfolg prüfen:** `selfhost/github-workflow.test.mjs` um „nicht zusammenführbar → Grund
  gespeichert und in der Aufgabenantwort“; Runner-Test mit zwei lokalen Git-Arbeitskopien nach dem
  Muster von `selfhost/github-import.integration.test.mjs`: zweite Kopie übernimmt den neuen Stand,
  Konfliktfall liefert Dateiliste.

### Paket 6 – Verständlichkeit für neue Teammitglieder
- **Löst:** C3, C4, C5, B7, B8.
- **Inhalt:** einheitliche Knopfnamen für Freigabe bei Code und ohne Code; Meldungen ohne „dein
  Rechner“/„PC“ auf der Team-Werkstatt; „Antworten“ und „Als Aufgabe“ (mit Projektwahl) im
  allgemeinen Gespräch; Übungsrunde um einen Code-Durchlauf ergänzen, sobald Paket 3 steht;
  gleiche Zählregel für Stimmen bei Ergebnissen ohne Code; abgelaufene Live-Vorschau als
  „abgelaufen – neu bauen“ kennzeichnen.
- **Dateien:** `studio/task-review-diff.tsx`, `studio/studio-general.tsx`,
  `selfhost/workspace-http.mjs`, `selfhost/practice.mjs`, `selfhost/team-http.mjs`,
  `selfhost/collaboration.mjs`, `app/workflow-terms.ts`.
- **Erfolg prüfen:** `selfhost/workflow-terms.test.mjs`, `selfhost/practice.test.mjs`,
  `selfhost/team-workflow.test.mjs` (Stimmen), zusätzlich sichtbare Browserprüfung laut
  `AGENTS.md`.

---

## 5. Was gut gelöst ist und bleiben soll

- **Freigabe gilt für genau eine Fassung.** Stimme, Auftrag und Commit sind verknüpft; der Server
  prüft den Commit beim Abgeben (`/api/development/reviews`), beim Start des Zusammenführens und
  noch einmal unmittelbar vor der Ausführung (`/api/runner/poll`). GitHub erhält beim
  Zusammenführen den geprüften Commit mit.
- **Erneutes Speichern nach Freigabe** wird erkannt (`changedAfter`), setzt die Aufgabe zurück und
  sperrt das Zusammenführen („Der Prüfstand ist nicht mehr aktuell.“). Ausgeführt bestätigt.
- **Geänderte Abschlussbedingungen** entwerten Ergebnis und Freigabe (`contractRevision`).
- **Doppelt gemeldete Aufträge** richten keinen Schaden an: Abschlussmeldungen brauchen ein
  einmaliges Pfand (`lease`), ein abgebrochener Auftrag wird nie ein zweites Mal ausgeführt,
  Ereignisse werden nach Nummer dedupliziert.
- **Wiederholbare Schreibvorgänge** mit eigener Kennung (Rückmeldung, Ergebnis, Projekt anlegen)
  und Versionsprüfung beim Bearbeiten („inzwischen geändert, dein Entwurf bleibt erhalten“).
- **Schreibrechte liegen auf dem Server** und sind getestet (`project-roles.test.mjs`,
  `team-workshop.test.mjs`); Dateiinhalte und Dateiprotokolle sind nur für die Person mit der
  Arbeitskopie lesbar.
- **Kein erzwungenes Überschreiben** des Hauptzweigs; Konflikte lassen ihn unverändert.
- **Der eine nächste Schritt** als reine, getestete Funktion (`studio/task-next-step.ts`) ist der
  richtige Ansatz; Paket 1 baut darauf auf, statt ihn zu ersetzen.
- **Übernahme einer Aufgabe** mit Begründung, Archivierung der alten Arbeitskopie und Schutz vor
  Übernahme während eines laufenden Auftrags.

---

## 6. Offene Fragen und nicht geprüfte Bereiche

**Entscheidungen, die vor der Umsetzung nötig sind**
1. Soll die Freigabe im GitHub-App-Betrieb selbst zusammenführen (heutiges Verhalten) oder soll
   Zusammenführen ein eigener Schritt von Autor oder Admin bleiben (heutige Anleitung)?
2. Ist „Zuschauer“ eine echte Lesegrenze, oder teilen alle Mitglieder weiterhin alles und die Rolle
   regelt nur das Schreiben?
3. Soll ein fehlgeschlagener Vorschau-Bau das Einreichen verhindern?
4. Soll eine Freigabe gültig bleiben, wenn die Prüferin später die Rolle verliert?
5. Darf jedes Mitglied seinen eigenen PC für ein Projekt einrichten, oder nur Entwickler?

**Nicht geprüft**
- Alles, was eine echte GitHub-Verbindung braucht: Verhalten von GitHub bei veraltetem Zweig,
  Branch-Schutz, Pull-Request-Zuordnung nach erneutem Einreichen. Aussagen dazu stammen aus dem
  Code.
- Der echte Runner mit Git (Arbeitskopie anlegen, Einreichen, Zusammenführen) wurde nicht
  ausgeführt; der Runner wurde über seine Server-Schnittstelle simuliert.
- Der Zugang für KI-Assistenten (`selfhost/studio-mcp*.mjs`, `selfhost/studio-plugin-*.mjs`) und
  ob er dieselben Rollenprüfungen durchläuft.
- Einladung, Anmeldung, Passwort, Sicherung, Auslieferung, lokale KI.
- Die ältere Oberfläche unter `app/` nur dort, wo sie in die Aufgabenseite eingebettet ist
  (`app/development.tsx`); `app/workspace.tsx`, `app/collaboration-board.tsx` und
  `app/code-review.tsx` wurden nicht gelesen.
- `studio/guide.tsx` wurde nicht Satz für Satz mit `docs/ANLEITUNG.md` verglichen.
- Kein Browser, keine mobile Ansicht, keine laufende Instanz.

---

## 7. Die drei Änderungen mit der grössten Wirkung

1. **Paket 1 – ein Aufgabenzustand vom Server, Fehler bleiben sichtbar.** Zuerst, weil es die
   meisten Beobachtungen aus dem Bedienungstest direkt beseitigt, klein ist (eine Route, eine reine
   Funktion, ein Aufruf) und die Grundlage für alles Weitere legt: Pakete 2, 3 und 5 brauchen genau
   diese Stelle, um ihre Erklärungen anzuzeigen. Ohne sie bleiben auch behobene Fehler stumm.
2. **Paket 2 – Auftragslebenszyklus und Sperre pro Arbeitskopie.** Als Zweites, weil es das
   einzige Problem ist, das mit jeder weiteren Person schlimmer wird: Zwei Personen auf einer
   Werkstatt blockieren sich heute gegenseitig, und ein einzelner hängender Auftrag legt alle lahm.
   Es setzt Paket 1 voraus, damit „du bist als Nächstes dran“ und „Auftrag unterbrochen“ sichtbar
   werden.
3. **Paket 3 – „Startklar“ heisst einmal bewiesen.** Als Drittes, weil es Fehler vom Arbeitstag der
   Entwickler zur einmaligen Einrichtung des Admins verschiebt. Der Fix-Branch ist der erste Teil
   davon und kann sofort übernommen werden. Es steht hinter Paket 2, weil der Probelauf selbst ein
   Auftrag ist und einen verlässlichen Lebenszyklus braucht.

Paket 4 (Rollen) folgt bewusst danach: Der Server schützt das Ändern bereits, der Schaden ist
heute Verwirrung, nicht Fehlbedienung. Es sollte aber vor dem Einladen weiterer Personen erledigt
sein, weil es Entscheidungen verlangt (Abschnitt 6).

---

## Anhang A – Zustandsübersicht

| Gegenstand | Zustände | Wo gespeichert | Wer ändert | Auffälligkeit |
|---|---|---|---|---|
| Aufgabe | offen (`todo`), in Arbeit (`doing`), in Prüfung (`review`), erledigt (`done`); zusätzlich „hängt fest“, „abgebrochen“, Fassung der Abschlussbedingungen | `tasks.status` und `team:v1:task:<id>` | Person (übernehmen, loslegen, abschliessen) und Server als Nebenwirkung von Auftragsmeldungen | `status` ist nur ein Hinweis; massgeblich ist `completion()` in `team-model.mjs`, das bei jedem Lesen neu rechnet |
| Arbeitskopie | wird erstellt, bereit, unterbrochen, freigegeben (archiviert) | Vorbereitungsauftrag in `jobs` plus `workspaces` | Besitzer; bei Übernahme der Server | gehört genau einer Person und einem Rechner; kein Zustand „hinter dem Hauptzweig“ (A4) |
| Auftrag | wartet, läuft, wird abgebrochen, fertig, fehlgeschlagen, abgebrochen, unterbrochen | `jobs.status`, Ergebnis in `jobs.result` | Server beim Anlegen, Runner beim Melden | „unterbrochen“ entsteht nur, wenn derselbe Runner wieder anfragt (A2); einer pro Rechner gleichzeitig (A1) |
| Prüfung | nicht verfügbar, offen, Änderungen angefordert, freigegeben | nicht gespeichert: berechnet aus `code_reviews` je Auftrag und Commit | Prüfer durch Stimmen | hängt von heutigen Rollen ab (B4); bei Ergebnissen ohne Code andere Zählregel (B7) |
| Zusammenführen | nicht zusammengeführt, zusammengeführt | abgeleitet: fertiger `integrate`-Auftrag oder `githubMerged` im Ergebnis | direkter Weg: Autor oder Admin; GitHub-App: Server nach Freigabe | kein Zustand „wartet, weil …“ (A4) |
| Live | offen, bestätigt (nur bei „wir schalten selbst live“) | `team:v1:live:<Aufgabe>` | jede Person mit Entwicklerrolle | gilt je zusammengeführter Fassung |

## Anhang B – Rollen und Aktionen: Anleitung, Oberfläche, Server

„Server“ ist die tatsächlich geprüfte Regel. Abweichungen sind **fett**.

| Aktion | Anleitung | Oberfläche | Server |
|---|---|---|---|
| Projekt, Aufgaben, Änderungen lesen | Zuschauer und höher | alle | **jedes angemeldete Mitglied, auch ohne Rolle im Projekt** (B5) |
| Im Projektgespräch schreiben, Aufgabe kommentieren | Zuschauer und höher | alle | Rolle im Projekt nötig (ansehen) |
| Aufgabe anlegen, bearbeiten, übernehmen, „Als Aufgabe“ | Entwickler | **für alle sichtbar** (C1) | Entwickler oder Admin |
| Arbeitskopie, Dateien ändern, „Zur Prüfung geben“ | Entwickler, nach gespeicherter Änderung | Hauptknopf nach Rolle; **auch ohne Änderung** (A6) | Entwickler oder Admin, eigene Arbeitskopie, zuständig für die Aufgabe; **keine Prüfung auf Änderung** |
| Freigeben, Änderungen anfordern | Prüfer; eigene Änderung nur Admin mit Regel „allein“ | nach Rolle | Prüfer oder Admin; eigene nur Admin mit Regel „allein“; Stimme zählt nach **heutiger** Rolle (B4) |
| Rückmeldung ohne Entscheidung | nicht erwähnt | – | Rolle im Projekt (ansehen) |
| Zusammenführen, direkter Weg | Autor oder Admin | Autor | Autor (mit Entwicklerrolle) oder Admin |
| Zusammenführen, GitHub-App | Autor oder Admin | „Studio führt zusammen“ | **automatisch durch die Freigabe des Prüfers; nachgeholt beim Statusabruf von Autor oder Admin** (B3) |
| „Ist jetzt live“ | je nach Projekt | wer die Aufgabe sieht | Entwickler oder Admin |
| Aufgabe abschliessen | wenn alles erledigt ist | zuständige Person | Entwickler oder Admin, zuständige Person, alle Bedingungen erfüllt |
| Rollen, Prüfregel, Team-Werkstatt, Repository wählen | Admin | Admin | Admin |
| Live-Weg, Hauptzweig, Übernahmeregel | Admin | Admin | **Admin und zusätzlich Inhaber oder Anleger des Projekts** (B2) |
| Ausführungsregel (PC oder Server) | nicht erwähnt | laut Server | **Inhaber oder Projektstart-Eintrag; Rolle Admin genügt nicht** (B2) |
| Neues GitHub-Repository für das Projekt anlegen | Admin | Admin | **jedes Mitglied mit persönlichem GitHub-Zugang, nur ohne GitHub-App** (B5) |
| Werkstatt einrichten | Admin | wer einen eigenen Rechner hat | **jedes Mitglied für den eigenen Rechner**; Team-Werkstatt nur, wenn der Besitzer Admin ist |
| Einladen, Mitglied entfernen | Inhaber | Inhaber | nicht geprüft (ausserhalb des Schwerpunkts) |
