# R5-A — Technische Übergabe: persönlicher Windows-Runner

**RUNNER_READY=YES**

Historischer Abnahmebericht vom 17.10.2026; Prozess-IDs und laufende Sitzungen
sind Beobachtungen zu diesem Zeitpunkt, kein aktueller Betriebsstatus.
Fortschritt des UI-Fixes und Kandidatenplan: docs/PILOT_PLAN.md.

Live-Studio: https://studio.schmaqq.com.
Echter End-to-End-Test mit persönlichem Konto und isoliertem Testrepository bestanden.

## Eingerichtete Komponenten und Verbindungen

- Quellcode: C:\Users\mark\Documents\ChatGPT\reverse\schmaqq-workspace.
- Ausgangsstand: b22175035f6f3d5c9a5c6894028ad7a0149f8761; Branch setup/r5-a-windows.
- Vorhandene Komponenten weiterverwendet: Git 2.49.0.windows.1, Node 24.19.0 aus
  dem gebündelten Runtime-Verzeichnis, Codex CLI 0.162.0-alpha.17.2 mit erkanntem
  ChatGPT-Login. Globaler Node 22.14.0 und globale Einstellungen unverändert.
- Persönliches Live-Gerät: **Windows-PC R5-A**, Studio-Projekt **Automatisierung**.
- Testrepository: .studio/r5-a/test-repository; origin ausschließlich lokales
  Bare-Repository .studio/r5-a/test-remote.git. Keine produktive Quelle freigegeben.
- Privates Importprofil: .studio/r5-a/pc-profile.json.
- Konfiguration heruntergeladen und privat gespeichert: .studio/r5-a/runner.private.json.
  Absoluter stateDir unter .studio/r5-a/runner-state. allowCodex=false, publish=false.
- Arbeitsbereich: **R5-A · isolierter Windows-Funktionstest**,
  Kennung 4a698221-76bf-4671-ba83-74ee8bc6eba4.
- Runner läuft nach Neustart, genau ein passender Prozess (PID 28520 zur Abnahme).
  Kein Autostart, Windows-Dienst oder geplanter Task eingerichtet.

## Echte Tests und Ergebnisse

| Prüfung | Ergebnis / Live-Auftrag |
| --- | --- |
| Frischer Server-Heartbeat | PASS, vor und nach Runner-Neustart |
| Git, origin/main, Git-Identität, Prüfkonfiguration | PASS — 13ac7469-f584-45bf-b1b5-d13fdad3e47d |
| Eigene Git-Arbeitskopie | PASS — 4a698221-76bf-4671-ba83-74ee8bc6eba4 |
| Dateiliste, Öffnen, Bearbeiten und Speichern über Studio | PASS, site/index.html auf PC geändert |
| Gespeicherte Änderung im Git-Diff | PASS — 52d83f5d-ff60-47bc-a534-f34b2d30e95d |
| Erster Testlauf | FAIL — b987368b-772f-477e-a565-40c56659a0b2; CRLF-Annahme im Fixture |
| Korrigierter ungefährlicher Test | PASS — 359f099a-fbda-4e93-8853-4c5567321d13 |
| Echter Vorschau-Build und Browseraufruf | PASS — 656fb29e-60fa-40c3-a7e9-c3f74ce440fd |
| Neuer Statusauftrag nach Runner-Neustart | PASS — 225feb6a-5451-4f89-b0c0-20139d55afc1 |

Testausgabe: R5_A_SAFE_CHECK_OK node=24.19.0 platform=win32.
Die gebaute Vorschau auf https://studio-preview.schmaqq.com zeigte die über Studio
geänderte Überschrift **R5-A Live Runner Verified** (1 HTML-Datei, 426 Bytes).
Der private Vorschau-Zugangslink wird nicht in diesen Bericht kopiert.

