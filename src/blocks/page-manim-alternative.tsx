import { m } from '@/paraglide/messages.js';
import {
  BulletsSplit,
  CompareGrid,
  ComparisonTable,
  CtaBand,
  PageFaq,
  PageHero,
  SectionCards,
  SourceList,
  ToolList,
} from '@/components/marketing-sections';

/** Used by the page and by the route's FAQPage JSON-LD, so both stay in step. */
export const manimAltFaq = (locale?: 'en' | 'zh') => [
  {
    question: m['pages.manimAlt.faq4_q']({}, { locale }),
    answer: m['pages.manimAlt.faq4_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq5_q']({}, { locale }),
    answer: m['pages.manimAlt.faq5_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq6_q']({}, { locale }),
    answer: m['pages.manimAlt.faq6_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq1_q']({}, { locale }),
    answer: m['pages.manimAlt.faq1_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq2_q']({}, { locale }),
    answer: m['pages.manimAlt.faq2_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq3_q']({}, { locale }),
    answer: m['pages.manimAlt.faq3_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq9_q']({}, { locale }),
    answer: m['pages.manimAlt.faq9_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq10_q']({}, { locale }),
    answer: m['pages.manimAlt.faq10_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq7_q']({}, { locale }),
    answer: m['pages.manimAlt.faq7_a']({}, { locale }),
  },
  {
    question: m['pages.manimAlt.faq8_q']({}, { locale }),
    answer: m['pages.manimAlt.faq8_a']({}, { locale }),
  },
];

