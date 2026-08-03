import {
  ChatProviderError,
  retryableStatus,
  type ChatCompletionInput,
  type ChatCompletionResult,
  type ChatFailureCode,
  type ChatProvider,
  type ChatTurn,
} from './chat';

type KieChatProtocol = 'chat-completions' | 'responses' | 'anthropic-messages';

interface KieChatRoute {
  protocol: KieChatProtocol;
  path: string;
  supportsStreaming: boolean;
}

/**
 * Kie chat endpoints are model-scoped and do not share one wire protocol.
 * Keep the exact routes server-owned so callers cannot turn the credential
 * into an arbitrary upstream proxy.
 */
export const kieChatModelRoutes = {
  'gemini-3.6-flash': {
    protocol: 'chat-completions',
    path: 'gemini-3-6-flash-openai/v1/chat/completions',
    supportsStreaming: true,
  },
  'grok-4-5': {
    protocol: 'responses',
    path: 'grok/v1/responses',
    supportsStreaming: false,
  },
  'gemini-3.1-pro': {
    protocol: 'chat-completions',
    path: 'gemini-3.1-pro/v1/chat/completions',
    supportsStreaming: false,
  },
  'gpt-5-2': {
    protocol: 'chat-completions',
    path: 'gpt-5-2/v1/chat/completions',
    supportsStreaming: false,
  },
  'gpt-5-5': {
    protocol: 'responses',
    path: 'codex/v1/responses',
    supportsStreaming: false,
  },
  'gpt-5-6-sol': {
    protocol: 'responses',
    path: 'codex/v1/responses',
    supportsStreaming: false,
  },
  'claude-sonnet-4-6': {
    protocol: 'anthropic-messages',
    path: 'claude/v1/messages',
    supportsStreaming: false,
  },
  'claude-opus-4-7': {
    protocol: 'anthropic-messages',
    path: 'claude/v1/messages',
    supportsStreaming: false,
  },
} as const satisfies Record<string, KieChatRoute>;

export type KieChatModel = keyof typeof kieChatModelRoutes;

export function isKieChatModel(model: string): model is KieChatModel {
  return Object.hasOwn(kieChatModelRoutes, model);
}

function normalizeKieRootUrl(value: string): string {
  const url = new URL((value || 'https://api.kie.ai').replace(/\/+$/, ''));
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Kie base URL must use HTTP or HTTPS');
  }
  return url.toString().replace(/\/+$/, '');
}

export function kieChatModelUrl(rootUrl: string, model: KieChatModel) {
  return `${normalizeKieRootUrl(rootUrl)}/${kieChatModelRoutes[model].path}`;
}

export interface KieChatProviderConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  overallTimeoutMs?: number;
  reasoningOnlyTimeoutMs?: number;
}

export interface KieImageReviewInput {
  systemPrompt?: string;
  prompt: string;
  imageUrl: string;
  maxTokens?: number;
  signal?: AbortSignal;
  deadlineAt?: number;
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

function businessStatus(data: Record<string, unknown>): number | undefined {
  const code = Number(data.code);
  if (!Number.isFinite(code) || code === 0 || code === 200) return undefined;
  return code >= 100 && code <= 599 ? code : 502;
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
    /saturat|capacity|too many requests|rate.?limit|负载/.test(normalized)
  ) {
    return { code: 'upstream_saturated', retryable: true };
  }
  if (status === 408 || /timed?\s*out|timeout/.test(normalized)) {
    return { code: 'upstream_timeout', retryable: true };
  }
  if (status !== undefined && status >= 500) {
    return { code: 'upstream_unavailable', retryable: true };
  }
  return {
    code: 'invalid_response',
    retryable: status !== undefined && retryableStatus(status),
  };
}

function providerError(
  message: string,
  model: string,
  status?: number,
  cause?: unknown
) {
  return new ChatProviderError(message, {
    ...classifyFailure(status, message),
    status,
    provider: 'kie',
    model,
    cause,
  });
}

function textParts(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const text = (item as Record<string, unknown>).text;
      return typeof text === 'string' ? [text] : [];
    })
    .join('');
}

function parseChatCompletions(data: Record<string, unknown>) {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const first = choices[0];
  if (!first || typeof first !== 'object') return '';
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return '';
  return textParts((message as Record<string, unknown>).content).trim();
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

function parseAnthropic(data: Record<string, unknown>) {
  return textParts(data.content).trim();
}

function responsesInput(messages: ChatTurn[]) {
  return messages.map((message) => ({
    role: message.role === 'system' ? 'developer' : message.role,
    content: [{ type: 'input_text', text: message.content }],
  }));
}

function anthropicMessages(messages: ChatTurn[]) {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({ role: message.role, content: message.content }));
}

