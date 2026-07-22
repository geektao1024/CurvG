import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/creator', label: m['landing.nav.creator']() },
    { href: '/#gallery', label: m['landing.nav.gallery']() },
    { href: '/#workflow', label: m['landing.nav.workflow']() },
    { href: '/#faq', label: m['landing.nav.faq']() },
  ];

  return (
    <SiteHeader
      navLinks={navLinks}
      ctaHref="/creator"
      ctaLabel={m['landing.nav.creator']()}
    />
  );
}
