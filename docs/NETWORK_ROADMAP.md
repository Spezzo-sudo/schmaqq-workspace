# Weg zum dezentralen SCHMAQQ-Netzwerk

_Planungsstand 29.10.2026. Dies ist ein **Plan**, kein Iststand. Was gebaut und
nachgewiesen ist, steht ausschließlich in [STATUS.json](STATUS.json). Keine Freigabe
für Deployment, Merge oder Provider durch diesen Text._

## Leitstern

Arbeit geht an das, was gerade verfügbar und freigegeben ist: Rechner wie KI-Modelle,
ähnlich einer Schwarmintelligenz. Heute ist der VPS der Hauptrechner. Langfristig
teilen Team und Community Rechenleistung in einem dezentralen Netzwerk.

Drei Grundsätze gelten in jeder Stufe:

1. **Niemand führt fremden Code ohne eigene, widerrufbare Zustimmung aus.** Teilen
   ist immer opt-in, pro Person, Projekt und Ressource.
2. **Isolation vor Reichweite.** Eine neue Stufe beginnt erst, wenn die Isolation der
   vorigen nachgewiesen ist.
3. **Persönliche Konten und Abos werden nicht gepoolt.** Geteilt werden nur Ressourcen,
   die der Besitzer ausdrücklich teilen darf (eigene Rechner, eigene lokale Modelle,
   eigene API-Schlüssel), nie fremde Anmeldungen.

## Stufe 0: Eigene Ausführer, offen für jede KI (M1, Oktober 2026)

Gebaut, Nachweise in STATUS.json:

- Runner melden Status und Fähigkeiten (PC/Server, Betriebssystem, CPU, Speicher).
- Vermittlung v1 mit Projektregel (automatisch / nur PC / nur Server). Ausführen nur auf
  **eigenen** Geräten; die gewählte Maschine und der Grund stehen am Auftrag.
- Isolierter Server-Worker auf dem VPS (eigener Nutzer, Speicher-, RAM-, CPU- und
  Prozesslimits, kein Zugriff auf andere Dienste).
- MCP-Zugang für ChatGPT, Claude, Gemini und andere, persönlich autorisiert und widerrufbar.

Bewusste Grenze: Alle Aufträge auf dem Server-Worker laufen unter einem Nutzer. Das
genügt, solange nur der Besitzer selbst dort Aufträge startet.

## Stufe 1: Im Team teilen

Ziel: Marco gibt seinen Server-Worker (oder PC) für Markus frei, ohne dass Markus'
Aufträge Marcos Daten oder Zugänge sehen.

Voraussetzungen:
- **Isolation pro Auftrag:** eigener kurzlebiger Nutzer oder Container je Auftrag
  (z. B. systemd `DynamicUser` oder rootless Container), eigenes Dateisystem je
  Arbeitskopie, Gerätetoken außerhalb der Reichweite des Auftrags.
- Freigaben wie bei lokalen KI-Modellen heute: Besitzer → Person → Projekt, sofort widerrufbar.
- Kontingente je Person (Zeit, Speicher, gleichzeitige Aufträge) und ein Protokoll „wer hat was ausgeführt“.
- Geheimnisse (Git-Zugänge) bleiben pro Person; ein geteilter Worker erhält nie die Zugänge des Besitzers für fremde Aufträge.

Abnahme: zwei echte Personen, gegenseitige Aufträge auf einem geteilten Worker,
negative Tests (fremde Kopie lesen, Token lesen, Kontingent überschreiten) schlagen fehl.

## Stufe 2: Mehrere Rechner als Pool

Ziel: Studio verteilt Aufträge über mehrere Server und PCs nach Fähigkeit und Last.

- Warteschlange mit Fairness statt „erstbester Ausführer“; Aufträge mit Anforderungen
  (z. B. Linux, GPU, Speicher, Datenklasse).
- **Datenklassen:** privat (nur eigene Geräte), Team (freigegebene Teamgeräte),
  öffentlich (später Community). Die Projektregel legt die höchste erlaubte Klasse fest.
- Gesundheitsprüfung und Ausweichen nur innerhalb der erlaubten Klasse, sichtbar begründet.
- Reproduzierbare Ausführungsumgebung (festgelegte Images/Versionen), damit Ergebnisse
  maschinenunabhängig vergleichbar sind.

## Stufe 3: Community und Föderation

Ziel: Fremde Mitglieder stellen Rechenleistung bereit oder nutzen sie.

Offene Kernfragen, die vor dem Bau beantwortet sein müssen:
- **Vertrauen:** Wie prüft man Ergebnisse unbekannter Rechner? Mögliche Wege sind redundante
  Ausführung, signierte reproduzierbare Builds und Vertrauensstufen nach Verlauf.
- **Starke Sandbox:** MicroVMs statt Prozessisolation für fremden Code in beide Richtungen
  (Schutz des Anbieters und des Auftraggebers).
- **Identität und Föderation:** Mitglieder verschiedener Studios erkennen sich gegenseitig
  an, ohne zentrale Konten zu teilen.
- **Fairness und Ausgleich:** Rechenzeit gegen Rechenzeit (Guthaben), keine Weitergabe
  persönlicher Abos.
- **Recht und Datenschutz:** Wo dürfen Daten verarbeitet werden? Einwilligung, Missbrauchsschutz,
  Haftung. Rechtliche Prüfung vor dem ersten fremden Auftrag.

## Stufe 4: KI-Modelle als vermittelte Ressource

Ziel: Nicht nur Rechner, auch Modelle werden nach Fähigkeit und Freigabe vermittelt.

- Heute schon vorhanden: freigegebene lokale Modelle (Ollama) auf eigenen PCs, mit Teamfreigabe.
- Nächster Schritt: Anfragen mit Anforderungen („Code, lange Kontexte, lokal/privat“) an ein
  passendes freigegebenes Modell vermitteln; persönliche Assistenten (ChatGPT, Claude, Gemini)
  arbeiten über den MCP-Zugang mit denselben Ausführern.
- Ausgeschlossen: Pooling persönlicher Abos oder fremder Anmeldungen.

## Reihenfolge und Größe

Jede Stufe ist ein eigener Meilenstein mit Abnahme und eigenem Owner-GO. Empfohlen:
Stufe 1 als Nächstes, weil sie die heute dokumentierte Grenze des Server-Workers
schließt und ohne Community auskommt. Stufe 3 erst, wenn die Community groß genug ist
und Stufe 2 im Alltag stabil läuft.
