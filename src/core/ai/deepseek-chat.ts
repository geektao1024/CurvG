import {
  ChatProviderError,
  type ChatCompletionInput,
  type ChatCompletionResult,
  type ChatFailureCode,
  type ChatProvider,
  type ChatTurn,
} from './chat';

/**
 * DeepSeek official Responses API adapter (https://api.deepseek.com).
 *
 * The Responses endpoint currently serves only `deepseek-v4-flash`
 * (deepseek-v4-pro is announced for early August 2026). The allowlist fails
 * closed, exactly like the Kie adapter, so a credential can never be turned
 * into an arbitrary upstream proxy.
 */
export const deepseekChatModels = ['deepseek-v4-flash'] as const;

export type DeepSeekChatModel = (typeof deepseekChatModels)[number];

export function isDeepSeekChatModel(model: string): model is DeepSeekChatModel {
  return (deepseekChatModels as readonly string[]).includes(model);
}

export interface DeepSeekChatProviderConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  overallTimeoutMs?: number;
}

function normalizeRootUrl(value: string): string {
  const url = new URL(
    (value || 'https://api.deepseek.com').replace(/\/+$/, '')
  );
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('DeepSeek base URL must use HTTP or HTTPS');
  }
  return url.toString().replace(/\/+$/, '');
}

function messageFrom(data: Record<string, unknown>, fallback: string) {
  const error = data.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  for (const key of ['msg', 'message', 'detail']) {
    if (typeof data[key] === 'string') return data[key];
  }
  return fallback;
}

function classifyFailure(
  status: number | undefined,
  message: string
): { code: ChatFailureCode; retryable: boolean } {
  const normalized = message.toLowerCase();
  if (
    (status === 400 || status === 404) &&
    /(?:model|模型).*(?:not found|does not exist|unavailable|不存在|不可用)|invalid model|model[_ -]?not[_ -]?found/.test(
      normalized
    )
  ) {
    return { code: 'model_unavailable', retryable: false };
  }
  if (/quota|insufficient.+(balance|credit)|余额|额度不足/.test(normalized)) {
    return { code: 'upstream_quota', retryable: false };
  }
  if (status === 401 || status === 403) {
    return { code: 'upstream_auth', retryable: false };
  }
  if (
    status === 429 ||
    /saturat|capacity|too many requests|rate.?limit/.test(normalized)
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

function responsesInput(messages: ChatTurn[]) {
  return messages.map((message) => ({
    role: message.role === 'system' ? 'developer' : message.role,
    content: [
      {
        // Strict Responses semantics: assistant turns are model output and
        // must use output_text; everything else is caller input.
        type: message.role === 'assistant' ? 'output_text' : 'input_text',
        text: message.content,
      },
    ],
  }));
}

function parseResponses(data: Record<string, unknown>) {
  if (typeof data.output_text === 'string') return data.output_text.trim();
  const output = Array.isArray(data.output) ? data.output : [];
  return output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const content = (item as Record<string, unknown>).content;
      if (!Array.isArray(content)) return [];
      return content.flatMap((part) => {
        if (!part || typeof part !== 'object') return [];
        const record = part as Record<string, unknown>;
        return record.type === 'output_text' && typeof record.text === 'string'
          ? [record.text]
          : [];
      });
    })
    .join('')
    .trim();
}

/**
 * DeepSeek documents `reasoning.effort` but not the above-"high" tiers that
 * the KIE codex route accepts. Normalize proactively instead of burning a
 * round trip on a 4xx: "thinking maxed out" on this route is `high`.
 */
function normalizeEffort(
  effort: ChatCompletionInput['reasoningEffort']
): 'low' | 'medium' | 'high' | undefined {
  if (!effort) return undefined;
  return effort === 'xhigh' || effort === 'max' ? 'high' : effort;
}

export class DeepSeekChatProvider implements ChatProvider {
  readonly name = 'deepseek';
  private readonly apiKey: string;
  private readonly rootUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly maxAttempts: number;
  private readonly requestTimeoutMs: number;
  private readonly overallTimeoutMs: number;

