/**
 * How each curve is made, for the "watch it draw" animation on its page.
 *
 * A trace follows the same parameter t that `sample()` sweeps, so the pen
 * sits exactly on the drawn curve (tests/curves-seo.test.ts checks every
 * point). `guides` draws the construction at that moment — the rolling
 * circle, the radius from the pole, the strings to the foci — because that
 * is what explains the shape. Everything is a pure function of (values, t),
 * so a frame can be rendered for any time, on screen or into a video.
 *
 * Curves without an entry still animate: the pen runs along the drawn
 * polyline with no construction lines.
 */

import { gcd, TAU } from './types';

type Values = Record<string, number>;
type Point = [number, number];

export type TraceGuide =
  | { kind: 'circle'; cx: number; cy: number; r: number; faint?: boolean }
  | {
      kind: 'segment';
      from: Point;
      to: Point;
      dashed?: boolean;
      faint?: boolean;
    }
  | { kind: 'dot'; at: Point };

export type CurveTrace = {
  /** Which polyline of `sample()` the pen draws; default the last. */
  polyline?: number;
  /** The parameter interval `sample()` sweeps for that polyline. */
  range: (values: Values) => [number, number];
  /** The pen at parameter t: must equal `sample()`'s point at t. */
  point: (values: Values, t: number) => Point;
  /** The construction at parameter t, in curve coordinates. */
  guides?: (values: Values, t: number) => TraceGuide[];
};

/** A circle of radius r rolling on (or around) a fixed one, pen at `pen`. */
function rolling(center: Point, r: number, pen: Point): TraceGuide[] {
  return [
    { kind: 'circle', cx: center[0], cy: center[1], r },
    { kind: 'segment', from: center, to: pen },
    { kind: 'dot', at: center },
  ];
}

/** Polar curves: the radius from the pole to the pen. */
function polar(radius: (values: Values, t: number) => number): {
  point: CurveTrace['point'];
  guides: NonNullable<CurveTrace['guides']>;
} {
  const point = (values: Values, t: number): Point => {
    const r = radius(values, t);
    return [r * Math.cos(t), r * Math.sin(t)];
  };
  return {
    point,
    guides: (values, t) => [
      { kind: 'segment', from: [0, 0], to: point(values, t) },
      { kind: 'dot', at: [0, 0] },
    ],
  };
}

/** x = y·cot(πy/2a), with its limit 2a/π at y = 0. */
function quadratrixX(a: number, y: number): number {
  return Math.abs(y) < 1e-12
    ? (2 * a) / Math.PI
    : y / Math.tan((Math.PI * y) / (2 * a));
}

const GOLDEN_B = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2);

