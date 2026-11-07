# P3 – privater gemeinsamer Testremote vorbereitet

Der Owner hat ausdrücklich die Erstellung und Befüllung von
`Spezzo-sudo/schmaqq-studio-pilot` genehmigt.

- Repository: https://github.com/Spezzo-sudo/schmaqq-studio-pilot
- Sichtbarkeit nach Erstellung und nach Push geprüft: **private**.
- Initialer main-Commit: `942b14b83df6b47f0870312c548d71023e38e277`.
- Zehn versionierte Dateien; keine Runnerkonfiguration, Tokens, Datenbanken,
  node_modules oder gebaute dist-Dateien übertragen.
- Einzige direkte main-Änderung ist der autorisierte initiale Testprojekt-Seed.
  Weitere Pilotarbeit erfolgt in getrennten Branches mit Review.

## Inhalt und Prüfungen

Kleine statische Website mit `site/index.html` für Marcos Aufgabe,
`site/services.html` für Markus' Aufgabe und gemeinsamer CSS-Datei. Synthetische
Inhalte, keine Veröffentlichung, keine realen Angebote oder Kundendaten.

- Keine Paketabhängigkeiten und kein npm install nötig.
- `node --test`: **2/2 PASS**. Prüft sinnvolle Seitenstruktur, Sprache,
  Verknüpfung der Seiten und tatsächlich vorhandene lokale Ressourcen.
- `node scripts/build.mjs`: **PASS**. Statische Vorschau nach `dist/` gebaut.
- GitHub-Remote-SHA entspricht lokalem Commit, zehn Dateien im Remote-Baum;
  lokaler Git-Status sauber. LF-Regeln nur in diesem neuen Repository.
- README beschreibt getrennte Aufgaben, Runner-Profil, Review-/Konfliktprobe
  und noch offene menschliche Abnahme. Codex und Veröffentlichung zunächst
  gesperrt; GitHub Actions nicht eingerichtet.

## Im Live-Studio vorbereitet

Eigene angemeldete Owner-Sitzung verwendet. Neues Projekt **Studio-Pilottest**
und zwei noch nicht übernommene Aufgaben angelegt; beide in der echten
Projektübersicht sichtbar geprüft. Keine Runnerjobs erzeugt oder ausgeführt.

- Projekt-ID: `986b71a9-48e4-49d8-97bd-f2156bbf61c8`.
- Marco vorgesehen: **Startseite: verständlicher Einstieg**, Bereich `site/index.html`.
- Markus vorgesehen: **Services: ein konkretes Beispiel beschreiben**, Bereich `site/services.html`.

Ein anfänglicher Automationsrequest verwendete einen nicht unterstützten
Projektstatus „Pilottest“ und wurde korrekt mit 400 abgewiesen. Anschließend
den bestehenden zulässigen Wert „In Entwicklung“ verwendet; keine API-/Code-
Änderung nötig. Kein doppeltes Projekt angelegt.

## Noch offen

Markus verwendet macOS. Sein GitHub-Benutzername für die gezielte Einladung
ist angefragt; keine Einladung ohne identifizierten Empfänger verschickt.
Studio-Konto, Mac-Runner, eigener Checkout und Git-Schreibprobe fehlen noch.
Auch Marcos bestehender Runner ist für das neue Projekt noch nicht konfiguriert;
seine vorherige Testkonfiguration bleibt erhalten.

Die Abnahme von Aufgaben, Kommentaren, paralleler Arbeit, neuen Vorschauen und
gegenseitigem Review durch beide echten Personen ist weiterhin offen.
NetzKontor und Studio-Produktcode wurden nicht verändert.
