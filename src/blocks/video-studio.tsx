import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/core/auth/client';
import type { AnimationDetail, AnimationStatus } from '@/lib/animation';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import {
  VideoStudio,
  type VideoStudioCopy,
} from '@/components/video-studio/studio';

import { CreatorWorkspace } from './creator-workspace';
import { SitePage } from './site-page';

/**
 * /creator. The video studio (templates, the paid path) by default; the beta
 * free-form workspace for `?mode=beta` and for videos it made.
 */
export function CreatorPage({
  locale,
  mode,
  animationId,
  prompt,
  template,
}: {
  locale: string;
  mode?: 'beta';
  animationId?: string;
  prompt?: string;
  template?: { templateId: string; params: Record<string, string | number> };
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // Same query key as the studio, so this costs no extra request.
  const detail = useQuery({
    queryKey: ['animation', userId, animationId],
    queryFn: () => apiGet<AnimationDetail>(`/api/animations/${animationId}`),
    enabled: !!userId && !!animationId,
  });
  const beta =
    mode === 'beta' || (!!detail.data && !detail.data.parts.template);
  if (beta) {
    return (
      <CreatorWorkspace
        locale={locale}
        initialAnimationId={animationId}
        initialPrompt={prompt}
      />
    );
  }

  const statuses: Record<AnimationStatus, string> = {
    draft: m['creator.status.draft'](),
    generating_spec: m['creator.status.generating_spec'](),
    awaiting_approval: m['creator.status.awaiting_approval'](),
    generating_code: m['creator.status.generating_code'](),
    code_ready: m['creator.status.code_ready'](),
    queued: m['creator.status.queued'](),
    rendering: m['creator.status.rendering'](),
    canceled: m['creator.status.canceled'](),
    completed: m['creator.status.completed'](),
    failed: m['creator.status.failed'](),
  };
  const copy: VideoStudioCopy = {
    eyebrow: m['studio.eyebrow'](),
    title: m['studio.title'](),
    description: m['studio.description'](),
    composerLabel: m['studio.composer_label'](),
    composerPlaceholder: m['studio.composer_placeholder'](),
    matchButton: m['studio.match_button'](),
    matching: m['studio.matching'](),
    betaLink: m['studio.beta_link'](),
    valueProps: [
      m['studio.value_1'](),
      m['studio.value_2'](),
      m['studio.value_3'](),
    ],
    galleryTitle: m['studio.gallery_title'](),
    galleryAll: m['studio.gallery_all'](),
    categories: {
      functions: m['studio.category_functions'](),
      calculus: m['studio.category_calculus'](),
      trigonometry: m['studio.category_trigonometry'](),
      series: m['studio.category_series'](),
      curves: m['studio.category_curves'](),
      'linear-algebra': m['studio.category_linear_algebra'](),
    },
    seconds: (value) => m['studio.seconds']({ value }),
    useTemplate: m['studio.use_template'](),
    back: m['studio.back'](),
    matchedEyebrow: m['studio.matched_eyebrow'](),
    confidence: {
      high: m['studio.confidence_high'](),
      medium: m['studio.confidence_medium'](),
      low: m['studio.confidence_low'](),
    },
    noMatchTitle: m['studio.no_match_title'](),
    noMatchBody: m['studio.no_match_body'](),
    betaButton: m['studio.beta_button'](),
    betaHint: m['studio.beta_hint'](),
    alternativesLabel: m['studio.alternatives'](),
    templateLabel: m['studio.template_label'](),
    paramsTitle: m['studio.params_title'](),
    frameLabel: m['studio.frame_label'](),
    frames: {
      '16:9': m['studio.frame_landscape'](),
      '9:16': m['studio.frame_portrait'](),
    },
    themeLabel: m['studio.theme_label'](),
    themes: {
      paper: m['studio.theme_paper'](),
      studio: m['studio.theme_studio'](),
    },
    sketchCaption: m['studio.sketch_caption'](),
    sampleButton: m['studio.sample_button'](),
    sketchButton: m['studio.sketch_button'](),
    storyboardTitle: m['studio.storyboard_title'](),
    factsTitle: m['studio.facts_title'](),
    duration: (value) => m['studio.duration']({ value }),
    invalidNumber: (min, max) => m['studio.invalid_number']({ min, max }),
    invalidExpression: m['studio.invalid_expression'](),
    ctaFree: (left) => m['studio.cta_free']({ left }),
    ctaHd: (credits) => m['studio.cta_hd']({ credits }),
    ctaSignIn: m['studio.cta_sign_in'](),
    ctaUpgrade: m['studio.cta_upgrade'](),
    creating: m['studio.creating'](),
    costFree: m['studio.cost_free'](),
    costHd: m['studio.cost_hd'](),
    costNone: m['studio.cost_none'](),
    freeLeft: (left, total) => m['studio.free_left']({ left, total }),
    credits: (value) => m['studio.credits']({ value }),
    upgrade: m['studio.upgrade'](),
    myVideos: m['studio.my_videos'](),
    myVideosDescription: m['studio.my_videos_description'](),
    myVideosEmpty: m['studio.my_videos_empty'](),
    steps: [
      m['studio.step_submitted'](),
      m['studio.step_rendering'](),
      m['studio.step_checking'](),
      m['studio.step_done'](),
    ],
    renderingHint: m['studio.rendering_hint'](),
    deliveryPreview: m['studio.delivery_preview'](),
    deliveryHd: m['studio.delivery_hd'](),
    download: m['studio.download'](),
    exportHd: (credits) => m['studio.export_hd']({ credits }),
    failedTitle: m['studio.failed_title'](),
    failedBody: m['studio.failed_body'](),
    retry: m['studio.retry'](),
    remake: m['studio.remake'](),
    newVideo: m['studio.new_video'](),
    upsellTitle: m['studio.upsell_title'](),
    upsellBody: (starter, pro) => m['studio.upsell_body']({ starter, pro }),
    upsellCta: m['studio.upsell_cta'](),
    outOfFreeTitle: m['studio.out_of_free_title'](),
    outOfFreeBody: m['studio.out_of_free_body'](),
    code: m['studio.code'](),
    copyCode: m['studio.copy_code'](),
    copied: m['studio.copied'](),
    downloadCode: m['studio.download_code'](),
    deleteVideo: m['studio.delete_video'](),
    deleteConfirm: m['studio.delete_confirm'](),
    requestFailed: m['studio.request_failed'](),
    loading: m['studio.loading'](),
    statusLabels: statuses,
  };

  return (
    <SitePage mainClassName="curvg-stage curvg-frame">
      <VideoStudio
        copy={copy}
        locale={locale}
        initialAnimationId={animationId}
        initialPrompt={prompt}
        initialTemplate={template}
      />
    </SitePage>
  );
}
