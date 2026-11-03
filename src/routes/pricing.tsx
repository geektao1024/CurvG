import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  absoluteUrl,
  localizedLinks,
  pricingOffers,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
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
      scripts: [
        {
          type: 'application/ld+json',
          children: serializeJsonLd(pricingJsonLd(title, seoLinks.canonical)),
        },
      ],
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

function pricingJsonLd(title: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: envConfigs.app_name,
    url: absoluteUrl('/'),
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description: title,
    offers: pricingOffers(url),
  };
}
