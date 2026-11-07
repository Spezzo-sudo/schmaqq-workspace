# Nachtübergabe an Claude – SCHMAQQ Studio, 29.10.2026

## Auftrag des Owners

Marco geht schlafen; sein Codex-Nutzungslimit ist fast erreicht. Claude soll mit
dem von Marco ausgewählten **Opus 5.5** über die bestehende Abo-Anmeldung lokal
weiterarbeiten. Kein API-Schlüssel, keine zusätzliche Modell-API, keine Kosten,
kein Limit-Bypass und kein stiller Modellwechsel. Diese Übergabe startet Claude
nicht und bestätigt weder seine Anmeldung noch die Modellverfügbarkeit.

Ziel ist ein prüfbares Klarheits-/Designpaket und die Behebung der belegten
Praxistest-Blocker. Kein Beschäftigungslauf: Mehrere unabhängige Pakete unten
verhindern frühes Festhängen; sind sie abgearbeitet, ist Feierabend.

## Start und verbindliche Grenzen

Arbeite ausschließlich in:
`C:/Users/hi/Documents/ChatGPT/SCHMAQQ/schmaqq-plugin-worker-prototype`

Branch `local/studio-plugin-worker-prototype`, Remote
`https://github.com/Spezzo-sudo/schmaqq-workspace.git`.
Eigene AGENTS.md und obersten HANDOFF-Abschnitt lesen; dann diesen Auftrag und
gezielt Originalquellen. Andere lokale Studio-Checkouts sind ältere Stände.

Aktueller Nutzerauftrag erlaubt lokale Umsetzung, Tests, Dokumentation, lokale
Commits und Sicherung per normalem Push **nur auf diesen eigenen Branch**.
Keine Force-Pushes, kein Merge nach main, keine Freigabe von PRs.
Der vorausgehende „ja, live“-Auftrag betraf ausschließlich den bereits
ausgelieferten Einrichtungsstand und ist **keine** Freigabe für nächtliche neue
Deployments, VPS-/Preview-/Datenbank-/DNS-/System-/Provideränderungen.
NetzKontor/Marketingwebsite und Klimafinder-Code nicht bearbeiten.

Keine persönlichen Logins, Runnerprofile, Auth-Caches oder Owner-Sitzungen
verwenden. Lokale UI-Abnahme ausschließlich mit synthetischen Testkonten und
isolierter Fixture. Fehlende Owner-Anmeldung ist nachts kein Grund zu warten.
Globale Codex-/Claude-Einstellungen und Hooks nicht still ändern.

## Vorab: den gestrigen Hook-Loop verhindern

Ein Prompt allein stoppt keinen fehlerhaften Stop-Hook. Deshalb:

1. Vor einer Nutzung von `/goal` die tatsächlich wirksamen projektlokalen und
   eingebundenen Stop-/Goal-Hooks prüfen. Nur die relevante Hook-Konfiguration
   lesen, keine Zugangsdaten/kompletten privaten Settings ausgeben.
2. Prüfen, ob terminale Zustände FERTIG, TEILFERTIG, BLOCKIERT und LIMIT den
   erneuten Start tatsächlich beenden. Nicht nur behaupten, sondern den
   Mechanismus anhand seiner lokalen Dokumentation/Implementierung belegen.
3. Ist das nicht eindeutig belegbar oder würde es Änderungen globaler Settings
   brauchen, **kein `/goal` und keinen automatischen Wiederanlauf verwenden**.
   Einen alten Goal mit dem dokumentierten `/goal clear` entfernen. Separat
   wirksame eigene Stop-Hooks im dokumentierten `/hooks`-Menü prüfen: eine normale
   Sitzung kann sie ebenfalls erben. Nur wenn kein fehlerhafter Wiederanlauf mehr
   aktiv ist, den Auftrag normal abarbeiten. Keine Hooks installieren und keine
   allgemeinen Sicherheits-/Freigabehooks pauschal deaktivieren.