/**
 * When the upstream rejects an above-"high" reasoning tier with a client
 * error that names the reasoning parameter, return the same request clamped
 * to "high"; otherwise return undefined and let the original error stand.
 */
function clampRejectedReasoningEffort(
  input: ChatCompletionInput,
  error: unknown
): ChatCompletionInput | undefined {
  if (input.reasoningEffort !== 'xhigh' && input.reasoningEffort !== 'max') {
    return undefined;
  }
  if (
    !(error instanceof ChatProviderError) ||
    error.retryable ||
    !error.status ||
    error.status < 400 ||
    error.status >= 500 ||
    !/reason|effort/i.test(error.message)
  ) {
    return undefined;
  }
  return { ...input, reasoningEffort: 'high' };
}

/** Chat-only Kie adapter; asynchronous image/video jobs remain separate. */
export class KieChatProvider implements ChatProvider {
  readonly name = 'kie';
  private readonly apiKey: string;
  private readonly rootUrl: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly maxAttempts: number;
  private readonly requestTimeoutMs: number;
  private readonly overallTimeoutMs: number;

  constructor(config: KieChatProviderConfig) {
    if (!config.apiKey.trim()) throw new Error('Kie API key is required');
    this.apiKey = config.apiKey.trim();
    this.rootUrl = normalizeKieRootUrl(config.baseUrl || 'https://api.kie.ai');
    this.fetchImpl = (config.fetch || globalThis.fetch).bind(globalThis);
    this.maxAttempts = Math.max(1, Math.min(config.maxAttempts ?? 1, 3));
    this.requestTimeoutMs = Math.max(config.requestTimeoutMs ?? 90_000, 1_000);
    this.overallTimeoutMs = Math.max(config.overallTimeoutMs ?? 120_000, 1_000);
  }

  private request(model: KieChatModel, input: ChatCompletionInput) {
    const route = kieChatModelRoutes[model];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    let body: Record<string, unknown>;

    if (route.protocol === 'anthropic-messages') {
      headers['x-api-key'] = `Bearer ${this.apiKey}`;
      headers['anthropic-version'] = '2023-06-01';
      const system = input.messages
        .filter((message) => message.role === 'system')
        .map((message) => message.content)
        .join('\n\n');
      body = {
        model,
        messages: anthropicMessages(input.messages),
        max_tokens: input.maxTokens ?? 4096,
        stream: false,
        thinkingFlag: false,
        ...(system ? { system } : {}),
        ...(input.temperature === undefined
          ? {}
          : { temperature: input.temperature }),
      };
    } else if (route.protocol === 'responses') {
      headers.Authorization = `Bearer ${this.apiKey}`;
      body = {
        model,
        input: responsesInput(input.messages),
        stream: false,
        ...(input.maxTokens === undefined
          ? {}
          : { max_output_tokens: input.maxTokens }),
        ...(input.reasoningEffort
          ? { reasoning: { effort: input.reasoningEffort } }
          : {}),
      };
    } else {
      headers.Authorization = `Bearer ${this.apiKey}`;
      body = {
        model,
        messages: input.messages,
        stream: false,
        ...(input.maxTokens === undefined
          ? {}
          : { max_tokens: input.maxTokens }),
        ...(input.temperature === undefined
          ? {}
          : { temperature: input.temperature }),
        ...(input.reasoningEffort
          ? { reasoning_effort: input.reasoningEffort }
          : {}),
      };
    }

    return { route, headers, body };
  }

  private async attempt(
    model: KieChatModel,
    input: ChatCompletionInput,
    deadlineAt: number,
    bodyOverride?: Record<string, unknown>
  ): Promise<ChatCompletionResult> {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      throw providerError('Kie request deadline exceeded', model, 408);
    }
    const { route, headers, body } = this.request(model, input);
    const timeoutSignal = AbortSignal.timeout(
      Math.max(1, Math.min(this.requestTimeoutMs, remaining))
    );
    const signal = input.signal
      ? AbortSignal.any([input.signal, timeoutSignal])
      : timeoutSignal;

