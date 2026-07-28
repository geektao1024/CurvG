import { m } from '@/paraglide/messages.js';
import { SiteFooter, type FooterColumn } from '@/components/site-footer';

export function Footer() {
  const columns: FooterColumn[] = [
    {
      title: m['landing.footer.product'](),
      links: [
        { label: m['landing.footer.early_access'](), href: '/creator' },
        {
          label: m['landing.footer.prompt_examples'](),
          href: '/#prompt-examples',
        },
        { label: m['landing.footer.workflow'](), href: '/#workflow' },
        { label: m['landing.footer.pricing'](), href: '/pricing' },
      ],
    },
    {
      title: m['landing.footer.resources'](),
      links: [
        { label: m['landing.footer.gallery'](), href: '/#gallery' },
        {
          label: m['landing.footer.workflow_guide'](),
          href: '/blog/ai-manim-animation-workflow',
        },
        { label: m['landing.footer.blog'](), href: '/blog' },
        { label: m['landing.footer.faq'](), href: '/#faq' },
      ],
    },
    {
      title: m['landing.footer.manim_resources'](),
      links: [
        {
          label: m['landing.footer.manim_docs'](),
          href: 'https://docs.manim.community/en/stable/',
        },
        {
          label: m['landing.footer.manim_examples'](),
          href: 'https://docs.manim.community/en/stable/examples.html',
        },
        {
          label: m['landing.footer.manim_source'](),
          href: 'https://github.com/ManimCommunity/manim',
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
