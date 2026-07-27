import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale } from '@/paraglide/runtime.js';
import { getLocalPosts, mergePosts } from '@/content/posts';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'Math Curve Animation Gallery and Generator',
    description:
      "Formula-driven curve previews and an overview of CurvG's reviewable Manim workflow.",
  },
  {
    path: '/creator',
    title: 'CurvG Creator',
    description:
      'An early-access AI Manim workspace for reviewing equations, scene specifications, generated code, and render output.',
  },
  {
    path: '/pricing',
    title: 'Pricing and Early Access',
    description:
      'Current pricing status and the production render-cost validation required before paid plans launch.',
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
  'CurvG is a formula-first Manim math animation generator and curve gallery that separates equations, scene specifications, code, and isolated rendering into reviewable stages.';

const PRODUCT_FACTS = [
  'CurvG does not claim that AI output is automatically mathematically correct.',
  'The Creator review workflow and Manim code generation are implemented.',
  'A local Queue-to-Sandbox-to-Manim-to-R2 render path has produced and read back a real MP4 and thumbnail.',
  'A complete real-model request and production Cloudflare deployment are not yet verified.',
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