    let response: Response;
    try {
      response = await this.fetchImpl(kieChatModelUrl(this.rootUrl, model), {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyOverride || body),
        signal,
      });
    } catch (error) {
      if (input.signal?.aborted) {
        throw new ChatProviderError('Kie request was canceled', {
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
      throw providerError(
        timedOut ? 'Kie request timed out' : message || 'Kie request failed',
        model,
        timedOut ? 408 : 503,
        error
      );
    }

    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const status = response.ok ? businessStatus(data) : response.status;
    if (status !== undefined) {
      throw providerError(
        messageFrom(data, `Kie request failed (${status})`),
        model,
        status
      );
    }

    const content =
      route.protocol === 'responses'
        ? parseResponses(data)
        : route.protocol === 'anthropic-messages'
          ? parseAnthropic(data)
          : parseChatCompletions(data);
    if (!content) {
      throw new ChatProviderError('Kie returned an empty response', {
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

  private async streamAttempt(
    model: KieChatModel,
    input: ChatCompletionInput,
    deadlineAt: number,
    onDelta: (delta: string) => void
  ): Promise<ChatCompletionResult> {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      throw providerError('Kie request deadline exceeded', model, 408);
    }
    const { route, headers, body } = this.request(model, input);
    if (!route.supportsStreaming) {
      const result = await this.attempt(model, input, deadlineAt);
      onDelta(result.content);
      return result;
    }

    const timeoutSignal = AbortSignal.timeout(
      Math.max(1, Math.min(this.requestTimeoutMs, remaining))
    );
    const signal = input.signal
      ? AbortSignal.any([input.signal, timeoutSignal])
      : timeoutSignal;
    let response: Response;
    try {
      response = await this.fetchImpl(kieChatModelUrl(this.rootUrl, model), {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, stream: true }),
        signal,
      });
    } catch (error) {
      if (input.signal?.aborted) {
        throw new ChatProviderError('Kie stream was canceled', {
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
      throw providerError(
        timedOut ? 'Kie stream timed out' : message || 'Kie stream failed',
        model,
        timedOut ? 408 : 503,
        error
      );
    }

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      throw providerError(
        messageFrom(data, `Kie request failed (${response.status})`),
        model,
        response.status
      );
    }

    if (!response.headers.get('content-type')?.includes('text/event-stream')) {
      const data = (await response.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      const status = businessStatus(data);
      if (status !== undefined) {
        throw providerError(
          messageFrom(data, `Kie request failed (${status})`),
          model,
          status
        );
      }
      const content = parseChatCompletions(data);
      if (!content) {
        throw new ChatProviderError('Kie returned an empty response', {
          code: 'empty_response',
          retryable: true,
          provider: this.name,
          model,
        });
      }
      onDelta(content);
      return {
        content,
        model: typeof data.model === 'string' ? data.model : model,
        provider: this.name,
      };
    }

    if (!response.body) {
      throw new ChatProviderError('Kie returned an empty stream', {
        code: 'empty_response',
        retryable: true,
        provider: this.name,
        model,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';
    let responseModel: string = model;
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
      const status = businessStatus(data);
      if (status !== undefined || data.error) {
        throw providerError(
          messageFrom(data, 'Kie stream failed'),
          model,
          status ?? 502
        );
      }
      if (typeof data.model === 'string') responseModel = data.model;
      const choices = Array.isArray(data.choices) ? data.choices : [];
      const first = choices[0] as Record<string, unknown> | undefined;
      const delta = first?.delta as Record<string, unknown> | undefined;
      const text = textParts(delta?.content);
      if (!text) return;
      content += text;
      onDelta(text);
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
      if (error instanceof ChatProviderError) throw error;
      if (input.signal?.aborted) {
        throw new ChatProviderError('Kie stream was canceled', {
          code: 'stream_interrupted',
          retryable: false,
          provider: this.name,
          model,
          partialOutput: Boolean(content),
          cause: error,
        });
      }
      if (content) {
        throw new ChatProviderError('Kie stream was interrupted', {
          code: 'stream_interrupted',
          retryable: false,
          provider: this.name,
          model,
          partialOutput: true,
          cause: error,
        });
      }
      const message = error instanceof Error ? error.message : String(error);
      const timedOut =
        timeoutSignal.aborted ||
        (error instanceof Error &&
          (error.name === 'AbortError' || error.name === 'TimeoutError')) ||
        /timed?\s*out|timeout/i.test(message);
      throw providerError(
        timedOut ? 'Kie stream timed out' : 'Kie stream connection failed',
        model,
        timedOut ? 408 : 503,
        error
      );
    }

    if (!content.trim()) {
      throw new ChatProviderError('Kie returned an empty stream', {
        code: 'empty_response',
        retryable: true,
        provider: this.name,
        model,
      });
    }
    return {
      content: content.trim(),
      model: responseModel,
      provider: this.name,
    };
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    if (!isKieChatModel(input.model)) {
      throw new ChatProviderError('Kie chat model is not allowlisted', {
        code: 'model_unavailable',
        retryable: false,
        provider: this.name,
        model: input.model,
      });
    }
    try {
      return await this.completeWithRetry(input.model, input);
    } catch (error) {
      // The animation policy may request an effort tier ("xhigh"/"max") the
      // upstream route does not accept. Clamp to "high" and retry once so a
      // tuning mismatch degrades reasoning depth instead of taking the whole
      // KIE route out of the failover plan.
      const clamped = clampRejectedReasoningEffort(input, error);
      if (!clamped) throw error;
      console.warn('[kie-chat] reasoning effort rejected, retrying at high', {
        model: input.model,
        effort: input.reasoningEffort,
      });
      return this.completeWithRetry(input.model, clamped);
    }
  }

  /**
   * Gemini 3.1 Pro's reviewed Kie endpoint accepts OpenAI-compatible image
   * parts. Keep this narrow instead of widening every provider's text turn
   * type or exposing an arbitrary upstream request body.
   */
  async completeImageReview(
    input: KieImageReviewInput
  ): Promise<ChatCompletionResult> {
    const imageUrl = new URL(input.imageUrl);
    if (!['http:', 'https:'].includes(imageUrl.protocol)) {
      throw new Error('Kie review image URL must use HTTP or HTTPS');
    }
    const chatInput: ChatCompletionInput = {
      model: 'gemini-3.1-pro',
      messages: [{ role: 'user', content: input.prompt }],
      maxTokens: input.maxTokens ?? 1800,
      temperature: 0,
      signal: input.signal,
      deadlineAt: input.deadlineAt,
    };
    return this.completeWithRetry('gemini-3.1-pro', chatInput, {
      model: 'gemini-3.1-pro',
      messages: [
        ...(input.systemPrompt
          ? [{ role: 'system', content: input.systemPrompt }]
          : []),
        {
          role: 'user',
          content: [
            { type: 'text', text: input.prompt },
            { type: 'image_url', image_url: { url: imageUrl.toString() } },
          ],
        },
      ],
      stream: false,
      max_tokens: chatInput.maxTokens,
      temperature: 0,
    });
  }

  private async completeWithRetry(
    model: KieChatModel,
    input: ChatCompletionInput,
    bodyOverride?: Record<string, unknown>
  ): Promise<ChatCompletionResult> {
    const deadlineAt = input.deadlineAt ?? Date.now() + this.overallTimeoutMs;
    let lastError: ChatProviderError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await this.attempt(model, input, deadlineAt, bodyOverride);
      } catch (error) {
        lastError =
          error instanceof ChatProviderError
            ? error
            : providerError(String(error), model, 503, error);
        if (!lastError.retryable || attempt === this.maxAttempts)
          throw lastError;
        const delay = Math.min(250 * 2 ** (attempt - 1), 1_000);
        if (Date.now() + delay >= deadlineAt) throw lastError;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError!;
  }

  async stream(
    input: ChatCompletionInput,
    onDelta: (delta: string) => void
  ): Promise<ChatCompletionResult> {
    if (!isKieChatModel(input.model)) {
      throw new ChatProviderError('Kie chat model is not allowlisted', {
        code: 'model_unavailable',
        retryable: false,
        provider: this.name,
        model: input.model,
      });
    }
    const deadlineAt = input.deadlineAt ?? Date.now() + this.overallTimeoutMs;
    let lastError: ChatProviderError | undefined;
    let emitted = false;
    const emit = (delta: string) => {
      emitted = true;
      onDelta(delta);
    };
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        return await this.streamAttempt(input.model, input, deadlineAt, emit);
      } catch (error) {
        lastError =
          error instanceof ChatProviderError
            ? error
            : providerError(String(error), input.model, 503, error);
        if (emitted && !lastError.partialOutput) {
          lastError = new ChatProviderError('Kie stream was interrupted', {
            code: 'stream_interrupted',
            retryable: false,
            status: lastError.status,
            provider: this.name,
            model: input.model,
            partialOutput: true,
            cause: lastError,
          });
        }
        if (!lastError.retryable || emitted || attempt === this.maxAttempts) {
          throw lastError;
        }
        const delay = Math.min(250 * 2 ** (attempt - 1), 1_000);
        if (Date.now() + delay >= deadlineAt) throw lastError;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError!;
  }
}
