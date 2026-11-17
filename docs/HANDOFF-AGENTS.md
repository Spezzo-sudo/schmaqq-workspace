# Übergabe: Agenten und Messenger (Stand 17.11.2026)

Für jeden Entwicklungs-Agenten (Claude Code, ChatGPT/Codex) und für Menschen. Ersetzt das frühere Briefing,
das nur auf dem VPS lag. Regeln: [WORKFLOW.md](WORKFLOW.md). Belegter Iststand: [STATUS.json](STATUS.json).
Was dran ist: [WORKLIST.md](WORKLIST.md). Livegang: [OPERATIONS.md](OPERATIONS.md).
Seitenregeln und Dateiübersicht vom 08.11. gelten weiter: [HANDOFF.md](HANDOFF.md).

## Leitlinien des Owners

- Studio ist der Raum, in dem Menschen und Agenten zusammenarbeiten. **Welcher Motor oder welches Modell dahinter
  läuft, steht nicht in der Oberfläche.**
- Messenger so klar wie Bot HQ: live sichtbar, was ein Agent gerade tut; Projektname nur einmal als Überschrift;
  in jedem Projekt eine Projektleitung („Guru“, anfangs Herr Grau), die für das Team spricht und plant.
- Team wie eine Firma: die Projektleitung führt, andere Agenten übernehmen Aufgaben.
- Planung und Teamvorschläge nur mit echtem Mehrwert, kein Ablauf, der unnötig Kontingent verbraucht.
- **Skalierbar bleiben:** Agenten sollen später auch auf den Rechnern einzelner Personen laufen (Marcos, Markus'
  Laptop usw.), und weitere Modelle sollen anschliessbar sein, über API-Schlüssel, über ein Abo oder über einen
  Vermittler wie OpenRouter. Nichts fest an einen Motor, ein Modell oder einen Server binden.
- Am Ende soll alles live gehen, auch die Agenten in Produktion.

## Abgestimmtes Konzept

- **Die Aufgabe ist die Einheit.** Kreislauf: Planen (Projektleitung) → Freigeben (Mensch) → Machen → Prüfen → Liefern.
- **Agenten gehören zum Projekt. Wer einen Lauf beauftragt, zahlt** mit der eigenen KI-Anmeldung und dem eigenen
  Kontingent. Projektmitgliedschaft erlaubt keine Nutzung fremder Konten.
- **Einzelchats sind privat** (Person ↔ Agent, Person ↔ Person) und gelangen nie in den Kontext eines anderen.
  Im **Gruppenchat** antwortet ein Agent nur auf `@Name`, Frage und Antwort bleiben dort.
- **Stufen:** Berater (antwortet, schlägt vor) → Mitarbeiter (erledigt freigegebene Aufgaben) → Team (Agenten geben
  Aufträge weiter, mit Rundenlimit und Stopp).
- **Projektakte statt Gedächtnis pro Agent:** dauerhaftes Wissen liegt beim Projekt.

## Bauweise, die die Skalierung trägt

- Der Lauf-Vertrag ist motorneutral: Studio stellt Aufträge in eine Warteschlange pro Person; ein Worker holt sie ab
  (`claim`), meldet sich (`heartbeat`), ruft Studio-Werkzeuge (`tool`) und liefert das Ergebnis (`finish`).
  Welcher Motor und welches Modell antworten, ist Sache des Workers (`selfhost/agent-run-http.mjs`).
- Werkzeuge sind eine Liste in Studio und werden pro Lauf mit Beschreibung übergeben; ein neues Werkzeug braucht
  keinen neuen Worker.
- Modellnamen dürfen die Form `anbieter/modell:variante` haben (OpenRouter-Stil).

**Bekannte Grenzen für die Skalierung (noch zu bauen, nicht nebenbei):**
1. Worker dürfen sich nur von derselben Maschine (localhost) melden. Ein Laptop als Agenten-Rechner braucht eine
   eigene, gekoppelte Geräteanmeldung, sinnvollerweise über die vorhandene Rechnerkopplung (`selfhost/runner.mjs`).
2. Pro Person genau ein Worker, fest in einer Datei auf dem Server eingetragen. Ziel: eine Person koppelt ihre
   Ausführungsorte selbst in Studio (Server, eigener Rechner) und wählt pro Agent oder Lauf.
3. Die Modellliste ist eine Servereinstellung für alle (`STUDIO_AGENT_MODELS`). Ziel: Jeder Worker meldet, welche
   Modelle er mit welcher Anmeldung (Abo, API-Schlüssel, OpenRouter) anbietet; Studio zeigt nur diese.
4. API-Schlüssel gehören nie in Studio-Daten oder GitHub, sondern bleiben beim Worker der jeweiligen Person.

## Stand

- **Kandidat:** `feat/guru-plans-20261117`. Enthält #85, #87, #88, #89 und #90. Pull Request nach `main` folgt.
- **Produktion:** unverändert auf `main`; dort sind Agenten aus.
- **Pilot:** isoliert auf dem VPS (Port 14439), Worker `schmaqq-hermes-agent@a`. Rückweg:
  `/root/schmaqq-agent-messenger-rollout/ROLLBACK.md` (nur auf dem VPS).
- **Werkstatt:** Agenten planen und beraten. Code ändern sie noch nicht: Programmierläufe sind auf dem Server-Worker
  gesperrt, bis sie mit der persönlichen Anmeldung über den Launcher laufen. Das ist sicherheitskritisch und wird
  getrennt geprüft.

## Nächste Schritte (Reihenfolge)

1. Pull Request vom Kandidaten nach `main`, GitHub-Prüfung grün; danach #85, #87, #88, #89, #90 schliessen.
2. Owner: „merge“, dann „JA LIVE“. Zusammen damit Agenten in Produktion einschalten (Worker an Produktion binden,
   eigenes Konto, Eintrag in der Server-Umgebung), sonst zeigt Produktion die Oberfläche ohne antwortende Agenten.
3. Auftragsketten: die Projektleitung gibt Aufgaben an andere Agenten weiter (höchstens 2 Ebenen, 6 Antworten,
   Stopp für die ganze Kette), im Chat als eingeklappte, mitlesbare Karte.
4. Ausführungsorte und Anbieter (siehe „Bekannte Grenzen“ 1–3): eigener Rechner als Agenten-Worker, Modelle pro Worker,
   API-Schlüssel und OpenRouter.
5. Projektakte; eine Rechteliste pro Agent statt Fähigkeiten und Berechtigungen getrennt.
6. Nachrichtensuche zurück; Profil, Aufgaben und Konto im neuen Stil.
7. Programmierläufe über den Launcher mit persönlicher Anmeldung (eigener Sicherheits-PR).
8. Später: Antworten Wort für Wort; Prüfsummen im Worker-Installer; alte PRs #16–#79 sichten.

## Tabu ohne Owner

Produktion (`schmaqq-studio.service`, `schmaqq-studio-worker.service` und deren Daten), Betriebs-Hermes
(`hermes.service`, `/opt/hermes-agent`), NetzKontor, Klimafinder, `main` direkt. Keine Secrets ausgeben.
