# Hermes — vorbereiteter Betriebsauftrag

Dieser Text wurde vorbereitet, aber nicht an Hermes gesendet und nicht ausgeführt.
Er erteilt keine Freigabe zur Production-Änderung.

## Erster Schritt: nur Preflight

Für SCHMAQQ Studio den vorhandenen Hostinger-VPS prüfen. Keine Secrets oder
vollständigen ENV-/Compose-Dateien ausgeben. Benötigt werden:

- freier/gesamter Speicher und Inodes, RAM/Swap, CPU, OS/Architektur;
- Node-/Docker-Verfügbarkeit, belegte Ports, bestehender Reverse Proxy;
- geeigneter isolierter Installations- und Datenpfad, ohne Production-Workdirs;
- bestehende Backup-/Restore-Möglichkeiten und maximaler Zusatzbedarf;
- Vorschlag für eigene Studio-Origin und gesonderte Preview-Origin.

Anschließend nur sanitizierte Ergebnisse und konkreten Installationsplan melden.
Die berichteten etwa 10 GB freien Speicher sind eine ältere Nutzeraussage, kein
aktueller Messwert. Keine Modelle oder großen Container ungefragt installieren.

## Nach separater Freigabe: isolierter Betrieb

Den akzeptierten Studio-Commit als leichtes Release auf den VPS übertragen.
Runtime-Anleitung: `selfhost/deploy/README.md`; Release baut `selfhost/release.mjs`.
Ein eigener unprivilegierter Dienst, eigene persistente Datenbank, eigene TLS-Origin
und separate Preview-Origin. Kein Zugriff auf Production-DB, Docker-Socket oder
Root über das Studio. Backup vor Änderungen und Rückweg für den neuen Dienst.

Der Erstbesitzer richtet sein Konto über den privat erzeugten Setup-Link ein.
Einladungen und Geräte-/OAuth-Geheimnisse nicht in Chat oder GitHub ausgeben.
Echte OpenAI-Website-Anmeldung erst nach gültiger Client-Registrierung aktivieren.
Kein automatisches Kopieren persönlicher Codex-Auth-Caches auf den Server.

Wenn Arbeit ohne Heim-PC gewünscht ist, braucht auch die Ausführung einen
weiter laufenden Host: z.B. eine getrennte Entwicklungsumgebung auf dem VPS
oder eine echte Cloud-Aufgabe mit eigenem Checkout. Das Studio allein führt
keine Jobs eines ausgeschalteten PCs aus. Hermes und Studio sind unterschiedliche
Rollen; Hermes bleibt der privilegierte Betreiber.

## Abnahme

Zwei echte Personen melden sich von getrennten Geräten an; eigene Konten, eigene
Arbeitskopien, Datei speichern, Tests, getrennte Vorschau, gegenseitiges Review.
Zusätzlich Dienstneustart/Persistenz, HTTPS, Backup und isolierte Wiederherstellung.
Ein Test nach Ausschalten des Heim-PCs muss unterscheiden: Webzugang erreichbar,
Cloud/VPS-Ausführung möglich, Heim-PC-Runner korrekt offline.
