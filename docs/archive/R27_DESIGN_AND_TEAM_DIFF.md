# R27 — SCHMAQQ Designkonvergenz und aufgabenbezogene Team-Änderungsansicht

Status: isolierter, reviewbarer Kandidat. **Nicht produktiv aktiviert**.

## Warum

R26 brachte den roten Faden in einer Aufgabe zurück. Der Nutzer bestätigte
jedoch zwei weitere Lücken:
- Die neue Projektraum-Oberfläche sah anders aus als die lange ausgearbeitete
  SCHMAQQ-Website und ihre verbindlichen Gestaltungsvorgaben.
- Marco und Markus konnten zwar eine Aufgabe gemeinsam bearbeiten und
  nach einigen Sekunden aktualisierte Kommentare sehen, aber Codeänderungen
  waren nur im versteckten Prüfstand als Git-Diff erkennbar.

## Konkrete Referenz – nicht eine weitere freie Farberfindung

Quelle: `Spezzo-sudo/NetzKontor` (nur historischer Repositoryname),
Git-Commit `92aad74781c03c7414d5a7adfd6c0568ad82c99b`:

- `marketing/site/assets/entry-root.css` und `styles.css`: aktuell
  eingesetzte Marketing-Farbtokens und Website-Komponenten.
- `marketing/site/assets/r6.css` und `r9.css`: Typografie, Rhythmus,
  Signal und Bewegung.
- `docs/DESIGN_SYSTEM_CONVERGENCE_PLAN.md`: eine Designfamilie, aber
  unterschiedliche Oberflächen mit verschiedenen Aufgaben.
- `brand/v1-chaos-to-order/BRAND_DIRECTION_V1.md`: **Entwurf mit
  abweichenden Farbwerten**, nicht automatisch genehmigter Ersatz des
  bestehenden animierten Marken-Headers.

R27 nutzt die **bestehenden Website-Tokens**, exakt:
Ink `#111225`, Paper `#f1efe8`, Acid `#d9ff6b`, Coral `#ff6f59`,
sowie Mono-Schriften, Kontrast, dünne Regeln und kleine Eckradien.

Das bewusst getrennte `studio/schmaqq-design-system.css` verwendet
diese Tokens als gemeinsame Quelle; bestehendes SCHMAQQ-SVG und
seine lokale Animation werden nicht ersetzt. Die Funktion des
Workspace bleibt unverändert. Einträge unter **Projektraum → Wissen**
zeigen die verbindliche Designreferenz und die genauen GitHub-Quellen
für alle Raum-Mitglieder ohne zusätzliche Einrichtung.

## Tatsächlich implementierte Zusammenarbeit

1. Ein neuer read-only Endpunkt `GET /api/collaboration/task-diff`
   liest nur einen **abgeschlossenen, einer konkreten Aufgabe
   zugeordneten Git-Prüfstand**. Er verlangt eine angemeldete
   Studiositzung, prüft Task-/Worktree-Bezug und liefert nur einen
   vollständig vorliegenden, grössenbegrenzten Diff. Keine privaten
   Jobausgaben, aktuellen Datei-Inhalte, Runner-Tokens, ungespeicherten
   Editor-Entwürfe oder projektfremden Diffs.
2. In derselben Aufgabe öffnet **„Prüfen“** nun tatsächlich einen
   sichtbaren Git-Diff mit alten/neuen Zeilennummern und
   grün/rot markierten Änderungen. Der bisher unter `display:none`
   versteckte Prüfportal-Einstieg entfällt.
3. Wenn neue Arbeiten seit dem Prüfstand festgestellt wurden,
   wird der Diff ausdrücklich als möglicherweise veraltet
   gekennzeichnet. Ein alter Commit wird nicht als Freigabe
   des aktuellen Datei-Zustands dargestellt.
4. Jeder gespeicherte Worktree-Aktivitätseintrag nennt lediglich
   die letzte bestätigte Aktion, Zeit und Jobstatus – niemals
   Dateipfade, Prompt, Quellinhalt oder Logausgaben.
   Die laufende Aufgabenansicht fragt alle fünf Sekunden neu ab.
5. Die Designquelle ist als feste, offen verlinkte Referenz
   innerhalb des Workspaces erreichbar.

## Bewusste Grenzen

**Kein** gleichzeitiges Text-Tippen, keine WebSocket-Synchronisierung,
kein Live-Cursor, kein geteiltes lokales Dateisystem, kein automatischer
Git-Push, kein Provider-Zugriff und keine automatisierte Freigabe.
Dateiänderungen erscheinen im gemeinsamen Code-Diff erst als
abgeschlossener Git-Prüfstand. Die letzte gespeicherte Aktivität ist
lediglich ein Job-Metadateneintrag, kein Dateisnapshot.

Das System bleibt eine private Single-Team-Anwendung;
aktuelle Auth- und Runnergrenzen bleiben bestehen.
Die realen Konten und Geräte von Marco und Markus wurden bei
diesem Arbeitsschritt **nicht** benutzt.

## Testvertrag

- Fokus: Authentifizierungsgrenze, fremder Task 404,
  ungültige Review-ID 400, unvollständiger Diff ohne
  Quellinhalt, vollständiger Commit-Diff, reines Activity-Metadatenmodell.
- Browser: getrennte synthetische Sitzungen, Designsystem im
  Projektwissen inkl. exakt verifizierter Farbwerte,
  390-Pixel-Handy, gleiches Review für zweite Person,
  sichtbare rote/ grüne Zeilen, kein horizontaler Seitenüberlauf.
- Ein synthetisch erzeugter Review dient nur zum Testen der UI.
  Er ist ausdrücklich **kein** Beleg einer echten Code-Ausführung
  oder Markussitzung. Die bisherigen R26-Testläufe prüfen
  unabhängig bereits reale isolierte Git-/Node-Worktrees.
- Freigabe/Deployment erfordert aktuellen unveränderlichen Build,
  Browserlauf gegen dessen gepinnte SHA, frisches Backup/Restore,
  separat ausgewiesenes H3-Archiv-Risiko und gesondertes Owner-GO.
  R26 bleibt bis dahin live.
