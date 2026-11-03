import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveTouch,
  FIRST_TOUCH_COOKIE,
  LAST_TOUCH_COOKIE,
  orderAttribution,
  parseTouchCookie,
  renewalAttribution,
  serializeTouch,
  type Touch,
} from '../src/lib/attribution';

const OWN = ['curvg.com', 'www.curvg.com'];
const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);

function touch(href: string, referrer = '') {
  return deriveTouch({ href, referrer, ownHosts: OWN, now: NOW });
}

function cookieHeader(ft?: Touch, lt?: Touch) {
  const parts = ['PARAGLIDE_LOCALE=en'];
  if (ft) parts.push(`${FIRST_TOUCH_COOKIE}=${serializeTouch(ft)}`);
  if (lt) parts.push(`${LAST_TOUCH_COOKIE}=${serializeTouch(lt)}`);
  return parts.join('; ');
}

// Spec §7, cases 1–7 (CartoVoxel ADR-0010 §6).

test('1. utm_source + ref + utm_medium', () => {
  const t = touch(
    'https://curvg.com/?ref=taaft&utm_source=taaft&utm_medium=referral'
  );
  assert.equal(t.s, 'taaft');
  assert.equal(t.m, 'referral');
});

test('2. utm_source wins over ref', () => {
  const t = touch('https://curvg.com/?ref=taaft_feat&utm_source=taaft_feat');
  assert.equal(t.s, 'taaft_feat');
});

test('3. ref alone is a referral', () => {
  const t = touch('https://curvg.com/labs?ref=producthunt');
  assert.equal(t.s, 'producthunt');
  assert.equal(t.m, 'referral');
  assert.equal(t.l, '/labs');
});

test('4. google ccTLD is organic; gemini is ai', () => {
  const g = touch('https://curvg.com/', 'https://www.google.co.uk/');
  assert.deepEqual([g.s, g.m, g.r], ['google', 'organic', 'google.co.uk']);
  const gem = touch('https://curvg.com/', 'https://gemini.google.com/');
  assert.deepEqual([gem.s, gem.m], ['gemini', 'ai']);
});

test('5. empty or same-site referrer is direct', () => {
  for (const ref of [
    '',
    'https://curvg.com/pricing',
    'https://www.curvg.com/',
  ]) {
    const t = touch('https://curvg.com/zh/labs/geometry', ref);
    assert.equal(t.s, 'direct');
    assert.equal(t.m, '');
    assert.equal(t.r, '');
    assert.equal(t.l, '/zh/labs/geometry');
  }
});

test('6. hostile values are cleaned and truncated', () => {
  const long = 'a'.repeat(300);
  const t = touch(
    `https://curvg.com/${long}?utm_source=<script>alert(1)</script>&utm_campaign=${'c'.repeat(150)}`
  );
  assert.equal(t.s, 'scriptalert1script');
  assert.ok(t.l.length <= 200);
  assert.equal(t.c.length, 100);

  const forged = parseTouchCookie(
    encodeURIComponent(
      JSON.stringify({
        v: 1,
        s: 'Chat<GPT>',
        m: 'AI"',
        l: '/a b<c>',
        r: 'X.COM',
        t: NOW,
      })
    )
  );
  assert.deepEqual(forged && [forged.s, forged.m, forged.l, forged.r], [
    'chatgpt',
    'ai',
    '/abc',
    'x.com',
  ]);
});

test('7. broken cookies parse to null', () => {
  assert.equal(parseTouchCookie('%7Bnot json'), null);
  assert.equal(parseTouchCookie(''), null);
  assert.equal(parseTouchCookie(undefined), null);
  assert.equal(
    parseTouchCookie(
      encodeURIComponent(JSON.stringify({ v: 2, s: 'x', t: 1 }))
    ),
    null
  );
  assert.equal(
    parseTouchCookie(
      encodeURIComponent(JSON.stringify({ v: 1, s: 'x', t: 'yesterday' }))
    ),
    null
  );
  assert.equal(
    parseTouchCookie(encodeURIComponent(JSON.stringify({ v: 1, s: '', t: 1 }))),
    null
  );
});

// Spec §7, cases 8–11 (the shared version).

