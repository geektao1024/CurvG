import { m } from '@/paraglide/messages.js';
import { SiteFooter, type FooterColumn } from '@/components/site-footer';

export function Footer() {
  const columns: FooterColumn[] = [
    {
      title: m['landing.footer.product'](),
      links: [
        {
          label: m['landing.footer.prompt_examples'](),
          href: '/#prompt-examples',
        },
        { label: m['landing.footer.workflow'](), href: '/#workflow' },
        { label: m['landing.footer.early_access'](), href: '/creator' },
      ],
    },
    {
      title: m['landing.footer.resources'](),
      links: [
        { label: m['landing.footer.faq'](), href: '/#faq' },
        { label: m['landing.footer.pricing'](), href: '/pricing' },
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
      disclaimer={m['landing.footer.disclaimer']()}
      framed
    />
  );
}
