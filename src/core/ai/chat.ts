export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionInput {
  model: string;
  messages: ChatTurn[];
  temperature?: number;
  maxTokens?: number;
  /** OpenAI-compatible reasoning budget hint for supported models. */
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** Shared absolute deadline used by retry/failover chains. */
  deadlineAt?: number;
  signal?: AbortSignal;
}

/** Safe, bounded metadata for diagnosing provider/protocol failures. */
export interface ChatProviderDiagnostic {
  eventType?: string;
  upstreamType?: string;
  upstreamCode?: string;
  incompleteReason?: string;
  finishReason?: string;
  responseStatus?: number;
  inputChars?: number;
  outputChars?: number;
  elapsedMs?: number;
  malformedEventCount?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: string;
  diagnostic?: ChatProviderDiagnostic;
}

export interface ChatProvider {
  readonly name: string;
  complete(input: ChatCompletionInput): Promise<ChatCompletionResult>;
  stream?(
    input: ChatCompletionInput,
    onDelta: (delta: string) => void
  ): Promise<ChatCompletionResult>;
  /**
   * Reject a syntactically successful completion that failed the caller's
   * structured-output validator. Auto providers use this signal to exclude
   * the exact target that produced it and report whether another reviewed
   * target remains. Explicit providers intentionally omit this hook.
   */
  rejectInvalidResult?(result: ChatCompletionResult): boolean;
}

export type ChatFailureCode =
  | 'upstream_saturated'
  | 'upstream_timeout'
  | 'upstream_unavailable'
  | 'model_unavailable'
  | 'upstream_auth'
  | 'upstream_quota'
  | 'upstream_invalid_request'
  | 'output_truncated'
  | 'malformed_stream'
  | 'invalid_response'
  | 'empty_response'
  | 'stream_interrupted'
  | 'unknown';

export class ChatProviderError extends Error {
  readonly code: ChatFailureCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly retryAfterMs?: number;
  readonly provider?: string;
  readonly model?: string;
  readonly partialOutput: boolean;
  readonly diagnostic?: ChatProviderDiagnostic;
  /** Whether retrying the same provider/model is useful before failover. */
  readonly retrySameModel: boolean;

  constructor(
    message: string,
    options: {
      code: ChatFailureCode;
      retryable: boolean;
      status?: number;
      requestId?: string;
      retryAfterMs?: number;
      provider?: string;
      model?: string;
      partialOutput?: boolean;
      retrySameModel?: boolean;
      diagnostic?: ChatProviderDiagnostic;
      cause?: unknown;
    }
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause }
    );
    this.name = 'ChatProviderError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.status = options.status;
    this.requestId = options.requestId;
    this.retryAfterMs = options.retryAfterMs;
    this.provider = options.provider;
    this.model = options.model;
    this.partialOutput = options.partialOutput ?? false;
    this.diagnostic = options.diagnostic;
    this.retrySameModel = options.retrySameModel ?? options.retryable;
  }
}

function normalizeBaseUrl(value: string, fallback: string): string {
  const url = new URL((value || fallback).replace(/\/+$/, ''));
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('AI base URL must use HTTP or HTTPS');
  }
  return url.toString().replace(/\/+$/, '');
}

function errorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const record = data as Record<string, unknown>;
  const error = record.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  const message = record.message;
  return typeof message === 'string' ? message : fallback;
}

export function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function responseRequestId(response: Response, data?: Record<string, unknown>) {
  const bodyId = data?.request_id ?? data?.requestId ?? data?.id;
  return (
    response.headers.get('x-request-id') ||
    response.headers.get('request-id') ||
    response.headers.get('cf-ray') ||
    (typeof bodyId === 'string' ? bodyId : undefined)
  );
}

function retryAfterMs(response: Response): number | undefined {
  const value = response.headers.get('retry-after')?.trim();
  if (!value) return undefined;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1_000
    : Date.parse(value) - Date.now();
  if (!Number.isFinite(delay)) return undefined;
  return Math.max(0, Math.min(delay, 15_000));
}

