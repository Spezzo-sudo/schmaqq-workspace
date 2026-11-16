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
  return !scope || scope.member === viewer || (scope.kind === 'dm' && scope.peer === viewer);
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
