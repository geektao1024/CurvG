import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { baseLocale } from '@/paraglide/runtime.js';
import { CURVES } from '@/content/curves';
import {
  labPath,
  publicSubjects,
  subjectPath,
  suitesForSubject,
} from '@/content/labs';
import { getLocalPosts, mergePosts } from '@/content/posts';
import { localeText } from '@/content/text';
import { publicWonders, wonderPath } from '@/content/wonders';

const STATIC_PAGES: { path: string; title: string; description: string }[] = [
  {
    path: '',
    title: 'CurvG — Interactive Math Labs, Animations & Explainer Videos',
    description:
      'Home: interactive labs you can drag, animated math wonders, the curve encyclopedia, and the Creator for Manim explainer videos.',
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
    path: '/math-animation-tool',
    title: 'Online Math Animation Tool',
    description:
      'How the browser-based workflow covers functions, geometry, calculus, and linear algebra animations.',
  },
  {
    path: '/free-math-video-creator',
    title: 'Free Math Video Creator',
    description:
      'What the free tier includes: 3 free preview videos (720p, watermarked), every video template, Manim code export, and refund rules.',
  },
  {
    path: '/manim-alternative',
    title: 'Manim Alternative Without Coding',
    description:
      'An honest comparison of CurvG and raw Manim CE, including when raw Manim is the better choice.',
  },
  {
    path: '/labs',
    title: 'Interactive Math & Physics Labs',
    description:
      'Free interactive lessons: drag a live board, follow a guided tour, read the explanation and take a short quiz. Functions and calculus, conic sections, geometry, probability, motion, forces and waves.',
  },
  {
    path: '/curves',
    title: 'Math Curve Encyclopedia',
    description: `${CURVES.length} classic and fractal curves: interactive graphs with presets, formulas with key values (arc length, area), a drawing animation of how each curve is made, free SVG/PNG/CSV export, and a one-click video brief.`,
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
  'CurvG turns math into animations you can watch, play with and export: free interactive math and physics labs, animated math wonders (Fourier series, the Mandelbrot set, the Lorenz attractor, phyllotaxis), a 30-curve encyclopedia, and a Creator that plans Manim Community explainer videos.';

const PRODUCT_FACTS = [
  'The labs, math wonders and curve encyclopedia are free and run in the browser; numbers shown on them are computed live and pinned by tests.',
  'Subjects: mathematics first; physics only where the mathematics is the subject (motion, oscillations, waves, chaos).',
  'CurvG does not claim that AI output is automatically mathematically correct.',
  'The Creator can generate a scene plan and Manim code that users can review, copy, and download.',
  'Direct code editing and compilation in the browser are not currently available.',
  'Hosted cloud rendering is available; paid plans include render credits, and failed or canceled renders are refunded.',
  'Videos are made from verified templates (an AI picks the template and fills in the parameters; free-form AI generation is a beta). Every verified account gets 3 free preview videos (720p, watermarked); clean 1080p videos are priced by the number of videos.',
];

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { app_url, app_name } = envConfigs;

        let posts = getLocalPosts(baseLocale);
        try {
          const { listPublishedArticles } =
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
        } catch {
          // Database unreachable — local posts still listed.
        }

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
          '## Interactive Labs',
          '',
          ...publicSubjects().flatMap((subject) => [
            `### [${localeText(subject.name, 'en')}](${app_url}${subjectPath(subject.id)})`,
            '',
            localeText(subject.description, 'en'),
            '',
            ...suitesForSubject(subject.id).flatMap((suite) => [
              `#### ${localeText(suite.name, 'en')}`,
              '',
              ...suite.chapters
                .filter((lab) => lab.publication === 'public')
                .map(
                  (lab) =>
                    `- [${localeText(lab.title, 'en')}](${app_url}${labPath(lab)}): ${localeText(lab.summary, 'en')}`
                ),
              '',
            ]),
          ]),
          '## Math Wonders',
          '',
          'Animated stories about striking math phenomena, each followed by a playable stage. Separate from the syllabus-ordered labs.',
          '',
          ...publicWonders().map(
            (wonder) =>
              `- [${localeText(wonder.question, 'en')}](${app_url}${wonderPath(wonder)}): ${localeText(wonder.summary, 'en')}`
          ),
          '',
        ];

        if (posts.length > 0) {
          lines.push(
            `- [Manim Math Animation Guides](${app_url}/blog): Practical guides to Manim animation, equation visualization, and reviewable rendering.`,
            '',
            '## Blog Posts',
            ''
          );
          for (const post of posts) {
            lines.push(
              `- [${post.title}](${app_url}/blog/${post.slug}): ${post.description}`
            );
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
