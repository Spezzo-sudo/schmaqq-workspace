// Storage for agent runs, their work steps and task proposals.
//
// Engine-neutral on purpose: a "run" is one answer an agent owes to one message. Which engine produces
// the answer is the worker's business, not this schema's.

const DAY = 24 * 3600 * 1000;
const ACTIVE = ['queued', 'running', 'cancelling'];

export const agentRunSchema = `
CREATE TABLE IF NOT EXISTS agent_runs(
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  project TEXT NOT NULL,
  agent TEXT NOT NULL,
  source_message TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  claimed INTEGER,
  heartbeat INTEGER,
  finished INTEGER,
  lease_hash TEXT,
  tool_policy TEXT NOT NULL DEFAULT '[]',
  completed_message TEXT,
  error_code TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_runs_source ON agent_runs(owner, agent, source_message);
CREATE INDEX IF NOT EXISTS agent_runs_owner ON agent_runs(owner, status, created);
CREATE INDEX IF NOT EXISTS agent_runs_project ON agent_runs(project, owner, created);
CREATE TABLE IF NOT EXISTS agent_run_steps(
  run TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  call_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  proposal TEXT,
  created INTEGER NOT NULL,
  PRIMARY KEY(run, seq),
  UNIQUE(run, call_id)
);
CREATE TABLE IF NOT EXISTS agent_proposals(
  id TEXT PRIMARY KEY,
  run TEXT NOT NULL,
  owner TEXT NOT NULL,
  project TEXT NOT NULL,
  agent TEXT NOT NULL,
  source_message TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  task TEXT,
  decided_by TEXT,
  decided INTEGER,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_proposals_run ON agent_proposals(run);
`;

const MIGRATED_KEY = 'agent-runs:v1:migrated-from-meta';

/**
 * One-time copy of the pilot's records out of workspace_meta. The old rows stay untouched, so going back
 * to the previous version still finds them.
 */
