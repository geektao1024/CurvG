import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  localizedLinks,
  serializeJsonLd,
  socialMeta,
} from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { CreatorWorkspace } from '@/blocks/creator-workspace';

function CreatorPage() {
  const { locale } = Route.useLoaderData();
  const { animationId, prompt } = Route.useSearch();
  return (
    <div className="bg-background text-foreground min-h-screen">
      <CreatorWorkspace
        locale={locale}
        initialAnimationId={animationId}
        initialPrompt={prompt}
      />
    </div>
  );
}

export const Route = createFileRoute('/creator')({
  validateSearch: (search: Record<string, unknown>) => ({
    animationId:
      typeof search.animationId === 'string' && search.animationId.length <= 80
        ? search.animationId
        : undefined,
    prompt:
      typeof search.prompt === 'string' &&
      search.prompt.length > 0 &&
      search.prompt.length <= 600
        ? search.prompt
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
      scripts: [
        {
          type: 'application/ld+json',
          children: serializeJsonLd([
            {
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: title,
              url: seoLinks.canonical,
              description,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              isAccessibleForFree: true,
              provider: {
                '@type': 'Organization',
                '@id': `${absoluteUrl('/')}#organization`,
                name: envConfigs.app_name,
              },
            },
            breadcrumbJsonLd(
              [
                {
                  name: m['common.nav.home']({}, { locale: locale as never }),
                  path: '/',
                },
                {
                  name: m['landing.nav.create'](
                    {},
                    { locale: locale as never }
                  ),
                  path: '/creator',
                },
              ],
              locale
            ),
          ]),
        },
      ],
    };
  },
  component: CreatorPage,
});
