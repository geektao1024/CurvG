import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { getLocale } from '@/paraglide/runtime.js';
import { chapterPath } from '@/content/labs';

import { resolveWorkspace, workspaceHead, WorkspacePage } from '../-labs-page';

function ChapterPage() {
  const { locale, suite, chapter } = Route.useLoaderData();
  const target = resolveWorkspace(suite, chapter);
  return target ? <WorkspacePage target={target} locale={locale} /> : null;
}

export const Route = createFileRoute('/labs/$suite/$chapter')({
  loader: ({ params }) => {
    const target = resolveWorkspace(params.suite, params.chapter);
    if (!target) throw notFound();
    // The opening chapter is served at the suite URL; keep one canonical page.
    const canonical = chapterPath(target.suite, target.lab);
    if (canonical === `/labs/${params.suite}`) {
      throw redirect({ to: canonical as never, statusCode: 301 });
    }
    return {
      locale: getLocale(),
      suite: params.suite,
      chapter: params.chapter,
    };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const target = resolveWorkspace(loaderData.suite, loaderData.chapter);
    return target ? workspaceHead(target, loaderData.locale) : {};
  },
  component: ChapterPage,
});
