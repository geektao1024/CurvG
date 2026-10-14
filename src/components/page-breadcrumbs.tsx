import { Link } from '@/core/i18n/navigation';
import { cn } from '@/lib/utils';

export type Crumb = { href: string; label: string };

/**
 * The visible breadcrumb on every inner page (docs/NAVIGATION.md §4):
 * Home / section / … / current page. The last item is the current page and
 * is not a link. Pair it with `breadcrumbJsonLd` using the same items.
 */
export function PageBreadcrumbs({
  items,
  label,
  className,
}: {
  items: readonly Crumb[];
  /** aria-label for the nav, e.g. "Breadcrumb". */
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn('curvg-crumbs', className)}>
      <ol>
        {items.map((item, i) =>
          i === items.length - 1 ? (
            <li key={item.href} aria-current="page">
              {item.label}
            </li>
          ) : (
            <li key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </li>
          )
        )}
      </ol>
    </nav>
  );
}
