export interface ChatTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionInput {
  model: string;
  messages: ChatTurn[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  provider: string;
}

export interface ChatProvider {
  readonly name: string;
  complete(input: ChatCompletionInput): Promise<ChatCompletionResult>;
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

export class OpenAICompatibleChatProvider implements ChatProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: { apiKey: string; baseUrl?: string; name?: string }) {
    if (!config.apiKey.trim()) throw new Error('OpenAI API key is required');
    this.name = config.name?.trim() || 'openai';
    this.apiKey = config.apiKey.trim();
    this.baseUrl = normalizeBaseUrl(
      config.baseUrl || '',
      'https://api.openai.com/v1'
    );
  }

  async complete(input: ChatCompletionInput): Promise<ChatCompletionResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
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
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new Error(
        errorMessage(data, `OpenAI request failed (${response.status})`)
      );
    }
    const choices = Array.isArray(data.choices) ? data.choices : [];
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    const content = typeof message?.content === 'string' ? message.content : '';
    if (!content.trim()) throw new Error('OpenAI returned an empty response');
    return {
      content: content.trim(),
      model: typeof data.model === 'string' ? data.model : input.model,
      provider: this.name,
    };
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