function failureCode(status: number | undefined, message: string) {
  const normalized = message.toLowerCase();
  const modelUnavailable =
    /(?:model|模型).*(?:not found|does not exist|unavailable|不存在|不可用)|(?:not found|does not exist|不存在).*(?:model|模型)|model[_ -]?not[_ -]?found|invalid model/.test(
      normalized
    );
  // A missing model cannot be fixed by retrying the same model. Auto may
  // advance to its verified fallback, while an explicit selection fails as-is.
  if ((status === 400 || status === 404) && modelUnavailable) {
    return { code: 'model_unavailable' as const, retryable: false };
  }
  const quota = /quota|insufficient.+(balance|credit)|余额|额度不足/.test(
    normalized
  );
  if (quota) return { code: 'upstream_quota' as const, retryable: false };
  if (status === 401 || status === 403) {
    return { code: 'upstream_auth' as const, retryable: false };
  }
  if (
    status === 429 ||
    /saturat|capacity|too many requests|rate.?limit|上游.+满|负载/.test(
      normalized
    )
  ) {
    return { code: 'upstream_saturated' as const, retryable: true };
  }
  if (status === 408 || /timed?\s*out|timeout/.test(normalized)) {
    return { code: 'upstream_timeout' as const, retryable: true };
  }
  if (status !== undefined && status >= 500) {
    return { code: 'upstream_unavailable' as const, retryable: true };
  }
  return {
    code: 'invalid_response' as const,
    retryable: status !== undefined && retryableStatus(status),
  };
}

function httpError(
  response: Response,
  data: Record<string, unknown>,
  provider: string,
  model: string
) {
  const message = errorMessage(
    data,
    `AI upstream request failed (${response.status})`
  );
  const classification = failureCode(response.status, message);
  return new ChatProviderError(message, {
    ...classification,
    status: response.status,
    requestId: responseRequestId(response, data),
    retryAfterMs: retryAfterMs(response),
    provider,
    model,
  });
}

