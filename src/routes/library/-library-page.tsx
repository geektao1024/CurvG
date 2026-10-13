import type { ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { SitePage } from '@/blocks/site-page';
import { LibraryCurveCard } from '@/components/library-curve-card';
import type { CurveDef } from '@/content/curves';
import { labsForCategory } from '@/content/labs';
import {
  categoryCurveCount,
  getCategory,
  libraryPath,
  libraryText,
  type LibraryCategory,
} from '@/content/library';

export function libraryLocale(locale: string): 'en' | 'zh' {
  return locale === 'zh' ? 'zh' : 'en';
}

export function LibraryShell({ children }: { children: ReactNode }) {
  return <SitePage>{children}</SitePage>;
}

export function LibraryBreadcrumb({
  trail,
  locale,
}: {
  trail: readonly LibraryCategory[];
  locale: 'en' | 'zh';
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
      <Link
        href="/library"
        className="text-muted-foreground hover:text-primary font-mono text-xs tracking-[0.14em] uppercase transition-colors"
      >
        {m['library.breadcrumb']()}
      </Link>
      {trail.map((category) => (
        <span key={category.id} className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs" aria-hidden>
            /
          </span>
          <Link
            href={libraryPath(category)}
            className="text-muted-foreground hover:text-primary font-mono text-xs tracking-[0.14em] uppercase transition-colors"
          >
            {libraryText(category.title, locale)}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export function LibraryCurveGrid({
  curves,
  locale,
  badgeFor,
}: {
  curves: readonly CurveDef[];
  locale: 'en' | 'zh';
  badgeFor?: (curve: CurveDef) => string | undefined;
}) {
  if (curves.length === 0) {
    return (
      <p className="text-muted-foreground mt-8 max-w-2xl text-sm leading-relaxed">
        {m['library.empty']()}
      </p>
    );
  }
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {curves.map((curve) => (
        <LibraryCurveCard
          key={curve.slug}
          curve={curve}
          locale={locale}
          badge={badgeFor?.(curve)}
          ariaLabel={m['curves.detail.preview_aria']({
            name: curve.name[locale],
          })}
        />
      ))}
    </div>
  );
}

/** "3 curve objects · 2 labs", leaving out whichever is zero. */
export function contentCount(categoryId: string): string {
  const curves = categoryCurveCount(categoryId);
  const labs = labsForCategory(categoryId).length;
  const parts = [
    curves > 0 ? m['library.count']({ count: curves }) : null,
    labs > 0 ? m['labs.index.count']({ count: labs }) : null,
  ].filter(Boolean);
  return parts.length > 0
    ? parts.join(' · ')
    : m['library.count']({ count: 0 });
}

export function ChildCategoryGrid({
  categories,
  locale,
}: {
  categories: readonly LibraryCategory[];
  locale: 'en' | 'zh';
}) {
  if (categories.length === 0) return null;
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const parent = category.primaryParentId
          ? getCategory(category.primaryParentId)
          : undefined;
        return (
          <Link
            key={category.id}
            href={
              parent
                ? `/library/${parent.id}/${category.id}`
                : `/library/${category.id}`
            }
            className="bg-card hover:border-primary/50 block rounded-2xl border p-5 transition-colors"
          >
            <span
              className={`${category.accentClass} mb-4 block h-0.5 w-10`}
              aria-hidden
            />
            <h3 className="text-lg font-semibold tracking-tight">
              {libraryText(category.title, locale)}
            </h3>
            <p className="text-muted-foreground mt-2 line-clamp-2 text-sm leading-relaxed">
              {libraryText(category.description, locale)}
            </p>
            <p className="text-muted-foreground mt-4 font-mono text-[10px] tracking-[0.14em] uppercase">
              {contentCount(category.id)}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
