# Hermes Auftrag für den ersten mobilen Studio Zugang

Datum: 24.10.2026. Ziel: `https://studio.schmaqq.com`, persönlicher Zugang `marco@schmaqq.com`, erster Test insbesondere vom Handy.

Der aktuelle Nutzerauftrag lautet sinngemäß: Wenn es funktioniert live bereitstellen; falls hier nicht möglich, die Vorbereitung für Hermes fertigstellen. Dieser Auftrag wurde hier vorbereitet, nicht an Hermes geschickt. Es wurde kein Live-Dienst umgeschaltet und kein echtes Konto geändert.

## 1 Was bereitliegt und was nicht

Der beigefügte Kandidat ist die tatsächliche Node/SQLite-Studio-Anwendung mit bereits implementierter Navigation, Aufgabenbearbeitung, Team/Wissen, Einrichtung, Vorschau und Prüfständen. Quelle ist der saubere lokale Commit:

`41d9f30245fa056b52042181eb7ddadedbc7ff8d`

Branch: `local/studio-navigation-20261024`. Quellbaum: `90097fa8236a5abfca31f8820fdfe32bb702a177`.

GitHub hat diesen Commit/Branch am 24.10.2026 beim lesenden Abruf nicht gefunden. Deshalb liegt die vollständige versionierte Quelle als geprüftes Git-Bundle bei. Nicht auf main oder den älteren Branch vom 22.10. ausweichen.

Die separat beigefügten 30 Bildschirmansichten sind eine **statische Gestaltungsvorgabe**. Sie sind nicht als neue funktionsfähige Anwendung implementiert und dürfen nicht über die vorhandene Studio-Anwendung kopiert werden. Der erste mobile Pilot nutzt den klar bezeichneten tatsächlichen Kandidaten. Ein vollständiger Umbau entsprechend aller Entwurfsansichten braucht ein eigenes Implementierungspaket vor dessen späterem Release. Nicht behaupten, das neue Gesamtkonzept sei mit diesem Kandidaten fertig umgesetzt.

## 2 Unveränderliche Paketidentität

| Gegenstand | SHA256 |
| --- | --- |
| `studio-runtime.tar.gz` | `065556221d3ffbcb6cfda4c76f20b31f454aa45b8c2730c161fc322b02d571a3` |
| `studio-source.bundle` | `4c8afc9d4ad38fe31657caceb52f3037f35efd90bebead5c56b08b39597e562d` |

Das Runtimearchiv enthält 716 manifeste Dateien, 804491 komprimierte Bytes, eingebettete Quellherkunft und keine Studio-Datenbank, Profile oder echten Kontozugänge. Originale bestehende Release-/Datenverzeichnisse niemals überschreiben.

## 3 Bereits ausgeführte Prüfungen

- Frische eigene lokale Quellkopie des exakten Commits; Arbeitsbaum sauber.
- `node selfhost/verify.mjs --local`: 172 Tests, 151 PASS, 0 FAIL, 21 explizite Linux-Skips; Source Guard, TypeScript und Frontend-Build PASS.
- Kandidaten-Historienprüfung PASS; source bundle verifiziert.
- Release aus sauberem HEAD neu gebaut, separat entpackt und Archiv/Manifest/Quelle unabhängig verglichen: PASS.
- Entpacktes Runtime-Smoke: HTTP-Assets, Authentifizierung, Aufgaben-/Kommentar-Persistenz und konsistentes Backup mit synthetischen Daten PASS. Windows-Test-Tempordner musste privat angelegt werden; erster Versuch scheiterte korrekt an dessen Zugriffsrechten.
- Echter lokaler Handy-UI-Lauf auf entpackter Runtime: synthetisches Erstkonto, Menü/Aufgaben, gespeicherte Aufgabe, Breiten 390/360, Wiederladen sowie Abmeldung und erneute E-Mail-/Passwort-Anmeldung PASS; keine Seitenfehler. Erster Testversuch hatte einen fehlerhaften JSON-Abmeldeaufruf im Prüfwerkzeug, danach korrigierter vollständiger Lauf PASS.
- Öffentliche aktuelle Website nur lesend geprüft: HTTPS-Seite 200, `/healthz` 200, unauthentifizierte Session 401, Loginformular bei 390/360 ohne horizontalen Seitenüberlauf. Keine echten Zugangsdaten eingegeben. Aktuelle Live-Version und Marcos Konto damit nicht bestätigt.