function normalizedError(
  error: unknown,
  provider: string,
  model: string,
  partialOutput = false
): ChatProviderError {
  if (error instanceof ChatProviderError) {
    if (partialOutput && !error.partialOutput) {
      return new ChatProviderError(error.message, {
        code: 'stream_interrupted',
        retryable: false,
        status: error.status,
        requestId: error.requestId,
        provider: error.provider || provider,
        model: error.model || model,
        partialOutput: true,
        diagnostic: error.diagnostic,
        cause: error,
      });
    }
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  const isTimeout =
    (error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')) ||
    /timed?\s*out|timeout/i.test(message);
  return new ChatProviderError(message || 'AI upstream request failed', {
    code: partialOutput
      ? 'stream_interrupted'
      : isTimeout
        ? 'upstream_timeout'
        : 'upstream_unavailable',
    retryable: !partialOutput,
    provider,
    model,
    partialOutput,
    cause: error,
  });
}

function textContent(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .map((part) => {
      if (!part || typeof part !== 'object') return '';
      const text = (part as Record<string, unknown>).text;
      return typeof text === 'string' ? text : '';
    })
    .join('');
}

function requestSignal(input: ChatCompletionInput, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
}

interface OpenAICompatibleChatProviderConfig {
  apiKey: string;
  baseUrl?: string;
  name?: string;
  /** Test seams and operational tuning; production callers use defaults. */
  fetch?: typeof globalThis.fetch;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  overallTimeoutMs?: number;
  /** Stop a stream that emits only reasoning and never starts final content. */
  reasoningOnlyTimeoutMs?: number;
}

export class OpenAICompatibleChatProvider implements ChatProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly sleepImpl: (delayMs: number) => Promise<void>;
  private readonly random: () => number;
  private readonly now: () => number;
  private readonly maxAttempts: number;
  private readonly requestTimeoutMs: number;
  private readonly overallTimeoutMs: number;
  private readonly reasoningOnlyTimeoutMs?: number;

  constructor(config: OpenAICompatibleChatProviderConfig) {
    if (!config.apiKey.trim()) throw new Error('OpenAI API key is required');
    this.name = config.name?.trim() || 'openai';
    this.apiKey = config.apiKey.trim();
    this.baseUrl = normalizeBaseUrl(
      config.baseUrl || '',
      'https://api.openai.com/v1'
    );
    // Cloudflare Workers' native `fetch` validates its receiver. Calling a
    // saved reference as `this.fetchImpl(...)` otherwise supplies the provider
    // instance as `this` and fails with `Illegal invocation`. Bind both the
    // runtime fetch and injected test seams to the global receiver once.
    this.fetchImpl = (config.fetch || globalThis.fetch).bind(globalThis);
    this.sleepImpl = config.sleep || sleep;
    this.random = config.random || Math.random;
    this.now = config.now || Date.now;
    this.maxAttempts = Math.max(1, Math.min(config.maxAttempts ?? 3, 5));
    this.requestTimeoutMs = Math.max(config.requestTimeoutMs ?? 180_000, 1_000);
    this.overallTimeoutMs = Math.max(config.overallTimeoutMs ?? 240_000, 1_000);
    this.reasoningOnlyTimeoutMs =
      config.reasoningOnlyTimeoutMs === undefined
        ? undefined
        : Math.max(config.reasoningOnlyTimeoutMs, 1_000);
  }

  private deadline(input: ChatCompletionInput) {
    return input.deadlineAt ?? Date.now() + this.overallTimeoutMs;
  }

  private async waitForRetry(
    error: ChatProviderError,
    attempt: number,
    deadlineAt: number
  ) {
    const exponential = Math.min(500 * 2 ** (attempt - 1), 5_000);
    const jitter = Math.floor(this.random() * 250);
    const requested = error.retryAfterMs ?? exponential + jitter;
    const remaining = deadlineAt - Date.now();
    if (remaining <= requested) {
      throw new ChatProviderError('AI upstream retry deadline exceeded', {
        code: 'upstream_timeout',
        retryable: true,
        provider: this.name,
        model: error.model,
        requestId: error.requestId,
        cause: error,
      });
    }
    await this.sleepImpl(requested);
  }

  private timeoutFor(deadlineAt: number) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      throw new ChatProviderError('AI upstream request deadline exceeded', {
        code: 'upstream_timeout',
        retryable: true,
        provider: this.name,
      });
    }
    return Math.max(1, Math.min(this.requestTimeoutMs, remaining));
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    const deadlineAt = this.deadline(input);
    let lastError: ChatProviderError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchImpl(
          `${this.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: input.model,
              messages: input.messages,
              temperature: input.temperature ?? 0.2,
              max_tokens: input.maxTokens ?? 6000,
              ...(input.reasoningEffort
                ? { reasoning_effort: input.reasoningEffort }
                : {}),
            }),
            signal: requestSignal(input, this.timeoutFor(deadlineAt)),
          }
        );
        const data = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!response.ok) {
          throw httpError(response, data, this.name, input.model);
        }
        const choices = Array.isArray(data.choices) ? data.choices : [];
        const first = choices[0] as Record<string, unknown> | undefined;
        const message = first?.message as Record<string, unknown> | undefined;
        const content = textContent(message?.content);
        if (!content.trim()) {
          throw new ChatProviderError(
            'AI upstream returned an empty response',
            {
              code: 'empty_response',
              retryable: true,
              requestId: responseRequestId(response, data),
              provider: this.name,
              model: input.model,
            }
          );
        }
        return {
          content: content.trim(),
          model: typeof data.model === 'string' ? data.model : input.model,
          provider: this.name,
        };
      } catch (error) {
        if (input.signal?.aborted) {
          throw new ChatProviderError('AI request was canceled', {
            code: 'stream_interrupted',
            retryable: false,
            provider: this.name,
            model: input.model,
            cause: error,
          });
        }
        lastError = normalizedError(error, this.name, input.model);
        if (
          !lastError.retryable ||
          !lastError.retrySameModel ||
          attempt >= this.maxAttempts
        )
          throw lastError;
        await this.waitForRetry(lastError, attempt, deadlineAt);
      }
    }
    throw (
      lastError ||
      new ChatProviderError('AI upstream request failed', {
        code: 'unknown',
        retryable: false,
        provider: this.name,
        model: input.model,
      })
    );
  }

  async stream(
    input: ChatCompletionInput,
    onDelta: (delta: string) => void
  ): Promise<ChatCompletionResult> {
    const deadlineAt = this.deadline(input);
    let lastError: ChatProviderError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let emitted = false;
      try {
        const response = await this.fetchImpl(
          `${this.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model: input.model,
              messages: input.messages,
              temperature: input.temperature ?? 0.2,
              max_tokens: input.maxTokens ?? 6000,
              ...(input.reasoningEffort
                ? { reasoning_effort: input.reasoningEffort }
                : {}),
              stream: true,
            }),
            signal: requestSignal(input, this.timeoutFor(deadlineAt)),
          }
        );
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as Record<
            string,
            unknown
          >;
          throw httpError(response, data, this.name, input.model);
        }
        if (!response.body) {
          throw new ChatProviderError('AI upstream returned an empty stream', {
            code: 'empty_response',
            retryable: true,
            requestId: responseRequestId(response),
            provider: this.name,
            model: input.model,
          });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let content = '';
        let responseModel = input.model;
        let reasoningStartedAt: number | undefined;
        let reasoningCharacters = 0;

        const consumeLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) return;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') return;
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(payload) as Record<string, unknown>;
          } catch {
            return;
          }
          if (data.error) {
            const message = errorMessage(data, 'AI upstream stream failed');
            const classification = failureCode(undefined, message);
            throw new ChatProviderError(message, {
              ...classification,
              requestId:
                typeof data.request_id === 'string'
                  ? data.request_id
                  : responseRequestId(response),
              provider: this.name,
              model: input.model,
              partialOutput: emitted,
            });
          }
          if (typeof data.model === 'string') responseModel = data.model;
          const choices = Array.isArray(data.choices) ? data.choices : [];
          const first = choices[0] as Record<string, unknown> | undefined;
          const delta = first?.delta as Record<string, unknown> | undefined;
          const text = textContent(delta?.content);
          if (text) {
            emitted = true;
            content += text;
            onDelta(text);
            return;
          }
          const reasoning = textContent(
            delta?.reasoning_content ?? delta?.reasoning
          );
          if (!reasoning || emitted) return;
          const now = this.now();
          reasoningStartedAt ??= now;
          reasoningCharacters += reasoning.length;
          if (
            this.reasoningOnlyTimeoutMs !== undefined &&
            now - reasoningStartedAt >= this.reasoningOnlyTimeoutMs
          ) {
            throw new ChatProviderError(
              `AI model exceeded the reasoning-only budget after ${reasoningCharacters} characters`,
              {
                code: 'upstream_timeout',
                retryable: true,
                retrySameModel: false,
                requestId: responseRequestId(response),
                provider: this.name,
                model: input.model,
              }
            );
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            let newline = buffer.indexOf('\n');
            while (newline >= 0) {
              consumeLine(buffer.slice(0, newline));
              buffer = buffer.slice(newline + 1);
              newline = buffer.indexOf('\n');
            }
            if (done) break;
          }
          if (buffer.trim()) consumeLine(buffer);
        } catch (error) {
          await reader.cancel().catch(() => undefined);
          throw error;
        }
        if (!content.trim()) {
          throw new ChatProviderError(
            'AI upstream returned an empty response',
            {
              code: 'empty_response',
              retryable: true,
              requestId: responseRequestId(response),
              provider: this.name,
              model: input.model,
            }
          );
        }
        return {
          content: content.trim(),
          model: responseModel,
          provider: this.name,
        };
      } catch (error) {
        if (input.signal?.aborted) {
          throw new ChatProviderError('AI request was canceled', {
            code: 'stream_interrupted',
            retryable: false,
            provider: this.name,
            model: input.model,
            partialOutput: emitted,
            cause: error,
          });
        }
        lastError = normalizedError(error, this.name, input.model, emitted);
        if (
          !lastError.retryable ||
          !lastError.retrySameModel ||
          emitted ||
          attempt >= this.maxAttempts
        ) {
          throw lastError;
        }
        await this.waitForRetry(lastError, attempt, deadlineAt);
      }
    }
    throw (
      lastError ||
      new ChatProviderError('AI upstream request failed', {
        code: 'unknown',
        retryable: false,
        provider: this.name,
        model: input.model,
      })
    );
  }
}

