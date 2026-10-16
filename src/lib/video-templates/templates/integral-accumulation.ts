import { expressionOf, functionParam, numberParam } from '../common';
import { latexNumber, toNumpy } from '../expr';
import { ManimScript, niceRange, num, plotSegments, yWindow } from '../manim';
import { finiteOn, integrate, round, valuePlain } from '../numeric';
import { curve } from '../preview';
import type { TemplateParamValues, VideoTemplate } from '../types';

const copy = {
  en: {
    title: 'The area function and the Fundamental Theorem',
    subtitle: 'Accumulate the area under f and watch its slope',
    curve: 'The curve y = f(x).',
    sweep: (a: string) =>
      `Sweep a right edge x from ${a}: A(x) is the area so far.`,
    signed:
      'Where f is below the axis the area counts as negative and A(x) falls.',
    graph: 'Plot A(x) as it grows: a new curve.',
    ftc: 'Where f is high, A climbs fast; where f is 0, A levels off. The slope of A is f.',
    total: (v: string) => `At the end, A(b) = ${v}.`,
    takeaway: 'A′(x) = f(x): accumulating and differentiating undo each other',
    beats: ['The curve', 'Sweeping area', 'The area function', 'A′ = f'],
  },
  zh: {
    title: '面积函数与微积分基本定理',
    subtitle: '累积 f 下方的面积，再看它的斜率',
    curve: '曲线 y = f(x)。',
    sweep: (a: string) => `从 x = ${a} 开始向右扫：A(x) 是目前为止的面积。`,
    signed: 'f 在 x 轴下方时，面积按负数计，A(x) 下降。',
    graph: '把 A(x) 随 x 的变化画出来：得到一条新曲线。',
    ftc: 'f 越高，A 涨得越快；f 为 0 时，A 走平。A 的斜率就是 f。',
    total: (v: string) => `扫到终点，A(b) = ${v}。`,
    takeaway: 'A′(x) = f(x)：积分与求导互为逆运算',
    beats: ['曲线', '扫过的面积', '面积函数', 'A′ = f'],
  },
};

function analyse(params: TemplateParamValues) {
  const expr = expressionOf(params, 'f');
  const a = Number(params.a);
  const b = Number(params.b);
  if (!(b > a)) throw new Error('b must be greater than a');
  if (!finiteOn(expr.f, a, b, 800))
    throw new Error(`f must be defined on [${a}, ${b}]`);
  const total = integrate(expr.f, a, b);
  if (!Number.isFinite(total))
    throw new Error('The integral does not converge');
  return { ...expr, a, b, total };
}

