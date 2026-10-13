import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';

/**
 * Every public page except the lab workspace: the framed paper shell, the
 * sticky site header, a <main> that fills the height, and the footer.
 * `mainClassName` adds page padding or a frame; it never replaces `flex-1`.
 */
export function SitePage({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="curvg-page-shell bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className={cn('flex-1', mainClassName)}>{children}</main>
      <Footer />
    </div>
  );
}
