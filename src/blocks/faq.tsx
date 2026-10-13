import { m } from '@/paraglide/messages.js';
import { FaqList } from '@/components/faq-list';

type Msg = (inputs?: object, options?: { locale?: never }) => string;

/** Lab questions first: most visitors arrive through a lab. */
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
  ['free', m['landing.faq.free.question'], m['landing.faq.free.answer']],
];

/** Homepage FAQ entries; the route's FAQPage structured data uses the same list. */
export function homeFaqEntries(locale?: string) {
  const opts = locale ? { locale: locale as never } : undefined;
  return ENTRIES.map(([key, question, answer]) => ({
    key,
    question: question({}, opts),
    answer: answer({}, opts),
  }));
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
