# P2 – Dienstwechsel und anschließender Abgleich

## Betriebsbericht von Hermes

Vom Owner am 17.10.2026 weitergeleitet: Studio-only SWITCH=PASS. Hermes meldet
Prüfung des übergebenen Archivs mit SHA256
`316d9f5fcd7903b5ab43b9e74947d3f81b09f69e15a464c3c6073fe0d43433bf`,
699/699 Manifestdateien und sicheren Archivpfaden.

Neues Release:
`/opt/schmaqq-studio/releases/4a0092be2d04a4b66aa1d200cf7c9f9c53c4c47d`.
Das alte Release bleibt erhalten. Kein Git-Merge, KI-Auftrag oder Eingriff in
NetzKontor, Router, DNS, Provider oder andere Dienste.

Nach Stilllegen des Studio-Dienstes und ohne aktive Jobs wurde der finale
Snapshot angelegt:
`/var/lib/schmaqq-studio/backups/p2-final-20261017T190218Z/studio.sqlite`.
Hermes meldet Snapshot 0600, Verzeichnis 0700, Dienstkonto als Eigentümer,
separaten Restore sowie Integritäts-, Fremdschlüssel- und Bestandsvergleich PASS.
Nach dem Start: 22 Tabellen, erhaltene Konten, Sitzungen, Arbeitskopie, Jobs und
Gerät. Diese geschützten Daten wurden vom Engineering-Zugang nicht eingesehen.

Hermes meldet beide TLS-Origins gültig, unerlaubte API-Zugriffe 401 bzw. falsche
Origin 403, aktuellen Runner-Heartbeat und gesunde Bestandswebsites.

## Durch Engineering direkt lesend bestätigt

Nach Eingang des Berichts gezielt geprüft, keine erneute Vollsuite:

- `current` zeigt tatsächlich auf das neue Release.
- 699 manifestierte Dateien anhand Größe und SHA256 geprüft, keine Abweichung;
  `collaboration.mjs` und `connections.mjs` vorhanden.
- Dienst active, MainPID 427094, NRestarts 0, ExecMainStatus 0; Health HTTP 200.
- Bereits persönlich autorisierte Browsersitzung weiterhin gültig:
  `/api/auth/session`, `/api/collaboration`, `/api/development` und
  `/api/connections` jeweils HTTP 200.
- Neue Startseite „Zusammen arbeiten.“ bei 1440 × 1000 sichtbar geprüft;
  keine horizontale Seitenüberschreitung. Kein vollständiger neuer UX-Audit.
- Ein Runner `Windows-PC R5-A` online, vorhandene Arbeitskopie erhalten,
  keine aktiven Auftragsgeräte. Keine neuen Runner oder Jobs angelegt.
- Konkreter bereits vorhandener Testvorschau-Link auf
  `https://studio-preview.schmaqq.com` liefert HTTP 200 und HTML. Der private
  Capability-Pfad wurde nicht protokolliert. Dies prüft den Erhalt einer alten
  Vorschau, keinen neuen Vorschau-Build nach dem Wechsel.
- GitHub-OAuth weiterhin deaktiviert; keine Repositoryrechte dadurch freigegeben.

Die erhaltene Browsersitzung ist kein neuer Passwort-/OIDC-Anmeldeversuch.
Keine Veränderung von Projektdaten, Konfiguration oder Diensten durch diese
Engineering-Nachprüfung. Normale lesende API-/Browserzugriffe können vorhandene
Aktivitäts-/Sitzungszeitpunkte aktualisieren.

## Ergebnis und nächster Schritt

P2 abgeschlossen: Betreiberbericht und direkt beobachtete Runtime-/Browser-
Nachprüfung zusammen dokumentiert. P3 ist aktiv: Markus verwendet laut Owner
**macOS**. Sein eigener Studio-Zugang und Runner sind noch nicht eingerichtet.
Im Studio derzeit nur ein Konto und keine Aufgaben; kein Zwei-Personen-Erfolg
behauptet. Gemeinsamer Git-Testremote und Schreibfreigabe noch festzulegen.

P4 prüft anschließend neue Aufgaben, Kommentare, unabhängig bearbeitete Kopien,
neue Tests/Vorschauen und gegenseitiges Review mit beiden echten Personen.
Bestehender Windows-Runner wird weiterverwendet. Persönliche KI-Aufträge und
Providerregistrierungen bleiben eigene Schritte.

Live wurde ein Kandidatenbranch ausgerollt; `main` wurde nicht gemerged.
Weitere Engineering-Arbeit muss den Kandidatenbranch bzw. den bewusst gewählten
Fortsetzungsstand verwenden, nicht unbesehen den älteren main-Stand.
