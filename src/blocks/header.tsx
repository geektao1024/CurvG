import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  const navLinks = [
    { href: '/#features', label: m['landing.nav.features']() },
    { href: '/#prompt-examples', label: m['landing.nav.prompt_examples']() },
    { href: '/#workflow', label: m['landing.nav.workflow']() },
    { href: '/creator', label: m['landing.nav.playground']() },
    { href: '/#faq', label: m['landing.nav.faq']() },
  ];

  return (
    <SiteHeader
      navLinks={navLinks}
      ctaHref="/creator"
      ctaLabel={m['landing.nav.start']()}
      framed
    />
  );
}
