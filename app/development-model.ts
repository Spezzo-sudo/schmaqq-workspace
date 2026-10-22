/**
 * Development-specific view models. Visible job labels live in workflow-terms.
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
