# Auftrag: sprachunabhängige Projekteinrichtung

2026-10-29, aktueller Owner-Auftrag im Codex-Chat. Lokaler Branch gemäß HANDOFF.

Ziel: Repository prüfen und einen nachvollziehbaren, ausdrücklich bestätigten
Plan für Vorbereitung, Test und Vorschau verwenden. Vorhandene Node-Projekte
weiter unterstützen; Python/Make und eine allgemeine versionierte Konfiguration
ergänzen. Unbekanntes Projekt und fehlende Programme getrennt erklären.

Nicht-Ziele: kompletter UI-Neubau, zusätzliche Modell-API, automatische
Systeminstallation, Containerplattform, Lockerung der Isolation/Netzfreigaben,
Live-/VPS-Eingriff, Push oder Deployment. Klimafinder-Quelldateien unverändert.

Schreibpfade: selfhost/project-plan*, managed-projects*, runner.mjs,
server.mjs, job-client.mjs, deploy/worker/job-launcher*, zugehörige Tests;
studio/project-connect.tsx, gezielt team-workspace.tsx; Projekt-/Nachweisdokumente.
Ein UI-Builder bearbeitet ausschließlich die beiden Studio-Dateien. Root ist
einziger Schreiber der Backenddateien. Lesender Researcher prüft Anschlussstellen.

Abnahme: Erkennung führt keinen Projektcode aus; Vorschlag und Bestätigung sind
standgebunden; fehlende Programme werden ohne Installation gemeldet; Vorbereitung
erfolgt in der jeweiligen Arbeitskopie mit bestehender Isolation; Quelländerungs-
und Veröffentlichungsregeln bleiben wirksam. Echte lokale Node-/Python-Beispiele,
HTTP-/Runner-/Fehlerfälle, lokale Gesamtprüfung und sichtbare Browserprüfung.
Linux/VPS/Klimafinder-Live-Nachweise separat ausweisen.

Budget: ein begrenzter lokaler Implementierungsdurchlauf mit fokussierter Prüfung,
Gesamtprüfung und einer Review-Korrekturschleife; höchstens drei Agentenstarts,
keine verschachtelte Delegation. Keine Kosten oder Provideränderungen.
