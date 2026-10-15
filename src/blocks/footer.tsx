import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteFooter, type FooterColumn } from '@/components/site-footer';
import { CURVE_CATEGORY_ORDER, CURVES } from '@/content/curves';
import { chapterPath, publicSuites } from '@/content/labs';
import { localeText } from '@/content/text';
import { publicWonders, wonderPath } from '@/content/wonders';

import { curveCategoryHref, curveCategoryLabel } from './curve-categories';

export function Footer() {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  // Same sections as the top nav (docs/NAVIGATION.md §6): labs, wonders,
  // curves, create (with the keyword landing pages), guides, legal.
  const columns: FooterColumn[] = [
    {
      title: m['landing.nav.labs'](),
      links: [
        ...publicSuites().map((suite) => ({
          label: localeText(suite.name, lang),
          href: chapterPath(suite, suite.chapters[0]),
        })),
        { label: m['landing.footer.all_labs'](), href: '/labs' },
      ],
    },
    {
      title: m['landing.nav.wonders'](),
      links: [
        ...publicWonders().map((wonder) => ({
          label: localeText(wonder.name, lang),
          href: wonderPath(wonder),
        })),
        { label: m['landing.footer.wonders_all'](), href: '/wonders' },
      ],
    },
    {
      title: m['landing.nav.curves'](),
      links: [
        ...CURVE_CATEGORY_ORDER.map((category) => ({
          label: curveCategoryLabel(category),
          href: curveCategoryHref(category),
        })),
        {
          label: m['landing.nav.all_curves']({ count: CURVES.length }),
          href: '/curves',
        },
      ],
    },
    {
      title: m['landing.footer.create'](),
      links: [
        { label: m['landing.nav.create'](), href: '/creator' },
        { label: m['landing.footer.pricing'](), href: '/pricing' },
        { label: m['landing.nav.faq'](), href: '/#faq' },
        { label: m['landing.footer.tool'](), href: '/math-animation-tool' },
        {
          label: m['landing.footer.free_creator'](),
          href: '/free-math-video-creator',
        },
        {
          label: m['landing.footer.manim_alternative'](),
          href: '/manim-alternative',
        },
      ],
    },
    {
      title: m['landing.footer.guides'](),
      links: [
        { label: m['landing.footer.blog'](), href: '/blog' },
        {
          label: m['landing.footer.best_apps_guide'](),
          href: '/blog/best-math-video-apps',
        },
        {
          label: m['landing.footer.workflow_guide'](),
          href: '/blog/ai-manim-animation-workflow',
        },
        {
          label: m['landing.footer.manim_docs'](),
          href: 'https://docs.manim.community/en/stable/',
        },
      ],
    },
    {
      title: m['landing.footer.legal'](),
      links: [
        { label: m['landing.footer.privacy'](), href: '/privacy-policy' },
        { label: m['landing.footer.terms'](), href: '/terms-of-service' },
      ],
    },
  ];

  return (
    <SiteFooter
      tagline={m['landing.footer.tagline']()}
      columns={columns}
      copyright={m['landing.footer.copyright']({
        year: new Date().getFullYear(),
      })}
      localeSwitchLabel={m['common.nav.switch_language']()}
      disclaimer={m['landing.footer.disclaimer']()}
      framed
    />
  );
}
