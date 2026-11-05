import { createFileRoute } from '@tanstack/react-router';

import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import {
  ManimAlternativePage,
  manimAltFaq,
} from '@/blocks/page-manim-alternative';
import { SitePage } from '@/blocks/site-page';

import { marketingHead } from './-marketing-head';

function RoutePage() {
  return (
    <SitePage>
      <ManimAlternativePage />
    </SitePage>
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
      faq: manimAltFaq(locale),
    });
  },
  component: RoutePage,
});
