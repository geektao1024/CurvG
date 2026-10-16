import {
  expressionOf,
  functionParam,
  functionStage,
  numberParam,
} from '../common';
import { latexNumber } from '../expr';
import { ManimScript, num } from '../manim';
import {
  equalsLatex,
  finiteOn,
  integrate,
  round,
  valuePlain,
} from '../numeric';
import type { TemplateParamValues, VideoTemplate } from '../types';

const RULES = {
  left: { offset: 0, sample: 'left', en: 'left endpoints', zh: '左端点' },
  right: { offset: 1, sample: 'right', en: 'right endpoints', zh: '右端点' },
  midpoint: { offset: 0.5, sample: 'center', en: 'midpoints', zh: '中点' },
} as const;

type Rule = keyof typeof RULES;

const copy = {
  en: {
    title: 'Riemann sums become the integral',
    subtitle: 'More, thinner rectangles: the area appears',
    area: (a: string, b: string) =>
      `We want the area under the curve from x = ${a} to x = ${b}.`,
    one: (rule: string) =>
      `Estimate it with one rectangle, its height taken at the ${rule}.`,
    more: 'Split the interval: 4 rectangles hug the curve more closely.',
    many: (n: number) =>
      `Keep splitting. With ${n} rectangles the sum barely moves.`,
    exact: (v: string) =>
      `The sums close in on one number: the integral, ${v}.`,
    signed: 'Below the axis, a rectangle counts as negative area.',
    takeaway: (v: string) => `The limit of the sums is the integral: ${v}`,
    beats: [
      'The region',
      'One rectangle',
      'Four rectangles',
      'Many rectangles',
      'The limit',
    ],
  },
  zh: {
    title: '黎曼和逼近定积分',
    subtitle: '矩形越多越窄，面积就出来了',
    area: (a: string, b: string) => `求曲线下从 x = ${a} 到 x = ${b} 的面积。`,
    one: (rule: string) => `先用一个矩形估计，高度取${rule}的函数值。`,
    more: '把区间等分：4 个矩形贴得更紧。',
    many: (n: number) => `继续细分。分成 ${n} 个矩形，和几乎不再变化。`,
    exact: (v: string) => `这些和逼近同一个数：定积分 ${v}。`,
    signed: '在 x 轴下方的矩形按负面积计算。',
    takeaway: (v: string) => `黎曼和的极限就是定积分：${v}`,
    beats: ['要求的面积', '1 个矩形', '4 个矩形', '许多矩形', '取极限'],
  },
};

function analyse(params: TemplateParamValues) {
  const { source, f, latex, plain } = expressionOf(params, 'f');
  const a = Number(params.a);
  const b = Number(params.b);
  if (!(b > a)) throw new Error('b must be greater than a');
  if (!finiteOn(f, a, b, 800))
    throw new Error(`f must be defined on [${a}, ${b}]`);
  const exact = integrate(f, a, b);
  if (!Number.isFinite(exact))
    throw new Error('The integral does not converge');
  const rule =
    (String(params.rule) as Rule) in RULES
      ? (String(params.rule) as Rule)
      : 'right';
  const sum = (n: number) => {
    const dx = (b - a) / n;
    let total = 0;
    for (let i = 0; i < n; i += 1)
      total += f(a + dx * (i + RULES[rule].offset));
    return total * dx;
  };
  return {
    source,
    f,
    latex,
    plain,
    a,
    b,
    exact,
    rule,
    sum,
    n: Number(params.n),
  };
}

