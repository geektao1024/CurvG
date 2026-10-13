import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { MathAnimationToolPage } from '@/blocks/page-math-animation-tool';
import { SitePage } from '@/blocks/site-page';

import { marketingHead } from './-marketing-head';

function RoutePage() {
  return (
    <SitePage>
      <MathAnimationToolPage />
    </SitePage>
  );
}

export const Route = createFileRoute('/math-animation-tool')({
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = (loaderData?.locale ?? 'en') as never;
    return marketingHead({
      path: '/math-animation-tool',
      locale,
      title: m['pages.tool.meta_title']({}, { locale }),
      description: m['pages.tool.meta_description']({}, { locale }),
      faq: [
        {
          question: m['pages.tool.faq1_q']({}, { locale }),
          answer: m['pages.tool.faq1_a']({}, { locale }),
        },
        {
          question: m['pages.tool.faq2_q']({}, { locale }),
          answer: m['pages.tool.faq2_a']({}, { locale }),
        },
        {
          question: m['pages.tool.faq3_q']({}, { locale }),
          answer: m['pages.tool.faq3_a']({}, { locale }),
        },
      ],
    });
  },
  component: RoutePage,
});
