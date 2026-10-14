#!/usr/bin/env node

const baseUrl = (process.env.SEO_BASE_URL || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);
const articleSlug = 'ai-manim-animation-workflow';

// One or two pages of every page type, in both locales (docs/NAVIGATION.md).
const englishPaths = [
  '/',
  '/creator',
  '/pricing',
  '/privacy-policy',
  '/terms-of-service',
  '/blog',
  `/blog/${articleSlug}`,
  '/labs',
  '/labs/math',
  '/labs/functions',
  '/labs/functions/derivative-tangent-slope',
  '/wonders',
  '/wonders/fourier-epicycles',
  '/wonders/mandelbrot-set',
  '/curves',
  '/curves/cardioid',
  '/library',
  '/library/calculus',
];
const pagePaths = [
  ...englishPaths,
  ...englishPaths.map((path) => (path === '/' ? '/zh' : `/zh${path}`)),
];
// Pages outside the section tree carry no breadcrumb (docs/NAVIGATION.md §4).
const NO_BREADCRUMB = new Set(['/', '/zh', '/pricing', '/zh/pricing']);
const checkedImages = new Map();

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
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) fail(path, `SSR source has ${h1Count} H1 (want 1)`);

  // Google shows ~60 display units; CJK characters count double.
  const width = [...(title ?? '')].reduce(
    (sum, ch) =>
      sum +
      (/[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/.test(ch)
        ? 2
        : 1),
    0
  );
  if (width > 70) fail(path, `title is ${width} units wide (keep ≤ 70)`);

  const alternates = tags(html, 'link')
    .filter((attrs) => attrs.rel?.toLowerCase() === 'alternate')
    .map((attrs) => attrs.hreflang);
  for (const locale of ['en', 'zh', 'x-default']) {
    if (!alternates.includes(locale)) fail(path, `missing ${locale} hreflang`);
  }

  if (!NO_BREADCRUMB.has(path) && !html.includes('"@type":"BreadcrumbList"')) {
    fail(path, 'missing BreadcrumbList structured data');
  }

  if (ogImage) {
    const imagePath = new URL(ogImage, baseUrl).pathname;
    if (!checkedImages.has(imagePath)) {
      const res = await fetch(`${baseUrl}${imagePath}`);
      checkedImages.set(imagePath, res.ok);
    }
    if (!checkedImages.get(imagePath))
      fail(path, `og:image ${imagePath} not found`);
  }

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
    for (const path of ['/admin', '/settings', '/zh/admin', '/zh/settings']) {
      if (!body.includes(`Disallow: ${path}`)) {
        fail('/robots.txt', `does not disallow ${path}`);
      }
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
    for (const pathname of ['/labs', '/wonders', '/curves', '/library']) {
      if (!body.includes(`${pathname}</loc>`)) {
        fail('/sitemap.xml', `missing section hub ${pathname}`);
      }
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