/**
 * All animation calls use the circuit breaker. Only Auto supplies fallback
 * models; explicit selections keep deterministic model identity.
 */
export class ChatModelCircuitBreaker {
  private readonly openUntil = new Map<string, number>();

  constructor(private readonly now: () => number = Date.now) {}

  private key(provider: string, model: string) {
    return `${provider}:${model}`;
  }

  canAttempt(provider: string, model: string) {
    const key = this.key(provider, model);
    const until = this.openUntil.get(key) || 0;
    if (until <= this.now()) {
      this.openUntil.delete(key);
      return true;
    }
    return false;
  }

  recordSuccess(provider: string, model: string) {
    this.openUntil.delete(this.key(provider, model));
  }

  recordFailure(provider: string, model: string, error: ChatProviderError) {
    const duration =
      error.code === 'upstream_saturated'
        ? 30_000
        : error.code === 'upstream_unavailable'
          ? 15_000
          : error.code === 'upstream_timeout'
            ? 5_000
            : 0;
    if (duration > 0) {
      this.openUntil.set(this.key(provider, model), this.now() + duration);
    }
  }
}

export class FailoverChatProvider implements ChatProvider {
  readonly name: string;

  constructor(
    private readonly provider: ChatProvider,
    private readonly fallbackModels: readonly string[],
    private readonly overallTimeoutMs = 300_000,
    private readonly circuitBreaker = new ChatModelCircuitBreaker(),
    private readonly perModelTimeoutMs = 90_000,
    private readonly now: () => number = Date.now
  ) {
    this.name = provider.name;
  }

