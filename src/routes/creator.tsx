import { createFileRoute } from '@tanstack/react-router';

import { localizedLinks, socialMeta } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
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
    const seoLinks = localizedLinks({ path: '/creator', locale });
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        ...socialMeta({
          title,
          description,
          url: seoLinks.canonical,
        }),
      ],
      links: seoLinks.links,
    };
  },
  component: CreatorPage,
});
