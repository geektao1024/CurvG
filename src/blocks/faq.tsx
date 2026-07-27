import { tDynamic } from '@/core/i18n/dynamic';
import { m } from '@/paraglide/messages.js';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const FAQ_KEYS = [
  'what_is',
  'version',
  'installation',
  'editing',
  'free',
] as const;

export function FAQ() {
  return (
    <section id="faq">
      <div className="curvg-stage curvg-frame curvg-section-field relative border-t px-6 py-20 sm:px-10 sm:py-28">
        <span className="curvg-corner top-5 left-5" aria-hidden />
        <span className="curvg-corner top-5 right-5" aria-hidden />
        <div className="mx-auto max-w-3xl">
          <div className="mb-16 text-center">
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
          <Accordion className="w-full">
            {FAQ_KEYS.map((key) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="cursor-pointer py-6 text-left text-base font-semibold hover:no-underline">
                  {tDynamic(`landing.faq.${key}.question`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {tDynamic(`landing.faq.${key}.answer`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
