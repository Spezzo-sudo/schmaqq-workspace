# Nächster Meilenstein: gemeinsam am selben Projekt arbeiten

## Ziel und feste Grenze

Marco und Markus bearbeiten gleichzeitig zwei Aufgaben desselben Projekts mit
eigenen Konten, eigenen ChatGPT-/Codex-Zugängen und eigenen Arbeitskopien. Beide
verstehen Zuständigkeit, Gespräch, Ergebnis und Prüfstand ohne Agentenerklärung.

Bis zur Abnahme dieses Ablaufs keine weiteren Anbieter- oder Dashboardfunktionen.
Der tatsächliche Fähigkeits-/Teststand steht ausschließlich in `STATUS.json`.
Dieser Plan beschreibt Reihenfolge und Abnahme, keine Live-Freigabe.

Aktueller Übergang: P1 und P2 abgeschlossen; siehe
[P2-Abnahme](evidence/P2_SWITCH_ACCEPTANCE_20261017.md). Jetzt P3/P4:
Markus nutzt macOS, [Einstieg vorbereitet](MARKUS_MAC_ONBOARDING.md), eigener
Runner noch offen. Der ausdrücklich genehmigte private Testremote ist nun
`Spezzo-sudo/schmaqq-studio-pilot`; Seed und zwei Aufgaben sind angelegt
([P3-Vorbereitung](evidence/P3_PILOT_SETUP_20261017.md)). Die folgenden
Bereitstellungsabschnitte bleiben als Ablauf und Freigabegrenzen erhalten.

## Arbeitsvorgang im Studio – ab jetzt der gemeinsame Standard

| Schritt | Was du im Studio machst | Woran du den Erfolg erkennst |
| --- | --- | --- |
| 1 | Studio-Pilottest wählen, eigene Aufgabe öffnen und übernehmen | Zuständige Person und besprochener Dateibereich sind klar |
| 2 | Anforderungen/Rückfragen an der Aufgabe kommentieren und senden | Gesendeter Kommentar bleibt auch nach Neuladen sichtbar |
| 3 | Weiterarbeiten / Eigene Arbeitskopie öffnen | Eigene vorhandene Kopie wird verwendet; bei Erststart eine eigene erstellen |
| 4 | Dateien laden, gewünschte Datei öffnen, ändern und speichern | Runner bestätigt Speicherung; keine ungespeicherte Änderung übersehen |
| 5 | Änderungen ansehen und Tests ausführen | Richtige Dateien im Diff; reale Testausgabe bestanden oder Fehler verständlich |
| 6 | Vorschau bauen und öffnen | Gespeicherte Änderung erscheint in der tatsächlichen neuen Vorschau |
| 7 | Zur Teamprüfung, danach Aufgabe auf Zur Prüfung setzen | Lokaler Commit, Tests und Diff sind an einem unveränderlichen Stand sichtbar |
| 8 | Zweite Person öffnet Prüfstand aus der Aufgabe und prüft | Rückmeldung gehört genau zu diesem Stand; keine Selbstfreigabe |
| 9 | Erst separat freigegebene Veröffentlichung/Übernahme | Repositoryregeln erfüllt; nach zwischenzeitlichen Änderungen erneut testen |

„Auftrag abgeschlossen“ bedeutet nicht, dass die Aufgabe unabhängig abgenommen
oder veröffentlicht ist. Kommentare/Dateien sind erst nach Senden/Speichern
dauerhaft. Ungespeicherte Entwürfe nur innerhalb desselben Tabs erhalten.
Der aktuelle Pilot sperrt KI, Veröffentlichung und direkte Integration.

**Browserabnahme vom 17.10.2026:** Der Agent hat Schritte 1–7 und das erneute
Öffnen des Prüfstands tatsächlich über die Live-Oberfläche ausgeführt, inklusive
Kommentar-/Dateientwurfserhalt, neuer Vorschau und 2/2 Tests. Die Aufgabe steht
auf Zur Prüfung. Beleg: [Browserablauf](evidence/P3_LIVE_BROWSER_WORKFLOW_20261017.md).
Schritt 8 benötigt die zweite echte Person und bleibt offen; Schritt 9 bleibt
gesperrt. Persönliche Mac-/Konteneinrichtung ist eine Voraussetzung für Markus,
kein durch einen Browser-Test ersetzter Schritt.

## 1. Geprüften Kandidaten sichern

Die zusammengehörigen lokalen Arbeiten werden im privaten Repository
`Spezzo-sudo/schmaqq-workspace` auf `fix/studio-first-workspace-layout` gesichert.
Der Kandidat umfasst Projektübersicht, Aufgabenübernahme, Kommentare, getrennte
Arbeitskopien, Review-Verweise, responsive Oberfläche und klar gekennzeichnete
Kontoverbindungen. Der optionale GitHub-OAuth-Weg bestätigt nur die Identität.

Prüfbelege und bekannte Grenzen:
- `PARALLEL_COLLABORATION_HANDOFF.md`: lokaler Zwei-Rollen-End-to-End-Test.
- `CONNECTIONS_HANDOFF.md`: Konto-Verknüpfung, Grenzen und nötige Einrichtung.
- `USABILITY_FIRST_WORKSPACE.md`: erster Einstieg und Editor-Korrekturen.
- `../R5_A_TECH_HANDOFF.md`: bereits eingerichteter persönlicher Windows-Runner.

