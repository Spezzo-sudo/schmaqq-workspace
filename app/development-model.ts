/**
 * Development-specific view models and human-readable job state labels.
 * Backend status/action values must remain consistent with the Studio API.
 */
export type Project = {
  id: string;
  title: string;
};
export type LocalProfile = {
  schema: string;
  codex?: string;
  projects: Record<string, {
    repo: string;
    base: string;
    check: string[];
    allowCodex?: boolean;
    workflow?: string;
    requireIssue?: boolean;
    publish?: boolean;
  }>;
};
export type Device = {
  id: string;
  name: string;
  owner: string;
  seen: number;
};
export type Job = {
  id: string;
  owner: string;
  device: string;
  project: string;
  action: string;
  status: string;
  created: number;
  reviewState?: string;
  payload: {
    worktree?: string;
  };
  result: Record<string, unknown> | null;
};
export const names: Record<string, string> = {
  'local-ai': 'Lokale KI-Anfrage',
  files: 'Dateiliste',
  'read-file': 'Datei öffnen',
  'save-file': 'Datei speichern',
  inspect: 'Git-Verbindung prüfen',
  prepare: 'Arbeitskopie erstellen',
  status: 'Änderungen ansehen',
  check: 'Tests ausführen',
  review: 'Teamprüfung anfordern',
  submit: 'Branch veröffentlichen',
  integrate: 'Geprüften Stand zusammenführen',
  preview: 'Vorschau starten',
  codex: 'Codex-Auftrag'
};
export const states: Record<string, string> = {
  queued: 'Wartet auf deinen PC',
  running: 'Läuft',
  completed: 'Abgeschlossen',
  failed: 'Gestoppt',
  interrupted: 'Verbindung unterbrochen',
  cancelled: 'Abgebrochen',
  cancelling: 'Wird gestoppt'
};
