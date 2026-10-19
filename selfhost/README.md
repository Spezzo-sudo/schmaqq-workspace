# Schmaqq Studio: eigenständig betreibbarer Entwicklungsworkspace

Diese Ausführung verwendet die vorhandene React-Oberfläche, einen Node-Server
mit SQLite und ausgehend verbundene lokale Runner. Sie benötigt keine Sites-
Anmeldung, Cloudflare-Datenbank oder OpenAI-API-Schlüssel. Die bestehende
Sites-Ausführung bleibt unabhängig davon im Repository erhalten.

## Lokaler Start (Node 24.15 oder neuer)

```text
npm run studio:build
npm run studio:start
```

Studio läuft auf `http://127.0.0.1:4310`, die Vorschauen separat auf
`http://127.0.0.1:4311`. Keine Schnittstelle wird standardmäßig ins Netz gebunden.

Für das erste persönliche Konto:

```text
npm run studio:invite -- DEINE_EMAIL --owner
```

Den ausgegebenen einmaligen Link selbst im Browser öffnen und ein eigenes
Studio-Passwort setzen. Der Link gilt 48 Stunden. Er wird nicht automatisch
versendet. Einladungen enthalten eine Zugangsberechtigung und gehören nicht
in Git oder öffentliche Chats. Weitere Mitglieder lädt der Eigentümer im
Bereich **Entwicklung** ein. Alle Mitglieder dieses kleinen privaten Studios
haben Zugriff auf die gemeinsamen Projekte. Mandanten- oder Kundenisolation
ist in dieser ersten Version nicht implementiert.

## Einen PC verbinden

1. Git, Node 24 und Codex auf dem jeweiligen PC installieren. Jeder meldet sich
   dort mit **seinem eigenen ChatGPT-Konto** über `codex login` an.
2. Gemeinsames Repository lokal klonen. `origin` muss auf das gemeinsame
   Repository zeigen. Die passende Git-Identität muss lokal konfiguriert sein.
3. Im Studio unter **Entwicklung → PC verbinden** ein Gerät registrieren.
4. Lokalen Repository-Pfad, Hauptzweig und echten Testbefehl eintragen.
5. Die private Runner-Konfiguration herunterladen und außerhalb der
   Arbeitskopien aufbewahren. Sie enthält das Gerätetoken, keine ChatGPT-Tokens.
6. Auf diesem PC aus dem Studio-Quellordner starten:

```text
node selfhost/runner.mjs /absoluter/pfad/schmaqq-runner.private.json
```

Beispielkonfiguration (keine echten Zugangsdaten):

```json
{
  "server": "https://studio.example.com",
  "token": "HIER_DAS_PERSOENLICHE_GERAETETOKEN",
  "stateDir": "/home/marco/.schmaqq-runner",
  "codex": "/absoluter/pfad/zu/codex",
  "projects": {
    "website": {
      "repo": "/home/marco/projekte/schmaqq",
      "base": "main",
      "check": ["node", "--test"],
      "allowCodex": true,
      "preview": {
        "build": ["node", "scripts/build-preview.mjs"],
        "directory": "dist"
      }
    }
  }
}
```

Die Befehle sind Argumentlisten, keine Shell-Zeilen. Auf Windows für `.cmd`-
Werkzeuge bevorzugt deren JavaScript-Einstiegspunkt mit einem absoluten
Node-Pfad verwenden. Das vermeidet Shell-Escaping. Die tatsächlichen Befehle
müssen zum Projekt passen; ein fehlender Testbefehl blockiert Einreichungen.
Abhängigkeiten müssen in neuen Arbeitskopien bereitgestellt werden, etwa über
ein ausdrücklich konfiguriertes lokales Prüfskript. Es findet keine automatische
Paketinstallation aus einem Serverauftrag statt.

Der Server kann nur auf dem eigenen registrierten Gerät Aufträge starten.
Repository-Pfade und ausführbare Befehle werden ausschließlich aus der lokalen
Konfiguration gelesen. Ohne `allowCodex: true` ist KI-Ausführung gesperrt.
Der Runner erzwingt ChatGPT-Anmeldung und den Codex-Workspace-Sandbox-Modus;
er verwendet keinen API-Key. Live-Modellaufrufe verbrauchen das persönliche
Kontingent und wurden nicht automatisch im Integrationstest ausgeführt.

## Git-Verbindung vor dem ersten Auftrag prüfen

Nach der Geräteregistrierung unter **Entwicklung → Git-Verbindung prüfen**
das lokal freigegebene Repository prüfen lassen. Dafür ist noch keine
Arbeitskopie nötig. Die Prüfung liest die Git-Konfiguration, fragt den
konfigurierten Hauptzweig mit `git ls-remote` ab und kontrolliert die lokale
Git-Identität sowie den konfigurierten Testbefehl. Sie legt keine Branches an,
ändert keine Projektdateien und veröffentlicht keinen Code.

Die Remote-Adresse und deren Befehlsausgaben erscheinen nicht im gemeinsamen
Protokoll, da Repository-Adressen Zugangsdaten enthalten können. Ein positives
Ergebnis bestätigt Lesezugriff; Schreibrechte und tatsächliche Tests werden
beim Einreichen geprüft. Der Studio-Server erhält weiterhin keinen lokalen
Repository-Pfad und keine ChatGPT-Zugangsdaten.

## Durchgängiger Ablauf

- **Neue Arbeitskopie:** `git fetch` und neuer `studio/<id>`-Branch in einem
  eigenen Git-Worktree. Eure vorhandene Arbeitskopie bleibt unverändert.
