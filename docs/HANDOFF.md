# Übergabe – Stand 18.11.2026 (für Marco, ChatGPT/Codex, Claude)

Zuerst lesen: dieses Dokument, dann [OBERFLAECHE.md](OBERFLAECHE.md) (jeder Bildschirm, verbindlich),
[CONCEPT_MESSENGER.md](CONCEPT_MESSENGER.md) (Konzept und „Später“), [DECISIONS.md](DECISIONS.md) (neueste oben),
[ANLEITUNG.md](ANLEITUNG.md) (wie man Studio benutzt). Ältere Übergaben liegen in `docs/archive/`.

## Was Studio jetzt ist

Eine **Firma im Messenger**. Ein Projekt ist ein Chat für Menschen und Agenten. Agenten sind Angestellte mit einem Job
(Entwicklung ändert Code, Recherche sucht im Internet, Prüfung prüft). **Herr Grau** leitet: plant, verteilt, stellt ein
(höchstens 6 im Team, pro Job einer). **Menschen reden und geben frei**; Code ändern die Agenten.

Ablauf: Ziel an Herrn Grau → Plan annehmen → die Genannten legen los → Otto meldet im Gespräch der Aufgabe, was er
geändert hat → Frau Kern wird automatisch gefragt → Mensch: „Ansehen“ → „Freigeben“ → „Übernehmen“ → Ergebnis
„bei uns ansehen“ (feste Adresse) oder selbst online stellen.

## Was live ist (studio.schmaqq.com)

- Oberfläche neu aus `docs/OBERFLAECHE.md` gebaut (`studio/ui/`), alte Oberfläche gelöscht. Ein Stylesheet.
- Firmenmodell mit Rollen, Einstellen, Übergabe, Code-Läufen der Agenten mit Bericht im Gespräch und automatischer Prüfung.
- Agenten: günstigstes Modell, niedrige Stufe; Recherche mit eingebauter Websuche. Modell im Profil unter „Erweitert“
  (derzeit nur ein Modell freigeschaltet).
- Code einrichten: nur die Frage „Wo liegt euer Code?“, den Arbeitsplatz richtet Studio selbst ein; ohne Tests „So anfangen“.
- „Bei uns ansehen“: nach jedem Übernehmen unter `studio-preview.schmaqq.com/ansehen/<name>-<schlüssel>/`.
- Deploy: `bash /opt/schmaqq-studio/current/selfhost/deploy/studio-deploy.sh release <main-Commit>` (Sicherung, Probe,
  Rückweg; installiert Worker und Agenten-Dienst mit).

## Noch nie echt durchgelaufen (zuerst testen)

1. Ein echter Programmierlauf von Otto (braucht einmal „Mit ChatGPT verbinden“, wird in der Aufgabe gefragt).
2. Ansehen → Freigeben → Übernehmen mit echtem Code.
3. Automatisches Einrichten des Arbeitsplatzes auf dem echten Server, auch mit leerem Repository („So anfangen“).
4. „Bei uns ansehen“ mit einem echten Projekt.

Rundgang auf einem Wegwerf-Server (Handy und Desktop): `node scripts/studio-ui-walkthrough.mjs <ordner>`.

## Später (vereinbart, nicht im Bau)

- **GitHub-Organisation** (Owner: „Weg 1 find ich gut, machen wir später“): Studio-App in einer Organisation mit
  „Repositories verwalten“ installieren; dann legt „Neu anfangen“ das Repository selbst an. Erst Klick-Anleitung für
  Marco, dann der Teil in Studio.
- Eigener Hoster (z. B. Hostinger) als Ergebnis-Ort.
- Hilfe-Bot auf jeder Seite (siehe CONCEPT_MESSENGER.md).
- Weitere Modelle freischalten (Terra, Sol) – nur auf Wunsch, Kosten.
- Agenten-Zugang für Markus.
- Eigener PC als zweiter Arbeitsort.

## Regeln für die Arbeit am Code

- Neue Bildschirme, Knöpfe oder Begriffe zuerst in `docs/OBERFLAECHE.md`, dann bauen. Nie Neues über Altes legen:
  Altes ersetzen und löschen. `selfhost/studio-surface.test.mjs` erlaubt nur die Dateien der Liste und verbietet alte Begriffe.
- Branch → Pull Request → grüne Prüfung → zusammenführen → Deploy. `node selfhost/verify.mjs` vorher lokal (Node ≥ 24.15).
- Keine Modell- oder Motornamen in der Oberfläche (außer „Erweitert“ im Agentenprofil); „online“ statt „live“.
