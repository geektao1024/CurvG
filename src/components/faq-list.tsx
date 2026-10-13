export type FaqItem = { key: string; question: string; answer: string };

/**
 * Centered FAQ: eyebrow, heading, lead, then native <details> rows that
 * expand smoothly (`.curvg-disclosure` in globals.css). Used by the homepage
 * and pricing FAQs; FAQPage structured data is emitted by each route.
 */
export function FaqList({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: readonly FaqItem[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-10 text-center sm:mb-12">
        <p className="text-primary font-mono text-xs font-semibold tracking-[0.18em] uppercase">
          {eyebrow}
        </p>
        <h2 className="curvg-heading mt-4 text-4xl sm:text-5xl">{title}</h2>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl leading-7">
          {description}
        </p>
      </div>
      <div className="border-border w-full border-y">
        {items.map(({ key, question, answer }) => (
          <details
            key={key}
            className="curvg-disclosure group border-border border-b last:border-b-0"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-semibold [&::-webkit-details-marker]:hidden">
              <span>{question}</span>
              <span
                aria-hidden
                className="text-primary group-open:bg-accent grid size-7 shrink-0 place-items-center rounded-full border text-lg font-normal transition-[transform,background-color] duration-300 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="text-muted-foreground max-w-2xl pb-6 leading-relaxed">
              {answer}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
