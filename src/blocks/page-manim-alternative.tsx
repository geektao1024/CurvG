import { m } from '@/paraglide/messages.js';
import {
  BulletsSplit,
  ComparisonTable,
  CtaBand,
  PageFaq,
  PageHero,
} from '@/components/marketing-sections';

export function ManimAlternativePage() {
  return (
    <>
      <PageHero
        eyebrow={m['pages.manimAlt.eyebrow']()}
        heading={m['pages.manimAlt.h1']()}
        lead={m['pages.manimAlt.lead']()}
        primary={{ label: m['pages.manimAlt.cta_primary'](), href: '/creator' }}
        secondary={{
          label: m['pages.manimAlt.cta_secondary'](),
          href: '/blog/ai-manim-animation-workflow',
        }}
      />
      <ComparisonTable
        id="alt-table"
        title={m['pages.manimAlt.table_title']()}
        description={m['pages.manimAlt.table_desc']()}
        aspectHeader={m['pages.manimAlt.table_aspect']()}
        columnA={m['pages.manimAlt.table_manim']()}
        columnB={m['pages.manimAlt.table_curvg']()}
        rows={[
          {
            aspect: m['pages.manimAlt.row_setup'](),
            a: m['pages.manimAlt.row_setup_manim'](),
            b: m['pages.manimAlt.row_setup_curvg'](),
          },
          {
            aspect: m['pages.manimAlt.row_skill'](),
            a: m['pages.manimAlt.row_skill_manim'](),
            b: m['pages.manimAlt.row_skill_curvg'](),
          },
          {
            aspect: m['pages.manimAlt.row_control'](),
            a: m['pages.manimAlt.row_control_manim'](),
            b: m['pages.manimAlt.row_control_curvg'](),
          },
          {
            aspect: m['pages.manimAlt.row_render'](),
            a: m['pages.manimAlt.row_render_manim'](),
            b: m['pages.manimAlt.row_render_curvg'](),
          },
          {
            aspect: m['pages.manimAlt.row_cost'](),
            a: m['pages.manimAlt.row_cost_manim'](),
            b: m['pages.manimAlt.row_cost_curvg'](),
          },
          {
            aspect: m['pages.manimAlt.row_export'](),
            a: m['pages.manimAlt.row_export_manim'](),
            b: m['pages.manimAlt.row_export_curvg'](),
          },
        ]}
      />
      <BulletsSplit
        id="alt-when"
        title={m['pages.manimAlt.when_title']()}
        left={{
          title: m['pages.manimAlt.when_manim_title'](),
          items: [
            m['pages.manimAlt.when_manim_1'](),
            m['pages.manimAlt.when_manim_2'](),
            m['pages.manimAlt.when_manim_3'](),
          ],
        }}
        right={{
          title: m['pages.manimAlt.when_curvg_title'](),
          items: [
            m['pages.manimAlt.when_curvg_1'](),
            m['pages.manimAlt.when_curvg_2'](),
            m['pages.manimAlt.when_curvg_3'](),
          ],
        }}
      />
      <PageFaq
        id="alt-faq"
        title={m['pages.manimAlt.faq_title']()}
        items={[
          {
            question: m['pages.manimAlt.faq1_q'](),
            answer: m['pages.manimAlt.faq1_a'](),
          },
          {
            question: m['pages.manimAlt.faq2_q'](),
            answer: m['pages.manimAlt.faq2_a'](),
          },
          {
            question: m['pages.manimAlt.faq3_q'](),
            answer: m['pages.manimAlt.faq3_a'](),
          },
        ]}
      />
      <CtaBand
        title={m['pages.manimAlt.band_title']()}
        lead={m['pages.manimAlt.band_lead']()}
        button={{ label: m['pages.manimAlt.band_button'](), href: '/creator' }}
      />
    </>
  );
}
