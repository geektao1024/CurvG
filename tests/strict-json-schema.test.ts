import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';

import {
  alignShotFocusIds,
  planArtifactSchema,
  resolveTimelineOverlaps,
  revealOnFirstAttention,
  sceneArtifactSchema,
  sceneResponseSchema,
  splitPlanArtifact,
} from '../src/lib/animation-pipeline';
import {
  stripNullFields,
  toStrictJsonSchema,
} from '../src/lib/strict-json-schema';

type Schema = Record<string, unknown>;

function walk(node: unknown, visit: (schema: Schema) => void) {
  if (Array.isArray(node)) return node.forEach((item) => walk(item, visit));
  if (!node || typeof node !== 'object') return;
  visit(node as Schema);
  for (const value of Object.values(node as Schema)) walk(value, visit);
}

test('strict schemas list every property, forbid extras, drop unsupported keywords', () => {
  for (const schema of [planArtifactSchema, sceneArtifactSchema]) {
    const strict = toStrictJsonSchema(schema);
    walk(strict, (node) => {
      for (const keyword of [
        '$schema',
        'minLength',
        'maxLength',
        'default',
        'prefixItems',
        'oneOf',
      ]) {
        assert.equal(keyword in node, false, `${keyword} must be dropped`);
      }
      if (node.type === 'object' && node.properties) {
        assert.equal(node.additionalProperties, false);
        assert.deepEqual(
          [...(node.required as string[])].sort(),
          Object.keys(node.properties as Schema).sort()
        );
      }
    });
  }
});

test('optional fields become nullable and tuples become arrays', () => {
  const strict = toStrictJsonSchema(
    z.object({
      name: z.string().min(1),
      note: z.string().optional(),
      kind: z.enum(['a', 'b']).optional(),
      point: z.tuple([z.number(), z.number()]),
    })
  ) as { properties: Record<string, Schema> };
  // String lengths are dropped; KIE enforces array, number and pattern limits.
  assert.deepEqual(strict.properties.name, { type: 'string' });
  assert.deepEqual(strict.properties.note, { type: ['string', 'null'] });
  assert.deepEqual(strict.properties.kind, {
    anyOf: [{ type: 'string', enum: ['a', 'b'] }, { type: 'null' }],
  });
  assert.deepEqual(strict.properties.point, {
    type: 'array',
    items: { type: 'number' },
    minItems: 2,
    maxItems: 2,
  });
});

test('stripNullFields removes omitted-field nulls at every depth', () => {
  assert.deepEqual(
    stripNullFields({
      a: 1,
      b: null,
      c: [{ d: null, e: 'x' }],
      f: { g: null },
    }),
    { a: 1, c: [{ e: 'x' }], f: {} }
  );
});

test('a merged plan splits into the five stage artifacts', () => {
  const parts = splitPlanArtifact({
    title: 'T',
    summary: 'S',
    knowledgeMap: [],
    spine: [],
    curriculum: [],
    mathDossier: {},
    shots: [],
    stray: 1,
  });
  assert.deepEqual(Object.keys(parts.intent).sort(), ['summary', 'title']);
  assert.deepEqual(Object.keys(parts.knowledge).sort(), [
    'knowledgeMap',
    'spine',
  ]);
  assert.deepEqual(Object.keys(parts.curriculum), ['curriculum']);
  assert.deepEqual(Object.keys(parts.mathematics), ['mathDossier']);
  assert.deepEqual(Object.keys(parts.storyboard), ['shots']);
  assert.throws(() => splitPlanArtifact([]), /one JSON object/);
});

test('the scene response schema enforces per-kind fields at generation time', () => {
  const schema = sceneResponseSchema() as {
    properties: Record<string, { items: { anyOf: Schema[] } }>;
  };
  const variant = (collection: string, field: string, value: string) =>
    schema.properties[collection]!.items.anyOf.find((option) =>
      (
        (option.properties as Record<string, Schema>)[field]!.enum as string[]
      ).includes(value)
    ) as { properties: Record<string, Schema>; required: string[] };

  const line = variant('objects', 'kind', 'line');
  assert.deepEqual(line.properties.kind, { type: 'string', enum: ['line'] });
  assert.equal(line.properties.start!.type, 'array');
  assert.deepEqual(line.properties.region, { type: 'string', enum: ['graph'] });
  // A line lists only line fields, so the model writes no row of nulls.
  assert.deepEqual(Object.keys(line.properties).sort(), [
    'color',
    'end',
    'endRef',
    'id',
    'importance',
    'kind',
    'label',
    'projection',
    'region',
    'start',
    'startRef',
  ]);
  assert.deepEqual(
    [...line.required].sort(),
    Object.keys(line.properties).sort()
  );

  const text = variant('objects', 'kind', 'text');
  assert.deepEqual(text.properties.kind!.enum, ['text']);
  assert.equal(text.properties.label!.type, 'string');

  const move = variant('timeline', 'op', 'move_along');
  assert.equal(move.properties.pathRef!.type, 'string');
  assert.equal(move.required.includes('pathRef'), true);
});