4. Ein Hook, der bei unverändertem Login-/Limit-/Berechtigungsproblem weiterhin
   „mach weiter“ verlangt, darf keinen weiteren Modelllauf auslösen. Unterstützt
   die vorhandene Umgebung kein sicheres Stoppen/Abschalten für diese Sitzung,
   vor einem unbeaufsichtigten Goal sauber BLOCKIERT beenden und normalen Start
   empfehlen. Keine Testschleife, um das Verhalten über viele Modellaufrufe zu testen.

Die folgenden Grenzen sind Arbeitsregeln, **kein bereits eingerichteter externer
Watchdog**. Nicht als technisch garantierte Token-/Zeitbegrenzung darstellen.

Dokumentation am 29.10.2026 tatsächlich gelesen:
[Claude Goal](https://code.claude.com/docs/en/goal),
[Stop-Hooks](https://code.claude.com/docs/en/hooks#stop).
Ein Goal ist ein sitzungsbezogener Fortsetzungsmechanismus; normale Stop-Hooks
können zusätzlich wirken. `stop_hook_active` soll Wiederholungen verhindern.
Die dokumentierte Grenze aufeinanderfolgender Hook-Fortsetzungen wird durch
Toolaufrufe zurückgesetzt und ist daher kein verlässliches Gesamttokenbudget.
Zeit-/Turnklauseln im Goal werden vom Evaluator bewertet, nicht von einem hier
installierten unabhängigen Timer. Lokale Version/Host können abweichen.

Nach bestandener Vorprüfung darf der tatsächliche Claude-Lauf optional diesen
**vollständigen terminalen** Goal statt einer offenen Formulierung verwenden:

```text
/goal Arbeite docs/NIGHT_HANDOFF_20261029.md ab. Ende, sobald P0–P5 lokal umgesetzt und belegt sowie normal auf den erlaubten Branch gesichert sind ODER wenn 24 ausgewertete Goal-Turns bzw. vier Stunden ab Start erreicht sind ODER keine unabhängige freigegebene Arbeit mehr möglich ist ODER Anmeldung/Berechtigung/Nutzungslimit die weitere Sitzung blockiert. Im letzten möglichen Arbeitsschritt lokalen Zwischenstand und docs/NIGHT_STATUS_20261029.md mit FERTIG, TEILFERTIG, BLOCKIERT oder LIMIT sichern; gescheiterten Push ausdrücklich offen lassen statt weiter zu warten. Nicht auf den schlafenden Owner warten, keine Auth-/Limit-Wiederholungen, kein neues Ziel und keine automatische Wiederaufnahme. Live, globale Einstellungen und Fremdprojekte bleiben unverändert. Der terminale Bericht mit exaktem lokalen/Remote-Stand und offenen Punkten erfüllt die Stop-Bedingung auch bei sauber dokumentierter Teilerfüllung.
```

Wenn Limits/Fehler durch den Host weiter automatisch aufgegriffen werden könnten,
Goal ausdrücklich löschen und die dokumentierte sitzungsbezogene Abschaltung
automatischer Check-ins/Retrys nur bei belegter Versionsunterstützung verwenden;
keine globale Umgebungsvariable setzen und keine Wiederaufnahme zum Limitreset.

### Abbruch statt Warten

- Gleiche Fehlerursache höchstens einmal gezielt korrigieren und einmal erneut
  prüfen. Bei erneutem gleichen Fehler Paket BLOCKIERT markieren. Keine dritte
  identische Anmeldung, Abfrage oder Tool-Wiederholung.
- 401/403, interaktiver Login, fehlende Kontofreigabe, Rate-/Nutzungslimit oder
  kostenpflichtige Voraussetzung: nicht auf den schlafenden Owner warten.
  Keine Auth-Erneuerungsschleife, kein Reset-Polling und keine Ersatz-API.
- Ein blockiertes Paket hält unabhängige lokale Pakete nicht auf. Erst wenn
  keine sinnvolle freigegebene Arbeit mehr möglich ist: Zwischenstand sichern,
  BLOCKIERT/TEILFERTIG ausgeben und Sitzung beenden.
- Am tatsächlichen Abo-Limit sofort soweit noch möglich lokal sichern, LIMIT
  notieren und enden. Kein Versuch, das Limit automatisiert zu umgehen.
- Nach jedem Paket `docs/NIGHT_STATUS_20261029.md` aktualisieren. Einen neuen
  Modelllauf nicht allein zum Statusschreiben oder zur Verlängerung starten.
- Maximal vier Stunden aktive Arbeit ab tatsächlichem Start; Uhr an
  Paketgrenzen prüfen. Kein Mindestlauf und keine Leerlaufzeit. Vor Ablauf
  Abschluss reservieren; danach TEILFERTIG statt weitere Aufgaben erfinden.
- Sind alle unten priorisierten Pakete bestanden oder nachvollziehbar blockiert,
  endet der Auftrag. Kein zweites Goal, kein Monitor, kein Heartbeat/Cronjob.

## Tatsächlicher Ausgangsstand

Studio und Worker wurden mit Owner-GO bereits auf den Codecommit
`f1394194b50c9f2153668d9d853cfac03be36bcc` aktualisiert. Lokal folgten
Betriebsdokumentation und Praxistestnotizen; aktuellen HEAD/Status mit Git lesen.
Original: `docs/evidence/PROJECT_CONFIGURATION_DEPLOY_20261029.md`.

Selbst durch Codex ausgeführt: lokale Prüfung 271 Tests, 250 PASS, 0 FAIL,
21 Windows-/Plattform-Skips, Guard/TS/Build PASS. Echte Linux-Job-Isolation
10/10, Worker-Sandbox 29/29, Release/Backup/Probestart/Datenkopie/Schema/Health
PASS. Diese Ergebnisse sind Historie, kein PASS für deine neuen Änderungen.
Die Linux-Operator-Recovery-Gesamtsuite ist damit nicht neu nachgewiesen.

Der Owner legte Klimafinder an und bestätigte den Einrichtungsvorschlag.
ChatGPT konnte über Studio eine aufgabengebundene Arbeitskopie anlegen und
Quelltexte lesen. Root hat die ersten vier Job-IDs selbst über Studio gelesen.
Dateien kamen tatsächlich über Studio; fachliche Analyseergebnisse des anderen
Chats bleiben separat berichtete, nicht komplett unabhängig geprüfte Befunde.

Relevante IDs (nur Referenz, nachts keine Owner-Mutationen):
- Projekt: `c731fcac-5420-4be8-956b-842c32488fc3`.
- Analyseaufgabe: `be0c4c20-a56b-4c55-9162-5fff882bbc4d`.
- Lesekopie: `8dc592f2-ca54-492d-a2c0-7dbe5156939f`.
- Klimafinder-Quellstand laut Worker: `f60408a55dd6b841f68a5cb5dd5e3cf92d05f599`.

Der isolierte Worker hat make/python3/venv/jinja2; **ensurepip fehlt**.
Kein Klimafinder-Build ausgeführt, keine Pakete installiert und kein Netz
freigeschaltet. Das ist nachts kein Installationsauftrag und kein Blocker
für lokale Studioentwicklung mit eigenen Fixtures.

## Arbeitspakete – in dieser Reihenfolge

### P0 – Allgemeine Analyse mit Lesekopie bleibt allgemeine Aufgabe

Belegter akuter Blocker: `selfhost/team-model.mjs`, `taskContract`, erzwingt
`kind: code`, sobald irgendeine Arbeitskopie zur Aufgabe existiert. Dadurch
kann der Owner sein reines Analyseergebnis nicht festhalten. Ein Rückwechsel
zu general ist in `selfhost/team-http.mjs` ebenfalls pauschal gesperrt.
Die Oberfläche zeigt zugleich „Allgemeine Aufgabe“ und Codeabschlussregeln.

Quelle: `docs/evidence/READ_ONLY_COPY_TASK_KIND_20261029.md`.

Untersuche vor Änderung die tatsächlichen Schreib-/Review-/Submitpfade und
Legacy-Zustände. Fixe die Domänenregel, nicht nur den sichtbaren Text. Lesen
einer Kopie darf die explizite Aufgabenart nicht ändern; echte Codebearbeitung
darf umgekehrt nicht durch ein allgemeines Ergebnis die Codegates umgehen.
Keine Production-Taskdaten direkt reparieren oder Arbeitskopien löschen.

Abnahme: reine Lesejobs + Kopie -> allgemeines Ergebnis speicher-/lesbar;
Artanzeige, Ergebnisformular und Abschlussregeln stimmen überein. Echte
Codeänderungen behalten bestehende Test-/Review-/Integrationsgates. Regression
für Übergänge, Legacy-Zustand und unbefugte/konkurrierende Änderungen.

### P1 – Vollständiger Aufgaben-Kontext und auffindbare Aufgabe

`buildRoomContext` in `selfhost/room-http.mjs` exportiert Titel/Beschreibung,
aber nicht `contract.criteria`. Kriterien existieren nachweislich in den
read-file-Jobdaten unter contractSnapshot. Ergänze benötigte Abschlusskriterien
und Aufgabenart samt Revision im begrenzten, autorisierten Kontext. Alle
Scopes/Auth-/Projektgrenzen und Größenlimits erhalten.

Die KI konnte eine Aufgabe anhand ihres Titels nicht auffinden, erst nach
manueller Weitergabe der Task-ID. Prüfe eine kleine lesende Aufgabenauflistung
im bestehenden MCP-Vertrag oder eine gleichwertige sichere Auffindbarkeit.
Keine neue OAuth-Architektur und kein automatischer Anbieteraufruf.

Quelle: `docs/evidence/STUDIO_ONLY_SOURCE_ACCESS_20261029.md`.
Abnahme: Kriterien stimmen mit gespeichertem Vertrag überein; richtige Aufgabe
ohne manuelles Abschreiben einer URL-ID auffindbar; fremde/fehlende Projekte
abgewiesen; Kontext bleibt begrenzt. Keine unvollständigen Angaben als vollständig
kennzeichnen. MCP-/HTTP-Vertragsprüfungen ergänzen.

Der vollständige zuletzt vom Owner übergebene externe Analysebericht liegt
unter `docs/evidence/KLIMAFINDER_MAIN_ANALYSIS_REPORTED_20261029.md`. Er dient
als Repro-/Lückenhinweis (insbesondere große Dateien), ist kein Auftrag für
Klimafinder-Code und kein unabhängig bestätigter fachlicher Testnachweis.

### P2 – Große Quelldateien sicher abschnittsweise lesen

Die reine Analyse scheiterte an 64 KB für home.js, home.css und products.v1.json.
`selfhost/files.mjs` verwendet derzeit für Lesen und Bearbeiten dieselbe Grenze.
Erweitere **nur den lesenden** Weg mit begrenzten Abschnitten/Seiten. Kein
unbegrenztes readFile, keine pauschale Erhöhung der Schreib-/Editorgrenze.

Entwirf die kleinste Erweiterung für read-file/Runner/HTTP/MCP. Bestehende
64-KB-Schreibgrenze, Secret-Pfadfilter, Symlink-/Hardlink-/UTF-8-Schutz und
Revisionsprüfung erhalten. Antwort muss Bereich, Fortsetzung, Größenlimit und
Stand klar erkennen lassen. Keine Byte-/Zeilenlücken oder still abgeschnittenen
UTF-8-Zeichen; wechselnden Dateistand zwischen Abschnitten melden. Große/übergroße
Dateien dürfen nicht zu unbegrenztem Speicher-/Toolausgabeverbrauch führen.

Abnahme: Dateien >64 KB über mehrere begrenzte Leseaufrufe untersuchbar;
Schreibgrenze unverändert; Randfälle/Traversal/Secrets/Symlinks/Revisionwechsel
getestet. Kein Livezugriff auf die drei echten Dateien für die lokale Abnahme nötig.

### P3 – Klarer Einstieg, verständliche Begriffe, Fokus und Ergebnisrückweg

Owner-bestätigte Beschriftungen:
- „Rechner verbinden“ -> **„PC oder Server hinzufügen“**.
- „Projekt auf PC oder Server einrichten“ -> **„<Projektname> einrichten“**.
- „KI hinzunehmen“ bezeichnet aktuell nur lokale Modelle, obwohl ChatGPT/Claude
  über MCP verbunden sind. Diese zwei Wege ehrlich unterscheiden.

Ergänze einen verständlichen Einstieg für die bereits verbundenen externen
Assistenten, z.B. aufgabengebundene Übergabe mit kopierbarem Auftrag/Kontext und
Verweis auf vorhandene Verbindungen. Keine Anmeldung als Owner, keine erfundenen
Anbieterdeeplinks, keine Zugangsdaten in Copytexten. Verbundene KI arbeitet im
eigenen Chat; nicht behaupten, der Knopf starte selbst ein externes Modell.

Ein Klick auf eine aufgeklappte Arbeitsfläche muss diese sichtbar machen und
sinnvoll fokussieren (nicht unter festem Kopf verdecken). Schließen gibt Fokus
zurück. Hintergrundpolling darf nicht scrollen oder Schreibfokus stehlen.
Bestehenden Einrichtungsfokus erhalten und Aufgaben-KI, Aufgabenbearbeitung,
Ergebnis-/Prüfungswechsel sowie Verbindungsflächen gezielt abdecken.

Weitere bestätigte Probleme:
- „Projekt eingerichtet“ wird schon für eine nur vorhandene Repositorykopie
  gezeigt. Kopie vorhanden / konfiguriert / getestet getrennt und ehrlich benennen.
- „Das erreichte Ergebnis bitte zuerst festhalten“ steht bereits beim Arbeitsstart.
  Früh einen passenden nächsten Schritt anzeigen, ohne Prüfung vorzutäuschen.
- Technische Werte wie Make-Projekt, Buildausgabe, Befehle in Details; oben
  „Einrichtungsvorschlag für <Projekt>“ und eine verständliche Bedeutung.
- Der fehlende Python-Modulnachweis darf hinter „Programme vorhanden“ nicht
  verschwinden. Keine pauschale Fähigkeit behaupten; keine Systeminstallation.
- Eine externe Analyse soll nachvollziehbar in die Studio-Aufgabe zurückkommen.
  Allgemeines Ergebnisformular nach P0 nutzbar und gut auffindbar machen.

Quellen: `SETUP_BUTTON_LABELS_20261029.md`, `PRACTICAL_TEST_FOCUS_20261029.md`
unter docs/evidence und genannte Nachweise. Kein kompletter neuer Wizard.
Abnahme: synthetischer Nutzer durchläuft Einrichten -> Analyseaufgabe -> lesende
Kopie -> Ergebnisentwurf ohne falschen Codeabschluss. Tastaturfokus, Scroll,
Entwurfserhalt und 390-px-Ansicht sichtbar prüfen.

### P4 – Studio an bestehende SCHMAQQ-Gestaltung angleichen

Owner wünscht ausdrücklich Designarbeit über Nacht. Referenz ist die bestehende
SCHMAQQ-Website, keine neue Markenrichtung. Einstieg:
`docs/R27_DESIGN_AND_TEAM_DIFF.md`, `studio/design-reference.tsx`,
`studio/schmaqq-design-system.css`, `studio/brand.css` und die tatsächlich
eingebundenen Komponentenstile. Die eingebauten Quellreferenzen sind datierte
Belege, kein automatischer Beweis des heutigen Website-Stands.

Arbeite lokal an Konsistenz von Farben, Typografie, kleinen/eckigen Ecken,
Schaltflächen, Fokus/Hover-Schatten, Abständen und verständlicher Hierarchie.
Vorhandene Design-Tokens verwenden statt weiterer ad-hoc-Farben. Nicht blind
CSS-Dateien vollständig umschreiben. Funktionsreparaturen aus P0–P3 erhalten.
Die dunkle Seitenleiste wurde ausdrücklich für späteren Screenshotvergleich
vertagt: keine ungefragte komplette Änderung dieses Konzepts.

Vorhandenes SCHMAQQ-Logo und dessen Animation wiederverwenden, Reduced Motion
respektieren. Logo muss einen verständlichen Rückweg in die vorhandene
Studio-Startansicht bieten. Gibt es keine geeignete Startansicht, erst den
kleinen Navigationsbedarf klären und dokumentieren statt einen falschen Home-
Link zu erfinden. Die Einbindung in schmaqq.com nur als konkreten lokalen
Vorschlag dokumentieren; weder fremdes Website-Repo noch Production verändern.
Kein Neukonto, Assetkauf, neue kostenpflichtige Bibliothek oder Bild-API.

Abnahme: Vorher/Nachher-Screenshots aus synthetischer lokaler Sitzung auf Desktop
und 390 px, kein Seitenüberlauf, sichtbarer Fokus, erhaltene Bedienbarkeit,
Animation mit Reduced Motion geprüft. Keine Marketing-V1-Farben ohne Freigabe.

### P5 – Gemeinsame Abnahme und Morgenübergabe

Nach relevanten Änderungen fokussierte Regressionen zuerst; zum Abschluss
einmal lokale Gesamtprüfung, Source Guard, TypeScript, Build und sichtbarer
Browserablauf. Nur bei neuen Änderungen/Fehlern passende Prüfungen wiederholen.
Keine unveränderte Testsuite als Beschäftigungsschleife.

Ein lesender Gegenreview gegen exakten Diff und Originalanforderungen ist bei
verfügbaren nativen Agenten sinnvoll. Höchstens zwei parallel, drei Starts und
eine Korrekturschleife für diesen Nachtauftrag; keine verschachtelten Starts und
nur ein Schreiber je Datei. Keine behauptete unabhängige Sandbox durch Rollennamen.

Fehlt Browseranbindung, lokale Fixture und Build trotzdem vorbereiten, visuelle
Abnahme ausdrücklich OFFEN lassen und unabhängige Pakete fortsetzen. Kein
Owner-Login und kein pauschaler UI-PASS aus einem Build. Fehlt ein Systemprogramm,
den bestehenden freigegebenen lokalen Pfad nutzen, nicht global installieren.

## Vorhandene Werkzeuge ohne neue Installation

Im Repository-Root in PowerShell (Umgebung nur für diesen Prozess):

```powershell
$env:PATH='C:/Users/hi/Documents/ChatGPT/SCHMAQQ/.local-tools/git/cmd;'+$env:PATH
$env:GIT_EXEC_PATH='C:/Users/hi/Documents/ChatGPT/SCHMAQQ/.local-tools/git/ucrt64/libexec/git-core'
node selfhost/verify.mjs --local
```

Node >=24.15 im PATH war vorhanden. Vollständiges lokales Git ist wichtig für
den bestehenden Git-Daemon-Test; das abgespeckte Codex-Bundle scheiterte daran.
Python: `C:/Users/hi/Documents/ChatGPT/SCHMAQQ/.local-tools/python/python.exe`.
Kein WSL/Make auf diesem PC nachgewiesen; nichts installieren.
Browserfixture: `scripts/project-setup-browser-fixture.mjs` ist ein Einstieg,
aber an den neuen Ablauf anpassen/ergänzen und eigene PIDs/Ports dokumentieren.
Persönliche Produktionsdaten dürfen keine Fixture werden.

Git-Autor war im lokalen vollständigen Git nicht konfiguriert. Für lokale
Codex-Commits wurden ausschließlich Aufrufoptionen mit Agentenname verwendet,
keine globalen Einstellungen verändert. Claude kann für eigene Commits einen
ehrlichen Agentenautor verwenden, keine Owneridentität erfinden.

## Abschluss, Sicherung und optionales Ausschalten

1. Eigene lokalen Fixture-/Runner-/Hilfsprozesse kontrolliert beenden; keine
   fremden Prozesse stoppen. Logs/Screenshots privat unter `.studio/` belassen;
   einen teilbaren Bericht ohne Secrets in docs/evidence schreiben.
2. `docs/NIGHT_STATUS_20261029.md`, obersten HANDOFF-Abschnitt, WORKLIST und
   STATUS.json wahrheitsgemäß aktualisieren. Arbeitsbasis erhält nur eine neue
   geprüfte Eingangsvorschlagsnotiz, keine bestehenden Notizen überschreiben.
3. Klare lokale Commits je sinnvollem Paket/Abschluss. Source Guard, Diff und
   keine privaten Runtime-/Authdateien prüfen. Normales `git push origin
   HEAD:refs/heads/local/studio-plugin-worker-prototype`. Keine Force-Option.
4. Push einmal prüfen. Bei Fehler einmal ursachengerecht wiederholen; dann
   lokalen Commit und exakte Meldung sichern, Push OFFEN, kein Loginloop.
5. Nach erfolgreichem Push tatsächlichen Remote-Branch-SHA mit lokalem HEAD
   vergleichen (`git ls-remote`), nicht nur fehlenden Ahead-Zähler betrachten.
   Arbeitsbaum und Index müssen sauber sein; untracked private Artefakte nicht
   versehentlich committen, benötigte lokale Artefakte aber erhalten.
6. Endzustand im Bericht: FERTIG / TEILFERTIG / BLOCKIERT / LIMIT, umgesetzte
   Pakete, tatsächlich ausgeführte Prüfungen, offene Punkte, lokaler/Remote-
   Commitstand und **genau eine nächste Aktion für morgen**. Danach enden.

Owner erlaubt optional PC-Herunterfahren erst nach ordentlichem Abschluss und
lokaler **und** GitHub-Sicherung. Das ist kein aktueller Shutdown-Befehl dieser
Übergabe. Claude darf es am Ende nur tun, wenn zusätzlich kein anderer Agent
oder eigener Job mehr arbeitet, kein ungesicherter Editorentwurf bekannt ist,
kein Goal-/Stop-Hook erneut startet und die verwendete normale Windows-
Herunterfahrmethode offene Anwendungen nicht zwangsweise beendet. Kein `/f`,
kein pauschales Prozesskillen. Kann eine dieser Bedingungen nicht sicher geprüft
werden oder ist Push/Abnahme blockiert: **PC anlassen, Bericht schreiben, enden**.
Keine Shutdown-Dauerschleife und keinen geplanten Shutdown im Voraus einrichten.

## Eindeutige Definition von FERTIG

P0–P4 sind umgesetzt und ihre genannten lokalen Abnahmen bestanden; P5-Bericht,
Commits und normaler Push mit bestätigtem Remote-SHA liegen vor. Kein Live-PASS
für diese neuen Änderungen. Werden Pakete wegen echter Grenzen nicht erreicht,
ehrlich TEILFERTIG/BLOCKIERT statt „FERTIG“; auch dann endet die Sitzung geordnet.

Nicht erlaubt: das Ziel nach Erreichen erweitern, auf Antworten des schlafenden
Owners warten, denselben Authblocker bearbeiten, Limits abfragen oder neue
Automationen starten, um bis morgens beschäftigt zu bleiben.
