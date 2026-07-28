import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/#gallery', label: m['landing.nav.gallery']() },
    { href: '/pricing', label: m['landing.nav.pricing']() },
    { href: '/blog', label: m['landing.nav.blog']() },
    { href: '/creator', label: m['landing.nav.playground']() },
    { href: '/#faq', label: m['landing.nav.faq']() },
  ];

  return (
    <SiteHeader
      navLinks={navLinks}
      ctaHref="/sign-in"
      ctaLabel={m['common.nav.sign_in']()}
      openMenuLabel={m['common.nav.open_menu']()}
      closeMenuLabel={m['common.nav.close_menu']()}
      switchLanguageLabel={m['common.nav.switch_language']()}
      toggleThemeLabel={m['common.nav.toggle_theme']()}
      userFallback={m['common.nav.user']()}
      framed
    />
  );
}
