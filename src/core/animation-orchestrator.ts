import type { AnimationSpec } from '@/lib/animation';

export const ANIMATION_VISUAL_CONTRACT_VERSION = 'curvg.visual/v1' as const;

export interface AnimationOrchestrationDiagnostic {
  code: string;
  severity: 'info' | 'warning' | 'blocking';
  stage: 'spec' | 'math' | 'visual' | 'code';
  message: string;
  path?: string;
}

export interface AnimationVisualContract {
  contractVersion: typeof ANIMATION_VISUAL_CONTRACT_VERSION;
  frame: {
    aspectRatio: '16:9' | '9:16';
    safeZone: [number, number, number, number];
    targetWidth: number;
    targetHeight: number;
    frameRate: 30;
  };
  hook: {
    deadlineSeconds: number;
    requiresVisibleMotion: boolean;
  };
  payoff: {
    startRatio: number;
    requiresResolvedVisual: boolean;
  };
  text: {
    maxWordsPerObject: number;
    maxSimultaneousObjects: number;
    proseIsSecondary: boolean;
  };
  motion: {
    dominantActionsPerBeat: number;
    requireVisualProof: boolean;
  };
  palette: string[];
}

export interface AnimationTemplateMatch {
  id: string;
  score: number;
  reason: string;
  requiredObjects: string[];
  preferredActions: string[];
}

export interface AnimationOrchestrationPlan {
  protocolVersion: 'curvg.orchestrator/v1';
  status: 'ready';
  visualContract: AnimationVisualContract;
  templates: AnimationTemplateMatch[];
  diagnostics: AnimationOrchestrationDiagnostic[];
  generationBrief: string;
  preparedAt: string;
}

export interface AnimationCodeValidation {
  protocolVersion: 'curvg.orchestrator/v1';
  valid: boolean;
  diagnostics: AnimationOrchestrationDiagnostic[];
  repairDirective?: string;
  validatedAt: string;
}

export interface AnimationOrchestrator {
  readonly name: string;
  prepare(input: {
    animationId: string;
    prompt: string;
    spec: AnimationSpec;
    mode: 'initial' | 'repair';
    currentCode?: string;
    failureEvidence?: string;
    signal?: AbortSignal;
  }): Promise<AnimationOrchestrationPlan>;
  validateCode(input: {
    animationId: string;
    spec: AnimationSpec;
    code: string;
    visualContract: AnimationVisualContract;
    signal?: AbortSignal;
  }): Promise<AnimationCodeValidation>;
}

