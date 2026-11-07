# SCHMAQQ Studio — VPS-Migration und Recovery (R24-A)

Status: **Reviewfähige Betriebsanleitung; noch kein VPS-Umzug ausgeführt.**
Dieses Dokument autorisiert keine Production-Änderung.

## Bestandsarchitektur und Source of Truth

SCHMAQQ Studio verwendet einen Node-24-Server mit SQLite WAL, React/Vite und
persönlichen Runnern. Es ist **nicht** der historische Next/Cloudflare-Starter.

| Bestandteil | Heute | Beim Umzug |
| --- | --- | --- |
| Code | /opt/schmaqq-studio/releases/<SHA>, Symlink current | Exakt freigegebenes Archiv übernehmen |
| Node | /opt/schmaqq-studio/runtime/node/bin/node | Node >=24.15 separat bereitstellen |
| Persistente Daten | STUDIO_DATA_DIR, derzeit /var/lib/schmaqq-studio | Komplettes Verzeichnis + konsistenter SQLite-Snapshot |
| Umgebung | /etc/schmaqq-studio.env | Nur über geschützten Betreiberkanal übertragen |
| Dienst | schmaqq-studio.service | Gehärtete systemd-Unit und Besitzer rekonstruieren |
| HTTPS | STUDIO_ORIGIN / 4310, STUDIO_PREVIEW_ORIGIN / 4311 | Zwei getrennte TLS-Origins und Proxyregeln |
| GitHub/OIDC | Optional und separat konfiguriert | Callback-URLs, Repository-Allowlist und Secrets verifizieren |
| Runner | Gerätedaten zentral, Git/Codex/Token lokal auf PCs | Geräteidentitäten erhalten, PCs neu verbinden und prüfen |

Am 19.10.2026 wurde Production auf
`aef64f85efeeb40f6c0f3a7dc43986a52a20f09f` (R23) bestätigt.
GitHub-`main` ist abweichend. **Nicht einfach main auschecken und als
Production deklarieren.** Versionsangleichung ist eine gesonderte Änderung.

## Prüfen des bestehenden R23-Archivs

R23 besitzt ein Manifest mit 703 Dateien, aber noch keine eingebettete
`release-source.json`. Der vertrauenswürdig berichtete Archiv-SHA256 lautet:

`1a927d7eba4d5becf749401baaf2ab5f02cd8e004577258c9a3cd069331e6768`

Mit dem neuen R24-A-Quellcheckout prüft der Operator ein aus dem exakt
gepinnten R23-Archiv extrahiertes Verzeichnis:

    node selfhost/deploy/verify-release.mjs \
      --release /path/to/extracted-R23 \
      --source aef64f85efeeb40f6c0f3a7dc43986a52a20f09f \
      --archive /path/to/approved-R23.tar.gz \
      --archive-sha256 1a927d7eba4d5becf749401baaf2ab5f02cd8e004577258c9a3cd069331e6768 \
      --allow-legacy

Die Ausgabe `sourceAttestation=legacy-external-only` bedeutet ausdrücklich:
Archiv-Digest und extrahierte Dateien stimmen, aber R23 selbst enthält
keinen eingebetteten Git-Quellbeleg. Die zugehörige Commit-Identität wird
zusätzlich mit Hermes-Evidence und GitHub überprüft.

Ab R24-A erzeugte Releases enthalten `release-source.json` mit dem
Source-Commit und Source-Tree. Diese Releases **ohne** `--allow-legacy`
verifizieren:

    node selfhost/deploy/verify-release.mjs \
      --release /path/to/extracted-release \
      --source FULL_APPROVED_GIT_SHA \
      --archive /path/to/release.tar.gz \
      --archive-sha256 FULL_APPROVED_ARCHIVE_SHA256

Dieser Prüfbefehl ist read-only.

## 1. Planung auf dem alten VPS (noch nichts umschalten)

- Gesondertes Owner-GO für den **VPS-Umzug** und ein abgestimmtes Wartungsfenster
  inklusive Wiederanlaufzeit und maximal toleriertem Datenverlust einholen.
- **Alle** gemeinsam betriebenen SCHMAQQ-Dienste, DNS/Traefik, Ports, TLS,
  Festplatten, Backupziele, CPU-/RAM-Grenzen und externen Abhängigkeiten
  inventarisieren. PR16, PR17 und andere Dienste sind separat zu behandeln.
- Laufende Release-SHA, Archiv-Hash, Release-Manifest, systemd-Metadaten,
  Node-Version, aktive Jobs und aggregierte DB-Zählwerte dokumentieren.
  Keine privaten Token, Passwörter oder personenbezogenen Inhalte ausgeben.
- Einen verschlüsselten **Offsite-Backup-Speicher ausserhalb des alten VPS**
  sicherstellen. Ein Backup auf demselben Host schützt nicht bei dessen
  Totalausfall. Für R23 ist noch keine Offsite-Aufbewahrung nachgewiesen.

## 2. Neuen VPS getrennt vorbereiten