Neustart: alter Runner PID 12552 beendet, anschließend 0 passende Prozesse,
danach neuer Runner PID 28520 mit demselben Gerätetoken und frischem Heartbeat.
Arbeitskopie und Änderung blieben erhalten. Ein vollständiger Windows-Neustart
wurde nicht durchgeführt; Prozessneustart/Wiederanbindung sind nachgewiesen.

## Gefundene Fehler und verbleibende Punkte

1. **R5A-UI-01:** Ohne bestehende Arbeitskopie sendet die Oberfläche worktree als
   leere Zeichenkette. Das Backend meldet „Bitte Eingaben prüfen“. Beobachtet bei
   initialer Git-Prüfung; gleicher Request-Code für erste Arbeitsbereichserstellung.
   Erste Arbeitskopie deshalb über gültige authentifizierte Studio-API angelegt,
   optionales worktree weggelassen. Danach funktionierte die Git-Prüfung über UI.
   Zur R5-A-Abnahme keine Produktcodeänderung oder Bereitstellung vorgenommen. Der Fehler wurde danach lokal korrigiert; siehe docs/USABILITY_FIRST_WORKSPACE.md.
2. **R5A-FIXTURE-01:** Windows-Git checkoutete CRLF; der erste kleine Prüfauftrag
   erwartete LF. Nur das isolierte Fixture wurde auf CRLF-Normalisierung korrigiert,
   auch über Studio gespeichert. Folgetest PASS; globale Git-Einstellungen unverändert.
3. Native Brave-Steuerung konnte die URL nicht sicher feststellen. Ersatz:
   eigene sichtbare Playwright-Brave-Sitzung, Chromium-Sandbox und TLS-Prüfung aktiv.
   Vorhandene fremde Browserprofile wurden nicht ausgelesen.
4. Ein Steuerungszeitlimit verlor die erste Browser-Sitzung; zweite Anmeldung nötig.
   Danach eigene wiederaufnehmbare Sitzung und kurze Aktionslimits verwendet.
5. Frühere HTTPS-Zeitlimits traten im erfolgreichen End-to-End-Test nicht mehr auf.
   Keine Firewall-, Proxy- oder TLS-Sicherheitsänderung vorgenommen.
6. Ein gebündelter Rechte-/Prozessverwaltungsschritt wurde zuvor automatisch
   abgewiesen und durch einen manuellen Launcher ohne Rechteänderung ersetzt.
   Der Runner wurde ausschließlich über sein eigenes Terminal mit Ctrl+C gestoppt.

Keine offenen Einrichtungsblocker für den vorhandenen Testbereich.
RUNNER_READY ist keine allgemeine UX-, Mehrpersonen- oder Produktionsfreigabe.

## Fortsetzung durch ChatGPT Work — Installation nicht wiederholen

- Bestehendes Gerät, Projekt Automatisierung und den oben genannten Arbeitsbereich
  verwenden. Kein weiteres Gerät und keine neue technische Installation anlegen.
- site/index.html ist die Vorschauquelle; check.mjs enthält die Fixture-Korrektur.
- Der Runner läuft bereits. Bei Bedarf manuell im Projektordner starten:
  & '.\.studio\r5-a\Start-SchmaqqRunner.ps1'
  Nicht parallel ein zweites Mal starten. Beenden mit Ctrl+C nach Auftragsende.
- Nach PC-Neustart denselben Launcher verwenden. Nach einem Runtime-/App-Update
  prüfen, ob der konfigurierte Node-24-Pfad noch existiert; nicht global umrüsten.
- Eigene Automatisierungssitzung: .studio/r5-a/automation-browser.
  Bei Bedarf persönlich anmelden; keine Cookies aus anderen Profilen übernehmen.
- Private Evidence: .studio/r5-a/e2e-results.json, test-result.png,
  preview-result.png und runner-ready.png. Alle im ignorierten Runtime-Ordner.

Keine Tokens, Cookies oder Passwörter in diesem Bericht. Keine produktiven
Repository-Änderungen, Merges, Deployments oder kostenpflichtigen KI-Aufträge.
