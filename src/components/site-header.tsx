'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
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
  /** A dropdown under the link: columns of links, plus an optional footer link. */
  menu?: NavMenu;
}

export interface NavMenuLink {
  href: string;
  label: string;
  /** One short line under the label. */
  note?: string;
}

export interface NavMenuGroup {
  title?: string;
  /** The group title links to the next-level hub (e.g. a subject page). */
  href?: string;
  links: NavMenuLink[];
}

export interface NavMenu {
  groups: NavMenuGroup[];
  footer?: NavMenuLink;
}

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

/** A nav link is current on its own page and anything under it (/labs/…). */
export function isCurrent(href: string, pathname: string) {
  if (href.includes('#') || isExternalHref(href)) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A top-level item is current anywhere in its section, dropdown included. */
export function menuCurrent(link: NavLink, pathname: string) {
  return (
    isCurrent(link.href, pathname) ||
    !!link.menu?.groups.some(
      (group) =>
        (group.href && isCurrent(group.href, pathname)) ||
        group.links.some((item) => isCurrent(item.href, pathname))
    )
  );
}

export function SiteHeader({
  navLinks,
  ctaHref = '/settings',
  ctaLabel,
  openMenuLabel = 'Open menu',
  closeMenuLabel = 'Close menu',
  switchLanguageLabel = 'Switch language',
  toggleThemeLabel = 'Toggle theme',
  userFallback = 'User',
  framed = false,
  showThemeToggle = true,
}: {
  navLinks?: NavLink[];
  ctaHref?: string;
  ctaLabel?: string;
  openMenuLabel?: string;
  closeMenuLabel?: string;
  switchLanguageLabel?: string;
  toggleThemeLabel?: string;
  userFallback?: string;
  framed?: boolean;
  /** Off on pages with a fixed theme, where the toggle would do nothing. */
  showThemeToggle?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();

  // A hairline shadow once the page moves under the sticky header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The mobile menu closes on navigation and on Escape.
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        'border-border sticky top-0 z-50 w-full border-b backdrop-blur-md transition-shadow duration-300',
        framed ? 'bg-background/88' : 'bg-background/90',
        'data-[scrolled]:shadow-[0_8px_24px_-18px_rgba(29,35,33,0.35)]'
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
        <Link href="/" className="group flex items-center gap-2.5">
          <img
            src={envConfigs.app_logo}
            alt=""
            className={cn(
              'size-8 rounded-lg',
              !framed &&
                'transition-transform duration-300 group-hover:scale-105'
            )}
          />
          <span className="font-heading text-xl font-semibold tracking-[0.01em]">
            {envConfigs.app_name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks?.map((link) => {
            if (link.menu) {
              return (
                <NavDropdown
                  key={link.href}
                  link={link}
                  menu={link.menu}
                  current={menuCurrent(link, pathname)}
                  isCurrent={(href) => isCurrent(href, pathname)}
                />
              );
            }
            if (framed && !isExternalHref(link.href)) {
              return (
                <PixelRevealLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  target={link.external ? '_blank' : undefined}
                  variant="nav-item"
                  current={isCurrent(link.href, pathname)}
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
        <div className="hidden items-center gap-3 lg:flex">
          <LocaleSelector switchLabel={switchLanguageLabel} />
          {showThemeToggle ? <ThemeToggle label={toggleThemeLabel} /> : null}
          <span className="bg-border h-5 w-px" aria-hidden />
          {user ? (
            <SiteUserMenu
              name={user.name || userFallback}
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
          className="p-2 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? closeMenuLabel : openMenuLabel}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-border border-t px-4 pt-2 pb-4 lg:hidden">
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
                <div key={link.href}>
                  <Link
                    href={link.href}
                    target={link.external ? '_blank' : undefined}
                    aria-current={
                      menuCurrent(link, pathname) ? 'page' : undefined
                    }
                    className="text-muted-foreground hover:bg-accent hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:text-primary block rounded-md px-3 py-2.5 text-[15px] transition-colors"
                  >
                    {link.label}
                  </Link>
                  {link.menu ? (
                    <div className="border-border mt-1 ml-3 flex flex-col border-l pl-2">
                      {link.menu.groups.map((group, gi) => (
                        <div key={group.title ?? gi} className="flex flex-col">
                          {group.title ? (
                            group.href ? (
                              <Link
                                href={group.href}
                                aria-current={
                                  pathname === group.href ? 'page' : undefined
                                }
                                className="text-muted-foreground aria-[current=page]:text-primary px-3 pt-2 pb-1 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase"
                              >
                                {group.title}
                              </Link>
                            ) : (
                              <p className="text-muted-foreground px-3 pt-2 pb-1 font-mono text-[11px] font-semibold tracking-[0.14em] uppercase">
                                {group.title}
                              </p>
                            )
                          ) : null}
                          {group.links.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              aria-current={
                                isCurrent(item.href, pathname)
                                  ? 'page'
                                  : undefined
                              }
                              className="text-muted-foreground hover:text-foreground aria-[current=page]:text-primary rounded-md px-3 py-2 text-sm transition-colors"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      ))}
                      {link.menu.footer ? (
                        <Link
                          href={link.menu.footer.href}
                          className="text-primary rounded-md px-3 py-2 text-sm font-medium"
                        >
                          {link.menu.footer.label}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            )}
          </nav>
          <div className="border-border mt-3 flex items-center gap-2 border-t pt-3">
            <LocaleSelector switchLabel={switchLanguageLabel} />
            {showThemeToggle ? <ThemeToggle label={toggleThemeLabel} /> : null}
            <div className="flex-1" />
            {user ? (
              <SiteUserMenu
                name={user.name || userFallback}
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

/**
 * A nav link with a panel under it. The panel opens on hover and on keyboard
 * focus (focus-within), so it works without JS; the label stays a real link
 * to the section's own page.
 */
function NavDropdown({
  link,
  menu,
  current,
  isCurrent,
}: {
  link: NavLink;
  menu: NavMenu;
  current: boolean;
  isCurrent: (href: string) => boolean;
}) {
  const wide = menu.groups.length > 1;
  return (
    <div className="group/nav relative">
      <Link
        href={link.href}
        data-current={current || undefined}
        aria-haspopup="true"
        className="text-foreground hover:bg-foreground/5 group-focus-within/nav:bg-foreground/5 data-[current]:text-primary inline-flex min-h-[38px] items-center gap-1 rounded px-2.5 text-base leading-4 transition-colors data-[current]:shadow-[inset_0_-2px_0_0_var(--brand)]"
      >
        {link.label}
        <ChevronDown
          className="size-3.5 opacity-60 transition-transform duration-200 group-focus-within/nav:rotate-180 group-hover/nav:rotate-180"
          aria-hidden
        />
      </Link>
      {/* pt-2 bridges the gap so the pointer can travel into the panel. */}
      <div className="invisible absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within/nav:visible group-focus-within/nav:opacity-100 group-hover/nav:visible group-hover/nav:opacity-100">
        <div
          className={cn(
            'bg-popover text-popover-foreground rounded-xl border p-2 shadow-[0_18px_40px_-20px_rgba(29,35,33,0.45)]',
            wide ? 'w-[34rem]' : 'w-80'
          )}
        >
          <div className={cn('grid gap-1', wide && 'grid-cols-2')}>
            {menu.groups.map((group, i) => (
              <div key={group.title ?? i} className="p-1">
                {group.title && group.href ? (
                  <Link
                    href={group.href}
                    data-current={isCurrent(group.href) || undefined}
                    className="text-muted-foreground hover:text-primary data-[current]:text-primary inline-flex items-center gap-1 px-2.5 pt-1.5 pb-1 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase transition-colors"
                  >
                    {group.title}
                    <ArrowRight className="size-3" aria-hidden />
                  </Link>
                ) : group.title ? (
                  <p className="text-muted-foreground px-2.5 pt-1.5 pb-1 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
                    {group.title}
                  </p>
                ) : null}
                <ul>
                  {group.links.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        data-current={isCurrent(item.href) || undefined}
                        className="hover:bg-secondary data-[current]:text-primary block rounded-lg px-2.5 py-2 transition-colors"
                      >
                        <span className="block text-sm font-medium">
                          {item.label}
                        </span>
                        {item.note ? (
                          <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">
                            {item.note}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {menu.footer ? (
            <Link
              href={menu.footer.href}
              className="text-primary hover:bg-secondary mt-1 flex items-center justify-between rounded-lg border-t px-3.5 py-2.5 text-sm font-medium transition-colors"
            >
              {menu.footer.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
