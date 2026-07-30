import {
  ChatProviderError,
  retryableStatus,
  type ChatCompletionInput,
  type ChatCompletionResult,
  type ChatFailureCode,
  type ChatProvider,
  type ChatTurn,
} from './chat';

export const KUAIPAO_GPT_56_MODEL = 'gpt-5.6-sol';

const KUAIPAO_CHAT_MODELS = new Set([KUAIPAO_GPT_56_MODEL]);

export interface KuaipaoChatProviderConfig {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  maxAttempts?: number;
  requestTimeoutMs?: number;
  overallTimeoutMs?: number;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value || 'https://kuaipao.pro/v1');
  if (
    url.protocol !== 'https:' ||
    !['kuaipao.pro', 'kuaipao.ai'].includes(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error('Kuaipao base URL must use an official HTTPS endpoint');
  }
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (!['/', '/v1', '/v1/responses'].includes(path)) {
    throw new Error('Kuaipao base URL path is not supported');
  }
  return `${url.origin}/v1`;
}

export function kuaipaoResponsesUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/responses`;
}

function responsesInput(messages: ChatTurn[]) {
  return messages.map((message) => ({
    role: message.role === 'system' ? 'developer' : message.role,
    content: [{ type: 'input_text', text: message.content }],
  }));
}

function textParts(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!Array.isArray(value)) return '';
  return value
    .flatMap((part) => {
      if (!part || typeof part !== 'object') return [];
      const record = part as Record<string, unknown>;
      if (typeof record.text === 'string') return [record.text];
      if (typeof record.output_text === 'string') return [record.output_text];
      return [];
    })
    .join('');
}

function responseRecord(
  data: Record<string, unknown>
): Record<string, unknown> {
  const nested = data.response;
  if (nested && typeof nested === 'object') {
    return nested as Record<string, unknown>;
  }
  const wrapped = data.data;
  if (
    wrapped &&
    typeof wrapped === 'object' &&
    !Array.isArray(wrapped) &&
    ('output' in wrapped || 'output_text' in wrapped || 'choices' in wrapped)
  ) {
    return wrapped as Record<string, unknown>;
  }
  return data;
}

/**
 * Accept the documented Responses shape plus Chat Completions-shaped gateway
 * responses. Kuaipao's Responses documentation currently shows both shapes,
 * so treating either as valid is intentional compatibility, not model
 * discovery or a silent protocol switch.
 */
export function parseKuaipaoResponseText(
  data: Record<string, unknown>
): string {
  const response = responseRecord(data);
  if (typeof response.output_text === 'string') {
    return response.output_text.trim();
  }
  const output = Array.isArray(response.output) ? response.output : [];
  const outputText = output
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      return [textParts((item as Record<string, unknown>).content)];
    })
    .join('')
    .trim();
  if (outputText) return outputText;

  const choices = Array.isArray(response.choices) ? response.choices : [];
  const first = choices[0];
  if (!first || typeof first !== 'object') return '';
  const message = (first as Record<string, unknown>).message;
  if (!message || typeof message !== 'object') return '';
  return textParts((message as Record<string, unknown>).content).trim();
}

function errorMessage(data: Record<string, unknown>, fallback: string): string {
  const error = data.error;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    for (const key of ['message', 'detail', 'msg']) {
      if (typeof record[key] === 'string') return record[key];
    }
  }
  for (const key of ['message', 'detail', 'msg']) {
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
): { code: ChatFailureCode; retryable: boolean; retrySameModel?: boolean } {
  const normalized = message.toLowerCase();
  if (
    (status === 400 || status === 404 || status === 503) &&
    /(?:model|模型).*(?:not found|does not exist|unavailable|不存在|不可用)|no available channel|invalid model|model[_ -]?not[_ -]?found/.test(
      normalized
    )
  ) {
    return {
      code: 'model_unavailable',
      retryable: false,
      retrySameModel: false,
    };
  }
  if (/quota|insufficient.+(balance|credit)|余额|额度不足/.test(normalized)) {
    return { code: 'upstream_quota', retryable: false };
  }
  if (status === 401 || status === 403 || /invalid api key/.test(normalized)) {
    return { code: 'upstream_auth', retryable: false };
  }
  if (
    status === 429 ||
    /saturat|capacity|too many requests|rate.?limit|负载|渠道繁忙/.test(
      normalized
    )
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

function providerError(params: {
  message: string;
  model: string;
  status?: number;
  requestId?: string;
  partialOutput?: boolean;
  cause?: unknown;
}) {
  return new ChatProviderError(params.message, {
    ...classifyFailure(params.status, params.message),
    status: params.status,
    requestId: params.requestId,
    provider: 'kuaipao',
    model: params.model,
    partialOutput: params.partialOutput,
    cause: params.cause,
  });
}

function requestId(response: Response, data?: Record<string, unknown>) {
  const bodyId = data?.request_id ?? data?.requestId ?? data?.id;
  return (
    response.headers.get('x-request-id') ||
    response.headers.get('request-id') ||
    response.headers.get('cf-ray') ||
    (typeof bodyId === 'string' ? bodyId : undefined)
  );
}

function requestBody(input: ChatCompletionInput, stream: boolean) {
  return {
    model: input.model,
    input: responsesInput(input.messages),
    stream,
    ...(input.maxTokens === undefined
      ? {}
      : { max_output_tokens: input.maxTokens }),
    ...(input.reasoningEffort
      ? { reasoning: { effort: input.reasoningEffort } }
      : {}),
  };
}

function requestSignal(input: ChatCompletionInput, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
}

function normalizedError(
  error: unknown,
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
        provider: 'kuaipao',
        model,
        partialOutput: true,
        cause: error,
      });
    }
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  const timedOut =
    (error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')) ||
    /timed?\s*out|timeout/i.test(message);
  return new ChatProviderError(
    timedOut
      ? 'Kuaipao request timed out'
      : message || 'Kuaipao request failed',
    {
      code: partialOutput
        ? 'stream_interrupted'
        : timedOut
          ? 'upstream_timeout'
          : 'upstream_unavailable',
      retryable: !partialOutput,
      provider: 'kuaipao',
      model,
      partialOutput,
      cause: error,
    }
  );
}

/** OpenAI Responses adapter locked to the one reviewed Kuaipao model. */
export class KuaipaoChatProvider implements ChatProvider {
  readonly name = 'kuaipao';
  private readonly apiKey: string;
  private readonly url: string;
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly maxAttempts: number;
  private readonly requestTimeoutMs: number;
  private readonly overallTimeoutMs: number;

  constructor(config: KuaipaoChatProviderConfig) {
    if (!config.apiKey.trim()) throw new Error('Kuaipao API key is required');
    this.apiKey = config.apiKey.trim();
    this.url = kuaipaoResponsesUrl(config.baseUrl || 'https://kuaipao.pro/v1');
    this.fetchImpl = (config.fetch || globalThis.fetch).bind(globalThis);
    this.maxAttempts = Math.max(1, Math.min(config.maxAttempts ?? 2, 3));
    this.requestTimeoutMs = Math.max(config.requestTimeoutMs ?? 240_000, 1_000);
    this.overallTimeoutMs = Math.max(config.overallTimeoutMs ?? 300_000, 1_000);
  }

  private assertModel(model: string) {
    if (!KUAIPAO_CHAT_MODELS.has(model)) {
      throw new ChatProviderError('Kuaipao chat model is not allowlisted', {
        code: 'model_unavailable',
        retryable: false,
        retrySameModel: false,
        provider: this.name,
        model,
      });
    }
  }

  private deadline(input: ChatCompletionInput) {
    return input.deadlineAt ?? Date.now() + this.overallTimeoutMs;
  }

  private timeout(deadlineAt: number, model: string) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) {
      throw providerError({
        message: 'Kuaipao request deadline exceeded',
        model,
        status: 408,
      });
    }
    return Math.max(1, Math.min(this.requestTimeoutMs, remaining));
  }

  private async wait(attempt: number, deadlineAt: number) {
    const delay = Math.min(300 * 2 ** (attempt - 1), 1_200);
    if (Date.now() + delay >= deadlineAt) return;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    this.assertModel(input.model);
    const deadlineAt = this.deadline(input);
    let lastError: ChatProviderError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await this.fetchImpl(this.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody(input, false)),
          signal: requestSignal(input, this.timeout(deadlineAt, input.model)),
        });
        const data = (await response.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const status = response.ok ? businessStatus(data) : response.status;
        if (status !== undefined) {
          throw providerError({
            message: errorMessage(data, `Kuaipao request failed (${status})`),
            model: input.model,
            status,
            requestId: requestId(response, data),
          });
        }
        const record = responseRecord(data);
        if (record.status === 'incomplete') {
          throw new ChatProviderError(
            'Kuaipao response stopped before final output completed',
            {
              code: 'invalid_response',
              retryable: false,
              requestId: requestId(response, data),
              provider: this.name,
              model: input.model,
            }
          );
        }
        const content = parseKuaipaoResponseText(data);
        if (!content) {
          throw new ChatProviderError('Kuaipao returned an empty response', {
            code: 'empty_response',
            retryable: true,
            requestId: requestId(response, data),
            provider: this.name,
            model: input.model,
          });
        }
        return {
          content,
          model: typeof record.model === 'string' ? record.model : input.model,
          provider: this.name,
        };
      } catch (error) {
        if (input.signal?.aborted) {
          throw new ChatProviderError('Kuaipao request was canceled', {
            code: 'stream_interrupted',
            retryable: false,
            provider: this.name,
            model: input.model,
            cause: error,
          });
        }
        lastError = normalizedError(error, input.model);
        if (
          !lastError.retryable ||
          !lastError.retrySameModel ||
          attempt === this.maxAttempts
        ) {
          throw lastError;
        }
        await this.wait(attempt, deadlineAt);
      }
    }
    throw lastError!;
  }

  async stream(
    input: ChatCompletionInput,
    onDelta: (delta: string) => void
  ): Promise<ChatCompletionResult> {
    this.assertModel(input.model);
    const deadlineAt = this.deadline(input);
    let lastError: ChatProviderError | undefined;
    let emitted = false;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      let response: Response | undefined;
      try {
        response = await this.fetchImpl(this.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody(input, true)),
          signal: requestSignal(input, this.timeout(deadlineAt, input.model)),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as Record<
            string,
            unknown
          >;
          throw providerError({
            message: errorMessage(
              data,
              `Kuaipao request failed (${response.status})`
            ),
            model: input.model,
            status: response.status,
            requestId: requestId(response, data),
          });
        }
        if (!response.body) {
          throw new ChatProviderError('Kuaipao returned an empty stream', {
            code: 'empty_response',
            retryable: true,
            requestId: requestId(response),
            provider: this.name,
            model: input.model,
          });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let content = '';
        let finalContent = '';
        let responseModel = input.model;

        const consumeData = (data: Record<string, unknown>) => {
          const record = responseRecord(data);
          const type = typeof data.type === 'string' ? data.type : '';
          const status = businessStatus(data);
          if (
            status !== undefined ||
            data.error ||
            record.error ||
            type === 'error' ||
            type === 'response.failed'
          ) {
            throw providerError({
              message: errorMessage(
                record.error ? record : data,
                'Kuaipao stream failed'
              ),
              model: input.model,
              status,
              requestId: requestId(response!, data),
              partialOutput: emitted,
            });
          }
          if (
            type === 'response.incomplete' ||
            record.status === 'incomplete'
          ) {
            throw new ChatProviderError(
              'Kuaipao response stopped before final output completed',
              {
                code: emitted ? 'stream_interrupted' : 'invalid_response',
                retryable: !emitted,
                requestId: requestId(response!, data),
                provider: this.name,
                model: input.model,
                partialOutput: emitted,
              }
            );
          }
          if (typeof record.model === 'string') responseModel = record.model;
          let delta =
            type === 'response.output_text.delta' &&
            typeof data.delta === 'string'
              ? data.delta
              : '';
          if (!delta) {
            const choices = Array.isArray(data.choices) ? data.choices : [];
            const first = choices[0];
            if (first && typeof first === 'object') {
              const choiceDelta = (first as Record<string, unknown>).delta;
              if (choiceDelta && typeof choiceDelta === 'object') {
                delta = textParts(
                  (choiceDelta as Record<string, unknown>).content
                );
              }
            }
          }
          if (delta) {
            emitted = true;
            content += delta;
            onDelta(delta);
          }
          const parsed = parseKuaipaoResponseText(data);
          if (parsed) finalContent = parsed;
        };

        const consumeLine = (line: string) => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('event:')) return;
          const payload = trimmed.startsWith('data:')
            ? trimmed.slice(5).trim()
            : trimmed;
          if (!payload || payload === '[DONE]') return;
          try {
            consumeData(JSON.parse(payload) as Record<string, unknown>);
          } catch (error) {
            if (error instanceof ChatProviderError) throw error;
            // Ignore non-JSON SSE metadata, but never swallow provider errors.
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

        if (!content.trim() && finalContent) {
          content = finalContent;
          emitted = true;
          onDelta(finalContent);
        }
        if (!content.trim()) {
          throw new ChatProviderError('Kuaipao returned an empty response', {
            code: 'empty_response',
            retryable: true,
            requestId: requestId(response),
            provider: this.name,
            model: input.model,
          });
        }
        return {
          content: content.trim(),
          model: responseModel,
          provider: this.name,
        };
      } catch (error) {
        if (input.signal?.aborted) {
          throw new ChatProviderError('Kuaipao request was canceled', {
            code: 'stream_interrupted',
            retryable: false,
            provider: this.name,
            model: input.model,
            partialOutput: emitted,
            cause: error,
          });
        }
        lastError = normalizedError(error, input.model, emitted);
        if (
          !lastError.retryable ||
          !lastError.retrySameModel ||
          emitted ||
          attempt === this.maxAttempts
        ) {
          throw lastError;
        }
        await this.wait(attempt, deadlineAt);
      }
    }
    throw lastError!;
  }
}
