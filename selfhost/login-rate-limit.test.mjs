import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoginLimiter, loginSource, parseTrustedProxyIps,
  LOGIN_ACCOUNT_LIMIT, LOGIN_CLIENT_LIMIT, LOGIN_SOCKET_LIMIT
} from './login-rate-limit.mjs';

function req(peer = '127.0.0.1', forwardedFor) {
  return {
    socket: {remoteAddress: peer},
    headers: forwardedFor === undefined ? {} : {'x-forwarded-for': forwardedFor}
  };
}

test('limits an email independently of other members behind one proxy socket', () => {
  let time = 1000;
  const limit = createLoginLimiter({now: () => time});
  for (let i = 0; i < LOGIN_ACCOUNT_LIMIT; i++) {
    assert.equal(limit.consumeSource(req()), true);
    assert.equal(limit.consumeAccount('  Owner@Fixture.Invalid '), true);
  }
  assert.equal(limit.consumeSource(req()), true);
  assert.equal(limit.consumeAccount('owner@fixture.invalid'), false);
  assert.equal(limit.consumeAccount('member@fixture.invalid'), true);
  assert.equal(limit.consumeSource(req()), true);
  time += 60_001;
  assert.equal(limit.consumeAccount('OWNER@FIXTURE.INVALID'), true);
  assert.equal(limit.consumeSource(req()), true);
});

test('ignores arbitrary forwarded address headers from an untrusted socket', () => {
  const trusted = parseTrustedProxyIps('');
  assert.deepEqual(loginSource(req('127.0.0.1', '203.0.113.7'), trusted),
    {key: 'peer:127.0.0.1', limit: LOGIN_SOCKET_LIMIT});
  const limit = createLoginLimiter();
  for (let i = 0; i < LOGIN_SOCKET_LIMIT; i++) {
    assert.equal(limit.consumeSource(req('127.0.0.1', '203.0.113.' + (i % 200 + 1))), true);
  }
  assert.equal(limit.consumeSource(req('127.0.0.1', '192.0.2.99')), false);
});

test('trusts only configured exact proxy peers, not forwarded spoofed prefixes', () => {
  const trusted = parseTrustedProxyIps('127.0.0.1, ::1');
  assert.equal(trusted.has('127.0.0.1'), true);
  const leftSpoof = req('127.0.0.1', '198.51.100.19, 203.0.113.8');
  assert.deepEqual(loginSource(leftSpoof, trusted),
    {key: 'client:203.0.113.8', limit: LOGIN_CLIENT_LIMIT});
  assert.deepEqual(loginSource(req('127.0.0.1','198.51.100.19, ::1, 203.0.113.8'),trusted),
    {key:'client:203.0.113.8',limit:LOGIN_CLIENT_LIMIT});

  const limiter=createLoginLimiter({trustedProxyIps:'127.0.0.1'});
  for(let i=0; i<LOGIN_CLIENT_LIMIT;i++){
    const header='198.51.100.'+(i%100+1)+',203.0.113.8';
    assert.equal(limiter.consumeSource(req('127.0.0.1', header)), true);
  }
  assert.equal(limiter.consumeSource(req('127.0.0.1','192.0.2.77,203.0.113.8')), false);
  assert.equal(limiter.consumeSource(req('127.0.0.1','203.0.113.9')), true);
});

test('invalid forwarded chain does not create an attacker-chosen rate key', () => {
  const trusted=parseTrustedProxyIps('127.0.0.1');
  for(const chain of [
    'not-an-ip', '198.51.100.1, garbage',
    '198.51.100.1,', ''.padEnd(3000,'0'),
    Array(17).fill('198.51.100.1').join(','),
    '127.0.0.1'
  ]){
    assert.deepEqual(loginSource(req('127.0.0.1',chain),trusted),
      {key:'peer:127.0.0.1',limit:LOGIN_CLIENT_LIMIT});
  }
  assert.deepEqual(loginSource(req('::ffff:127.0.0.1','203.0.113.10'),trusted),
    {key:'client:203.0.113.10',limit:LOGIN_CLIENT_LIMIT});
});

test('rejects broad or invalid proxy trust settings before starting Studio', () => {
  for (const bad of [
    '0.0.0.0/0', '127.0.0.1/32', '*', 'traefik.local',
    '127.0.0.1,', '127.0.0.1,not-ip', Array(17).fill('127.0.0.1').join(',')
  ]) assert.throws(() => parseTrustedProxyIps(bad),/proxy/i);
  assert.equal(parseTrustedProxyIps('::ffff:127.0.0.1').has('127.0.0.1'),true);
});

test('IPv6 spellings and IPv4-mapped aliases never create extra buckets', () => {
  const trusted = parseTrustedProxyIps('2001:db8::10, ::ffff:127.0.0.1');
  assert.equal(trusted.has('127.0.0.1'), true);
  assert.deepEqual(loginSource(req('2001:0DB8:0:0:0:0:0:10', '2001:0DB8::11'),trusted),
    {key:'client:2001:db8::11',limit:LOGIN_CLIENT_LIMIT});
  const limiter = createLoginLimiter({trustedProxyIps:'127.0.0.1'});
  for(let i=0; i<LOGIN_CLIENT_LIMIT;i++){
    const variants=i%2?'2001:0db8:0:0:0:0:0:1':'2001:db8::1';
    assert.equal(limiter.consumeSource(req('127.0.0.1',variants)), true);
  }
  assert.equal(limiter.consumeSource(req('127.0.0.1','2001:DB8::1')), false);
  assert.deepEqual(loginSource(req('0:0:0:0:0:ffff:7f00:1','203.0.113.4'),trusted),
    {key:'client:203.0.113.4',limit:LOGIN_CLIENT_LIMIT});
});

test('enforces a bounded account and source map, pruning expired entries', () => {
  let time=0;
  const limiter=createLoginLimiter({
    now:()=>time,maxAccounts:2,maxSources:2,accountLimit:3,socketLimit:3
  });
  assert.equal(limiter.consumeAccount('a@example.invalid'),true);
  assert.equal(limiter.consumeAccount('b@example.invalid'),true);
  assert.equal(limiter.consumeAccount('c@example.invalid'),false);
  assert.equal(limiter.consumeAccount('a@example.invalid'),true);
  assert.equal(limiter.consumeSource(req('203.0.113.1')),true);
  assert.equal(limiter.consumeSource(req('203.0.113.2')),true);
  assert.equal(limiter.consumeSource(req('203.0.113.3')),false);
  time+=60_001;
  assert.equal(limiter.consumeAccount('c@example.invalid'),true);
  assert.equal(limiter.consumeSource(req('203.0.113.3')),true);
});
