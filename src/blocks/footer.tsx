import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { SiteFooter, type FooterColumn } from '@/components/site-footer';
import { chapterPath, publicSuites } from '@/content/labs';
import { libraryText } from '@/content/library';

export function Footer() {
  const lang = getLocale() === 'zh' ? 'zh' : 'en';
  // Labs first; the free tools column holds the traffic pages (as mathos
  // does), so they stay linked site-wide without taking a nav slot.
  const columns: FooterColumn[] = [
    {
      title: m['landing.nav.labs'](),
      links: [
        ...publicSuites().map((suite) => ({
          label: libraryText(suite.name, lang),
          href: chapterPath(suite, suite.chapters[0]),
        })),
        { label: m['landing.footer.all_labs'](), href: '/labs' },
      ],
    },
    {
      title: m['landing.footer.free_tools'](),
      links: [
        { label: m['landing.footer.labs'](), href: '/labs' },
        { label: m['landing.footer.curve_explorer'](), href: '/curves' },
        { label: m['landing.footer.tool'](), href: '/math-animation-tool' },
        {
          label: m['landing.footer.free_creator'](),
          href: '/free-math-video-creator',
        },
      ],
    },
    {
      title: m['landing.footer.product'](),
      links: [
        { label: m['landing.nav.create'](), href: '/creator' },
        { label: m['landing.footer.pricing'](), href: '/pricing' },
        { label: m['landing.nav.faq'](), href: '/#faq' },
        {
          label: m['landing.footer.manim_alternative'](),
          href: '/manim-alternative',
        },
      ],
    },
    {
      title: m['landing.footer.resources'](),
      links: [
        { label: m['landing.footer.library'](), href: '/library' },
        { label: m['landing.footer.blog'](), href: '/blog' },
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
