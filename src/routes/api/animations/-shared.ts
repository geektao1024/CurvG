import {
  AnthropicChatProvider,
  OpenAICompatibleChatProvider,
  type ChatProvider,
} from '@/core/ai/chat';
import { HttpAnimationRenderer } from '@/core/animation-renderer';
import type { ConfigMap } from '@/modules/config/service';
import type {
  AnimationModelCatalog,
  AnimationModelChoice,
  AnimationModelOption,
  AnimationModelProvider,
  AnimationSubject,
} from '@/lib/animation';

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

function yunwuProvider(configs: ConfigMap, requestedModel?: string) {
  const model = requestedModel || configs.yunwu_model;
  if (!configs.yunwu_api_key || !model) return null;
  return {
    provider: new OpenAICompatibleChatProvider({
      apiKey: configs.yunwu_api_key,
      baseUrl: configs.yunwu_base_url || 'https://yunwu.ai/v1',
      name: 'yunwu',
    }),
    model,
  };
}

interface ProviderResolution {
  provider: ChatProvider;
  model: string;
}

interface ModelCacheEntry {
  expiresAt: number;
  models: DiscoveredModel[];
}

interface DiscoveredModel {
  id: string;
  description?: string;
}

const modelCache = new Map<string, ModelCacheEntry>();
const MODEL_CACHE_TTL = 5 * 60_000;
const MODEL_ID_PATTERN = /^[A-Za-z0-9._:/-]{1,180}$/;

function configuredDefault(
  configs: ConfigMap
): (ProviderResolution & { choice: AnimationModelProvider }) | null {
  const openai = openAIProvider(configs);
  if (openai) return { choice: 'openai', ...openai };
  const anthropic = anthropicProvider(configs);
  if (anthropic) return { choice: 'anthropic', ...anthropic };
  const yunwu = yunwuProvider(configs);
  if (yunwu) return { choice: 'yunwu', ...yunwu };
  return null;
}

function discoverableModels(
  values: unknown[],
  defaultModel?: string
): DiscoveredModel[] {
  const models = new Map<string, DiscoveredModel>();
  for (const value of values) {
    if (!value || typeof value !== 'object') continue;
    const record = value as Record<string, unknown>;
    const id = record.id;
    if (typeof id !== 'string' || !MODEL_ID_PATTERN.test(id)) continue;
    const endpointTypes = Array.isArray(record.supported_endpoint_types)
      ? record.supported_endpoint_types
      : [];
    if (!endpointTypes.includes('openai')) continue;
    if (typeof record.model_type === 'string' && record.model_type !== '文本') {
      continue;
    }
    const tags =
      typeof record.tags === 'string'
        ? record.tags
            .split(/[,，]/)
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [];
    if (tags.includes('弃用')) continue;
    if (tags.length > 0 && !tags.includes('对话')) continue;
    const description =
      typeof record.description === 'string'
        ? record.description.trim().slice(0, 240)
        : undefined;
    models.set(id, { id, description: description || undefined });
  }
  if (defaultModel && MODEL_ID_PATTERN.test(defaultModel)) {
    models.set(defaultModel, models.get(defaultModel) || { id: defaultModel });
  }
  return [...models.values()]
    .sort((left, right) => {
      if (left.id === defaultModel) return -1;
      if (right.id === defaultModel) return 1;
      return left.id.localeCompare(right.id);
    })
    .slice(0, 250);
}

async function discoverYunwuModels(
  configs: ConfigMap
): Promise<DiscoveredModel[]> {
  if (!configs.yunwu_api_key) return [];
  const baseUrl = (configs.yunwu_base_url || 'https://yunwu.ai/v1').replace(
    /\/+$/,
    ''
  );
  const cacheKey = `${baseUrl}:${configs.yunwu_api_key.slice(-8)}`;
  const cached = modelCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.models;
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${configs.yunwu_api_key}` },
    signal: AbortSignal.timeout(20_000),
  });
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new Error(`Yunwu model discovery failed (${response.status})`);
  }
  const models = discoverableModels(
    Array.isArray(data.data) ? data.data : [],
    configs.yunwu_model
  );
  modelCache.set(cacheKey, {
    models,
    expiresAt: Date.now() + MODEL_CACHE_TTL,
  });
  return models;
}

export async function listAnimationModels(
  configs: ConfigMap
): Promise<AnimationModelCatalog> {
  const options: AnimationModelOption[] = [];
  if (configs.openai_api_key && configs.openai_model) {
    options.push({
      provider: 'openai',
      model: configs.openai_model,
      isDefault: true,
    });
  }
  if (configs.yunwu_api_key) {
    let models: DiscoveredModel[] = [];
    try {
      models = await discoverYunwuModels(configs);
    } catch {
      models = configs.yunwu_model ? [{ id: configs.yunwu_model }] : [];
    }
    for (const model of models) {
      options.push({
        provider: 'yunwu',
        model: model.id,
        isDefault: model.id === configs.yunwu_model,
        description: model.description,
      });
    }
  }
  if (configs.anthropic_api_key && configs.anthropic_model) {
    options.push({
      provider: 'anthropic',
      model: configs.anthropic_model,
      isDefault: true,
    });
  }
  const defaultProvider = configuredDefault(configs);
  return {
    options,
    defaultProvider: defaultProvider?.choice,
    defaultModel: defaultProvider?.model,
  };
}

export async function resolveChatProvider(
  configs: ConfigMap,
  choice: AnimationModelChoice,
  requestedModel?: string
): Promise<{ provider: ChatProvider; model: string }> {
  const openai = openAIProvider(configs);
  const yunwu = yunwuProvider(
    configs,
    choice === 'yunwu' ? requestedModel : undefined
  );
  const anthropic = anthropicProvider(configs);
  if (requestedModel) {
    if (choice === 'auto' || !MODEL_ID_PATTERN.test(requestedModel)) {
      throw new Error('Invalid animation model');
    }
    const catalog = await listAnimationModels(configs);
    const allowed = catalog.options.some(
      (option) => option.provider === choice && option.model === requestedModel
    );
    if (!allowed) throw new Error('Animation model is not available');
  }
  if (choice === 'openai') {
    if (!openai) throw new Error('OpenAI provider or model is not configured');
    return { ...openai, model: requestedModel || openai.model };
  }
  if (choice === 'anthropic') {
    if (!anthropic) {
      throw new Error('Anthropic provider or model is not configured');
    }
    return { ...anthropic, model: requestedModel || anthropic.model };
  }
  if (choice === 'yunwu') {
    if (!yunwu) throw new Error('Yunwu provider or model is not configured');
    return { ...yunwu, model: requestedModel || yunwu.model };
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
