#!/usr/bin/env node

const baseUrl = (process.env.SEO_BASE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);
const articleSlug = 'ai-manim-animation-workflow';

const pagePaths = [
  '/',
  '/creator',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
  '/blog',
  `/blog/${articleSlug}`,
  '/zh',
  '/zh/creator',
  '/zh/pricing',
  '/zh/privacy-policy',
  '/zh/terms-of-service',
  '/zh/blog',
  `/zh/blog/${articleSlug}`,
];

const failures = [];

function fail(path, message) {
  failures.push(`${path}: ${message}`);
}

function parseAttributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)=(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1].toLowerCase(),
      match[2] ?? match[3] ?? '',
    ])
  );
}

function tags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map(
    (match) => parseAttributes(match[0])
  );
}

function metaContent(html, attribute, value) {
  return tags(html, 'meta').find(
    (attrs) => attrs[attribute]?.toLowerCase() === value.toLowerCase()
  )?.content;
}

function linkHref(html, rel) {
  return tags(html, 'link').find(
    (attrs) => attrs.rel?.toLowerCase() === rel.toLowerCase()
  )?.href;
}

function expectedCanonicalPath(path) {
  if (path === '/blog') return '/blog';
  if (path === '/zh/blog') return '/zh/blog';
  return path;
}

async function checkPage(path) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    fail(path, `HTTP ${response.status}`);
    return;
  }

  const html = await response.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = metaContent(html, 'name', 'description');
  const canonical = linkHref(html, 'canonical');
  const ogImage = metaContent(html, 'property', 'og:image');
  const twitterCard = metaContent(html, 'name', 'twitter:card');

  if (!title) fail(path, 'missing <title>');
  if (!description) fail(path, 'missing meta description');
  if (!canonical) {
    fail(path, 'missing canonical link');
  } else {
    try {
      const canonicalPath = new URL(canonical).pathname;
      if (canonicalPath !== expectedCanonicalPath(path)) {
        fail(path, `canonical path is ${canonicalPath}`);
      }
    } catch {
      fail(path, 'canonical is not an absolute URL');
    }
  }
  if (!ogImage) fail(path, 'missing og:image');
  if (twitterCard !== 'summary_large_image') {
    fail(path, 'twitter:card is not summary_large_image');
  }
  if (!/<h1\b/i.test(html)) fail(path, 'SSR source has no H1');

  if (path.endsWith('/creator') || path === '/creator') {
    const hasEntryModes = /From template/.test(html) || /从模板/.test(html);
    if (!hasEntryModes) {
      fail(path, 'Creator SSR source has no creation entry modes');
    }
    if (
      /min-h-svh items-center justify-center gap-2 text-sm[^>]*>[\s\S]{0,400}animate-spin/i.test(
        html
      )
    ) {
      fail(
        path,
        'Creator SSR source still renders the full-page loading shell'
      );
    }
  }

  if (path.endsWith(`/blog/${articleSlug}`)) {
    const alternates = tags(html, 'link')
      .filter((attrs) => attrs.rel?.toLowerCase() === 'alternate')
      .map((attrs) => attrs.hreflang);
    if (!html.includes('"@type":"BlogPosting"')) {
      fail(path, 'missing BlogPosting structured data');
    }
    for (const locale of ['en', 'zh', 'x-default']) {
      if (!alternates.includes(locale)) {
        fail(path, `missing ${locale} hreflang`);
      }
    }
  }
}

async function checkTextEndpoint(path, assertion) {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    fail(path, `HTTP ${response.status}`);
    return;
  }
  const body = await response.text();
  assertion(body);
}

async function checkSocialImage() {
  const path = '/og/curvg-social.png';
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    fail(path, `HTTP ${response.status}`);
    return;
  }
  if (!response.headers.get('content-type')?.includes('image/png')) {
    fail(path, 'content type is not image/png');
  }
  const image = Buffer.from(await response.arrayBuffer());
  if (image.length < 24 || image.toString('ascii', 1, 4) !== 'PNG') {
    fail(path, 'response is not a valid PNG');
    return;
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== 1200 || height !== 630) {
    fail(path, `expected 1200x630, received ${width}x${height}`);
  }
}

try {
  for (const path of pagePaths) await checkPage(path);

  await checkTextEndpoint('/robots.txt', (body) => {
    if (!/^User-Agent: \*/m.test(body))
      fail('/robots.txt', 'missing user-agent');
    if (!/^Sitemap: https?:\/\//m.test(body)) {
      fail('/robots.txt', 'missing absolute sitemap URL');
    }
  });

  await checkTextEndpoint('/sitemap.xml', (body) => {
    if (!/<urlset\b/.test(body)) fail('/sitemap.xml', 'missing urlset');
    for (const pathname of ['/', '/creator', '/zh/', '/zh/creator']) {
      if (!body.includes(pathname)) {
        fail('/sitemap.xml', `missing localized entry ${pathname}`);
      }
    }
    if (!body.includes(`/blog/${articleSlug}`)) {
      fail('/sitemap.xml', 'missing the new article');
    }
  });

  await checkSocialImage();
} catch (error) {
  fail(baseUrl, error instanceof Error ? error.message : String(error));
}

if (failures.length > 0) {
  console.error(`SEO check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SEO check passed: ${pagePaths.length} pages + robots/sitemap/OG`);
