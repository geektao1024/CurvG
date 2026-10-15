import { MathTex } from '@/components/math-tex';

export type FormulaRow = {
  label: string;
  /** Qualifier after the label, e.g. "one arch". */
  note?: string;
  tex: readonly string[];
  /** A rule in words (fractals), shown below any formula. */
  text?: string;
  /** Live value for the parameters on screen, e.g. "≈ 7.2". */
  current?: string;
};

/**
 * The formula card beside a curve's interactive graph: each form of the
 * equation and each key value on its own labelled row, then what the
 * letters mean. Rendered with KaTeX on the server so the formulas are in
 * the crawled HTML.
 */
export function CurveFormulaCard({
  id,
  title,
  rows,
  where,
  currentLabel,
}: {
  id: string;
  title: string;
  rows: readonly FormulaRow[];
  where: string;
  /** Prefix for live values, e.g. "In the graph". */
  currentLabel: string;
}) {
  return (
    <section className="bg-card rounded-2xl border" aria-labelledby={id}>
      <h2
        id={id}
        className="text-muted-foreground border-b px-5 py-3 font-mono text-[10px] tracking-[0.14em] uppercase"
      >
        {title}
      </h2>
      <dl className="divide-y">
        {rows.map((row, index) => (
          <div key={`${row.label}-${index}`} className="px-5 py-3">
            <dt className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm font-medium">
              <span>
                {row.label}
                {row.note ? (
                  <span className="text-muted-foreground font-normal">
                    {' · '}
                    {row.note}
                  </span>
                ) : null}
              </span>
              {row.current ? (
                <span
                  className="text-primary font-mono text-xs font-normal tabular-nums"
                  aria-live="polite"
                >
                  {currentLabel} {row.current}
                </span>
              ) : null}
            </dt>
            <dd className="mt-0.5">
              {row.tex.map((tex) => (
                <MathTex
                  key={tex}
                  tex={tex}
                  className="py-0 [&_.katex-display]:my-1! [&_.katex-display>.katex]:text-left!"
                />
              ))}
              {row.text ? (
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {row.text}
                </p>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground border-t px-5 py-3 text-xs leading-relaxed">
        {where}
      </p>
    </section>
  );
}
