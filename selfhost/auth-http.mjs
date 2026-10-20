import { z } from 'zod';
import { digest, passwordHash, passwordValid, createInvite, transaction } from './store.mjs';

/**
 * Cookie-session and invitation HTTP routes.
 *
 * The host server still supplies strict JSON/Origin checks before invoking
 * these routes. Keep the existing per-socket throttling semantics unchanged
 * while separating handler ownership; proxy-aware rate limits need a distinct
 * security change with explicit negative regression tests.
 */
export function createAuthHttpRoute({
  db,
  origin,
  sessionCookie,
  user,
  session,
  readJSON,
  parse,
  fail,
  uuid,
  now
}) {
  const rate = new Map();
  const text = z.string().trim().min(1).max(160);
  const publicMember = member => ({
    id: member.id,
    name: member.name,
    email: member.email,
    seen: member.seen,
    role: member.role
  });
  return async function authHttpRoute({
    route,
    method,
    req,
    res,
    send
  }) {
    if (route === '/api/auth/session') {
      send({
        user: publicMember(user(req))
      });
      return true;
    }
    if (route === '/api/auth/login' && method === 'POST') {
      const key = req.socket.remoteAddress;
      let bucket = rate.get(key);
      if (!bucket || bucket.until < now()) {
        bucket = {
          n: 0,
          until: now() + 60000
        };
        rate.set(key, bucket);
      }
      if (++bucket.n > 12) throw fail(429, 'Bitte eine Minute warten.');
      const v = parse(z.object({
        email: z.string().email().max(200),
        password: z.string().min(1).max(200)
      }), await readJSON(req));
      const m = db.prepare('SELECT * FROM members WHERE email=?').get(v.email.toLowerCase());
      if (!m || !passwordValid(v.password, m.password)) throw fail(401, 'E-Mail oder Passwort stimmen nicht.');
      session(res, m.id);
      send({
        ok: true
      });
      return true;
    }
    if (route === '/api/auth/register' && method === 'POST') {
      const v = parse(z.object({
        invite: z.string().min(20).max(100),
        name: text,
        password: z.string().min(12).max(200)
      }), await readJSON(req));
      const invite = db.prepare('SELECT * FROM invites WHERE hash=? AND expires>?').get(digest(v.invite), now());
      if (!invite) throw fail(403, 'Einladung ungültig oder abgelaufen.');
      if (db.prepare('SELECT id FROM members WHERE email=?').get(invite.email)) throw fail(409, 'Dieses Konto existiert bereits.');
      const memberId = uuid(),
        hash = passwordHash(v.password);
      transaction(db, () => {
        if (!db.prepare('DELETE FROM invites WHERE hash=?').run(invite.hash).changes) throw fail(409, 'Einladung bereits verwendet.');
        db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(memberId, v.name, invite.email, hash, invite.role, now());
      });
      session(res, memberId);
      send({
        ok: true
      });
      return true;
    }
    if (route === '/api/auth/bootstrap' && method === 'POST') {
      const v = parse(z.object({
        setup: z.string().min(20).max(100),
        email: z.string().email().max(200),
        name: text,
        password: z.string().min(12).max(200)
      }), await readJSON(req));
      const expected = db.prepare("SELECT value FROM workspace_meta WHERE key='bootstrap'").get();
      if (!expected || expected.value !== digest(v.setup) || db.prepare('SELECT id FROM members LIMIT 1').get()) throw fail(403, 'Einrichtungslink ungültig oder bereits verwendet.');
      const memberId = uuid(),
        hash = passwordHash(v.password);
      transaction(db, () => {
        if (db.prepare('SELECT id FROM members LIMIT 1').get()) throw fail(409, 'Workspace bereits eingerichtet.');
        db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(memberId, v.name, v.email.toLowerCase(), hash, 'owner', now());
        db.prepare("DELETE FROM workspace_meta WHERE key='bootstrap'").run();
      });
      session(res, memberId);
      send({
        ok: true
      });
      return true;
    }
    if (route === '/api/auth/logout' && method === 'POST') {
      const t = req.headers.cookie?.match(new RegExp('(?:^|;\\s*)' + sessionCookie + '=([\\w-]+)'))?.[1];
      if (t) db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(t));
      res.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
      send({
        ok: true
      });
      return true;
    }
    if (route === '/api/invites' && method === 'POST') {
      const m = user(req);
      if (m.role !== 'owner') throw fail(403, 'Nur der Workspace-Eigentümer kann einladen.');
      const v = parse(z.object({
        email: z.string().email().max(200)
      }), await readJSON(req));
      send({
        link: `${origin}/?invite=${createInvite(db, v.email)}`
      });
      return true;
    }
    return false;
  };
}
