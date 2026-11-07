# Aktueller Einstieg: Studio-Veröffentlichung und Hermes-Übergabe

Stand 28.10.2026. Diese Datei zuerst lesen; alte Chathistorie ist nicht erforderlich.

## Ziel und tatsächlicher Stand

SCHMAQQ Studio soll gemeinsame Aufgaben, Code, Konzepte, Review und Vorschau für
Marco und Kollegen verständlich verbinden. GitHub ist die technische Quelle.
Der geprüfte lokale Kandidat liegt auf `fix/stale-review-guidance-20261027`.
Exakten Commit aus dem PR-Head/Git lesen, nicht einen alten Chat-SHA verwenden.
Er baut auf `feat/team-workflow-20261026` / Draft-PR #51 auf. Diese Basis liegt
noch vor main; der Folge-PR allein ist daher kein unabhängiger main-Patch.

Neu im Folge-PR: veraltete Prüfstände verständlich erneut einreichen, konkrete
Git-Diagnose vor dem ersten Arbeitskopiestart, Bereitschaftsübersicht, bestehende
Projekte über Studio im laufenden Runner einrichten. Projektkonfiguration und
Geräteregistrierung bleiben getrennt; Einstellungen werden versioniert und atomar
gespeichert. Begrenzte Erkennung von Node-/Pilot-/Vite-Tests und statischer Vorschau.
Codex und Veröffentlichung sind getrennte persönliche Freigaben. Neue einfache
Runnerprofile erlauben Veröffentlichung nicht mehr stillschweigend.

## Aktuelle kombinierte Quellprüfung

Für die GitHub-Übergabe am 28.10.2026 `node selfhost/verify.mjs --local`
ausgeführt: 211 Tests, 190 PASS, 0 FAIL, 21 ausdrücklich plattformbedingte
Windows-Skips; Source Guard, TypeScript und Vite-Build bestanden. Linux-Recovery
bleibt NOT_VERIFIED, vollständige Releasefreigabe INCOMPLETE. Die alten
Browsernachweise wurden nicht erneut vollständig ausgeführt.

## Nachweise gezielt lesen

- `evidence/GUIDED_RUNNER_SETUP_20261028.md`: letzte Umsetzung, 6 fokussierte Tests,
  TypeScript/Build/Guard und tatsächliche Einrichtung des bestehenden Pilots per UI.
- `evidence/PILOT_CODEX_VORSCHAU_20261028.md`: echter persönlicher Codex-Auftrag,
  geänderte synthetische Seite in gebauter Browser-Vorschau sichtbar.
- `evidence/PERSONAL_PILOT_20261028.md`: ursprünglicher unterstützter Einstieg,
  reproduzierte Hürden und Grenzen. Historische Befunde sind keine Aussage, dass
  alle davon im neuesten Stand noch bestehen.
- `evidence/STALE_REVIEW_GUIDANCE.md` und `ONBOARDING_PREPARATION_20261028.md`:
  vorherige gezielte Browsernachweise. Nicht als neu wiederholte Tests zählen.
- `STATUS.json`: Statusfelder und verbleibende Grenzen; AGENTS.md gilt weiterhin.

Keine private SQLite-Datenbank, Profile, Tokens, OAuth-Secrets, Auth-Caches oder
vollständigen Chattranskripte übernehmen. Die lokale Pilotinstallation ist eine
getrennte Datenbank, kein Datenbestand für Production.

## Hermes: konkreter Auftrag für die Live-Aktualisierung

Ziel ist `studio.schmaqq.com` auf diesen geprüften Kandidaten zu bringen.
Zuerst die Veröffentlichung/Review-Abhängigkeiten von PR #51 und dem Folge-PR
auflösen und einen exakten freigegebenen Releasecommit festlegen. Nicht blind
main oder einen beweglichen Branch deployen. Kein gesondertes neues Feature bauen.

1. Aktuellen Live-Commit, Dienst, Nodeversion, Origins und Datenstand sanitisiert
   ermitteln; lokale Entwicklungsaussagen nicht als Live-Nachweis übernehmen.
2. Aktuelles Backup von Datenbank und privater Konfiguration erstellen und
   Wiederherstellung isoliert prüfen. Vorhandene Nutzer/Daten/Anmeldungen erhalten.
3. Exakten Releasecommit in unterstützter Linux-Umgebung prüfen. Windows-Skips
   sind kein Linux-Recovery-Nachweis. Keine GitHub-Actions-Billingabhängigkeit.
4. Kompatibilität mit tatsächlichem Liveschema über vorhandene Release-/Recovery-
   Werkzeuge prüfen. Unbekannte Schemas stoppen; keine improvisierte Migration.
5. Kandidat isoliert bauen und bestehende Konten, Anmeldung, eigene Runner,
   vorhandene Projekte und getrennte Preview-Origin gezielt prüfen.
6. Konkretes Ergebnis, Releaseidentität, Backup/Rückweg und Umschaltplan vorlegen.
   Erst nach Freigabe dieses geprüften Plans Production umschalten.
7. Anschließend HTTPS, Login, erhaltene Daten, Runnerstatus, Vorschau und Rückweg
   kontrollieren; tatsächlichen Live-Commit und Ergebnisse zurückmelden.

Die Website-Aktualisierung aktualisiert persönliche Runner nicht automatisch.
Für geführte Projekteinstellungen muss deren Software die Fähigkeit setupVersion:1
melden. Bestehende Gerätezugänge/Projektpfade erhalten und Softwareupdates getrennt
verteilen. Kein Kopieren persönlicher Modellanmeldungen auf den Server.

## Bekannte Grenzen

Einmalige lokale Runnerinstallation und persönliche Anmeldung bleiben nötig.
Kein signierter Ein-Klick-Installer; keine allgemeine Erkennung beliebiger Builds;
Claude/Copilot-Adapter noch nicht implementiert. Kein neuer vollständiger mobiler
oder unabhängiger No-Coder-PASS, kein echter Zwei-Geräte-/Zwei-Personen-Pilot.
Push/Review/Deployment eines Produktkandidaten ersetzt diese Nachweise nicht.

## Budgetschonend fortsetzen

Zuerst diese Datei, den PR-Diff und den passenden Nachweis lesen. Nur betroffene
Tests bei Änderungen wiederholen. Für Release einmal den kombinierten Stand
prüfen; festhalten, was selbst ausgeführt und was nur aus Evidence übernommen ist.
Offene Fragen an Originalquellen prüfen statt alte Chats vollständig zu lesen.
