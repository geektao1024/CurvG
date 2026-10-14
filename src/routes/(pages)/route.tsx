import { createFileRoute, Outlet } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';

import { SitePage } from '@/blocks/site-page';
import { mdxComponents } from '@/components/mdx-components';

export const Route = createFileRoute('/(pages)')({
  component: PagesLayout,
});

function PagesLayout() {
  return (
    <SitePage mainClassName="curvg-stage curvg-frame">
      <div className="mx-auto max-w-3xl px-6 pt-10 pb-12 md:px-8 md:pb-16">
        <MDXProvider components={mdxComponents}>
          <Outlet />
        </MDXProvider>
      </div>
    </SitePage>
  );
}
