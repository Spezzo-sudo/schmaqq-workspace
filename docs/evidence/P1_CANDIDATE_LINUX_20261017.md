# P1 – Kandidatenprüfung unter Linux

## Identität und Umfang

- Geprüfter Quellstand: `57c274c52fb4fd67ca9f9dc857a4456962806a18`.
- Basisvergleich: `origin/main`, Live-Basis `b22175035f6f3d5c9a5c6894028ad7a0149f8761`.
- Branch: `fix/studio-first-workspace-layout`, Draft-PR #6.
- Linux-Host `srv1365337`, unprivilegierter Nutzer `dc-remote`, Node v24.22.0.
- Einmaliger separater Checkout in einem exklusiven 0700-Testordner unter
  `/home/dc-remote`; keine Live-Daten oder persönlichen Providerzugänge verwendet.
- Keine Runtime-Änderung aus diesem Review erforderlich. Nachfolgender Commit
  ergänzt nur diese Evidence und Planungs-/Statusdokumentation.

## Review

Änderungen gegen main geprüft: gemeinsame Projektübersicht, Aufgabenzuordnung,
Kommentar-Idempotenz und Entwurfserhalt, vorhandene eigene Aufgabenkopie,
Editorlayout, Review-Verweise, neue API-Routen, additive Tabellen und Inhalt des
Runtime-Pakets. GitHub-Verknüpfung auf Sitzungs-/Browserbindung, PKCE,
Einmalverwendung, Widerruf und fehlende Tokenpersistenz geprüft.

**Kein neuer blockierender Codebefund.** Das ist eine Engineering-Prüfung,
kein unabhängiges vollständiges Sicherheits-Audit und keine menschliche
Zwei-Personen-Abnahme. Bestehende Grenzen bleiben:

- Live-GitHub-Client und echte Providerzustimmung nicht eingerichtet/geprüft.
- Keine Bestätigung persönlicher KI-Ausführung oder eines zweiten echten Nutzers.
- Live-Backup/Restore ist weiterhin unbestätigt; nur künstliche Daten verwendet.
- Runner-Onboarding bleibt teilweise technisch; dessen praktische Vereinfachung
  folgt nach dem echten Pilot.

## Ausgeführte Prüfungen

| Schritt | Ergebnis |
| --- | --- |
| Neuer privater Checkout, SHA-Prüfung | PASS, exakt oben genannter Stand |
| `npm ci --ignore-scripts --no-audit --no-fund` | PASS, 692 Pakete; Lifecycle-Skripte bewusst nicht ausgeführt |
| `node selfhost/verify.mjs` | PASS: Source Guard, 17/17 Tests, TypeScript, Vite-Build |
| Backendverhalten | U. a. zwei Konten, echte Git-Kopien, Review-/Konfliktgrenzen, Editor-Schutz, Aufgabenreservierungen, Kommentare und OAuth-Testanbieter PASS |
| `node selfhost/release.mjs` | PASS, 699 Manifestdateien, 4.241.345 Nutzdatenbytes |
| `node selfhost/release-smoke.mjs <Paketordner>` | PASS: Manifest, HTTP-Assets, Auth, Schema, Kommentare und konsistenter Snapshot |
| Archivprüfung und getrenntes Entpacken | PASS: keine absoluten/aufsteigenden Pfade oder Verknüpfungen |
| Runtime-Smoke des tatsächlich entpackten Archivs | PASS |

Archivgröße: 793.550 Bytes. SHA256:
`e6738a04a6424fc5942c23cce72ca71f985a21a118dd566a45aa46be92374415`.
Das Testarchiv wurde nach der Prüfung entfernt, nicht als Release installiert.
Ein späterer Neubau erhält einen eigenen Artefakthash; kein unverifiziertes
Archiv aus einem anderen Stand einsetzen.

## Upgrade- und Rückkehrprobe mit künstlichen Bestandsdaten

Die unveränderte `store.mjs` der Live-Basis wurde aus Git in den Testbereich
übernommen. Damit eine alte Fixture-Datenbank mit Konto, Sitzung, Gerät,
zugewiesener Aufgabe, Nachricht, Dokumentrevision, Arbeitskopie und Review angelegt.
Vor dem Upgrade einen konsistenten Snapshot mit `backup.mjs` erzeugt. Anschließend
dieselbe Fixture mit dem neuen Server geöffnet, ohne Live-DB-Zugriff.

- 18 bestehende Tabellen zum Vergleich erfasst; ursprüngliche Datensätze bleiben
  erhalten. Die drei zusätzlichen Tabellen werden leer angelegt.
- Vorhandene Sitzung funktioniert über HTTP, Gerät und Arbeitskopierevision
  bleiben über die Entwicklungs-API auffindbar, alter Review ist an der Aufgabe
  sichtbar.
- Neuer Kommentar lässt sich speichern und nach erneuter Serverinitialisierung
  lesen. Erwarteter neuer Aktivitätseintrag ausdrücklich geprüft.
- `integrity_check=ok`, `foreign_key_check` ohne Fehler.
- Separates Öffnen des Vorher-Snapshots bestätigt ursprüngliche Tabellen und
  Datensätze, Integrität und Fremdschlüssel; neue Kommentartabelle dort nicht vorhanden.

Der erste Fixture-Lauf erwartete irrtümlich auch nach dem Kommentieren eine
unveränderte Aktivitätstabelle. Diese Testannahme wurde korrigiert und der Test
mit einer frischen Fixture wiederholt: **PASS**. Keine Produktkorrektur und keine
Abschwächung eines Datenintegritätsfehlers. Dies ersetzt weder den Live-Restore
unter dem Dienstbenutzer noch einen kompletten Betriebs-Rollback.

## Ressourcen, Cleanup und Bestandsdienste

- Nice 15, ionice Klasse 3, Prozesszeitlimits und Node-Heap-Limits genutzt;
  Scratchplatz und verfügbarer Host-RAM während der Schritte beobachtet.
- Scratchbudget 3 GiB; beobachtete/abschließend gemessene Spitze
  1.284.300.480 Bytes, etwa 1,20 GiB. Keine harte cgroup-/Containerisolation.
- Freier Datenträger vorher 30.580.793.344 Bytes; nach Cleanup
  30.580.715.520 Bytes. Kleine Differenz durch laufenden Hostbetrieb möglich.
- Eigene Testprozesse beendet, Testlistener geschlossen, ausschließlich den
  zuvor verifizierten eigenen temporären Ordner entfernt: **CLEANUP=PASS**,
  zurückbleibende Test-Builddaten 0 Bytes.
- Live-Dienst weiterhin active, MainPID 815, NRestarts 0. Studio-Health,
  SCHMAQQ, bestehende Preview und KlimaFinder nachher jeweils HTTP 200.
- Keine Änderung an main, NetzKontor, Dienst, Proxy, globalem Node oder Live-Daten.

## Übergang

**P1 technisch abgeschlossen für den geprüften Stand.** Nächstes Paket ist P2:
konkreten Release freigeben, aktuelles Live-Backup/Restore durch den befugten
Betreiber nachweisen und kontrollierten Dienstwechsel durchführen. Separate
Freigabe weiterhin erforderlich; kein Merge oder Deployment erfolgt.