- **Codex-Auftrag:** auf dem eigenen PC und in der eigenen Arbeitskopie.
- **Änderungen:** Git-Status und Diff anzeigen. Neue unversionierte Dateien
  erscheinen im Status; ihr vollständiger Diff entsteht bei Einreichung.
- **Tests:** ausschließlich den lokal freigegebenen Prüfablauf ausführen.
- **Zur Teamprüfung:** lokaler Commit und Tests, ohne Push. Der gespeicherte
  Commit und Diff sind für beide Mitglieder im Studio prüfbar.
- **Branch veröffentlichen:** Tests, Commit und normaler Push des persönlichen Branches.
- **Zusammenführen:** neuen Integrations-Worktree anlegen, den eingereichten
  Commit prüfen, mergen, nochmals testen und normal in den Hauptzweig pushen.
  Konflikte oder gleichzeitig vorgerückter Hauptzweig stoppen den Vorgang.
  Es gibt keine Force-Pushes und keine automatische Konfliktauflösung.
- **Vorschau:** lokal bauen und höchstens 5 MB/500 Dateien veröffentlichen.
  Relative Asset-Pfade verwenden (bei Vite z. B. `base: './'`). Die letzten zehn
  Vorschauen werden aufbewahrt. Keine serverseitigen Anwendungen in dieser
  Vorschau; deren Laufzeitumgebung ist ein späterer Ausbau.

Vorschauen haben eigene schwer erratbare Links. Wer einen Vorschau-Link kennt,
kann die entsprechenden Build-Dateien lesen. Dafür bewusst keine vertraulichen
Daten oder Secrets in Frontend-Builds aufnehmen. Der Vorschau-Server muss auf
einem **anderen Origin** als das Studio laufen, damit Projekt-JavaScript keinen
Zugriff auf Studio-Sitzungen erhält. Ein eingebauter Modus für lokale dauerhafte
Vorschauprozesse ist nur auf dem jeweiligen Ausführungs-PC erreichbar.

Der Runner arbeitet pro Gerät nacheinander. Bei Verbindungsverlust wird ein
gestarteter Auftrag nicht automatisch nochmals ausgeführt. Gerät widerrufen
stoppt neue Aufträge; ein bereits lokal laufender Prozess muss gegebenenfalls
auf diesem PC beendet werden. Verwaiste Worktrees werden bewusst erhalten,
damit keine ungesicherten Änderungen gelöscht werden. Bereinigung erfolgt
kontrolliert über Git nach Prüfung und Sicherung.

## Schlanker VPS-Betrieb

Das Image **auf einem Entwicklungs-PC oder Buildrechner** bauen, nicht auf dem
VPS mit nur 10 GB Reserve. Docker ist auf diesem Windows-Rechner derzeit nicht
als ausführbares Werkzeug nachgewiesen; der Containerstart ist deshalb noch
nicht praktisch verifiziert.

```text
docker build -f selfhost/Dockerfile -t schmaqq-studio:local .
```

Das finale Image enthält nur Node, Zod, den Server und die gebaute Oberfläche.
Runner, Editor, Abhängigkeiten der eigentlichen Projekte und Builds laufen auf
euren PCs. Vor einer Installation freien RAM, Festplatte, vorhandene Ports und
den bestehenden Schmaqq-Reverse-Proxy prüfen.

`STUDIO_ORIGIN=https://studio.example.com` und
`STUDIO_PREVIEW_ORIGIN=https://preview.example.com` setzen. Die Beispieldomains
sind Platzhalter; vorhandene Produktivdomains wurden nicht geändert.

```text
docker compose -f selfhost/compose.yaml up -d --no-build
docker compose -f selfhost/compose.yaml exec studio node selfhost/admin.mjs DEINE_EMAIL --owner
```

Der vorhandene Reverse-Proxy muss die beiden HTTPS-Origins getrennt an die nur
auf Loopback veröffentlichten Ports 4310 und 4311 weiterreichen. Kein Docker-
Socket, keine Projekt-Ordner und keine Codex-Zugangsdaten werden in den
Studio-Server eingebunden. Auf einem kleinen VPS wird SQLite für zwei Benutzer
verwendet; vor einer späteren größeren Installation muss die Datenhaltung
erneut bewertet werden.

## Tests und Backups

```text
npm run studio:test
node selfhost/backup.mjs /absolutes/backup-ziel/studio.sqlite
```

Die Tests erzeugen ausschließlich temporäre Konten, Datenbanken und lokale
Git-Repositories. Sie prüfen Geräteisolation, einmalige Einladungen,
Auftragsübernahme, Dokumentkonflikte, echte Git-Zusammenführung und das Stoppen
bei Konflikten sowie getrennte statische Vorschauen.

SQLite-Snapshots außerhalb des VPS sichern. Zur Wiederherstellung Server
stoppen, die bestehende Datenbank einschließlich WAL/SHM als zusammengehörigen
Stand sichern und den Snapshot an deren Stelle einsetzen; anschließend
Anmeldung und Projektzustand prüfen. Das ist eine dokumentierte Vorgehensweise,
kein bereits auf eurem VPS durchgeführter Restore.

## Noch nicht im eigenen Einsatz nachgewiesen

Zwei reale Business-Konten, standortübergreifende Nutzung aus Thailand und der
Schweiz, Linux-Containerbetrieb und die Einbindung in euren VPS. Diese Schritte benötigen eure eigene Anmeldung beziehungsweise den
konkret ausgewählten Server. Eine vollständig konfliktfreie Zusammenarbeit
wird nicht behauptet.


