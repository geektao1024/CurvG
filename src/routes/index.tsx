import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { CTA } from '@/blocks/cta';
import { CurveGallery } from '@/blocks/curve-gallery';
import { FAQ } from '@/blocks/faq';
import { Features } from '@/blocks/features';
import { Footer } from '@/blocks/footer';
import { FormulaWorkspacePreview } from '@/blocks/formula-workspace-preview';
import { Header } from '@/blocks/header';
import { Hero } from '@/blocks/hero';
import { PromptExamples } from '@/blocks/prompt-examples';
import { UseCases } from '@/blocks/use-cases';
import { WhyCurvG } from '@/blocks/why-curvg';

/**
 * Default landing page — demo content. Rewrite this file (and the blocks in
 * src/blocks/) for your project. The primitives in src/components/ stay.
 * See /quick-start or /clone-website to automate the rewrite.
 */
function HomePage() {
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
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['common.metadata.title']({}, { locale: locale as any });
    const description = m['common.metadata.description'](
      {},
      { locale: locale as any }
    );
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/`, { locale: loc as any }).href;
    const faqEntries = [
      {
        question: m['landing.faq.what_is.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.what_is.answer']({}, { locale: locale as any }),
      },
      {
        question: m['landing.faq.version.question'](
          {},
          { locale: locale as any }
        ),
        answer: m['landing.faq.version.answer']({}, { locale: locale as any }),
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
          name: 'CurvG AI',
          url: urlFor(locale),
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
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: urlFor(locale) },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        { rel: 'canonical', href: urlFor(locale) },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(structuredData),
        },
      ],
    };
  },
  component: HomePage,
});
