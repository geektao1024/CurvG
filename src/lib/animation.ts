export type AnimationSubject =
  | 'general'
  | 'math'
  | 'physics'
  | 'computer-science'
  | 'biology'
  | 'chemistry'
  | 'economics';

// Only server-curated chat platforms belong in this product contract. Generic
// media providers remain available to unrelated modules.
export type AnimationModelChoice = 'auto' | 'kuaipao';

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
  requiredTier: 'free' | 'starter' | 'pro';
  entitled: boolean;
}

export interface AnimationModelCatalog {
  options: AnimationModelOption[];
  defaultProvider?: AnimationModelProvider;
  defaultModel?: string;
  viewerTier: 'free' | 'starter' | 'pro';
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
  if (!model || provider !== 'kuaipao') {
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
  | 'matrix'
  | 'circle'
  | 'point'
  | 'line'
  | 'arrow'
  | 'arc';

export type AnimationSemanticRegion = 'title' | 'formula' | 'graph';

export interface AnimationFormulaPartSpec {
  id: string;
  latex: string;
  meaning: string;
  color?: string;
}

export interface AnimationObjectSpec {
  id: string;
  kind: AnimationObjectKind;
  region: AnimationSemanticRegion;
  importance?: 'hero' | 'supporting' | 'context';
  label?: string;
  expr?: string;
  domain?: [number, number];
  color?: string;
  values?: number[][];
  /** Coordinate-space geometry for graph-region primitives. */
  position?: [number, number];
  center?: [number, number];
  start?: [number, number];
  end?: [number, number];
  radius?: number;
  /** Radians, used by arc. */
  startAngle?: number;
  /** Signed radians, used by arc. */
  sweepAngle?: number;
  /**
   * Addressable MathTex arguments. Keeping the pieces explicit lets the
   * deterministic compiler focus, recolor and transform a mathematical term
   * without asking a model to write Python.
   */
  parts?: AnimationFormulaPartSpec[];
}

export type AnimationTimelineOperation =
  | 'draw'
  | 'write'
  | 'fade_in'
  | 'fade_out'
  | 'transform'
  | 'emphasize'
  | 'spotlight'
  | 'glow'
  | 'camera_focus'
  | 'camera_reset'
  | 'move_along'
  | 'hold';

export type AnimationEase = 'linear' | 'smooth' | 'there_and_back';

export interface AnimationTimelineSpec {
  id: string;
  shotId?: string;
  at: number;
  op: AnimationTimelineOperation;
  ref: string;
  targetRef?: string;
  /** A curve/circle/arc/line path used by move_along. */
  pathRef?: string;
  /** A formula/series part id scoped to ref. */
  partId?: string;
  /** Camera magnification for camera_focus. */
  zoom?: number;
  runTime: number;
  ease: AnimationEase;
}

export interface AnimationLayoutSpec {
  regions: 'single' | 'left|right' | 'top|bottom';
  title?: string;
}

export type AnimationDirectionPreset =
  | 'clean-classroom'
  | 'cinematic-math'
  | 'geometric-proof'
  | 'data-story';

export type AnimationShotBeat =
  | 'hook'
  | 'setup'
  | 'mechanism'
  | 'proof'
  | 'payoff'
  | 'memory';

export interface AnimationIntentSpec {
  learningGoal: string;
  hook: string;
  takeaway: string;
}

export interface AnimationDirectionSpec {
  preset: AnimationDirectionPreset;
  frame: '16:9' | '9:16';
  pacing: 'calm' | 'balanced' | 'energetic';
  textPolicy: {
    maxWordsPerObject: number;
    maxSimultaneousText: number;
  };
}

export interface AnimationCinematographySpec {
  scene: 'static' | 'moving-camera';
  /** Keep the visual language deliberate instead of allowing arbitrary FX. */
  emphasis: 'clean' | 'spotlight' | 'term-tour';
}

export interface AnimationMathDossierSpec {
  coreClaim: string;
  invariants: string[];
  commonMisreading: string;
  visualProof: string;
  /** Required by v5; optional here so archived v4 records remain readable. */
  definitions?: Array<{ concept: string; statement: string }>;
  derivationSteps?: string[];
  checks?: Array<{
    claim: string;
    method: string;
    expected: string;
  }>;
  limitations?: string[];
}

export interface AnimationKnowledgeNodeSpec {
  id: string;
  concept: string;
  dependsOn: string[];
  misconception: string;
}

export interface AnimationCurriculumBeatSpec {
  id: string;
  learningJob: string;
  dependsOn: string[];
  visualEvidence: string;
  notationBudget: number;
}

export interface AnimationShotSpec {
  id: string;
  beat: AnimationShotBeat;
  purpose: string;
  startAt: number;
  endAt: number;
  focusRef: string;
  transition: 'build' | 'morph' | 'emphasis' | 'hold';
  acceptance: string[];
}

export type AnimationVisualQaCode =
  | 'weak_opening'
  | 'empty_frame'
  | 'sparse_frame'
  | 'edge_risk'
  | 'off_center'
  | 'low_contrast'
  | 'static_sequence'
  | 'black_segment'
  | 'flash_frame'
  | 'frozen_segment';

export interface AnimationVisualQaFrame {
  index: number;
  occupancy: number;
  edgeContent: number;
  edgeRisk: boolean;
  centerOffset: number;
  contrast: number;
  contentBounds: [number, number, number, number];
}

export interface AnimationVisualQaIssue {
  code: AnimationVisualQaCode;
  severity: 'info' | 'warning';
  frames: number[];
  message: string;
}

export interface AnimationVisualQaReport {
  analyzerVersion: 1;
  status: 'pass' | 'review';
  score: number;
  sampleCount: number;
  frames: AnimationVisualQaFrame[];
  transitionDeltas: number[];
  durationSeconds: number;
  temporalSampleRate: number;
  temporalSampleCount: number;
  blackSegments: Array<[number, number]>;
  frozenSegments: Array<[number, number]>;
  flashTimestamps: number[];
  issues: AnimationVisualQaIssue[];
}

export interface AnimationVisualReviewIssue {
  category:
    | 'layout'
    | 'clipping'
    | 'legibility'
    | 'pacing'
    | 'hierarchy'
    | 'math_fidelity'
    | 'payoff';
  severity: 'minor' | 'major' | 'blocking';
  frames: number[];
  problem: string;
  suggestion: string;
}

export interface AnimationVisualReview {
  status: 'approved' | 'needs_revision' | 'unavailable';
  model: string;
  summary: string;
  strengths: string[];
  issues: AnimationVisualReviewIssue[];
  reviewedAt: string;
  jobId: string;
}

export type AnimationQualityGateAction = 'approve' | 'repair' | 'reject';

export interface AnimationQualityGateAttempt {
  attempt: number;
  kind: 'render_error' | 'visual_review' | 'final_review';
  action: AnimationQualityGateAction;
  deterministicScore?: number;
  reviewStatus?: AnimationVisualReview['status'];
  issueCount: number;
  createdAt: string;
}

export interface AnimationQualityControlState {
  status: 'pending' | 'reviewing' | 'repairing' | 'approved' | 'rejected';
  attempt: number;
  maxRepairs: number;
  attempts: AnimationQualityGateAttempt[];
}

/**
 * v1 records are kept for read-only archive access. Every newly generated
 * animation uses the objects/timeline/layout IR below. v3 adds a director
 * contract. v4 adds addressable formula terms and a restricted cinematography
 * grammar without removing deterministic compilation or archive support.
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
  schemaVersion?: 1 | 2 | 3 | 4 | 5;
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
  intent?: AnimationIntentSpec;
  direction?: AnimationDirectionSpec;
  cinematography?: AnimationCinematographySpec;
  mathDossier?: AnimationMathDossierSpec;
  knowledgeMap?: AnimationKnowledgeNodeSpec[];
  curriculum?: AnimationCurriculumBeatSpec[];
  shots?: AnimationShotSpec[];
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

export function isAnimationSpecV3(
  spec: AnimationSpec | undefined
): spec is AnimationSpec & {
  schemaVersion: 3;
  objects: AnimationObjectSpec[];
  timeline: AnimationTimelineSpec[];
  layout: AnimationLayoutSpec;
  intent: AnimationIntentSpec;
  direction: AnimationDirectionSpec;
  shots: AnimationShotSpec[];
} {
  return (
    spec?.schemaVersion === 3 &&
    Array.isArray(spec.objects) &&
    Array.isArray(spec.timeline) &&
    !!spec.layout &&
    typeof spec.layout === 'object' &&
    !!spec.intent &&
    !!spec.direction &&
    Array.isArray(spec.shots)
  );
}

export function isAnimationSpecV4(
  spec: AnimationSpec | undefined
): spec is AnimationSpec & {
  schemaVersion: 4 | 5;
  objects: AnimationObjectSpec[];
  timeline: AnimationTimelineSpec[];
  layout: AnimationLayoutSpec;
  intent: AnimationIntentSpec;
  direction: AnimationDirectionSpec;
  cinematography: AnimationCinematographySpec;
  mathDossier: AnimationMathDossierSpec;
  shots: AnimationShotSpec[];
} {
  return (
    (spec?.schemaVersion === 4 || spec?.schemaVersion === 5) &&
    Array.isArray(spec.objects) &&
    Array.isArray(spec.timeline) &&
    !!spec.layout &&
    typeof spec.layout === 'object' &&
    !!spec.intent &&
    !!spec.direction &&
    !!spec.cinematography &&
    !!spec.mathDossier &&
    Array.isArray(spec.shots)
  );
}

export function isAnimationSpecDirected(
  spec: AnimationSpec | undefined
): spec is AnimationSpec & {
  schemaVersion: 3 | 4 | 5;
  objects: AnimationObjectSpec[];
  timeline: AnimationTimelineSpec[];
  layout: AnimationLayoutSpec;
  intent: AnimationIntentSpec;
  direction: AnimationDirectionSpec;
  shots: AnimationShotSpec[];
} {
  return isAnimationSpecV3(spec) || isAnimationSpecV4(spec);
}

export function isAnimationSpecRenderable(
  spec: AnimationSpec | undefined
): spec is AnimationSpec & {
  schemaVersion: 2 | 3 | 4 | 5;
  objects: AnimationObjectSpec[];
  timeline: AnimationTimelineSpec[];
  layout: AnimationLayoutSpec;
} {
  return isAnimationSpecV2(spec) || isAnimationSpecDirected(spec);
}

export interface AnimationVersion {
  version: number;
  createdAt: string;
  prompt: string;
  spec?: AnimationSpec;
  code?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  contactSheetUrl?: string;
  qaReportUrl?: string;
  visualQa?: AnimationVisualQaReport;
  visualReview?: AnimationVisualReview;
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
    | 'reviewing'
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
  | 'UPSTREAM_INVALID_REQUEST'
  | 'OUTPUT_TRUNCATED'
  | 'MALFORMED_STREAM'
  | 'INVALID_OUTPUT'
  | 'STREAM_INTERRUPTED'
  | 'RENDER_FAILED'
  | 'PRO_REQUIRED'
  | 'INSUFFICIENT_CREDITS'
  | 'BUSY'
  | 'UNKNOWN';

export function animationFailureCodeFromHttpStatus(
  status?: number
): AnimationFailureCode | undefined {
  if (status === 402) return 'INSUFFICIENT_CREDITS';
  if (status === 403) return 'PRO_REQUIRED';
  return undefined;
}

export interface AnimationFailure {
  stage: AnimationFailureStage;
  code: AnimationFailureCode;
  message: string;
  retryable: boolean;
  requestId?: string;
}

export type AnimationPlanningStageName =
  | 'intent'
  | 'knowledge'
  | 'curriculum'
  | 'mathematics'
  | 'storyboard'
  | 'scene';

export type AnimationPlanningStageStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'cached'
  | 'failed';

export interface AnimationPlanningStageSummary {
  name: AnimationPlanningStageName;
  sequence: number;
  status: AnimationPlanningStageStatus;
  attempt: number;
  errorCode?: string;
  requestId?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AnimationPlanningPipeline {
  runId: string;
  currentStage?: AnimationPlanningStageName;
  stages: AnimationPlanningStageSummary[];
}

export interface AnimationOrchestrationState {
  status: 'ready' | 'degraded';
  provider: 'python-orchestrator' | 'in-worker';
  protocolVersion?: 'curvg.orchestrator/v1';
  visualContractVersion?: 'curvg.visual/v1';
  templateIds: string[];
  blockingDiagnostics: number;
  preparedAt: string;
  reason?: string;
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
  contactSheetUrl?: string;
  qaReportUrl?: string;
  visualQa?: AnimationVisualQaReport;
  visualReview?: AnimationVisualReview;
  /** @deprecated Read failure.message. Kept for existing persisted rows. */
  error?: string;
  failure?: AnimationFailure;
  versions: AnimationVersion[];
  render?: AnimationRenderState;
  pipeline?: AnimationPlanningPipeline;
  orchestration?: AnimationOrchestrationState;
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
  contactSheetUrl?: string;
  qaReportUrl?: string;
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

export type AnimationPlanningPhase =
  | 'understanding'
  | 'structuring'
  | 'auditing'
  | 'finalizing';

export type AnimationGenerationEvent =
  | { type: 'started'; animation: AnimationDetail }
  | { type: 'accepted'; animation: AnimationDetail }
  | { type: 'phase'; phase: AnimationPlanningPhase }
  | { type: 'pipeline-stage'; stage: AnimationPlanningStageSummary }
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
