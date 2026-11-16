import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { z } from 'zod';
import { digest, token, transaction } from './store.mjs';
import { can, requirePermission } from './project-roles.mjs';
import { agentsFor, buildRoomContext, listRoomTasks, insertRoomTask } from './room-http.mjs';
import { agentRunStore, ensureAgentRunSchema } from './agent-run-store.mjs';

// Agent runs: a person asks one of their agents, a worker bound to that person produces the answer.
// The worker protocol (claim, heartbeat, tool, finish) says nothing about the engine behind it.

const fail = (status, message) => Object.assign(new Error(message), { status });

// ---- Limits -----------------------------------------------------------------------------------------
const QUEUE_LIMIT = 5; // waiting or running requests per person
const QUEUE_TIMEOUT_MS = 10 * 60 * 1000; // nobody picked the request up
const SILENCE_TIMEOUT_MS = 2 * 60 * 1000; // worker stopped sending heartbeats
const WORKER_ONLINE_MS = 45 * 1000; // last contact that still counts as "reachable"
const MAX_CLAIM_WAIT_S = 25;
const HISTORY_MESSAGES = 10;

// The only tools a run can ever receive. The project is bound to the run, never a model argument.
const STUDIO_TOOLS = Object.freeze(['project.read_context', 'task.propose']);
const TOOL_LIMITS = Object.freeze({ 'project.read_context': 3, 'task.propose': 1 });

// ---- Request shapes ---------------------------------------------------------------------------------
const id = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);
const lease = z.string().regex(/^[a-zA-Z0-9_-]{43}$/);
const runCreate = z.object({ project: id, agent: id, message: id, retry: z.boolean().optional() }).strict();
const runCancel = z.object({ run: id }).strict();
const claimRequest = z.object({ wait: z.number().int().min(0).max(MAX_CLAIM_WAIT_S).optional() }).strict();
const workRun = z.object({ run: id, lease }).strict();
const finishRun = workRun.extend({
  status: z.enum(['completed', 'failed', 'cancelled']),
  output: z.string().trim().max(4000).optional(),
  errorCode: z.enum(['provider-unavailable', 'quota-exceeded', 'timeout', 'crash', 'cancelled', 'protocol-error']).optional()
}).strict();
const toolCall = workRun.extend({
  callId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
  tool: z.enum(STUDIO_TOOLS),
  args: z.record(z.string(), z.unknown()).default({})
}).strict();
const toolArgs = {
  'project.read_context': z.object({}).strict(),
  'task.propose': z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2000).default(''),
    kind: z.enum(['general', 'code']).default('general')
  }).strict()
};
const decideProposal = z.object({ proposal: id, decision: z.enum(['accept', 'reject']) }).strict();

const WORKER_ROUTES = ['claim', 'heartbeat', 'tool', 'finish'];
// '/api/hermes-worker/' is the path the first pilot worker was installed with; it stays as an alias.
const WORKER_PREFIXES = ['/api/agent-worker/', '/api/hermes-worker/'];
const MEMBER_ROUTES = ['/api/agent-runs', '/api/agent-runs/cancel', '/api/agent-proposals/decide'];
const LOOPBACK = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
// A reverse proxy or tunnel on this machine also connects from loopback. These headers give it away.
const PROXY_HEADERS = ['x-forwarded-for', 'x-real-ip', 'forwarded', 'cf-connecting-ip', 'cf-ray'];

const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const secureMatch = (a, b) => timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));

function validWorkers(workers) {
  const wellFormed = Array.isArray(workers) && workers.every(w =>
    w && typeof w.owner === 'string' && typeof w.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(w.token));
  if (!wellFormed) throw new Error('Ungültige Hermes-Worker-Konfiguration.');
  const distinct = values => new Set(values).size === values.length;
  if (!distinct(workers.map(w => w.owner)) || !distinct(workers.map(w => w.token))) {
    throw new Error('Hermes-Worker müssen getrennte Benutzer und Tokens haben.');
  }
  return workers.map(w => ({ owner: w.owner, secret: w.token }));
}

