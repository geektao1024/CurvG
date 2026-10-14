import { useEffect, useRef, useState } from 'react';
import { LayoutGrid } from 'lucide-react';

import { Link, usePathname } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';
import { isCurrent, menuCurrent, type NavLink } from '@/components/site-header';

/**
 * The site's top-level navigation for immersive pages (lab chapters, wonder
 * stages), whose compact bars have no room for the full header. Same links,
 * same current-section highlight; opens on click, closes on Escape, outside
 * click or navigation (docs/NAVIGATION.md §3).
 */
export function SiteNavMenu({
  links,
  label,
  className,
}: {
  links: readonly NavLink[];
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  return (
    <div ref={root} className={cn('site-nav-menu', className)}>
      <button
        type="button"
        className="site-nav-menu-btn"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <LayoutGrid aria-hidden />
        <span className="lbl">{label}</span>
      </button>
      {open ? (
        <nav className="site-nav-menu-panel" aria-label={label}>
          {links.map((link) => (
            <div key={link.href} className="site-nav-menu-section">
              <Link
                href={link.href}
                data-current={menuCurrent(link, pathname) || undefined}
                className="site-nav-menu-top"
              >
                {link.label}
              </Link>
              {link.menu ? (
                <ul>
                  {link.menu.groups.flatMap((group) => [
                    ...(group.title && group.href
                      ? [
                          <li key={group.href}>
                            <Link
                              href={group.href}
                              data-current={
                                isCurrent(group.href, pathname) || undefined
                              }
                              className="is-group"
                            >
                              {group.title}
                            </Link>
                          </li>,
                        ]
                      : []),
                    ...group.links.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          data-current={
                            isCurrent(item.href, pathname) || undefined
                          }
                        >
                          {item.label}
                        </Link>
                      </li>
                    )),
                  ])}
                </ul>
              ) : null}
            </div>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
