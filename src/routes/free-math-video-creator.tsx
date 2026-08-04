import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { FreeMathVideoCreatorPage } from '@/blocks/page-free-math-video-creator';

import { marketingHead } from './-marketing-head';

function RoutePage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <FreeMathVideoCreatorPage />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/free-math-video-creator')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = (loaderData?.locale ?? 'en') as never;
    return marketingHead({
      path: '/free-math-video-creator',
      locale,
      title: m['pages.free.meta_title']({}, { locale }),
      description: m['pages.free.meta_description']({}, { locale }),
      faq: [
        {
          question: m['pages.free.faq1_q']({}, { locale }),
          answer: m['pages.free.faq1_a']({}, { locale }),
        },
        {
          question: m['pages.free.faq2_q']({}, { locale }),
          answer: m['pages.free.faq2_a']({}, { locale }),
        },
        {
          question: m['pages.free.faq3_q']({}, { locale }),
          answer: m['pages.free.faq3_a']({}, { locale }),
        },
      ],
    });
  },
  component: RoutePage,
});
