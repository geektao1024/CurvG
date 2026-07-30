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
import { Blog } from '@/blocks/blog';
import { CTA } from '@/blocks/cta';
import { CurveGallery } from '@/blocks/curve-gallery';
import { FAQ } from '@/blocks/faq';
import { Features } from '@/blocks/features';
import { Footer } from '@/blocks/footer';
import { FormulaWorkspacePreview } from '@/blocks/formula-workspace-preview';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import { Pricing } from '@/blocks/pricing';
import { PromptExamples } from '@/blocks/prompt-examples';
import { ResourceLinks } from '@/blocks/resource-links';
import { UseCases } from '@/blocks/use-cases';
import { WhyCurvG } from '@/blocks/why-curvg';
import { getBlogPostsFn } from '@/content/posts/server';

/**
 * Default landing page — demo content. Rewrite this file (and the blocks in
 * src/blocks/) for your project. The primitives in src/components/ stay.
 * See /quick-start or /clone-website to automate the rewrite.
 */
function HomePage() {
  const { posts } = Route.useLoaderData();

  return (
    <div className="curvg-page-shell bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main>
        <Hero />
        <CurveGallery />
        <PromptExamples />
        <WhyCurvG />
        <Features />
        <UseCases />
        <FormulaWorkspacePreview />
        <Blog posts={posts} />
        <Pricing headingLevel="h2" />
        <FAQ />
        <ResourceLinks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/')({
  loader: async () => {
    const locale = getLocale();
    const posts = await getBlogPostsFn({ data: { locale, limit: 3 } });
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
    const faqEntries = [
      {
        question: m['landing.faq.what_is.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.what_is.answer']({}, { locale: locale as any }),
      },
      {
        question: m['landing.faq.difference.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.difference.answer'](
          {},
          { locale: locale as any }
        ),
      },
      {
        question: m['landing.faq.accuracy.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.accuracy.answer']({}, { locale: locale as any }),
      },
      {
        question: m['landing.faq.installation.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.installation.answer'](
          {},
          { locale: locale as any }
        ),
      },
      {
        question: m['landing.faq.editing.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.editing.answer']({}, { locale: locale as any }),
      },
      {
        question: m['landing.faq.rendering.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.rendering.answer'](
          {},
          { locale: locale as any }
        ),
      },
      {
        question: m['landing.faq.free.question']({}, { locale: locale as any }),
        answer: m['landing.faq.free.answer']({}, { locale: locale as any }),
      },
    ];
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