## Laufende Aufträge und Fortsetzen

Im Entwicklungsverlauf öffnet ein Auftrag sein laufendes Protokoll. Die Übersicht
überträgt nur kompakte Metadaten; vollständige Ergebnisse werden beim Öffnen
des Auftrags geladen. Protokollabfragen übertragen nur neu hinzugekommene
Einträge und enden nach Abschluss. Ohne aktive Aufträge aktualisiert die
Übersicht alle 15 Sekunden, während aktiver Aufträge alle vier Sekunden.
Verborgene Browseransichten pausieren ihre Abfragen. Der Runner
übermittelt ausgewählte Codex-Meldungen, Befehle und Dateiänderungen etwa jede
Sekunde; die geöffnete Oberfläche fragt alle zwei Sekunden nach. Beide Mitglieder
können den Verlauf lesen. Nur der Auftraggeber darf seine Aufträge stoppen oder
Folgeaufträge an seinen eigenen PC senden. ChatGPT-Zugangsdaten und die lokale
Codex-Sitzungskennung werden nicht zum Studio übertragen.

Wartende Aufträge können sofort abgebrochen werden. Laufende Codex-Aufträge und
Tests wechseln zunächst zu „Wird gestoppt“. Der Runner beendet seinen gestarteten
Prozess samt Unterprozessen und bestätigt anschließend den Abbruch. Git-Schritte
wie Einreichen und Zusammenführen werden während der Ausführung nicht unterbrochen.
Ein Stopp setzt bereits geschriebene Dateien nicht zurück. Danach zuerst Änderungen
prüfen. Bei Verbindungsverlust stoppt der Runner nach drei fehlgeschlagenen
Statusübertragungen; ein unterbrochener Auftrag wird nicht automatisch wiederholt.

Für jede Arbeitskopie wird die Codex-Sitzung lokal im Runner-Zustandsverzeichnis
gespeichert. Ein Folgeauftrag verwendet genau diese Sitzung, niemals `--last`.
Das funktioniert auch nach einem Runner-Neustart, solange Arbeitskopie,
Zustandsverzeichnis und die Codex-Sitzungsdateien auf diesem PC erhalten sind.
Im Ergebnisdialog lässt sich eine Antwort auf eine Rückfrage als Folgeauftrag
senden. Interaktive Rückfragen und Freigaben mitten im laufenden Auftrag sind
noch nicht umgesetzt; es gilt weiterhin `approval_policy="never"` mit
`workspace-write`.

Die Protokolle sind begrenzt auf die letzten 200 Einträge je Auftrag und insgesamt
4000 Einträge mit höchstens 4000 Zeichen pro Eintrag. Alte Einträge werden gelöscht;
das ist kein dauerhaftes Auditarchiv. Befehlsausgaben und KI-Antworten sind für das
Team sichtbar: Keine Geheimnisse in Entwicklungsaufträge oder Ausgaben schreiben.

Lokal nachgewiesen: ein echter Codex-Auftrag mit bestehender ChatGPT-Anmeldung,
Git-Prüfung und Zusammenführung in einem isolierten Testrepository sowie ein
echter Folgeauftrag mit erhaltenem Gesprächskontext. Automatische Tests prüfen
zusätzlich Geräteberechtigungen, Abbruchbestätigung, idempotente Protokollübertragung
und das Stoppen eines Prozesses samt Unterprozess. Dies ersetzt noch keinen
Zwei-Personen-Test über das Internet. Die Abolimits bleiben bestehen.


## Repository mit Pull-Request-Pflicht (z. B. NetzKontor)

Ein lokales Projektprofil kann vor dem Verbinden als JSON-Datei geladen werden.
Es bleibt im Browser; nur der Gerätename wird bei der Registrierung übertragen.
Die heruntergeladene private Runner-Konfiguration übernimmt die lokal geprüften
Repository-/Werkzeugpfade und das eigene Gerätetoken. Profile sind pro PC zu
konfigurieren; Windows-Pfade von Marco sind auf Markus' PC anzupassen.

Für `Spezzo-sudo/NetzKontor` gelten zusätzliche lokale Einstellungen:

```json
{"workflow":"pull-request","requireIssue":true,"publish":false}
```

Neue Arbeitskopien benötigen dann eine GitHub-Issue-Nummer und verwenden
`codex/<issue>-studio-<id>`. Der Runner blockiert jede direkte Integration,
auch bei einem manuell formulierten Serverauftrag. Bei `publish:false` ist auch
das Einreichen/Pushen gesperrt. Erst nach geklärtem Task/Review-/CI-Ablauf darf
der Besitzer dieses PCs die lokale Veröffentlichung bewusst freischalten.
Ein späterer Push ersetzt keine PR, unabhängige CI oder Review. Das Studio
führt keine Production-Promotion durch.

`selfhost/schmaqq-verify.mjs` ruft den vorhandenen `./schmaqq verify`-Vertrag
auf. Auf Windows kann es Git Bash und einen absoluten Python-Pfad verwenden,
setzt Python auf UTF-8 und hält Hilfsdateien/Evidence außerhalb des Quellcodes.
Ein sichtbarer Python-/Testfehler bleibt ein Fehler, auch wenn ein bestehendes
Shellskript später PASS ausgibt. Die Marketing-Prüfung ersetzt keine Portal-,
DB-, Billing-, Full- oder Browser-Verifikation. Für solche Aufgaben ist im
lokalen Profil der passende Prüfmodus zu konfigurieren.


## Gegenseitige Codeprüfung