  private candidates(primary: string) {
    return [primary, ...this.fallbackModels].filter(
      (model, index, models) => models.indexOf(model) === index
    );
  }

  private inputForModel(
    input: ChatCompletionInput,
    model: string,
    deadlineAt: number
  ): ChatCompletionInput {
    return {
      ...input,
      model,
      deadlineAt,
      // A tuning hint verified for the selected model must not be forwarded
      // blindly when Auto advances to a different provider-specific model.
      reasoningEffort:
        model === input.model ? input.reasoningEffort : undefined,
    };
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    const deadlineAt = input.deadlineAt ?? this.now() + this.overallTimeoutMs;
    let lastError: ChatProviderError | undefined;
    let attempted = false;
    for (const model of this.candidates(input.model)) {
      if (this.now() >= deadlineAt) {
        lastError = new ChatProviderError(
          'AI upstream request deadline exceeded',
          {
            code: 'upstream_timeout',
            retryable: true,
            provider: this.provider.name,
            model,
          }
        );
        break;
      }
      if (!this.circuitBreaker.canAttempt(this.provider.name, model)) continue;
      attempted = true;
      try {
        const modelDeadlineAt = this.fallbackModels.length
          ? Math.min(deadlineAt, this.now() + this.perModelTimeoutMs)
          : deadlineAt;
        const result = await this.provider.complete(
          this.inputForModel(input, model, modelDeadlineAt)
        );
        this.circuitBreaker.recordSuccess(this.provider.name, model);
        return result;
      } catch (error) {
        lastError = normalizedError(error, this.provider.name, model);
        const canFailOver =
          lastError.retryable || lastError.code === 'model_unavailable';
        if (!canFailOver || lastError.partialOutput) throw lastError;
        this.circuitBreaker.recordFailure(this.provider.name, model, lastError);
      }
    }
    throw (
      lastError ||
      new ChatProviderError('AI models are temporarily at capacity', {
        code: attempted ? 'upstream_unavailable' : 'upstream_saturated',
        retryable: true,
        provider: this.provider.name,
        model: input.model,
      })
    );
  }

