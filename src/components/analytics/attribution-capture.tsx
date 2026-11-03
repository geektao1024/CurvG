import { useEffect } from 'react';

import {
  deriveTouch,
  FIRST_TOUCH_COOKIE,
  FIRST_TOUCH_DAYS,
  isAiTouch,
  LAST_TOUCH_COOKIE,
  LAST_TOUCH_DAYS,
  parseTouchCookie,
  serializeTouch,
  type Touch,
} from '@/lib/attribution';
import { getCookie } from '@/lib/cookie';

const AI_REFERRAL_SESSION_KEY = 'cg_ai_ref';

function writeCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86_400_000).toUTCString();
  // Lax, not Strict: the Google sign-in callback is a cross-site navigation
  // back to us and must still carry the cookie. Script-written, so it
  // cannot be HttpOnly; it only holds a source name, a path and a time.
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

type Gtag = (...args: unknown[]) => void;

/** GA4 user properties and the one-per-session AI referral event. */
function reportToAnalytics(first: Touch, current: Touch) {
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('set', 'user_properties', {
    first_source: first.s,
    first_medium: first.m || '(none)',
    first_ai: isAiTouch(first) ? first.s : '(none)',
  });
  if (!isAiTouch(current)) return;
  try {
    if (window.sessionStorage.getItem(AI_REFERRAL_SESSION_KEY)) return;
    window.sessionStorage.setItem(AI_REFERRAL_SESSION_KEY, '1');
  } catch {
    // Storage blocked: still report, at worst once per page load.
  }
  gtag('event', 'ai_referral', {
    ai_source: current.s,
    landing_page: current.l,
  });
}

/**
 * Records where a visitor came from (src/lib/attribution.ts): cg_ft on the
 * first visit (never overwritten), cg_lt on every non-direct visit. The
 * server copies them onto the user row at sign-up and onto orders at
 * checkout. Runs once per document load: client-side navigation keeps the
 * original document.referrer, so re-running it would re-credit the same
 * referrer to later pages.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      const current = deriveTouch({
        href: window.location.href,
        referrer: document.referrer,
        ownHosts: [window.location.hostname, 'curvg.com', 'www.curvg.com'],
        now: Date.now(),
      });
      const value = serializeTouch(current);
      let first = parseTouchCookie(getCookie(FIRST_TOUCH_COOKIE));
      if (!first) {
        writeCookie(FIRST_TOUCH_COOKIE, value, FIRST_TOUCH_DAYS);
        first = current;
      }
      if (current.s !== 'direct') {
        writeCookie(LAST_TOUCH_COOKIE, value, LAST_TOUCH_DAYS);
      }
      reportToAnalytics(first, current);
    } catch {
      // Best effort only: attribution never breaks a page.
    }
  }, []);

  return null;
}
