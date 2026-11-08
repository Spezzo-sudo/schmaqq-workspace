# SCHMAQQ Studio – Navigationsentwurf und Marken-Konsistenz

**Status:** Designvorschlag; noch keine Umsetzung oder Freigabe. Stand 08.11.2026.
**Repository:** `Spezzo-sudo/schmaqq-workspace` – eigenständige Studio-App.
**Umfang dieses PRs:** ausschliesslich Informationsarchitektur, visuelle Regeln und isolierter klickbarer Demo-Prototyp. **Keine Codex-/Claude-/ChatGPT-Agentenimplementierung oder Provider-Integration.**

## 1. Designsystem: Verbindliche Quellen im bestehenden Studio

- `app/studio-brand.tsx` und `app/brand-paths.ts`: **exakter SCHMAQQ-Schriftzug** als Vektorpfade mit dem Lime-Punkt. Niemals durch eine erfundene S.-Kachel oder generisches Textlogo ersetzen. Zur Startseite führt der bereits vorhandene Brand-Button.
- `studio/schmaqq-design-system.css`: Markenfarben und Schriften; bestehende Komponenten dürfen diese zentralen Regeln nicht durch eigene allgemeine Themes aushebeln.
- `studio/schmaqq-convergence.css`: kantige Formen, 1-px-Konturen, 800er-Button-Gewicht, dezenter 2px Hover-Lift mit hartem Schatten, Lime-Fokusschatten und abgesicherte Reduktion von Animationen.
- `studio/team-workflow.css`: bestehende Studio-Oberfläche und Task-Timeline; der Symbol-Zeitstrahl ist **schon im eigentlichen Studio vorhanden**, kein Neubau.
- `studio/task-next-step.ts`: **ein** autoritativer nächster Schritt mit höchstens einer hervorgehobenen Aktion.

| Bedeutung | Bestehende Token / Farbe | Einsatz |
|---|---|---|
| Ink | `--schmaqq-ink: #111225` | Text, dunkle Flächen, Linien |
| Ink Soft | `--schmaqq-ink-soft: #1a1c36` | Aktive Sidebar-Navigation |
| Paper | `--schmaqq-paper: #f1efe8` | Ruhiger Hintergrund |
| Paper Light | `--schmaqq-paper-light: #fbfaf6` | Karten, Dialoge |
| Paper Deep | `--schmaqq-paper-deep: #e7e2d7` | Dezente abgestufte Flächen |
| Acid/Lime | `--schmaqq-acid: #d9ff6b` | Primäre Aktion, Erledigt, Fokus und Logo-Punkt |
| Coral | `--schmaqq-coral: #ff6f59` | Bedeutungsstarker Akzent; helles Korall `#ffe3dc` **nur** für noch offene Task-Schritte |
| Text | `--schmaqq-sans: Arial,Helvetica,sans-serif` | Produktive Texte und Buttons |
| Technical Labels | `--schmaqq-mono: SFMono-Regular/Consolas/Liberation Mono` | Kurze Labels, Kicker, Kennungen |

Die runden Timeline-Dots sind eine **bewusste funktionale Ausnahme** von der kantigen geometrischen Grundsprache. Nicht weitere runde Karten und Pillen ableiten.

## 2. Navigationskonzept – Änderung statt neuer Anwendung

**Desktop:** Meine Arbeit · Projekte · Gespräche · Team · Mein Konto (linke feste Sidebar).
**Handy:** Arbeit · Projekte · Gespräche · Mehr (eine einzige globale Bottom-Leiste); in «Mehr» liegen Team und Mein Konto.
**Innerhalb eines Projekts:** Übersicht · Aufgaben · Gespräch · Wissen · Einstellungen bleiben lokale Reiter **im Inhalt**, nicht eine zweite globale Bottom-Leiste.
**Aufgabe:** Zurück, Symbol-Timeline, eine nächste Aktion, bestehende Vorschau/Review und Diskussion. Noch keine neue Agenten-Bedienung.

