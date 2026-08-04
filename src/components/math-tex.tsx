import { useMemo } from 'react';
import katex from 'katex';

import 'katex/dist/katex.min.css';

import { cn } from '@/lib/utils';

/**
 * Server-renderable KaTeX display. Unlike the effect-based typesetter in
 * math-formula-preview, renderToString runs during SSR, so equations are
 * present in the crawled HTML.
 */
export function MathTex({
  tex,
  className,
}: {
  tex: string;
  className?: string;
}) {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: true,
        throwOnError: false,
        strict: 'ignore',
        trust: false,
        output: 'htmlAndMathml',
        errorColor: '#dc2626',
      }),
    [tex]
  );
  return (
    <div
      className={cn('min-w-0 overflow-x-auto py-1', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