**Offen:** Vollständige Linux-Prüfung, echtes aktuelles Backup/Restore und Kompatibilität mit der Live-Datenbank, tatsächlicher Accountzugang, Server-Promotion und persönlicher Handytest. Windows-PASS nicht als Linux-/Production-PASS ausgeben. GitHub Actions sind keine Voraussetzung.

## 4 Auf dem Zielhost zuerst nur Bestand aufnehmen

1. Laufenden Studio-Dienst, Dienstkonto, `current`-Ziel, Releaseherkunft, dedizierte Node-Version, Datenpfad und Proxy-Origin aktuell feststellen. Bekannte Pfade `/opt/schmaqq-studio`, `/var/lib/schmaqq-studio`, `/etc/schmaqq-studio.env` und Ports 4310/4311 sind Dokumentationshinweise, keine neu bestätigten Tatsachen.
2. Nur sanitisierten Status ausgeben. Keine ENV-Inhalte, Sessions, Datenbankzeilen, Passwort-/Cookiehashes oder Einladungslinks protokollieren.
3. Speicher, Inodes, RAM und ausreichend Platz für neuen Kandidaten, Sicherung und isolierten Restore prüfen. Keine Modellinstallation und keine System-Node-Umstellung.
4. Bestehende TLS- und Proxykonfiguration für Studio und getrennte Vorschau-Origin prüfen. Die öffentliche Studio-Domain ist bereits erreichbar; keine DNS-/Domainänderung auf Verdacht. NetzKontor und andere Dienste bleiben außerhalb des Auftrags.
5. Ohne vorhandenen berechtigten Betreiberzugang nicht improvisieren. Das Paket und den exakten fehlenden Zugriff melden, keine zusätzlichen API-Schlüssel oder kostenpflichtigen Zugänge anlegen.

## 5 Quelle und exaktes Artefakt unter Linux prüfen

Auf einem autorisierten isolierten Build-/Testpfad, getrennt von Production-Daten:

```sh
sha256sum -c SHA256SUMS
git clone --branch local/studio-navigation-20261024 studio-source.bundle source
git -C source bundle verify /ABSOLUTER/PAKETPFAD/studio-source.bundle
git -C source rev-parse HEAD
git -C source status --porcelain
```

HEAD muss exakt der oben angegebenen Quelle entsprechen, der Arbeitsbaum muss sauber sein. Dediziertes Node >=24.15 verwenden. Im isolierten Quellverzeichnis:

```sh
npm ci --no-audit --no-fund
node selfhost/verify.mjs
node scripts/r24-candidate-gate.mjs
```

Dann das **beigefügte** Runtimearchiv in einen neuen isolierten Pfad entpacken und mit dem Prüfer des exakten Quellstands prüfen. Pfade vorher konkret zuordnen:

```sh
node source/selfhost/deploy/verify-release.mjs \
  --release /ABSOLUTER/NEUER/RUNTIMEPFAD \
  --source 41d9f30245fa056b52042181eb7ddadedbc7ff8d \
  --archive /ABSOLUTER/PAKETPFAD/studio-runtime.tar.gz \
  --archive-sha256 065556221d3ffbcb6cfda4c76f20b31f454aa45b8c2730c161fc322b02d571a3
node source/selfhost/release-smoke.mjs /ABSOLUTER/NEUER/RUNTIMEPFAD
```

Der Smoke nutzt synthetische Konten und eigene Loopbackports; freie Ports vorher prüfen. Alte Testergebnisse vom 22./23.10. sind keine Ersatzprüfung. Keine Tests gegen die Live-Datenbank. Ein auf Linux neu gebautes anderes Archiv hat einen anderen Hash und benötigt einen neuen exakten Artefaktnachweis; den beigefügten Hash niemals dafür weiterverwenden.

## 6 Frische Datensicherung und Kompatibilität

Quellen im beigefügten Source: `selfhost/deploy/README.md`, `docs/RELEASE_PROVENANCE_POLICY.md`, `docs/HERMES_R24_H1_OPERATOR_RUNBOOK.md`, `docs/R24_H3_SCOPED_RECOVERY_POLICY.md`. Historische Gates dort nicht als aktuelle Freigabe behandeln.

