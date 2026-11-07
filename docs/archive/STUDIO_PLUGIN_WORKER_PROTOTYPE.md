# Studio-Plugin und Worker: lokaler Entwicklungsstand

## Ziel

Code aus einem normalen ChatGPT-Chat kontrolliert in eine Studio-Arbeitskopie
uebertragen, dort testen und eine Vorschau fuer die zweite Person erzeugen.
Der VPS soll erster verwalteter Ausfuehrungsknoten werden; persoenliche Runner
fuer Windows, macOS und Linux sowie spaetere freigegebene Netzwerkknoten bleiben
Teil des Zielbilds. Dieser Prototyp ist noch kein dezentrales Netz.

## Implementiert

- `selfhost/studio-mcp.mjs`: identitaetsgebundener MCP-Werkzeugadapter fuer
  Projektliste, begrenzten Projektkontext, revisionsgebundene Dateioperationen,
  vorbereitete Arbeitskopien, Tests, Vorschau, lokalen Git-Pruefstand und
  Auftragsstatus/Abbruch. Keine GitHub-Push-/Merge-/Deployment-/Shellwerkzeuge.
- Der Adapter verwendet bestehende Studio-HTTP-Operationen. Personen-/Geraete-
  und Arbeitskopierechte sowie Originpruefung bleiben unveraendert.
- `selfhost/studio-mcp-ledger.mjs` speichert Mutationsschluessel, Eingabehash und
  begrenztes Ergebnis in einer getrennten privaten SQLite-Datenbank. Der Host
  bindet den Speicher an Person und stabile Autorisierungsfreigabe. Neue Adapter
  und erneut geoeffnete Datenbanken verwenden bestehende Ergebnisse. Gleicher
  Schluessel mit anderen Argumenten wird abgelehnt. Pending wird vor externem
  Aufruf gespeichert: nach unklarem Abbruch kein automatischer Neuauftrag.
  Ohne konfiguriertes Ledger bleibt der Adapter nur verbindungslokal geschuetzt.
- `selfhost/studio-mcp-http.mjs`: nur lokal erreichbarer HTTP-Testtransport mit
  persoenlichem Connection-Resolver, Originpruefung und erneuter Autorisierung
  bei jedem Aufruf. Keine automatische Einbindung in den Live-Webdienst.
- `plugins/schmaqq-studio/skills/studio-project-work/SKILL.md`: Arbeitsanweisung
  fuer die Werkzeuge, Quellkontext, Dateirevisionen und ehrliche Ergebnisse.
- Runnerpaket enthaelt jetzt das bisher fehlende `managed-projects.mjs`.
  Regression importiert allein das ausgepackte Laufzeitpaket und prueft den
  synthetischen Pilotstarter ohne Serverkontakt oder persoenliche Anmeldung.

## Tatsaechliche Ende-zu-Ende-Pruefung

`selfhost/studio-mcp.test.mjs` verwendet einen echten lokalen Studio-Server mit
temporaerer SQLite, zwei synthetischen persoenlichen Konten, ein isoliertes
lokales Bare-Git-Remote und den echten LocalRunner. Werkzeugaufrufe erzeugen
Auftraege; Poll und Lease/Report gehen durch die vorhandene HTTP-API.

Prepare -> Datei lesen -> Codeinhalt mit Revision speichern -> veraenderten
Altstand ablehnen -> echte Assertion ausfuehren -> echte HTML-Datei bauen ->
Vorschau ueber separaten HTTP-Server abrufen. Fremdes Geraet und private
Dateiergebnisse sind gesperrt, wiederholte Anforderung erzeugt keinen
Doppelauftrag. Das Git-Remote bleibt auf dem Ausgangsstand.

Das ist kein Modell-/ChatGPT-Nachweis: Der Test liefert die synthetische
Codeaenderung als Werkzeugeingabe. Er beweist die Ausfuehrungskette dahinter.
Die zwei Konten sind keine zwei realen Menschen. Die Tests laufen unter Windows;
es wurden keine Linux-/macOS-Installer oder VPS-Sandboxen abgenommen.

## Verbleibende Pflichtarbeit

1. Echte persoenliche OAuth-Autorisierung und MCP-Resource-Discovery fuer einen
   externen Client. Test-Connection-Resolver niemals als Produktlogin ausgeben.
2. Dauerhaften Mutationsspeicher im spaeteren authentifizierten Produkthost
   verbindlich aktivieren. Grantidentitaet muss Tokenrefresh ueberleben; neue
   Freigaben bilden eine neue Deduplikationsdomaene. Unklare Auftraege brauchen
   noch eine bedienbare Abgleichfunktion; Quoten-/Aufbewahrungsverwaltung fehlt.
   Keine atomare Transaktion zwischen externem HTTP-Auftrag und Ledger:
   'pending' verhindert Doppelstart, kann aber manuelle Klaerung erfordern.
3. MCP-Transport-/Protokollkonformitaet, Initialisierungs-/Versionsverhandlung und
   Interoperabilitaet im tatsaechlichen normalen ChatGPT-Chat sowie in Codex.
   Keine garantierte Konto-/Modusverfuegbarkeit aus dem lokalen JSON-RPC-Test.
4. Registrierte verwaltete VPS-Ressource mit klaren Personen-/Projektgrants,
   Sandbox, Quoten und Lebenszyklus. Private Own-device-Pruefung erhalten;
   heutige Arbeitskopien sind geraetgebunden. Kein root-Worker oder Zugriff auf
   Productionverzeichnisse/Host-Dockersocket.
5. Download-/Installations-/Pairing-/Update-App fuer Windows/macOS/Linux.
   Paketimport ist kein Installer oder Betriebssystemabnahmenachweis.
6. Gegenwaertige Vorschau ist ein Capability-Link: Jeder Besitzer des Links kann
   sie lesen. Kein zusaetzlicher kontobasierter Teamzugriff implementiert.
   Previewpolitik vor privaten Communityprojekten klaeren und pruefen.
7. Direkte KI im Studio erhalten/vereinfachen. Persoenlicher Modellzugang und
   zusaetzliche spaetere Adapter sind getrennt von der Codeausfuehrung. Keine
   persoenlichen Abos poolen, keine API-Schluessel oder Modellcredits erforderlich
   fuer diesen lokalen werkzeugseitigen Nachweis. Keine Modellanfragen gestartet.
8. Spaetere Vermittlung nach Faehigkeit, Verfuegbarkeit, Datenklasse und expliziter
   Freigabe. Automatisches Ausweichen und Community-/Foederationsbetrieb fehlen.

## Pruefkommandos

Node >=24.15 und vollstaendiges Git mit `git daemon` auf PATH verwenden. In der
Codex-Sitzung wurde zuerst ein reduziertes Git ohne daemon gefunden; dadurch
scheiterte der bestehende Gitimporttest. Mit vorhandenem vollstaendigem Portable
Git bestanden die fokussierten Tests. Globale Git-/Codex-Konfiguration blieb
unveraendert; PATH und GIT_EXEC_PATH wurden nur fuer Pruefprozesse gesetzt.

```
node --test selfhost/studio-mcp.test.mjs selfhost/studio-mcp-http.test.mjs selfhost/runner-package.test.mjs
node selfhost/verify.mjs --local
git diff --check
```

Linux-/Operator-Skips des lokalen Verifiers bleiben NOT_VERIFIED. Browserabnahme,
persoenliche ChatGPT-Verbindung, VPS-Aenderung, Push und Deployment sind separate
Schritte. Keine vertraulichen Profile oder Testpasswoerter in diesem Dokument.
