'use client';

import { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { LocaleSelector } from '@/components/locale-selector';
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
}: {
  navLinks?: NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="bg-background/92 sticky top-0 z-50 w-full shadow-[0_10px_30px_-18px_rgba(0,0,0,0.55)] backdrop-blur-md">
      {/* 黑板托盘线：底部双层边——细实线 + 虚线粉笔感 */}
      <div className="border-border/70 pointer-events-none absolute inset-x-0 bottom-0 border-b" />
      <div className="border-border/45 pointer-events-none absolute inset-x-3 bottom-[3px] border-b border-dashed sm:inset-x-6" />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand：hover 时 logo 如粉笔盒里被拿起，轻微倾斜 */}
        <Link href="/" className="group flex items-center gap-2.5">
          <img
            src={envConfigs.app_logo}
            alt=""
            className="size-8 rounded-lg shadow-[0_2px_10px_-2px_rgba(125,216,192,0.35)] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6"
          />
          <span className="text-lg font-semibold tracking-[-0.03em]">
            {envConfigs.app_name}
            <span className="text-accent transition-opacity duration-300 group-hover:opacity-100 md:opacity-0">
              .
            </span>
          </span>
        </Link>

        {/* Desktop nav：hover 划出粉笔下划线 */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks?.map((link) => {
            const navLinkClass =
              'text-muted-foreground hover:text-foreground relative rounded-md px-3 py-2 text-sm transition-colors ' +
              'after:absolute after:inset-x-3 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-primary/70 ' +
              'after:transition-transform after:duration-300 hover:after:scale-x-100';
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
          ) : (
            <Link
              href={ctaHref}
              className={cn(
                buttonVariants(),
                'group/cta h-9 gap-1.5 rounded-full px-4 shadow-[0_6px_20px_-8px_rgba(125,216,192,0.55)] transition-all hover:-rotate-1 hover:shadow-[0_8px_24px_-8px_rgba(125,216,192,0.7)]'
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
