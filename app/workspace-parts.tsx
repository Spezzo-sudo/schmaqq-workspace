'use client';

import { FolderKanban, ArrowUpRight } from 'lucide-react';
import { statuses, short } from './workspace-model';
import type { Project, Task, Member } from './workspace-model';

/** Presentational task and project cards. All writes are delegated to Workspace. */
export function WorkspaceTaskCard({
  task,
  project: p,
  members,
  saving,
  onMutate,
  onOpen
}: {
  task: Task;
  project: Project | undefined;
  members: Member[];
  saving: boolean;
  onMutate: (payload: unknown) => Promise<boolean>;
  onOpen?: () => void;
}) {
  return <article className="task-card"><div className="task-top"><span className={`label ${p?.color}`}>{p?.title}</span>{task.priority === 'Hoch' && <span className="priority">↑ Hoch</span>}</div>{onOpen ? <button className="task-card-open" onClick={onOpen}><h3>{task.title}</h3></button> : <h3>{task.title}</h3>}{task.description && <p>{task.description}</p>}<div className="task-bottom"><select aria-label={`Zuständig für ${task.title}`} value={task.assignee ?? ''} disabled={saving} onChange={e => onMutate({
        action: 'assign',
        id: task.id,
        assignee: e.target.value || null
      })}><option value="">Nicht zugewiesen</option>{members.map(m => <option key={m.id} value={m.id}>{short(m.name)}</option>)}</select><select aria-label={`Status von ${task.title}`} value={task.status} disabled={saving} onChange={e => onMutate({
        action: 'status',
        id: task.id,
        status: e.target.value
      })}>{statuses.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div></article>;
}
export function PageHeading({
  eyebrow,
  title,
  text
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}<span className="green-dot">.</span></h1><p>{text}</p></div></div>;
}
export function ProjectCard({
  project: p,
  tasks,
  onClick
}: {
  project: Project;
  tasks: Task[];
  onClick: () => void;
}) {
  const list = tasks.filter(t => t.project === p.id),
    done = list.filter(t => t.status === 'done').length;
  return <button className="project-card" onClick={onClick}><div className="project-card-top"><span className={`project-icon ${p.color}`}><FolderKanban size={21} /></span><ArrowUpRight size={18} /></div><h3>{p.title}</h3><p>{p.description}</p><span className={`label ${p.color}`}>{p.stage}</span><div className="project-progress"><span>{list.length ? `${done} von ${list.length} Aufgaben erledigt` : 'Bereit für den ersten Schritt'}</span><strong>{list.length ? Math.round(done / list.length * 100) : 0}%</strong></div><div className="progress-track"><div className={p.color} style={{
        width: `${list.length ? done / list.length * 100 : 0}%`
      }} /></div></button>;
}
