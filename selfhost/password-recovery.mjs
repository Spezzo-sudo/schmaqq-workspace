import {createTransport} from 'nodemailer';
import {digest, passwordHash, token, transaction} from './store.mjs';
import {loginSource, parseTrustedProxyIps} from './login-rate-limit.mjs';

export const RESET_LIFETIME_MS = 15 * 60_000;
const HOUR = 60 * 60_000;
const RESPONSE = Object.freeze({
  ok: true,
  message: 'Falls ein Konto mit dieser E-Mail existiert, erhältst du eine Nachricht mit weiteren Schritten.'
});
const RESET_TOKEN_RE = /^[a-zA-Z0-9_-]{43}$/;
const memberKey = id => 'password-recovery:member:' + id;
const tokenKey = hash => 'password-recovery:token:' + hash;
const rateKey = id => 'password-recovery:rate:' + id;

// No email is sent unless every operator-owned SMTP setting is present.
// SMTPS 465 is mandatory: no plaintext, STARTTLS downgrade or untrusted certificates.
export function createResetMailer({env = process.env, origin} = {}) {
  const keys = ['STUDIO_RESET_SMTP_HOST', 'STUDIO_RESET_SMTP_USER', 'STUDIO_RESET_SMTP_PASSWORD'];
  const values = keys.map(key => env[key] ?? '');
  if (values.every(value => !value)) return null;
  if (values.some(value => !value)) throw new Error('Studio recovery SMTP configuration is incomplete.');
  const host = env.STUDIO_RESET_SMTP_HOST;
  const from = env.STUDIO_RESET_SMTP_USER;
  if (!/^[a-z0-9.-]{3,253}$/i.test(host) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
    throw new Error('Studio recovery SMTP host or sender is invalid.');
  }
  if ((env.STUDIO_RESET_SMTP_PORT ?? '465') !== '465') throw new Error('Studio recovery requires implicit TLS on port 465.');
  if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Studio recovery requires an HTTPS origin.');

  const smtp = createTransport({
    host, port: 465, secure: true,
    auth: {user: from, pass: env.STUDIO_RESET_SMTP_PASSWORD},
    tls: {rejectUnauthorized: true, minVersion: 'TLSv1.2'},
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 12000,
    disableFileAccess: true, disableUrlAccess: true
  });
  const base = {
    from: {name: 'SCHMAQQ Studio', address: from},
    headers: {'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All'}
  };
  return Object.freeze({
    async sendReset({to, link}) {
      await smtp.sendMail({
        ...base, to,
        subject: 'SCHMAQQ Studio – Passwort zurücksetzen',
        text: [
          'Für dein SCHMAQQ-Studio-Konto wurde ein neues Passwort angefordert.',
          '',
          'Öffne diesen einmaligen Link innerhalb von 15 Minuten:',
          link, '',
          'Wenn du das nicht warst, ignoriere die Nachricht. Dein Passwort bleibt unverändert.',
          'Teile diesen Link mit niemandem.'
        ].join('\n')
      });
    },
    async sendChanged({to}) {
      await smtp.sendMail({
        ...base, to,
        subject: 'SCHMAQQ Studio – Passwort wurde geändert',
        text: [
          'Das Passwort deines SCHMAQQ-Studio-Kontos wurde geändert.',
          'Alle bisherigen Studio-Sitzungen und Runner-/Gerätezugänge wurden widerrufen.',
          'Falls du das nicht selbst warst, kontaktiere umgehend den Studio-Betreiber.'
        ].join('\n')
      });
    }
  });
}

