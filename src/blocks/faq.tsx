import { getPricingProduct } from '@/config/pricing';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { FaqList } from '@/components/faq-list';

type Msg = (inputs?: object, options?: { locale?: never }) => string;

function priceLabel(productId: string, locale?: string) {
  const product = getPricingProduct(productId);
  if (!product) return null;
  const price = new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: product.currency,
    maximumFractionDigits: product.priceInCents % 100 === 0 ? 0 : 2,
  }).format(product.priceInCents / 100);
  return { name: product.planName, price, credits: product.credits };
}

/** Plan prices for the video-cost answer, from the catalog checkout uses. */
function videoCostInputs(locale?: string) {
  const starter = priceLabel('starter_monthly', locale);
  const pro = priceLabel('pro_monthly', locale);
  if (!starter || !pro) return null;
  const count = new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US');
  return {
    starter: starter.name,
    starterPrice: starter.price,
    starterCredits: count.format(starter.credits),
    pro: pro.name,
    proPrice: pro.price,
    proCredits: count.format(pro.credits),
  };
}

/**
 * Lab questions first: most visitors arrive through a lab. Then what CurvG
 * is, who it is for, what is free and what a video costs (the checklist in
 * docs/GPT_TRAFFIC_CHECKLIST.md asks for 10+ direct answers here).
 */
const ENTRIES: [key: string, question: Msg, answer: Msg][] = [
  [
    'labs_free',
    m['landing.faq.labs_free.question'],
    m['landing.faq.labs_free.answer'],
  ],
  [
    'labs_video',
    m['landing.faq.labs_video.question'],
    m['landing.faq.labs_video.answer'],
  ],
  [
    'what_is',
    m['landing.faq.what_is.question'],
    m['landing.faq.what_is.answer'],
  ],
  [
    'who_for',
    m['landing.faq.who_for.question'],
    m['landing.faq.who_for.answer'],
  ],
  ['free', m['landing.faq.free.question'], m['landing.faq.free.answer']],
  ['export', m['landing.faq.export.question'], m['landing.faq.export.answer']],
  [
    'difference',
    m['landing.faq.difference.question'],
    m['landing.faq.difference.answer'],
  ],
  [
    'accuracy',
    m['landing.faq.accuracy.question'],
    m['landing.faq.accuracy.answer'],
  ],
  [
    'installation',
    m['landing.faq.installation.question'],
    m['landing.faq.installation.answer'],
  ],
  [
    'editing',
    m['landing.faq.editing.question'],
    m['landing.faq.editing.answer'],
  ],
  [
    'rendering',
    m['landing.faq.rendering.question'],
    m['landing.faq.rendering.answer'],
  ],
];

/** Homepage FAQ entries; the route's FAQPage structured data uses the same list. */
export function homeFaqEntries(locale?: string) {
  const opts = locale ? { locale: locale as never } : undefined;
  const entries = ENTRIES.map(([key, question, answer]) => ({
    key,
    question: question({}, opts),
    answer: answer({}, opts),
  }));
  const cost = videoCostInputs(locale ?? getLocale());
  if (cost) {
    // After "Can I use CurvG for free?": the paid half of the same question.
    const at = entries.findIndex((entry) => entry.key === 'free') + 1;
    entries.splice(at, 0, {
      key: 'video_cost',
      question: m['landing.faq.video_cost.question']({}, opts),
      answer: m['landing.faq.video_cost.answer'](cost, opts),
    });
  }
  return entries;
}

export function FAQ() {
  return (
    <section id="faq">
      <div className="curvg-stage curvg-frame curvg-section-field curvg-section-spacing relative">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <FaqList
          eyebrow={m['landing.faq.eyebrow']()}
          title={m['landing.faq.title']()}
          description={m['landing.faq.description']()}
          items={homeFaqEntries()}
        />
      </div>
    </section>
  );
}
