import type { ComponentType, SVGProps } from 'react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { BuiltWithShipAny } from '@/components/built-with-shipany';
import { LocaleSelector } from '@/components/locale-selector';

export interface FooterColumn {
  title: string;
  /** external: open in a new tab. Off-site (http) hrefs always open in a new tab. */
  links: { label: string; href: string; external?: boolean }[];
}

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

export interface FooterSocial {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  label: string;
}

export function SiteFooter({
  tagline,
  columns,
  socials,
  copyright,
  disclaimer,
  framed = false,
}: {
  tagline?: string;
  columns?: FooterColumn[];
  socials?: FooterSocial[];
  copyright?: string;
  disclaimer?: string;
  framed?: boolean;
}) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn(
        'text-sidebar-foreground border-border border-t',
        framed ? 'bg-background' : 'bg-sidebar'
      )}
    >
      <div
        className={cn(
          'px-6 pt-14 pb-6 sm:px-10 sm:pt-16',
          framed ? 'curvg-stage curvg-frame' : 'mx-auto max-w-7xl lg:px-16'
        )}
      >
        {tagline && (
          <p className="text-foreground mb-12 max-w-2xl text-3xl leading-[1.15] font-semibold tracking-[-0.03em] text-balance sm:text-4xl">
            {tagline}
          </p>
        )}

        {columns && columns.length > 0 && (
          <div
            className={cn(
              'grid gap-x-8 gap-y-10 sm:gap-x-12',
              columns.length <= 3
                ? 'grid-cols-2 sm:grid-cols-3'
                : columns.length === 4
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
            )}
          >
            {columns.map((col) => (
              <div key={col.title} className="space-y-5">
                <p className="text-foreground text-[13px] font-semibold tracking-wide">
                  {col.title}
                </p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {isExternalHref(link.href) ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          target={link.external ? '_blank' : undefined}
                          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Socials + language row */}
        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          {socials && socials.length > 0 ? (
            <div className="flex items-center gap-5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <s.icon className="size-[18px]" />
                </a>
              ))}
            </div>
          ) : (
            <div />
          )}
          <LocaleSelector
            variant="pill"
            className="border-border text-foreground hover:bg-secondary hover:text-foreground"
          />
        </div>

        {/* Bottom bar */}
        <div className="border-border mt-6 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <BuiltWithShipAny />
          <span className="text-muted-foreground text-sm">
            {copyright ||
              `© ${year} ${envConfigs.app_name}. All rights reserved.`}
          </span>
        </div>
        {disclaimer ? (
          <p className="text-muted-foreground mt-4 max-w-4xl text-xs leading-5">
            {disclaimer}
          </p>
        ) : null}
      </div>
    </footer>
  );
}
