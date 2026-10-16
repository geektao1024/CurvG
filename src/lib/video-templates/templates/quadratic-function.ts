import { latexNumber } from '../expr';
import { ManimScript, niceRange, num, plotSegments } from '../manim';
import { round, valueLatex, valuePlain } from '../numeric';
import type { TemplateParamValues, VideoTemplate } from '../types';

const copy = {
  en: {
    title: 'Reading a quadratic',
    subtitle: 'Opening, vertex, axis of symmetry and roots',
    graph: 'Here is the parabola.',
    up: (a: string) => `a = ${a} > 0, so it opens upward.`,
    down: (a: string) => `a = ${a} < 0, so it opens downward.`,
    vertex: (v: string) => `Completing the square gives the vertex ${v}.`,
    axis: (h: string) => `The parabola is symmetric about the line x = ${h}.`,
    two: (d: string) => `Δ = b² − 4ac = ${d} > 0: two real roots.`,
    one: 'Δ = 0: the vertex touches the x-axis, one double root.',
    none: (d: string) => `Δ = ${d} < 0: the parabola never meets the x-axis.`,
    takeaway: 'Vertex form shows the shape; the discriminant counts the roots',
    beats: ['The parabola', 'Opening', 'Vertex', 'Axis of symmetry', 'Roots'],
    vertexLabel: 'Vertex',
    rootsLabel: 'Roots',
  },
  zh: {
    title: '读懂二次函数',
    subtitle: '开口、顶点、对称轴与根',
    graph: '这是它的抛物线。',
    up: (a: string) => `a = ${a} > 0，开口向上。`,
    down: (a: string) => `a = ${a} < 0，开口向下。`,
    vertex: (v: string) => `配方得到顶点式，顶点是 ${v}。`,
    axis: (h: string) => `抛物线关于直线 x = ${h} 对称。`,
    two: (d: string) => `判别式 Δ = b² − 4ac = ${d} > 0：有两个实根。`,
    one: '判别式 Δ = 0：顶点落在 x 轴上，有一个重根。',
    none: (d: string) => `判别式 Δ = ${d} < 0：抛物线与 x 轴没有交点。`,
    takeaway: '顶点式看形状，判别式数根',
    beats: ['抛物线', '开口方向', '顶点', '对称轴', '根'],
    vertexLabel: '顶点',
    rootsLabel: '根',
  },
};

function analyse(params: TemplateParamValues) {
  const a = Number(params.a);
  const b = Number(params.b);
  const c = Number(params.c);
  if (a === 0)
    throw new Error('a cannot be 0 (that is a line, not a parabola)');
  const h = -b / (2 * a);
  const k = c - (b * b) / (4 * a);
  const d = b * b - 4 * a * c;
  const roots =
    d > 1e-12
      ? [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)].sort(
          (p, q) => p - q
        )
      : Math.abs(d) <= 1e-12
        ? [h]
        : [];
  return { a, b, c, h, k, d, roots };
}

const v = (value: number) => valueLatex(value).latex.replace('\\approx ', '');
const p = (value: number) => valuePlain(value).replace('≈ ', '');

function standardLatex(a: number, b: number, c: number): string {
  let text = `${a === 1 ? '' : a === -1 ? '-' : latexNumber(a)}x^{2}`;
  if (b)
    text += ` ${b > 0 ? '+' : '-'} ${Math.abs(b) === 1 ? '' : latexNumber(Math.abs(b))}x`;
  if (c) text += ` ${c > 0 ? '+' : '-'} ${latexNumber(Math.abs(c))}`;
  return text;
}

function vertexLatex(a: number, h: number, k: number): string {
  const inner =
    h === 0 ? 'x' : `\\left(x ${h > 0 ? '-' : '+'} ${v(Math.abs(h))}\\right)`;
  let text = `${a === 1 ? '' : a === -1 ? '-' : latexNumber(a)}${inner}^{2}`;
  if (Math.abs(k) > 1e-12) text += ` ${k > 0 ? '+' : '-'} ${v(Math.abs(k))}`;
  return text;
}

