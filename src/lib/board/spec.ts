import { z } from 'zod';

/**
 * Interactive board spec: a parameterised 2D construction.
 *
 * One schema serves hand-written lab content and, later, model-filled
 * lessons. Everything numeric may be an expression over params, scalars and
 * user functions (see `expr.ts`). The data model borrows the shape of
 * edulab's analytic-geometry board (Apache-2.0, github.com/wy51ai/edulab):
 * view + params + derived scalars + objects + readouts.
 */

const identifier = z
  .string()
  .regex(/^[A-Za-z_][A-Za-z0-9_]*$/)
  .max(32);

const finite = z.number().finite();
export const boardExprSchema = z.union([z.string().min(1).max(400), finite]);
const pointSchema = z.tuple([boardExprSchema, boardExprSchema]);

export const BOARD_COLORS = [
  'primary',
  'ink',
  'muted',
  'red',
  'blue',
  'green',
  'amber',
  'purple',
] as const;
export type BoardColor = (typeof BOARD_COLORS)[number];

const styleShape = {
  color: z.enum(BOARD_COLORS).optional(),
  width: z.number().min(0.5).max(8).optional(),
  dashed: z.boolean().optional(),
  opacity: z.number().min(0).max(1).optional(),
  /** Shown while the expression is non-zero. */
  visible: boardExprSchema.optional(),
  /** Plain text; `{name}` interpolates a param or scalar. */
  label: z.string().max(80).optional(),
};

const samplesSchema = z.number().int().min(8).max(1200).optional();

const boardObjectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('function'),
    fn: identifier,
    domain: pointSchema.optional(),
    samples: samplesSchema,
    ...styleShape,
  }),
  z.object({
    type: z.literal('parametric'),
    x: boardExprSchema,
    y: boardExprSchema,
    variable: identifier.default('t'),
    range: pointSchema,
    samples: samplesSchema,
    ...styleShape,
  }),
  z.object({
    type: z.literal('point'),
    at: pointSchema,
    size: z.number().min(1).max(12).optional(),
    hollow: z.boolean().optional(),
    /**
     * Dragging the point writes its coordinates into these params, or its
     * polar angle around `center` into `angle` (a point on a circle).
     */
    drag: z
      .object({
        x: identifier.optional(),
        y: identifier.optional(),
        angle: identifier.optional(),
        center: z.tuple([finite, finite]).optional(),
      })
      .optional(),
    ...styleShape,
  }),
  z.object({
    type: z.literal('segment'),
    from: pointSchema,
    to: pointSchema,
    arrow: z.boolean().optional(),
    ...styleShape,
  }),
  z.object({
    type: z.literal('line'),
    through: pointSchema,
    to: pointSchema.optional(),
    slope: boardExprSchema.optional(),
    ...styleShape,
  }),
  z.object({
    type: z.literal('circle'),
    center: pointSchema,
    r: boardExprSchema,
    fill: z.boolean().optional(),
    ...styleShape,
  }),
  z.object({
    type: z.literal('arc'),
    center: pointSchema,
    r: boardExprSchema,
    start: boardExprSchema,
    end: boardExprSchema,
    ...styleShape,
  }),
  z.object({
    type: z.literal('polygon'),
    points: z.array(pointSchema).min(3).max(24),
    fill: z.boolean().optional(),
    ...styleShape,
  }),
  z.object({
    type: z.literal('area'),
    fn: identifier,
    from: boardExprSchema,
    to: boardExprSchema,
    samples: samplesSchema,
    ...styleShape,
  }),
  z.object({
    type: z.literal('riemann'),
    fn: identifier,
    from: boardExprSchema,
    to: boardExprSchema,
    n: boardExprSchema,
    rule: z.enum(['left', 'right', 'mid']).default('left'),
    ...styleShape,
  }),
  z.object({
    type: z.literal('text'),
    at: pointSchema,
    text: z.string().min(1).max(80),
    anchor: z.enum(['start', 'middle', 'end']).optional(),
    ...styleShape,
  }),
]);

export const boardSpecSchema = z
  .object({
    view: z.object({
      x: z.tuple([finite, finite]),
      y: z.tuple([finite, finite]),
      grid: z.boolean().default(true),
      axes: z.boolean().default(true),
      /** Keep one unit equal on both axes. Off for graphs with tall ranges. */
      equal: z.boolean().default(true),
    }),
    params: z
      .array(
        z.object({
          id: identifier,
          /** TeX shown beside the slider. */
          label: z.string().min(1).max(60),
          min: finite,
          max: finite,
          step: z.number().positive(),
          value: finite,
          /** Seconds for one sweep of the play button; omit to hide it. */
          play: z.number().min(1).max(60).optional(),
          /**
           * Marked stretches of the slider track (edulab's answer band): the
           * values where a case holds, e.g. `e < 1` for an ellipse.
           */
          bands: z
            .array(
              z.object({
                from: finite,
                to: finite,
                label: z.string().min(1).max(40),
                color: z.enum(BOARD_COLORS).optional(),
              })
            )
            .max(4)
            .optional(),
        })
      )
      .max(6)
      .default([]),
    scalars: z
      .array(z.object({ id: identifier, expr: boardExprSchema }))
      .max(32)
      .default([]),
    functions: z
      .array(
        z.object({
          id: identifier,
          arg: identifier.default('x'),
          expr: boardExprSchema,
        })
      )
      .max(8)
      .default([]),
    objects: z.array(boardObjectSchema).min(1).max(60),
    readouts: z
      .array(
        // Status first: zod strips unknown keys, so the value shape would
        // otherwise swallow status entries.
        z.union([
          z.object({
            /** A condition read out as words: `ok` while `expr` is non-zero. */
            kind: z.literal('status'),
            /** Plain text, not TeX. */
            label: z.string().min(1).max(80),
            expr: boardExprSchema,
            ok: z.string().min(1).max(60),
            bad: z.string().min(1).max(60),
          }),
          z.object({
            /** TeX label. */
            label: z.string().min(1).max(80),
            expr: boardExprSchema,
            digits: z.number().int().min(0).max(6).default(2),
            /** The one number the chapter is about, set apart in the card. */
            highlight: z.boolean().optional(),
          }),
        ])
      )
      .max(8)
      .default([]),
  })
  .superRefine((spec, ctx) => {
    const { view, params } = spec;
    if (view.x[0] >= view.x[1] || view.y[0] >= view.y[1]) {
      ctx.addIssue({
        code: 'custom',
        message: 'View ranges must increase',
        path: ['view'],
      });
    }
    params.forEach((param, index) => {
      if (
        param.min >= param.max ||
        param.value < param.min ||
        param.value > param.max
      ) {
        ctx.addIssue({
          code: 'custom',
          message: `Param ${param.id} needs min < max and value inside`,
          path: ['params', index],
        });
      }
      param.bands?.forEach((band, j) => {
        if (
          band.from > band.to ||
          band.from < param.min ||
          band.to > param.max
        ) {
          ctx.addIssue({
            code: 'custom',
            message: `Band must lie inside ${param.id}'s range`,
            path: ['params', index, 'bands', j],
          });
        }
      });
    });
  });

export type BoardSpecInput = z.input<typeof boardSpecSchema>;
export type BoardSpec = z.output<typeof boardSpecSchema>;
export type BoardObject = BoardSpec['objects'][number];
export type BoardParam = BoardSpec['params'][number];
export type BoardReadoutSpec = BoardSpec['readouts'][number];

export function parseBoardSpec(value: unknown): BoardSpec {
  return boardSpecSchema.parse(value);
}
