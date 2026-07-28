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