- Laufende Datenbank und alle tatsächlich persistenten Zusatzdaten inventarisieren; Dienstkonfiguration und Rückweg privat sichern. Historische Restorearchive erhalten. Offsite-Backups bleiben vertagt.
- Vor der Promotion frischen konsistenten Snapshot unter dem richtigen Dienstkonto erzeugen. Integrität/Fremdschlüssel und physische Wiederherstellung auf einer neuen privaten Kopie prüfen.
- Exakt diesen Kandidaten nur auf der Restorekopie mit `openStore()` und HTTP-Start prüfen. Mitglieder, Zugangszustand, Projekt-/Aufgaben-/Gerätezuordnungen erhalten; keine privaten Rohdaten im Bericht.
- Tatsächliche additive Schemaänderungen des Kandidaten am Restore ermitteln. Veraltete Baseline-Tools dürfen nicht durch Weglassen erkannter Tabellen künstlich grün gemacht werden.
- Keine synthetische R24-D-Migration, kein manuelles `PRAGMA user_version` und kein Kandidaten-`openStore()` gegen Live zur Vorprüfung.
- Wenn eine neue oder nicht abgedeckte Produktionsmigration erforderlich ist: konkreten Schema-/Rückwegplan berichten und diesen Schritt gesondert klären. Nicht durch Neustart verdeckt ausführen.
- Rückweg muss Code **und** veränderten Datenstand berücksichtigen. Ein alter Symlink allein ist nach einer inkompatiblen Datenänderung kein belastbarer Rollback.

## 7 Persönlicher Zugang für Marco

Zuerst privat anhand der bestehenden Datenbank prüfen, ob `marco@schmaqq.com` bereits als Mitglied existiert. Nur das notwendige Ja/Nein und den Zugangspfad mitteilen, keine Konto-/Hashdaten ausgeben.

### Konto existiert

Konto, Rolle, Projektzuordnung und Passwort erhalten. Anmeldung erfolgt mit E-Mail und eigenem Studio-Passwort. Es ist kein verifizierter Passwort-vergessen-/E-Mail-Resetweg in diesem Kandidaten vorhanden. Bei unbekanntem Passwort nicht direkt den Hash überschreiben, kein Duplikat und kein Neustart der Ersteinrichtung. Einen konkreten sicheren Wiederzugangsweg mit dem Owner klären.

### Noch kein Mitglied im Studio

Nur bei tatsächlich leerem Studio den vorhandenen privaten Bootstrap nutzen. Marco legt selbst Name, `marco@schmaqq.com` und eigenes Passwort mit mindestens 12 Zeichen fest. Der Erstnutzer wird über diesen Weg Owner. Der Bootstrap ist nach Einrichtung ungültig.

### Andere Mitglieder existieren, Marco fehlt

Vorhandenen Eigentümerzugang beziehungsweise das autorisierte lokale Einladungswerkzeug benutzen. `selfhost/admin.mjs EMAIL` erstellt eine auf 48 Stunden begrenzte Einladung und verweigert bereits bestehende Konten. Nicht ungefragt `--owner` verwenden. Werkzeug unter dem Dienstkonto mit tatsächlichem Datenpfad und Studio-Origin ausführen. Seine Ausgabe ist ein Geheimnis: in eine neue private Datei mit passenden Rechten umleiten, nicht in Shell-/Chatlogs oder das Paket.

Setup-/Einladungslink ausschließlich über einen bereits vereinbarten privaten Zugangsweg an den Owner übergeben. Keine unaufgeforderte E-Mail, kein öffentlich zugänglicher Token-Download. Es wird kein Passwort im Auftrag oder Releasepaket erzeugt und kein Codex-Auth-Cache auf den VPS kopiert.

## 8 Promotion mit konkretem Rückweg