test('8. utm_source=chatgpt.com maps to chatgpt; brave is organic', () => {
  const c = touch('https://curvg.com/labs/geometry?utm_source=chatgpt.com');
  assert.deepEqual([c.s, c.m, c.l], ['chatgpt', 'ai', '/labs/geometry']);
  const viaReferrer = touch('https://curvg.com/', 'https://chatgpt.com/');
  assert.deepEqual([viaReferrer.s, viaReferrer.m], ['chatgpt', 'ai']);
  const b = touch('https://curvg.com/', 'https://search.brave.com/');
  assert.deepEqual([b.s, b.m], ['brave', 'organic']);
  const bare = touch('https://curvg.com/?utm_source=perplexity');
  assert.deepEqual([bare.s, bare.m], ['perplexity', 'ai']);
  // An explicit utm_medium still wins over the table default.
  const tagged = touch(
    'https://curvg.com/?utm_source=chatgpt.com&utm_medium=cpc'
  );
  assert.deepEqual([tagged.s, tagged.m], ['chatgpt', 'cpc']);
});

test('own-flow referrers (payment, Google sign-in) are not a new source', () => {
  for (const ref of [
    'https://checkout.stripe.com/c/pay/cs_live_x',
    'https://accounts.google.com/',
    'https://www.creem.io/checkout',
  ]) {
    assert.equal(touch('https://curvg.com/settings/billing', ref).s, 'direct');
  }
  // Organic Google search is still Google.
  assert.equal(
    touch('https://curvg.com/', 'https://www.google.com/').s,
    'google'
  );
});

test('9. order uses the user row first touch, not the cookie', () => {
  const cookieFt = touch('https://curvg.com/pricing', 'https://www.bing.com/');
  const lt = touch('https://curvg.com/labs', 'https://chatgpt.com/');
  const result = orderAttribution({
    user: {
      createdAt: new Date(NOW - 86_400_000),
      ftSource: 'chatgpt',
      ftMedium: 'ai',
      ftCampaign: '',
      ftLandingPath: '/labs/geometry',
      ftReferrer: 'chatgpt.com',
      ftAt: new Date(NOW - 90_000_000),
    },
    cookieHeader: cookieHeader(cookieFt, lt),
  });
  assert.equal(result.ftSource, 'chatgpt');
  assert.equal(result.ftLandingPath, '/labs/geometry');
  assert.equal(result.ltSource, 'chatgpt');
  assert.equal(result.ltLandingPath, '/labs');
  assert.equal(result.ltAt?.getTime(), NOW);
});

test('10. empty user row: cookie only if it predates the account', () => {
  const ft = touch('https://curvg.com/', 'https://chatgpt.com/');
  const older = orderAttribution({
    user: { createdAt: new Date(NOW + 60_000), ftSource: '' },
    cookieHeader: cookieHeader(ft),
  });
  assert.equal(older.ftSource, 'chatgpt');
  assert.equal(older.ftAt?.getTime(), NOW);

  // Within the 10-minute clock slack still counts.
  const slack = orderAttribution({
    user: { createdAt: new Date(NOW - 5 * 60_000), ftSource: '' },
    cookieHeader: cookieHeader(ft),
  });
  assert.equal(slack.ftSource, 'chatgpt');

  // An account from before attribution shipped: the cookie is newer.
  const legacy = orderAttribution({
    user: { createdAt: new Date(NOW - 11 * 60_000), ftSource: '' },
    cookieHeader: cookieHeader(ft),
  });
  assert.equal(legacy.ftSource, '');
  assert.equal(legacy.ftLandingPath, '');
  assert.equal(legacy.ftAt, null);

  // User row could not be read: unknown, not a guess.
  const unread = orderAttribution({
    user: null,
    cookieHeader: cookieHeader(ft),
  });
  assert.equal(unread.ftSource, '');
});

test('11. renewal copies the user row and leaves last touch empty', () => {
  const user = {
    ftSource: 'google',
    ftMedium: 'organic',
    ftCampaign: '',
    ftLandingPath: '/curves/heart-curve',
    ftReferrer: 'google.com',
    ftAt: NOW - 1000,
  };
  const result = renewalAttribution(user);
  assert.equal(result.ftSource, 'google');
  assert.equal(result.ftLandingPath, '/curves/heart-curve');
  assert.equal(result.ftAt?.getTime(), NOW - 1000);
  assert.deepEqual(
    [result.ltSource, result.ltLandingPath, result.ltAt],
    ['', '', null]
  );
  assert.equal(renewalAttribution(null).ftSource, '');
});