**Zur Teamprüfung** erzeugt in der eigenen Arbeitskopie einen lokalen Commit
(inklusive neuer, nicht ignorierter Dateien), führt den konfigurierten
Prüfbefehl aus und speichert Commit, gemeinsame Basis, Diff und Testergebnis
im Studio. Es veröffentlicht keinen Git-Branch. Auch mit `publish:false` ist
diese lokale Teamprüfung möglich. Bereits erstellte Commits bleiben bei
fehlgeschlagenen Tests lokal erhalten; sie werden nicht still zurückgesetzt.

Im Prüfauftrag zeigt das Studio hinzugefügte/entfernte Zeilen mit Zeilennummern.
Beide Mitglieder dürfen kommentieren. Nur ein anderes Mitglied darf freigeben
oder Änderungen verlangen. Rückmeldungen bleiben dauerhaft dem jeweiligen
Prüfauftrag und exakten Commit zugeordnet. Die letzte Entscheidung einer Person
ersetzt ihre frühere Entscheidung; ein Kommentar ersetzt keine Entscheidung.
Eine offene Änderungsanforderung blockiert die Freigabe. Abgeschnittene Diffs
(ab 50.000 Zeichen) dürfen nicht im Studio freigegeben werden.

Freigaben werden nicht auf andere Prüfaufträge übertragen – auch nicht beim
späteren Veröffentlichen desselben Commits. Ein neuer Stand ist zunächst wieder
ungeprüft. Im generischen direkten Integrationsmodus muss genau der veröffentlichte
Auftrag durch die zweite Person freigegeben sein. Das wird beim Anfordern und
nochmals beim Abholen des Integrationsauftrags geprüft. Eine vorher zurückgenommene
Freigabe stoppt den wartenden Integrationsauftrag. Bereits gestartete Integration
wird dadurch nicht rückgängig gemacht.

Für NetzKontor bleibt direkte Integration lokal gesperrt: Studio-Freigabe ersetzt
weder GitHub-PR/Review noch unabhängige CI oder ein Production-Go. Das Beispielprofil
blockiert auch Veröffentlichungen weiterhin. Der konfigurierbare Testbefehl muss
jeweils zur betroffenen Surface passen; eine Marketing-Prüfung ist kein Gate für
Portal-, Zahlungs- oder Datenbankänderungen.

Nachgewiesen ist ein automatisierter Ablauf mit zwei getrennten Testkonten über
HTTP und echten temporären Git-Repositories: lokaler Prüfstand, neue Dateien,
Rückfragen, Änderung und erneute Prüfung, Freigabe, Veröffentlichung und
Zusammenführung. Einschließlich negativer Tests für Selbstfreigabe, falschen
Commit, doppelte Rückmeldung, zurückgenommene Freigabe und zu großen Diff.
Das ist noch kein gemeinsamer Live-Test mit Markus über das Internet.


### Dateien in der eigenen Arbeitskopie bearbeiten

Unter Entwicklung nach Auswahl einer vorbereiteten Arbeitskopie die Dateiliste laden. Der lokale Runner öffnet bestehende Git-Dateien und speichert UTF-8-Text bis 24 KB. Nicht erfasste Dateien, bekannte Geheimnisdateien, Binärdateien sowie symbolische und harte Verknüpfungen sind gesperrt. Neue Dateien weiterhin mit Codex erstellen. Dateiinhalte werden als Auftragsergebnisse im Studio gespeichert; nur der Auftragseigentümer kann diese Ergebnisse abrufen. Die Filter erkennen Dateinamen, nicht beliebige in Quellcode eingebettete Geheimnisse.

Speichern vergleicht einen SHA-256-Dateistand. Bei zwischenzeitlichen Änderungen bleibt der Entwurf im Editor erhalten. Über „Aktuellen Stand vergleichen“ können Änderungen abgeglichen und der Vergleichsstand ausdrücklich als neue Basis übernommen werden. Runner-Aufträge laufen seriell; beliebige gleichzeitig schreibende externe Programme können damit nicht vollständig verriegelt werden. Vor Wechsel der Arbeitskopie oder Verlassen des Entwicklungsbereichs Entwürfe speichern oder herunterladen. Dies ist ein kleiner Texteditor, kein gleichzeitiger Mehrpersonen-Editor derselben Datei. Zusammenarbeit erfolgt über getrennte Arbeitskopien und Teamprüfung.

Validierung: Dateikonflikte, UTF-8/BOM/CRLF, Größen-/Pfadgrenzen und Hardlinks sowie Dateiaufträge mit zwei Testkonten und echten lokalen Git-Arbeitskopien automatisiert geprüft. Ein echter gemeinsamer Online-Test und die visuelle Browserprüfung stehen noch aus.


## Dauerhafte Arbeitsbereiche und Aufgaben

Die Teamübersicht zeigt vorbereitete Arbeitskopien unabhängig von der begrenzten Auftragshistorie. Name, geplante Datei/Ordner, Issue und optionale Aufgabe bleiben in SQLite erhalten. Eine neue Arbeitskopie reserviert ihre angegebenen Bereiche sofort; gleiche Issues, gleiche Aufgaben sowie überlappende Pfade innerhalb desselben Studio-Projekts werden atomar abgewiesen. Das ist eine Koordinationsregel für deklarierte Bereiche, kein Dateisandbox und keine vollständige Erkennung semantischer Codekonflikte. Verschiedene Studio-Projekte, die auf dasselbe Repository zeigen, werden noch nicht gemeinsam verglichen.

