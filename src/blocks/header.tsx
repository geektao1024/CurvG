import { usePathname } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

import { siteNavLinks } from './site-nav';

/**
 * The site header for every site-shell page (docs/NAVIGATION.md §3). The
 * links come from `siteNavLinks()`, shared with immersive pages and the
 * footer.
 */
export function Header() {
  // The wonders section is always dark (docs/WONDERS_PLAN.md).
  const pathname = usePathname();
  const fixedTheme =
    pathname === '/wonders' || pathname.startsWith('/wonders/');
  return (
    <SiteHeader
      navLinks={siteNavLinks()}
      ctaHref="/sign-in"
      ctaLabel={m['common.nav.sign_in']()}
      openMenuLabel={m['common.nav.open_menu']()}
      closeMenuLabel={m['common.nav.close_menu']()}
      switchLanguageLabel={m['common.nav.switch_language']()}
      toggleThemeLabel={m['common.nav.toggle_theme']()}
      userFallback={m['common.nav.user']()}
      framed
      showThemeToggle={!fixedTheme}
    />
  );
}
