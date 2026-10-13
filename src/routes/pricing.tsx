import { createFileRoute } from '@tanstack/react-router';

import { localizedLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Pricing } from '@/blocks/pricing';
import { PricingFaq } from '@/blocks/pricing-faq';
import { SitePage } from '@/blocks/site-page';

export const Route = createFileRoute('/pricing')({
  loader: () => {
    const locale = getLocale();
    return {
      locale,
      title: m['landing.pricing.meta_title']({}, { locale }),
      description: m['landing.pricing.meta_description']({}, { locale }),
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, title, description } = loaderData;
    const seoLinks = localizedLinks({ path: '/pricing', locale });
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({ title, description, url: seoLinks.canonical }),
      ],
      links: seoLinks.links,
    };
  },
  component: PricingPage,
});

function PricingPage() {
  return (
    <SitePage>
      <Pricing />
      <PricingFaq />
    </SitePage>
  );
}