test('overlapping timeline groups are sequenced mechanically', () => {
  const event = (id: string, at: number, runTime: number, shotId = 's1') => ({
    id,
    at,
    runTime,
    shotId,
    op: 'draw' as const,
    ref: 'curve',
    ease: 'smooth' as const,
  });
  const shots = new Map([
    ['s1', { id: 's1', startAt: 0, endAt: 10 }],
    ['s2', { id: 's2', startAt: 10, endAt: 12 }],
  ]) as never;

  // Room in the shot: the staggered label waits for the motion to finish.
  const pushed = resolveTimelineOverlaps(
    [event('move', 2, 4), event('label', 3, 1)],
    shots,
    12
  );
  assert.deepEqual(
    pushed.timeline.map((item) => [item.id, item.at, item.runTime]),
    [
      ['move', 2, 4],
      ['label', 6, 1],
    ]
  );

  // No room (the label's shot ends at 12): the motion is trimmed instead.
  const trimmed = resolveTimelineOverlaps(
    [event('move', 9, 3, 's2'), event('label', 10.5, 1.5, 's2')],
    new Map([['s2', { id: 's2', startAt: 9, endAt: 12 }]]) as never,
    12
  );
  assert.deepEqual(
    trimmed.timeline.map((item) => [item.id, item.at, item.runTime]),
    [
      ['move', 9, 1.5],
      ['label', 10.5, 1.5],
    ]
  );
  assert.equal(trimmed.corrections.length, 1);

  // A small stagger joins the running group.
  const merged = resolveTimelineOverlaps(
    [event('move', 2, 3), event('label', 2.2, 1)],
    shots,
    12
  );
  assert.deepEqual(
    merged.timeline.map((item) => [item.id, item.at]),
    [
      ['move', 2],
      ['label', 2],
    ]
  );

  // A group that waits shortens itself to end with its shot.
  const fitted = resolveTimelineOverlaps(
    [event('move', 6, 3), event('label', 7, 2)],
    shots,
    12
  );
  assert.deepEqual(
    fitted.timeline.map((item) => [item.id, item.at, item.runTime]),
    [
      ['move', 6, 3],
      ['label', 9, 1],
    ]
  );

  // Concurrent events that share a start are left alone.
  const concurrent = resolveTimelineOverlaps(
    [event('a', 1, 2), event('b', 1, 3), event('c', 4, 1)],
    shots,
    12
  );
  assert.deepEqual(concurrent.corrections, []);
});

test('a missing shot focus id is aligned to the object that shot animates', () => {
  const scene = {
    style: { background: '#000000', palette: ['BLUE'], camera: 'static' },
    layout: { regions: 'single' as const },
    dependencies: [],
    notes: [],
    objects: [
      { id: 'axes', kind: 'axes' as const, region: 'graph' as const },
      {
        id: 'dot',
        kind: 'point' as const,
        region: 'graph' as const,
        position: [1, 1] as [number, number],
      },
      {
        id: 'hero_curve',
        kind: 'curve' as const,
        region: 'graph' as const,
        expr: 'x^2',
      },
      {
        id: 'link',
        kind: 'line' as const,
        region: 'graph' as const,
        start: [0, 0] as [number, number],
        end: [1, 1] as [number, number],
        endRef: 'dot',
      },
    ],
    timeline: [
      {
        id: 'e1',
        shotId: 'hook',
        at: 0,
        op: 'draw' as const,
        ref: 'axes',
        runTime: 1,
        ease: 'smooth' as const,
      },
      {
        id: 'e2',
        shotId: 'hook',
        at: 1,
        op: 'fade_in' as const,
        ref: 'dot',
        runTime: 1,
        ease: 'smooth' as const,
      },
      {
        id: 'e3',
        shotId: 'move',
        at: 2,
        op: 'move_along' as const,
        ref: 'dot',
        pathRef: 'hero_curve',
        runTime: 1,
        ease: 'smooth' as const,
      },
    ],
  };
  const shots = [
    { id: 'hook', focusRef: 'moving_point' },
    { id: 'move', focusRef: 'hero_curve' },
  ] as never;

  const { scene: aligned, corrections } = alignShotFocusIds(scene, shots);
  assert.deepEqual(
    aligned.objects.map((object) => object.id),
    ['axes', 'moving_point', 'hero_curve', 'link']
  );
  assert.equal(aligned.objects[3]!.endRef, 'moving_point');
  assert.deepEqual(
    aligned.timeline.map((event) => event.ref),
    ['axes', 'moving_point', 'moving_point']
  );
  assert.equal(corrections.length, 1);
});

test('an emphasis on an unseen object becomes its entrance', () => {
  const step = (id: string, at: number, op: string, ref: string) => ({
    id,
    at,
    op: op as 'draw',
    ref,
    runTime: 1,
    ease: 'smooth' as const,
  });
  const { timeline, corrections } = revealOnFirstAttention([
    step('a', 0, 'draw', 'curve'),
    step('b', 1, 'emphasize', 'curve'),
    step('c', 2, 'spotlight', 'label'),
    step('d', 3, 'transform', 'ghost'),
  ]);
  assert.deepEqual(
    timeline.map((event) => event.op),
    ['draw', 'emphasize', 'fade_in', 'transform']
  );
  assert.equal(corrections.length, 1);
});
