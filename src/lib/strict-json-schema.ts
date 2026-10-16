import { z } from 'zod';

/**
 * Strict structured output (OpenAI-style `text.format` json_schema with
 * `strict: true`) accepts a JSON Schema subset: every object lists all of its
 * properties as required and forbids extra properties. KIE's GPT-6 Luna route
 * enforces minItems/maxItems, minimum/maximum and pattern (probed 2026-10-15:
 * a minItems 3 array came back with 5 items when 1 was asked for), so those
 * stay; string lengths, defaults and tuples do not. zod still owns the real
 * contract and re-validates everything.
 *
 * Optional fields become `value | null`, so the model can omit them; call
 * `stripNullFields` on the parsed output before zod validation. The planning
 * schemas never use null as a meaningful value, which keeps that safe.
 */

type JsonSchema = Record<string, unknown>;

const DROPPED_KEYWORDS = new Set([
  '$schema',
  'default',
  'format',
  'minLength',
  'maxLength',
  'uniqueItems',
  'propertyNames',
]);

function nullable(schema: JsonSchema): JsonSchema {
  if (Array.isArray(schema.anyOf)) {
    return (schema.anyOf as JsonSchema[]).some((item) => item.type === 'null')
      ? schema
      : {
          ...schema,
          anyOf: [...(schema.anyOf as JsonSchema[]), { type: 'null' }],
        };
  }
  if (Array.isArray(schema.enum)) {
    return { anyOf: [schema, { type: 'null' }] };
  }
  if (typeof schema.type === 'string') {
    return { ...schema, type: [schema.type, 'null'] };
  }
  return { anyOf: [schema, { type: 'null' }] };
}

function strictify(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictify);
  if (!node || typeof node !== 'object') return node;
  const source = node as JsonSchema;
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(source)) {
    if (DROPPED_KEYWORDS.has(key)) continue;
    if (key === 'prefixItems') continue;
    if (key === 'oneOf') {
      result.anyOf = strictify(value);
      continue;
    }
    result[key] = strictify(value);
  }

  // Tuples (coordinates) become fixed-length homogeneous arrays.
  if (Array.isArray(source.prefixItems)) {
    const items = (source.prefixItems as JsonSchema[]).map(
      (item) => strictify(item) as JsonSchema
    );
    const first = JSON.stringify(items[0]);
    result.items = items.every((item) => JSON.stringify(item) === first)
      ? items[0]
      : { anyOf: items };
    result.minItems = items.length;
    result.maxItems = items.length;
  }

  if (result.type === 'object' || result.properties) {
    const properties = (result.properties || {}) as Record<string, JsonSchema>;
    const required = new Set(
      Array.isArray(source.required) ? (source.required as string[]) : []
    );
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([name, schema]) => [
        name,
        required.has(name) ? schema : nullable(schema),
      ])
    );
    result.required = Object.keys(properties);
    result.additionalProperties = false;
  }
  return result;
}

export function toStrictJsonSchema(schema: z.ZodType): JsonSchema {
  return strictify(
    z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  ) as JsonSchema;
}

/** Remove `null` object fields (the strict-mode encoding of "omitted"). */
export function stripNullFields<T = unknown>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripNullFields(item)) as T;
  }
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, field]) => field !== null)
      .map(([key, field]) => [key, stripNullFields(field)])
  ) as T;
}

function nonNullable(schema: JsonSchema): JsonSchema {
  if (Array.isArray(schema.type)) {
    const types = (schema.type as string[]).filter((type) => type !== 'null');
    return { ...schema, type: types.length === 1 ? types[0] : types };
  }
  if (Array.isArray(schema.anyOf)) {
    const options = (schema.anyOf as JsonSchema[]).filter(
      (option) => option.type !== 'null'
    );
    return options.length === 1 ? options[0]! : { ...schema, anyOf: options };
  }
  return schema;
}