Nur der Eigentümer kann einen Arbeitsbereich bearbeiten oder abschließen. Laufende Aufträge blockieren das Abschließen. Eine Versionsnummer schützt vor veralteten Browseränderungen. Abschließen gibt die Reservierung frei und sperrt neue Aufträge in dieser Kopie; es löscht keine Dateien, Commits oder Branches. Wiederöffnen prüft die Reservierung erneut. Fehlgeschlagene/abgebrochene Erstellungsaufträge halten keine Reservierung; unterbrochene Aufträge bleiben bis zur bewussten Klärung sichtbar.

## VPS-Paket ohne Build auf dem Server

Nach `npm run studio:build` erzeugt `npm run studio:release` ein eigenes datiertes Verzeichnis und tar.gz unter `.studio/releases`. Es enthält nur die gebaute Oberfläche, benötigte Servermodule, Zod und Einrichtungsvorlagen. Keine persönlichen Konten, Gerätetokens, lokalen Profile, Git-Repositories oder vorhandenen Datenbanken werden kopiert. Anleitung und lesender Vorabcheck liegen unter `selfhost/deploy`.

`STUDIO_DATA_DIR` legt das dauerhafte Serverdatenverzeichnis fest, unabhängig vom Programmrelease. Die damalige R4-Planung ist historisch: R23 wurde am 19.10.2026 auf dem VPS ausgerollt und mit separat geschützten Hermes-Nachweisen geprüft. Für einen späteren VPS-Umzug gelten die dokumentierten Release- und Disaster-Recovery-Gates. Keine automatische Freigabe.


## Lokaler Zwei-Personen-Probelauf ohne VPS

`npm run studio:demo` richtet unter `.studio/local-demo` ein isoliertes Beispiel-Git-Repository, zwei Testkonten, zwei lokale Runner und getrennte Arbeitskopien ein und startet Studio auf Port 4320 sowie Vorschauen auf 4321. Testanmeldungen und eine Schritt-für-Schritt-Anleitung stehen ausschließlich in `.studio/local-demo/LOKAL-TESTEN.md`. Ein Neustart verwendet vorhandene Testdaten weiter. Die Demo verwendet einen eigenen Sitzungscookie, damit sie den persönlichen Workspace auf 4310 nicht abmeldet.

Die beiden Rollen in getrennten Browserprofilen testen oder dazwischen abmelden. Normale Tabs teilen denselben Login. Dateibearbeitung, Tests, Vorschauen und Reviews laufen tatsächlich; Codex-Aufrufe sind in dieser Demo deaktiviert. Alle Git-Remotes zeigen auf das lokale Beispiel-Repository. Dieser Probelauf ist kein Fernzugang aus Thailand. Für den späteren gemeinsamen Betrieb werden echte Konten, persönliche Runner und ein erreichbarer Studio-Server eingerichtet.

`node selfhost/demo-smoke.mjs` prüft den laufenden lokalen Probelauf durch eine echte Beispieländerung, Tests, Vorschau und Freigabe durch die zweite Testrolle. Es verändert ausschließlich Demo-Daten. Das Ergebnis wird unter `.studio/local-demo/verified.json` protokolliert.


## Bedienung und Entwürfe

Die selbst betriebene Oberfläche startet in der gemeinsamen Projektübersicht. Dort Projekt wählen, eine Aufgabe übernehmen und Kommentare direkt am Thema festhalten. „Weiterarbeiten“ öffnet die passende eigene Arbeitskopie oder bereitet das Formular für eine neue vor. Aufgaben-Prüfstände lassen sich direkt von dort öffnen; nur eine andere Person kann die Codefreigabe erteilen. Projekt und Ansicht bleiben beim Neuladen über die URL erhalten. Der eigene verbundene PC und eine vorhandene eigene Arbeitskopie werden vorausgewählt. Ein neuer Arbeitsbereich erscheint nach erfolgreicher Erstellung automatisch im Editor. Neue Arbeitsbereiche und technische Protokolle sind bei Bedarf aufklappbar; Tests, Änderungen und Vorschau öffnen ihr Ergebnis unmittelbar. Die lokale Demo ist auf Anmeldung und Arbeitsfläche ausdrücklich markiert.

Ungespeicherte Editor-Entwürfe bleiben pro Benutzer, Gerät, Projekt und Arbeitskopie im Arbeitsspeicher des Browser-Tabs erhalten, auch beim Wechsel zu Aufgaben oder Team-Chat. Sie werden nicht im Browser-Dauerspeicher abgelegt. Vor Neuladen/Schließen warnt der Browser; Abmelden verlangt bei offenen Entwürfen eine ausdrückliche Bestätigung. Nach Schließen des Tabs sind diese Entwürfe weg, daher zuerst speichern oder herunterladen. Speicherrevisionen werden auch bei wiederhergestellten Entwürfen unverändert geprüft.

Die UI-Änderungen sind gebaut und typgeprüft; ein visueller Browser-Abnahmetest steht noch aus.


## KI-Anbieter und freigegebene lokale Modelle

Unter **Verbindungen** zeigt Studio den vom eigenen Runner gemeldeten Codex-Anmeldestatus und die ausdrücklich freigegebenen lokalen Ollama-Modelle. Der Runner prüft den Codex-Status nur, wenn Codex für ein lokales Projekt bereits aktiviert wurde. OAuth-Tokens, API-Keys und Auth-Caches werden weder gelesen noch zum Studio übertragen. Persönliche Codex-Konten bleiben nicht teilbar; Codex-Aufträge dürfen weiterhin nur auf dem eigenen Gerät ausgeführt werden.