  async stream(
    input: ChatCompletionInput,
    onDelta: (delta: string) => void
  ): Promise<ChatCompletionResult> {
    const deadlineAt = input.deadlineAt ?? this.now() + this.overallTimeoutMs;
    let lastError: ChatProviderError | undefined;
    let attempted = false;
    for (const model of this.candidates(input.model)) {
      if (this.now() >= deadlineAt) {
        lastError = new ChatProviderError(
          'AI upstream request deadline exceeded',
          {
            code: 'upstream_timeout',
            retryable: true,
            provider: this.provider.name,
            model,
          }
        );
        break;
      }
      if (!this.circuitBreaker.canAttempt(this.provider.name, model)) continue;
      attempted = true;
      try {
        const modelDeadlineAt = this.fallbackModels.length
          ? Math.min(deadlineAt, this.now() + this.perModelTimeoutMs)
          : deadlineAt;
        if (this.provider.stream) {
          const result = await this.provider.stream(
            this.inputForModel(input, model, modelDeadlineAt),
            onDelta
          );
          this.circuitBreaker.recordSuccess(this.provider.name, model);
          return result;
        }
        const result = await this.provider.complete(
          this.inputForModel(input, model, modelDeadlineAt)
        );
        onDelta(result.content);
        this.circuitBreaker.recordSuccess(this.provider.name, model);
        return result;
      } catch (error) {
        lastError = normalizedError(error, this.provider.name, model);
        const canFailOver =
          lastError.retryable || lastError.code === 'model_unavailable';
        if (!canFailOver || lastError.partialOutput) throw lastError;
        this.circuitBreaker.recordFailure(this.provider.name, model, lastError);
      }
    }
    throw (
      lastError ||
      new ChatProviderError('AI models are temporarily at capacity', {
        code: attempted ? 'upstream_unavailable' : 'upstream_saturated',
        retryable: true,
        provider: this.provider.name,
        model: input.model,
      })
    );
  }
}

export interface ChatProviderTarget {
  provider: ChatProvider;
  model: string;
  reasoningEffort?: ChatCompletionInput['reasoningEffort'];
}

/**
 * Bounded failover across provider/model targets. This is deliberately
 * separate from FailoverChatProvider: retryable model failures may advance to
 * another target, while a credential/quota failure never tries another model
 * with the same credential and no failure advances after partial output.
 */
export class ProviderFailoverChatProvider implements ChatProvider {
  readonly name: string;
  private readonly targets: readonly ChatProviderTarget[];
  private readonly rejectedTargets = new Set<ChatProviderTarget>();
  private readonly resultTargets = new WeakMap<
    ChatCompletionResult,
    ChatProviderTarget
  >();

  constructor(
    targets: readonly ChatProviderTarget[],
    private readonly overallTimeoutMs = 300_000,
    private readonly circuitBreaker = new ChatModelCircuitBreaker(),
    private readonly perTargetTimeoutMs = 90_000,
    private readonly now: () => number = Date.now
  ) {
    if (targets.length === 0) {
      throw new Error('At least one chat provider target is required');
    }
    this.targets = targets.filter(
      (target, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.provider.name === target.provider.name &&
            candidate.model === target.model
        ) === index
    );
    this.name = this.targets[0].provider.name;
  }

  rejectInvalidResult(result: ChatCompletionResult): boolean {
    const target = this.resultTargets.get(result);
    if (!target) return false;
    this.rejectedTargets.add(target);
    return this.targets.some(
      (candidate) => !this.rejectedTargets.has(candidate)
    );
  }

  private inputForTarget(
    input: ChatCompletionInput,
    target: ChatProviderTarget,
    deadlineAt: number
  ): ChatCompletionInput {
    return {
      ...input,
      model: target.model,
      deadlineAt,
      // A call site may deliberately lower the effort for a large,
      // deterministic synthesis stage. The target value remains the default
      // when the call does not provide stage-specific tuning.
      reasoningEffort: input.reasoningEffort ?? target.reasoningEffort,
    };
  }

