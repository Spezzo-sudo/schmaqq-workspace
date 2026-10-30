# Klimafinder-Praxistest, 30.10.2026

Erster echter Durchlauf mit dem Owner-Projekt Klimafinder (`Spezzo-sudo/Klimafinder-CH`) auf dem
Server-Worker. Ausgeführt von Claude Code über die Studio-MCP-Verbindung des Owners; Systemeingriffe nur nach
ausdrücklicher Owner-Freigabe im Chat.

## Ergebnis

1. **Analyse-Aufgabe** „Klimafinder: Nutzerführung, Design und Empfehlungslogik prüfen“: 7 Dateien über die
   Lesekopie gelesen, vier Fälle live auf klimafinder.ch (375 px) nachgestellt, Ergebnis (7 488 Zeichen) vom
   Owner festgehalten, Aufgabe **erledigt**.
2. **Code-Aufgabe** „Leise-Priorität für Mieter mit Aussenplatz korrekt zeigen“ (Arbeitskopie `ff3f7e80…`,
   Branch `studio/ff3f7e80-13d5-4f33-b423-817e68fb1a99`, nur lokal auf dem Worker, nichts gepusht):
   - `src/` und `site/assets/js/finder_experience.js`: zustimmungspflichtige Klasse, die die Priorität besser
     erfüllt, als „Leiseste/Effizienteste Lösung, wenn …“ neben der sofort nutzbaren Empfehlung; Label „Sofort
     nutzbare Lösung“; falscher Satz „feste Installation … mobile Split“ korrigiert. Engine unverändert.
   - Neuer Test `tests/test_p64a_priority_alternative.mjs`, im Makefile (`validate-build`) eingetragen.
   - Testlauf (Job `4aadf92c`, vom Worker gemeldet): Build 80 Seiten, alle Finder-, Kalibrierungs- und
     Regressionstests PASS inkl. `P64A_PRIORITY_ALTERNATIVE_OK=1`; **nur `tests/test_backend.mjs` FAIL**.
     Vergleichslauf auf unverändertem Stand (Job `c3d766af`) scheitert identisch → vorbestehend.
   - Vorschau (Job `51d54404`): https://studio-preview.schmaqq.com/lKygjow9Jbeo3WhfEhasjnAbjfEIQtwK2R1WeaQHDpU/index.html
     (geheimer Link). Im Browser durchgeklickt: Fall „Miete, 25 m², Fenster + Balkon, leise“ zeigt „Sofort
     nutzbare Lösung“ (Zweischlauch) und darunter „Leiseste Lösung, wenn die Vermieterschaft zustimmt“ mit Link
     auf mobile Splitgeräte; kein Satz „feste Installation“; 375 px ohne Überlauf.
   - **Prüfstand (Job `d3c5f605`) blockiert**, weil er einen grünen Testlauf verlangt.

## Systemeingriffe (Owner-Freigabe im Chat)

- VPS: `apt-get install --no-install-recommends python3.12-venv` (python3.12-venv, python3-pip-whl,
  python3-setuptools-whl), Protokoll `/root/apt-python3.12-venv-20261030.log`.
- Worker-Projektfreigabe Klimafinder in `/var/lib/schmaqq-worker/state/connected-projects.private.json`:
  keine Vorbereitung, `make build-check BUILD_PYTHON=python3`, Vorschau `make build BUILD_PYTHON=python3`
  → `build/site` (nutzt vorhandenes Jinja2 3.1.2, kein Paketdownload). Mit Studios `validateProjectPlan`
  geprüft; Sicherung `…connected-projects.private.json.before-offline-2026-10-30T18-20-26-205Z.json`.
  Publish/KI-Freigaben unverändert aus. Die Proxy-Allowlist wurde **nicht** erweitert.

## Studio-Fehler gefunden und live behoben

| Release | Fehler | Fix |
|---|---|---|
| `94a51ca` | Builds mit owner-only Ausgabe (Klimafinder `build/site` 0700) waren für den Worker unlesbar → Vorschau `EACCES` | Job-Starter stellt Gruppenrechte nach jedem Job wieder her |
| `fed02f9` | Statische Vorschau unter `/<id>/`, Seiten mit absoluten Pfaden (`/assets/…`) luden nichts | Vorschau merkt sich die geöffnete Vorschau im HttpOnly-Cookie und beantwortet Wurzelpfade daraus |

Beide nach OPERATIONS ausgeliefert (aktuelles Owner-„Ja, live“ je Stand): Release-Prüfung, Backup,
Probestart auf Datenkopie, Schema PASS, Job-Isolation 10/10, Sandbox-Probe, öffentliche Prüfung PASS.
Rückweg `fed02f9` → `94a51ca` → `d72d823`. Backups `predeploy-94a51ca-20261030T183304Z.sqlite`,
`predeploy-fed02f9-20261030T190609Z.sqlite`.

## Nachtrag: eigenes Netz pro Job (`a4c1667`) und Prüfstand

- Owner-Entscheidung „Eigenes Netz pro Job“: Tests und Vorschau-Builds laufen mit `PrivateNetwork=yes` (eigenes
  Loopback; Studio, Proxy, Internet unerreichbar), Vorbereitung weiter nur über den Proxy, Live-Vorschau
  unverändert. Vorab auf dem VPS mit einer transienten Einheit belegt: eigener Server ok, `127.0.0.1:4310`
  ECONNREFUSED, Proxy ECONNREFUSED, Internet EAI_AGAIN. Live nach OPERATIONS (Owner-„Ja, live“), alle Prüfungen
  PASS, Rückweg `fed02f9`, Backup `predeploy-a4c1667-20261030T192931Z.sqlite`.
- Klimafinder-Testlauf (Job `f734adc4`): **komplett grün**, inkl. `BACKEND TESTS PASSED`.
- **Prüfstand** (Job `00b7273e`): Commit `67b1cabdfe8c8e533b28d777522030fe29bfd4f7` auf
  `studio/ff3f7e80-13d5-4f33-b423-817e68fb1a99` (Basis `f60408a`), Vorschau
  https://studio-preview.schmaqq.com/eaDmpdpj7AwhSGj13S47FjGZ1QKQRzYfuyoCHijD_TY/index.html, `published:false`
  (Hochladen zu GitHub ist für den Worker nicht freigegeben).

## Offen

- Teilen als GitHub-Branch/PR braucht die Owner-Freigabe „Aufgabenbranches hochladen“ und einen Deploy-Key mit
  Schreibrecht; danach Freigabe durch zweite Person, dann Merge.
- Projekttests, die selbst Pakete aus dem Internet laden, scheitern jetzt im Testschritt (gewollt; Downloads
  gehören in die Vorbereitung).
- Bedienbarkeit: Der Owner musste Felder suchen, IDs kopieren, Programme wechseln. Wichtigster Befund:
  KI-Werkzeuge zum Einrichten und Ergebnis-Festhalten, damit der Owner nur bestätigt.
- Assistenten mit älterer Werkzeugliste kennen `offset`/`list_tasks` erst nach Neuverbinden; `get_code_job`
  liefert gespeicherte Dateiinhalte vollständig zurück (sehr groß); pro Kopie nur ein Auftrag gleichzeitig.
