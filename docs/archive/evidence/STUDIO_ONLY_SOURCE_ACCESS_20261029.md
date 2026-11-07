# Owner-Praxistest: Quelltext über Studio tatsächlich geliefert

29.10.2026. Der Owner führte den Zugriff in einem separaten ChatGPT-Chat aus
und übergab dessen Bericht. Root hat anschließend die genannten Ergebnisse
**selbst lesend über die Studio-Verbindung** nachgeprüft, ohne GitHub-Plugin,
Websuche, SSH oder neue Ausführungsaufträge.

## Selbst gelesene Studio-Ergebnisse

`get_code_job` bestätigte jeweils `completed`:

| Aktion | Job-ID | Nachweis |
| --- | --- | --- |
| prepare | 8dc592f2-ca54-492d-a2c0-7dbe5156939f | Server-Arbeitskopie, Branch und Ausgangscommit geliefert |
| read-file AGENTS.md | 44cad103-cc43-4d8b-b98b-fc2c2332fe1a | 13177 Zeichen und Dateirevision geliefert |
| read-file Makefile | 8edb43fc-26e9-4907-8739-127da49bee87 | 11158 Zeichen und Dateirevision geliefert |
| read-file requirements-build.txt | 0295bb28-012e-49ff-b09d-5df740c83761 | 15 Zeichen und Dateirevision geliefert |

`list_workspaces` bestätigte anschließend selbst:
- Kopie `8dc592f2-ca54-492d-a2c0-7dbe5156939f` gehört zur Aufgabe
  `be0c4c20-a56b-4c55-9162-5fff882bbc4d` im Projekt Klimafinder.
- Server-Worker online; Branch `studio/8dc592f2-ca54-492d-a2c0-7dbe5156939f`.
- Ausgangscommit laut prepare-Ergebnis:
  `f60408a55dd6b841f68a5cb5dd5e3cf92d05f599`.

Das ist ein Nachweis, dass die Dateien über Studio geliefert wurden. Die
Quellintegrität und Workerbehauptungen wurden nicht durch einen zusätzlichen
unabhängigen Git-/Serverzugriff geprüft. Keine Aussage darüber, welche weiteren
Werkzeuge der fremde Chat außerhalb dieser gemeldeten Jobs benutzt hat.

## Bestätigte Schnittstellenlücke für B

In allen drei read-file-Jobs ist `payload.contractSnapshot.criteria` mit den vom
Owner erfassten Abschlusskriterien vorhanden. Der lokale Quellcode
`selfhost/room-http.mjs`, `buildRoomContext`, gibt bei `project_context` Titel und
Beschreibung aus, nicht die Kriterien. Der zuvor übergebene fremde Chatbericht
meldete genau dieses Fehlen. Daher sind die Kriterien nicht verloren, sondern
im zentralen Kontextabruf unvollständig abgebildet.

Zusätzlich für B: keine Suche der Aufgabe anhand des Titels durch den aktuellen
MCP-Vertrag; die explizite Projekt-/Aufgaben-ID ermöglichte den Zugriff. Eine
sichtbare aufgabengebundene Übergabe würde diese manuelle ID-Weitergabe vermeiden.

## Grenzen und nächster Schritt

Keine Codeänderung, Installation, Tests oder Veröffentlichung durch Roots
Nachprüfung. Keine Tests ausgeführt; fünf lesende Studio-Abfragen vorgenommen.
Die parallele Abweisung HTTP 409 ist nur im fremden Bericht genannt, von Root
nicht eigens reproduziert. Der frühere fachliche GitHub-/P66-Bericht bleibt
gesondertes, hier nicht unabhängig bestätigtes Quellenmaterial.

Nächster Schritt im Owner-Chat: fachliche Analyse derselben main-Arbeitskopie
ausschließlich über Studio, mit Fundstellen und Trennung von Hypothesen und
Nachweisen. Keine Builds vor Klärung der bekannten Python-Umgebungslücke.
Aktueller Studio-Codestand: Live-Nachweis PROJECT_CONFIGURATION_DEPLOY_20261029.md;
diese Datei ist eine zusätzliche Nachweisnotiz, keine Runtime-Änderung.