export function createAgentRunRoute({ db, user, readJSON, parse, workers = [] }) {
  const registered = validWorkers(workers);
  // Agents are switched on by binding a worker to a person. Until then nothing is stored and nothing runs.
  const enabled = registered.length > 0;
  if (enabled) ensureAgentRunSchema(db);
  const store = agentRunStore(db);
  const lastContact = new Map(); // owner -> time the worker last asked for work
  const waiting = new Map(); // owner -> wake-up of a worker that is waiting for work

  const hasWorker = memberId => registered.some(w => w.owner === memberId);
  const workerOnline = (memberId, now) => now - (lastContact.get(memberId) ?? 0) < WORKER_ONLINE_MS;
  const memberRow = memberId => db.prepare('SELECT * FROM members WHERE id=?').get(memberId);
  const activeAgent = (project, agent) => agentsFor(db, project).find(a => a.id === agent && a.active !== false);

  // ---- Worker identity ------------------------------------------------------------------------------
  function authenticate(req) {
    const bearer = req.headers.authorization?.match(/^Bearer ([a-zA-Z0-9_-]{43})$/)?.[1];
    if (!bearer) throw fail(401, 'Hermes-Dienstanmeldung erforderlich.');
    const worker = registered.find(w => secureMatch(w.secret, bearer));
    if (!worker) throw fail(401, 'Hermes-Dienstanmeldung ungültig.');
    const direct = LOOPBACK.includes(req.socket?.remoteAddress) && !PROXY_HEADERS.some(h => req.headers[h] !== undefined);
    if (!direct) throw fail(403, 'Hermes-Dienst nur auf localhost.');
    return worker.owner;
  }

  function ownRun(runId, owner) {
    const run = store.run(runId);
    if (!run || run.owner !== owner) throw fail(404, 'Dieser Agentenlauf gehört nicht zu deinem Konto.');
    return run;
  }

  function requireLease(run, given, message = 'Die Ausführungsberechtigung ist abgelaufen.') {
    if (!run.lease_hash || !secureMatch(run.lease_hash, digest(given))) throw fail(403, message);
  }

  // ---- Housekeeping ---------------------------------------------------------------------------------
  function expire(now) {
    for (const run of store.overdueRuns(now, QUEUE_TIMEOUT_MS, SILENCE_TIMEOUT_MS)) {
      store.updateRun(run.id, { status: 'failed', error_code: 'timeout', updated: now, finished: now, lease_hash: null });
      for (const draft of store.draftsOf(run.id)) store.updateProposal(draft.id, { status: 'discarded', updated: now });
    }
    store.prune(now);
  }

  // ---- What a member sees ---------------------------------------------------------------------------
  function summary(run, position = null) {
    return {
      id: run.id, agent: run.agent, owner: run.owner, project: run.project, message: run.source_message,
      status: run.status, created: run.created, updated: run.updated, model: run.model,
      started: run.claimed ?? null, finished: run.finished ?? null, position,
      steps: store.steps(run.id).map(step => ({ tool: step.tool, at: step.created })),
      completedMessage: run.completed_message ?? null, errorCode: run.error_code ?? null
    };
  }

  function listRuns(member, project, now) {
    const queue = store.activeRuns(member.id).filter(r => r.status === 'queued').map(r => r.id);
    const position = run => (run.status === 'queued' ? queue.indexOf(run.id) + 1 : null);
    const runs = project
      ? store.recentRuns(member.id, project)
      : store.activeRuns(member.id).filter(run => can(db, member, run.project, 'view'));
    return {
      configured: hasWorker(member.id),
      online: hasWorker(member.id) && workerOnline(member.id, now),
      runs: runs.map(run => summary(run, position(run)))
    };
  }

  // ---- A member asks an agent -----------------------------------------------------------------------
  function createRun(member, request, now) {
    if (!hasWorker(member.id)) {
      throw fail(503, 'Für dich ist noch kein KI-Modellzugang eingerichtet. Keine KI-Antwort gestartet.');
    }
    requirePermission(db, member, request.project, 'view');
    const agent = activeAgent(request.project, request.agent);
    const usable = agent && agent.createdBy === member.id
      && agent.permissions?.readProject !== false && agent.permissions?.writeMessages !== false;
    if (!usable) throw fail(403, 'Dieser Agent wurde nicht von dir freigegeben.');

    const source = db.prepare('SELECT * FROM messages WHERE id=? AND channel=? AND author=?')
      .get(request.message, request.project, member.id);
    const meta = messageMeta(request.message);
    if (!source || meta.origin !== 'human' || meta.recipient !== agent.id || meta.senderAgent) {
      throw fail(400, 'Agentenauftrag braucht eine eigene, direkt an diesen Agenten gerichtete Nachricht.');
    }

    return transaction(db, () => {
      expire(now);
      const existing = store.runForMessage(member.id, agent.id, request.message);
      const retry = request.retry === true && existing && ['failed', 'cancelled'].includes(existing.status);
      if (existing && !retry) return { run: existing.id, status: existing.status, reused: true };
      if (store.activeRuns(member.id).length >= QUEUE_LIMIT) {
        throw fail(409, 'Es warten schon mehrere Aufträge. Bitte zuerst einen abschliessen oder abbrechen.');
      }
      if (retry) {
        // Same message, fresh attempt: the failed attempt left no answer and no visible proposal.
        store.clearSteps(existing.id);
        store.updateRun(existing.id, {
          status: 'queued', created: now, updated: now, claimed: null, heartbeat: null, finished: null,
          lease_hash: null, error_code: null, model: agent.model
        });
        return { run: existing.id, status: 'queued', reused: false };
      }
      const run = randomUUID();
      store.insertRun({
        id: run, owner: member.id, project: request.project, agent: agent.id,
        source_message: request.message, model: agent.model, status: 'queued', created: now
      });
      return { run, status: 'queued', reused: false };
    });
  }

  function cancelRun(member, runId, now) {
    const run = ownRun(runId, member.id);
    if (run.status === 'queued') {
      store.updateRun(run.id, { status: 'cancelled', error_code: 'cancelled', updated: now, finished: now });
      return { ok: true, status: 'cancelled' };
    }
    if (run.status === 'running') {
      store.updateRun(run.id, { status: 'cancelling', updated: now });
      return { ok: true, status: 'cancelling' };
    }
    return { ok: true, status: run.status };
  }

  // ---- The worker picks up work ---------------------------------------------------------------------
  const messageMeta = messageId => {
    const row = db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('room:v1:message:' + messageId);
    return row ? JSON.parse(row.value) : {};
  };

  /** Tools are granted per run at claim time and only to agents explicitly allowed to plan tasks. */
  function policyFor(member, agent, project) {
    const mayPlan = agent.permissions?.manageTasks === true && can(db, member, project, 'develop');
    return mayPlan ? { mode: 'studio-tools-r1', allowed: [...STUDIO_TOOLS] } : { mode: 'no-tools', allowed: [] };
  }

  /** The earlier exchange between this person and this agent, oldest first. Project messages only. */
  function dialogue(run, source) {
    const rows = db.prepare(`
      SELECT m.body, m.author, json_extract(x.value,'$.senderAgent') AS senderAgent
      FROM messages m JOIN workspace_meta x ON x.key='room:v1:message:'||m.id
      WHERE m.channel=? AND m.rowid<?
        AND (json_extract(x.value,'$.senderAgent')=? OR (m.author=? AND json_extract(x.value,'$.recipient')=?))
      ORDER BY m.rowid DESC LIMIT ?`)
      .all(run.project, source.sequence, run.agent, run.owner, run.agent, HISTORY_MESSAGES);
    return rows.reverse().map(row => ({ from: row.senderAgent ? 'agent' : 'person', body: row.body.slice(0, 600) }));
  }

  function claim(owner, now) {
    return transaction(db, () => {
      expire(now);
      const active = store.activeRuns(owner);
      if (active.some(r => r.status !== 'queued')) return null; // one answer at a time per person
      const run = active[0];
      if (!run) return null;

      const member = memberRow(owner), agent = activeAgent(run.project, run.agent);
      const source = db.prepare('SELECT rowid AS sequence, * FROM messages WHERE id=? AND channel=? AND author=?')
        .get(run.source_message, run.project, owner);
      const stillAllowed = member && source && agent && agent.createdBy === owner
        && can(db, member, run.project, 'view') && agent.permissions?.readProject !== false;
      if (!stillAllowed) {
        store.updateRun(run.id, { status: 'failed', error_code: 'protocol-error', updated: now, finished: now });
        return null;
      }

      const leaseToken = token();
      const toolPolicy = policyFor(member, agent, run.project);
      store.updateRun(run.id, {
        status: 'running', lease_hash: digest(leaseToken), claimed: now, heartbeat: now, updated: now,
        tool_policy: toolPolicy.allowed
      });
      return {
        run: run.id, lease: leaseToken, owner, project: run.project, agent: run.agent, model: run.model,
        prompt: source.body, replyTo: source.id,
        context: buildRoomContext(db, run.project).text,
        history: dialogue(run, source),
        profile: {
          name: agent.name, role: agent.role, purpose: agent.purpose,
          personality: agent.personality, responsibility: agent.responsibility
        },
        toolPolicy
      };
    });
  }

  /** Hold the worker's request open until work arrives, so an answer starts without a polling delay. */
  function waitForWork(owner, req, seconds) {
    return new Promise(resolve => {
      waiting.get(owner)?.(); // a newer request replaces an older one
      const done = () => {
        clearTimeout(timer);
        req.off('close', done);
        if (waiting.get(owner) === done) waiting.delete(owner);
        resolve();
      };
      const timer = setTimeout(done, seconds * 1000);
      timer.unref();
      req.once('close', done);
      waiting.set(owner, done);
    });
  }

  // ---- One audited, lease-bound tool call -------------------------------------------------------------
  function runTool(owner, request, now) {
    const run = ownRun(request.run, owner);
    requireLease(run, request.lease);
    if (run.status !== 'running') throw fail(409, 'Dieser Agentenlauf ist nicht mehr aktiv.');

    const args = parse(toolArgs[request.tool], request.args);
    const print = fingerprint({ tool: request.tool, args });
    const steps = store.steps(run.id);
    const previous = steps.find(step => step.call_id === request.callId);
    if (previous && previous.fingerprint !== print) {
      throw fail(409, 'Diese Werkzeugkennung wurde bereits anders verwendet.');
    }
    // A repeated proposal call (network retry) returns the first answer and never proposes twice.
    if (previous?.tool === 'task.propose') {
      return { ok: true, result: { proposal: previous.proposal, status: 'awaiting-approval', reused: true } };
    }
    if (!run.tool_policy.includes(request.tool)) {
      throw fail(403, 'Dieses Werkzeug ist für diesen Agentenlauf nicht freigegeben.');
    }
    if (!previous && steps.filter(step => step.tool === request.tool).length >= TOOL_LIMITS[request.tool]) {
      throw fail(429, 'Werkzeuglimit für diesen Agentenlauf erreicht.');
    }

    const member = memberRow(owner), agent = activeAgent(run.project, run.agent);
    const stillAllowed = member && agent && agent.createdBy === owner
      && can(db, member, run.project, 'view') && agent.permissions?.readProject !== false;
    if (!stillAllowed) throw fail(403, 'Agent oder Projektberechtigung wurde widerrufen.');

    let result, proposal = null;
    if (request.tool === 'project.read_context') {
      const openTasks = listRoomTasks(db, run.project).tasks.slice(0, 20).map(t => ({ title: t.title, status: t.status }));
      result = { trust: 'untrusted-project-data', context: buildRoomContext(db, run.project).text, openTasks };
    } else {
      if (agent.permissions?.manageTasks !== true || !can(db, member, run.project, 'develop')) {
        throw fail(403, 'Aufgabenvorschläge sind für diesen Agenten oder dein Konto nicht mehr freigegeben.');
      }
      proposal = randomUUID();
      store.insertProposal({
        id: proposal, run: run.id, owner, project: run.project, agent: run.agent,
        source_message: run.source_message, title: args.title, description: args.description, kind: args.kind,
        created: now
      });
      result = {
        proposal, status: 'awaiting-approval',
        note: 'Nur ein Vorschlag. Erst die beauftragende Person entscheidet im Chat.'
      };
    }
    if (!previous) {
      store.addStep(run.id, { callId: request.callId, tool: request.tool, fingerprint: print, proposal, at: now });
      store.updateRun(run.id, { heartbeat: now, updated: now });
    }
    return { ok: true, result };
  }

  // ---- The worker reports the end of a run ------------------------------------------------------------
  function finish(owner, request, now) {
    const run = ownRun(request.run, owner);
    requireLease(run, request.lease, 'Ausführung nicht mehr gültig.');
    if (!['running', 'cancelling'].includes(run.status)) throw fail(409, 'Dieser Agentenlauf wurde bereits beendet.');

    const cancelled = run.status === 'cancelling' || request.status === 'cancelled';
    const success = !cancelled && request.status === 'completed';
    if (success && !request.output) throw fail(400, 'Echte Modellantwort fehlt.');

    const member = memberRow(owner), agent = activeAgent(run.project, run.agent);
    const mayAnswer = member && agent && agent.createdBy === owner
      && can(db, member, run.project, 'view') && agent.permissions?.writeMessages !== false;
    if (success && !mayAnswer) throw fail(403, 'Agent oder Projektberechtigung wurde widerrufen.');

    // A draft becomes visible only with a successful, still authorised run; any other end discards it.
    const drafts = store.draftsOf(run.id);
    const mayPropose = success && can(db, member, run.project, 'develop') && agent.permissions?.manageTasks === true;
    const published = mayPropose ? drafts[0] ?? null : null;
    for (const draft of drafts) {
      if (draft !== published) store.updateProposal(draft.id, { status: 'discarded', updated: now });
    }

    let messageId = null;
    if (success) {
      messageId = randomUUID();
      db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(messageId, run.project, owner, request.output, now);
      if (published) store.updateProposal(published.id, { status: 'pending', message: messageId, updated: now });
      const meta = {
        kind: 'agent', origin: 'verified-run', senderAgent: run.agent, model: run.model,
        replyTo: run.source_message, recipient: owner, recipientKind: 'member', runId: run.id,
        ...(published ? { proposal: published.id } : {})
      };
      db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?)').run('room:v1:message:' + messageId, JSON.stringify(meta));
    }

    const status = cancelled ? 'cancelled' : success ? 'completed' : 'failed';
    const errorCode = status === 'failed' ? request.errorCode ?? 'crash' : status === 'cancelled' ? 'cancelled' : null;
    store.updateRun(run.id, {
      status, updated: now, finished: now, lease_hash: null, completed_message: messageId, error_code: errorCode
    });
    return { ok: true, status, message: messageId };
  }

  // ---- A member decides on a proposal -----------------------------------------------------------------
  /** Only the commissioning person decides; acceptance uses the one room task path, once. */
  function decide(member, request, now) {
    const p = store.proposal(request.proposal);
    if (!p || p.status === 'draft' || p.status === 'discarded') throw fail(404, 'Dieser Aufgabenvorschlag existiert nicht.');
    if (p.owner !== member.id) {
      throw fail(403, 'Nur die Person, die den Agenten beauftragt hat, entscheidet über diesen Vorschlag.');
    }
    requirePermission(db, member, p.project, 'develop');

    const wanted = request.decision === 'accept' ? 'accepted' : 'rejected';
    if (p.status !== 'pending') {
      if (p.status === wanted) return { ok: true, status: p.status, task: p.task ?? null, reused: true };
      throw fail(409, 'Über diesen Vorschlag wurde bereits anders entschieden.');
    }
    if (wanted === 'rejected') {
      store.updateProposal(p.id, { status: 'rejected', decided_by: member.id, decided: now, updated: now });
      return { ok: true, status: 'rejected', task: null };
    }

    const agent = activeAgent(p.project, p.agent);
    if (!agent || agent.createdBy !== member.id || agent.permissions?.manageTasks !== true) {
      throw fail(403, 'Der Agent darf keine Aufgaben mehr vorschlagen. Vorschlag nicht übernommen.');
    }
    const projectMeta = db.prepare('SELECT value FROM workspace_meta WHERE key=?').get('room:v1:project:' + p.project);
    if (projectMeta && JSON.parse(projectMeta.value).archived) throw fail(409, 'Das Projekt ist archiviert.');
    if (!db.prepare('SELECT id FROM messages WHERE id=? AND channel=?').get(p.message, p.project)) {
      throw fail(409, 'Die Vorschlagsnachricht fehlt.');
    }
    const created = insertRoomTask(db, member, {
      project: p.project, title: p.title, description: p.description, kind: p.kind, source: p.message
    }, now);
    store.updateProposal(p.id, { status: 'accepted', task: created.task, decided_by: member.id, decided: now, updated: now });
    return { ok: true, status: 'accepted', task: created.task };
  }

  // ---- HTTP -------------------------------------------------------------------------------------------
  async function workerRoute(action, { method, req, send }) {
    const owner = authenticate(req);
    if (method !== 'POST') throw fail(405, 'Methode nicht erlaubt.');
    lastContact.set(owner, Date.now());

    if (action === 'claim') {
      const { wait = 0 } = parse(claimRequest, await readJSON(req, 200));
      let job = claim(owner, Date.now());
      if (!job && wait > 0) {
        await waitForWork(owner, req, wait);
        lastContact.set(owner, Date.now());
        job = claim(owner, Date.now());
      }
      send({ job });
      return;
    }
    if (action === 'tool') {
      const request = parse(toolCall, await readJSON(req, 6000));
      send(transaction(db, () => runTool(owner, request, Date.now())));
      return;
    }
    if (action === 'heartbeat') {
      const request = parse(workRun, await readJSON(req, 6000));
      const run = ownRun(request.run, owner), now = Date.now();
      requireLease(run, request.lease);
      if (run.status === 'running') store.updateRun(run.id, { heartbeat: now, updated: now });
      send({ status: run.status, cancel: run.status === 'cancelling' });
      return;
    }
    const request = parse(finishRun, await readJSON(req, 6000));
    send(transaction(db, () => finish(owner, request, Date.now())));
  }

  async function memberRoute(route, { method, req, url, send }) {
    const member = user(req), now = Date.now();
    if (!enabled) {
      if (method === 'GET' && route === '/api/agent-runs') return send({ configured: false, online: false, runs: [] });
      if (method !== 'POST') throw fail(405, 'Methode nicht erlaubt.');
      if (route === '/api/agent-runs') {
        throw fail(503, 'Für dich ist noch kein KI-Modellzugang eingerichtet. Keine KI-Antwort gestartet.');
      }
      throw fail(404, 'Agenten sind hier nicht eingerichtet.');
    }
    if (method === 'GET' && route === '/api/agent-runs') {
      const requested = url.searchParams.get('project');
      const project = requested === null ? null : parse(id, requested);
      if (project) requirePermission(db, member, project, 'view');
      transaction(db, () => expire(now));
      send(listRuns(member, project, now));
      return;
    }
    if (method !== 'POST') throw fail(405, 'Methode nicht erlaubt.');
    if (route === '/api/agent-proposals/decide') {
      const body = parse(decideProposal, await readJSON(req, 1024));
      send(transaction(db, () => decide(member, body, now)));
      return;
    }
    if (route === '/api/agent-runs/cancel') {
      const body = parse(runCancel, await readJSON(req, 1024));
      send(cancelRun(member, body.run, now));
      return;
    }
    const outcome = createRun(member, parse(runCreate, await readJSON(req, 2048)), now);
    send(outcome, 202);
    if (!outcome.reused) waiting.get(member.id)?.(); // hand the request to a waiting worker right away
  }

  return async function agentRunRoute(context) {
    const { route } = context;
    const prefix = WORKER_PREFIXES.find(p => route.startsWith(p));
    if (prefix && WORKER_ROUTES.includes(route.slice(prefix.length))) {
      await workerRoute(route.slice(prefix.length), context);
      return true;
    }
    if (MEMBER_ROUTES.includes(route)) {
      await memberRoute(route, context);
      return true;
    }
    return false;
  };
}
