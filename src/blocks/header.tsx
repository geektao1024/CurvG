import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteHeader, type NavLink } from '@/components/site-header';
import {
  chapterPath,
  publicLabs,
  publicSubjects,
  suitesForSubject,
} from '@/content/labs';
import { libraryText } from '@/content/library';

/**
 * Four entries (docs/SITE_ARCHITECTURE_PLAN.md, 2026-10-12): labs lead, the
 * creator converts, the traffic pages share one "Resources" menu, pricing.
 * FAQ and the keyword landing pages live in the footer.
 */
export function Header() {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  const navLinks: NavLink[] = [
    {
      href: '/labs',
      label: m['landing.nav.labs'](),
      menu: {
        groups: publicSubjects().map((subject) => ({
          title: libraryText(subject.name, lang),
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

  return (
    <SiteHeader
      navLinks={navLinks}
      ctaHref="/sign-in"
      ctaLabel={m['common.nav.sign_in']()}
      openMenuLabel={m['common.nav.open_menu']()}
      closeMenuLabel={m['common.nav.close_menu']()}
      switchLanguageLabel={m['common.nav.switch_language']()}
      toggleThemeLabel={m['common.nav.toggle_theme']()}
      userFallback={m['common.nav.user']()}
      framed
    />
  );
}
