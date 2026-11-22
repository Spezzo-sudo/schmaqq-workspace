// Which conversation a project message belongs to.
//
// A project has one group chat that every member reads, and private one-to-one chats: a person with an
// agent, or two people. A message without a row here belongs to the group chat. A row makes it private.

export const chatSchema = `
CREATE TABLE IF NOT EXISTS chat_private(
  message TEXT PRIMARY KEY,
  project TEXT NOT NULL,
  kind TEXT NOT NULL,
  member TEXT NOT NULL,
  peer TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS chat_private_scope ON chat_private(project, kind, member, peer);
`;

const MIGRATED_KEY = 'chat:v1:private-migrated';
const prepared = new WeakSet();

/**
 * Create the table and, once, sort earlier messages: what a person wrote to an agent and what the agent
 * answered that person becomes their private chat. Everything else stays in the group chat.
 */
export function ensureChatSchema(db) {
  if (prepared.has(db)) return;
  db.exec(chatSchema);
  if (!db.prepare('SELECT 1 FROM workspace_meta WHERE key=?').get(MIGRATED_KEY)) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const rows = db.prepare(`
        SELECT m.id, m.channel, m.author, x.value FROM messages m
        JOIN workspace_meta x ON x.key='room:v1:message:'||m.id`).all();
      const insert = db.prepare('INSERT OR IGNORE INTO chat_private VALUES(?,?,?,?,?)');
      for (const row of rows) {
        const meta = JSON.parse(row.value);
        const toAgent = meta.origin === 'human' && meta.recipientKind === 'agent' && meta.recipient && !meta.handoff;
        const fromAgent = meta.origin === 'verified-run' && meta.senderAgent && meta.recipientKind === 'member' && meta.recipient;
        if (toAgent) insert.run(row.id, row.channel, 'agent', row.author, meta.recipient);
        else if (fromAgent) insert.run(row.id, row.channel, 'agent', meta.recipient, meta.senderAgent);
      }
      db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?)').run(MIGRATED_KEY, JSON.stringify({ at: Date.now() }));
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  prepared.add(db);
}

const pair = (a, b) => (a < b ? [a, b] : [b, a]);

/** Make a message part of the private chat between a person and an agent. */
export function markAgentChat(db, message, project, member, agent) {
  db.prepare('INSERT INTO chat_private VALUES(?,?,?,?,?)').run(message, project, 'agent', member, agent);
}

/** Make a message part of the private chat between two people. */
export function markDirectChat(db, message, project, one, other) {
  const [member, peer] = pair(one, other);
  db.prepare('INSERT INTO chat_private VALUES(?,?,?,?,?)').run(message, project, 'dm', member, peer);
}

export const privateScope = (db, message) => db.prepare('SELECT * FROM chat_private WHERE message=?').get(message) ?? null;

/** An answer lands in the same conversation as the message it answers. */
export function inheritScope(db, source, message) {
  const scope = privateScope(db, source);
  if (scope) db.prepare('INSERT INTO chat_private VALUES(?,?,?,?,?)').run(message, scope.project, scope.kind, scope.member, scope.peer);
}

/** May this person read the message? Group messages: yes (project access is checked elsewhere). */
export function mayRead(db, message, viewer) {
  const scope = privateScope(db, message);
  return !scope || scope.member === viewer || (scope.kind === 'dm' && scope.peer === viewer) || isShared(db, scope.project, scope);
}

/**
 * SQL condition and parameters for "messages this person may read", for a query that has
 * \`LEFT JOIN chat_private s ON s.message=m.id\`.
 */
export const readable = viewer => ({ sql: "(s.message IS NULL OR s.member=? OR (s.kind='dm' AND s.peer=?))", params: [viewer, viewer] });

/** The same for exactly one conversation as the viewer names it: all | agent:<id> | member:<id>. */
export function conversation(view, viewer) {
  const kind = view.split(':')[0], target = view.slice(kind.length + 1);
  if (kind === 'all') return { sql: 's.message IS NULL', params: [] };
  if (kind === 'agent') return { sql: "s.kind='agent' AND s.member=? AND s.peer=?", params: [viewer, target] };
  if (kind === 'member') {
    const [member, peer] = pair(viewer, target);
    return { sql: "s.kind='dm' AND s.member=? AND s.peer=?", params: [member, peer] };
  }
  return null;
}

/** How the viewer's app names the conversation of a row joined with chat_private. */
export function scopeLabel(row, viewer) {
  if (!row.scope_kind) return 'group';
  if (row.scope_kind === 'agent') return 'agent:' + row.scope_peer;
  return 'member:' + (row.scope_member === viewer ? row.scope_peer : row.scope_member);
}

