# Entwurf: Chat-Anmeldung, die jede Person selbst macht

Stand 20.11.2026. Beschluss: [DECISIONS.md](DECISIONS.md) „Zwei Anmeldungen, jede Person selbst“.
Ziel: Marco lädt jemanden ein; die Person legt ihr Konto an, tippt in „KI-Zugänge“ zweimal auf „Verbinden“
(Gespräche und Recherche, Code ändern) und arbeitet mit den gleichen Möglichkeiten im Projekt wie Marco, auch in eigenen
Projekten, die Marco nicht sieht. Niemand richtet etwas am Server von Hand ein.

## Ist-Stand (geprüft am 20.11.2026)

- Code ändern: Geräte-Anmeldung in der App, Ordner pro Person im Job-Starter. Funktioniert selbstbedienbar.
- Chat und Recherche: ein **eigener Benutzer und Dienst pro Person** (`schmaqq-hermes-agent@<name>`, Ordner
  `/var/lib/schmaqq-hermes-<name>`), Anmeldung von Hand (`hermes auth add openai-codex`). Eingetragen in
  `/etc/schmaqq-studio-agent-workers.json` (ein Eintrag: Marco). Ein Dienst im Leerlauf: etwa 50 MB, Spitze 100 MB.
  Der Server hat 8 GB, davon etwa 3 GB frei.

## Entscheidung: feste Plätze statt Benutzer zur Laufzeit

Alternativen:

| | Beschreibung | Urteil |
|---|---|---|
| **Plätze (gewählt)** | Beim Deploy werden einmalig N Plätze angelegt (Benutzer, Ordner, Dienst, Schlüssel). Wer „Verbinden“ tippt, bekommt einen freien Platz zugewiesen. | Jede Person bleibt durch einen eigenen Unix-Benutzer getrennt. Kein Dienst der App braucht Root-Rechte zur Laufzeit. Grenze: N Personen (Start mit 10, erweiterbar durch Deploy). |
| Benutzer zur Laufzeit | Ein Hilfsdienst mit Root legt Benutzer und Dienste auf Zuruf der App an. | Skaliert unbegrenzt, aber die App könnte Konten auf dem Server anlegen. Mehr Angriffsfläche, nicht gewählt. |
| Ein gemeinsamer Dienst | Alle Gespräche laufen in einem Prozess, Anmeldedaten in getrennten Ordnern. | Ein Prozess liest alle Anmeldedaten. Schwächere Trennung, nicht gewählt. |
| Chat über den Job-Starter | Chat nutzt die Code-Anmeldung. | Der Job-Starter arbeitet einen Auftrag nach dem anderen ab; Gespräche würden hinter Code-Arbeit warten. Nicht gewählt. |

## Ablauf mit Plätzen

1. **Verbinden:** `POST /api/chat-connection {action:'start'}`. Die App weist der Person einen freien Platz zu
   (Eintrag in der Datenbank, einmalig und fest) und legt eine Anmelde-Anfrage an.
2. **Der Dienst des Platzes** fragt wie bisher nach Arbeit. Statt eines Auftrags bekommt er „Anmelden“, startet
   `hermes auth add openai-codex --no-browser` als sein eigener Benutzer in seinem eigenen Ordner, liest Link und Code
   aus der Ausgabe und meldet sie an Studio zurück.
3. **Die App** zeigt Link und Code („Seite öffnen, Code eintippen“), wie bei der Code-Anmeldung.
4. **Fertig:** Der Dienst meldet „verbunden“, sobald die Anmeldung gespeichert ist. Danach beantwortet derselbe Dienst
   die Aufträge dieser Person, wie heute der von Marco.
5. **Trennen:** löscht die Anmeldung im Ordner des Platzes und gibt den Platz frei.

Marcos bestehender Dienst `a` wird ein Platz mit fester Zuordnung zu Marco; nichts ändert sich für ihn.

## Stand 20.11.2026: gebaut

- Ausgabe von `hermes auth add openai-codex --no-browser` geprüft: Mit `python -u` kommen nach wenigen Sekunden „Open this URL: https://auth.openai.com/codex/device“ und „Enter this code: XXXX-XXXXX“ (mit Farbcodes). Die erste Probe ohne Ausgabe lag an der Pufferung durch `| head`.
- Server (`/api/chat-connection`, Zuordnung `chat-slot:v1:<platz>`, Anmeldestand `chat-login:v1:<platz>`), Dienst (`runLogin`, liest Link und Code, meldet sie, meldet „verbunden“), App (KI-Zugänge), Anlegen der Plätze (`selfhost/deploy/hermes-slots.sh`), Tests.
- Noch nicht gebaut: Trennen (Platz freigeben).

## Offene Punkte (waren vor dem Bau zu klären)

- **Ausgabe von `hermes auth add`:** In einer Probe (20 und 25 Sekunden, mit und ohne Proxy) kam keine Ausgabe an.
  Die Form von Link und Code muss mit einem Pseudo-Terminal untersucht werden, bevor das Auslesen gebaut wird.
- **Wo wird der Platz belegt?** Datei der Schlüssel (`/etc/…`) bleibt nur Eintrag „Platz → Schlüssel“; die Zuordnung
  „Platz → Person“ liegt in der Datenbank.
- **Rechte der eingeladenen Person:** „Gleiche Rechte wie Marco“ heißt: eigene Projekte anlegen, in eigenen Projekten
  alles. Die Verwaltung des ganzen Studios (Einladen, Modellliste) liegt beim Inhaber. Ob eine zweite Person Mitinhaber
  werden kann, ist offen.

## Bauplan

1. Probe: Ausgabe von `hermes auth add` mit Pseudo-Terminal; Ergebnis hier eintragen.
2. Server: Zuordnung Platz ↔ Person, dynamische Liste der Dienste, Anmelde-Anfrage und Statusabfrage, mit Tests.
3. Dienst: Anmelde-Auftrag ausführen, Link und Code zurückmelden, Verbunden-Status.
4. Anlegen der Plätze beim Deploy (Benutzer, Ordner, Dienst, Schlüssel), mit Probelauf und Rückweg.
5. App: „Gespräche und Recherche“ mit „Verbinden“ in KI-Zugänge; Anleitung und Oberfläche anpassen.
6. Test mit einer zweiten Person (Markus) von Anfang bis Ende.
