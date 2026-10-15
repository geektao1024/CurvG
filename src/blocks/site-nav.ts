import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import type { NavLink } from '@/components/site-header';
import {
  CURVE_CATEGORY_ORDER,
  CURVES,
  getCurvesByCategory,
} from '@/content/curves';
import {
  chapterPath,
  publicLabs,
  publicSubjects,
  subjectPath,
  suitesForSubject,
} from '@/content/labs';
import { localeText } from '@/content/text';
import { publicWonders, wonderPath } from '@/content/wonders';

import { curveCategoryHref, curveCategoryLabel } from './curve-categories';

/**
 * The one list of top-level sections (docs/NAVIGATION.md §2). The site
 * header, the menu on immersive pages and the footer columns are all built
 * from it. Each top-level link goes to its section's hub; a dropdown's group
 * titles go one level down, its items to pages, its footer back to the hub.
 */
export function siteNavLinks(): NavLink[] {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  const wonders = publicWonders();
  return [
    {
      href: '/labs',
      label: m['landing.nav.labs'](),
      menu: {
        groups: publicSubjects().map((subject) => ({
          title: localeText(subject.name, lang),
          href: subjectPath(subject.id),
          links: suitesForSubject(subject.id).map((suite) => ({
            href: chapterPath(suite, suite.chapters[0]),
            label: localeText(suite.name, lang),
            note: m['labs.index.chapters']({ count: suite.chapters.length }),
          })),
        })),
        footer: {
          href: '/labs',
          label: m['landing.nav.all_labs']({ count: publicLabs().length }),
        },
      },
    },
    {
      href: '/wonders',
      label: m['landing.nav.wonders'](),
      menu: {
        groups: [
          {
            links: wonders.map((wonder) => ({
              href: wonderPath(wonder),
              label: localeText(wonder.name, lang),
              note: localeText(wonder.question, lang),
            })),
          },
        ],
        footer: {
          href: '/wonders',
          label: m['landing.nav.all_wonders']({ count: wonders.length }),
        },
      },
    },
    {
      href: '/curves',
      label: m['landing.nav.curves'](),
      menu: {
        groups: [
          {
            links: CURVE_CATEGORY_ORDER.map((category) => ({
              href: curveCategoryHref(category),
              label: curveCategoryLabel(category),
              note: getCurvesByCategory(category)
                .slice(0, 3)
                .map((curve) => curve.name[lang])
                .join(lang === 'zh' ? '、' : ', '),
            })),
          },
        ],
        footer: {
          href: '/curves',
          label: m['landing.nav.all_curves']({ count: CURVES.length }),
        },
      },
    },
    { href: '/creator', label: m['landing.nav.create']() },
    { href: '/pricing', label: m['landing.nav.pricing']() },
  ];
}
