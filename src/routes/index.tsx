import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  localizedLinks,
  localizedUrl,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { FAQ, homeFaqEntries } from '@/blocks/faq';
import { HomeExplore } from '@/blocks/home-explore';
import { HomeHero } from '@/blocks/home-hero';
import { HomeLabIndex } from '@/blocks/home-lab-index';
import { HomeLabVideo } from '@/blocks/home-lab-video';
import { HomePricing } from '@/blocks/home-pricing';
import { HomeTeachers } from '@/blocks/home-teachers';
import { SitePage } from '@/blocks/site-page';
import { getBlogPostsFn } from '@/content/posts/server';

/**
 * Homepage, labs first (docs/SITE_ARCHITECTURE_PLAN.md, 2026-10-12): a live
 * lab and a topic search up top, the lab index, the lab → video bridge, the
 * teacher pitch, what's new, a pricing summary and the FAQ.
 */
function HomePage() {
  const { posts } = Route.useLoaderData();

  return (
    <SitePage>
      <HomeHero />
      <HomeLabIndex />
      <HomeLabVideo />
      <HomeTeachers />
      <HomeExplore posts={posts} />
      <HomePricing />
      <FAQ />
    </SitePage>
  );
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const locale = getLocale();
    const posts = await getBlogPostsFn({ data: { locale, limit: 5 } });
    return { locale, posts };
  },
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['common.metadata.title']({}, { locale: locale as any });
    const description = m['common.metadata.description'](
      {},
      { locale: locale as any }
    );
    const urlFor = (loc: string) => localizedUrl('/', loc);
    const seoLinks = localizedLinks({ path: '/', locale });
    const faqEntries = homeFaqEntries(locale);
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          '@id': `${urlFor(locale)}#app`,
          name: envConfigs.app_name,
          url: seoLinks.canonical,
          description,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web',
        },
        {
          '@type': 'FAQPage',
          '@id': `${urlFor(locale)}#faq`,
          mainEntity: faqEntries.map(({ question, answer }) => ({
            '@type': 'Question',
            name: question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: answer,
            },
          })),
        },
      ],
    };
    return {
      meta: [
        { title },
        {
          name: 'description',
          content: description,
        },
        ...socialMeta({
          title,
          description,
          url: seoLinks.canonical,
          imageAlt: `${envConfigs.app_name} — ${title}`,
        }),
      ],
      links: seoLinks.links,
      scripts: [
        {
          type: 'application/ld+json',
          children: serializeJsonLd(structuredData),
        },
      ],
    };
  },
  component: HomePage,
});
