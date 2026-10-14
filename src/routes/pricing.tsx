import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  pricingCatalog,
  PUBLIC_SUBSCRIPTION_PRODUCT_IDS,
} from '@/config/pricing';
import {
  absoluteUrl,
  localizedLinks,
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

/**
 * Offers straight from `src/config/pricing.ts`, the file checkout charges
 * from, so the prices in search results cannot drift from the real ones.
 */
function pricingJsonLd(title: string, url: string) {
  const offers = PUBLIC_SUBSCRIPTION_PRODUCT_IDS.map((id) => {
    const product = pricingCatalog[id];
    const price = (product.priceInCents / 100).toFixed(2);
    const currency = product.currency.toUpperCase();
    return {
      '@type': 'Offer',
      name: `${product.planName} (${product.plan?.interval === 'year' ? 'yearly' : 'monthly'})`,
      price,
      priceCurrency: currency,
      url,
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price,
        priceCurrency: currency,
        billingDuration: product.plan?.interval === 'year' ? 'P1Y' : 'P1M',
      },
    };
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: envConfigs.app_name,
    url: absoluteUrl('/'),
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description: title,
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD', url },
      ...offers,
    ],
  };
}
