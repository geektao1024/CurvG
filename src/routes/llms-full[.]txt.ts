import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'AI Math Animation Maker',
    description:
      'Create math animations online: describe a concept, review the scene plan and Manim Community code, then render an MP4 in the cloud. Free to start.',
  },
  {
    path: '/creator',
    title: 'Manim AI Generator (Creator)',
    description:
      'The creation workspace: describe a math concept, review the proposed scene plan and generated Manim code, then render the approved scene to a video.',
  },
  {
    path: '/pricing',
    title: 'Pricing',
    description:
      'Free, Starter ($9.90), and Pro ($18.90) plans with curated AI models and cloud render credits.',
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

const PRODUCT_DESCRIPTION =
  'CurvG is an AI math animation maker built on Manim Community. It turns a written explanation goal into a reviewable scene plan, portable Manim Community code, and a cloud-rendered MP4 video.';

const PRODUCT_FACTS = [
  'CurvG does not claim that AI output is automatically mathematically correct.',
  'The Creator can generate a scene plan and Manim code that users can review, copy, and download.',
  'Direct code editing and compilation in the browser are not currently available.',
  'Hosted cloud rendering is available; paid plans include render credits, and failed or canceled renders are refunded.',
  'New accounts start with free credits.',
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
              `- [Manim Math Animation Guides](${app_url}/blog): Practical guides to Manim animation, equation visualization, and reviewable rendering.`,
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
              `- [Manim Math Animation Guides](${app_url}/blog): Practical guides to Manim animation, equation visualization, and reviewable rendering.`,
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