export const quadraticFunction: VideoTemplate = {
  id: 'quadratic-function',
  version: 1,
  category: 'functions',
  title: { en: 'Quadratic function and its parabola', zh: '二次函数与抛物线' },
  summary: {
    en: 'y = ax² + bx + c: opening direction, vertex by completing the square, axis of symmetry, discriminant and roots.',
    zh: 'y = ax² + bx + c：开口方向、配方求顶点、对称轴、判别式与根。',
  },
  matchHint:
    'Quadratic functions and parabolas y = ax^2 + bx + c, vertex form, completing the square, axis of symmetry, discriminant, number of real roots, quadratic formula on a graph. Not: general polynomials (use function-graph), transformations of other functions.',
  examples: [
    {
      prompt: 'Explain the vertex and roots of y = x^2 - 4x + 3',
      params: { a: 1, b: -4, c: 3 },
    },
    {
      prompt: '二次函数 y = -2x² + 4x + 1 的图像和性质',
      params: { a: -2, b: 4, c: 1 },
    },
  ],
  params: [
    {
      key: 'a',
      type: 'number',
      default: 1,
      min: -10,
      max: 10,
      label: { en: 'a', zh: 'a' },
    },
    {
      key: 'b',
      type: 'number',
      default: -4,
      min: -20,
      max: 20,
      label: { en: 'b', zh: 'b' },
    },
    {
      key: 'c',
      type: 'number',
      default: 3,
      min: -50,
      max: 50,
      label: { en: 'c', zh: 'c' },
    },
  ],
  check(params) {
    try {
      analyse(params);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  },
  build(params, context) {
    const t = copy[context.locale];
    const { a, b, c, h, k, d, roots } = analyse(params);
    const s = new ManimScript(context);
    const f = (x: number) => a * x * x + b * x + c;
    // Wide enough for both roots (or ±3 around the vertex), tall enough for the vertex and the y-intercept.
    const half = Math.max(3, ...roots.map((r) => Math.abs(r - h) * 1.35));
    const xr = niceRange(h - half, h + half);
    const ends = [f(xr.min), f(xr.max)];
    const yLo = Math.min(0, k, c, ...(a > 0 ? [] : ends));
    const yHi = Math.max(0, k, c, ...(a > 0 ? ends : []));
    const span = yHi - yLo || 2;
    const yr = niceRange(
      a > 0 ? yLo - span * 0.15 : Math.max(yLo, k - span) - span * 0.1,
      a > 0
        ? Math.min(yHi, k + Math.max(span, 4)) + span * 0.1
        : yHi + span * 0.15
    );
    s.define('f', 'x', `${num(a)} * x ** 2 + ${num(b)} * x + ${num(c)}`);
    s.intro(t.title, t.subtitle);
    const ax = s.axes({ name: 'axes', x: xr, y: yr });
    s.plot(
      'curve',
      ax.axes,
      'f(x)',
      plotSegments(f, xr.min, xr.max, { min: yr.min, max: yr.max })
    );
    s.panelTex('standard', `y = ${standardLatex(a, b, c)}`, 0);
    s.panelTex('vertex_form', `y = ${vertexLatex(a, h, k)}`, 1, {
      color: 'BLUE',
    });
    s.panelTex('disc', `\\Delta = b^{2} - 4ac = ${v(d)}`, 2, {
      color: roots.length ? 'GREEN' : 'RED',
      size: 38,
    });
    s.line(
      `V = Dot(${ax.axes}.c2p(${num(h)}, ${num(k)}), radius=0.1, color=BLUE)`,
      `V_label = ${s.tex(`(${v(h)},\\ ${v(k)})`, { size: 30, color: 'BLUE' })}.next_to(V, ${a > 0 ? 'DOWN' : 'UP'}, buff=0.18)`,
      `axis_line = DashedLine(${ax.axes}.c2p(${num(h)}, ${num(yr.min)}), ${ax.axes}.c2p(${num(h)}, ${num(yr.max)}), color=BLUE, stroke_width=3, dash_length=0.12)`,
      `axis_label = ${s.tex(`x = ${v(h)}`, { size: 30, color: 'BLUE' })}.next_to(${ax.axes}.c2p(${num(h)}, ${num(yr.max)}), RIGHT, buff=0.12).shift(DOWN * 0.25)`
    );
    roots.forEach((r, i) =>
      s.line(
        `root_${i} = Dot(${ax.axes}.c2p(${num(r)}, 0), radius=0.09, color=GREEN)`,
        `root_${i}_label = ${s.tex(v(r), { size: 30, color: 'GREEN' })}.next_to(root_${i}, ${a > 0 ? 'UP' : 'DOWN'} + ${i === 0 ? 'LEFT' : 'RIGHT'}, buff=0.12)`
      )
    );
    s.caption(t.graph);
    s.play(
      [`FadeIn(${ax.grid})`, `Create(${ax.axes})`, `FadeIn(${ax.labels})`],
      1.2
    );
    s.play(['Create(curve)', 'Write(standard)'], 2);
    s.wait(0.6);
    s.caption(a > 0 ? t.up(latexNumber(a)) : t.down(latexNumber(a)));
    s.play('Indicate(curve, color=AMBER, scale_factor=1.02)', 1.2);
    s.wait(1);
    s.caption(t.vertex(`(${p(h)}, ${p(k)})`));
    s.play('Write(vertex_form)', 1.4);
    s.play(['FadeIn(V, scale=0.5)', 'FadeIn(V_label)'], 0.8);
    s.wait(1.4);
    s.caption(t.axis(p(h)));
    s.play(['Create(axis_line)', 'FadeIn(axis_label)'], 1.2);
    s.wait(1.4);
    s.caption(
      roots.length === 2
        ? t.two(p(d))
        : roots.length === 1
          ? t.one
          : t.none(p(d))
    );
    s.play('Write(disc)', 1.2);
    if (roots.length) {
      s.play(
        [
          ...roots.map((_, i) => `FadeIn(root_${i}, scale=0.5)`),
          ...roots.map((_, i) => `FadeIn(root_${i}_label)`),
        ],
        1
      );
    }
    s.wait(2.2);
    s.outro(`${standardLatex(a, b, c)} = ${vertexLatex(a, h, k)}`, t.takeaway);
    return {
      title: `${t.title} · y = ${standardLatex(a, b, c)
        .replace(/\^\{2\}/g, '²')
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')}`,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        { label: t.vertexLabel, value: `(${p(h)}, ${p(k)})` },
        { label: 'Δ', value: p(d) },
        {
          label: t.rootsLabel,
          value: roots.length
            ? roots.map((r) => p(round(r, 6))).join(', ')
            : '—',
        },
      ],
      beats: t.beats,
    };
  },
};
