/**
 * Traffic source attribution (docs/GPT_TRAFFIC_CHECKLIST.md; spec:
 * Site-Analysis docs/specs/通用/2026-10-23-traffic-source-attribution.zh.md).
 *
 * Pure functions shared by the browser (AttributionCapture writes the
 * cg_ft / cg_lt cookies) and the server (reads them back when a user or an
 * order row is created). No DOM, Node or database APIs here.
 */

export const FIRST_TOUCH_COOKIE = 'cg_ft';
export const LAST_TOUCH_COOKIE = 'cg_lt';
export const FIRST_TOUCH_DAYS = 180;
export const LAST_TOUCH_DAYS = 30;
/** Browser clock slack when comparing a touch with the account's creation. */
export const FIRST_TOUCH_CLOCK_SLACK_MS = 10 * 60_000;

export type Touch = {
  v: 1;
  /** source: chatgpt, google, direct, a utm_source value, a referrer host */
  s: string;
  /** medium: ai, organic, social, referral, a utm_medium value, or '' */
  m: string;
  /** utm_campaign */
  c: string;
  /** landing path, no query or hash, locale prefix kept */
  l: string;
  /** referrer host */
  r: string;
  /** touch time, epoch ms */
  t: number;
};

function clean(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]/g, '')
    .slice(0, max);
}

function cleanPath(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^A-Za-z0-9/_.~%-]/g, '').slice(0, 200);
}

function cleanHost(value: string) {
  return clean(value.replace(/^www\./, ''), 100);
}

type KnownReferrer = { s: string; m: string; match: (host: string) => boolean };

const sameOrSub = (domain: string) => (host: string) =>
  host === domain || host.endsWith(`.${domain}`);

// `google.co.uk`, `news.google.com`, `pinterest.de`, ...
const anyTld = (label: string) => (host: string) =>
  new RegExp(`(^|\\.)${label}\\.[a-z.]+$`).test(host);

// Order matters: first match wins (gemini before google).
const KNOWN_REFERRERS: KnownReferrer[] = [
  { s: 'gemini', m: 'ai', match: sameOrSub('gemini.google.com') },
  { s: 'google', m: 'organic', match: anyTld('google') },
  { s: 'bing', m: 'organic', match: sameOrSub('bing.com') },
  { s: 'duckduckgo', m: 'organic', match: sameOrSub('duckduckgo.com') },
  { s: 'yandex', m: 'organic', match: anyTld('yandex') },
  { s: 'baidu', m: 'organic', match: sameOrSub('baidu.com') },
  { s: 'yahoo', m: 'organic', match: sameOrSub('search.yahoo.com') },
  { s: 'brave', m: 'organic', match: sameOrSub('search.brave.com') },
  { s: 'ecosia', m: 'organic', match: sameOrSub('ecosia.org') },
  {
    s: 'chatgpt',
    m: 'ai',
    match: (h) => sameOrSub('chatgpt.com')(h) || h === 'chat.openai.com',
  },
  { s: 'perplexity', m: 'ai', match: sameOrSub('perplexity.ai') },
  { s: 'claude', m: 'ai', match: sameOrSub('claude.ai') },
  {
    s: 'copilot',
    m: 'ai',
    match: (h) =>
      sameOrSub('copilot.microsoft.com')(h) || sameOrSub('copilot.com')(h),
  },
  { s: 'deepseek', m: 'ai', match: sameOrSub('deepseek.com') },
  { s: 'doubao', m: 'ai', match: sameOrSub('doubao.com') },
  { s: 'grok', m: 'ai', match: sameOrSub('grok.com') },
  {
    s: 'taaft',
    m: 'referral',
    match: sameOrSub('theresanaiforthat.com'),
  },
  {
    s: 'youtube',
    m: 'social',
    match: (h) => sameOrSub('youtube.com')(h) || h === 'youtu.be',
  },
  { s: 'reddit', m: 'social', match: sameOrSub('reddit.com') },
  {
    s: 'x',
    m: 'social',
    match: (h) =>
      h === 't.co' || sameOrSub('x.com')(h) || sameOrSub('twitter.com')(h),
  },
  { s: 'pinterest', m: 'social', match: anyTld('pinterest') },
];

