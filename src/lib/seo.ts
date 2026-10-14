import { envConfigs } from '@/config';
import { baseLocale, locales, localizeUrl } from '@/paraglide/runtime.js';

export const DEFAULT_SOCIAL_IMAGE_PATH = '/og/curvg-social.png';

type SupportedLocale = (typeof locales)[number];

function normalizePath(path: string): string {
  if (!path || path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return new URL(
    normalizePath(pathOrUrl),
    `${envConfigs.app_url.replace(/\/+$/, '')}/`
  ).href;
}

export function localizedUrl(path: string, locale: string): string {
  return localizeUrl(absoluteUrl(path), {
    locale: locale as SupportedLocale,
  }).href;
}

export function localizedLinks({
  path,
  locale,
  availableLocales = [...locales],
}: {
  path: string;
  locale: string;
  availableLocales?: readonly string[];
}) {
  const supportedLocales = locales.filter((candidate) =>
    availableLocales.includes(candidate)
  );
  const fallbackLocale = supportedLocales.includes(baseLocale)
    ? baseLocale
    : (supportedLocales[0] ?? baseLocale);
  const canonicalLocale = supportedLocales.includes(locale as SupportedLocale)
    ? locale
    : fallbackLocale;

  return {
    canonical: localizedUrl(path, canonicalLocale),
    canonicalLocale,
    links: [
      { rel: 'canonical', href: localizedUrl(path, canonicalLocale) },
      ...supportedLocales.map((candidate) => ({
        rel: 'alternate',
        hrefLang: candidate,
        href: localizedUrl(path, candidate),
      })),
      {
        rel: 'alternate',
        hrefLang: 'x-default',
        href: localizedUrl(path, fallbackLocale),
      },
    ],
  };
}

export function socialMeta({
  title,
  description,
  url,
  type = 'website',
  image = DEFAULT_SOCIAL_IMAGE_PATH,
  imageAlt = title,
}: {
  title: string;
  description: string;
  url: string;
  type?: 'website' | 'article';
  image?: string;
  imageAlt?: string;
}) {
  const imageUrl = absoluteUrl(image);

  return [
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: type },
    { property: 'og:url', content: url },
    { property: 'og:site_name', content: envConfigs.app_name },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: imageAlt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: imageAlt },
  ];
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/**
 * BreadcrumbList for a page (docs/NAVIGATION.md §4). Pass the same items as
 * the visible breadcrumb, home first; paths are locale-free.
 */
export function breadcrumbJsonLd(
  items: readonly { name: string; path: string }[],
  locale: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: localizedUrl(item.path, locale),
    })),
  };
}

/**
 * Display width of a title as search results measure it, roughly: CJK and
 * full-width characters count double. Google shows about 60 units.
 */
export function titleWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    width += /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/.test(ch)
      ? 2
      : 1;
  }
  return width;
}

/** The first candidate that fits in a search result, else the shortest. */
export function fitTitle(candidates: readonly string[], max = 62): string {
  const fit = candidates.find((title) => titleWidth(title) <= max);
  if (fit) return fit;
  return [...candidates].sort((a, b) => titleWidth(a) - titleWidth(b))[0];
}

/**
 * The site and its publisher, for the home page (Google reads the site name
 * from WebSite on the home page). Other pages reference them by `@id`.
 */
export function siteJsonLd(locale: string) {
  const home = absoluteUrl('/');
  return [
    {
      '@type': 'Organization',
      '@id': `${home}#organization`,
      name: envConfigs.app_name,
      url: home,
      logo: absoluteUrl('/apple-touch-icon.png'),
    },
    {
      '@type': 'WebSite',
      '@id': `${home}#website`,
      name: envConfigs.app_name,
      alternateName: new URL(home).hostname.replace(/^www\./, ''),
      url: home,
      inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
      publisher: { '@id': `${home}#organization` },
    },
  ];
}
