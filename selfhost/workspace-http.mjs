import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { assertAssignment } from './collaboration.mjs';
import {assertTaskStatus} from './team-model.mjs';
import {requirePermission} from './project-roles.mjs';

// The browser and Studio backend share an unchanged workspace JSON contract.
// Keep authorization, optimistic document revisions and message idempotency
// inside the same route boundary.
const text = z.string().trim().min(1).max(160);
const id = z.string().regex(/^[\w-]{1,100}$/);
const body = z.string().trim().max(12000);
const actions = z.discriminatedUnion('action', [z.object({
  action: z.literal('project'),
  title: text,
  description: body,
  color: z.enum(['sage', 'sand', 'blue', 'violet', 'rose']),
  stage: z.enum(['Im Aufbau', 'In Entwicklung', 'Verfügbar'])
}), z.object({
  action: z.literal('task'),
  project: id,
  title: text,
  description: body,
  priority: z.enum(['Normal', 'Hoch']),
  assignee: id.nullable()
}), z.object({
  action: z.literal('status'),
  id,
  status: z.enum(['todo', 'doing', 'review', 'done'])
}), z.object({
  action: z.literal('assign'),
  id,
  assignee: id.nullable()
}), z.object({
  action: z.literal('message'),
  id,
  channel: id,
  body: z.string().trim().min(1).max(4000)
}), z.object({
  action: z.literal('document'),
  id: id.optional(),
  title: text,
  body,
  revision: z.number().int().positive().optional()
})]);
export function createWorkspaceHttpRoute({
  db,
  user,
  readJSON,
  parse,
  record,
  fail
}) {
  const uuid = () => randomUUID();
  const now = () => Date.now();
  return async function workspaceHttpRoute({
    route,
    method,
    req,
    send
  }) {
    if (route !== '/api/workspace') return false;
    if (route === '/api/workspace') {
      const m = user(req);
      db.prepare('UPDATE members SET seen=? WHERE id=?').run(now(), m.id);
      if (method === 'GET') {
        send({
          projects: db.prepare('SELECT * FROM projects ORDER BY created,id').all(),
          tasks: db.prepare('SELECT * FROM tasks ORDER BY created DESC').all(),
          members: db.prepare("SELECT id,name,email,role,seen,EXISTS(SELECT 1 FROM workspace_meta w WHERE w.key='member:v1:removed:'||members.id) AS removed,(SELECT json_extract(w.value,'$.by') FROM workspace_meta w WHERE w.key='member:v1:invited:'||members.id) AS invitedBy FROM members ORDER BY name").all(),
          messages: db.prepare('SELECT * FROM (SELECT * FROM messages ORDER BY created DESC LIMIT 500) ORDER BY created').all(),
          documents: db.prepare("SELECT d.*,(SELECT json_extract(m.value,'$.project') FROM workspace_meta m WHERE m.key='room:v1:note:'||d.id) AS project FROM documents d ORDER BY d.updated DESC").all(),
          activities: db.prepare('SELECT * FROM activities ORDER BY created DESC LIMIT 30').all()
        });
        return true;
      }
      const v = parse(actions, await readJSON(req));
      // The former view follows the same project roles as the new one.
      const roleProject = v.action === 'task' ? v.project : v.action === 'status' || v.action === 'assign' ? db.prepare('SELECT project FROM tasks WHERE id=?').get(v.id)?.project : v.action === 'message' && v.channel !== 'general' ? v.channel : null;
      if (roleProject && db.prepare('SELECT id FROM projects WHERE id=?').get(roleProject)) requirePermission(db, m, roleProject, v.action === 'message' ? 'view' : 'develop');
      if (v.action === 'project') db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(uuid(), v.title, v.description, v.color, v.stage, now());else if (v.action === 'task') {
        if (!db.prepare('SELECT id FROM projects WHERE id=?').get(v.project)) throw fail(404, 'Projekt fehlt.');
        if (v.assignee && !db.prepare('SELECT id FROM members WHERE id=?').get(v.assignee)) throw fail(400, 'Mitglied fehlt.');
        db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(uuid(), v.project, v.title, v.description, 'todo', v.priority, v.assignee, now());
      } else if (v.action === 'status' || v.action === 'assign') {
        const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(v.id);
        if(!task)throw fail(404,'Aufgabe fehlt.');
        if(v.action==='status')assertTaskStatus(db,task,v.status,m.id);
        if(v.action==='assign'&&task.assignee&&task.assignee!==m.id)throw fail(403,'Eine zugewiesene Aufgabe muss ausdrücklich übergeben oder mit Begründung übernommen werden.');
        if (v.action === 'assign' && v.assignee && !db.prepare('SELECT id FROM members WHERE id=?').get(v.assignee)) throw fail(400, 'Mitglied fehlt.');
        if (v.action === 'assign') assertAssignment(db, v.id, v.assignee);
        const r = v.action === 'status' ? db.prepare('UPDATE tasks SET status=? WHERE id=?').run(v.status, v.id) : db.prepare('UPDATE tasks SET assignee=? WHERE id=?').run(v.assignee, v.id);
        if (!r.changes) throw fail(404, 'Aufgabe fehlt.');
      } else if (v.action === 'message') {
        if (v.channel !== 'general' && !db.prepare('SELECT id FROM projects WHERE id=?').get(v.channel)) throw fail(404, 'Raum fehlt.');
        db.prepare('INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?)').run(v.id, v.channel, m.id, v.body, now());
      } else if (v.id) {
        if (!db.prepare('UPDATE documents SET title=?,body=?,author=?,updated=?,revision=revision+1 WHERE id=? AND revision=?').run(v.title, v.body, m.id, now(), v.id, v.revision ?? 0).changes) throw fail(409, 'Dokument inzwischen geändert. Entwurf kopieren und neu laden.');
      } else db.prepare('INSERT INTO documents VALUES(?,?,?,?,1,?)').run(uuid(), v.title, v.body, m.id, now());
      if (v.action !== 'message') record(m.id, `${v.action === 'project' ? 'Projekt' : v.action === 'task' ? 'Aufgabe' : v.action === 'document' ? 'Dokument' : 'Aufgabenstatus'} aktualisiert`);
      send({
        ok: true
      });
      return true;
    }
    return true;
  };
}
