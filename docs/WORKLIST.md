# Arbeitsliste SCHMAQQ Studio

Stand 19.11.2026. Eine Liste für alle (Marco, Markus, Claude Code, Codex). Immer nur **eine** Aufgabe „in Arbeit“.
Verbindlich bleiben [OBERFLAECHE.md](OBERFLAECHE.md) und [CONCEPT_MESSENGER.md](CONCEPT_MESSENGER.md);
Übergabe: [HANDOFF.md](HANDOFF.md); Belege: [STATUS.json](STATUS.json). Die alte Liste liegt in `docs/archive/WORKLIST-20261119.md`.

Ablauf je Aufgabe: zuerst in OBERFLAECHE.md / DECISIONS.md eintragen, dann auf einem Branch von `main` bauen,
`node selfhost/verify.mjs` mit Node ≥ 24.15 (Studio-Node: `/opt/schmaqq-studio/runtime/node/bin/node`), Pull Request,
Marco gibt frei, Deploy nach [OPERATIONS.md](OPERATIONS.md).

## In Arbeit

**Die Kette Herr Grau → Kollege schließen** (Befund 19.11.2026, Projekt „Wo stehen wir“):
1. ✅ (Branch) Antwort eines Kollegen auf eine Agenten-Aufgabe = Ergebnis der Aufgabe, Status „Zum Freigeben“; Herr Grau fasst nicht extra zusammen.
2. ✅ (Branch) Im Projektchat steht pro Aufgabe nur **eine kurze Zeile** („Mika hat geliefert · Öffnen ›“), nie der ganze Text.
3. ✅ (Branch) Herr Grau sagt nur zu, was Studio kann (kein „ich unterhalte mich mit Mika“, sondern „ich gebe Mika eine Aufgabe, tippe auf Annehmen“).
4. Wer direkt auf die Nachricht eines Agenten antwortet, holt diesen Agenten (kein @ nötig).
5. ✅ (Branch) „Team erweitern“ steht fest neben „Team“. Offen: doppelte Trennlinie im Agentenprofil (Bildschirmfoto nötig).

## Danach: einmal den echten Ablauf durchspielen (Marco und Claude gemeinsam)

Noch nie in echt gelaufen: Programmierlauf von Otto · Ansehen → Freigeben → Übernehmen mit echtem Code ·
Arbeitsplatz automatisch einrichten (auch leeres Repository) · „Bei uns ansehen“ mit echtem Projekt ·
Menü und Zurück-Taste auf einem echten Android-Gerät (Brave).

## Offene Punkte

- **Aufräumen GitHub:** 46 alte offene Pull Requests (Entwürfe von Oktober/November, #122/#126 überholt) schließen, danach
  etwa 116 Branches prüfen. Schließen ist nötig, Löschen erst nach Prüfung. Braucht Marcos Ok.
- **Deploy:** Beim Neustart meldet der Agenten-Dienst „Studio backend temporarily unavailable“. Prüfen, ob dabei laufende Aufträge verloren gehen.
- **Passwort-Mail** online einrichten und testen, bevor die Passwort-Änderung freigegeben wird.

## Später (vereinbart, nicht im Bau)

GitHub-Organisation · Eigener Hoster · Hilfe-Bot · weitere Modelle · Agenten-Zugang für Markus · eigener PC als Arbeitsort
(Einzelheiten in HANDOFF.md und CONCEPT_MESSENGER.md).