export interface DiscriminatedVariant {
  /**
   * The only fields besides the shared ones this variant carries. Strict
   * mode makes the model write every listed field, so a line that also lists
   * expr/domain/values/parts spends tokens on a row of nulls; listing only
   * what the variant uses roughly halves scene output.
   */
  fields?: readonly string[];
  /** Fields this variant must fill (made non-nullable). */
  required?: readonly string[];
  /** Fields narrowed to these values for this variant. */
  allowed?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Turn one strict object schema into an anyOf of variants keyed by an enum
 * field (e.g. `kind`), so per-variant rules that zod expresses in a
 * superRefine (a line needs start and end) are enforced at generation time.
 * Discriminator values without a rule share one catch-all variant.
 */
export function discriminateStrictObject(
  schema: JsonSchema,
  field: string,
  variants: Readonly<Record<string, DiscriminatedVariant>>,
  shared?: readonly string[]
): JsonSchema {
  const properties = schema.properties as Record<string, JsonSchema>;
  const discriminator = nonNullable(properties[field]!);
  const values = (discriminator.enum as string[]) || [];
  const variant = (keys: string[], rule: DiscriminatedVariant): JsonSchema => {
    const kept = Object.entries(properties).filter(
      ([name]) =>
        name === field ||
        !shared ||
        !rule.fields ||
        shared.includes(name) ||
        rule.fields.includes(name) ||
        rule.required?.includes(name) ||
        Boolean(rule.allowed?.[name])
    );
    return {
      ...schema,
      properties: Object.fromEntries(
        kept.map(([name, property]) => {
          if (name === field) return [name, { type: 'string', enum: keys }];
          const allowed = rule.allowed?.[name];
          if (allowed) return [name, { type: 'string', enum: [...allowed] }];
          return [
            name,
            rule.required?.includes(name) ? nonNullable(property) : property,
          ];
        })
      ),
      required: kept.map(([name]) => name),
    };
  };
  const ruled = values.filter((value) => variants[value]);
  const rest = values.filter((value) => !variants[value]);
  return {
    anyOf: [
      ...ruled.map((value) => variant([value], variants[value]!)),
      ...(rest.length ? [variant(rest, {})] : []),
    ],
  };
}

const ANTHROPIC_UNSUPPORTED = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'maxItems',
  // Every regex grows the compiled grammar; the plan schema hit Anthropic's
  // "compiled grammar is too large" with them.
  'pattern',
]);

function isNullable(schema: JsonSchema): boolean {
  return (
    (Array.isArray(schema.type) &&
      (schema.type as string[]).includes('null')) ||
    (Array.isArray(schema.anyOf) &&
      (schema.anyOf as JsonSchema[]).some((option) => option.type === 'null'))
  );
}

/**
 * Anthropic structured output (output_config.format) differs from the OpenAI
 * strict route (400s observed through OpenCode, 2026-10-16): no numeric
 * bounds, no maxItems, minItems only 0 or 1, and a hard cap on union-typed
 * parameters ("69 parameters with type arrays or anyOf"). It does allow
 * optional properties, so the strict encoding "value | null, always listed"
 * goes back to "value, not required". zod still enforces every bound, and
 * stripNullFields stays harmless when no nulls arrive.
 */
export function toAnthropicStructuredSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toAnthropicStructuredSchema);
  if (!node || typeof node !== 'object') return node;
  const source = node as JsonSchema;
  const result: JsonSchema = {};
  for (const [key, value] of Object.entries(source)) {
    if (ANTHROPIC_UNSUPPORTED.has(key)) continue;
    if (key === 'minItems') {
      if (typeof value === 'number' && value >= 1) result.minItems = 1;
      continue;
    }
    if (key === 'properties' || key === 'required') continue;
    result[key] = toAnthropicStructuredSchema(value);
  }
  if (source.properties && typeof source.properties === 'object') {
    const properties = source.properties as Record<string, JsonSchema>;
    const required = new Set(
      Array.isArray(source.required) ? (source.required as string[]) : []
    );
    result.properties = Object.fromEntries(
      Object.entries(properties).map(([name, property]) => {
        if (isNullable(property)) {
          required.delete(name);
          return [name, toAnthropicStructuredSchema(nonNullable(property))];
        }
        return [name, toAnthropicStructuredSchema(property)];
      })
    );
    result.required = [...required];
  }
  return result;
}

/**
 * The numeric, length and size limits of a zod schema as short prompt lines
 * ("objects[].decimals: 0..4"), for routes whose output is not enforced by a
 * schema (OpenCode). Generated from the same zod schema the validator uses,
 * so the prompt and the contract cannot drift.
 */
export function describeSchemaLimits(schema: z.ZodType): string[] {
  const lines = new Set<string>();
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== 'object') return;
    const current = node as JsonSchema;
    for (const option of [
      ...((current.anyOf as unknown[]) || []),
      ...((current.oneOf as unknown[]) || []),
    ]) {
      walk(option, path);
    }
    const range = (min: unknown, max: unknown) =>
      `${typeof min === 'number' ? min : ''}..${typeof max === 'number' ? max : ''}`;
    if (current.type === 'number' || current.type === 'integer') {
      if (current.minimum !== undefined || current.maximum !== undefined) {
        lines.add(`${path}: ${range(current.minimum, current.maximum)}`);
      }
    }
    if (current.type === 'string' && typeof current.maxLength === 'number') {
      lines.add(`${path}: at most ${current.maxLength} characters`);
    }
    if (current.type === 'array') {
      if (current.minItems !== undefined || current.maxItems !== undefined) {
        lines.add(
          `${path}: ${range(current.minItems, current.maxItems)} items`
        );
      }
      if (Array.isArray(current.prefixItems)) {
        (current.prefixItems as unknown[]).forEach((item) =>
          walk(item, `${path}[]`)
        );
      }
      walk(current.items, `${path}[]`);
    }
    if (current.properties && typeof current.properties === 'object') {
      for (const [name, child] of Object.entries(
        current.properties as Record<string, unknown>
      )) {
        walk(child, path ? `${path}.${name}` : name);
      }
    }
  };
  walk(z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }), '');
  return [...lines];
}