export class AnimationOrchestratorError extends Error {
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    message: string,
    options: { retryable: boolean; status?: number; cause?: unknown }
  ) {
    super(message, { cause: options.cause });
    this.name = 'AnimationOrchestratorError';
    this.retryable = options.retryable;
    this.status = options.status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isDiagnostic(
  value: unknown
): value is AnimationOrchestrationDiagnostic {
  if (!isRecord(value)) return false;
  return (
    typeof value.code === 'string' &&
    ['info', 'warning', 'blocking'].includes(String(value.severity)) &&
    ['spec', 'math', 'visual', 'code'].includes(String(value.stage)) &&
    typeof value.message === 'string' &&
    (value.path === undefined || typeof value.path === 'string')
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVisualContract(value: unknown): value is AnimationVisualContract {
  if (!isRecord(value) || !isRecord(value.frame) || !isRecord(value.text)) {
    return false;
  }
  const safeZone = value.frame.safeZone;
  return (
    value.contractVersion === ANIMATION_VISUAL_CONTRACT_VERSION &&
    ['16:9', '9:16'].includes(String(value.frame.aspectRatio)) &&
    Array.isArray(safeZone) &&
    safeZone.length === 4 &&
    safeZone.every((item) => isFiniteNumber(item) && item >= 0 && item <= 1) &&
    isFiniteNumber(value.frame.targetWidth) &&
    isFiniteNumber(value.frame.targetHeight) &&
    value.frame.frameRate === 30 &&
    isFiniteNumber(value.text.maxWordsPerObject) &&
    isFiniteNumber(value.text.maxSimultaneousObjects) &&
    Array.isArray(value.palette) &&
    value.palette.every((item) => typeof item === 'string')
  );
}

function isTemplate(value: unknown): value is AnimationTemplateMatch {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isFiniteNumber(value.score) &&
    typeof value.reason === 'string' &&
    Array.isArray(value.requiredObjects) &&
    value.requiredObjects.every((item) => typeof item === 'string') &&
    Array.isArray(value.preferredActions) &&
    value.preferredActions.every((item) => typeof item === 'string')
  );
}

function validatePrepareResponse(value: unknown): AnimationOrchestrationPlan {
  if (!isRecord(value) || value.protocolVersion !== 'curvg.orchestrator/v1') {
    throw new AnimationOrchestratorError(
      'Orchestrator returned an incompatible prepare response',
      { retryable: true }
    );
  }
  if (
    value.status !== 'ready' ||
    !isVisualContract(value.visualContract) ||
    !Array.isArray(value.templates) ||
    !value.templates.every(isTemplate) ||
    !Array.isArray(value.diagnostics) ||
    !value.diagnostics.every(isDiagnostic) ||
    typeof value.generationBrief !== 'string' ||
    value.generationBrief.length < 40 ||
    value.generationBrief.length > 20_000 ||
    typeof value.preparedAt !== 'string'
  ) {
    throw new AnimationOrchestratorError(
      'Orchestrator returned an invalid prepare response',
      { retryable: true }
    );
  }
  return value as unknown as AnimationOrchestrationPlan;
}

function validateCodeResponse(value: unknown): AnimationCodeValidation {
  if (
    !isRecord(value) ||
    value.protocolVersion !== 'curvg.orchestrator/v1' ||
    typeof value.valid !== 'boolean' ||
    !Array.isArray(value.diagnostics) ||
    !value.diagnostics.every(isDiagnostic) ||
    (value.repairDirective !== undefined &&
      (typeof value.repairDirective !== 'string' ||
        value.repairDirective.length > 20_000)) ||
    typeof value.validatedAt !== 'string'
  ) {
    throw new AnimationOrchestratorError(
      'Orchestrator returned an invalid code validation response',
      { retryable: true }
    );
  }
  return value as unknown as AnimationCodeValidation;
}

export class HttpAnimationOrchestrator implements AnimationOrchestrator {
  readonly name = 'python-orchestrator';
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(config: { baseUrl: string; token: string; timeoutMs?: number }) {
    const url = new URL(config.baseUrl.replace(/\/+$/, ''));
    const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocal)) {
      throw new Error('Orchestrator URL must use HTTPS outside localhost');
    }
    if (!config.token.trim()) throw new Error('Orchestrator token is required');
    this.baseUrl = url.toString().replace(/\/+$/, '');
    this.token = config.token.trim();
    this.timeoutMs = Math.max(
      5_000,
      Math.min(config.timeoutMs || 45_000, 120_000)
    );
  }

  private async post(path: string, payload: unknown, signal?: AbortSignal) {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          'X-CurvG-Orchestrator-Protocol': '1',
        },
        body: JSON.stringify(payload),
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(this.timeoutMs)])
          : AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new AnimationOrchestratorError(
        error instanceof DOMException && error.name === 'TimeoutError'
          ? 'Animation orchestrator timed out'
          : 'Animation orchestrator is unavailable',
        { retryable: true, cause: error }
      );
    }

    const body = await response.text();
    if (body.length > 250_000) {
      throw new AnimationOrchestratorError(
        'Animation orchestrator response is too large',
        { retryable: true, status: response.status }
      );
    }
    let parsed: unknown;
    try {
      parsed = body ? (JSON.parse(body) as unknown) : {};
    } catch (error) {
      throw new AnimationOrchestratorError(
        'Animation orchestrator returned malformed JSON',
        { retryable: true, status: response.status, cause: error }
      );
    }
    if (!response.ok) {
      const detail =
        isRecord(parsed) && typeof parsed.detail === 'string'
          ? parsed.detail
          : `Animation orchestrator failed (${response.status})`;
      throw new AnimationOrchestratorError(detail.slice(0, 500), {
        retryable:
          response.status === 408 ||
          response.status === 429 ||
          response.status >= 500,
        status: response.status,
      });
    }
    return parsed;
  }

  async prepare(
    input: Parameters<AnimationOrchestrator['prepare']>[0]
  ): Promise<AnimationOrchestrationPlan> {
    return validatePrepareResponse(
      await this.post(
        '/v1/prepare',
        {
          protocolVersion: 'curvg.orchestrator/v1',
          animationId: input.animationId,
          prompt: input.prompt,
          spec: input.spec,
          mode: input.mode,
          currentCode: input.currentCode,
          failureEvidence: input.failureEvidence,
        },
        input.signal
      )
    );
  }

  async validateCode(
    input: Parameters<AnimationOrchestrator['validateCode']>[0]
  ): Promise<AnimationCodeValidation> {
    return validateCodeResponse(
      await this.post(
        '/v1/validate-code',
        {
          protocolVersion: 'curvg.orchestrator/v1',
          animationId: input.animationId,
          spec: input.spec,
          code: input.code,
          visualContract: input.visualContract,
        },
        input.signal
      )
    );
  }
}
