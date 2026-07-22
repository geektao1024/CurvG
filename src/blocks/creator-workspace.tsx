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
    history: m['creator.history'](),
    historyEmpty: m['creator.history_empty'](),
    openHistory: m['creator.open_history'](),
    deleteAnimation: m['creator.delete_animation'](),
    deleteConfirm: m['creator.delete_confirm'](),
    promptPlaceholder: m['creator.prompt_placeholder'](),
    promptHint: m['creator.prompt_hint'](),
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
    conversation: m['creator.conversation'](),
    specification: m['creator.specification'](),
    code: m['creator.code'](),
    video: m['creator.video'](),
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
    noCode: m['creator.no_code'](),
    noVideo: m['creator.no_video'](),
    codeReadyTitle: m['creator.code_ready_title'](),
    codeReadyDescription: m['creator.code_ready_description'](),
    renderQueued: m['creator.render_queued'](),
    failed: m['creator.failed'](),
    copyCode: m['creator.copy_code'](),
    copied: m['creator.copied'](),
    versions: m['creator.versions'](),
    loading: m['creator.loading'](),
    loadFailed: m['creator.load_failed'](),
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
    models: [
      { value: 'auto', label: m['creator.model.auto']() },
      { value: 'openai', label: m['creator.model.openai']() },
      { value: 'anthropic', label: m['creator.model.anthropic']() },
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
