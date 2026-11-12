import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale } from '@/paraglide/runtime.js';
import { CURVES } from '@/content/curves';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'CurvG — Interactive Math Labs, Animations & Explainer Videos',
    description:
      'Home: free interactive math and physics labs you can drag, animated math wonders, the curve encyclopedia, and math videos made from verified Manim templates (3 free previews).',
  },
  {
    path: '/creator',
    title: 'Manim AI Generator (Creator)',
    description:
      'The video creator: pick a verified template (or let the AI pick one and fill in the parameters), adjust the parameters, render a captioned MP4 and download the Manim source. Free-form AI generation for topics without a template is a beta.',
  },
  {
    path: '/pricing',
    title: 'Pricing',
    description:
      'Labs, wonders and curves are free. Video plans: Free (3 preview videos, 720p, watermarked), Starter ($9.90/month) and Pro ($18.90/month); plans differ only in how many clean 1080p videos they cover and the price per video.',
  },
  {
    path: '/math-animation-tool',
    title: 'Online Math Animation Tool',
    description:
      'Online math animation tool built on 12 verified templates: pick a template or describe a topic, set the parameters (function, range, counts, 16:9 or 9:16), and render a captioned Manim MP4 in the cloud. Covers function graphs, trigonometry and curves, calculus, and 2×2 matrix transformations; other topics go to a free-form beta.',
  },
  {
    path: '/free-math-video-creator',
    title: 'Free Math Video Creator',
    description:
      'What the free tier includes: 3 free preview videos (720p, watermarked), every video template, Manim code export, and refund rules.',
  },
  {
    path: '/manim-alternative',
    title: 'Manim Alternatives Compared',
    description:
      'Nine Manim alternatives compared (Motion Canvas and its fork Revideo, Remotion, Blender, Synfig, GeoGebra, Tracé, LemmaReel, fastanim, CurvG): cost, whether you need code, where each falls short, and when raw Manim is the better choice. Checked November 2026.',
  },
  {
    path: '/curves',
    title: 'Math Curve Encyclopedia',
    description: `${CURVES.length} classic and fractal curves: interactive graphs with presets, formulas with key values (arc length, area), a drawing animation of how each curve is made, free SVG/PNG/CSV export, and a one-click video brief.`,
  },
  {
    path: '/about',
    title: 'About CurvG',
    description:
      'What CurvG is, how the mathematics on the site is checked (labs, curves, wonders, template videos, the free-form beta), how to report a mistake, and contact: hello@curvg.com.',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy',
    description: 'How CurvG handles account, project, and service data.',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of Service',
    description: 'Rules and conditions for using CurvG.',
  },
];

const PRODUCT_DESCRIPTION = `CurvG turns math into animations you can watch, play with and export: free interactive math and physics labs, animated math wonders, an encyclopedia of ${CURVES.length} math curves, and a video creator that renders Manim Community explainer videos from verified templates (free-form AI generation is a beta).`;

const PRODUCT_FACTS = [
  'CurvG does not claim that AI output is automatically mathematically correct.',
  'The video creator shows the Manim source of every video; users can copy and download it.',
  'Direct code editing and compilation in the browser are not currently available.',
  'Hosted cloud rendering is available; paid plans include render credits, and failed or canceled renders are refunded.',
  'Videos are made from verified templates (an AI picks the template and fills in the parameters; free-form AI generation is a beta). Every verified account gets 3 free preview videos (720p, watermarked); clean 1080p videos are priced by the number of videos.',
];

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { app_url, app_name } = envConfigs;

        const lines: string[] = [
          `# ${app_name}`,
          '',
          `> ${PRODUCT_DESCRIPTION}`,
          '',
          '## Product Facts',
          '',
          ...PRODUCT_FACTS.map((fact) => `- ${fact}`),
          '',
          '## Pages',
          '',
          ...STATIC_PAGES.map(
            (p) => `- [${p.title}](${app_url}${p.path}): ${p.description}`
          ),
          '',
          '## Scene Library',
          '',
          '',
          '## Curve Encyclopedia',
          '',
          ...CURVES.map(
            (curve) =>
              `- [${curve.name.en}](${app_url}/curves/${curve.slug}): ${curve.short.en}`
          ),
        ];

        let posts = getLocalPosts(baseLocale);
        try {
          const { listPublishedArticles, findPublishedBySlug } =
            await import('@/modules/posts/service');
          const rows = await listPublishedArticles().catch(() => []);
          const dbPosts = rows.map((row) => ({
            slug: row.slug,
            title: row.title || row.slug,
            description: row.description || '',
            createdAt: new Date(row.createdAt).toISOString(),
            availableLocales: [baseLocale],
            source: 'db' as const,
          }));
          posts = mergePosts(dbPosts, posts);

          if (posts.length > 0) {
            lines.push(
              `- [Manim Math Animation Guides](${app_url}/blog): Practical guides to Manim animation and choosing a math video tool.`,
              '',
              '## Blog Posts',
              ''
            );

            for (const post of posts) {
              lines.push(`### ${post.title}`, '');
              lines.push(`URL: ${app_url}/blog/${post.slug}`);
              if (post.description)
                lines.push(`Description: ${post.description}`);
              lines.push('');

              if (post.source === 'db') {
                const detail = await findPublishedBySlug(post.slug).catch(
                  () => null
                );
                if (detail?.content) {
                  lines.push(detail.content, '');
                }
              }

              lines.push('---', '');
            }
          }
        } catch {
          // Database unreachable — list local posts without content.
          if (posts.length > 0) {
            lines.push(
              `- [Manim Math Animation Guides](${app_url}/blog): Practical guides to Manim animation and choosing a math video tool.`,
              '',
              '## Blog Posts',
              ''
            );
            for (const post of posts) {
              lines.push(`### ${post.title}`, '');
              lines.push(`URL: ${app_url}/blog/${post.slug}`);
              if (post.description)
                lines.push(`Description: ${post.description}`);
              lines.push('', '---', '');
            }
          }
        }

        lines.push('');

        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