- Aktuelles Linux, Firewall, SSH-Zugang, verifizierte Node-Laufzeit,
  separaten nicht-anmeldbaren Dienstbenutzer und gehärtete systemd-Unit
  einrichten. Keine offenen 4310/4311-Ports nach aussen.
- Das exakt genehmigte Archiv in ein **neues, unveränderliches** Release-
  Verzeichnis entpacken; Dateihashes, Source-Provenienz und Backup verifizieren.
- Secrets und Konfigurationswerte über einen geschützten privilegierten
  Weg übertragen; nicht ins Git-Repo, die Chat-Antwort oder das Archiv.
- Studio-Origin und Preview-Origin separat als HTTPS-Domains konfigurieren.
  OAuth-Callbacks, Cookies, Reverse-Proxy, Request-Limits und TLS testen.
- Systemressourcen passend dimensionieren: MemoryMax=256M und CPUQuota=50%
  bleiben trotz grösserem VPS in der Unit aktiv, solange nicht angepasst.
- Neuen Dienst noch nicht öffentlich erreichbar oder produktiv schreibbar machen.

## 3. Daten sichern und Restore isoliert nachweisen

- Geschützten konsistenten SQLite-Snapshot an neuem Ziel anlegen.
  `selfhost/backup.mjs` verwendet `VACUUM INTO` (WAL-sicher), setzt `0600`,
  prüft SQLite-Integrität und Fremdschlüssel, schützt vor Überschreiben.
- Der Helfer ist **kein vollständiges Backup**. Zusätzlich sämtliche
  persistenten Studio-Dateien/Anhänge, geschützte Konfigurationsdaten,
  effektive Unit und weiteren betrieblich nötigen Zustand einbeziehen.
- SQLite-Hauptdatei nie blind ohne WAL-Koordination kopieren.
- Prüfen: Eigentümer, Dateirechte, verschlüsselte Speicherung, Datei-Hashes,
  Tabellen-/Schema-Konsistenz, Anzahl Accounts, Sessions, Geräte, Einladungen,
  Jobs, Tasks, Kommentare, Dokumente und Previews.
- Kompletten Backup-Stand in geschützter **nicht öffentlich erreichbarer**
  Testumgebung wiederherstellen. Dort **keine** Runner, KI-Jobs, Provider-
  Aktionen oder echten Einladungen auslösen.
- Offsite-Kopie und Restore-Nachweis dokumentieren; Originalbackup aufbewahren.

## 4. Geplanter Cutover (nur nach gesondertem Owner-GO)

1. Exklusiven Migrations-/Deployment-Lock setzen, Source/Archiv erneut prüfen.
   Bei SHA-Abweichung STOP.
2. Schreibzugriffe auf dem alten Studio kontrolliert pausieren; bestehende
   Jobs auslaufen lassen und `active_jobs=0` prüfen.
3. Letzten konsistenten SQLite-Snapshot **und** Zusatzdateien/Konfiguration
   übertragen; Integrität und Datenstände auf dem Ziel unabhängig vergleichen.
4. Erhaltene Benutzer-/Session-/Geräte-IDs übernehmen. Keine neue Bootstrap-
   Einladung oder Geräte-Registrierung erzwingen.
5. Neuen Studio-Dienst erst privat starten, Login, Aufgaben, Kommentare,
   Editor, Tests, Review, Vorschau und Runner-Reconnect prüfen.
6. Nur die freigegebenen Studio-/Preview-Domains umschalten. TLS, Cookies,
   OAuth und DNS-TTL beachten. **Nie zwei produktive Schreib-Master.**
7. Alten VPS gegen neue Schreibzugriffe sichern, aber als möglichen
   Rollback-Punkt behalten. Aktiv überwachen, erneut DB-Checks durchführen.
8. Erst nach ausdrücklicher Abnahme den Umzug abschliessen.

## 5. Rückweg ohne Datenverlust

DNS/Symlink zurückzustellen ist nach neuen Benutzeraktionen kein vollständiger
Rollback. Wurden auf dem neuen Host Daten geschrieben, diese **nicht** durch
einen alten Snapshot überschreiben. Beide Seiten quiescen, den neuen Stand
reproduzierbar übertragen oder die Wiederherstellung bis zur gesonderten
Freigabe stoppen.

## 6. Abnahme und noch offene Arbeiten

Erforderlich: genaue Quell-/Ziel-SHAs, beide Origins, signierte bzw. gepinnte
Archiv-Hashes, Manifest, Offsite-Backup und Restore, SQLite-Integrität/FKs,
anonymisierte Datenzahlen, **zwei unabhängige Login-Konten**, persönliche
Runner, Tests, Vorschau, Review, DNS/TLS und getesteter Rückweg.

Noch **nicht umgesetzt**: automatisches verschlüsseltes Full-Data-Offsite-
Backup, Backup-Aufbewahrungsregeln, versionierte Schema-Migrationen,
privilegierter Umzugsautomatismus und ein vollständiger authentifizierter
Production-Zwei-Personen-Test. Dieser Runbook allein beweist keine Migration.
