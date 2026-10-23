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
  Arbeitskopie: 'Deine eigene Kopie des Projekts auf deinem PC. Änderungen darin betreffen niemand anderen, bis du sie teilst.',
  Prüfstand: 'Ein gesicherter Stand deiner Arbeitskopie mit Testlauf. Eine zweite Person kann genau diesen Stand prüfen und freigeben.',
  Runner: 'Das Studio-Programm auf deinem PC. Es führt Dateiaufträge, Tests und Vorschauen dort aus.',
  Commit: 'Ein fest gespeicherter Stand in Git. Freigaben gelten immer für genau einen Commit.',
  Branch: 'Ein eigener Entwicklungszweig in Git. Veröffentlichen überträgt ihn zum gemeinsamen Git-Remote.',
  Dateiabgleich: 'Eine Momentaufnahme der Dateien deiner Arbeitskopie, um Testergebnisse dem richtigen Stand zuzuordnen.'
};

/** Labels for development job actions (keys from the Studio API). */
export const jobActions: Record<string, string> = {
  'local-ai': 'Lokale KI-Anfrage',
  files: 'Dateiliste',
  'read-file': 'Datei öffnen',
  'save-file': 'Datei speichern',
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
