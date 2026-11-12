# Experiment: Kann der PC die Handy-Nachrichten vorhersagen?

Frage: Wenn Handy und PC dasselbe KI-Modell und denselben Kontext haben, kann der PC die
nächste Nachricht vorhersagen und den Auftrag vorab rechnen, sodass die Wartezeit verschwindet?

## Aufbau
- Bob (PC) und Alice (Handy) sind beide Sonnet 5.5, mit identischem Kontext (`kontext.md`).
- Bob sagt vor jeder der 8 Nachrichten die nächste voraus (mit Sicherheit 0–100), danach erhält er die echte Nachricht.
- Durchgang A: Die Nachrichten stammen aus einem Zufallsplan (`nachrichten_A.json`, Seed 20261112), also echte neue Information, die Bob nicht kennt.
- Durchgang B: Alice (Sonnet 5.5) erfindet die Sitzung selbst (`nachrichten_B.json`), also gleiches Modell, gleicher Kontext, keine Geheiminformation.
- Bob wusste nicht, welcher Durchgang welcher ist (identische Prompts, `bob_prompt.txt`). Alle Vorhersagen in `log.jsonl`.
- Auswertung: `python3 auswerten.py` (Ergebnis in `ergebnis.txt`). Die Rechenzeiten je Auftrag sind Annahmen und stehen im Skript.

## Ergebnis
| | Durchgang A (Zufallsplan) | Durchgang B (gleiches Modell) |
|---|---|---|
| Aktion richtig | 1/8 | 5/8 |
| Nachricht exakt richtig | 0/8 | 4/8 |
| Versteckte Wartezeit, nur nächste Nachricht vorab | 0 % | 3 % |
| Versteckte Wartezeit, Strategie „Vorrat“ | 96 % | 88 % |
| Umsonst gerechnet bei „Vorrat“ | 7 s | 11 s |

„Vorrat“: Der PC rechnet jede Vorhersage im Leerlauf vorab und hebt das Ergebnis auf.

## Deutung
1. Was Bob nicht vorhersagen konnte, war genau die neue Information (Suchbegriffe, Monate, Albumnamen aus dem Zufallsplan). Das ist Shannons Informationsbegriff: Vorhersagbares muss nicht übertragen werden, Unvorhersagbares schon.
2. Sendet ein Modell mit demselben Kontext (B), ist die Hälfte der Nachrichten exakt vorhersagbar, enthält also kaum neue Information.
3. Der große Gewinn kam nicht vom exakten Raten des nächsten Schritts, sondern vom Vorrat: Die teure, naheliegende Arbeit („alle Fotos indexieren“) haben beide Bobs schon vor Schritt 1 vorhergesagt. Wer sie im Leerlauf vorab macht, spart die größte Wartezeit, auch wenn der Zeitpunkt nicht stimmt.

## Grenzen
- Nur je 8 Nachrichten, ein Durchlauf, kein Mittelwert über Wiederholungen.
- Die 96 %/88 % hängen fast ganz an einem einzigen großen Auftrag (angenommene 300 s fürs Indexieren). Im Zufallsplan A kam „alle indexieren“ zufällig vor.
- Rechenzeiten sind Annahmen, keine Messung auf echter Hardware.
