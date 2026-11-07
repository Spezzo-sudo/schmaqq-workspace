# KI-Abos in der Werkstatt – Recherche, 30.10.2026

Frage: Dürfen ChatGPT- und Claude-Abos von Marco und Markus genutzt werden, damit die KI in der Studio-Werkstatt
(Server) für sie arbeitet? Keine Rechtsberatung; gelesen am 30.10.2026, vor einer Umsetzung bei Anthropic/OpenAI
bestätigen lassen.

## Anthropic (Claude)

Quellen: [Consumer Terms](https://www.anthropic.com/legal/consumer-terms),
[Claude Code – Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance).

- Free/Pro/Max/Ultra fallen unter die **Consumer Terms**, Team/Enterprise/API unter die **Commercial Terms**.
- Consumer Terms (für Verbraucher in EWR/Schweiz): „Non-commercial use only“ – keine Nutzung für geschäftliche
  Zwecke. Zudem kein Zugriff „through automated or non-human means“, außer per API-Key oder ausdrücklicher Erlaubnis.
- Claude-Code-Doku: Abo-Anmeldung (OAuth) ist für „ordinary use of Claude Code“ gedacht; Nutzungsgrenzen
  setzen „ordinary, individual usage“ voraus. Entwickler dürfen keine Anfragen über Abo-Zugänge im Namen ihrer
  Nutzer leiten und keine Claude.ai-Zugangsdaten sammeln, speichern oder vermitteln.
- Ausdrücklich erlaubt: Ein Nutzer meldet sich im **unveränderten Claude-Code-Programm** mit seinem **eigenen**
  Abo an, auch wenn eine Plattform Claude Code hostet. Eine Plattform, die das als Produkt anbietet, braucht die
  Commercial Terms; Nutzung wird direkt dem jeweiligen Nutzer berechnet, kein Weiterverkauf.

## OpenAI (Codex)

Quelle: [Codex – Authentication](https://learn.chatgpt.com/docs/auth) (früher developers.openai.com/codex/auth).
Die Nutzungsbedingungen selbst waren nicht abrufbar (HTTP 403) und sind daher nicht geprüft.

- Codex unterstützt Anmeldung mit ChatGPT (Abo) oder API-Key, auf Servern per Device-Code.
- „API keys are still the recommended default for automation.“ Für Automatisierung in Unternehmen gibt es
  Codex-Zugriffstokens (Business/Enterprise). Zugangsdaten sind wie Passwörter zu behandeln, nicht zu teilen.

## Folgerung für Studio

1. **Erlaubt erscheint**: Jede Person meldet sich selbst über den offiziellen Ablauf im unveränderten Claude Code
   bzw. Codex in der Werkstatt an; die KI arbeitet nur auf deren ausdrückliche Anweisung im Raum; die Nutzung läuft
   über deren eigenes Konto. Studio speichert oder vermittelt keine Abo-Zugangsdaten selbst.
2. **Nicht erlaubt**: ein gemeinsames Konto für beide; Studio leitet Anfragen über ein fremdes Abo; selbstständig
   laufende Bots ohne Anweisung auf Verbraucher-Abos.
3. **Geschäftliche Arbeit** (SCHMAQQ, Klimafinder mit Affiliate-Einnahmen) passt nicht zu Claude Pro/Max für
   Schweizer Verbraucher. Passend sind **Claude Team** bzw. **ChatGPT Business** (kommerzielle Bedingungen) oder
   API-Keys. Das ist eine Owner-Entscheidung, auch wegen der Regel „keine zusätzlichen kostenpflichtigen APIs“.
4. Für Zielgruppe B (andere Teams nutzen Studio) braucht SCHMAQQ die Commercial Terms von Anthropic; jedes Team
   bringt eigene Zugänge mit.

## Team-Pläne im Vergleich (Stand 30.10.2026, Preise in USD ohne Steuer)

| | Claude Team | ChatGPT Business |
|---|---|---|
| Preis Standard-Sitz | 25 $/Monat monatlich, 20 $ bei Jahreszahlung | 25 $/Monat monatlich, 20 $ bei Jahreszahlung |
| Mindestens | 2 Sitze | 2 Nutzer |
| Für euch zwei | 50 $/Monat (40 $ jährlich) | 50 $/Monat (40 $ jährlich) |
| Coding-Agent | Claude Code enthalten | Codex enthalten (Plus-Niveau) |
| Bedingungen | geschäftlich (Commercial Terms) | geschäftlich |
| Automatik in der Werkstatt | monatliche API-Guthaben, nutzbar für `claude -p`/Agent SDK mit API-Key aus verknüpfter Console-Organisation; laut Preisseite gemeinsam bis 500 $/Monat | API-Key empfohlen (nach Verbrauch bezahlt); Zugriffstokens für Automatik, Planzuordnung unklar |
| Mehr Nutzung | Premium-Sitz 125 $/Monat (100 $ jährlich), 5× | Premium-Sitz laut Drittquellen 100–125 $ |

Quellen: [claude.com/pricing](https://claude.com/pricing),
[Agent SDK mit Claude-Plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan),
[Codex Pricing](https://learn.chatgpt.com/docs/pricing). Nicht offiziell bestätigt: Höhe des API-Guthabens pro
Standard-Sitz (Drittquellen: 20 $), Verhalten bei aufgebrauchtem Guthaben, Premium-Preis ChatGPT Business.

**Empfehlung:** Claude Team mit zwei Standard-Sitzen, zuerst monatlich. Gründe: geschäftliche Bedingungen, Claude
Code enthalten, und die enthaltenen API-Guthaben decken die Automatik in der Werkstatt ohne Zusatzkosten ab,
solange sie reichen. Vor dem Abschluss im Console-Konto prüfen, dass bei leerem Guthaben nichts automatisch
nachberechnet wird (Ausgabenlimit). ChatGPT Business nur, falls Markus Codex bevorzugt.
