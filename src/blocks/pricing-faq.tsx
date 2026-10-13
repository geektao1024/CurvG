import { m } from '@/paraglide/messages.js';
import { FaqList } from '@/components/faq-list';

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
      <FaqList
        eyebrow={m['landing.pricing.faq.eyebrow']()}
        title={m['landing.pricing.faq.title']()}
        description={m['landing.pricing.faq.description']()}
        items={questions}
      />
    </section>
  );
}
