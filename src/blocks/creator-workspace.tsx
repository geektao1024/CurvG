import type { AnimationStatus } from '@/lib/animation';
import { m } from '@/paraglide/messages.js';
import {
  CreatorWorkspace as CreatorWorkspaceComponent,
  type CreatorWorkspaceCopy,
} from '@/components/creator-workspace';

export function CreatorWorkspace({
  locale,
  initialAnimationId,
}: {
  locale: string;
  initialAnimationId?: string;
}) {
  const statuses: Record<AnimationStatus, string> = {
    draft: m['creator.status.draft'](),
    generating_spec: m['creator.status.generating_spec'](),
    awaiting_approval: m['creator.status.awaiting_approval'](),
    generating_code: m['creator.status.generating_code'](),
    code_ready: m['creator.status.code_ready'](),
    queued: m['creator.status.queued'](),
    rendering: m['creator.status.rendering'](),
    completed: m['creator.status.completed'](),
    failed: m['creator.status.failed'](),
  };
  const copy: CreatorWorkspaceCopy = {
    title: m['creator.title'](),
    subtitle: m['creator.subtitle'](),
    newAnimation: m['creator.new_animation'](),
    gallery: m['landing.nav.gallery'](),
    workflow: m['landing.nav.workflow'](),
    history: m['creator.history'](),
    historyEmpty: m['creator.history_empty'](),
    openHistory: m['creator.open_history'](),
    closeSidebar: m['creator.close_sidebar'](),
    collapseSidebar: m['creator.collapse_sidebar'](),
    expandSidebar: m['creator.expand_sidebar'](),
    deleteAnimation: m['creator.delete_animation'](),
    deleteConfirm: m['creator.delete_confirm'](),
    promptPlaceholder: m['creator.prompt_placeholder'](),
    promptLabel: m['creator.prompt_label'](),
    create: m['creator.create'](),
    revise: m['creator.revise'](),
    signInToCreate: m['creator.sign_in_to_create'](),
    subject: m['creator.subject'](),
    model: m['creator.model'](),
    characters: m['creator.characters'](),
    welcomeEyebrow: m['creator.welcome_eyebrow'](),
    welcomeTitle: m['creator.welcome_title'](),
    welcomeDescription: m['creator.welcome_description'](),
    tipsTitle: m['creator.tips_title'](),
    tips: [
      m['creator.tip_formula'](),
      m['creator.tip_viewport'](),
      m['creator.tip_sequence'](),
      m['creator.tip_style'](),
    ],
    processing: m['creator.processing'](),
    workspaceLabel: m['creator.workspace_label'](),
    sectionLabel: m['creator.section_label'](),
    conversationEyebrow: m['creator.conversation_eyebrow'](),
    userLabel: m['creator.user_label'](),
    assistantLabel: m['creator.assistant_label'](),
    suggestionGroups: [
      {
        value: 'suggested',
        label: m['creator.suggestions.suggested'](),
        prompts: [
          m['creator.suggestion.suggested_1'](),
          m['creator.suggestion.suggested_2'](),
          m['creator.suggestion.suggested_3'](),
        ],
      },
      {
        value: 'curves',
        label: m['creator.suggestions.curves'](),
        prompts: [
          m['creator.suggestion.curves_1'](),
          m['creator.suggestion.curves_2'](),
          m['creator.suggestion.curves_3'](),
        ],
      },
      {
        value: 'proofs',
        label: m['creator.suggestions.proofs'](),
        prompts: [
          m['creator.suggestion.proofs_1'](),
          m['creator.suggestion.proofs_2'](),
          m['creator.suggestion.proofs_3'](),
        ],
      },
      {
        value: 'physics',
        label: m['creator.suggestions.physics'](),
        prompts: [
          m['creator.suggestion.physics_1'](),
          m['creator.suggestion.physics_2'](),
          m['creator.suggestion.physics_3'](),
        ],
      },
    ],
    conversation: m['creator.conversation'](),
    specification: m['creator.specification'](),
    code: m['creator.code'](),
    video: m['creator.video'](),
    preview: m['creator.preview'](),
    previewEmpty: m['creator.preview_empty'](),
    previewPlaybackError: m['creator.preview_playback_error'](),
    playPreview: m['creator.play_preview'](),
    retryPlayback: m['creator.retry_playback'](),
    approve: m['creator.approve'](),
    retryRender: m['creator.retry_render'](),
    approvalDescription: m['creator.approval_description'](),
    duration: m['creator.duration'](),
    assumptions: m['creator.assumptions'](),
    formulas: m['creator.formulas'](),
    visualStyle: m['creator.visual_style'](),
    scenes: m['creator.scenes'](),
    purpose: m['creator.purpose'](),
    math: m['creator.math'](),
    visuals: m['creator.visuals'](),
    actions: m['creator.actions'](),
    layout: m['creator.layout'](),
    areas: m['creator.areas'](),
    dependencies: m['creator.dependencies'](),
    notes: m['creator.notes'](),
    pipelineLabel: m['creator.pipeline_label'](),
    pipelineSpec: m['creator.pipeline.spec'](),
    pipelineApprove: m['creator.pipeline.approve'](),
    pipelineProcess: m['creator.pipeline.process'](),
    pipelineDone: m['creator.pipeline.done'](),
    noCode: m['creator.no_code'](),
    noVideo: m['creator.no_video'](),
    codeReadyTitle: m['creator.code_ready_title'](),
    codeReadyDescription: m['creator.code_ready_description'](),
    renderQueued: m['creator.render_queued'](),
    failed: m['creator.failed'](),
    copyCode: m['creator.copy_code'](),
    downloadCode: m['creator.download_code'](),
    copied: m['creator.copied'](),
    versions: m['creator.versions'](),
    loading: m['creator.loading'](),
    loadFailed: m['creator.load_failed'](),
    modelAuto: m['creator.model.auto'](),
    modelAutoDescription: m['creator.model.auto_description'](),
    modelPro: m['creator.model.pro'](),
    modelLoading: m['creator.model.loading'](),
    modelUnavailable: m['creator.model.unavailable'](),
    modelUnavailableShort: m['creator.model.unavailable_short'](),
    curatedModels: {
      deepseekV4Flash: {
        label: m['creator.model.deepseek_v4_flash.label'](),
        description: m['creator.model.deepseek_v4_flash.description'](),
      },
      qwen3Coder: {
        label: m['creator.model.qwen3_coder.label'](),
        description: m['creator.model.qwen3_coder.description'](),
      },
      minimaxM3: {
        label: m['creator.model.minimax_m3.label'](),
        description: m['creator.model.minimax_m3.description'](),
      },
      deepseekV4Pro: {
        label: m['creator.model.deepseek_v4_pro.label'](),
        description: m['creator.model.deepseek_v4_pro.description'](),
      },
      gemini31Pro: {
        label: m['creator.model.gemini_31_pro.label'](),
        description: m['creator.model.gemini_31_pro.description'](),
      },
      gpt5: {
        label: m['creator.model.gpt_5.label'](),
        description: m['creator.model.gpt_5.description'](),
      },
      gpt55: {
        label: m['creator.model.gpt_55.label'](),
        description: m['creator.model.gpt_55.description'](),
      },
      claudeSonnet46: {
        label: m['creator.model.claude_sonnet_46.label'](),
        description: m['creator.model.claude_sonnet_46.description'](),
      },
      claudeOpus47: {
        label: m['creator.model.claude_opus_47.label'](),
        description: m['creator.model.claude_opus_47.description'](),
      },
    },
    subjects: [
      { value: 'general', label: m['creator.subject.general']() },
      { value: 'math', label: m['creator.subject.math']() },
      { value: 'physics', label: m['creator.subject.physics']() },
      {
        value: 'computer-science',
        label: m['creator.subject.computer_science'](),
      },
      { value: 'biology', label: m['creator.subject.biology']() },
      { value: 'chemistry', label: m['creator.subject.chemistry']() },
      { value: 'economics', label: m['creator.subject.economics']() },
    ],
    statuses,
  };

  return (
    <CreatorWorkspaceComponent
      copy={copy}
      locale={locale}
      initialAnimationId={initialAnimationId}
    />
  );
}
