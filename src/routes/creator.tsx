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
  const { animationId, prompt, template, params } = Route.useSearch();
  const initialTemplate = template
    ? { templateId: template, params: params ?? {} }
    : undefined;
  return (
    <div className="bg-background text-foreground min-h-screen">
      <CreatorWorkspace
        locale={locale}
        initialAnimationId={animationId}
        initialPrompt={prompt}
        initialTemplate={initialTemplate}
      />
    </div>
  );
}

/**
 * `params` from a lab, curve or wonder link. The router parses JSON search
 * values, so it arrives as an object (or, hand-typed, as a JSON string); the
 * server validates every value again.
 */
function parseTemplateParams(
  raw: unknown
): Record<string, string | number> | undefined {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return undefined;
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  const entries = Object.entries(value).filter(
    (entry): entry is [string, string | number] =>
      /^[A-Za-z0-9_]{1,40}$/.test(entry[0]) &&
      ((typeof entry[1] === 'string' && entry[1].length <= 400) ||
        (typeof entry[1] === 'number' && Number.isFinite(entry[1])))
  );
  return entries.length <= 20 ? Object.fromEntries(entries) : undefined;
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
    template:
      typeof search.template === 'string' &&
      /^[a-z0-9-]{1,80}$/.test(search.template)
        ? search.template
        : undefined,
    params: parseTemplateParams(search.params),
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
