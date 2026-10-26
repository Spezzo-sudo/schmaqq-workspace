/**
 * One visible German term per Studio concept. Backend action and status keys
 * stay unchanged; only their labels are defined here and shared by all views.
 */
export const terms = {
  copy: 'Arbeitskopie',
  copies: 'Arbeitskopien',
  review: 'Prüfstand',
  device: 'PC',
  publish: 'Branch veröffentlichen'
} as const;

/** Short explanations for technical terms shown next to their first use. */
export const glossary: Record<string, string> = {
  Arbeitskopie: 'Deine eigene Kopie des Projekts auf deinem PC. Was du darin änderst, betrifft niemanden sonst, bis du es zur Prüfung gibst.',
  Prüfstand: 'Ein fest gespeicherter Stand deiner Arbeit, bei dem die Tests noch einmal laufen. Eine zweite Person sieht sich genau diesen Stand an und gibt ihn frei.',
  Runner: 'Das kleine Studio-Programm auf deinem PC. Es öffnet und speichert Dateien und startet Tests und Vorschauen.',
  Commit: 'Ein fest gespeicherter Zwischenstand mit eindeutiger Nummer. Eine Freigabe gilt immer genau für diesen Stand.',
  Branch: 'Ein eigener Arbeitszweig des Projekts. Veröffentlichen schickt ihn an das gemeinsame Projektarchiv; online geht dadurch noch nichts.',
  Dateiabgleich: 'Ein kurzer Blick auf die aktuellen Dateien deiner Arbeitskopie. Damit weiß Studio, ob ein Test noch zum heutigen Stand passt.',
  Tests: 'Automatische Prüfungen des Projekts. Sie zeigen, ob nach deiner Änderung noch alles funktioniert.',
  Vorschau: 'Eine Ansicht deiner geänderten Seite, nur für dich und dein Team. Sie ist nicht öffentlich.',
  Git: 'Das Werkzeug, das alle Stände des Projekts speichert und verschiedene Arbeitskopien zusammenführt.',
  Hauptzweig: 'Der gemeinsame, freigegebene Stand des Projekts. Neue Arbeitskopien starten von hier.'
};

/** Labels for development job actions (keys from the Studio API). */
export const jobActions: Record<string, string> = {
  'local-ai': 'Lokale KI-Anfrage',
  files: 'Dateiliste',
  'read-file': 'Datei öffnen',
  'save-file': 'Datei speichern',
  'create-file': 'Datei erstellen',
  'connect-project': 'Projekt auf eigenem Rechner einrichten',
  inspect: 'Git-Verbindung prüfen',
  prepare: 'Arbeitskopie erstellen',
  status: 'Änderungen ansehen',
  check: 'Tests ausführen',
  review: 'Prüfstand erstellen',
  submit: 'Branch veröffentlichen',
  integrate: 'Geprüften Stand zusammenführen',
  preview: 'Vorschau starten',
  codex: 'Codex-Auftrag'
};

/** Labels for job states; identical in history, results and change overview. */
export const jobStates: Record<string, string> = {
  queued: 'Wartet auf PC',
  running: 'Läuft',
  completed: 'Erfolgreich abgeschlossen',
  failed: 'Fehlgeschlagen',
  interrupted: 'Verbindung unterbrochen',
  cancelled: 'Abgebrochen',
  cancelling: 'Wird gestoppt'
};

export function jobStateLabel(status: string) {
  return jobStates[status] ?? 'Status unbekannt';
}

const copyStates: Record<string, string> = {
  queued: 'Wartet auf PC',
  running: 'Wird erstellt',
  completed: 'Bereit',
  failed: 'Erstellung fehlgeschlagen',
  interrupted: 'Erstellung unterbrochen',
  cancelled: 'Erstellung abgebrochen',
  cancelling: 'Erstellung wird abgebrochen'
};

/** Label for the creation state of an Arbeitskopie; unknown states never read as progress. */
export function copyStateLabel(status: string, archived = false) {
  if (archived) return 'Abgeschlossen';
  return copyStates[status] ?? 'Status unbekannt';
}