export function createPasswordRecovery({db, origin, mailer = null, now = Date.now, trustedProxyIps = ''}) {
  const trusted = parseTrustedProxyIps(trustedProxyIps);
  const sources = new Map();
  const confirmationSources = new Map();
  const accounts = new Map();

  function take(map, key, limit, window, maximum) {
    const time = now();
    const current = map.get(key);
    if (!current || current.until <= time) {
      for (const [id, value] of map) if (value.until <= time) map.delete(id);
      if (map.size >= maximum) return false;
      map.set(key, {count: 1, until: time + window});
      return true;
    }
    if (current.count >= limit) return false;
    current.count++;
    return true;
  }

  function allowed(req, email) {
    // Neither spoofed X-Forwarded-For nor a shared reverse-proxy address
    // can cause unlimited mail delivery.
    const source = loginSource(req, trusted).key;
    if (!take(sources, source, 120, 60_000, 2048)) return false;
    return take(accounts, digest(email), 5, HOUR, 4096);
  }
  const get = key => db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(key)?.value;
  const put = (key, value) => db.prepare(
    'INSERT INTO workspace_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
  ).run(key, value);
  const del = key => db.prepare('DELETE FROM workspace_meta WHERE key=?').run(key);
  const member = email => db.prepare('SELECT id,email FROM members WHERE email=?').get(email);

  function request(req, email) {
    if (!mailer) return {status: 503, body: {error: 'Passwort-Wiederherstellung ist derzeit nicht eingerichtet.'}};
    if (!allowed(req, email)) return {status: 200, body: RESPONSE};
    const m = member(email);
    if (!m) return {status: 200, body: RESPONSE};

    const issued = transaction(db, () => {
      const current = Number(now());
      const old = get(memberKey(m.id));
      if (old) {
        const previous = JSON.parse(old);
        if (previous.expires > current) return null;
      }
      let limit = {start: current, count: 0};
      const saved = get(rateKey(m.id));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (current - parsed.start < HOUR) limit = parsed;
      }
      if (limit.count >= 3) return null;
      const raw = token(), hash = digest(raw), expires = current + RESET_LIFETIME_MS;
      if (old) del(tokenKey(JSON.parse(old).hash));
      put(memberKey(m.id), JSON.stringify({hash, expires}));
      put(tokenKey(hash), JSON.stringify({member: m.id, expires}));
      put(rateKey(m.id), JSON.stringify({start: limit.start, count: limit.count + 1}));
      return {hash, id: m.id, to: m.email, link: origin + '/#reset=' + raw};
    });
    if (issued) {
      // Return exactly the same response for existent and unknown accounts;
      // the SMTP network latency must not become an account-enumeration oracle.
      void Promise.resolve().then(() => mailer.sendReset({to: issued.to, link: issued.link}))
        .catch(() => {
          try {
            transaction(db, () => {
              const current = get(memberKey(issued.id));
              if (current && JSON.parse(current).hash === issued.hash) {
                del(memberKey(issued.id));
                del(tokenKey(issued.hash));
              }
            });
          } catch { /* Service may be shutting down; never leak token or account. */ }
          console.error('studio recovery: mail delivery failed');
        });
    }
    return {status: 200, body: RESPONSE};
  }

  function confirm(req, raw, newPassword) {
    // Never let anonymous callers flood SQLite with unlimited token guesses.
    const source = loginSource(req, trusted).key;
    if (!take(confirmationSources, source, 60, 60_000, 2048)) return false;
    if (!RESET_TOKEN_RE.test(raw)) return false;
    return transaction(db, () => {
      const hash = digest(raw);
      const serialized = get(tokenKey(hash));
      if (!serialized) return false;
      const claim = JSON.parse(serialized);
      const saved = get(memberKey(claim.member));
      if (!saved) return false;
      const pointer = JSON.parse(saved);
      if (pointer.hash !== hash || pointer.expires <= now() || claim.expires <= now()) return false;
      const account = db.prepare('SELECT id,email FROM members WHERE id=?').get(claim.member);
      if (!account) return false;
      db.prepare('UPDATE members SET password=? WHERE id=?').run(passwordHash(newPassword), account.id);
      db.prepare('DELETE FROM sessions WHERE member=?').run(account.id);
      // Recovery means a potential credential compromise: revoke unattended
      // runner/API device tokens too; owner must reconnect trusted devices.
      if (!claim.byOwner) {
        db.prepare('UPDATE devices SET revoked=1 WHERE owner=?').run(account.id);
        db.prepare("UPDATE jobs SET status='cancelled' WHERE status='queued' AND (owner=? OR device IN (SELECT id FROM devices WHERE owner=?))").run(account.id,account.id);
      }
      del(memberKey(account.id));
      del(tokenKey(hash));
      if (mailer?.sendChanged) {
        // Notice after successful commit, without exposing the new password.
        queueMicrotask(() => {
          void Promise.resolve().then(() => mailer.sendChanged({to: account.email}))
            .catch(() => console.error('studio recovery: change notice delivery failed'));
        });
      }
      return true;
    });
  }
  /** The owner creates a link to set a new password and hands it over directly (no mail server needed).
   * Forgetting is not a compromise: connected PCs and servers stay connected. */
  function issue(memberId, lifetime = 24 * HOUR) {
    return transaction(db, () => {
      const old = get(memberKey(memberId));
      if (old) del(tokenKey(JSON.parse(old).hash));
      const raw = token(), hash = digest(raw), expires = Number(now()) + lifetime;
      put(memberKey(memberId), JSON.stringify({hash, expires}));
      put(tokenKey(hash), JSON.stringify({member: memberId, expires, byOwner: true}));
      return origin + '/#reset=' + raw;
    });
  }
  return Object.freeze({
    available: Boolean(mailer),
    request,
    confirm,
    issue
  });
}