export function migrateLegacyAgentRuns(db) {
  if (db.prepare('SELECT 1 FROM workspace_meta WHERE key=?').get(MIGRATED_KEY)) return;
  const legacy = pattern =>
    db.prepare('SELECT value FROM workspace_meta WHERE key LIKE ?').all(pattern).map(row => JSON.parse(row.value));
  db.exec('BEGIN IMMEDIATE');
  try {
    const insertRun = db.prepare(`INSERT OR IGNORE INTO agent_runs
      (id, owner, project, agent, source_message, model, status, created, updated, claimed, heartbeat, finished,
       lease_hash, tool_policy, completed_message, error_code)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const insertStep = db.prepare('INSERT OR IGNORE INTO agent_run_steps VALUES(?,?,?,?,?,?,?)');
    for (const run of legacy('hermes:v1:run:%')) {
      if (!run?.id || !run.owner || !run.project || !run.agent || !run.source_message) continue;
      const done = !ACTIVE.includes(run.status);
      insertRun.run(run.id, run.owner, run.project, run.agent, run.source_message, String(run.model ?? ''),
        run.status, run.created, run.updated ?? run.created, run.claimed ?? null, run.heartbeat ?? null,
        done ? run.updated ?? run.created : null, run.lease_hash ?? null,
        JSON.stringify(Array.isArray(run.tool_policy) ? run.tool_policy : []),
        run.completed_message ?? null, run.error_code ?? null);
      (Array.isArray(run.tool_calls) ? run.tool_calls : []).forEach((call, index) =>
        insertStep.run(run.id, index + 1, call.callId, call.tool, call.fingerprint, call.proposal ?? null, call.at));
    }
    const insertProposal = db.prepare('INSERT OR IGNORE INTO agent_proposals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
    for (const p of legacy('hermes:v1:proposal:%')) {
      if (!p?.id || !p.run) continue;
      insertProposal.run(p.id, p.run, p.owner, p.project, p.agent, p.source_message, p.title, p.description ?? '',
        p.kind ?? 'general', p.status, p.message ?? null, p.task ?? null, p.decidedBy ?? null, p.decided ?? null,
        p.created, p.updated ?? p.created);
    }
    db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?)').run(MIGRATED_KEY, JSON.stringify({ at: Date.now() }));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const parseRun = row => (row ? { ...row, tool_policy: JSON.parse(row.tool_policy) } : null);

export function agentRunStore(db) {
  const placeholders = ACTIVE.map(() => '?').join(',');
  return {
    insertRun(run) {
      db.prepare(`INSERT INTO agent_runs(id, owner, project, agent, source_message, model, status, created, updated)
        VALUES(?,?,?,?,?,?,?,?,?)`)
        .run(run.id, run.owner, run.project, run.agent, run.source_message, run.model, run.status, run.created, run.created);
    },
    /** Change the given columns of one run. Column names come from code, never from a request. */
    updateRun(id, changes) {
      const columns = Object.keys(changes);
      const values = columns.map(c => (c === 'tool_policy' ? JSON.stringify(changes[c]) : changes[c]));
      db.prepare(`UPDATE agent_runs SET ${columns.map(c => c + '=?').join(', ')} WHERE id=?`).run(...values, id);
    },
    run: id => parseRun(db.prepare('SELECT * FROM agent_runs WHERE id=?').get(id)),
    runForMessage: (owner, agent, message) =>
      parseRun(db.prepare('SELECT * FROM agent_runs WHERE owner=? AND agent=? AND source_message=?').get(owner, agent, message)),
    recentRuns: (owner, project, limit = 40) =>
      db.prepare('SELECT * FROM agent_runs WHERE owner=? AND project=? ORDER BY created DESC, id DESC LIMIT ?')
        .all(owner, project, limit).map(parseRun),
    activeRuns: owner =>
      db.prepare(`SELECT * FROM agent_runs WHERE owner=? AND status IN (${placeholders}) ORDER BY created, id`)
        .all(owner, ...ACTIVE).map(parseRun),
    /** Runs that waited or went silent too long. */
    overdueRuns: (now, queueLimit, silenceLimit) =>
      db.prepare(`SELECT * FROM agent_runs WHERE
          (status='queued' AND created < ?)
          OR (status IN ('running','cancelling') AND COALESCE(heartbeat, claimed, created) < ?)`)
        .all(now - queueLimit, now - silenceLimit).map(parseRun),

    steps: run => db.prepare('SELECT * FROM agent_run_steps WHERE run=? ORDER BY seq').all(run),
    addStep(run, step) {
      const seq = db.prepare('SELECT COALESCE(MAX(seq),0)+1 AS n FROM agent_run_steps WHERE run=?').get(run).n;
      db.prepare('INSERT INTO agent_run_steps VALUES(?,?,?,?,?,?,?)')
        .run(run, seq, step.callId, step.tool, step.fingerprint, step.proposal ?? null, step.at);
    },

    insertProposal(p) {
      db.prepare('INSERT INTO agent_proposals VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(p.id, p.run, p.owner, p.project, p.agent, p.source_message, p.title, p.description, p.kind, 'draft',
          null, null, null, null, p.created, p.created);
    },
    updateProposal(id, changes) {
      const columns = Object.keys(changes);
      db.prepare(`UPDATE agent_proposals SET ${columns.map(c => c + '=?').join(', ')} WHERE id=?`)
        .run(...columns.map(c => changes[c]), id);
    },
    proposal: id => db.prepare('SELECT * FROM agent_proposals WHERE id=?').get(id) ?? null,
    draftsOf: run => db.prepare("SELECT * FROM agent_proposals WHERE run=? AND status='draft' ORDER BY created, id").all(run),

    /** Failed and cancelled runs carry no answer; after a month they are only clutter. */
    prune(now) {
      const before = now - 30 * DAY;
      db.prepare("DELETE FROM agent_proposals WHERE status='discarded' AND updated < ?").run(before);
      db.prepare("DELETE FROM agent_runs WHERE status IN ('failed','cancelled') AND updated < ?").run(before);
    }
  };
}

/** Proposal as the chat may show it, or null while it is a draft or was discarded. */
export function visibleProposal(db, id) {
  if (typeof id !== 'string') return null;
  const p = db.prepare('SELECT * FROM agent_proposals WHERE id=?').get(id);
  return p && p.status !== 'draft' && p.status !== 'discarded' ? p : null;
}
