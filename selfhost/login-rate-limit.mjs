import {createHash} from 'node:crypto';
import {isIP} from 'node:net';

/**
 * Login rate limits are local to one Studio process. This module never uses
 * untrusted X-Forwarded-For values as identities by default.
 *
 * Optional trusted proxies MUST be exact TCP peer addresses. The reverse
 * proxy must append or replace X-Forwarded-For, never forward the client's
 * original header unchanged.
 */
export const LOGIN_RATE_WINDOW_MS = 60_000;
export const LOGIN_ACCOUNT_LIMIT = 12;
export const LOGIN_CLIENT_LIMIT = 60;
export const LOGIN_SOCKET_LIMIT = 240;

function normalizeIp(value) {
  if (typeof value !== 'string') return null;
  const address = value.trim().toLowerCase();
  const family = isIP(address);
  if (family === 4) return address;
  if (family !== 6) return null;
  // Canonicalize IPv6: several valid spellings of the same address must
  // NEVER generate independent buckets or bypass exact trusted-peer checks.
  const canonical = new URL('http://[' + address + ']/').hostname.slice(1, -1);
  if (canonical.startsWith('::ffff:')) {
    const pair = canonical.slice(7).split(':');
    if (pair.length === 2) {
      const upper = parseInt(pair[0], 16);
      const lower = parseInt(pair[1], 16);
      return [upper >> 8, upper & 255, lower >> 8, lower & 255].join('.');
    }
  }
  return canonical;
}

export function parseTrustedProxyIps(value = '') {
  if (typeof value !== 'string') throw new Error('STUDIO_TRUSTED_PROXY_IPS must be text.');
  if (!value.trim()) return new Set();
  const entries = value.split(',');
  if (entries.length > 16) throw new Error('Too many trusted proxy addresses.');
  const trusted = new Set();
  for (const entry of entries) {
    const address = normalizeIp(entry);
    if (!address) {
      throw new Error('STUDIO_TRUSTED_PROXY_IPS must contain exact IPv4/IPv6 addresses, not CIDRs or hostnames.');
    }
    trusted.add(address);
  }
  return trusted;
}

export function loginSource(req, trustedProxies = new Set()) {
  const peer = normalizeIp(req.socket?.remoteAddress) ?? 'unknown';
  const peerIsTrusted = trustedProxies.has(peer);
  const fallback = {
    key: 'peer:' + peer,
    limit: peerIsTrusted ? LOGIN_CLIENT_LIMIT : LOGIN_SOCKET_LIMIT
  };

  if (!peerIsTrusted) return fallback;
  const header = req.headers?.['x-forwarded-for'];
  if (typeof header !== 'string' || !header || header.length > 2048) return fallback;
  const hops = header.split(',');
  if (hops.length > 16) return fallback;
  const parsed = hops.map(normalizeIp);
  if (parsed.some(ip => !ip)) return fallback;

  // Walk right-to-left, away from the immediate trusted socket peer. The
  // first untrusted hop is the real client boundary. Values before it may be
  // supplied by the client and must never influence the chosen rate key.
  for (let i = parsed.length - 1; i >= 0; i--) {
    if (!trustedProxies.has(parsed[i])) {
      return {key: 'client:' + parsed[i], limit: LOGIN_CLIENT_LIMIT};
    }
  }
  return fallback;
}

export function createLoginLimiter({
  trustedProxyIps = '',
  now = Date.now,
  windowMs = LOGIN_RATE_WINDOW_MS,
  accountLimit = LOGIN_ACCOUNT_LIMIT,
  clientLimit = LOGIN_CLIENT_LIMIT,
  socketLimit = LOGIN_SOCKET_LIMIT,
  maxAccounts = 4096,
  maxSources = 2048
} = {}) {
  const trusted = parseTrustedProxyIps(trustedProxyIps);
  const accountBuckets = new Map();
  const sourceBuckets = new Map();

  function take(map, key, limit, maxEntries) {
    const time = now();
    let bucket = map.get(key);
    if (bucket?.until <= time) {
      map.delete(key);
      bucket = null;
    }
    if (!bucket && map.size >= maxEntries) {
      // No timer and no unbounded attacker-controlled identifiers in memory.
      for (const [id, value] of map) if (value.until <= time) map.delete(id);
      if (map.size >= maxEntries) return false;
    }
    if (!bucket) {
      map.set(key, {count: 1, until: time + windowMs});
      return true;
    }
    if (bucket.count >= limit) return false;
    bucket.count++;
    return true;
  }

  return Object.freeze({
    consumeSource(req) {
      const {key} = loginSource(req, trusted);
      // An untrusted socket may represent an entire proxy; avoid a low
      // shared cap. Trusted forwarders and real direct clients use the
      // stricter independent-client cap.
      const limit = key.startsWith('peer:') && !trusted.has(key.slice(5))
        ? socketLimit : clientLimit;
      return take(sourceBuckets, key, limit, maxSources);
    },
    consumeAccount(email) {
      // Keep the normalized account identifier out of the in-memory key.
      const normalized = String(email).trim().toLowerCase();
      const key = createHash('sha256').update(normalized).digest('hex');
      return take(accountBuckets, key, accountLimit, maxAccounts);
    }
  });
}
