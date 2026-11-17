# Arbeitsweise: Wer baut, wer entscheidet, wer schaltet live

Stand 17.11.2026. Gilt für Marco, Markus, Hermes und jeden Entwicklungs-Agenten (Claude Code oder ChatGPT/Codex).
Livegang im Detail: [OPERATIONS.md](OPERATIONS.md). Etappen: [PLAN.md](PLAN.md). Was gerade dran ist: [WORKLIST.md](WORKLIST.md).
Belegter Iststand: [STATUS.json](STATUS.json). Bei Widerspruch gilt: OPERATIONS.md für den Livegang, dieses Dokument für den Ablauf davor.
Gemeint ist hier die Entwicklung von Studio selbst. Das Zusammenführen von Aufgaben **in** Studio (Rollen Autor/Admin) beschreiben ANLEITUNG.md und SECURITY.md.

## Rollen

| Wer | Macht | Macht nicht |
|---|---|---|
| **Marco (Owner)** | entscheidet, was gebaut wird; testet live am Handy; gibt „merge“ bzw. ein ausdrückliches „Ja“ zum Zusammenführen und „JA LIVE <kurz>“ | muss keine Technik prüfen |
| **Entwicklungs-Agent** – Claude Code **oder** ChatGPT/Codex | plant, baut auf eigenem Branch, prüft lokal (Tests, Handy und Desktop im Browser), öffnet den Pull Request, führt nach Marcos „merge“ und grüner Prüfung zusammen, schreibt den Auftrag für Hermes | kein Livegang, kein Eingriff auf dem VPS, kein Zusammenführen ohne „merge“ |
| **Betriebs-Hermes** (die bestehende Hermes-Agent-Instanz mit Root-Zugang, über Telegram) | führt fertige Aufträge auf dem VPS aus (Vorlage in OPERATIONS.md) und meldet den ZUSAMMENFASSUNG-Block | entscheidet nichts, improvisiert nicht, ist **nie** der Motor für Studio-Agenten |
| **Markus** | zweiter Tester mit eigenem Konto; prüft, dass Konten getrennt bleiben; kann Pull Requests prüfen | – |
| **GitHub-Prüfung** | ein Lauf pro Pull Request nach `main` | kein zweiter Lauf auf `main`, keine Tests auf dem VPS |

Die Entwicklungs-Agenten sind Werkzeuge der Personen, die sie beauftragen. Sie sind getrennt vom KI-Zugang **in** Studio
(Agenten im Projekt, eigene ChatGPT-Anmeldung pro Person, siehe PLAN.md Etappe 3).

## Ablauf pro Schritt

Immer nur **ein** Schritt in Arbeit (WORKLIST.md, Abschnitt „In Arbeit“).

1. **Entscheid:** Marco sagt in einem Satz, was er will.
2. **Kurzplan** (nur bei grösseren Schritten): was sich ändert, welche Dateien, welche Risiken. Marco sagt ja oder nein.
3. **Bauen und lokal prüfen:** `npm run studio:verify` und bei sichtbaren Änderungen eine echte Klickprüfung am Handy (390 px)
   und am Desktop. Sichtbare Änderungen zeigt der Agent **vor** dem Zusammenführen mit Screenshots.
4. **Pull Request:** Die GitHub-Prüfung läuft einmal. Ist sie rot, findet der Agent die Ursache und behebt sie selbst.
5. **„merge“ von Marco:** Der Agent führt zusammen (Squash) und gibt **einen** fertigen Auftrag für Hermes mit dem vollen Commit von `main`.
6. **„JA LIVE <kurz>“ und Livegang** nach OPERATIONS.md. Marco gibt Hermes den Auftrag und schickt den ZUSAMMENFASSUNG-Block an den Agenten.
7. **Kurz live testen:** Marco klickt am Handy durch und meldet Stichworte oder Screenshots. Daraus wird der nächste Schritt.

## Zwei Entwicklungs-Agenten ohne Konflikte

- **Ein Schritt, ein Agent.** Wer übernimmt, trägt sich unter „In Arbeit“ in der WORKLIST ein, zum Beispiel
  „Codex – Messenger-Feinschliff“. Der andere ändert diese Dateien nicht.
- **Gleiche Regeln:** Beide lesen zuerst AGENTS.md, dieses Dokument und die WORKLIST.
- **Übergabe nur über GitHub:** Pull-Request-Beschreibung, WORKLIST, STATUS.json. Kein Wissen, das nur in einem Chat steht.
- **Gegenseitiges Review ist erwünscht**, aber keine Pflicht. Ein Agent kann den Pull Request des anderen prüfen, bevor Marco „merge“ sagt.

## Regeln gegen Verzetteln und Dauertesten

- Kleine Schritte: höchstens etwa ein Tag Arbeit pro Pull Request; höchstens ein offener Feature-Pull-Request.
- Geprüft wird einmal lokal und einmal auf GitHub. Der VPS führt nur die Sicherheitsnetze des Update-Skripts aus.
- Was nicht geprüft werden konnte (fehlendes Werkzeug, nur auf dem VPS testbar), steht ausdrücklich im Pull Request.
- Tests ohne feste Ports und ohne feste Wartezeiten, damit die GitHub-Prüfung nicht zufällig scheitert oder hängt.

## Zielablauf für Agenten in Studio (Umsetzungsstand je Baustein in STATUS.json)

So sollen Agenten im Produkt arbeiten. Grundlage: PLAN.md Etappe 3 und die Bot-HQ-Analyse vom 16.11.2026.
Was davon tatsächlich läuft, steht in STATUS.json.

1. Eine Person schreibt einem Agenten oder lässt einen Agenten einen anderen fragen.
2. **Rechte und Nutzung:** Agenten gehören zum Projekt. Wer einen Lauf beauftragt, nutzt die eigene KI-Anmeldung und das eigene Kontingent. Projektmitgliedschaft erlaubt keine Nutzung fremder Konten. Einzelchats sind privat; Gruppenchat ist gemeinsam, Agenten antworten dort nur auf @Name.
3. **Warteschlange pro Agent:** ein Auftrag nach dem anderen, jederzeit abbrechbar.
4. **Motor: Hermes Agent, eine eigene Instanz pro Person** (nicht pro Agent, nicht pro Projekt), mit der eigenen
   ChatGPT-Anmeldung dieser Person, abgeschottet auf dem VPS: eigener Prozess, nur der eigene Ordner, keine Shell,
   kein Root, Speichergrenze, Start bei Bedarf und Stopp nach Ruhezeit. Die von einer Person beauftragten Läufe nutzen deren
   Instanz; Rolle, Anweisungen und Projektkontext kommen bei jedem Auftrag aus Studio.
   Ziel für dauerhaftes Wissen ist eine Projektakte; ein separates Gedächtnis pro Agent ist kein zusätzlicher Bauauftrag.
   **Nie** der Betriebs-Hermes. Erst nach bestandenem Hermes-Test; scheitert er, ist Codex direkt der Ersatz
   (die ChatGPT-Anmeldung pro Person dafür ist live).
5. **Live-Arbeitskarte** im Chat (arbeitet seit …, Schritte aufklappbar, Abbrechen).
6. **Werkzeuge nur über Studio** (Nachrichten, Aufgaben, Übergaben). Was etwas verändert, braucht eine Freigabekarte.
7. **Ergebnis als Nachricht** des Agenten, gekennzeichnet als echter Modelllauf.
8. **Übergabe an einen anderen Agenten** wird ein eigener Chat zum Mitlesen, mit Rundenlimit und Stopp.
