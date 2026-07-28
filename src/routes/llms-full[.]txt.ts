import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'AI-assisted Manim Scene and Code Generator',
    description:
      'Plan a mathematical explanation, review the scene sequence, and generate portable Manim Community code.',
  },
  {
    path: '/creator',
    title: 'CurvG Creator',
    description:
      'An early-access workspace for reviewing mathematical assumptions, scene plans, generated code, and available render output.',
  },
  {
    path: '/pricing',
    title: 'Early Access',
    description:
      'What users can create today and the current status of paid plans and remote rendering.',
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
  'CurvG is an AI-assisted Manim creation tool that turns a written explanation goal into a reviewable scene plan and portable Manim Community code.';

const PRODUCT_FACTS = [
  'CurvG does not claim that AI output is automatically mathematically correct.',
  'The Creator can generate a scene plan and Manim code that users can review, copy, and download.',
  'Direct code editing and compilation in the browser are not currently available.',
  'Remote rendering is not currently offered as a generally available production service.',
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