Der Kandidat ist über [Draft-PR #6](https://github.com/Spezzo-sudo/schmaqq-workspace/pull/6) zur Prüfung verfügbar. Quellcode-Sicherung ist kein
Merge, kein Release und kein Deployment. Aktuellen Commit aus Git ermitteln;
keine wechselnden HEAD-SHAs in dauerhaftem Planungstext pflegen.

## 2. Kontrollierte Bereitstellung vorbereiten

Das Live-Studio ist bereits erreichbar. Sein aktueller Betrieb muss vor einem
Update lesend geprüft werden; historische R4-Texte sind kein aktuelles Inventar.
Der aktuelle Befund und konkrete Ablauf stehen jetzt in
[LIVE_PREFLIGHT_20261017.md](LIVE_PREFLIGHT_20261017.md). Dienst, Release,
Ressourcen, HTTPS und Runner sind lesend geprüft; Live-Backup/Restore bleibt
wegen der korrekt geschützten Daten Aufgabe des befugten Betreibers.
Es gibt einen separaten R4/Hermes-Betriebsentwurf. Dieser Kandidat ersetzt oder
führt diesen Entwurf nicht automatisch aus. Zu prüfen sind:

- tatsächlich eingesetzter Commit, Node-Version, Dienst- und Datenpfade;
- Herkunft des aktuellen Frontends und Backends, Studio-/Preview-Origin;
- freier Speicher/RAM sowie laufende persönliche Runner und Warteschlangen;
- konsistentes Backup und geprüfte Wiederherstellung vor der Datenmigration;
- kontrollierter Dienstwechsel auf das zusammengehörige Frontend/Backend;
- Rückkehr zum alten Release und dessen gesichertem Datenstand als Rückweg.

Kandidat ergänzt Tabellen für Aufgabenkommentare und optionale GitHub-Verknüpfung.
Er löscht keine bestehenden Daten. Dennoch Backup vor Update; kein ungeprüftes
Downgrade auf eine später veränderte Datenbank. Runtime-Paket und Smoke-Test
müssen genau aus dem freigegebenen Kandidaten gebaut werden.

**Betriebsschritt erst nach separater ausdrücklicher Freigabe.** Kein Merge,
kein Deployment, keine Providerregistrierung oder Nachricht an Hermes durch
blosse Bereitstellung dieses Plans. Bestehendes NetzKontor bleibt unberührt.

## 3. Echten Zwei-Personen-Pilot durchführen

Ein ausdrücklich freigegebenes Testprojekt verwenden. Der Owner hat inzwischen zusätzlich
`Spezzo-sudo/schmaqq-studio-pilot` als privaten gemeinsamen Testremote genehmigt.
Dies erlaubt keine Änderungen an NetzKontor. Vorhandenen Marcos Runner verwenden; keine Doppelregistrierung. Markus
benötigt seinen eigenen Studio-Zugang und seinen eigenen Runner.

Aufgabe A: Startseitenbotschaft überarbeiten, Datei-/Ordnerbereich deklarieren.
Aufgabe B: Service-Angebot beschreiben, anderen Bereich deklarieren.

Ablauf für beide:
1. Persönlich anmelden, dasselbe Projekt öffnen, eigene Aufgabe übernehmen.
2. Bei der anderen Aufgabe eine Rückfrage stellen und eine Entscheidung festhalten.
3. Eigene Arbeitskopie öffnen; gleichzeitig unabhängig entwickeln und speichern.
4. Echte Tests ausführen und Vorschau ansehen. Falsche Ergebnisse sichtbar lassen.
5. Prüfstand aus der Aufgabe öffnen, den Stand des anderen kommentieren/freigeben.
6. Veröffentlichung und Übernahme erst nach den Regeln des freigegebenen Testrepos.
7. Runner kurz trennen und wieder verbinden; Dateien/Entwürfe nicht verlieren.

Mit eigenen KI-Abos folgt erst nach bewusst freigegebenem kleinem Auftrag ein
zusätzlicher Test. Studio-Login, GitHub-Identität und Modellberechtigung bleiben
getrennte Zustände. Ein ausgeschalteter persönlicher PC führt keine Jobs aus.

## 4. Abnahmekriterien und Nacharbeit

- Beide können gleichzeitig an ihren Aufgaben arbeiten; Überschneidungen werden
  verständlich angezeigt, keine stillen Übernahmen reservierter Bereiche.
- Zuständigkeit, offener Gesprächsbedarf und nächster Schritt sind verständlich.
- Kommentare bleiben bei der richtigen Aufgabe, Änderungen bei der richtigen Kopie.
- Tests/Vorschau/Freigabe beziehen sich auf den tatsächlich bearbeiteten Stand.
- Jeder braucht sein eigenes Konto; eigene Runner werden nicht fremd nutzbar.
- Einrichtungs- oder Bedienungshürden werden als Fehler mit Reproschritt erfasst.

Jede Stelle, an der Marco oder Markus eine Erklärung brauchen, wird als nächster
konkreter Verbesserungsauftrag erfasst. Erst nach diesem tatsächlichen Nutzertest
folgt der weitere Ausbau. Ein lokaler Zwei-Rollen-Test ist technische Evidence;
er ersetzt diese menschliche und standortübergreifende Abnahme nicht.