// Coming back from a payment page or a Google sign-in is part of our own
// flow, not a new source: treated like a same-site referrer so it never
// becomes a touch (CartoVoxel ADR-0024 found orders with lt_source =
// checkout.stripe.com; accounts.google.com would otherwise read as google).
const OWN_FLOW_HOSTS = [
  sameOrSub('stripe.com'),
  sameOrSub('paypal.com'),
  sameOrSub('creem.io'),
  (h: string) => h === 'accounts.google.com',
];

export function isOwnFlowHost(host: string) {
  return OWN_FLOW_HOSTS.some((match) => match(host));
}

export function knownSource(host: string) {
  return KNOWN_REFERRERS.find((k) => k.match(host));
}

function referrerHost(referrer: string) {
  if (!referrer) return '';
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function deriveTouch(input: {
  href: string;
  referrer: string;
  ownHosts: string[];
  now: number;
}): Touch {
  let url: URL;
  try {
    url = new URL(input.href);
  } catch {
    url = new URL('https://invalid.local/');
  }
  const params = url.searchParams;
  const host = referrerHost(input.referrer);
  const ownHosts = input.ownHosts.map((h) =>
    h.toLowerCase().replace(/^www\./, '')
  );
  const isOwn = !host || ownHosts.includes(host) || isOwnFlowHost(host);
  const r = isOwn ? '' : cleanHost(host);

  const utmSource = clean(params.get('utm_source'), 50);
  const ref = clean(params.get('ref'), 50);
  const utmMedium = clean(params.get('utm_medium'), 50);
  const c = clean(params.get('utm_campaign'), 100);
  const l = cleanPath(url.pathname);

  let s: string;
  let defaultMedium: string;
  if (utmSource || ref) {
    // ChatGPT appends utm_source=chatgpt.com: map known hosts to the same
    // name the referrer path would give, so one assistant is one row.
    // A bare table name (utm_source=chatgpt) keeps the table's medium too.
    const tagged = utmSource || ref;
    const known =
      knownSource(tagged.replace(/^www\./, '')) ??
      KNOWN_REFERRERS.find((k) => k.s === tagged);
    s = known ? known.s : tagged;
    defaultMedium = known ? known.m : 'referral';
  } else if (isOwn) {
    s = 'direct';
    defaultMedium = '';
  } else {
    const known = knownSource(host);
    s = known ? known.s : clean(host, 50);
    defaultMedium = known ? known.m : 'referral';
  }

  return {
    v: 1,
    s: s || 'direct',
    m: utmMedium || defaultMedium,
    c,
    l,
    r,
    t: input.now,
  };
}

export function serializeTouch(touch: Touch): string {
  return encodeURIComponent(JSON.stringify(touch));
}

/** Never trust the browser: every field is cleaned again on the way in. */
export function parseTouchCookie(raw: string | undefined | null): Touch | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(decodeURIComponent(raw));
    if (!data || typeof data !== 'object' || data.v !== 1) return null;
    if (typeof data.t !== 'number' || !Number.isFinite(data.t)) return null;
    const s = clean(data.s, 50);
    if (!s) return null;
    return {
      v: 1,
      s,
      m: clean(data.m, 50),
      c: clean(data.c, 100),
      l: cleanPath(data.l),
      r: cleanHost(typeof data.r === 'string' ? data.r : ''),
      t: data.t,
    };
  } catch {
    return null;
  }
}

function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return undefined;
}

