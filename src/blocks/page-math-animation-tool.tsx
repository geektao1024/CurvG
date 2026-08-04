import { m } from '@/paraglide/messages.js';
import {
  BulletsSplit,
  CtaBand,
  PageFaq,
  PageHero,
  SectionCards,
} from '@/components/marketing-sections';

export function MathAnimationToolPage() {
  return (
    <>
      <PageHero
        eyebrow={m['pages.tool.eyebrow']()}
        heading={m['pages.tool.h1']()}
        lead={m['pages.tool.lead']()}
        primary={{ label: m['pages.tool.cta_primary'](), href: '/creator' }}
        secondary={{ label: m['pages.tool.cta_secondary'](), href: '/curves' }}
      />
      <SectionCards
        id="tool-steps"
        title={m['pages.tool.steps_title']()}
        items={[
          {
            index: '01',
            title: m['pages.tool.step1_title'](),
            description: m['pages.tool.step1_desc'](),
          },
          {
            index: '02',
            title: m['pages.tool.step2_title'](),
            description: m['pages.tool.step2_desc'](),
          },
          {
            index: '03',
            title: m['pages.tool.step3_title'](),
            description: m['pages.tool.step3_desc'](),
          },
        ]}
      />
      <SectionCards
        id="tool-covers"
        title={m['pages.tool.covers_title']()}
        description={m['pages.tool.covers_desc']()}
        columns={4}
        items={[
          {
            title: m['pages.tool.covers_functions_title'](),
            description: m['pages.tool.covers_functions_desc'](),
          },
          {
            title: m['pages.tool.covers_geometry_title'](),
            description: m['pages.tool.covers_geometry_desc'](),
          },
          {
            title: m['pages.tool.covers_calculus_title'](),
            description: m['pages.tool.covers_calculus_desc'](),
          },
          {
            title: m['pages.tool.covers_linear_title'](),
            description: m['pages.tool.covers_linear_desc'](),
          },
        ]}
      />
      <BulletsSplit
        id="tool-online"
        title={m['pages.tool.online_title']()}
        left={{
          title: m['pages.tool.online_removes_title'](),
          items: [
            m['pages.tool.online_removes_1'](),
            m['pages.tool.online_removes_2'](),
            m['pages.tool.online_removes_3'](),
          ],
        }}
        right={{
          title: m['pages.tool.online_keeps_title'](),
          items: [
            m['pages.tool.online_keeps_1'](),
            m['pages.tool.online_keeps_2'](),
            m['pages.tool.online_keeps_3'](),
          ],
        }}
      />
      <PageFaq
        id="tool-faq"
        title={m['pages.tool.faq_title']()}
        items={[
          {
            question: m['pages.tool.faq1_q'](),
            answer: m['pages.tool.faq1_a'](),
          },
          {
            question: m['pages.tool.faq2_q'](),
            answer: m['pages.tool.faq2_a'](),
          },
          {
            question: m['pages.tool.faq3_q'](),
            answer: m['pages.tool.faq3_a'](),
          },
        ]}
      />
      <CtaBand
        title={m['pages.tool.band_title']()}
        lead={m['pages.tool.band_lead']()}
        button={{ label: m['pages.tool.band_button'](), href: '/creator' }}
      />
    </>
  );
}