  constructor(config: DeepSeekChatProviderConfig) {
    if (!config.apiKey.trim()) throw new Error('DeepSeek API key is required');
    this.apiKey = config.apiKey.trim();
    this.rootUrl = normalizeRootUrl(
      config.baseUrl || 'https://api.deepseek.com'
    );
    this.fetchImpl = (config.fetch || globalThis.fetch).bind(globalThis);
    this.maxAttempts = Math.max(1, Math.min(config.maxAttempts ?? 1, 3));
    this.requestTimeoutMs = Math.max(config.requestTimeoutMs ?? 300_000, 1_000);
    this.overallTimeoutMs = Math.max(config.overallTimeoutMs ?? 600_000, 1_000);
  }

  private providerError(
    message: string,
    model: string,
    status?: number,
    cause?: unknown
  ): ChatProviderError {
    const { code, retryable } = classifyFailure(status, message);
    return new ChatProviderError(message, {
      code,
      retryable,
      status,
      provider: this.name,
      model,
      cause,
    });
  }

  private async attempt(
    model: DeepSeekChatModel,
    input: ChatCompletionInput,
    deadlineAt: number
  ): Promise<ChatCompletionResult> {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      throw this.providerError(
        'DeepSeek request deadline exceeded',
        model,
        408
      );
    }
    const effort = normalizeEffort(input.reasoningEffort);
    const body: Record<string, unknown> = {
      model,
      input: responsesInput(input.messages),
      stream: false,
      ...(input.maxTokens === undefined
        ? {}
        : { max_output_tokens: input.maxTokens }),
      // Ignored by the upstream while thinking is active; harmless otherwise.
      ...(input.temperature === undefined
        ? {}
        : { temperature: input.temperature }),
      ...(effort ? { reasoning: { effort } } : {}),
    };
    const timeoutSignal = AbortSignal.timeout(
      Math.max(1, Math.min(this.requestTimeoutMs, remaining))
    );
    const signal = input.signal
      ? AbortSignal.any([input.signal, timeoutSignal])
      : timeoutSignal;

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.rootUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (input.signal?.aborted) {
        throw new ChatProviderError('DeepSeek request was canceled', {
          code: 'stream_interrupted',
          retryable: false,
          provider: this.name,
          model,
          cause: error,
        });
      }
      const message = error instanceof Error ? error.message : String(error);
      const timedOut =
        (error instanceof Error &&
          (error.name === 'AbortError' || error.name === 'TimeoutError')) ||
        /timed?\s*out|timeout/i.test(message);
      throw this.providerError(
        timedOut
          ? 'DeepSeek request timed out'
          : message || 'DeepSeek request failed',
        model,
        timedOut ? 408 : 503,
        error
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw this.providerError(
        messageFrom(data, `DeepSeek request failed (${response.status})`),
        model,
        response.status
      );
    }
    // Non-streaming Responses objects carry a terminal status field. An
    // in-body `failed` on HTTP 200 is a definitive upstream verdict, not a
    // transport flake: surface it non-retryable so the failover advances to
    // the next vendor instead of burning retries on the same request.
    if (data.status === 'failed') {
      const detail =
        typeof data.error === 'string'
          ? data.error
          : messageFrom(data, 'DeepSeek response failed');
      throw new ChatProviderError(detail, {
        code: 'invalid_response',
        retryable: false,
        status: response.status,
        provider: this.name,
        model,
      });
    }
    if (data.status === 'incomplete') {
      throw new ChatProviderError('DeepSeek response was truncated', {
        code: 'output_truncated',
        retryable: false,
        status: response.status,
        provider: this.name,
        model,
      });
    }

    const content = parseResponses(data);
    if (!content) {
      throw new ChatProviderError('DeepSeek returned an empty response', {
        code: 'empty_response',
        retryable: true,
        status: response.status,
        provider: this.name,
        model,
      });
    }
    return {
      content,
      model: typeof data.model === 'string' ? data.model : model,
      provider: this.name,
    };
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    if (!isDeepSeekChatModel(input.model)) {
      throw new ChatProviderError('DeepSeek chat model is not allowlisted', {
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
            : this.providerError(String(error), input.model, 503, error);
        if (!lastError.retryable || attempt === this.maxAttempts)
          throw lastError;
        const delay = Math.min(250 * 2 ** (attempt - 1), 1_000);
        if (Date.now() + delay >= deadlineAt) throw lastError;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError!;
  }
}
