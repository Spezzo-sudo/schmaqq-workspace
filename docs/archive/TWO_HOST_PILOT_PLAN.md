# Zwei-Host-Pilot: Laptop und Linux-VPS

Stand 22.10.2026. Aktueller Auftrag: den Zwei-Personen-Ablauf mit zwei getrennten
Testkonten auf Laptop und VPS technisch nachspielen. Markus und macOS sind für
diesen technischen Nachweis keine Voraussetzung. Die spätere persönliche
Nutzerabnahme bleibt davon getrennt.

**Abschluss: technisch PASS nach ausdrücklicher Uploadfreigabe.** Der genaue
diagnostische Snapshot wurde auf dem VPS hochgeladen und per Manifest geprüft.
Windows- und Linux-Runner arbeiteten tatsächlich an getrennten Kopien. Alle
Testprozesse/Tunnel sind beendet und die temporären SSH-Schlüssel entfernt.
Dies ist keine Veröffentlichung oder Installation des Kandidaten im Live-Studio.

## Vorbereitetes konkretes Testpaket

Quelle ist der aktuelle uncommittete Arbeitsstand. Es handelt sich um einen
diagnostischen Snapshot mit Datei-Hashes, ausdrücklich um keinen Release.

- Archiv: `.studio/two-host-pilot-20261022/snapshot.zip`, 1.193.169 Bytes.
- SHA256: `f282b77f3518c2f1230133aa26e22713c67c7c2d9ca2d1f3964387f0edf1227c`.
- Inhalt: 44 Runtime-Module aus `selfhost/`, 8 gebaute Frontenddateien,
  596 Dateien des Pakets zod und 80 des Pakets jose. 728 Dateien im Manifest.
- Git-Basis, tatsächlicher Dirty-Status und Einzelhashes stehen im Manifest.
  Dateihashes, Archivpfade und Ausschluss privater Zustandsverzeichnisse geprüft.
- Keine `.studio`-Bestände, Git-Metadaten, ENV-Dateien, persönlichen Runnerprofile,
  Auth-Caches oder Produktionsdaten im Paket. Nur synthetische neue Testkonten.
- Syntax des vorbereiteten Fixture-Servers mit `node --check` geprüft.
  Dieser Check ist keine Laufzeit- oder Zwei-Host-Abnahme.

Ziel ist ausschließlich der neue private Ordner
`/home/dc-remote/schmaqq-two-host-pilot-20261022` auf dem eigenen VPS
`srv1365337` (`187.77.68.24`), unprivilegierter Benutzer `dc-remote`.

## Topologie und Begrenzung

| Bestandteil | Ort und Zweck |
| --- | --- |
| Studio-Testserver | VPS, nur `127.0.0.1:44620`, eigene neue SQLite-Datenbank |
| Vorschau | VPS, nur `127.0.0.1:44621`, getrennte Origin |
| Synthetisches Git-Bare-Repository | VPS, nur lesender HTTP-Zugriff auf `127.0.0.1:44622` |
| Laptop-Testrolle | Eigener Browserkontext und Runner, neue Windows-Kopie im lokalen Testordner |
| Linux-Testrolle | Zweiter Browserkontext und separater Runner mit eigener Linux-Kopie |
| Verbindung | Befristeter SSH-Schlüssel, Hostkey gepinnt, drei Loopback-Portweiterleitungen |

Der SSH-Schlüssel gestattet ausschließlich das Hochladen genau des per SHA256
festgelegten Archivs über einen erzwungenen Uploadprüfer und Weiterleitungen zu
den drei Loopback-Testports. PTY, beliebige Shellbefehle, Agent-/X11-Weiterleitung
und User-RC sind gesperrt. Die akzeptierten Forward-Ziele/Listenadressen sind
auf die drei Testports begrenzt. Ablaufzeit zwei Stunden; Entfernung direkt nach
Testende vorgesehen. Kein globaler SSH-Clientumbau und keine Hostkey-Ausnahme.

VPS-Prozesse laufen manuell mit niedriger Priorität, Node-Heaplimit 192 MiB pro
Node-Prozess und maximal 30 Minuten Laufzeit. Es gibt keine Installation von
Paketen, keinen Autostart, keine neue Domain und keinen Router-/Systemdienstumbau.
Beide Runner erlauben ausschließlich das synthetische Testrepository; KI,
Veröffentlichung und direkte Integration sind gesperrt. Kein externer Git-Push.
Die Trennung ist eine kontrollierte Testtrennung unter demselben unprivilegierten
VPS-Benutzer, keine Sandbox für fremden Code. Nur bekannte synthetische Befehle.

## Geplante Abnahme

1. Zwei getrennte Studio-Sitzungen, Konten und Geräte sichtbar; Ausführungsorte
   Windows und Linux unabhängig nachweisen.
2. Beide übernehmen verschiedene Aufgaben, stellen gegenseitig eine Rückfrage
   und erhalten Kommentare nach erneutem Öffnen.
