import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { FreeMathVideoCreatorPage } from '@/blocks/page-free-math-video-creator';
import { SitePage } from '@/blocks/site-page';

import { marketingHead } from './-marketing-head';

function RoutePage() {
  return (
    <SitePage>
      <FreeMathVideoCreatorPage />
    </SitePage>
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
