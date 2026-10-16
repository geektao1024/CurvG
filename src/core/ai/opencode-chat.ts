import {
  ChatProviderError,
  type ChatCompletionInput,
  type ChatCompletionResult,
  type ChatFailureCode,
  type ChatProvider,
  type ChatTurn,
  type ChatUsage,
} from './chat';

/**
 * OpenCode inference gateway, Anthropic Messages route
 * (https://opencode.ai/inference/v1/messages). Claude Haiku 5.5 here answered
 * every probe in 1-5s on 2026-10-16, against 40-300s and outages on KIE.
 *
 * Request shape notes for Claude Haiku 5.5:
 * - no `temperature` (non-default values are rejected), no assistant prefill;
 * - thinking is adaptive by default, depth set with `output_config.effort`;
 * - native structured output is NOT used: its limits on optional and union
 *   parameters reject the planning schemas ("too many optional parameters",
 *   "compiled grammar is too large"), so `responseFormat` is ignored and the
 *   caller's JSON contract plus zod validation and repair rounds apply.
 *
 * The model allowlist fails closed, so the key is never a general proxy.
 */
export const opencodeChatModels = ['claude-haiku-5-5'] as const;

export type OpenCodeChatModel = (typeof opencodeChatModels)[number];

export function isOpenCodeChatModel(model: string): model is OpenCodeChatModel {
  return (opencodeChatModels as readonly string[]).includes(model);
}

export const OPENCODE_DEFAULT_BASE_URL = 'https://opencode.ai/inference/v1';

export interface OpenCodeChatProviderConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  overallTimeoutMs?: number;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL((value || OPENCODE_DEFAULT_BASE_URL).replace(/\/+$/, ''));
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('OpenCode base URL must use HTTP or HTTPS');
  }
  return url.toString().replace(/\/+$/, '');
}

function errorMessage(data: Record<string, unknown>, fallback: string) {
  const error = data.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return typeof data.message === 'string' ? data.message : fallback;
}

export function classifyOpenCodeFailure(
  status: number | undefined,
  message: string
): { code: ChatFailureCode; retryable: boolean } {
  const normalized = message.toLowerCase();
  if (status === 401 || status === 403) {
    return { code: 'upstream_auth', retryable: false };
  }
  if (/insufficient.+(balance|credit|funds)|quota|billing/.test(normalized)) {
    return { code: 'upstream_quota', retryable: false };
  }
  if (
    status === 404 ||
    /model.*(not found|does not exist|unsupported)/.test(normalized)
  ) {
    return { code: 'model_unavailable', retryable: false };
  }
  if (
    status === 429 ||
    status === 529 ||
    /overloaded|rate.?limit/.test(normalized)
  ) {
    return { code: 'upstream_saturated', retryable: true };
  }
  if (status === 408 || /timed?\s*out|timeout/.test(normalized)) {
    return { code: 'upstream_timeout', retryable: true };
  }
  if (status !== undefined && status >= 500) {
    return { code: 'upstream_unavailable', retryable: true };
  }
  if (status !== undefined && status >= 400) {
    return { code: 'upstream_invalid_request', retryable: false };
  }
  return { code: 'invalid_response', retryable: false };
}

/** System turns go to `system`; consecutive same-role turns are allowed. */
function anthropicRequestMessages(messages: ChatTurn[]) {
  return {
    system: messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n'),
    messages: messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content })),
  };
}

function parseUsage(data: Record<string, unknown>): ChatUsage | undefined {
  const usage =
    data.usage && typeof data.usage === 'object'
      ? (data.usage as Record<string, unknown>)
      : undefined;
  if (!usage) return undefined;
  const count = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  return {
    inputTokens: count(usage.input_tokens),
    outputTokens: count(usage.output_tokens),
  };
}

/**
 * Callers pick effort on the GPT scale (planning high, scene composition
 * medium). Haiku 5.5 thinks far more per level: at medium a scene used
 * 20-31k output tokens and hit its cap, while its mathematics needed high
 * (2026-10-16 smoke runs). So medium-and-below run at low, high-and-above at
 * high: careful plans and audits, lean scenes.
 */
const HAIKU_EFFORT: Record<
  NonNullable<ChatCompletionInput['reasoningEffort']>,
  'low' | 'high'
> = {
  low: 'low',
  medium: 'low',
  high: 'high',
  xhigh: 'high',
  max: 'high',
};

