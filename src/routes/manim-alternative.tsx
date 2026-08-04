import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { ManimAlternativePage } from '@/blocks/page-manim-alternative';

import { marketingHead } from './-marketing-head';

function RoutePage() {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <ManimAlternativePage />
      </main>
      <Footer />
    </div>
  );
}

export const Route = createFileRoute('/manim-alternative')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = (loaderData?.locale ?? 'en') as never;
    return marketingHead({
      path: '/manim-alternative',
      locale,
      title: m['pages.manimAlt.meta_title']({}, { locale }),
      description: m['pages.manimAlt.meta_description']({}, { locale }),
      faq: [
        {
          question: m['pages.manimAlt.faq1_q']({}, { locale }),
          answer: m['pages.manimAlt.faq1_a']({}, { locale }),
        },
        {
          question: m['pages.manimAlt.faq2_q']({}, { locale }),
          answer: m['pages.manimAlt.faq2_a']({}, { locale }),
        },
        {
          question: m['pages.manimAlt.faq3_q']({}, { locale }),
          answer: m['pages.manimAlt.faq3_a']({}, { locale }),
        },
      ],
    });
  },
  component: RoutePage,
});
