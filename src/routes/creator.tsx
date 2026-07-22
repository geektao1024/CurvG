import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeUrl } from '@/paraglide/runtime.js';
import { CreatorWorkspace } from '@/blocks/creator-workspace';
import { Header } from '@/blocks/header';

function CreatorPage() {
  const { locale } = Route.useLoaderData();
  const { animationId } = Route.useSearch();
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
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
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
      links: [{ rel: 'canonical', href: url }],
    };
  },
  component: CreatorPage,
});