3. Eigene Arbeitskopien und verschiedene Branches; Dateiänderung A beeinflusst
   Kopie B nicht. Überlappende Reservierung gezielt abweisen.
4. Dateiänderungen über den echten Editor speichern. Tatsächliche Checks auf
   beiden Hosts gleichzeitig nachweisen, jeweils gebaute Vorschau öffnen.
5. Gegenseitige Prüfung exakter Commits. Selbstfreigabe abweisen; weitere Änderung
   und neuer Prüfstand erfordern neue Freigabe. Alte Belege bleiben historisch.
6. Linux-Runner kurz trennen/wiederverbinden; dieselbe Registrierung/Kopie erhalten.
7. Eigene Prozesse beenden, SSH-Zugang entfernen, Produktionsdienststatus mit
   dem Vorabstand vergleichen. Keine vorhandenen Test-/Produktionsbestände löschen.

## Vorbereitung und erste Freigabegrenze (historisch)

Lesender VPS-Preflight selbst ausgeführt: etwa 25,02 GiB frei, etwa 4,5 GiB RAM
verfügbar, Studio-Dienst active/running, NRestarts=0. Vorhandene eigene
Node-Laufzeit v24.22.0. Aktives Release weiterhin R23; die ältere Angabe unter
`STATUS.environments.vps` beschreibt einen historischen P2-Stand und ist kein
aktueller Gegenbeleg. Produktionsdaten/ENV wurden nicht gelesen.

Der neue private Zielordner und die kleinen Test-Hilfsdateien wurden angelegt.
Ein temporärer beschränkter SSH-Zugang wurde vorbereitet, anschließend wieder
vollständig aus `authorized_keys` entfernt. Die zuvor fehlenden SSH-Dateien/-Ordner
wurden dabei wieder entfernt, soweit ausschließlich vom Test erzeugt und leer.

Der Snapshot-Upload wurde von der automatischen Freigabeprüfung vor Ausführung
abgelehnt. Begründung: Die bisherige Nutzerzustimmung benenne den konkreten
internen uncommitteten Code-/Artefakt-Payload und dessen Übertragung auf diesen VPS
nicht ausdrücklich genug. Kein Umweg oder erneuter Uploadversuch erfolgt.

Zum Zeitpunkt dieser ersten Ablehnung waren Upload und Zwei-Host-Test NOT_RUN. Kein Testserver/Runner
dieses Pakets wurde auf dem VPS gestartet; kein Quell-Snapshot übertragen.
Nach der Bereinigung erneut geprüft: Production active/running und NRestarts=0.
Der damalige nächste Schritt war die ausdrückliche Freigabe des oben beschriebenen Payloads,
Ziels und Testumfangs, danach Installation desselben beschränkten temporären Zugangs
und Ausführung des vorbereiteten Tests. Keine weiteren Betriebsrechte ableiten.

Lokaler Paketnachweis: `.studio/two-host-pilot-20261022/prepared-verification.json`.
Die damals erzeugten privaten Schlüssel wurden nach Abschluss entfernt.

## Ausgeführte Zwei-Host-Abnahme

Nach dem ausdrücklichen „ja frei gegeben“ des Owners wurden genau Payload und
Ziel dieses Plans verwendet. Die Freigabe gilt nicht für Production oder andere
Projekte. Snapshot-Hash/728 Einzeldateien wurden beim Upload und nach dem Lauf
erneut erfolgreich geprüft. System-Node und Live-Release blieben unverändert.

Tatsächlich selbst ausgeführt, jeweils mit synthetischen Testdaten:

1. Zwei sichtbare Edge-Browserkontexte, getrennte Konten und persönliche
   Gerätebereitschaft. Studio samt neuer SQLite auf VPS; echte Runner auf Laptop
   und Linux-VPS. Fremder Geräteauftrag wird mit 403 abgewiesen.
2. Verschiedene Aufgaben übernommen. Frage und Antwort bleiben nach Reload
   erhalten. Überlappende Dateireservierung sichtbar mit 409 abgewiesen.
3. Eigene Git-Klone/Branches und tatsächliche Dateispeicherung auf beiden Hosts.
   Der Linux-Dateiinhalt wurde zusätzlich direkt auf dem VPS gelesen. Die
   andere Kopie wurde durch eine Dateispeicherung nicht still verändert.
4. Gleichzeitig laufende echte Checks: Ausgaben enthalten unabhängig
   `HOST=win32` beziehungsweise `HOST=linux` und den jeweiligen Rechnernamen.
   Für die abschließenden aufgabenverknüpften Kopien wurden 4.162 ms Überlappung
   aus serverseitigen Start-/Pass-Ereignissen unabhängig bestätigt.
5. Zwei tatsächlich gebaute Vorschauen über getrennte Origin geöffnet. Jede
   Vorschau entsprach der beim zugehörigen Check gemessenen Dateirevision.
6. Gegenseitige Freigaben für exakte Commits über die normale Oberfläche.
   Selbstfreigabe mit 403 abgewiesen. Weitere Änderung erzeugt neuen Commit und
   neuen offenen Prüfstand; alte Freigabe bleibt historisch. Zweite Rolle gibt
   den neuen Stand gesondert frei.