Für ChatGPT unterstützt die bestehende Codex-Integration `codex login` sowie `codex login --device-auth`; Studio besitzt jetzt einen separaten OIDC-Login für registrierte ChatGPT-Website-Clients (Aktivierung unten). Ein eigener Provider-Device-Code-Flow für Modellnutzung ist nicht implementiert. Offizielle Quellen, geprüft am 17.10.2026:
- https://learn.chatgpt.com/docs/auth
- https://developers.openai.com/siwc/token-sharing-open-source
- https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server

Die aktuelle OpenAI-Dokumentation beschreibt auch ChatGPT-Plan-Nutzung für geeignete Open-Source/lokal gehostete Apps über OAuth. Vor Implementierung des eigenen Studio-Flows müssen Einsatzform, Registrierung, Scopes, Tokenprüfung und Limits dafür geprüft werden. Ein Identitäts-Login allein gewährt noch keine beliebige Modellnutzung. Für andere Anbieter sind eigenständige, offiziell unterstützte Adapter erforderlich; es wird kein allgemeiner Abo-zu-API-Zugang behauptet.

### Ollama auf einem Team-PC

Zusätzlich zu server/token/stateDir im privaten lokalen Runnerprofil:

```json
{
  "ai": {
    "projects": ["website"],
    "ollama": {
      "enabled": true,
      "baseURL": "http://127.0.0.1:11434",
      "models": ["EXAKTER_INSTALLIERTER_MODELLNAME"],
      "allowTeam": false,
      "maxOutputTokens": 1024,
      "timeoutMs": 120000
    }
  }
}
```

