/**
 * Free text → (template, parameters). The model only chooses among verified
 * templates and fills their parameters; the parameters then pass the same
 * gate as a hand-filled form (`resolveTemplateParams`). A request no template
 * answers comes back as no match, and the creator offers the beta generator.
 */

import type { ChatProvider } from '@/core/ai/chat';
import { parseStructuredJsonObject } from '@/lib/structured-json';
import {
  getVideoTemplate,
  resolveTemplateParams,
  VIDEO_TEMPLATES,
  type TemplateParam,
  type TemplateParamValues,
} from '@/lib/video-templates';

export interface TemplateMatch {
  templateId: string;
  params: TemplateParamValues;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface TemplateMatchResult {
  match: TemplateMatch | null;
  /** Other templates worth offering (ids), best first. */
  alternatives: string[];
  /** Why nothing matched, in the user's language. */
  reason?: string;
}

function describeParam(param: TemplateParam): string {
  switch (param.type) {
    case 'expression':
      return `${param.key}: expression in ${param.variables.join(', ')} (default "${param.default}")`;
    case 'number':
      return `${param.key}: ${param.integer ? 'integer' : 'number'} ${param.min}..${param.max} (default ${param.default})`;
    case 'choice':
      return `${param.key}: one of ${param.options.map((option) => option.value).join(' | ')} (default ${param.default})`;
  }
}

export function templateCatalogPrompt(): string {
  return VIDEO_TEMPLATES.map((template) =>
    [
      `## ${template.id}`,
      `${template.title.en}. ${template.summary.en}`,
      `Use for: ${template.matchHint}`,
      `Parameters: ${template.params.map(describeParam).join('; ')}`,
      `Examples: ${template.examples
        .map(
          (example) =>
            `"${example.prompt}" -> ${JSON.stringify(example.params)}`
        )
        .join(' | ')}`,
    ].join('\n')
  ).join('\n\n');
}

const SYSTEM = `You route requests for math explainer videos to CurvG's verified video templates.

Pick the ONE template whose film answers the core of the request, and fill its parameters so the film shows exactly what was asked (the function, the point, the interval, the matrix...). If no template answers the core of the request, return templateId null: do not stretch a template to a different topic (a request about the chain rule is not "derivative-tangent"; a geometry proof is not any template).

Expression syntax: explicit * for every product (3*x^2, 2*sin(x)), ^ for powers, functions sin cos tan asin acos atan sinh cosh tanh exp ln log10 log2 sqrt cbrt abs, constants pi and e, and only the variable names the parameter lists. Numbers must stay inside the listed ranges; use decimals for π multiples (3.141593, 6.283185).

Reply with one JSON object and nothing else:
{"templateId": string | null, "params": {...}, "confidence": "high" | "medium" | "low", "reason": string, "alternatives": [templateId, ...]}

reason: one short sentence in the user's language saying what the video will show (or why nothing fits). alternatives: up to 3 other template ids a user with this request might want, best first, or [].`;

interface RawMatch {
  templateId?: unknown;
  params?: unknown;
  confidence?: unknown;
  reason?: unknown;
  alternatives?: unknown;
}

function knownIds(value: unknown, exclude?: string): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (id): id is string =>
        typeof id === 'string' && !!getVideoTemplate(id) && id !== exclude
    )
    .slice(0, 3);
}

export async function matchVideoTemplate(params: {
  provider: ChatProvider;
  model: string;
  prompt: string;
  locale: string;
  signal?: AbortSignal;
}): Promise<TemplateMatchResult> {
  const messages = [
    {
      role: 'system' as const,
      content: `${SYSTEM}\n\n# Templates\n\n${templateCatalogPrompt()}`,
    },
    {
      role: 'user' as const,
      content: `User language: ${params.locale.startsWith('zh') ? 'Chinese' : 'English'}\nRequest: ${params.prompt.slice(0, 2000)}`,
    },
  ];
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await params.provider.complete({
      model: params.model,
      messages: lastError
        ? [
            ...messages,
            {
              role: 'user' as const,
              content: `Your parameters were rejected: ${lastError}. Return the corrected JSON object.`,
            },
          ]
        : messages,
      maxTokens: 2_000,
      reasoningEffort: 'low',
      deadlineAt: Date.now() + 45_000,
      signal: params.signal,
    });
    let raw: RawMatch;
    try {
      raw = parseStructuredJsonObject(result.content) as RawMatch;
    } catch {
      lastError = 'the reply was not one JSON object';
      continue;
    }
    const reason =
      typeof raw.reason === 'string' ? raw.reason.slice(0, 300) : '';
    if (
      raw.templateId === null ||
      raw.templateId === undefined ||
      raw.templateId === ''
    ) {
      return { match: null, alternatives: knownIds(raw.alternatives), reason };
    }
    const template =
      typeof raw.templateId === 'string'
        ? getVideoTemplate(raw.templateId)
        : undefined;
    if (!template) {
      lastError = `unknown templateId ${JSON.stringify(raw.templateId)}`;
      continue;
    }
    try {
      const values = resolveTemplateParams(
        template,
        raw.params &&
          typeof raw.params === 'object' &&
          !Array.isArray(raw.params)
          ? (raw.params as Record<string, unknown>)
          : {}
      );
      const confidence =
        raw.confidence === 'high' || raw.confidence === 'low'
          ? raw.confidence
          : 'medium';
      return {
        match: { templateId: template.id, params: values, confidence, reason },
        alternatives: knownIds(raw.alternatives, template.id),
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`Template matching failed: ${lastError}`);
}