export const CURVE_TRACES: Record<string, CurveTrace> = {
  'lissajous-curve': {
    range: () => [0, TAU],
    point: ({ a, b, delta }, t) => [Math.sin(a * t + delta), Math.sin(b * t)],
    // Two independent oscillations, read off the edges of the box.
    guides: ({ a, b, delta }, t) => {
      const x = Math.sin(a * t + delta);
      const y = Math.sin(b * t);
      return [
        { kind: 'segment', from: [x, -1.15], to: [x, y], dashed: true },
        { kind: 'segment', from: [-1.15, y], to: [x, y], dashed: true },
        { kind: 'dot', at: [x, -1.15] },
        { kind: 'dot', at: [-1.15, y] },
      ];
    },
  },

  'rose-curve': {
    range: () => [0, TAU],
    ...polar(({ k }, t) => Math.cos(k * t)),
  },
  cardioid: {
    range: () => [0, TAU],
    ...polar(({ a }, t) => a * (1 + Math.cos(t))),
  },
  limacon: {
    range: () => [0, TAU],
    ...polar(({ b }, t) => b + Math.cos(t)),
  },
  'cissoid-of-diocles': {
    range: () => [-1.12, 1.12],
    ...polar(({ a }, t) => 2 * a * Math.sin(t) * Math.tan(t)),
  },
  'archimedean-spiral': {
    range: ({ turns }) => [0, turns * TAU],
    ...polar(({ b }, t) => b * t),
  },
  'logarithmic-spiral': {
    range: () => [-4 * TAU, 2.5 * TAU],
    ...polar(({ b }, t) => Math.exp(b * t)),
  },
  'fermat-spiral': {
    polyline: 0,
    range: ({ turns }) => [0, turns * TAU],
    ...polar((_, t) => Math.sqrt(t)),
  },
  'golden-spiral': {
    range: ({ turns }) => [-turns * TAU, 0.75 * TAU],
    ...polar((_, t) => Math.exp(GOLDEN_B * t)),
  },

  cycloid: {
    range: ({ arches }) => [0, arches * TAU],
    point: (_, t) => [t - Math.sin(t), 1 - Math.cos(t)],
    guides: (_, t) => rolling([t, 1], 1, [t - Math.sin(t), 1 - Math.cos(t)]),
  },
  epicycloid: {
    range: () => [0, TAU],
    point: ({ k }, t) => {
      const r = 1 / k;
      return [
        (1 + r) * Math.cos(t) - r * Math.cos((k + 1) * t),
        (1 + r) * Math.sin(t) - r * Math.sin((k + 1) * t),
      ];
    },
    guides: (values, t) => {
      const r = 1 / values.k;
      const center: Point = [(1 + r) * Math.cos(t), (1 + r) * Math.sin(t)];
      return rolling(center, r, CURVE_TRACES.epicycloid.point(values, t));
    },
  },
  hypocycloid: {
    range: () => [0, TAU],
    point: ({ k }, t) => {
      const r = 1 / k;
      return [
        (1 - r) * Math.cos(t) + r * Math.cos((k - 1) * t),
        (1 - r) * Math.sin(t) - r * Math.sin((k - 1) * t),
      ];
    },
    guides: (values, t) => {
      const r = 1 / values.k;
      const center: Point = [(1 - r) * Math.cos(t), (1 - r) * Math.sin(t)];
      return rolling(center, r, CURVE_TRACES.hypocycloid.point(values, t));
    },
  },
  hypotrochoid: {
    range: ({ R, r }) => [0, (r / gcd(R, r)) * TAU],
    point: ({ R, r, d }, t) => [
      (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t),
      (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t),
    ],
    guides: (values, t) => {
      const { R, r } = values;
      const center: Point = [(R - r) * Math.cos(t), (R - r) * Math.sin(t)];
      return [
        { kind: 'circle', cx: 0, cy: 0, r: R, faint: true },
        ...rolling(center, r, CURVE_TRACES.hypotrochoid.point(values, t)),
      ];
    },
  },
  epitrochoid: {
    range: ({ R, r }) => [0, (r / gcd(R, r)) * TAU],
    point: ({ R, r, d }, t) => [
      (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t),
      (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t),
    ],
    guides: (values, t) => {
      const { R, r } = values;
      const center: Point = [(R + r) * Math.cos(t), (R + r) * Math.sin(t)];
      return [
        { kind: 'circle', cx: 0, cy: 0, r: R, faint: true },
        ...rolling(center, r, CURVE_TRACES.epitrochoid.point(values, t)),
      ];
    },
  },
  // Astroid, deltoid and nephroid are hypo-/epicycloids with k = 4, 3, 2:
  // the same rolling construction, scaled to their own parameter.
  astroid: {
    range: () => [0, TAU],
    point: ({ a }, t) => [a * Math.cos(t) ** 3, a * Math.sin(t) ** 3],
    guides: ({ a }, t) => [
      { kind: 'circle', cx: 0, cy: 0, r: a, faint: true },
      ...rolling([0.75 * a * Math.cos(t), 0.75 * a * Math.sin(t)], a / 4, [
        a * Math.cos(t) ** 3,
        a * Math.sin(t) ** 3,
      ]),
    ],
  },
  'deltoid-curve': {
    range: () => [0, TAU],
    point: ({ r }, t) => [
      r * (2 * Math.cos(t) + Math.cos(2 * t)),
      r * (2 * Math.sin(t) - Math.sin(2 * t)),
    ],
    guides: (values, t) => {
      const { r } = values;
      return [
        { kind: 'circle', cx: 0, cy: 0, r: 3 * r, faint: true },
        ...rolling(
          [2 * r * Math.cos(t), 2 * r * Math.sin(t)],
          r,
          CURVE_TRACES['deltoid-curve'].point(values, t)
        ),
      ];
    },
  },
  nephroid: {
    range: () => [0, TAU],
    point: ({ r }, t) => [
      r * (3 * Math.cos(t) - Math.cos(3 * t)),
      r * (3 * Math.sin(t) - Math.sin(3 * t)),
    ],
    guides: (values, t) => {
      const { r } = values;
      return [
        { kind: 'circle', cx: 0, cy: 0, r: 2 * r, faint: true },
        ...rolling(
          [3 * r * Math.cos(t), 3 * r * Math.sin(t)],
          r,
          CURVE_TRACES.nephroid.point(values, t)
        ),
      ];
    },
  },

  'involute-of-a-circle': {
    range: ({ turns }) => [0, turns * TAU],
    point: (_, t) => [
      Math.cos(t) + t * Math.sin(t),
      Math.sin(t) - t * Math.cos(t),
    ],
    // The string leaves the circle at angle t and stays taut and tangent.
    guides: (_, t) => [
      {
        kind: 'segment',
        from: [Math.cos(t), Math.sin(t)],
        to: [Math.cos(t) + t * Math.sin(t), Math.sin(t) - t * Math.cos(t)],
      },
      { kind: 'dot', at: [Math.cos(t), Math.sin(t)] },
    ],
  },
  tractrix: {
    range: () => [-4.4, 4.4],
    point: ({ a }, t) => [a * (t - Math.tanh(t)), a / Math.cosh(t)],
    // The leash: length a from the pen to the walker on the x-axis.
    guides: ({ a }, t) => [
      {
        kind: 'segment',
        from: [a * t, 0],
        to: [a * (t - Math.tanh(t)), a / Math.cosh(t)],
      },
      { kind: 'dot', at: [a * t, 0] },
    ],
  },

  ellipse: {
    range: () => [0, TAU],
    point: ({ a, b }, t) => [a * Math.cos(t), b * Math.sin(t)],
    // Two strings to the foci; their total length stays 2·max(a, b).
    guides: ({ a, b }, t) => {
      const c = Math.sqrt(Math.abs(a * a - b * b));
      const foci: [Point, Point] =
        a >= b
          ? [
              [-c, 0],
              [c, 0],
            ]
          : [
              [0, -c],
              [0, c],
            ];
      const pen: Point = [a * Math.cos(t), b * Math.sin(t)];
      return foci.flatMap((focus): TraceGuide[] => [
        { kind: 'segment', from: focus, to: pen },
        { kind: 'dot', at: focus },
      ]);
    },
  },
  parabola: {
    range: () => [-4, 4],
    point: ({ p }, x) => [x, (x * x) / (4 * p)],
    // Equal distances: to the focus, and straight down to the directrix.
    guides: ({ p }, x) => {
      const pen: Point = [x, (x * x) / (4 * p)];
      return [
        { kind: 'segment', from: [-4, -p], to: [4, -p], faint: true },
        { kind: 'segment', from: [0, p], to: pen },
        { kind: 'segment', from: [x, -p], to: pen, dashed: true },
        { kind: 'dot', at: [0, p] },
        { kind: 'dot', at: [x, -p] },
      ];
    },
  },
  hyperbola: {
    polyline: 0,
    range: () => [-1.6, 1.6],
    point: ({ a, b }, u) => [a * Math.cosh(u), b * Math.sinh(u)],
    // The difference of the two focal distances stays 2a.
    guides: ({ a, b }, u) => {
      const c = Math.sqrt(a * a + b * b);
      const pen: Point = [a * Math.cosh(u), b * Math.sinh(u)];
      return [
        { kind: 'segment', from: [-c, 0], to: pen },
        { kind: 'segment', from: [c, 0], to: pen },
        { kind: 'dot', at: [-c, 0] },
        { kind: 'dot', at: [c, 0] },
      ];
    },
  },
  trochoid: {
    range: ({ arches }) => [0, arches * TAU],
    point: ({ d }, t) => [t - d * Math.sin(t), 1 - d * Math.cos(t)],
    // The wheel, and the spoke out to a pen that may sit inside or beyond the rim.
    guides: ({ d }, t) =>
      rolling([t, 1], 1, [t - d * Math.sin(t), 1 - d * Math.cos(t)]),
  },
  'conchoid-of-nicomedes': {
    range: () => [-1.25, 1.25],
    point: ({ b }, t) => {
      const r = 1 / Math.cos(t) + b;
      return [r * Math.cos(t), r * Math.sin(t)];
    },
    // Nicomedes' ruler: a line through O, cut by x = 1 at Q, with b marked past Q.
    guides: ({ b }, t) => {
      const r = 1 / Math.cos(t) + b;
      const q: Point = [1, Math.tan(t)];
      return [
        { kind: 'segment', from: [1, -4], to: [1, 4], faint: true },
        {
          kind: 'segment',
          from: [0, 0],
          to: [r * Math.cos(t), r * Math.sin(t)],
        },
        { kind: 'dot', at: [0, 0] },
        { kind: 'dot', at: q },
      ];
    },
  },
  strophoid: {
    range: () => [-1.32, 1.32],
    ...polar(({ a }, t) => (-a * Math.cos(2 * t)) / Math.cos(t)),
  },
  'trisectrix-of-maclaurin': {
    range: () => [-1.42, 1.42],
    // At θ = 0 the ratio is 0/0; its limit is 3a/2.
    ...polar(({ a }, t) =>
      Math.abs(t) < 1e-12 ? 1.5 * a : (a * Math.sin(3 * t)) / Math.sin(2 * t)
    ),
  },
  cochleoid: {
    range: ({ turns }) => [-turns * TAU, turns * TAU],
    ...polar((_, t) => (Math.abs(t) < 1e-12 ? 1 : Math.sin(t) / t)),
  },
  superformula: {
    range: () => [0, 2 * TAU],
    ...polar(({ m, n1, n2, n3 }, t) => {
      const u = (m * t) / 4;
      return (
        (Math.abs(Math.cos(u)) ** n2 + Math.abs(Math.sin(u)) ** n3) ** (-1 / n1)
      );
    }),
  },
  'hyperbolic-spiral': {
    range: ({ turns }) => [0.3, turns * TAU],
    ...polar((_, t) => 1 / t),
  },
  lituus: {
    range: ({ turns }) => [0.04, turns * TAU],
    ...polar((_, t) => 1 / Math.sqrt(t)),
  },
  'quadratrix-of-hippias': {
    range: ({ a }) => [-1.6 * a, 1.6 * a],
    point: ({ a }, y) => [quadratrixX(a, y), y],
    // Hippias: a line falling at constant speed meets a radius turning at
    // constant speed; the angle is πy/2a.
    guides: ({ a }, y) => {
      const pen: Point = [quadratrixX(a, y), y];
      return [
        { kind: 'segment', from: [0, 0], to: [a, 0], faint: true },
        { kind: 'segment', from: [0, a], to: [a, a], faint: true },
        { kind: 'segment', from: [a, 0], to: [a, a], faint: true },
        { kind: 'segment', from: [0, y], to: pen, dashed: true },
        { kind: 'segment', from: [0, 0], to: pen },
        { kind: 'dot', at: [0, 0] },
      ];
    },
  },
  'bezier-curve': {
    polyline: 1,
    range: () => [0, 1],
    point: ({ x1, y1, x2, y2 }, t) => {
      const u = 1 - t;
      return [
        3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3,
        3 * u * u * t * y1 + 3 * u * t * t * y2,
      ];
    },
    // De Casteljau: three rounds of splitting at ratio t.
    guides: ({ x1, y1, x2, y2 }, t) => {
      const lerp = (p: Point, q: Point): Point => [
        p[0] + (q[0] - p[0]) * t,
        p[1] + (q[1] - p[1]) * t,
      ];
      const p0: Point = [0, 0];
      const p1: Point = [x1, y1];
      const p2: Point = [x2, y2];
      const p3: Point = [1, 0];
      const a = lerp(p0, p1);
      const b = lerp(p1, p2);
      const c = lerp(p2, p3);
      const d = lerp(a, b);
      const e = lerp(b, c);
      return [
        { kind: 'segment', from: a, to: b },
        { kind: 'segment', from: b, to: c },
        { kind: 'segment', from: d, to: e },
        { kind: 'dot', at: a },
        { kind: 'dot', at: b },
        { kind: 'dot', at: c },
        { kind: 'dot', at: d },
        { kind: 'dot', at: e },
      ];
    },
  },
  'sigmoid-function': {
    range: () => [-7, 7],
    point: ({ k }, x) => [x, 1 / (1 + Math.exp(-k * x))],
    // The tangent, whose slope k·y(1 − y) peaks at the centre.
    guides: ({ k }, x) => {
      const y = 1 / (1 + Math.exp(-k * x));
      const slope = k * y * (1 - y);
      const half = 0.9 / Math.sqrt(1 + slope * slope);
      return [
        {
          kind: 'segment',
          from: [x - half, y - slope * half],
          to: [x + half, y + slope * half],
        },
      ];
    },
  },
  'sine-wave': {
    range: () => [0, 4 * Math.PI],
    point: ({ A, w }, x) => [x, A * Math.sin(w * x)],
    guides: ({ A, w }, x) => [
      {
        kind: 'segment',
        from: [x, 0],
        to: [x, A * Math.sin(w * x)],
        dashed: true,
      },
    ],
  },
};

