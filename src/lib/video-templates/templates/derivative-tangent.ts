import {
  checkExpression,
  fn1,
  latexNumber,
  toLatex,
  toNumpy,
  toPlain,
} from '../expr';
import { ManimScript, niceRange, num, plotSegments, yWindow } from '../manim';
import type { TemplateParamValues, VideoTemplate } from '../types';

const copy = {
  en: {
    title: 'The derivative is a slope',
    subtitle: 'Watch a secant turn into the tangent line',
    curve: (f: string) => `Start with the curve y = ${f}.`,
    point: (a: string) => `Pick the point P where x = ${a}.`,
    secant:
      'Q is a second point on the curve. The secant PQ has slope Δy / Δx.',
    shrink: 'Slide Q toward P: as h shrinks, the slope settles.',
    left: 'From the left side, the slope settles on the same number.',
    tangent: (v: string) =>
      `That limit is the derivative: the tangent at P has slope ${v}.`,
    takeaway: (v: string) => `f′(a) = ${v}: the slope of the tangent at P`,
    slope: 'slope',
    beats: [
      'The curve',
      'The point P',
      'A secant through Q',
      'h → 0 from the right',
      'h → 0 from the left',
      'The tangent line',
    ],
  },
  zh: {
    title: '导数就是切线的斜率',
    subtitle: '看割线如何变成切线',
    curve: (f: string) => `先画出曲线 y = ${f}。`,
    point: (a: string) => `在 x = ${a} 处取一点 P。`,
    secant: '曲线上再取一点 Q，割线 PQ 的斜率是 Δy / Δx。',
    shrink: '让 Q 沿曲线滑向 P：h 越来越小，斜率趋于稳定。',
    left: '从左侧逼近，斜率趋向同一个数。',
    tangent: (v: string) => `这个极限就是导数：P 点切线的斜率是 ${v}。`,
    takeaway: (v: string) => `f′(a) = ${v}，就是 P 点切线的斜率`,
    slope: '斜率',
    beats: [
      '画出曲线',
      '取点 P',
      '过 Q 的割线',
      'h 从右侧趋于 0',
      'h 从左侧趋于 0',
      '切线',
    ],
  },
};

/** Central difference with one Richardson step: error O(h^4). */
function derivative(f: (x: number) => number, a: number): number {
  const d = (h: number) => (f(a + h) - f(a - h)) / (2 * h);
  const h = 1e-3 * Math.max(1, Math.abs(a));
  return (4 * d(h / 2) - d(h)) / 3;
}

function oneSided(f: (x: number) => number, a: number, side: 1 | -1): number {
  const h = 1e-6 * Math.max(1, Math.abs(a));
  return (f(a + side * h) - f(a)) / (side * h);
}

function analyse(params: TemplateParamValues) {
  const source = checkExpression(String(params.f), ['x']).source;
  const f = fn1(source);
  const a = Number(params.a);
  const fa = f(a);
  if (!Number.isFinite(fa)) {
    throw new Error(`f is not defined at x = ${a}`);
  }
  const slope = derivative(f, a);
  const right = oneSided(f, a, 1);
  const left = oneSided(f, a, -1);
  const scale = Math.max(1, Math.abs(slope));
  if (
    !Number.isFinite(slope) ||
    !Number.isFinite(left) ||
    !Number.isFinite(right) ||
    Math.abs(left - right) > 1e-3 * scale + 1e-4 ||
    Math.abs(slope) > 1e4
  ) {
    throw new Error(`f has no tangent slope at x = ${a}`);
  }
  // The farthest Q (|h| <= 2) with the curve finite between P and Q.
  const reach = (side: 1 | -1) => {
    for (const h of [1.5, 1, 0.6, 0.3]) {
      let finite = true;
      for (let i = 1; i <= 40; i += 1) {
        if (!Number.isFinite(f(a + (side * h * i) / 40))) finite = false;
      }
      if (finite) return side * h;
    }
    return side * 0.3;
  };
  return { source, f, a, fa, slope, hRight: reach(1), hLeft: reach(-1) };
}