  private mayAdvance(
    error: ChatProviderError,
    current: ChatProviderTarget,
    next: ChatProviderTarget | undefined,
    signal: AbortSignal | undefined
  ) {
    if (!next || error.partialOutput || signal?.aborted) return false;
    if (error.retryable || error.code === 'model_unavailable') return true;
    if (next.provider.name === current.provider.name) return false;
    return [
      'upstream_auth',
      'upstream_quota',
      'upstream_invalid_request',
      'output_truncated',
      'malformed_stream',
      'invalid_response',
    ].includes(error.code);
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    const deadlineAt = input.deadlineAt ?? this.now() + this.overallTimeoutMs;
    let lastError: ChatProviderError | undefined;
    let attempted = false;
    for (let index = 0; index < this.targets.length; index += 1) {
      const target = this.targets[index];
      const next = this.targets[index + 1];
      if (this.now() >= deadlineAt) break;
      if (this.rejectedTargets.has(target)) continue;
      if (!this.circuitBreaker.canAttempt(target.provider.name, target.model)) {
        continue;
      }
      attempted = true;
      try {
        const targetDeadlineAt = Math.min(
          deadlineAt,
          this.now() + this.perTargetTimeoutMs
        );
        const result = await target.provider.complete(
          this.inputForTarget(input, target, targetDeadlineAt)
        );
        this.resultTargets.set(result, target);
        this.circuitBreaker.recordSuccess(target.provider.name, target.model);
        return result;
      } catch (error) {
        lastError = normalizedError(error, target.provider.name, target.model);
        this.circuitBreaker.recordFailure(
          target.provider.name,
          target.model,
          lastError
        );
        if (!this.mayAdvance(lastError, target, next, input.signal)) {
          throw lastError;
        }
      }
    }
    throw (
      lastError ||
      new ChatProviderError('AI models are temporarily at capacity', {
        code: attempted ? 'upstream_unavailable' : 'upstream_saturated',
        retryable: true,
        provider: this.name,
        model: input.model,
      })
    );
  }

  async stream(
    input: ChatCompletionInput,
    onDelta: (delta: string) => void
  ): Promise<ChatCompletionResult> {
    const deadlineAt = input.deadlineAt ?? this.now() + this.overallTimeoutMs;
    let lastError: ChatProviderError | undefined;
    let attempted = false;
    for (let index = 0; index < this.targets.length; index += 1) {
      const target = this.targets[index];
      const next = this.targets[index + 1];
      if (this.now() >= deadlineAt) break;
      if (this.rejectedTargets.has(target)) continue;
      if (!this.circuitBreaker.canAttempt(target.provider.name, target.model)) {
        continue;
      }
      attempted = true;
      try {
        const targetDeadlineAt = Math.min(
          deadlineAt,
          this.now() + this.perTargetTimeoutMs
        );
        const targetInput = this.inputForTarget(
          input,
          target,
          targetDeadlineAt
        );
        const result = target.provider.stream
          ? await target.provider.stream(targetInput, onDelta)
          : await target.provider.complete(targetInput);
        if (!target.provider.stream) onDelta(result.content);
        this.resultTargets.set(result, target);
        this.circuitBreaker.recordSuccess(target.provider.name, target.model);
        return result;
      } catch (error) {
        lastError = normalizedError(error, target.provider.name, target.model);
        this.circuitBreaker.recordFailure(
          target.provider.name,
          target.model,
          lastError
        );
        if (!this.mayAdvance(lastError, target, next, input.signal)) {
          throw lastError;
        }
      }
    }
    throw (
      lastError ||
      new ChatProviderError('AI models are temporarily at capacity', {
        code: attempted ? 'upstream_unavailable' : 'upstream_saturated',
        retryable: true,
        provider: this.name,
        model: input.model,
      })
    );
  }
}

export class AnthropicChatProvider implements ChatProvider {
  readonly name = 'anthropic';
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string }) {
    if (!config.apiKey.trim()) throw new Error('Anthropic API key is required');
    this.apiKey = config.apiKey.trim();
    this.baseUrl = normalizeBaseUrl(
      config.baseUrl || '',
      'https://api.anthropic.com'
    );
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    const system = input.messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const messages = input.messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }));
    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: input.model,
        system,
        messages,
        temperature: input.temperature ?? 0.2,
        max_tokens: input.maxTokens ?? 6000,
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new Error(
        errorMessage(data, `Anthropic request failed (${response.status})`)
      );
    }
    const blocks = Array.isArray(data.content) ? data.content : [];
    const content = blocks
      .map((block) => {
        if (!block || typeof block !== 'object') return '';
        const text = (block as Record<string, unknown>).text;
        return typeof text === 'string' ? text : '';
      })
      .filter(Boolean)
      .join('\n');
    if (!content.trim())
      throw new Error('Anthropic returned an empty response');
    return {
      content: content.trim(),
      model: typeof data.model === 'string' ? data.model : input.model,
      provider: this.name,
    };
  }
}