export function ManimAlternativePage() {
  const tools = [
    {
      name: 'CurvG',
      fit: m['pages.manimAlt.tool_curvg_fit'](),
      body: m['pages.manimAlt.tool_curvg_body'](),
      limit: m['pages.manimAlt.tool_curvg_limit'](),
      price: m['pages.manimAlt.tool_curvg_price'](),
      href: '/creator',
      linkLabel: m['pages.manimAlt.tool_curvg_link'](),
    },
    {
      // Revideo is a Motion Canvas fork, so it shares this entry.
      name: 'Motion Canvas / Revideo',
      fit: m['pages.manimAlt.tool_motion_fit'](),
      body: m['pages.manimAlt.tool_motion_body'](),
      limit: m['pages.manimAlt.tool_motion_limit'](),
      price: m['pages.manimAlt.tool_motion_price'](),
      href: 'https://motioncanvas.io/',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
    {
      name: 'Remotion',
      fit: m['pages.manimAlt.tool_remotion_fit'](),
      body: m['pages.manimAlt.tool_remotion_body'](),
      limit: m['pages.manimAlt.tool_remotion_limit'](),
      price: m['pages.manimAlt.tool_remotion_price'](),
      href: 'https://www.remotion.dev/docs/license/pricing',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
    {
      name: 'Blender',
      fit: m['pages.manimAlt.tool_blender_fit'](),
      body: m['pages.manimAlt.tool_blender_body'](),
      limit: m['pages.manimAlt.tool_blender_limit'](),
      price: m['pages.manimAlt.tool_blender_price'](),
      href: 'https://www.blender.org/',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
    {
      name: 'Synfig',
      fit: m['pages.manimAlt.tool_synfig_fit'](),
      body: m['pages.manimAlt.tool_synfig_body'](),
      limit: m['pages.manimAlt.tool_synfig_limit'](),
      price: m['pages.manimAlt.tool_synfig_price'](),
      href: 'https://www.synfig.org/',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
    {
      name: 'GeoGebra',
      fit: m['pages.manimAlt.tool_geogebra_fit'](),
      body: m['pages.manimAlt.tool_geogebra_body'](),
      limit: m['pages.manimAlt.tool_geogebra_limit'](),
      price: m['pages.manimAlt.tool_geogebra_price'](),
      href: 'https://www.geogebra.org/',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
    {
      name: 'Tracé',
      fit: m['pages.manimAlt.tool_trace_fit'](),
      body: m['pages.manimAlt.tool_trace_body'](),
      limit: m['pages.manimAlt.tool_trace_limit'](),
      price: m['pages.manimAlt.tool_trace_price'](),
      href: 'https://traceanim.com/',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
    {
      name: 'LemmaReel',
      fit: m['pages.manimAlt.tool_lemma_fit'](),
      body: m['pages.manimAlt.tool_lemma_body'](),
      limit: m['pages.manimAlt.tool_lemma_limit'](),
      price: m['pages.manimAlt.tool_lemma_price'](),
      href: 'https://lemmareel.com/',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
    {
      name: 'fastanim',
      fit: m['pages.manimAlt.tool_fastanim_fit'](),
      body: m['pages.manimAlt.tool_fastanim_body'](),
      limit: m['pages.manimAlt.tool_fastanim_limit'](),
      price: m['pages.manimAlt.tool_fastanim_price'](),
      href: 'https://pypi.org/project/fastanim/',
      linkLabel: m['pages.manimAlt.tool_link_label'](),
    },
  ];
  const gridRows = [
    {
      name: 'Manim CE',
      cells: [
        m['pages.manimAlt.grid_manim_code'](),
        m['pages.manimAlt.grid_manim_output'](),
        m['pages.manimAlt.grid_manim_price'](),
      ],
    },
    {
      name: 'CurvG',
      highlight: true,
      cells: [
        m['pages.manimAlt.grid_curvg_code'](),
        m['pages.manimAlt.grid_curvg_output'](),
        m['pages.manimAlt.grid_curvg_price'](),
      ],
    },
    {
      name: 'Motion Canvas / Revideo',
      cells: [
        m['pages.manimAlt.grid_motion_code'](),
        m['pages.manimAlt.grid_motion_output'](),
        m['pages.manimAlt.grid_motion_price'](),
      ],
    },
    {
      name: 'Remotion',
      cells: [
        m['pages.manimAlt.grid_remotion_code'](),
        m['pages.manimAlt.grid_remotion_output'](),
        m['pages.manimAlt.grid_remotion_price'](),
      ],
    },
    {
      name: 'Blender',
      cells: [
        m['pages.manimAlt.grid_blender_code'](),
        m['pages.manimAlt.grid_blender_output'](),
        m['pages.manimAlt.grid_blender_price'](),
      ],
    },
    {
      name: 'Synfig',
      cells: [
        m['pages.manimAlt.grid_synfig_code'](),
        m['pages.manimAlt.grid_synfig_output'](),
        m['pages.manimAlt.grid_synfig_price'](),
      ],
    },
    {
      name: 'GeoGebra',
      cells: [
        m['pages.manimAlt.grid_geogebra_code'](),
        m['pages.manimAlt.grid_geogebra_output'](),
        m['pages.manimAlt.grid_geogebra_price'](),
      ],
    },
    {
      name: 'Tracé',
      cells: [
        m['pages.manimAlt.grid_trace_code'](),
        m['pages.manimAlt.grid_trace_output'](),
        m['pages.manimAlt.grid_trace_price'](),
      ],
    },
    {
      name: 'LemmaReel',
      cells: [
        m['pages.manimAlt.grid_lemma_code'](),
        m['pages.manimAlt.grid_lemma_output'](),
        m['pages.manimAlt.grid_lemma_price'](),
      ],
    },
    {
      name: 'fastanim',
      cells: [
        m['pages.manimAlt.grid_fastanim_code'](),
        m['pages.manimAlt.grid_fastanim_output'](),
        m['pages.manimAlt.grid_fastanim_price'](),
      ],
    },
  ];
  const quick = [
    {
      title: m['pages.manimAlt.quick_code_title'](),
      description: m['pages.manimAlt.quick_code_desc'](),
    },
    {
      title: m['pages.manimAlt.quick_live_title'](),
      description: m['pages.manimAlt.quick_live_desc'](),
    },
    {
      title: m['pages.manimAlt.quick_video_title'](),
      description: m['pages.manimAlt.quick_video_desc'](),
    },
    {
      title: m['pages.manimAlt.quick_python_title'](),
      description: m['pages.manimAlt.quick_python_desc'](),
    },
  ];
  const sources = [
    {
      label: m['pages.manimAlt.source_manim'](),
      href: 'https://docs.manim.community/en/stable/installation/uv.html',
    },
    {
      label: m['pages.manimAlt.source_motion'](),
      href: 'https://github.com/motion-canvas/motion-canvas/releases',
    },
    {
      label: m['pages.manimAlt.source_revideo'](),
      href: 'https://midrender.com/revideo',
    },
    {
      label: m['pages.manimAlt.source_remotion'](),
      href: 'https://www.remotion.dev/docs/license/pricing',
    },
    {
      label: m['pages.manimAlt.source_blender'](),
      href: 'https://www.blender.org/about/license/',
    },
    {
      label: m['pages.manimAlt.source_synfig'](),
      href: 'https://www.synfig.org/category/releases/',
    },
    {
      label: m['pages.manimAlt.source_geogebra'](),
      href: 'https://www.geogebra.org/license',
    },
    {
      label: m['pages.manimAlt.source_trace'](),
      href: 'https://traceanim.com/manim-alternative',
    },
    {
      label: m['pages.manimAlt.source_lemma'](),
      href: 'https://lemmareel.com/pricing',
    },
    {
      label: m['pages.manimAlt.source_fastanim'](),
      href: 'https://pypi.org/project/fastanim/',
    },
    { label: m['pages.manimAlt.source_curvg'](), href: '/pricing' },
  ];
  return (
    <>
      <PageHero
        eyebrow={m['pages.manimAlt.eyebrow']()}
        heading={m['pages.manimAlt.h1']()}
        lead={m['pages.manimAlt.lead']()}
        primary={{ label: m['pages.manimAlt.cta_primary'](), href: '/creator' }}
        secondary={{
          label: m['pages.manimAlt.cta_secondary'](),
          href: '/blog/best-math-video-apps',
        }}
      />
      <SectionCards
        id="alt-quick"
        title={m['pages.manimAlt.quick_title']()}
        description={m['pages.manimAlt.disclosure']()}
        items={quick}
        columns={4}
      />
      <BulletsSplit
        id="alt-why"
        title={m['pages.manimAlt.why_title']()}
        left={{
          title: m['pages.manimAlt.why_good_title'](),
          items: [
            m['pages.manimAlt.why_good_1'](),
            m['pages.manimAlt.why_good_2'](),
            m['pages.manimAlt.why_good_3'](),
            m['pages.manimAlt.why_good_4'](),
          ],
        }}
        right={{
          title: m['pages.manimAlt.why_bad_title'](),
          items: [
            m['pages.manimAlt.why_bad_1'](),
            m['pages.manimAlt.why_bad_2'](),
            m['pages.manimAlt.why_bad_3'](),
            m['pages.manimAlt.why_bad_4'](),
          ],
        }}
      />
      <ToolList
        id="alt-tools"
        title={m['pages.manimAlt.tools_title']()}
        description={m['pages.manimAlt.tools_desc']()}
        limitLabel={m['pages.manimAlt.tool_limit_label']()}
        priceLabel={m['pages.manimAlt.tool_price_label']()}
        items={tools}
      />
      <CompareGrid
        id="alt-grid"
        title={m['pages.manimAlt.grid_title']()}
        description={m['pages.manimAlt.grid_desc']()}
        headers={[
          m['pages.manimAlt.grid_tool'](),
          m['pages.manimAlt.grid_code'](),
          m['pages.manimAlt.grid_output'](),
          m['pages.manimAlt.grid_price'](),
        ]}
        rows={gridRows}
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
        items={manimAltFaq()}
      />
      <SourceList
        id="alt-sources"
        title={m['pages.manimAlt.sources_title']()}
        description={m['pages.manimAlt.sources_desc']()}
        items={sources}
      />
      <CtaBand
        title={m['pages.manimAlt.band_title']()}
        lead={m['pages.manimAlt.band_lead']()}
        button={{ label: m['pages.manimAlt.band_button'](), href: '/creator' }}
      />
    </>
  );
}
