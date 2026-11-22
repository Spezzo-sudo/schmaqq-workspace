// The overview on Start ("Zentrale", owner 22.11.2026): what happens across all of one person's projects.
//
// One request for the whole page. It only counts and names what the person may already see elsewhere:
// projects they belong to, the group chats and the chats people made readable for the team. Private chats
// of others never show up, not even as "an agent is working" (that would tell who asked what).

import {can} from './project-roles.mjs';
import {hiddenPractice} from './practice.mjs';
import {agentsFor} from './room-http.mjs';
import {mayRead} from './chat-scope.mjs';

const DAY = 24 * 3600 * 1000;
const fail = (status, message) => Object.assign(new Error(message), {status});
const json = text => { try { return JSON.parse(text ?? 'null'); } catch { return null; } };
const count = v => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/** What Codex reported about the ChatGPT plan's limits at the end of a code run, cleaned for the app. */
export function limitsOf(value, at) {
 if (!value || typeof value !== 'object') return null;
 const window = w => w && typeof w === 'object' && Number.isFinite(w.used)
  ? {used: Math.max(0, Math.min(100, Math.round(w.used))), minutes: count(w.minutes) || null, resets: Number.isFinite(w.resets) ? w.resets : null}
  : null;
 const short = window(value.short), week = window(value.week);
 if (!short && !week && !value.reached) return null;
 return {short, week, reached: !!value.reached, at};
}

export function overviewFor(db, member, now = Date.now()) {
 const projects = db.prepare("SELECT p.id,p.title FROM projects p WHERE NOT EXISTS (SELECT 1 FROM workspace_meta m WHERE m.key='room:v1:project:'||p.id AND json_extract(m.value,'$.archived')=1)").all()
  .filter(p => !hiddenPractice(db, p.id, member.id) && can(db, member, p.id, 'view'));
 const ids = new Set(projects.map(p => p.id));
 // Agent answers exist only where agents are set up.
 const answers = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='agent_runs'").get();

 // The team: every active colleague in every project, with the facts a card needs.
 const agents = projects.flatMap(p => agentsFor(db, p.id).filter(a => a.active !== false).map(a => ({
  id: a.id, project: p.id, name: a.name, role: a.role, lead: !!a.lead, avatar: a.avatar, avatarPresetId: a.avatarPresetId ?? null,
  avatarPackId: a.avatarPackId, created: a.created, active: true, purpose: a.purpose ?? '', updated: a.updated ?? a.created
 })));

 // Working right now: answers the person may see, and code runs.
 const lastStep = db.prepare('SELECT tool FROM agent_run_steps WHERE run=? ORDER BY seq DESC LIMIT 1');
 const working = (answers ? db.prepare("SELECT id,owner,project,agent,status,created,claimed,source_message FROM agent_runs WHERE status IN ('queued','running','cancelling') ORDER BY created").all() : [])
  .filter(r => ids.has(r.project) && (r.owner === member.id || mayRead(db, r.source_message, member.id)))
  .map(r => ({kind: 'answer', project: r.project, agent: r.agent, status: r.status, started: r.claimed ?? r.created, step: lastStep.get(r.id)?.tool ?? null, task: null}));
 const code = db.prepare("SELECT j.project,j.status,j.created,j.started,w.task FROM jobs j LEFT JOIN workspaces w ON w.job=json_extract(j.payload,'$.worktree') WHERE j.action='codex' AND j.status IN ('queued','running','cancelling') ORDER BY j.created").all()
  .filter(j => ids.has(j.project))
  .map(j => ({kind: 'code', project: j.project, agent: null, status: j.status === 'queued' ? 'queued' : 'running', started: j.started ?? j.created, step: 'code.change', task: j.task ?? null}));

 // When each task last moved: the newest message in its conversation (tasks keep no "done at").
 const activity = {};
 for (const row of db.prepare("SELECT json_extract(x.value,'$.topicTask') AS task,max(m.created) AS at FROM messages m JOIN workspace_meta x ON x.key='room:v1:message:'||m.id WHERE NOT EXISTS(SELECT 1 FROM chat_private s WHERE s.message=m.id) AND json_extract(x.value,'$.topicTask') IS NOT NULL GROUP BY 1").all())
  activity[row.task] = row.at;
 const tasks = db.prepare('SELECT id,project,created FROM tasks').all().filter(t => ids.has(t.project));
 const moved = Object.fromEntries(tasks.map(t => [t.id, activity[t.id] ?? t.created]));

 // The last seven days, per project.
 const since = now - 7 * DAY;
 const week = Object.fromEntries(projects.map(p => [p.id, {answers: 0, messages: 0, codeRuns: 0}]));
 for (const r of answers ? db.prepare("SELECT project,owner,source_message FROM agent_runs WHERE status='completed' AND created>=?").all(since) : [])
  if (ids.has(r.project) && (r.owner === member.id || mayRead(db, r.source_message, member.id))) week[r.project].answers += 1;
 for (const r of db.prepare("SELECT m.channel AS project,count(*) AS n FROM messages m JOIN workspace_meta x ON x.key='room:v1:message:'||m.id WHERE m.created>=? AND json_extract(x.value,'$.origin')='human' AND NOT EXISTS(SELECT 1 FROM chat_private s WHERE s.message=m.id) GROUP BY m.channel").all(since))
  if (ids.has(r.project)) week[r.project].messages = r.n;
 const usage = {runs: 0, reported: 0, input: 0, cached: 0, output: 0};
 for (const j of db.prepare("SELECT project,owner,result FROM jobs WHERE action='codex' AND status='completed' AND created>=?").all(since)) {
  if (!ids.has(j.project)) continue;
  week[j.project].codeRuns += 1;
  if (j.owner !== member.id) continue;
  // My own usage: code runs I commissioned are paid from my ChatGPT plan.
  usage.runs += 1;
  const u = json(j.result)?.usage;
  if (u && typeof u === 'object') { usage.reported += 1; for (const k of ['input', 'cached', 'output']) usage[k] += count(u[k]); }
 }

 // The plan's limits, as the newest of my code runs reported them.
 let limits = null;
 for (const j of db.prepare("SELECT result,COALESCE(started,created) AS at FROM jobs WHERE owner=? AND action='codex' AND status='completed' ORDER BY created DESC LIMIT 20").all(member.id)) {
  limits = limitsOf(json(j.result)?.limits, j.at);
  if (limits) break;
 }
 return {projects: projects.map(p => p.id), agents, working: [...working, ...code], moved, week, usage, limits, at: now};
}

export function createOverviewRoute({db, user, now = Date.now}) {
 return async function overviewRoute({route, method, req, send}) {
  if (route !== '/api/overview') return false;
  if (method !== 'GET') throw fail(405, 'Methode nicht erlaubt.');
  send(overviewFor(db, user(req), now()));
  return true;
 };
}
