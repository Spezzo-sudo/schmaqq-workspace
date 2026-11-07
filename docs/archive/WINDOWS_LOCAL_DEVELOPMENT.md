# Lokale Windows-Prüfung

Studio verwendet Node >=24.15 und den bestehenden Lockfile-Installationsweg.
Keine Production-Daten, persönlichen Runnerprofile oder Provider-Zugänge für
lokale Tests verwenden. Die isolierte Demo bleibt `npm run studio:demo` auf
Loopback 4320/4321; sie ersetzt keine Release- oder Operatorfreigabe.

Für den unterstützten lokalen Entwicklungsweg:

```powershell
npm run studio:verify:local
```

Dieser Befehl prüft Source Guard, alle auf dem Host ausführbaren Backendtests,
TypeScript und Build. Nicht verfügbare Linux-Operatorprüfungen werden einzeln
mit `Linux required ... NOT VERIFIED` ausgewiesen. Die Zusammenfassung bleibt
für den vollständigen Nachweis ausdrücklich `INCOMPLETE`.

`npm run studio:verify` bleibt der strengere Gesamtprüfweg: Auf Windows läuft
dieselbe lokale Prüfung, endet bei sonst erfolgreichen Checks aber mit Exit 2,
weil Linux-Recovery nicht geprüft wurde. Echte Testfehler liefern Exit 1.
Auf Linux laufen auch die H2/H3-Fixtures. Der vollständige Release-Smoke
verweigert nicht unterstützte Plattformen vor Paketbau oder Backup-Prüfung.

## Native Berechtigungsprüfung

`selfhost/private-path.mjs` prüft unter Unix weiterhin POSIX-Modi. Unter Windows
prüft es stattdessen die echte DACL und den aktuellen Eigentümer. Erlaubt sind
nur der aktuelle Benutzer, SYSTEM, Administrators und OWNER RIGHTS, nachdem
der Eigentümer als aktueller Benutzer bestätigt wurde. Freigaben an andere
Prinzipale werden abgelehnt; nicht lesbare ACLs werden niemals als sicher
gewertet. Eine solche Prüfung ist keine vollständige Windows-Sicherheitsanalyse.

Neue Backup-Zielverzeichnisse und Snapshotdateien werden geschützt. Vorhandene
Zielverzeichnisse werden nur geprüft, nicht automatisch umberechtigt. Ein
Windows-Bericht nennt `windows-private-dacl`, nicht einen vorgetäuschten
POSIX-Modus `0600`. Die normalen Backup-Prüfungen auf Unix bleiben erhalten.
Der Helfer ist Teil des Runtime-Pakets.

Synthetische Migrationsfixtures prüfen ebenfalls native Berechtigungen. Diese
Änderung erlaubt keine Migration echter Datenbanken. Fixture-Marker, privater
temporärer Pfad, Dateityp, Linkanzahl und Schema-Prüfung bleiben Pflicht.

Linktests verwenden unter Windows echte Directory-Junctions und Hardlinks.
Sie benötigen keine aktivierten Symlink-Privilegien. Die Unix-Testzweige für
Dateisymlinks bleiben erhalten. Damit wird kein Windows-Dateisymlink-Nachweis
behauptet; Release-Reparsepunkte und mehrfach verlinkte DB-Dateien werden real
negativ getestet.

## RC1-Browserabnahme

Der Python-Test benötigt Playwright und einen verfügbaren Chromium-Browser.
Windows verlangt einen ausdrücklich ausgewählten absoluten Node-Pfad:

```powershell
python scripts/r24-rc1-browser-acceptance.py `
  --release-dir ABSOLUTER_ENTPACKTER_RELEASEPFAD `
  --expected-sha VOLLSTAENDIGER_GEPRUEFTER_SOURCE_SHA `
  --node ABSOLUTER_PFAD_ZU_NODE_EXE `
  --browser-channel msedge
```

Ohne Browserkanal bleibt die bestehende Chromium-Auswahl verfügbar. Unter
Linux bleibt der bisherige gepinnte Node-Standardpfad erhalten. Node-Version,
Quell-SHA, frische synthetische DB und getrennte Loopback-Ports bleiben geprüft.
Der neue temporäre Windows-Datenordner erhält eine geprüfte private DACL.

Auf Windows wird ausschließlich der gestartete Prozess samt seinen Kindern
über seine PID beendet. Unix verwendet weiterhin seine eigene Prozessgruppe.
SQLite-Leseverbindungen werden ausdrücklich geschlossen, bevor Testdaten
entfernt werden; ein Python-Transaktionskontext allein schließt sie nicht.

Die 14 Browser-Runtime-Regressionstests laufen mit
`SCHMAQQ_TEST_NODE` als absolutem Node-Pfad:

```powershell
../.local-tools/python/python.exe -B -m unittest discover -s scripts -p test_r24_browser_runtime.py -v
```

Das optionale embeddable Python isoliert `sys.path`. Bei dieser Distribution
muss der Aufrufer das Verzeichnis `scripts` ausdrücklich zum Importpfad
hinzufügen; eine normale Python-Installation erledigt dies für Skriptstarts.
Die Browserbibliothek kann in einem isolierten lokalen Paketverzeichnis liegen.
Keine Änderung globaler Codex- oder Python-Konfiguration ist erforderlich.

## Unveränderte Operatorgrenze

`r24-local-backup.mjs` (H2) und `r24-h3-scoped-recovery.mjs` sind Unix-basierte
VPS-/Recovery-Verfahren. Sie verlangen zusätzliche Eigentümer-, Gruppen-,
Modus- und Root-Attestationsbeweise. Diese Verfahren wurden hier bewusst nicht
in ein vermeintlich äquivalentes Windows-Operatorverfahren umgeschrieben.
Die Linux-Testfälle bleiben vollständig erhalten und deklarieren ihre
Plattformvoraussetzung ausdrücklich. Auf Windows werden sie einzeln als
`NOT VERIFIED` ausgelassen und niemals als bestanden gezählt. Neue native
Negativtests prüfen reale CLI-/API-Aufrufe: H2/H3 müssen mit
`LINUX_OPERATOR_REQUIRED` abbrechen, bevor sie Testdaten inventarisieren,
Snapshots anlegen oder eine Attestation lesen. Testdaten und Zeitstempel
müssen dabei unverändert bleiben. Der reine Attestationsvergleich läuft auf
allen Plattformen, ohne eine echte Operatorfreigabe zu behaupten.

Die strenge Gesamtprüfung liefert deshalb auf Windows weiterhin Exit 2 für
unvollständige Plattformabdeckung. Eine grüne lokale Entwicklungsprüfung
ersetzt weder diesen Linux-Nachweis noch eine Releasefreigabe.

Lokale Ergebnisse sind keine neue Linux-Verifikation und keine Berechtigung
für Merge, Deployment, echte DB-Migration oder Änderungen an einem Server.
