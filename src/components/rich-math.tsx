import { useMemo } from 'react';
import katex from 'katex';

import 'katex/dist/katex.min.css';

import { parseRichMath, type RichInline } from '@/lib/rich-math';
import { cn } from '@/lib/utils';

function renderTex(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    strict: 'ignore',
    trust: false,
    output: 'htmlAndMathml',
    errorColor: '#dc2626',
  });
}

/** Inline KaTeX. Server-renderable, like MathTex. */
export function InlineTex({
  tex,
  className,
}: {
  tex: string;
  className?: string;
}) {
  const html = useMemo(() => renderTex(tex, false), [tex]);
  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function Inlines({ inlines }: { inlines: RichInline[] }) {
  return (
    <>
      {inlines.map((inline, i) =>
        inline.kind === 'math' ? (
          <InlineTex key={i} tex={inline.tex} />
        ) : inline.bold ? (
          <strong key={i} className="text-foreground font-semibold">
            {inline.value}
          </strong>
        ) : (
          <span key={i}>{inline.value}</span>
        )
      )}
    </>
  );
}

/**
 * Prose with math: paragraphs, `- ` lists, `$…$`, `$$…$$`, `**bold**`.
 * Format in `@/lib/rich-math`.
 */
export function RichMath({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const blocks = useMemo(() => parseRichMath(source), [source]);
  return (
    <div className={cn('space-y-4 leading-relaxed', className)}>
      {blocks.map((block, i) => {
        if (block.kind === 'display') {
          return (
            <div
              key={i}
              className="min-w-0 overflow-x-auto py-1"
              dangerouslySetInnerHTML={{ __html: renderTex(block.tex, true) }}
            />
          );
        }
        if (block.kind === 'list') {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inlines inlines={item} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Inlines inlines={block.inlines} />
          </p>
        );
      })}
    </div>
  );
}