- **Meine Arbeit:** nächste Aktion und relevante Projekte, möglichst ohne konkurrierende Hero-Kacheln.
- **Projekte:** Projektliste und Projektansicht; bereits vorhandenen Arbeitsablauf weiterverwenden.
- **Gespräche:** allgemeine Unterhaltung ausdrücklich von Projekt- und Aufgabenkommentaren trennen. Im eigentlichen Studio liegt das heutige Legacy-Ziel unter `/?legacy=1&view=chat`, vor Migration prüfen.
- **Team:** Mitglieder, Rollen, Einladungen und Zugriff; keine persönlichen KI-Kontoeinstellungen.
- **Mein Konto:** persönliches Profil, vorhandene verbundene KI-Assistenten, Anmeldung und Abmeldung. Kein «Codex in Studio ausführen»-Platzhalter: die eigenständige Claude→ChatGPT-Superagent-Idee gehört **nicht** in diesen Navigations-PR.

## 3. Vorhandenen Code respektieren

- `studio/team-workspace.tsx`: Shell/Menu und sichtbare Inhalte, Basis für den **späteren** Implementierungs-PR.
- `studio/room-model.ts`: bestehende Routen/Projektbereiche; keine neue konkurrierende Router-Lösung erfinden.
- `app/connections.tsx`: Verbindungsliste und persönliche Berechtigungen wiederverwenden.
- `studio/task-timeline.tsx`: kein Neubau, nur bei nachgewiesenem UX-Problem gezielte Korrektur.
- `docs/prototypes/studio-navigation-v1.html`: isolierter, klickbarer Demo-Entwurf. **Keine laufende Studio-App**, keine echten Daten, keine Verbindungen. Enthält für die Demo die originalen Wordmark-SVG-Pfade, um das Logo korrekt zu beurteilen. Der spätere Produktcode verwendet stattdessen `StudioBrand` direkt, nicht eine zweite Kopie.

**Keine neue CSS-Quelle der Wahrheit.** Die statische Prototyp-Datei darf ihre CSS-Werte zur Browseransicht inline abbilden; für die echte Implementierung müssen die bestehenden `--schmaqq-*`-Tokens und Komponenten importiert werden. Kein Import eines kompletten Lovable/TanStack-Templates oder einer zweiten Shadcn-Theme-Schicht.

## 4. Mobil und Accessibility – Abnahmekriterien

1. Bei 375, 390, 768, 1280 und 1440 px: keine abgeschnittenen Labels, kein horizontaler Überlauf und kein Konflikt zwischen Projekt-Tabs und globaler Navigation.
2. Tastatur: Hauptnavigation, Dialog «Mehr», Back-Buttons und Task-Dots sind fokussierbar; sichtbare Fokusmarkierung entspricht SCHMAQQ.
3. Touch-Ziele gut erreichbar, keine schwebende Leiste über Eingabefeldern. Safe-Area auf Android und iOS respektiert.
4. Reload, Zurück/Vorwärts, alte Deep-Links, offene Dateientwürfe und Abmelden funktionieren nach einer **echten** späteren Migration.
5. Die echten Aufgaben und Projekt-Rechte bleiben unverändert; nichts wird ohne Bestätigung integriert oder live geschaltet.
6. Nutzer sehen in Studio nicht plötzlich einen technischen «Agent»- oder «Codex»-Bereich ohne bereits funktionierende Anbindung.
7. Vor Merge in eine produktive Implementierung müssen echte Desktop- **und** Handy-Screenshots und ein echter Browser-Test vorliegen; Build/Quellcode allein genügen nicht.

## 5. Ergebnis und nächste Umsetzung

**Dieser Draft-PR** dient als visuelle Richtung, nicht als neuer Softwarekern. Die Lovable-Vorschau darf für visuelle Reviews genutzt werden, **niemals** direkt als Anwendung in `main` kopiert werden. Der Entwickler-PR wird die bestehende Studio-Shell minimal umbauen und vorhandene Komponenten weiterverwenden.

Ablauf: live laufenden Release mit VPS-Hinweis bestätigen → PR #60 separat prüfen und nur nach Owner-Ja mergen → über den Designvorschlag entscheiden → UX-Implementierungs-PR → echte mobile und Desktop-Tests mit Markus → gesonderte Live-Freigabe.

**Explizit nicht hier enthalten:** Claude-App-Plugin, ChatGPT-Kontingent, Superagenten, Provider-Zugangsdaten, Runtime-/VPS-Arbeit und die frühere Codex-Bridge-ADR. Das ist ein eigenständiges Vorhaben, über das vor der Umsetzung separat entschieden werden muss.
