import { ArrowRight } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SectionHeading } from '@/components/section-heading';
import { CURVES, featuredCurves } from '@/content/curves';
import { labPath, latestLabs, suiteForLab } from '@/content/labs';
import { formatPostDate, type BlogPost } from '@/content/posts';

/**
 * Homepage "what's new": three short link lists that keep the homepage
 * changing and hand link weight to the traffic pages (latest labs, the curve
 * encyclopedia, the guides).
 */
export function HomeExplore({ posts }: { posts: BlogPost[] }) {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  const columns = [
    {
      title: m['home.explore.latest'](),
      more: { href: '/labs', label: m['home.labs.more']() },
      items: latestLabs(5).map((lab) => ({
        href: labPath(lab),
        label: lab.chapterTitle[lang],
        meta: suiteForLab(lab.slug)?.name[lang] ?? '',
      })),
    },
    {
      title: m['home.explore.curves'](),
      more: {
        href: '/curves',
        label: `${m['home.explore.all_curves']()} · ${CURVES.length}`,
      },
      items: featuredCurves()
        .slice(0, 5)
        .map((curve) => ({
          href: `/curves/${curve.slug}`,
          label: curve.name[lang],
          meta: '',
        })),
    },
    {
      title: m['home.explore.guides'](),
      more: { href: '/blog', label: m['home.explore.all_guides']() },
      items: posts.slice(0, 5).map((post) => ({
        href: `/blog/${post.slug}`,
        label: post.title,
        meta: formatPostDate(post.createdAt, lang),
      })),
    },
  ].filter((column) => column.items.length > 0);

  return (
    <section id="explore">
      <div className="curvg-stage curvg-frame curvg-section-spacing relative border-b">
        <SectionHeading
          eyebrow={m['home.explore.eyebrow']()}
          title={m['home.explore.title']()}
        />
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col">
              <h3 className="border-foreground border-b-2 pb-2 text-base font-semibold">
                {column.title}
              </h3>
              <ul className="divide-y">
                {column.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="group flex items-baseline justify-between gap-4 py-3"
                    >
                      <span className="group-hover:text-primary text-sm font-medium transition-colors">
                        {item.label}
                      </span>
                      {item.meta ? (
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {item.meta}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href={column.more.href}
                className="text-primary mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
              >
                {column.more.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