export const integralAccumulation: VideoTemplate = {
  id: 'integral-accumulation',
  version: 1,
  category: 'calculus',
  title: {
    en: 'Area function and the Fundamental Theorem of Calculus',
    zh: '面积函数与微积分基本定理',
  },
  summary: {
    en: 'A right edge sweeps under f; the accumulated area A(x) is plotted beside it and its slope matches f: A′ = f.',
    zh: '右边界在 f 下方扫过，累积面积 A(x) 同步画出，它的斜率正好等于 f：A′ = f。',
  },
  matchHint:
    'Fundamental theorem of calculus, area function A(x) = ∫_a^x f(t) dt, accumulation, antiderivative as area, why integration and differentiation are inverse, signed area. Not: Riemann sum rectangles (use riemann-sum), techniques of integration.',
  examples: [
    {
      prompt: 'Visualize the fundamental theorem of calculus',
      params: { f: 'cos(x)', a: 0, b: 6.283185 },
    },
    {
      prompt: '用面积函数解释积分和导数的关系',
      params: { f: '2*x - x^2', a: 0, b: 3 },
    },
  ],
  params: [
    functionParam({ default: 'cos(x)' }),
    numberParam({
      key: 'a',
      default: 0,
      min: -20,
      max: 20,
      label: { en: 'Start a', zh: '起点 a' },
    }),
    numberParam({
      key: 'b',
      default: 6.283185,
      min: -20,
      max: 20,
      label: { en: 'End b', zh: '终点 b' },
    }),
  ],
  check(params) {
    try {
      analyse(params);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  },
  preview(params) {
    const { f, a, b } = analyse(params);
    const A = (x: number) => integrate(f, a, x, 200);
    const pad = (b - a) * 0.08;
    const xr = niceRange(a - pad, b + pad);
    const fw = yWindow(f, a, b);
    const aw = yWindow(A, a, b);
    const yr = niceRange(
      Math.min(fw.min, aw.min, 0),
      Math.max(fw.max, aw.max, 0)
    );
    const window = { min: yr.min, max: yr.max };
    const area: Array<[number, number]> = [[a, 0]];
    for (let i = 0; i <= 120; i += 1) {
      const x = a + ((b - a) * i) / 120;
      area.push([x, f(x)]);
    }
    area.push([b, 0]);
    return {
      x: [xr.min, xr.max],
      y: [yr.min, yr.max],
      shapes: [
        { kind: 'area', points: area, tone: 'blue', opacity: 0.25 },
        ...curve(f, xr.min, xr.max, window, 'amber', { width: 3 }),
        ...curve(A, a, b, window, 'green', { width: 3, samples: 80 }),
      ],
    };
  },
  build(params, context) {
    const t = copy[context.locale];
    const { source, f, latex, plain, a, b, total } = analyse(params);
    const s = new ManimScript(context);
    const A = (x: number) => integrate(f, a, x, 400);
    const pad = (b - a) * 0.08;
    const xr = niceRange(a - pad, b + pad);
    const fw = yWindow(f, a, b);
    const aw = yWindow(A, a, b);
    const yr = niceRange(
      Math.min(fw.min, aw.min, 0),
      Math.max(fw.max, aw.max, 0)
    );
    s.define('f', 'x', toNumpy(source, { x: 'x' }));
    s.module(
      'def area_to(x):',
      `    if x <= ${num(a)}: return 0.0`,
      `    xs = np.linspace(${num(a)}, x, 400)`,
      '    ys = f(xs) + 0 * xs',
      '    return float(np.sum((ys[1:] + ys[:-1]) * np.diff(xs)) / 2)'
    );
    s.intro(t.title, t.subtitle);
    const ax = s.axes({ name: 'axes', x: xr, y: yr });
    s.plot(
      'curve',
      ax.axes,
      'f(x)',
      plotSegments(f, xr.min, xr.max, { min: yr.min, max: yr.max })
    );
    s.line(
      `edge = ValueTracker(${num(a + (b - a) * 0.002)})`,
      `fgraph = ${ax.axes}.plot(f, x_range=[${num(a)}, ${num(b)}, ${num((b - a) / 300)}])`,
      `area = always_redraw(lambda: ${ax.axes}.get_area(fgraph, x_range=[${num(a)}, edge.get_value()], color=[BLUE, GREEN], opacity=0.35))`,
      `edge_line = always_redraw(lambda: Line(${ax.axes}.c2p(edge.get_value(), 0), ${ax.axes}.c2p(edge.get_value(), f(edge.get_value())), color=BLUE, stroke_width=4))`,
      `A_dot = always_redraw(lambda: Dot(${ax.axes}.c2p(edge.get_value(), area_to(edge.get_value())), radius=0.08, color=GREEN))`,
      'A_trace = TracedPath(A_dot.get_center, stroke_color=GREEN, stroke_width=5)',
      `A_final = ${ax.axes}.plot(area_to, x_range=[${num(a)}, ${num(b)}, ${num((b - a) / 160)}], color=GREEN, stroke_width=5)`
    );
    s.panelTex('f_eq', `f(x) = ${latex}`, 0, { color: 'AMBER' });
    s.panelTex(
      'A_eq',
      `A(x) = \\int_{${latexNumber(round(a, 4))}}^{x} f(t)\\,dt`,
      1,
      { color: 'GREEN', size: 38 }
    );
    const read = s.readout(
      'A_value',
      'A(x) =',
      'area_to(edge.get_value())',
      2.1,
      { color: 'GREEN', decimals: 3 }
    );
    s.caption(t.curve);
    s.play(
      [`FadeIn(${ax.grid})`, `Create(${ax.axes})`, `FadeIn(${ax.labels})`],
      1.2
    );
    s.play(['Create(curve)', 'Write(f_eq)'], 1.8);
    s.wait(0.6);
    s.caption(t.sweep(valuePlain(a).replace('≈ ', '')));
    s.play(
      [
        'FadeIn(area)',
        'FadeIn(edge_line)',
        'Write(A_eq)',
        `FadeIn(${read.label})`,
        `FadeIn(${read.value})`,
      ],
      1
    );
    s.play(`edge.animate.set_value(${num(a + (b - a) * 0.35)})`, 3, 'linear');
    let negative = false;
    for (let i = 0; i <= 200; i += 1)
      if (f(a + ((b - a) * i) / 200) < -1e-9) negative = true;
    if (negative) {
      s.caption(t.signed);
      s.wait(1.6);
    }
    s.caption(t.graph);
    s.play(`edge.animate.set_value(${num(a + (b - a) * 0.002)})`, 1.2);
    s.line('self.add(A_trace)');
    s.play('FadeIn(A_dot)', 0.4);
    s.play(`edge.animate.set_value(${num(b)})`, 7, 'linear');
    s.wait(0.6);
    s.caption(t.ftc);
    s.play(['FadeIn(A_final)', 'FadeOut(A_trace)'], 0.8);
    s.wait(2.6);
    s.caption(t.total(valuePlain(total)));
    s.play('Indicate(A_dot, color=GREEN, scale_factor=1.6)', 1);
    s.wait(1.6);
    s.outro(`\\frac{d}{dx} \\int_{a}^{x} f(t)\\,dt = f(x)`, t.takeaway);
    return {
      title: `${t.title} · f(x) = ${plain}`,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        { label: `A(b)`, value: valuePlain(total) },
        { label: 'f(b)', value: latexNumber(round(f(b), 4)) },
      ],
      beats: t.beats,
    };
  },
};
