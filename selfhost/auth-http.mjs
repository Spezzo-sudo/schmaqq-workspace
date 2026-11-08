import { z } from 'zod';
import { digest, passwordHash, passwordValid, createInvite, transaction } from './store.mjs';
import { noteInvite, consumeInvite, isRemoved, openInvites, withdrawInvite, proposeInvite, inviteRequests, decideRequest, removeMember } from './team-access.mjs';

/**
 * Cookie-session and invitation HTTP routes.
 *
 * The host server still supplies strict JSON/Origin checks before invoking
 * these routes. Rate limiting uses a separate per-account cap and a bounded
 * per-source cap. Forwarded addresses are ignored unless an exact trusted
 * socket proxy was configured by the operator.
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
  now,
  loginLimiter,
  passwordRecovery
}) {
  const text = z.string().trim().min(1).max(160);
  // Sign-in name: an e-mail address or a simple user name such as "markus". Stored lower-case in members.email.
  const loginName = z.string().trim().toLowerCase().max(200).refine(v => z.string().email().safeParse(v).success || /^[a-z0-9][a-z0-9._-]{2,39}$/.test(v), 'Benutzername (3–40 Zeichen: a–z, 0–9, Punkt, Strich) oder E-Mail-Adresse angeben.');
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
    if (route === '/api/auth/recovery/status' && method === 'GET') {
      send({available: passwordRecovery.available});
      return true;
    }
    if (route === '/api/auth/recovery/request' && method === 'POST') {
      const v = parse(z.object({
        email: z.string().trim().email().max(200)
      }), await readJSON(req, 2048));
      const result = passwordRecovery.request(req, v.email.toLowerCase());
      send(result.body, result.status);
      return true;
    }
    if (route === '/api/auth/recovery/confirm' && method === 'POST') {
      const v = parse(z.object({
        token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/),
        password: z.string().min(12).max(200)
      }), await readJSON(req, 2048));
      if (!passwordRecovery.confirm(req, v.token, v.password))
        throw fail(400, 'Link ungültig oder abgelaufen. Bitte einen neuen anfordern.');
      send({ok: true});
      return true;
    }
    if (route === '/api/auth/login' && method === 'POST') {
      // Socket/IP rate is checked before parsing the body so malformed JSON
      // cannot bypass the shared traffic limit. The per-account cap is
      // checked afterwards to avoid blocking different users behind Traefik.
      if (!loginLimiter.consumeSource(req)) throw fail(429, 'Bitte eine Minute warten.');
      const v = parse(z.object({
        email: z.string().trim().min(1).max(200),
        password: z.string().min(1).max(200)
      }), await readJSON(req));
      if (!loginLimiter.consumeAccount(v.email)) throw fail(429, 'Bitte eine Minute warten.');
      const m = db.prepare('SELECT * FROM members WHERE email=?').get(v.email.toLowerCase());
      if (!m || !passwordValid(v.password, m.password) || isRemoved(db, m.id)) throw fail(401, 'E-Mail oder Passwort stimmen nicht.');
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
        consumeInvite(db, invite.hash, memberId);
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
      // Only the owner creates links. A member's request becomes a proposal the owner approves.
      const m = user(req);
      const v = parse(z.object({
        email: loginName
      }), await readJSON(req));
      const email = v.email;
      if (db.prepare('SELECT 1 FROM members WHERE email=?').get(email)) throw fail(409, 'Diese Person hat schon ein Konto.');
      if (m.role !== 'owner') {
        const r = proposeInvite(db, email, m.id);
        if (r.duplicate) throw fail(409, 'Diese Person ist schon vorgeschlagen.');
        if (r.limit) throw fail(429, 'Du hast schon fünf offene Vorschläge. Warte, bis sie entschieden sind.');
        send({ requested: true });
        return true;
      }
      const value = createInvite(db, email);
      noteInvite(db, digest(value), m.id);
      send({ link: `${origin}/?invite=${value}` });
      return true;
    }
    if (route === '/api/invites' && method === 'GET') {
      const m = user(req);
      const name = id => db.prepare('SELECT name FROM members WHERE id=?').get(id)?.name ?? 'Jemand';
      const requests = inviteRequests(db).filter(r => r.status === 'pending' && (m.role === 'owner' || r.by === m.id))
        .map(r => ({ id: r.id, email: r.email, by: name(r.by), created: r.created }));
      send(m.role === 'owner' ? { invites: openInvites(db), requests } : { invites: [], requests });
      return true;
    }
    if (route === '/api/invites/withdraw' && method === 'POST') {
      const m = user(req);
      if (m.role !== 'owner') throw fail(403, 'Nur der Inhaber kann Einladungen zurücknehmen.');
      const v = parse(z.object({ id: z.string().max(100) }), await readJSON(req, 2048));
      if (!withdrawInvite(db, v.id)) throw fail(404, 'Diese Einladung gibt es nicht mehr.');
      send({ ok: true });
      return true;
    }
    if (route === '/api/invites/decide' && method === 'POST') {
      const m = user(req);
      if (m.role !== 'owner') throw fail(403, 'Nur der Inhaber entscheidet über Vorschläge.');
      const v = parse(z.object({ id: z.string().max(64), approve: z.boolean() }), await readJSON(req, 2048));
      const result = transaction(db, () => {
        const request = decideRequest(db, v.id, v.approve ? 'approved' : 'declined', m.id);
        if (!request) throw fail(404, 'Dieser Vorschlag ist schon entschieden.');
        if (!v.approve) return {};
        if (db.prepare('SELECT 1 FROM members WHERE email=?').get(request.email)) throw fail(409, 'Diese Person hat schon ein Konto.');
        const value = createInvite(db, request.email);
        noteInvite(db, digest(value), request.by);
        return { link: `${origin}/?invite=${value}`, email: request.email };
      });
      send(result);
      return true;
    }
    if (route === '/api/auth/password' && method === 'POST') {
      // Change your own password; other sign-ins end, this one stays.
      const m = user(req);
      const v = parse(z.object({ current: z.string().min(1).max(200), password: z.string().min(12).max(200) }), await readJSON(req, 2048));
      if (!loginLimiter.consumeAccount(m.email)) throw fail(429, 'Bitte eine Minute warten.');
      if (!passwordValid(v.current, m.password)) throw fail(403, 'Das bisherige Passwort stimmt nicht.');
      const t = req.headers.cookie?.match(new RegExp('(?:^|;\\s*)' + sessionCookie + '=([\\w-]+)'))?.[1];
      transaction(db, () => {
        db.prepare('UPDATE members SET password=? WHERE id=?').run(passwordHash(v.password), m.id);
        db.prepare('DELETE FROM sessions WHERE member=? AND hash<>?').run(m.id, t ? digest(t) : '');
      });
      send({ ok: true });
      return true;
    }
    if (route === '/api/members/reset' && method === 'POST') {
      const m = user(req);
      if (m.role !== 'owner') throw fail(403, 'Nur der Inhaber kann einen Link für ein neues Passwort erstellen.');
      const v = parse(z.object({ member: z.string().max(100) }), await readJSON(req, 2048));
      const target = db.prepare('SELECT id FROM members WHERE id=?').get(v.member);
      if (!target || isRemoved(db, target.id)) throw fail(404, 'Dieses Mitglied gibt es nicht.');
      send({ link: passwordRecovery.issue(target.id) });
      return true;
    }
    if (route === '/api/members/remove' && method === 'POST') {
      const m = user(req);
      if (m.role !== 'owner') throw fail(403, 'Nur der Inhaber kann jemanden entfernen.');
      const v = parse(z.object({ member: z.string().max(100) }), await readJSON(req, 2048));
      const target = db.prepare('SELECT id,role FROM members WHERE id=?').get(v.member);
      if (!target || isRemoved(db, target.id)) throw fail(404, 'Dieses Mitglied gibt es nicht.');
      if (target.id === m.id || target.role === 'owner') throw fail(400, 'Der Inhaber kann nicht entfernt werden.');
      transaction(db, () => removeMember(db, target.id, m.id));
      send({ ok: true });
      return true;
    }
    return false;
  };
}
