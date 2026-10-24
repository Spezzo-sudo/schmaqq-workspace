# Nachweis der lokalen Live Vorbereitung

24.10.2026. Nutzerauftrag: bedingt funktionierenden Studio-Stand live bereitstellen, ansonsten Hermes-Auftrag vollständig vorbereiten; erster persönlicher Test mit `marco@schmaqq.com`, vor allem am Handy.

## Quellen und Arbeitsstand

Originaler lokaler Nutzungskandidat: Branch `local/studio-navigation-20261024`, HEAD `41d9f30245fa056b52042181eb7ddadedbc7ff8d`, sauber. Dieser jüngere Stand wurde erst in diesem Durchgang festgestellt. Frühere Chatangaben zum 22.10.-Kandidaten sind deshalb keine aktuelle Kandidatenauswahl.

GitHub-Abruf sowohl des neuen SHA als auch des Branches: 404. Der ältere GitHub-Kandidat war lesbar. Der neue Stand ist deshalb als lokaler, sauber committed Kandidat dokumentiert und über ein geprüftes Git-Bundle übergeben. Kein Push oder Merge ausgeführt. Originalcheckout, dessen laufender Testbetrieb und globale Einstellungen wurden erhalten.

Gelesen: aktuelle AGENTS/START_HERE, STATUS/HANDOFF, UX_NAVIGATION_20261024, Deployment-README, Release-Provenienz, relevante H1/H3-Grenzen sowie Auth-, Release- und Prüfquellen. Ein lesender nativer Unterauftrag untersuchte Konto-/Mobile-Wege. Seine Quellenbefunde sind kein eigenständiger Testnachweis.

## Selbst ausgeführt

- Separate Quellkopie aus exaktem lokalem Branch; nur ihre eigenen ignorierten Build-/Testdateien beschrieben.
- Gesamtcheck zunächst in Sandbox unterbrochen, nachdem Windows-Prozessprüfungen nicht weiterliefen. Der eigene Prozessbaum wurde anhand seines eindeutigen Befehls identifiziert und gezielt beendet. Anschließend Prüfung mit lokalen Prozessrechten wiederholt; Git-Vertrauen ausschließlich pro Prozess, keine globale Änderung.
- Finaler Gesamtcheck: 172 Tests, 151 PASS, 0 FAIL, 21 explizite Linux-Skips. Source Guard, TypeScript, Frontend-Build PASS. Exit 0 für `--local`; keine Behauptung eines vollständigen Linux-Checks.
- Release neu aus sauberem Commit gebaut. Unabhängig entpacktes Archiv: 716 Manifestdateien, Quellherkunft und Archivinhalt PASS. Hashes in candidate.json/SHA256SUMS.
- Runtime-Smoke erster Versuch korrekt an nicht privatem Windows-Test-Tempordner gescheitert. Neues eigenes privates Test-Temp angelegt, keine Rechte an bestehenden Daten gelockert. Wiederholung: Auth, Assets, Aufgabe/Kommentar und konsistentes Backup PASS.
- Synthetischer mobiler Erstzugang in entpackter Runtime: Kontoanlage im Browser, Menü/Aufgaben, gespeicherte Testaufgabe, 390/360 ohne Seitenüberlauf, Route/Session nach Reload sowie Abmeldung und erneute UI-Anmeldung PASS. Erster Versuch scheiterte an fehlendem JSON-Header im Abmeldeaufruf des Prüfwerkzeugs; kompletter Wiederholungslauf nach Werkzeugkorrektur PASS. Keine Produktdatei dafür geändert.
- Öffentliche Website nur unangemeldet gelesen: Seite/healthz 200, Session 401; Loginformular 390/360 vorhanden, keine JS-Seitenfehler oder horizontaler Überlauf. Erste Browsernavigation mit Netzwerkruhe-Warten lief in Timeout; tatsächliche DOM-/Formularprüfung danach erfolgreich. Der erste eingeschränkte Netzwerkabruf wurde vom lokalen Sandboxzugang blockiert, erlaubter lesender Abruf außerhalb bestätigte 200.
- Mobile Aufgabenansicht als gerendertes Bild betrachtet. Mobile Loginposition auf der bestehenden öffentlichen Seite gemessen: Formulartop ca. 942px bei390 und1192px bei360. Kein direkter Produktionspatch vorgenommen.

## Grenzen und Aufräumen

Alle selbst gestarteten Smoke-/Mobile-Testserver und deren Browser wurden beendet. Testdaten sind rein synthetisch und bleiben außerhalb des expliziten Übergabe-ZIPs. Nicht den gesamten Arbeitsordner weitergeben. Die vorhandenen fremden Studio-/Runnerprozesse wurden nicht beendet. Es fand keine serverseitige Änderung, kein tatsächlicher Login mit Marco, keine Kontoanlage auf Production, kein Upload und kein Versand an Hermes statt.

Offen: Kandidaten-Linuxprüfung, frisches Live-Backup/Restore, tatsächlicher Quell-/Schemavergleich am Server, Kontozugang und persönliche mobile Abnahme. Die 30 Designansichten sind Entwurf und nicht als neue Anwendung implementiert. Beim späteren Livebericht beide Stände auseinanderhalten.

## Vorschlag für die Arbeitsbasis

Datum 24.10.2026. Belegte neue Erkenntnis: lokaler sauberer Navigationskandidat `41d9f30245fa056b52042181eb7ddadedbc7ff8d` vorhanden, auf GitHub nicht abrufbar; portables Quellbundle und manifestgeprüftes Runtimearchiv vorbereitet. Selbst ausgeführte Nachweise und Grenzen stehen oben, gelesene historische Prüfberichte sind davon getrennt. Aktuelle Website öffentlich erreichbar, echtes Marco-Konto unbekannt. Nächster Schritt: Hermes führt den beigefügten konkreten Preflight-/Konto-/Releaseauftrag aus und berichtet vor dem persönlichen Handytest den tatsächlichen Stand. Wegen fehlender Schreibrechte im externen Vault liegt dieser Vorschlag hier, nicht in `vault/05_Eingang/`.
