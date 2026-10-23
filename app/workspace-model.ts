/**
 * Stable Workspace API/view-model contract.
 * Keep types and display-only helpers independent of navigation or React state.
 */
export type Project = {
  id: string;
  title: string;
  description: string;
  color: string;
  stage: string;
};
export type Task = {
  id: string;
  project: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assignee: string | null;
};
export type Member = {
  id: string;
  name: string;
  email: string;
  seen: number;
  role?: string;
};
export type Doc = {
  id: string;
  title: string;
  body: string;
  author: string;
  revision: number;
  updated: number;
};
export type Data = {
  projects: Project[];
  tasks: Task[];
  members: Member[];
  messages: {
    id: string;
    channel: string;
    author: string;
    body: string;
    created: number;
  }[];
  documents: Doc[];
  activities: {
    id: string;
    author: string;
    body: string;
    created: number;
  }[];
};
export const empty: Data = {
  projects: [],
  tasks: [],
  members: [],
  messages: [],
  documents: [],
  activities: []
};
export const statuses = [['todo', 'Offen'], ['doing', 'In Arbeit'], ['review', 'Review'], ['done', 'Erledigt']];
export type Route = { view: string; project: string; task: string };
/** Read view, project and task from the URL. The task workspace needs both a task and its project. */
export function readRoute(search: string, views: readonly string[]): Route {
  const params = new URLSearchParams(search), requested = params.get('view') ?? '', project = params.get('project') ?? 'all', task = params.get('task') ?? '';
  if (requested === 'task') return task && project !== 'all' ? { view: 'task', project, task } : { view: 'overview', project, task: '' };
  return { view: views.includes(requested) ? requested : 'overview', project, task: '' };
}
/** Write a route into an existing URL; unrelated query parameters stay. */
export function writeRoute(url: URL, { view, project, task }: Route) {
  url.searchParams.set('view', view);
  if (project !== 'all') url.searchParams.set('project', project); else url.searchParams.delete('project');
  if (view === 'task' && task) url.searchParams.set('task', task); else url.searchParams.delete('task');
  return url;
}
export function initials(name: string) {
  return name.split(/\s|@/).filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}
export function short(name: string) {
  return name.includes('@') ? name.split('@')[0] : name.split(' ')[0];
}
export function date(ts: number) {
  return new Date(ts).toLocaleString('de-DE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