export class OpenCodeChatProvider implements ChatProvider {
  readonly name = 'opencode';
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly maxAttempts: number;
  private readonly requestTimeoutMs: number;
  private readonly overallTimeoutMs: number;

  constructor(private readonly config: OpenCodeChatProviderConfig) {
    if (!config.apiKey) throw new Error('OpenCode API key is required');
    this.baseUrl = normalizeBaseUrl(
      config.baseUrl || OPENCODE_DEFAULT_BASE_URL
    );
    this.fetchImpl = (config.fetch || globalThis.fetch).bind(globalThis);
    this.maxAttempts = Math.max(1, Math.min(config.maxAttempts ?? 2, 4));
    this.requestTimeoutMs = Math.max(config.requestTimeoutMs ?? 120_000, 1_000);
    this.overallTimeoutMs = Math.max(config.overallTimeoutMs ?? 240_000, 1_000);
  }

  private failure(
    message: string,
    model: string,
    status?: number,
    cause?: unknown
  ): ChatProviderError {
    return new ChatProviderError(message, {
      ...classifyOpenCodeFailure(status, message),
      status,
      provider: this.name,
      model,
      cause,
    });
  }

  private async attempt(
    model: OpenCodeChatModel,
    input: ChatCompletionInput,
    deadlineAt: number
  ): Promise<ChatCompletionResult> {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      throw this.failure('OpenCode request deadline exceeded', model, 408);
    }
    const timeout = AbortSignal.timeout(
      Math.max(1, Math.min(this.requestTimeoutMs, remaining))
    );
    const signal = input.signal
      ? AbortSignal.any([input.signal, timeout])
      : timeout;
    const { system, messages } = anthropicRequestMessages(input.messages);
    const body = {
      model,
      max_tokens: input.maxTokens ?? 8_000,
      stream: false,
      messages,
      ...(system ? { system } : {}),
      ...(input.reasoningEffort
        ? { output_config: { effort: HAIKU_EFFORT[input.reasoningEffort] } }
        : {}),
    };

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (input.signal?.aborted) {
        throw new ChatProviderError('OpenCode request was canceled', {
          code: 'stream_interrupted',
          retryable: false,
          provider: this.name,
          model,
          cause: error,
        });
      }
      const timedOut =
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError');
      throw this.failure(
        timedOut ? 'OpenCode request timed out' : 'OpenCode request failed',
        model,
        timedOut ? 408 : 503,
        error
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok || data.type === 'error') {
      throw this.failure(
        errorMessage(data, `OpenCode request failed (${response.status})`),
        model,
        response.ok ? 502 : response.status
      );
    }
    const content = (Array.isArray(data.content) ? data.content : [])
      .filter(
        (block): block is { type: 'text'; text: string } =>
          !!block &&
          typeof block === 'object' &&
          (block as Record<string, unknown>).type === 'text' &&
          typeof (block as Record<string, unknown>).text === 'string'
      )
      .map((block) => block.text)
      .join('')
      .trim();
    if (data.stop_reason === 'refusal') {
      throw new ChatProviderError('The model declined this request', {
        code: 'invalid_response',
        retryable: false,
        provider: this.name,
        model,
      });
    }
    if (data.stop_reason === 'max_tokens') {
      throw new ChatProviderError('OpenCode response reached max_tokens', {
        code: 'output_truncated',
        retryable: false,
        provider: this.name,
        model,
      });
    }
    if (!content) {
      throw new ChatProviderError('OpenCode returned an empty response', {
        code: 'empty_response',
        retryable: true,
        provider: this.name,
        model,
      });
    }
    return {
      content,
      model: typeof data.model === 'string' ? data.model : model,
      provider: this.name,
      usage: parseUsage(data),
    };
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    if (!isOpenCodeChatModel(input.model)) {
      throw new ChatProviderError('OpenCode chat model is not allowlisted', {
        code: 'model_unavailable',
        retryable: false,
        provider: this.name,
        model: input.model,
      });
    }
    const deadlineAt = input.deadlineAt ?? Date.now() + this.overallTimeoutMs;
    let lastError: ChatProviderError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await this.attempt(input.model, input, deadlineAt);
      } catch (error) {
        lastError =
          error instanceof ChatProviderError
            ? error
            : this.failure(String(error), input.model, 503, error);
        if (!lastError.retryable || attempt === this.maxAttempts)
          throw lastError;
        const delay = Math.min(500 * 2 ** (attempt - 1), 4_000);
        if (Date.now() + delay >= deadlineAt) throw lastError;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError!;
  }
}
