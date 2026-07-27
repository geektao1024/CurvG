export type AnimationSubject =
  | 'general'
  | 'math'
  | 'physics'
  | 'computer-science'
  | 'biology'
  | 'chemistry'
  | 'economics';

export type AnimationModelChoice = 'auto' | 'openai' | 'yunwu' | 'anthropic';

export type AnimationModelProvider = Exclude<AnimationModelChoice, 'auto'>;

export interface AnimationModelOption {
  provider: AnimationModelProvider;
  model: string;
  isDefault: boolean;
  description?: string;
}

export interface AnimationModelCatalog {
  options: AnimationModelOption[];
  defaultProvider?: AnimationModelProvider;
  defaultModel?: string;
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
  if (!model || !['openai', 'yunwu', 'anthropic'].includes(provider)) {
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
  | 'completed'
  | 'failed';

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
  title: string;
  summary: string;
  durationSeconds: number;
  assumptions: string[];
  formulas: string[];
  style: {
    background: string;
    palette: string[];
    camera: string;
  };
  layout?: string;
  areas?: AnimationAreaSpec[];
  dependencies?: string[];
  notes?: string[];
  scenes: AnimationSceneSpec[];
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
}

export interface AnimationParts {
  subject: AnimationSubject;
  prompt: string;
  spec?: AnimationSpec;
  code?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
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
  | { type: 'error'; message: string };

const busyStatuses = new Set<AnimationStatus>([
  'generating_spec',
  'generating_code',
  'queued',
  'rendering',
]);

export function isAnimationBusy(status?: AnimationStatus): boolean {
  return status ? busyStatuses.has(status) : false;
}
