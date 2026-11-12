import { createFileRoute } from '@tanstack/react-router';

import { absoluteUrl, siteJsonLd } from '@/lib/seo';

import { staticPageRouteOptions } from './-static-page';

export const Route = createFileRoute('/(pages)/about')(
  staticPageRouteOptions('about', {
    structuredData: ({ meta, url, locale }) => ({
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      '@id': `${url}#about`,
      url,
      name: meta.title,
      description: meta.description,
      inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
      dateModified: meta.updated_at,
      isPartOf: { '@id': `${absoluteUrl('/')}#website` },
      mainEntity: siteJsonLd(locale)[0],
    }),
  })
);
