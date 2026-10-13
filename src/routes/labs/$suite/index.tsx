import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { getLocale } from '@/paraglide/runtime.js';
import { getLab, labPath, suiteForLab } from '@/content/labs';

import { resolveWorkspace, workspaceHead, WorkspacePage } from '../-labs-page';

function SuitePage() {
  const { locale, suite } = Route.useLoaderData();
  const target = resolveWorkspace(suite);
  return target ? <WorkspacePage target={target} locale={locale} /> : null;
}

export const Route = createFileRoute('/labs/$suite/')({
  loader: ({ params }) => {
    // Old single-lab URLs (/labs/<chapter>) move to their place in a suite.
    const lab = getLab(params.suite);
    if (lab && suiteForLab(lab.slug)) {
      throw redirect({ to: labPath(lab) as never, statusCode: 301 });
    }
    if (!resolveWorkspace(params.suite)) throw notFound();
    return { locale: getLocale(), suite: params.suite };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const target = resolveWorkspace(loaderData.suite);
    return target ? workspaceHead(target, loaderData.locale) : {};
  },
  component: SuitePage,
});