export type TraceFrame = {
  /** Which polyline is being drawn, and how far: a fractional index. */
  polyline: number;
  upto: number;
  pen: Point;
  guides: TraceGuide[];
};

/**
 * The animation at progress u ∈ [0, 1], given the polylines `sample()`
 * returned for the same values. Pure: the same inputs give the same frame.
 */
export function traceFrame(
  slug: string,
  values: Values,
  polylines: ReadonlyArray<ReadonlyArray<Point>>,
  progress: number
): TraceFrame | null {
  const trace = CURVE_TRACES[slug];
  const polyline = trace?.polyline ?? polylines.length - 1;
  const line = polylines[polyline];
  if (!line || line.length < 2) return null;
  const u = Math.min(1, Math.max(0, progress));
  const upto = u * (line.length - 1);
  if (trace) {
    const [t0, t1] = trace.range(values);
    const t = t0 + u * (t1 - t0);
    return {
      polyline,
      upto,
      pen: trace.point(values, t),
      guides: trace.guides?.(values, t) ?? [],
    };
  }
  const index = Math.floor(upto);
  const next = line[Math.min(index + 1, line.length - 1)];
  const f = upto - index;
  return {
    polyline,
    upto,
    pen: [
      line[index][0] + (next[0] - line[index][0]) * f,
      line[index][1] + (next[1] - line[index][1]) * f,
    ],
    guides: [],
  };
}

/** Points a guide reaches, so the graph frame can make room for them. */
export function guideExtent(guide: TraceGuide): Point[] {
  if (guide.kind === 'circle') {
    const { cx, cy, r } = guide;
    return [
      [cx - r, cy - r],
      [cx + r, cy + r],
    ];
  }
  return guide.kind === 'segment' ? [guide.from, guide.to] : [guide.at];
}

/** Guide extents over a whole run, sampled at `steps` moments. */
export function traceExtent(slug: string, values: Values, steps = 48): Point[] {
  const trace = CURVE_TRACES[slug];
  if (!trace?.guides) return [];
  const [t0, t1] = trace.range(values);
  const points: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = t0 + ((t1 - t0) * i) / steps;
    for (const guide of trace.guides(values, t)) {
      points.push(...guideExtent(guide));
    }
  }
  return points;
}