export const derivativeTangent: VideoTemplate = {
  id: 'derivative-tangent',
  version: 1,
  category: 'calculus',
  title: { en: 'Derivative as the slope of a tangent', zh: '导数：切线的斜率' },
  summary: {
    en: 'A secant through P and Q turns into the tangent as h → 0, from both sides; the slope readout lands on f′(a).',
    zh: '割线 PQ 在 h → 0 时从两侧变成切线，斜率读数落在 f′(a) 上。',
  },
  matchHint:
    'Derivative at a point, tangent line, slope of a curve, secant to tangent, instantaneous rate of change, limit definition of the derivative. Not: derivative rules proofs (product/chain rule), optimization word problems, implicit differentiation.',
  examples: [
    {
      prompt: 'Why is the derivative the slope of the tangent line?',
      params: { f: 'x^2', a: 1 },
    },
    { prompt: '用动画解释 sin x 在 0 处的导数', params: { f: 'sin(x)', a: 0 } },
    {
      prompt: 'tangent line to y = x^3 - 3x at x = 2',
      params: { f: 'x^3 - 3*x', a: 2 },
    },
  ],
  params: [
    {
      key: 'f',
      type: 'expression',
      variables: ['x'],
      default: 'x^2',
      label: { en: 'Function f(x)', zh: '函数 f(x)' },
      help: {
        en: 'Use * for products: 3*x^2 - 1',
        zh: '乘号写成 *：3*x^2 - 1',
      },
    },
    {
      key: 'a',
      type: 'number',
      default: 1,
      min: -10,
      max: 10,
      step: 0.5,
      label: { en: 'Point x = a', zh: '切点 x = a' },
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
    const { source, f, a, fa, slope, hRight, hLeft } = analyse(params);
    const s = new ManimScript(context);
    const fLatex = toLatex(source);
    const slopeText = latexNumber(Number(slope.toFixed(4)));
    const aText = latexNumber(a);

    const xr = niceRange(a - 2.4, a + 2.4);
    const yw = yWindow(f, xr.min, xr.max);
    const yr = niceRange(Math.min(yw.min, fa - 1), Math.max(yw.max, fa + 1));
    s.define('f', 'x', toNumpy(source, { x: 'x' }));

    s.intro(t.title, t.subtitle);
    const { axes, grid, labels } = s.axes({ name: 'axes', x: xr, y: yr });
    const curve = s.plot(
      'curve',
      axes,
      'f(x)',
      plotSegments(f, xr.min, xr.max, { min: yr.min, max: yr.max })
    );
    const g = s.geometry;
    const panelX = g.panel.x;
    s.line(
      `formula = ${s.tex(`f(x) = ${fLatex}`, { size: s.landscape ? 44 : 46 })}`,
      `if formula.width > ${num(g.panel.width)}: formula.scale_to_fit_width(${num(g.panel.width)})`,
      s.landscape
        ? `formula.move_to([${num(panelX)}, 2.1, 0])`
        : `formula.move_to([0, ${num(g.panel.y + 0.6)}, 0])`
    );
    s.caption(t.curve(toPlain(source)));
    s.play([`FadeIn(${grid})`, `Create(${axes})`, `FadeIn(${labels})`], 1.4);
    s.play([`Create(${curve})`, 'Write(formula)'], 2);
    s.wait(0.6);

    s.line(
      `P = Dot(${axes}.c2p(${num(a)}, ${num(fa)}), radius=0.09, color=INK)`,
      `P_label = ${s.tex('P', { size: 36 })}.next_to(P, UL, buff=0.12)`
    );
    s.caption(t.point(aText));
    s.play(['FadeIn(P, scale=0.5)', 'FadeIn(P_label)'], 0.8);
    s.wait(0.6);

    // h drives Q, the secant and both readouts.
    s.line(
      `h = ValueTracker(${num(hRight)})`,
      `Q = always_redraw(lambda: Dot(${axes}.c2p(${num(a)} + h.get_value(), f(${num(a)} + h.get_value())), radius=0.09, color=BLUE))`,
      `secant = always_redraw(lambda: line_through(${axes}, ${num(a)}, ${num(fa)}, (f(${num(a)} + h.get_value()) - ${num(fa)}) / h.get_value(), ${num(xr.min)}, ${num(xr.max)}, ${num(yr.min)}, ${num(yr.max)}, BLUE))`,
      `h_label = ${s.tex('h =', { size: 40, color: 'BLUE' })}`,
      `slope_label = ${s.tex('\\frac{f(a+h)-f(a)}{h} =', { size: 40 })}`,
      s.landscape
        ? `h_label.move_to([${num(panelX - 1.2)}, 0.9, 0])`
        : `h_label.move_to([-2.6, ${num(g.panel.y - 0.35)}, 0])`,
      s.landscape
        ? `slope_label.next_to(h_label, DOWN, buff=0.55).align_to(h_label, LEFT)`
        : `slope_label.move_to([0.9, ${num(g.panel.y - 0.35)}, 0])`,
      'h_value = always_redraw(lambda: DecimalNumber(h.get_value(), num_decimal_places=3, font_size=40, color=BLUE).next_to(h_label, RIGHT, buff=0.15))',
      `slope_value = always_redraw(lambda: DecimalNumber((f(${num(a)} + h.get_value()) - ${num(fa)}) / h.get_value(), num_decimal_places=3, font_size=40, color=INK).next_to(slope_label, RIGHT, buff=0.15))`
    );
    s.caption(t.secant);
    s.play(['FadeIn(Q, scale=0.5)', 'FadeIn(secant)'], 1);
    s.play(
      [
        'FadeIn(h_label)',
        'FadeIn(h_value)',
        'FadeIn(slope_label)',
        'FadeIn(slope_value)',
      ],
      0.8
    );
    s.wait(1);

    s.caption(t.shrink);
    s.play(`h.animate.set_value(${num(Math.sign(hRight) * 0.01)})`, 4.5);
    s.wait(1);

    s.line(`h.set_value(${num(hLeft)})`);
    s.caption(t.left);
    s.play(`h.animate.set_value(${num(Math.sign(hLeft) * 0.01)})`, 4);
    s.wait(1);

    s.line(
      `tangent = line_through(${axes}, ${num(a)}, ${num(fa)}, ${num(slope)}, ${num(xr.min)}, ${num(xr.max)}, ${num(yr.min)}, ${num(yr.max)}, AMBER, 6)`,
      `d_label = ${s.tex(`f'(${aText}) =`, { size: 44, color: 'AMBER' })}`,
      `d_value = ${s.tex(slopeText, { size: 44, color: 'AMBER' })}`,
      'd_value.next_to(d_label, RIGHT, buff=0.15)',
      `d_group = VGroup(d_label, d_value)`,
      s.landscape
        ? `d_group.next_to(slope_label, DOWN, buff=0.7).align_to(slope_label, LEFT)`
        : `d_group.move_to([0, ${num(g.panel.y - 1.25)}, 0])`
    );
    s.caption(t.tangent(slopeText));
    s.play(['FadeOut(Q)', 'FadeOut(secant)', 'Create(tangent)'], 1.4);
    s.play(['Write(d_group)', 'Indicate(P, color=AMBER)'], 1.2);
    s.wait(2.4);

    s.outro(
      `f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}`,
      t.takeaway(slopeText)
    );

    const tangentLine = `y = ${slopeText}(x - ${aText}) + ${latexNumber(Number(fa.toFixed(4)))}`;
    return {
      title: `${t.title} · f(x) = ${toPlain(source)}`,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        { label: 'f(a)', value: latexNumber(Number(fa.toFixed(6))) },
        { label: "f'(a)", value: slopeText },
        {
          label: context.locale === 'zh' ? '切线' : 'Tangent',
          value: tangentLine,
        },
      ],
      beats: t.beats,
    };
  },
};