export const riemannSum: VideoTemplate = {
  id: 'riemann-sum',
  version: 1,
  category: 'calculus',
  title: { en: 'Riemann sums and the definite integral', zh: '黎曼和与定积分' },
  summary: {
    en: 'Rectangles under a curve multiply from 1 to n; the running sum converges to the exact integral.',
    zh: '曲线下的矩形从 1 个增加到 n 个，矩形面积之和收敛到定积分的精确值。',
  },
  matchHint:
    'Riemann sums, area under a curve by rectangles, definite integral as a limit of sums, left/right/midpoint rule, approximating an integral. Not: integration techniques (substitution, by parts), volumes of revolution.',
  examples: [
    {
      prompt:
        'Show how Riemann sums approach the area under y = x^2 from 0 to 1.',
      params: { f: 'x^2', a: 0, b: 1, n: 32, rule: 'right' },
    },
    {
      prompt: '用矩形逼近 sin x 在 0 到 π 上的面积',
      params: { f: 'sin(x)', a: 0, b: 3.14159, n: 32, rule: 'midpoint' },
    },
  ],
  params: [
    functionParam({ default: 'x^2' }),
    numberParam({
      key: 'a',
      default: 0,
      min: -20,
      max: 20,
      label: { en: 'From x = a', zh: '下限 a' },
    }),
    numberParam({
      key: 'b',
      default: 1,
      min: -20,
      max: 20,
      label: { en: 'To x = b', zh: '上限 b' },
    }),
    numberParam({
      key: 'n',
      default: 32,
      min: 8,
      max: 64,
      integer: true,
      label: { en: 'Final rectangles n', zh: '最终矩形数 n' },
    }),
    {
      key: 'rule',
      type: 'choice',
      default: 'right',
      label: { en: 'Height taken at', zh: '矩形高度取' },
      options: [
        { value: 'left', label: { en: 'Left endpoint', zh: '左端点' } },
        { value: 'right', label: { en: 'Right endpoint', zh: '右端点' } },
        { value: 'midpoint', label: { en: 'Midpoint', zh: '中点' } },
      ],
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
    const { source, f, latex, plain, a, b, exact, rule, sum, n } =
      analyse(params);
    const pad = (b - a) * 0.18;
    const s = new ManimScript(context);
    const aText = latexNumber(round(a, 4));
    const bText = latexNumber(round(b, 4));
    const exactText = valuePlain(exact);
    const signed = (() => {
      for (let i = 0; i <= 200; i += 1)
        if (f(a + ((b - a) * i) / 200) < -1e-9) return true;
      return false;
    })();

    s.intro(t.title, t.subtitle);
    const stage = functionStage(s, {
      source,
      f,
      xmin: a - pad,
      xmax: b + pad,
      include: [0],
    });
    const offset = RULES[rule].offset;
    s.module(
      'def riemann(n):',
      '    n = max(1, int(round(n)))',
      `    dx = (${num(b)} - ${num(a)}) / n`,
      `    xs = ${num(a)} + dx * (np.arange(n) + ${num(offset)})`,
      '    return float(np.sum(f(xs) + 0 * xs) * dx)'
    );
    s.panelTex('formula', `f(x) = ${latex}`, 0);
    s.panelTex('interval', `x \\in [${aText},\\ ${bText}]`, 1, {
      color: 'MUTED',
      size: 36,
    });
    s.line(
      `region = ${stage.axes}.get_area(${stage.axes}.plot(f, x_range=[${num(a)}, ${num(b)}, ${num((b - a) / 240)}]), x_range=[${num(a)}, ${num(b)}], color=AMBER, opacity=0.22)`,
      `rgraph = ${stage.axes}.plot(f, x_range=[${num(a)}, ${num(b)}, ${num((b - a) / 240)}])`,
      'n = ValueTracker(1)',
      `rects = always_redraw(lambda: ${stage.axes}.get_riemann_rectangles(rgraph, x_range=[${num(a)}, ${num(b)}], dx=(${num(b)} - ${num(a)}) / max(1, round(n.get_value())), input_sample_type="${RULES[rule].sample}", stroke_width=1, stroke_color=BG, fill_opacity=0.62, color=BLUE, show_signed_area=True))`
    );
    const nRead = s.readout('n_value', 'n =', 'round(n.get_value())', 2, {
      color: 'BLUE',
      decimals: 0,
    });
    const sumRead = s.readout('s_value', 'S_n =', 'riemann(n.get_value())', 3, {
      decimals: 4,
    });

    s.caption(t.area(aText, bText));
    s.play(
      [
        `FadeIn(${stage.grid})`,
        `Create(${stage.axes})`,
        `FadeIn(${stage.labels})`,
      ],
      1.2
    );
    s.play(
      [`Create(${stage.curve})`, 'Write(formula)', 'FadeIn(interval)'],
      1.8
    );
    s.play('FadeIn(region)', 1);
    s.wait(1);

    s.caption(t.one(RULES[rule][context.locale]));
    s.play(
      [
        'FadeOut(region)',
        'FadeIn(rects)',
        `FadeIn(${nRead.label})`,
        `FadeIn(${nRead.value})`,
        `FadeIn(${sumRead.label})`,
        `FadeIn(${sumRead.value})`,
      ],
      1.2
    );
    s.wait(1.6);
    if (signed) {
      s.caption(t.signed);
      s.wait(2);
    }

    s.caption(t.more);
    s.play('n.animate.set_value(4)', 2, 'linear');
    s.wait(1.6);

    s.caption(t.many(n));
    s.play('n.animate.set_value(12)', 2.2, 'linear');
    s.play(`n.animate.set_value(${num(n)})`, 3, 'linear');
    s.wait(1.4);

    s.panelTex(
      'exact',
      `\\int_{${aText}}^{${bText}} f(x)\\,dx ${equalsLatex(exact)}`,
      4.4,
      { color: 'AMBER' }
    );
    s.caption(t.exact(exactText));
    s.play('Write(exact)', 1.4);
    s.play('Indicate(exact, color=AMBER)', 1);
    s.wait(2);

    s.outro(
      `\\int_{${aText}}^{${bText}} ${latex}\\,dx = \\lim_{n \\to \\infty} \\sum_{i=1}^{n} f(x_i)\\,\\Delta x ${equalsLatex(exact)}`,
      t.takeaway(exactText)
    );
    return {
      title: `${t.title} · ${plain}`,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        { label: `S_4`, value: latexNumber(round(sum(4), 4)) },
        { label: `S_${n}`, value: latexNumber(round(sum(n), 4)) },
        { label: `∫ f dx`, value: exactText },
      ],
      beats: t.beats,
    };
  },
};
