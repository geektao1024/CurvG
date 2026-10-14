import { createFileRoute, notFound } from '@tanstack/react-router';

import { getLocale } from '@/paraglide/runtime.js';
import { getWonder } from '@/content/wonders';

import { wonderHead, WonderPage } from './-wonder-page';

function WonderRoute() {
  const { locale, slug } = Route.useLoaderData();
  const wonder = getWonder(slug);
  return wonder ? <WonderPage wonder={wonder} locale={locale} /> : null;
}

export const Route = createFileRoute('/wonders/$slug')({
  loader: ({ params }) => {
    if (!getWonder(params.slug)) throw notFound();
    return { locale: getLocale(), slug: params.slug };
  },
  head: ({ loaderData }) => {
    const wonder = loaderData && getWonder(loaderData.slug);
    return wonder ? wonderHead(wonder, loaderData.locale) : {};
  },
  component: WonderRoute,
});