Erst nach bestandenen exakten Linux-/Artefakt-/Restore-Prüfungen und überprüftem Konto-/Zugangspfad. Der aktuelle Nutzerauftrag benennt den gewünschten Livegang; historische GO-Texte sind dafür keine Quelle. Den tatsächlichen Kandidatenumfang und die noch nicht umgesetzten Entwurfsansichten vor Umschalten offen benennen. Falls die aktuelle Host-/Schema-/Policyprüfung eine zusätzliche konkrete Freigabe verlangt, erst den vollständig bestimmten Kandidaten und Rückweg vorlegen.

Unter Betreiber-Lock nochmals prüfen, dass Livequelle und Datenstand noch dem Preflight entsprechen. Neue Releaseablage verwenden, Symlink atomar umstellen und ausschließlich den Studio-Dienst neu starten. Persistente Datenpfade erhalten. Kein Merge nach main, Force-Push, Website-/DNS-Eingriff oder Providerumbau.

Nach Start: Dienstgesundheit, HTTPS, statische Assetversion, Session-/Zugangspfad und getrennte Vorschau-Origin prüfen. Bei Fehlern den vorab geprüften Rückweg ausführen und den gescheiterten Stand ehrlich melden. Keine alten Releases oder Backups löschen.

## 9 Handy zuerst abnehmen

Mit echten Geräten getrennt von synthetischen Prüfkonten. Für Marcos persönlichen Login gibt Marco sein Passwort selbst ein; Hermes soll es nicht erfahren oder protokollieren.

1. `https://studio.schmaqq.com` in Safari/Chrome am Handy öffnen; TLS ohne Warnung, passende Studio-Version bestätigen.
2. Falls privater Setup-/Einladungslink nötig: Konto einmalig einrichten. Danach normale E-Mail-/Passwort-Anmeldung prüfen.
3. 390 und 360 Pixel als reproduzierbare Browserbreiten prüfen; reale Gerätegröße zusätzlich nennen. Formular, Passwortanzeige, Fehlermeldung und Tastatur dürfen nicht abgeschnitten werden.
4. Der jetzige öffentliche Login liegt weit unter dem Einführungstext: Formulartop ca. 942px bei 390, 1192px bei 360. Zum ersten Test nach unten zum Login scrollen. Für eine Verbesserung den Login mobil vor die lange Einleitung stellen; dies wäre ein eigener kleiner Quellpatch mit neuem Commit, Build und neuem Archivhash, kein nachträgliches Editieren des gepinnten Releases.
5. Nach Anmeldung Menü, Start, Projekte, Aufgaben, Team/Wissen und Hilfe ohne Klickanweisung finden. Eine eindeutig benannte eigene Testaufgabe speichern und nach Neuladen wiederfinden; keine bestehenden Inhalte überschreiben.
6. Mobil: Rückfrage schreiben, Ergebnisbeschreibung lesen, relevante Handlung finden. Das Board kann innerhalb seines eigenen Bereichs horizontal scrollen; die Seite selbst nicht.
7. Abmelden und erneut mit dem eigenen Studio-Passwort anmelden. Konto und Arbeit bleiben erhalten.
8. Ausgeschalteter Heim-PC: Studio-Webzugang darf erreichbar bleiben, der persönliche Runner muss offline sein. Keine funktionierende KI-/Codeausführung vom Handy versprechen, solange kein zugelassener laufender Ausführer vorhanden ist.

Die Konto-/Menü-/Planungsabnahme ist Marcos erster Erfolg. Volle Codebearbeitung, KI, Vorschau und gemeinsame Fremdprüfung werden danach an einem konkreten Projekt eingerichtet und geprüft. Wenn der Nutzer die 30 neuen Designansichten vollständig live erwartet, ist vor diesem gesonderten Designrelease deren tatsächliche Implementierung erforderlich.

## 10 Rückmeldung an Marco

Sanitisierter Bericht mit Datum, tatsächlicher Livequelle, Archivhash, Linux-/Runtime-/Restore-Ergebnissen, Promotion oder exaktem Blocker, Kontostatus ohne Geheimnis, privatem Zugangsweg, realem mobilen Ergebnis und Rückwegstatus. Dazu eine kurze Anleitung anhand der tatsächlich ausgerollten Oberfläche.

Nicht melden: „alles fertig“, wenn nur Health 200 ist; „Marco kann sich anmelden“, wenn nur ein synthetisches Konto getestet wurde; „neues Dashboard live“, wenn nur die statischen Entwürfe vorliegen.
