import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { SitePage } from '@/blocks/site-page';

/**
 * Full-page status (404, error) inside the normal site chrome, with the
 * main sections offered as a way forward instead of a dead end.
 */
export function StatusPage({
  code,
  title,
  message,
  action,
}: {
  code: string;
  title: string;
  message: string;
  /** Extra control under the message, e.g. "retry". */
  action?: ReactNode;
}) {
  const links = [
    { href: '/labs', label: m['landing.nav.labs']() },
    { href: '/curves', label: m['landing.nav.curves']() },
    { href: '/creator', label: m['landing.nav.playground']() },
  ];
  return (
    <SitePage mainClassName="curvg-stage curvg-frame relative flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="curvg-coordinate-grid pointer-events-none absolute inset-0 opacity-70" />
      <p className="text-primary relative font-mono text-xs font-semibold tracking-[0.3em]">
        {code}
      </p>
      <h1 className="curvg-heading relative mt-4 text-4xl sm:text-5xl">
        {title}
      </h1>
      <p className="text-muted-foreground relative mt-4 max-w-md leading-7">
        {message}
      </p>
      {action ? <div className="relative mt-6">{action}</div> : null}
      <nav className="relative mt-10 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="bg-foreground text-background inline-flex h-10 items-center rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          {m['common.not_found.back_home']()}
        </Link>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-card hover:border-primary/40 hover:text-primary group inline-flex h-10 items-center gap-1.5 rounded-md border px-4 text-sm transition-colors"
          >
            {link.label}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </nav>
    </SitePage>
  );
}
