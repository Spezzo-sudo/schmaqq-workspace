# Gemeinsame Projektarbeit im Studio

Studio verbindet Projektgespräch, Aufgaben, Wissen und prüfbare Ergebnisse. Die aktuelle Oberfläche beginnt bei **Meine Arbeit** und führt von dort zum gemeinsamen Projekt. Sie ist ein lokaler Entwicklungskandidat; eine Freigabe für den laufenden Server ist davon getrennt.

## Navigation und tägliche Arbeit

- **Meine Arbeit:** eigene offene Aufgaben, erforderliche Prüfungen und gelesene beziehungsweise neue Teamhinweise.
- **Projektübersicht:** Ziel, nächste Aufgaben und ein zuordenbarer Aktivitätsverlauf.
- **Gespräch:** projektweite Diskussion; Nachrichten können als Aufgaben oder Entscheidungen übernommen werden.
- **Aufgaben:** Verantwortlichkeit, Abschlussbedingungen und die vier Arbeitszustände; Filter für eigene und blockierte Aufgaben.
- **Wissen:** gültige Entscheidungen und Notizen, frühere Fassungen und wiederherstellbares Archiv.
- **Ergebnisse:** feste allgemeine Ergebnisfassungen beziehungsweise Code-Prüfstände und ihr Abschluss.
- **Einstellungen:** gemeinsames Repository, Zielbranch und Übernahmeregel sowie der persönliche Rechnerzugang.

Eine Aufgabe enthält Gespräch, Bearbeitung und Ergebnisprüfung. Zusammenarbeit, eigene Bearbeitung und KI sind kombinierbar. Codebearbeitung kann in einer breiten Ansicht erfolgen. Allgemeine Aufgaben benötigen weder Git noch einen Runner.

## Abschlussregeln

Allgemeine Aufgaben werden über ein dokumentiertes Ergebnis abgeschlossen. Eine ausdrücklich verlangte unabhängige Prüfung gilt genau einer Ergebnisfassung. Neue Fassungen und geänderte Abschlussbedingungen benötigen eine neue Abnahme. Abbruch und Wiedereröffnung sind ausdrücklich sichtbare Aktionen.

Codeaufgaben benötigen einen erfolgreichen Prüfstand, einen geteilten Branch, unabhängige Freigabe und bestätigte Zusammenführung. Eine bloße Statusänderung kann diese Bedingungen auch über die frühere API nicht umgehen. Eine Wiedereröffnung verlangt einen neuen Stand für die aktuelle Aufgabenfassung.

Die Aktion **Code zur Prüfung teilen** sichert den Commit, führt die konfigurierten Tests aus, baut bei eingerichteter statischer Vorschau die Vorschau derselben Fassung und überträgt den Branch. Ungespeicherte Editorentwürfe sperren diese Aktion. Laufende beziehungsweise fehlgeschlagene Vorgänge werden nicht als Erfolg ausgegeben.

Eine persönliche Arbeitskopie kann abgeschlossen werden, während ihr historischer Diff und ihre Reviews erhalten bleiben. Vorschauen werden nicht mehr nach einer globalen Anzahl von zehn gelöscht. Der konfigurierte Build-Ausgabeordner wird lokal für ungetrackte Buildprodukte ausgeschlossen; Änderungen an getrackten Quelldateien während des Builds stoppen die Einreichung.

## Parallelität und Übernahme

Jede Aufgabe hat eine verantwortliche Person. Parallel arbeitende Personen verwenden getrennte Aufgaben und Arbeitskopien. Projektkontext, Kommentare, Ergebnisse und Prüfungen bleiben gemeinsam sichtbar. Es gibt keine gemeinsame Bearbeitung desselben Editorpuffers.

Eine Übernahme verlangt eine Begründung und vergleicht die erwartete bisherige Zuständigkeit. Alte Arbeitskopien werden erhalten und archiviert. Aktive, erreichbare Ausführung verhindert die Übernahme bis zum Stoppen. Bei bestätigter längerer Unerreichbarkeit werden alte Job-Leases ungültig und der bekannte Vorgang bleibt als unterbrochen dokumentiert. Nicht übertragene Dateien eines ausgeschalteten Rechners werden niemals als verfügbar ausgegeben.

## Einmalige Einrichtung und persönliche Rechte

Ein neues normales Studio beginnt ohne automatisch erzeugte Demo-Projekte. Bestehende Projekte werden nicht gelöscht. Ein Projekt kann vor jeder technischen Einrichtung angelegt werden.

Nach der einmaligen persönlichen Runner-Anmeldung kann ein Teammitglied das gemeinsame GitHub-Repository im Studio auf seinem eigenen Runner einrichten. Die Arbeitskopie wird in dessen verwaltetem Bereich angelegt. Testbefehl, Vorschau, Branchübertragung und Codex-Nutzung werden ausdrücklich gewählt. Registrierungen und bereits anderweitig eingerichtete Projekte werden nicht überschrieben. Die erweiterte lokale Einrichtung bleibt für vorhandene Ordner zugänglich.

