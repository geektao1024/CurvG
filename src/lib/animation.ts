export type AnimationSubject =
  | 'general'
  | 'math'
  | 'physics'
  | 'computer-science'
  | 'biology'
  | 'chemistry'
  | 'economics';

// Animation generation is intentionally Yunwu-only. Other generic AI
// providers remain available to unrelated modules, but are not valid choices
// for this product surface and must not linger in the client contract.
export type AnimationModelChoice = 'auto' | 'yunwu';

export type AnimationModelProvider = Exclude<AnimationModelChoice, 'auto'>;

export interface AnimationModelSelection {
  choice: AnimationModelChoice;
  model?: string;
}

export interface AnimationModelOption {
  provider: AnimationModelProvider;
  model: string;
  isDefault: boolean;
  description?: string;
  presetKey?: string;
  requiredTier: 'free' | 'pro';
  entitled: boolean;
}

export interface AnimationModelCatalog {
  options: AnimationModelOption[];
  defaultProvider?: AnimationModelProvider;
  defaultModel?: string;
  viewerTier: 'free' | 'pro';
  catalogStale?: boolean;
}

export function animationModelValue(
  provider: AnimationModelProvider,
  model: string
): string {
  return `${provider}:${model}`;
}

export function parseAnimationModelValue(value: string): {
  modelChoice: AnimationModelChoice;
  model?: string;
} {
  if (!value || value === 'auto') return { modelChoice: 'auto' };
  const separator = value.indexOf(':');
  if (separator <= 0) return { modelChoice: 'auto' };
  const provider = value.slice(0, separator);
  const model = value.slice(separator + 1).trim();
  if (!model || provider !== 'yunwu') {
    return { modelChoice: 'auto' };
  }
  return {
    modelChoice: provider as AnimationModelProvider,
    model,
  };
}

export type AnimationStatus =
  | 'draft'
  | 'generating_spec'
  | 'awaiting_approval'
  | 'generating_code'
  | 'code_ready'
  | 'queued'
  | 'rendering'
  | 'canceled'
  | 'completed'
  | 'failed';

export type AnimationCreationMode = 'template' | 'formula' | 'description';

export type AnimationMathObjectType =
  | 'function'
  | 'integral'
  | 'series'
  | 'matrix';

export type AnimationObjectKind =
  | 'axes'
  | 'curve'
  | 'area'
  | 'formula'
  | 'text'
  | 'series'
  | 'matrix';

export type AnimationSemanticRegion = 'title' | 'formula' | 'graph';

export interface AnimationObjectSpec {
  id: string;
  kind: AnimationObjectKind;
  region: AnimationSemanticRegion;
  label?: string;
  expr?: string;
  domain?: [number, number];
  color?: string;
  values?: number[][];
}

export type AnimationTimelineOperation =
  | 'draw'
  | 'write'
  | 'fade_in'
  | 'fade_out'
  | 'transform'
  | 'hold';

export type AnimationEase = 'linear' | 'smooth' | 'there_and_back';

export interface AnimationTimelineSpec {
  id: string;
  at: number;
  op: AnimationTimelineOperation;
  ref: string;
  targetRef?: string;
  runTime: number;
  ease: AnimationEase;
}

export interface AnimationLayoutSpec {
  regions: 'single' | 'left|right' | 'top|bottom';
  title?: string;
}

/**
 * v1 records are kept for read-only archive access. Every newly generated
 * animation uses schemaVersion 2 and the objects/timeline/layout IR below.
 */
export interface AnimationSceneSpec {
  id: string;
  title: string;
  purpose: string;
  durationSeconds: number;
  math: string[];
  visuals: string[];
  actions: string[];
}

export interface AnimationAreaSpec {
  name: string;
  content: string;
  implementation: string;
}

export interface AnimationSpec {
  schemaVersion?: 1 | 2;
  title: string;
  summary: string;
  durationSeconds: number;
  assumptions: string[];
  formulas?: string[];
  style: {
    background: string;
    palette: string[];
    camera: string;
  };
  objects?: AnimationObjectSpec[];
  timeline?: AnimationTimelineSpec[];
  layout?: AnimationLayoutSpec | string;
  areas?: AnimationAreaSpec[];
  dependencies?: string[];
  notes?: string[];
  scenes?: AnimationSceneSpec[];
}

export function isAnimationSpecV2(
  spec: AnimationSpec | undefined
): spec is AnimationSpec & {
  schemaVersion: 2;
  objects: AnimationObjectSpec[];
  timeline: AnimationTimelineSpec[];
  layout: AnimationLayoutSpec;
} {
  return (
    spec?.schemaVersion === 2 &&
    Array.isArray(spec.objects) &&
    Array.isArray(spec.timeline) &&
    !!spec.layout &&
    typeof spec.layout === 'object'
  );
}

export interface AnimationVersion {
  version: number;
  createdAt: string;
  prompt: string;
  spec?: AnimationSpec;
  code?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface AnimationRenderState {
  jobId?: string;
  status?: string;
  provider?: string;
  stage?:
    | 'queued'
    | 'validating'
    | 'compiling'
    | 'transcoding'
    | 'uploading'
    | 'completed'
    | 'canceled';
  progress?: number;
  startedAt?: string;
  elapsedMs?: number;
  cancelRequested?: boolean;
  canceledAt?: string;
  creditTaskId?: string;
}

export type AnimationFailureStage = 'spec' | 'code' | 'render';

export type AnimationFailureCode =
  | 'UPSTREAM_SATURATED'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'UPSTREAM_AUTH'
  | 'UPSTREAM_QUOTA'
  | 'INVALID_OUTPUT'
  | 'STREAM_INTERRUPTED'
  | 'RENDER_FAILED'
  | 'PRO_REQUIRED'
  | 'INSUFFICIENT_CREDITS'
  | 'BUSY'
  | 'UNKNOWN';

export interface AnimationFailure {
  stage: AnimationFailureStage;
  code: AnimationFailureCode;
  message: string;
  retryable: boolean;
  requestId?: string;
}

export interface AnimationParts {
  subject: AnimationSubject;
  prompt: string;
  creationMode?: AnimationCreationMode;
  mathObjectType?: AnimationMathObjectType;
  sourceFormula?: string;
  templateId?: string;
  publishedAt?: string;
  /** The user's choice, kept separately from the model that actually replied. */
  modelSelection?: AnimationModelSelection;
  spec?: AnimationSpec;
  code?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  /** @deprecated Read failure.message. Kept for existing persisted rows. */
  error?: string;
  failure?: AnimationFailure;
  versions: AnimationVersion[];
  render?: AnimationRenderState;
}

export interface AnimationSummary {
  id: string;
  title: string;
  status: AnimationStatus;
  model: string;
  provider: string;
  subject: AnimationSubject;
  prompt: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnimationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface AnimationDetail extends AnimationSummary {
  parts: AnimationParts;
  messages: AnimationMessage[];
}

export type AnimationGenerationEvent =
  | { type: 'started'; animation: AnimationDetail }
  | { type: 'delta'; delta: string }
  | { type: 'completed'; animation: AnimationDetail }
  | { type: 'error'; message: string; failure?: AnimationFailure };

const busyStatuses = new Set<AnimationStatus>([
  'generating_spec',
  'generating_code',
  'queued',
  'rendering',
]);

export function isAnimationBusy(status?: AnimationStatus): boolean {
  return status ? busyStatuses.has(status) : false;
}