// ---- "Fürs Team sichtbar" (owner, 22.11.2026: option C) ----------------------------------------------
// A private chat stays private unless the people in it decide otherwise: a chat with an agent becomes readable
// for the whole project when its person switches it on; a chat between two people only when both have.
// Everyone else can read such a chat, never write in it. Agents keep reading only the group chat.

const sharedKey = (project, kind, member, peer) => `chat:v1:shared:${project}:${kind}:${member}:${peer}`;
const readShared = (db, k) => {
  const row = db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(k);
  return row ? JSON.parse(row.value) : null;
};

/** The conversation of the viewer's own private chat, as stored: {kind, member, peer}. */
export function ownConversation(chat, viewer) {
  const [kind, target] = [chat.split(':')[0], chat.slice(chat.indexOf(':') + 1)];
  if (kind === 'agent') return { kind: 'agent', member: viewer, peer: target };
  if (kind === 'member') { const [member, peer] = pair(viewer, target); return { kind: 'dm', member, peer }; }
  return null;
}

/** Switch "fürs Team sichtbar" on or off for one participant of a private chat. */
export function setShared(db, project, conv, who, on, at = Date.now()) {
  const k = sharedKey(project, conv.kind, conv.member, conv.peer);
  const by = new Set(readShared(db, k)?.by ?? []);
  if (on) by.add(who); else by.delete(who);
  if (by.size) db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(k, JSON.stringify({ by: [...by], at }));
  else db.prepare('DELETE FROM workspace_meta WHERE key=?').run(k);
}

const agreed = (conv, by) => conv.kind === 'agent' ? by.includes(conv.member) : by.includes(conv.member) && by.includes(conv.peer);

/** Is this private conversation readable for the whole project? */
export function isShared(db, project, conv) {
  return agreed(conv, readShared(db, sharedKey(project, conv.kind, conv.member, conv.peer))?.by ?? []);
}

/** The viewer's own switches in one project: {'agent:<id>': {mine, shared}, 'member:<id>': {mine, theirs, shared}}. */
export function mySharing(db, project, viewer) {
  const rows = db.prepare("SELECT key,value FROM workspace_meta WHERE key LIKE ?").all(`chat:v1:shared:${project}:%`);
  const out = {};
  for (const row of rows) {
    const [kind, member, peer] = row.key.slice(`chat:v1:shared:${project}:`.length).split(':');
    const by = JSON.parse(row.value).by ?? [], conv = { kind, member, peer };
    if (kind === 'agent' && member === viewer) out['agent:' + peer] = { mine: true, shared: true };
    if (kind === 'dm' && (member === viewer || peer === viewer)) {
      const other = member === viewer ? peer : member;
      out['member:' + other] = { mine: by.includes(viewer), theirs: by.includes(other), shared: agreed(conv, by) };
    }
  }
  return out;
}

/** Chats of other people that are readable for the team, named for the app: team:agent:<person>:<agent> | team:member:<a>:<b>. */
export function teamChats(db, project, viewer) {
  const rows = db.prepare("SELECT key,value FROM workspace_meta WHERE key LIKE ?").all(`chat:v1:shared:${project}:%`);
  const out = [];
  for (const row of rows) {
    const [kind, member, peer] = row.key.slice(`chat:v1:shared:${project}:`.length).split(':');
    const conv = { kind, member, peer };
    if (!agreed(conv, JSON.parse(row.value).by ?? []) || member === viewer || (kind === 'dm' && peer === viewer)) continue;
    const last = db.prepare('SELECT m.body,m.created FROM messages m JOIN chat_private s ON s.message=m.id WHERE s.project=? AND s.kind=? AND s.member=? AND s.peer=? ORDER BY m.rowid DESC LIMIT 1').get(project, kind, member, peer);
    if (!last) continue;
    out.push({ chat: 'team:' + (kind === 'agent' ? 'agent' : 'member') + ':' + member + ':' + peer, kind: kind === 'agent' ? 'agent' : 'member', member, peer, last: last.created, excerpt: last.body.slice(0, 160) });
  }
  return out.sort((a, b) => b.last - a.last);
}

/** A team chat name (team:agent:<person>:<agent> | team:member:<a>:<b>) as stored, or null. */
export function teamConversation(chat) {
  const m = /^team:(agent|member):([\w-]{1,100}):([\w-]{1,100})$/.exec(chat);
  if (!m) return null;
  if (m[1] === 'agent') return { kind: 'agent', member: m[2], peer: m[3] };
  const [member, peer] = pair(m[2], m[3]);
  return { kind: 'dm', member, peer };
}

/** May the viewer read a whole private conversation: in it, or the chat is shared with the team? */
export function mayReadConversation(db, project, conv, viewer) {
  return conv.member === viewer || (conv.kind === 'dm' && conv.peer === viewer) || isShared(db, project, conv);
}