Der Runner vergleicht Repository und Zielbranch mit dem gemeinsamen Projekt. Für den Git-Zugriff verwendet er die persönliche lokale Git-Anmeldung. npm-Befehle unter Windows verwenden den installierten npm-CLI-Einstieg; beliebige Shell-Verknüpfungen werden durch die einfache Befehlseingabe nicht gestartet.

## GitHub-Abschluss

Der Pull-Request-Ablauf unterstützt Anlage beziehungsweise Zuordnung, persönliche GitHub-Reviews, Statusabgleich und SHA-gebundene Zusammenführung. Identitäts-OAuth mit `read:user` wird nicht in Repository-Rechte umgedeutet.

Für den Serveradapter muss der Betreiber **gesonderte persönliche Repository-Zugänge** in `STUDIO_GITHUB_MEMBER_TOKENS` bereitstellen: ein JSON-Objekt mit interner Mitglieds-ID als Schlüssel und dem betreffenden persönlichen Zugang als Wert. Werte gehören ausschließlich in die private Betriebsumgebung. Sie werden nicht in die Datenbank geschrieben oder an Browser zurückgegeben. Jedes Konto muss zuvor über den vorhandenen GitHub-Identitätsfluss verbunden sein; die Provider-ID muss zum verwendeten persönlichen Repository-Zugang passen. Keine Zugangsdaten in Chat, Git, Dokumentation oder Beispielkonfigurationen eintragen.

Fehlt ein persönlicher Repository-Zugang, zeigt Studio die fehlende Einrichtung und führt keine Provideraktion aus. Dafür ist keine gemeinsame oder fremde Anmeldung zulässig. Die vollständige Einrichtung der echten Konten und ein echter Provider-Probelauf bleiben menschliche beziehungsweise separat autorisierte Betriebsschritte.

GitHub-Reviews werden an Commit und persönliche Identität gebunden. Widerrufene oder veraltete Providerfreigaben geben keinen Merge frei. Studio verwendet beim Merge die erwartete HEAD-SHA und verlangt bestätigte konfliktfreie Mergefähigkeit. GitHub prüft den Branchschutz erneut. Ein unbekannter oder gesperrter Zustand wird nicht übergangen. Merge Queues und Fork-PRs sind in diesem Kandidaten nicht implementiert.

Ein neues privates Repository kann ausdrücklich im eigenen GitHub-Konto angelegt und mit dem Projekt verbunden werden. Die Mitgliedschaft des Kollegen im GitHub-Repository ist ein separater GitHub-Berechtigungsschritt. Eine unbestätigte externe Anlage wird nicht blind wiederholt.

Offizielle Schnittstellen: https://docs.github.com/en/rest/pulls/pulls und https://docs.github.com/en/rest/pulls/reviews .

## Persistenz und Kompatibilität

Fachliche Aufgabenregeln werden in `selfhost/team-model.mjs` zentral geprüft. HTTP-, Runner- und frühere Workspace-Routen verwenden diese Regeln. Versionsbezogene Teamdaten und strukturierte Ereignisse liegen hinter diesem Modul in benannten, versionierten Datensätzen der vorhandenen Persistenz. Die bestehende Datenbankstruktur wird nicht ungeprüft umgebaut; historische Schema-, Backup- und Recovery-Verträge bleiben erhalten. Eine spätere relationale Migration benötigt einen eigenen kontrollierten Migrations- und Wiederherstellungsnachweis.

Die frühere allgemeine Oberfläche bleibt ausschließlich als erreichbares Inhaltsarchiv bestehen. Vorhandene allgemeine Dokumente werden nicht stillschweigend einem Projekt zugeordnet. Die ehemaligen neuen Raum-Komponenten sind Kompatibilitätseinstiege in dieselbe aktuelle Oberfläche.

## Nachweis und praktische Grenzen

Fokussierte HTTP- und Integrationstests prüfen Abschlussregeln, unabhängige Ergebnisprüfung, veraltete Fassungen, Wissen und Archiv, eigene Runner, Aufgabenübernahme, Dateigrenzen und GitHub-Providerverträge. GitHub-Schreibtests verwenden einen isolierten Provider-Doppelgänger; sie verändern keine echten Repositories.

Der Browser-Probelauf verwendet synthetische Marco- und Markus-Konten, getrennte Sitzungen, zwei Runnerprozesse und zwei Git-Klone auf diesem Windows-PC. Der gemeinsame Remote ist ein isoliertes lokales Bare-Repository. Damit werden echte Dateiänderungen, Tests, Vorschau, unabhängige Freigabe und Zusammenführung geprüft. Das ist kein Nachweis zweier physischer Rechner, echter KI-Inferenz oder eines Live-GitHub-Merges.

Der Prüfeinstieg ist `npm run studio:verify:local`. Linux-spezifische Operator- und Recovery-Prüfungen bleiben auf Windows ausdrücklich übersprungen. Eine Produktionsfreigabe erfordert zusätzlich die Linux-/Betriebsprüfung, den realen Konten- und Geräteprobelauf sowie den gesonderten Betreiberauftrag. Ein Merge ist kein Deployment.
