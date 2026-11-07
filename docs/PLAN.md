# SCHMAQQ Studio – Plan

Stand 07.11.2026. Grundlage: Zielbild „Studio Zielbild Einfach“ vom 30.10.2026
(siehe [WORKLIST.md](WORKLIST.md)) und die Owner-Entscheide vom 07.11.2026.
Tagesarbeit und Abhaken: [WORKLIST.md](WORKLIST.md). Belegter Iststand: [STATUS.json](STATUS.json).

## Prinzip

- **GitHub = Code.** Änderungen werden Branches und Pull Requests.
- **Studio = Raum.** Marco, Markus und die KI im Gespräch; Ergebnisse anschauen und freigeben.
- **Werkstatt = unsichtbarer Server.** Baut, testet, erstellt Vorschauen. Niemand wählt einen Rechner.
- **Jede Person arbeitet über ihr eigenes KI-Konto.** Studio teilt, speichert oder vermittelt keine fremden Abos.

## Entscheide vom 07.11.2026 (Owner)

| Thema | Entscheid |
|---|---|
| KI-Abo | ChatGPT-Workspace (Business) mit zwei Standard-Sitzen für Marco und Markus. Ersetzt den Entscheid „Claude Team“ vom 30.10.; Claude vorerst nicht. |
| Handy | **Alles** muss am Handy gehen: Arbeit anstossen, anschauen und freigeben, mit Markus reden, Projekt einrichten. |
| Ziel Anfang Februar 2027 | Marco und Markus arbeiten **täglich** mit Studio an echten Projekten. |
| Rollen | Markus baut aktiv mit. Marco testet, entscheidet und gibt frei (2–5 Std./Woche). |
| Testprojekt | Jede Etappe wird an **Klimafinder** echt geprüft. |
| Live schalten | Marco und Markus haben gleichwertigen Serverzugang. Live nur nach „Ja, live“ des Owners. |
| Open Source | Später entscheiden. |
| Community für viele Teams | Fernziel. Erst nach dem Februar-Ziel und einem Test mit 3–5 kleinen Teams. |

## Etappe 0 – Aufräumen (ohne neue Funktionen)

1. [x] Aktueller Stand (`local/studio-plugin-worker-prototype`) per Pull Request nach `main`. Danach ist `main` der offizielle Stand.
2. [x] Dokumentation verschlankt: aktive Dokumente in `docs/`, Historie in `docs/archive/`.
3. [ ] Abgleich: Welcher Commit läuft auf dem VPS (Studio und Worker)? Bei Abweichung zu `main` sichern.
4. [ ] Zugänge zum VPS auflisten: SSH (Marco, Markus), Hermes über Telegram (Root), ChatGPT-Connector mit Serverzugriff.
   Für jeden Zugang festhalten, wer ihn nutzt und was er darf. Root über einen Chat-Bot ist ein grosses Risiko
   (übernommenes Telegram-Konto oder eingeschleuste Anweisungen = ganzer Server); einschränken oder begründen.
5. [ ] Rolle von Hermes klären: Was tut Hermes heute tatsächlich? Danach behalten (Betrieb/Überwachung) oder abschalten.
6. [ ] Fehler „hunderte gleiche Aufgaben“ untersuchen. Bekannt: entstanden über den Studio-Connector in ChatGPT am Handy.
   In Datenbank-Backups und Protokollen auf dem VPS Zeitpunkt, Version und Auslöser finden, bevor der Connector erweitert wird.

**Fertig, wenn** `main` dem Live-Stand entspricht und Marco und Markus in einer Minute wissen, wo was liegt und wer welchen Zugang hat.

## Etappe 1 – GitHub mit einem Klick

Eigene GitHub-App für Studio statt Deploy-Keys; die Werkstatt darf Branches und Pull Requests hochladen.

**Fertig, wenn** Markus ein Repository am Handy verbindet, ohne einen Schlüssel zu kopieren, und der fertige
Klimafinder-Prüfstand (`67b1cab`, Leise-Priorität) als Pull Request auf GitHub liegt.

## Etappe 2 – Die Werkstatt richtet selbst ein

Erkennen, bauen, testen, Vorschau. Fragen nur bei echten Entscheidungen, mit zwei Knöpfen.

**Fertig, wenn** Markus Klimafinder ohne Hilfe in unter 5 Minuten einrichtet, auch am Handy.

## Etappe 3 – Die KI sitzt im Raum

Studio startet den unveränderten Codex in der Werkstatt mit der **eigenen ChatGPT-Anmeldung der Person**,
die die Arbeit anstösst. Nur auf ausdrückliche Anweisung im Raum. Ergebnis kommt als Nachricht mit Vorschau zurück.
Der Studio-Connector bleibt ein zweiter Weg; er bekommt erst nach Klärung von Etappe 0, Punkt 6 neue
Fähigkeiten (Ergebnis melden), jeweils mit Schutz gegen Duplikate.

Vorher klären: Erlaubt der ChatGPT-Workspace die Codex-Anmeldung auf einem Server (Gerätecode), und wie
werden Nutzungsgrenzen angezeigt?

**Fertig, wenn** Marco am Handy eine kleine Klimafinder-Änderung vom Satz bis „Zum Anschauen“ bringt, ohne etwas zu kopieren.

## Etappe 4 – Anschauen und Freigeben

Vier Zustände: KI arbeitet · Zum Anschauen · Freigegeben · Live. Kommentar an der Vorschau, „Passt“ der zweiten Person, dann Pull Request.

**Fertig, wenn** Marco und Markus eine Änderung gemeinsam bis zum Pull Request bringen, ohne ein Fachwort zu sehen.

## Danach

1. Test mit 3–5 kleinen Teams (Ablauf im Zielbild vom 30.10.).
2. Erst wenn das trägt: offene Projekte, Hilfe anbieten, Einladungen von aussen (Community).

## Arbeitsweise

- Eine Aufgabe zur Zeit. Jede Etappe endet mit einem echten Klimafinder-Test, nicht mit einem Bericht.
- Neue Arbeit nur auf Branches von `main`, nie nur lokal auf einem Gerät.
- Live geht nichts ohne „Ja, live“ des Owners.
- Neue Dokumente nur, wenn sie aktiv gebraucht werden; Nachweise unter `docs/archive/evidence/` bzw. im Pull Request.
