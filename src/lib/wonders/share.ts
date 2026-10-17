/**
 * Links that reopen a wonder exactly as the reader left it: free play, with
 * their parameters (`/wonders/lorenz-attractor?s=r:32,n:6000`). Whoever opens
 * the link lands on the same discovery, not on the story's first frame.
 *
 * Plain `key:value` pairs so a link says what it will do. Values are only
 * ever parsed by each wonder's own `apply`, which clamps them; nothing here is
 * trusted beyond its shape.
 */

export type ShareValue = string | number | boolean;
export type ShareState = Record<string, ShareValue>;

export const SHARE_PARAM = 's';

const KEY = /^[a-z]{1,8}$/;
/** Digits, sign, point, exponent, and the short words wonders use. */
const VALUE = /^[a-z0-9.+-]{1,32}$/i;
const MAX_PAIRS = 12;

function encodeValue(value: ShareValue): string | null {
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    // Trim slider float noise (0.30000000000000004) without losing deep
    // zoom coordinates, which pass their own precise string instead.
    return String(Number(value.toPrecision(10)));
  }
  return VALUE.test(value) ? value : null;
}

export function encodeShare(state: ShareState): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(state)) {
    if (pairs.length >= MAX_PAIRS || !KEY.test(key)) continue;
    const encoded = encodeValue(value);
    if (encoded !== null) pairs.push(`${key}:${encoded}`);
  }
  return pairs.join(',');
}

export function decodeShare(
  raw: string | null | undefined
): Record<string, string> | null {
  if (!raw || raw.length > 400) return null;
  const out: Record<string, string> = {};
  for (const pair of raw.split(',').slice(0, MAX_PAIRS)) {
    const at = pair.indexOf(':');
    if (at < 1) continue;
    const key = pair.slice(0, at);
    const value = pair.slice(at + 1);
    if (KEY.test(key) && VALUE.test(value)) out[key] = value;
  }
  return Object.keys(out).length ? out : null;
}

/** A finite number from a link value, clamped; `fallback` when unusable. */
export function shareNumber(
  value: string | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  const n = value === undefined ? NaN : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/** The current page URL carrying `state` (or none: the plain page). */
export function shareUrl(state: ShareState | null): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (state) {
    const packed = encodeShare(state);
    if (packed) url.searchParams.set(SHARE_PARAM, packed);
  }
  // Keep the colon and comma readable in the address bar.
  return url.toString().replace(/%3A/g, ':').replace(/%2C/g, ',');
}
