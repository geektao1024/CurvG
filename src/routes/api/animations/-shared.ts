import {
  AnthropicChatProvider,
  OpenAICompatibleChatProvider,
  type ChatProvider,
} from '@/core/ai/chat';
import { HttpAnimationRenderer } from '@/core/animation-renderer';
import type { ConfigMap } from '@/modules/config/service';
import type { AnimationModelChoice, AnimationSubject } from '@/lib/animation';

const subjects = new Set<AnimationSubject>([
  'general',
  'math',
  'physics',
  'computer-science',
  'biology',
  'chemistry',
  'economics',
]);

const modelChoices = new Set<AnimationModelChoice>([
  'auto',
  'openai',
  'yunwu',
  'anthropic',
]);

export function parseSubject(value: unknown): AnimationSubject {
  if (typeof value === 'string' && subjects.has(value as AnimationSubject)) {
    return value as AnimationSubject;
  }
  return 'general';
}

export function parseModelChoice(value: unknown): AnimationModelChoice {
  if (
    typeof value === 'string' &&
    modelChoices.has(value as AnimationModelChoice)
  ) {
    return value as AnimationModelChoice;
  }
  return 'auto';
}

function openAIProvider(configs: ConfigMap) {
  if (!configs.openai_api_key || !configs.openai_model) return null;
  return {
    provider: new OpenAICompatibleChatProvider({
      apiKey: configs.openai_api_key,
      baseUrl: configs.openai_base_url,
    }),
    model: configs.openai_model,
  };
}

function anthropicProvider(configs: ConfigMap) {
  if (!configs.anthropic_api_key || !configs.anthropic_model) return null;
  return {
    provider: new AnthropicChatProvider({
      apiKey: configs.anthropic_api_key,
      baseUrl: configs.anthropic_base_url,
    }),
    model: configs.anthropic_model,
  };
}

function yunwuProvider(configs: ConfigMap) {
  if (!configs.yunwu_api_key || !configs.yunwu_model) return null;
  return {
    provider: new OpenAICompatibleChatProvider({
      apiKey: configs.yunwu_api_key,
      baseUrl: configs.yunwu_base_url || 'https://yunwu.ai/v1',
      name: 'yunwu',
    }),
    model: configs.yunwu_model,
  };
}

export function resolveChatProvider(
  configs: ConfigMap,
  choice: AnimationModelChoice
): { provider: ChatProvider; model: string } {
  const openai = openAIProvider(configs);
  const yunwu = yunwuProvider(configs);
  const anthropic = anthropicProvider(configs);
  if (choice === 'openai') {
    if (!openai) throw new Error('OpenAI provider or model is not configured');
    return openai;
  }
  if (choice === 'anthropic') {
    if (!anthropic) {
      throw new Error('Anthropic provider or model is not configured');
    }
    return anthropic;
  }
  if (choice === 'yunwu') {
    if (!yunwu) throw new Error('Yunwu provider or model is not configured');
    return yunwu;
  }
  if (openai) return openai;
  if (anthropic) return anthropic;
  if (yunwu) return yunwu;
  throw new Error('No animation chat model is configured');
}

export function resolveRenderer(configs: ConfigMap) {
  const url = configs.animation_renderer_url?.trim();
  const token = configs.animation_renderer_token?.trim();
  if (!url && !token) return undefined;
  if (!url || !token) {
    throw new Error('Animation renderer configuration is incomplete');
  }
  return new HttpAnimationRenderer({ baseUrl: url, token });
}

export function callbackUrl(request: Request, appUrl: string, id: string) {
  const origin = appUrl?.trim()
    ? new URL(appUrl).origin
    : new URL(request.url).origin;
  return `${origin}/api/animations/${encodeURIComponent(id)}/render-callback`;
}

export function hasBearerToken(request: Request, expected: string): boolean {
  const value = request.headers.get('authorization') || '';
  const actual = value.startsWith('Bearer ') ? value.slice(7) : '';
  const left = new TextEncoder().encode(actual);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] || 0) ^ (right[index] || 0);
  }
  return difference === 0 && right.length > 0;
}
