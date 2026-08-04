import { m } from '@/paraglide/messages.js';
import {
  CtaBand,
  PageFaq,
  PageHero,
  SectionCards,
} from '@/components/marketing-sections';

export function FreeMathVideoCreatorPage() {
  return (
    <>
      <PageHero
        eyebrow={m['pages.free.eyebrow']()}
        heading={m['pages.free.h1']()}
        lead={m['pages.free.lead']()}
        primary={{ label: m['pages.free.cta_primary'](), href: '/creator' }}
        secondary={{ label: m['pages.free.cta_secondary'](), href: '/pricing' }}
      />
      <SectionCards
        id="free-included"
        title={m['pages.free.included_title']()}
        description={m['pages.free.included_desc']()}
        columns={4}
        items={[
          {
            title: m['pages.free.included_credits_title'](),
            description: m['pages.free.included_credits_desc'](),
          },
          {
            title: m['pages.free.included_planning_title'](),
            description: m['pages.free.included_planning_desc'](),
          },
          {
            title: m['pages.free.included_code_title'](),
            description: m['pages.free.included_code_desc'](),
          },
          {
            title: m['pages.free.included_models_title'](),
            description: m['pages.free.included_models_desc'](),
          },
        ]}
      />
      <SectionCards
        id="free-steps"
        title={m['pages.free.steps_title']()}
        items={[
          {
            index: '01',
            title: m['pages.free.step1_title'](),
            description: m['pages.free.step1_desc'](),
          },
          {
            index: '02',
            title: m['pages.free.step2_title'](),
            description: m['pages.free.step2_desc'](),
          },
          {
            index: '03',
            title: m['pages.free.step3_title'](),
            description: m['pages.free.step3_desc'](),
          },
        ]}
      />
      <SectionCards
        id="free-credits"
        title={m['pages.free.credits_title']()}
        description={m['pages.free.credits_desc']()}
        columns={3}
        items={[
          {
            title: m['pages.free.credits_plan_title'](),
            description: m['pages.free.credits_plan_desc'](),
          },
          {
            title: m['pages.free.credits_render_title'](),
            description: m['pages.free.credits_render_desc'](),
          },
          {
            title: m['pages.free.credits_refund_title'](),
            description: m['pages.free.credits_refund_desc'](),
          },
        ]}
      />
      <PageFaq
        id="free-faq"
        title={m['pages.free.faq_title']()}
        items={[
          {
            question: m['pages.free.faq1_q'](),
            answer: m['pages.free.faq1_a'](),
          },
          {
            question: m['pages.free.faq2_q'](),
            answer: m['pages.free.faq2_a'](),
          },
          {
            question: m['pages.free.faq3_q'](),
            answer: m['pages.free.faq3_a'](),
          },
        ]}
      />
      <CtaBand
        title={m['pages.free.band_title']()}
        lead={m['pages.free.band_lead']()}
        button={{ label: m['pages.free.band_button'](), href: '/creator' }}
      />
    </>
  );
}
