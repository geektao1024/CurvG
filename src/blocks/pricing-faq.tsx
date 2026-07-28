import { m } from '@/paraglide/messages.js';

export function PricingFaq() {
  const questions = [
    {
      key: 'free',
      question: m['landing.pricing.faq.free.question'](),
      answer: m['landing.pricing.faq.free.answer'](),
    },
    {
      key: 'pro',
      question: m['landing.pricing.faq.pro.question'](),
      answer: m['landing.pricing.faq.pro.answer'](),
    },
    {
      key: 'billing',
      question: m['landing.pricing.faq.billing.question'](),
      answer: m['landing.pricing.faq.billing.answer'](),
    },
    {
      key: 'code',
      question: m['landing.pricing.faq.code.question'](),
      answer: m['landing.pricing.faq.code.answer'](),
    },
    {
      key: 'rendering',
      question: m['landing.pricing.faq.rendering.question'](),
      answer: m['landing.pricing.faq.rendering.answer'](),
    },
  ];

  return (
    <section
      id="pricing-faq"
      className="border-border border-t px-4 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <p className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
            {m['landing.pricing.faq.eyebrow']()}
          </p>
          <h2 className="mt-4 font-serif text-4xl font-normal tracking-tight sm:text-5xl">
            {m['landing.pricing.faq.title']()}
          </h2>
          <p className="text-muted-foreground mx-auto mt-5 max-w-2xl leading-7">
            {m['landing.pricing.faq.description']()}
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
    </section>
  );
}
