'use client';

import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { LocaleSelector } from '@/components/locale-selector';
import { PixelRevealLink } from '@/components/pixel-reveal-link';
import { SiteUserMenu } from '@/components/site-user-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';

export interface NavLink {
  href: string;
  label: string;
  /** Open in a new tab. Off-site (http) hrefs always open in a new tab. */
  external?: boolean;
}

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

export function SiteHeader({
  navLinks,
  ctaHref = '/settings',
  ctaLabel,
  framed = false,
}: {
  navLinks?: NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
  framed?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header
      className={cn(
        'z-50 w-full',
        framed
          ? 'bg-background relative border-b'
          : 'bg-background/90 border-border sticky top-0 border-b backdrop-blur-md'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          framed
            ? 'curvg-stage curvg-frame h-20 px-5 sm:px-10'
            : 'mx-auto h-16 max-w-6xl px-4 sm:px-6'
        )}
      >
        {/* Brand */}
        <Link href="/" className="group flex items-center gap-1.5">
          <img
            src={envConfigs.app_logo}
            alt=""
            className={cn(
              'size-8 rounded-lg',
              !framed &&
                'transition-transform duration-300 group-hover:scale-105'
            )}
          />
          <span className="text-xl font-bold tracking-[-0.03em]">
            {envConfigs.app_name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks?.map((link) => {
            if (framed && !isExternalHref(link.href)) {
              return (
                <PixelRevealLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  target={link.external ? '_blank' : undefined}
                  variant="nav-item"
                />
              );
            }

            const navLinkClass = framed
              ? 'text-foreground/82 hover:text-foreground rounded px-3 py-2 text-sm font-normal transition-colors'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md px-3 py-2 text-sm font-medium transition-colors';
            return isExternalHref(link.href) ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClass}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                className={navLinkClass}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-3 md:flex">
          <LocaleSelector />
          <ThemeToggle />
          <span className="bg-border h-5 w-px" aria-hidden />
          {user ? (
            <SiteUserMenu
              name={user.name || 'User'}
              email={user.email}
              image={user.image}
            />
          ) : framed ? (
            <PixelRevealLink
              href={ctaHref}
              label={ctaLabel ?? m['common.nav.get_started']()}
              variant="navigation"
            />
          ) : (
            <Link
              href={ctaHref}
              className={cn(
                buttonVariants(),
                'group/cta bg-foreground text-background hover:bg-foreground/90 h-9 gap-1.5 rounded-lg px-4'
              )}
            >
              {ctaLabel ?? m['common.nav.get_started']()}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-border border-t px-4 pt-2 pb-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks?.map((link) =>
              isExternalHref(link.href) ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>
          <div className="border-border mt-3 flex items-center gap-2 border-t pt-3">
            <LocaleSelector />
            <ThemeToggle />
            <div className="flex-1" />
            {user ? (
              <SiteUserMenu
                name={user.name || 'User'}
                email={user.email}
                image={user.image}
              />
            ) : framed ? (
              <PixelRevealLink
                href={ctaHref}
                label={ctaLabel ?? m['common.nav.get_started']()}
                variant="navigation"
                onClick={() => setMobileOpen(false)}
              />
            ) : (
              <Link
                href={ctaHref}
                className={cn(
                  buttonVariants(),
                  'h-9 gap-1.5 rounded-full px-4'
                )}
                onClick={() => setMobileOpen(false)}
              >
                {ctaLabel ?? m['common.nav.get_started']()}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
