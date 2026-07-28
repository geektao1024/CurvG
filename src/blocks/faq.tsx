import { m } from '@/paraglide/messages.js';

export function FAQ() {
  const questions = [
    {
      key: 'what-is',
      question: m['landing.faq.what_is.question'](),
      answer: m['landing.faq.what_is.answer'](),
    },
    {
      key: 'difference',
      question: m['landing.faq.difference.question'](),
      answer: m['landing.faq.difference.answer'](),
    },
    {
      key: 'accuracy',
      question: m['landing.faq.accuracy.question'](),
      answer: m['landing.faq.accuracy.answer'](),
    },
    {
      key: 'installation',
      question: m['landing.faq.installation.question'](),
      answer: m['landing.faq.installation.answer'](),
    },
    {
      key: 'editing',
      question: m['landing.faq.editing.question'](),
      answer: m['landing.faq.editing.answer'](),
    },
    {
      key: 'rendering',
      question: m['landing.faq.rendering.question'](),
      answer: m['landing.faq.rendering.answer'](),
    },
    {
      key: 'free',
      question: m['landing.faq.free.question'](),
      answer: m['landing.faq.free.answer'](),
    },
  ];

  return (
    <section id="faq">
      <div className="curvg-stage curvg-frame curvg-section-field curvg-section-spacing relative border-t">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center sm:mb-12">
            <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
              {m['landing.faq.eyebrow']()}
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {m['landing.faq.title']()}
            </h2>
            <p className="text-muted-foreground mx-auto mt-5 max-w-xl leading-7">
              {m['landing.faq.description']()}
            </p>
          </div>
          <div className="border-border w-full border-y">
            {questions.map(({ key, question, answer }) => (
              <details
                key={key}
                className="group border-border border-b last:border-b-0"
              >
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-base font-semibold [&::-webkit-details-marker]:hidden">
                  <span>{question}</span>
                  <span
                    aria-hidden
                    className="text-primary shrink-0 text-xl font-normal transition-transform group-open:rotate-45"
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
      </div>
    </section>
  );
}