export function readTouchCookies(cookieHeader: string | null | undefined) {
  return {
    ft: parseTouchCookie(readCookie(cookieHeader, FIRST_TOUCH_COOKIE)),
    lt: parseTouchCookie(readCookie(cookieHeader, LAST_TOUCH_COOKIE)),
  };
}

/** The six first-touch columns on `user` and `order`. */
export type FirstTouchFields = {
  ftSource: string;
  ftMedium: string;
  ftCampaign: string;
  ftLandingPath: string;
  ftReferrer: string;
  ftAt: Date | null;
};

/** All nine attribution columns on `order`. */
export type OrderAttribution = FirstTouchFields & {
  ltSource: string;
  ltLandingPath: string;
  ltAt: Date | null;
};

export const EMPTY_FIRST_TOUCH: FirstTouchFields = {
  ftSource: '',
  ftMedium: '',
  ftCampaign: '',
  ftLandingPath: '',
  ftReferrer: '',
  ftAt: null,
};

export function firstTouchFromTouch(touch: Touch | null): FirstTouchFields {
  if (!touch) return { ...EMPTY_FIRST_TOUCH };
  return {
    ftSource: touch.s,
    ftMedium: touch.m,
    ftCampaign: touch.c,
    ftLandingPath: touch.l,
    ftReferrer: touch.r,
    ftAt: new Date(touch.t),
  };
}

export type UserFirstTouch = {
  createdAt?: Date | string | number | null;
  ftSource?: string | null;
  ftMedium?: string | null;
  ftCampaign?: string | null;
  ftLandingPath?: string | null;
  ftReferrer?: string | null;
  ftAt?: Date | string | number | null;
};

function toDate(value: Date | string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** First touch copied from a user row (renewals have no browser request). */
export function firstTouchFromUser(
  user: UserFirstTouch | null | undefined
): FirstTouchFields {
  if (!user?.ftSource) return { ...EMPTY_FIRST_TOUCH };
  return {
    ftSource: user.ftSource,
    ftMedium: user.ftMedium || '',
    ftCampaign: user.ftCampaign || '',
    ftLandingPath: user.ftLandingPath || '',
    ftReferrer: user.ftReferrer || '',
    ftAt: toDate(user.ftAt),
  };
}

/**
 * Attribution for a new order.
 *
 * First touch prefers the user row (consistent across devices). When the
 * row is empty, the cookie is used only if it was written before the
 * account existed: an account created before attribution shipped has an
 * empty row, and a cookie written afterwards records its first visit since
 * then, not how the person first found CurvG. Last touch only ever comes
 * from the request cookie.
 */
export function orderAttribution({
  user,
  cookieHeader,
}: {
  user?: UserFirstTouch | null;
  cookieHeader: string | null | undefined;
}): OrderAttribution {
  const { ft, lt } = readTouchCookies(cookieHeader);
  let first = firstTouchFromUser(user);
  if (!first.ftSource && ft) {
    // No user row (read failed): unknown, rather than a guess.
    const createdAt = toDate(user?.createdAt)?.getTime();
    const cookieIsOlder =
      createdAt !== undefined && ft.t <= createdAt + FIRST_TOUCH_CLOCK_SLACK_MS;
    if (cookieIsOlder) first = firstTouchFromTouch(ft);
  }
  return {
    ...first,
    ltSource: lt?.s || '',
    ltLandingPath: lt?.l || '',
    ltAt: lt ? new Date(lt.t) : null,
  };
}

/**
 * Renewal orders come from a webhook, with no browser request: first touch
 * is copied from the user row and last touch stays empty.
 */
export function renewalAttribution(
  user: UserFirstTouch | null | undefined
): OrderAttribution {
  return {
    ...firstTouchFromUser(user),
    ltSource: '',
    ltLandingPath: '',
    ltAt: null,
  };
}

/** Assistants whose visits count as AI referrals (GA4 `first_ai`). */
export function isAiTouch(touch: Pick<Touch, 'm'> | null | undefined) {
  return touch?.m === 'ai';
}
