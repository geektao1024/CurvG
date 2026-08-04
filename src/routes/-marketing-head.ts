import { localizedLinks, serializeJsonLd, socialMeta } from '@/lib/seo';

/**
 * Shared head() builder for the standalone marketing pages. Emits title,
 * description, canonical + hreflang links, social meta, and FAQPage JSON-LD.
 */
export function marketingHead({
  path,
  locale,
  title,
  description,
  faq,
}: {
  path: string;
  locale: string;
  title: string;
  description: string;
  faq: Array<{ question: string; answer: string }>;
}) {
  const seoLinks = localizedLinks({ path, locale });
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${seoLinks.canonical}#faq`,
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
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
        children: serializeJsonLd(structuredData),
      },
    ],
  };
}
