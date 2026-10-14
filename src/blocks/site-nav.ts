import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import type { NavLink } from '@/components/site-header';
import {
  chapterPath,
  publicLabs,
  publicSubjects,
  subjectPath,
  suitesForSubject,
} from '@/content/labs';
import { libraryText } from '@/content/library';
import { publicWonders, wonderPath } from '@/content/wonders';

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
          title: libraryText(subject.name, lang),
          href: subjectPath(subject.id),
          links: suitesForSubject(subject.id).map((suite) => ({
            href: chapterPath(suite, suite.chapters[0]),
            label: libraryText(suite.name, lang),
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
              label: libraryText(wonder.name, lang),
              note: libraryText(wonder.question, lang),
            })),
          },
        ],
        footer: {
          href: '/wonders',
          label: m['landing.nav.all_wonders']({ count: wonders.length }),
        },
      },
    },
    { href: '/creator', label: m['landing.nav.create']() },
    {
      href: '/curves',
      label: m['landing.nav.resources'](),
      menu: {
        groups: [
          {
            links: [
              {
                href: '/curves',
                label: m['landing.nav.curves'](),
                note: m['landing.nav.curves_note'](),
              },
              {
                href: '/library',
                label: m['landing.nav.library'](),
                note: m['landing.nav.library_note'](),
              },
              {
                href: '/blog',
                label: m['landing.nav.guides'](),
                note: m['landing.nav.guides_note'](),
              },
            ],
          },
        ],
      },
    },
    { href: '/pricing', label: m['landing.nav.pricing']() },
  ];
}
