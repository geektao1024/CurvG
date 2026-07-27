import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, locales, localizeUrl } from '@/paraglide/runtime.js';
import { CreatorWorkspace } from '@/blocks/creator-workspace';

function CreatorPage() {
  const { locale } = Route.useLoaderData();
  const { animationId } = Route.useSearch();
  return (
    <div className="bg-background text-foreground min-h-screen">
      <CreatorWorkspace locale={locale} initialAnimationId={animationId} />
    </div>
  );
}

export const Route = createFileRoute('/creator')({
  validateSearch: (search: Record<string, unknown>) => ({
    animationId:
      typeof search.animationId === 'string' && search.animationId.length <= 80
        ? search.animationId
        : undefined,
  }),
  loader: () => ({ locale: getLocale() }),
  head: ({ loaderData }) => {
    const locale = loaderData?.locale ?? 'en';
    const title = m['creator.metadata.title']({}, { locale: locale as any });
    const description = m['creator.metadata.description'](
      {},
      { locale: locale as any }
    );
    const url = localizeUrl(`${envConfigs.app_url}/creator`, {
      locale: locale as any,
    }).href;
    const urlFor = (loc: string) =>
      localizeUrl(`${envConfigs.app_url}/creator`, {
        locale: loc as any,
      }).href;
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: url },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [
        { rel: 'canonical', href: url },
        ...locales.map((loc) => ({
          rel: 'alternate',
          hrefLang: loc,
          href: urlFor(loc),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: urlFor('en') },
      ],
    };
  },
  component: CreatorPage,
});