Keine Modelle werden heruntergeladen; Modellname und Projektfreigabe müssen lokal gesetzt werden. Es sind nur numerische Loopback-Adressen zugelassen, keine öffentlichen Endpunkte oder Redirects. Modelle mit Cloud-Markierungen/Remote-Metadaten werden aus der Liste ausgeschlossen. Für einen ausschließlich lokalen Betrieb muss auch Ollama selbst entsprechend konfiguriert sein. Der Adapter arbeitet mit `/api/tags` und `/api/chat` (https://docs.ollama.com/api/chat, https://docs.ollama.com/api/tags).

Team-Nutzung benötigt **beides**: allowTeam=true im Profil des Rechnerbesitzers und dessen ausdrückliche Freigabe einzelner bestehender Studio-Mitglieder. Jede Anfrage prüft den Zugriff beim Einreihen und beim Runner-Start erneut. Widerruf entfernt wartende Anfragen und fordert bei laufenden Aufträgen einen Abbruch an; Bestätigung folgt mit dem nächsten Runner-Heartbeat. Rechnerbesitzer und Absender dürfen stoppen und Anfrage/Antwort sehen, andere Mitglieder nicht. Für private Inhalte ist der freigegebene Rechnerbesitzer folglich eine Vertrauenspartei.

Anfragen enthalten ausschließlich den eingegebenen Text, keine automatisch angehängten Dateien und keine Tools oder Terminalrechte. Ein Auftrag pro Runner gleichzeitig; maximal drei wartende/laufende Aufträge insgesamt, höchstens 180 Sekunden und 4096 Ausgabetokens pro KI-Auftrag, maximal 24.000 Zeichen im gespeicherten Antworttext. Der Modell-Dienst erhält keep_alive=0. Das ist gemeinsame Inferenz auf einem ausgewählten PC, kein GPU-Cluster, kein verteiltes Training und keine Garantie für sofortige VRAM-Freigabe oder Performance. Bei Runner-Verbindungsverlust werden Aufträge weiterhin nicht automatisch erneut ausgeführt.

Automatisierte Prüfung mit einem expliziten lokalen Protokoll-Testdienst: drei Konten, Zugriffsschranken, Anfragesichtbarkeit, Team-Widerruf vor/während Ausführung, Modell-/Projektfreigabe, Abbruchsignal und Warteschlangenlimit. Dieser Test bestätigt die Integration, nicht die Qualität oder Geschwindigkeit eines echten lokalen LLM. Auf diesem PC wurde Ollama bislang nicht über PATH gefunden; kein echtes Modell wurde installiert oder gestartet.


## Mit ChatGPT im Studio anmelden

Implementiert: Authorization Code + PKCE, Browserbindung, Nonce, einmalige Rückleitung,
Signaturprüfung gegen Anbieter-JWKS sowie Prüfung von Issuer, Audience und Ablaufzeit.
Studio speichert die Identitätszuordnung, keine Anbieter-Access-/Refresh-Tokens.
Die Rechte im Team stammen weiterhin aus Studio, nicht aus Anbieter-Claims.

**Aktivierungsgrenze:** Der echte Website-Login benötigt einen von OpenAI registrierten
Client. Laut offizieller Dokumentation ist dieser Zugang derzeit eingeschränkt verfügbar.
Ein Codex-Client oder dessen Tokens dürfen nicht als Website-Client eingesetzt werden.
Ohne Konfiguration zeigt die Oberfläche den fehlenden Schritt an; Passwortzugang bleibt nutzbar.
Die isolierte lokale Demo aktiviert grundsätzlich keine echten Anbieter-Logins.

1. Den offiziellen Zugang unter https://developers.openai.com/siwc/request-client-id beantragen.
2. Exakt die eigene Rückleitungsadresse registrieren: lokal
   `http://127.0.0.1:4310/api/auth/provider/callback`, später
   `https://DEINE-STUDIO-DOMAIN/api/auth/provider/callback`. Die Adresse muss zum
   `STUDIO_ORIGIN` passen. Ein Produktionszugang benötigt HTTPS.
3. In der privaten Server-Umgebung `STUDIO_CHATGPT_CLIENT_ID` setzen. Die registrierte
   Token-Authentifizierung über `STUDIO_CHATGPT_AUTH_METHOD` festlegen:
   `none`, `client_secret_post` oder `client_secret_basic`.
   Bei den beiden letzten Methoden auch `STUDIO_CHATGPT_CLIENT_SECRET` setzen.
   Geheimnisse niemals ins Repository oder in Browser-Code schreiben. Server neu starten.
4. Bestehende Mitglieder melden sich zuerst mit ihrem Studio-Passwort an und wählen
   **Verbindungen → Deine Anmeldung im Studio → ChatGPT-Konto verbinden**.
   Danach funktioniert **Mit ChatGPT anmelden** auf der Startseite.
5. Neue Mitglieder öffnen ihre persönliche Einladung und melden sich dort mit ChatGPT an.
   Ihre beim Anbieter bestätigte E-Mail muss zur Einladung passen. Ohne Einladung oder
   einmaligen Einrichtungslink entsteht kein neues Mitglied. Gleiche E-Mail-Adressen
   verknüpfen bestehende Konten niemals automatisch.

Der erste Eigentümer kann auch über den Einrichtungslink mit ChatGPT angelegt werden.
Für einen unabhängigen Wiederzugang empfehlen wir, das Eigentümerkonto zunächst mit
Studio-Passwort anzulegen und anschließend zu verknüpfen. Provider-only-Konten haben
kein Studio-Passwort; ein selbst bedienbarer Wiederherstellungs-/Trennungsablauf fehlt noch.
Weitere Anbieter sind noch nicht integriert und benötigen ihren eigenen offiziellen Adapter.

Diese Anmeldung gewährt keine Modellnutzung und überträgt kein Abo-Kontingent.
Codex nutzt weiterhin den persönlichen Login auf dem Ausführungs-PC. Lokale Modelle
werden separat vom Rechnerbesitzer freigegeben.

Validierung: `node --test selfhost/oidc.test.mjs` verwendet einen lokalen Testanbieter
mit echten RSA-signierten ID-Tokens. Geprüft werden Einladung, Login, bewusste
Verknüpfung, E-Mail-Verifikation, Logout während der Verknüpfung, PKCE, Browserbindung,
Wiederholungen, falsche Nonce/Audience/Issuer, abgelaufene Tokens und Origin-Prüfung.
Ein Live-Login bei OpenAI ist ohne registrierten Client noch nicht nachgewiesen.
Referenz: https://developers.openai.com/siwc/website


## Persönliche Dienste unter „Verbindungen“

Der neue Bereich zeigt GitHub, ChatGPT/Codex, Claude und Copilot mit ihrem
jeweiligen tatsächlichen Integrationsstand. Eine erkannte Codex-Anmeldung wird
nur aus der vorhandenen eigenen Runner-Telemetrie angezeigt. Claude und Copilot
sind noch nicht als ausführbare Studio-Adapter integriert. Lokale Ollama-Freigaben
bleiben unterhalb dieser Übersicht erreichbar.

GitHub-Kontoverknüpfung (kein Repository-Zugriff und kein Copilot-Adapter):

1. Der Betreiber registriert eine eigene GitHub OAuth App mit der exakten
   Callback-URL `<STUDIO_ORIGIN>/api/connections/github/callback`.
2. `STUDIO_GITHUB_CLIENT_ID` und `STUDIO_GITHUB_CLIENT_SECRET` ausschließlich in
   der privaten Serverumgebung konfigurieren. Keine bestehenden fremden Clients
   wiederverwenden. Ein Live-Neustart/Deployment benötigt separate Freigabe.
3. Angemeldete Mitglieder wählen unter Verbindungen „Mit GitHub verbinden“.
   GitHub übernimmt die persönliche Anmeldung. Ohne App-Konfiguration erklärt
   Studio den fehlenden Betreiberschritt; es zeigt keinen funktionslosen Login.
4. Studio prüft die Antwort mit State, PKCE, Browserbindung, ursprünglicher
   gültiger Sitzung und GitHub-Profilabfrage. Gespeichert werden nur stabile
   GitHub-ID, Benutzername, Studio-Mitglied und Bestätigungszeit, keine Anbieter-
   Access-/Refresh-Tokens. Die ID wird nicht still anhand von E-Mail verknüpft.
5. „Verknüpfung entfernen“ entfernt ausschließlich die Zuordnung in Studio und
   beendet offene Versuche. Die App-Autorisierung bei GitHub bleibt bis zum
   dortigen Widerruf bestehen. Git-Anmeldung/Arbeitskopien auf dem PC bleiben
   unabhängig. Die Bestätigung ist kein laufender Repo- oder Berechtigungscheck.

Die lokale Demo deaktiviert echte GitHub-/ChatGPT-Provider unabhängig von ENV.
Automatisierte GitHub-OAuth-Tests verwenden einen ausdrücklich lokalen Testanbieter.
Eine tatsächliche GitHub-Registrierung und persönliche Live-Autorisierung sind
noch nicht erfolgt. Es wurden keine KI-Aufträge ausgeführt.

Offizielle Integrationswege (geprüft 17.10.2026):
- GitHub OAuth: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- Copilot SDK: https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth
- ChatGPT-Plan-Nutzung: https://developers.openai.com/siwc/token-sharing-open-source
- Claude Agent SDK/Plan: https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan

Die letzten drei Links beschreiben Anbieterfähigkeiten, keine implementierten
zusätzlichen Studio-Adapter. Ein direkter ChatGPT-Plan-Flow ist gesondert nach
Einsatzform zu prüfen (lokale/OSS-Apps gegenüber gehosteter Anwendung).


## Parallel am selben Projekt arbeiten

1. Jede Person meldet sich mit eigenem Studio-Konto an und verbindet ihren eigenen
   Rechner. Die gemeinsame Projektübersicht ist der Einstieg.
2. Projekt wählen und konkrete Aufgaben anlegen. „Aufgabe übernehmen“ weist genau
   eine Person zu; bei gleichzeitiger Übernahme erhält die andere eine Meldung.
3. Rückfragen, Brainstorming und Entscheidungen direkt an der jeweiligen Aufgabe
   kommentieren. Kommentare sind für die Mitglieder dieses privaten Studios
   sichtbar und werden dauerhaft in SQLite gespeichert. Entwürfe bleiben nur
   im geöffneten Tab; vor dem Schließen senden. Der Browser warnt vor Verlust.
4. „Weiterarbeiten“ öffnet die eigene verknüpfte Arbeitskopie. Fehlt sie noch,
   werden Aufgabe und Titel vorausgewählt. Geplanten Datei-/Ordnerbereich bewusst
   angeben, damit Überschneidungen vor Beginn auffallen.
5. In getrennten Kopien bearbeiten, speichern, testen und Vorschau prüfen.
   Unterschiedliche verbundene PCs können gleichzeitig Aufträge ausführen;
   auf demselben Runner werden Aufträge weiterhin seriell ausgeführt.
6. „Zur Teamprüfung“ erstellt einen echten geprüften Git-Stand. Die zweite Person
   öffnet ihn über „Prüfstand ansehen“ an der Aufgabe. Rückmeldungen gelten genau
   diesem Stand. Der Aufgabenstatus wird bewusst manuell gepflegt.
7. Anschließende Veröffentlichung/Übernahme richtet sich nach dem Repository-
   Workflow. Eine Studio-Freigabe ist noch kein GitHub-Merge. Arbeitsbereiche
   werden unter Entwicklung bewusst abgeschlossen; das gibt reservierte Bereiche
   frei und bewahrt Dateien/Branches.

Die Reservierung ist eine Abstimmung über angegebene Bereiche, keine Garantie
gegen sämtliche Codekonflikte. Getrennte Kopien sind kein gleichzeitiger Editor
für dieselbe Datei. Ein ausgeschalteter persönlicher PC führt keine Jobs aus.

Das neue Schema ergänzt nur `task_comments` und einen Index; vorhandene Aufgaben,
Dateien und Git-Historien bleiben erhalten. Neues Frontend und Backend müssen
zusammen ausgerollt bzw. lokal zusammen gestartet werden. Alte laufende Server
kennen die neuen Collaboration-Endpunkte nicht. Betreiber führen vor einem
separat freigegebenen Live-Rollout ein konsistentes Backup aus.


## Geführter Projektstart und persönliche Bereitschaft (S2, Kandidat)

Unter Projekte → Neues Projekt werden Ziel und lokaler Einstieg gemeinsam erfasst.
Es gibt zwei Wege: vorhandenen Git-Stammordner mit origin verwenden oder ein neues
lokales Startprojekt mit Startseite, node:test und statischem Build anlegen.
Ein neues Startprojekt hat zunächst nur ein lokales Bare-Remote; es ist dadurch
noch nicht vom Rechner des Kollegen erreichbar. Gemeinsames externes Remote
separat bereitstellen; keine automatische GitHub-Anlage oder Veröffentlichung.

Der heruntergeladene Plan enthält lokale Pfade und gewählte Befehle, aber keine
Runner-/Anbietertokens. Nur eigene bekannte Test-/Buildbefehle verwenden. Der
Plan ändert allein noch keine lokalen Dateien; im aktuellen Quell-/Runnerpaket:

```text
node selfhost/project-setup.mjs --apply PFAD_ZUM_PLAN PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL
```

Der Helfer erhält Zugang und bestehende Projekte, legt eine private Sicherung an,
verweigert eine vorhandene Projektzuordnung und überschreibt keinen Zielordner.
Neue Freigaben setzen allowCodex=false und publish=false. Bestehende Repositorys
werden nur auf Git-Stamm und origin geprüft; keine Tests/Builds beim Einrichten.
Vorschau ist optional als Build-Argumentliste und relativer Ausgabeordner möglich.
Privates Runnerprofil außerhalb der Git-Arbeitskopien und gemeinsamer Ordner halten;
POSIX-Dateien werden mit 0600 angelegt, unter Windows gilt die Ordner-ACL.
Keine Sandbox für fremden Projektcode oder signierter Ein-Klick-Installer.

Danach bisherigen Runner beenden und genau einmal mit ergänztem Profil starten:

```text
node selfhost/runner.mjs PFAD_ZUM_BESTEHENDEN_RUNNERPROFIL
```

Start-Pilot.command/pilot-runner bleiben bewusst auf das einzelne Pilotprojekt
beschränkt und können ein erweitertes Mehrprojektprofil nicht starten. Kein
neues Gerät registrieren. In Studio Git-Verbindung prüfen und eigene Kopie anlegen.
Die Bereitschaft unterscheidet PC-Heartbeat, aktuelle Projektfreigabe, historischen
Git-Lesecheck, persönliche KI und Veröffentlichung. Ein Git-Check beweist keine
Schreibrechte. Alte Runner ohne Projektmeldung bleiben unbestätigt. Die Meldung
ist eine Bedienhilfe; der Runner erzwingt weiterhin seine lokalen Freigaben.