7. Linux-Runner 50 Sekunden mittels SIGSTOP pausiert, danach SIGCONT. Offline-
   Anzeige geprüft, dieselbe Registrierung/Kopie und gespeicherte Datei nach
   Wiederverbindung bestätigt. Kein neuer Gerätezugang angelegt.
8. Abschließend die komplette Aufgabenverknüpfung kontrolliert: zwei aktive
   Kopien gehören zu den zwei Aufgaben; deren Details zeigen ihre Checks,
   Vorschauen und freigegebenen Prüfstände. Desktop 1440 und Mobil 390 ohne
   horizontalen Seitenüberlauf; keine Browser-Pageerrors.
9. Laptop-Runner gestoppt, Linux-Fixture einschließlich Runner und Git-/Preview-
   Server geordnet beendet. SSH-Tunnel beendet, Schlüssel aus `authorized_keys`
   und lokal entfernt. Alle drei Testports auf beiden Seiten geschlossen.
   Production danach weiterhin R23, active/running, NRestarts=0; gleiches
   Releaseziel wie vor dem Lauf. Produktionsdaten und ENV wurden nicht gelesen.

## Testkorrekturen und praktische Grenzen

Dies war ein fortgesetzter Abnahmelauf, kein unbeaufsichtigter fehlerfreier
Einzellauf. Ein nicht unterstützter Test-Direktlink zur Reviewansicht wurde durch
„Ansehen“ in der normalen Oberfläche ersetzt. Eine erneute Projektauswahl im
Test hatte die vorausgewählte Aufgabe zurückgesetzt. Zwei zunächst unverknüpfte
Fixture-Kopien wurden deshalb bewusst archiviert und erhalten; der normale
Aufgaben-Einstieg wurde mit zwei neuen aufgabenverknüpften Kopien vollständig
bis Tests/Vorschau/Peerfreigabe wiederholt. Die Aufgabe liegt in der
Workspace-Metadatenzeile, nicht im Git-Jobpayload; die Testabfrage wurde korrigiert.
Eine zusätzliche gleichnamige Überschrift in der Änderungszusammenfassung
erforderte am Ende eine präzisere Testabfrage. Keine Produktquellen wurden für
diese Testkorrekturen geändert. Insgesamt bleiben zwei aktive verknüpfte und
zwei archivierte frühe Fixture-Kopien nachvollziehbar erhalten.

Ein Prüfstand erstellt einen Commit und führt eigene Checks aus. Ältere separate
Checks/Dateiabgleiche können danach in der Übersicht historisch oder abweichend
erscheinen; die gemessene Vorschau-/Testgleichheit bezieht sich auf ihren damaligen
Ausführungsstand, nicht auf eine dauerhafte Überwachung.

Die Daten-/Prozesstrennung unter `dc-remote` eignet sich für diesen kontrollierten
synthetischen Test, nicht für untrusted Fremdcode. Beide Browserrollen wurden
vom Agenten bedient; dies ersetzt keine persönliche Benutzerabnahme. Persönliche
KI-Konten, GitHub-Veröffentlichung/PR/Merge, längerer Dauerbetrieb, macOS und ein
Live-Rollout wurden nicht getestet. Es gab 0 Publish-/Integrations-/Modelljobs.
Die zuvor bestandenen lokalen Backend-/Buildchecks wurden nicht pauschal zu einer
erneuten vollständigen Linux-Operatorprüfung erklärt.

## Belege und nächster Schritt

Lokaler Ordner `.studio/two-host-pilot-20261022/`:

- `result.json`: sichtbare Schritte, Ausführungsausgaben, Wiederaufnahmen, Cleanup.
- `independent-evidence-final.json`: unveränderte Snapshotdateien, echte Host-
  Ausgaben, parallele Zeitfenster und Kopien-/Freigabezählungen aus der Test-DB.
- `cleanup-result.json`: geschlossene Ports, entfernter Zugang, Productionstatus.
- `laptop-linked-task-overview.png`, `linux-linked-task-overview.png`,
  `mobile-linked-team.png`, `linux-reviews-laptop.png`, `linux-offline.png`:
  tatsächliche Ansichten der jeweiligen Testschritte.

Private synthetische Profile und Testdaten bleiben außerhalb Git. Die abgeschaltete
VPS-Fixture bleibt ausschließlich im neuen privaten Testordner; kein Autostart.
Wissensbasis-Vorschlag: Der technische Zwei-Host-Ablauf ist mit obigen Grenzen
belegt; Markus/macOS muss die nächste Produktarbeit nicht blockieren. Als Nächstes
persönliche Alltagsabnahme und Konsolidierung/Review eines Nutzungskandidaten aus
dem aktuellen uncommitteten Stand. Die externe Vault-Ablage wurde wegen der
vorhandenen Schreibpfadgrenzen nicht ausgeführt.
