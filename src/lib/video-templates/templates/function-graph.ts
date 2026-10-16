import {
  expressionOf,
  functionParam,
  functionStage,
  numberParam,
} from '../common';
import { latexNumber } from '../expr';
import { ManimScript, num } from '../manim';
import { extrema, roots, round } from '../numeric';
import { curve, functionWindow } from '../preview';
import type { TemplateParamValues, VideoTemplate } from '../types';

const copy = {
  en: {
    title: (f: string) => `The graph of y = ${f}`,
    subtitle: 'Where it crosses, where it turns',
    draw: 'Trace the curve from left to right.',
    intercept: (y: string) => `It crosses the y-axis at y = ${y}.`,
    zeros: (n: number) =>
      n === 1
        ? 'It meets the x-axis once: that is the zero of f.'
        : `It meets the x-axis ${n} times: the zeros of f.`,
    noZeros: 'In this window it never meets the x-axis: no zeros here.',
    turns: (n: number) =>
      n === 1
        ? 'Here the curve turns: a local extreme.'
        : `The curve turns ${n} times: local maxima and minima.`,
    monotone: 'It never turns in this window: the function is monotonic here.',
    takeaway: 'Zeros, intercept and turning points: the shape at a glance',
    beats: ['The curve', 'y-intercept', 'Zeros', 'Turning points'],
    zerosLabel: 'Zeros',
    extremaLabel: 'Turning points',
    interceptLabel: 'y-intercept',
  },
  zh: {
    title: (f: string) => `函数 y = ${f} 的图像`,
    subtitle: '与坐标轴的交点、拐弯的地方，一次看清',
    draw: '从左到右画出曲线。',
    intercept: (y: string) => `它与 y 轴交于 y = ${y}。`,
    zeros: (n: number) =>
      n === 1
        ? '它与 x 轴相交一次，交点就是 f 的零点。'
        : `它与 x 轴相交 ${n} 次，这些交点是 f 的零点。`,
    noZeros: '在这个范围内曲线没有碰到 x 轴：这里没有零点。',
    turns: (n: number) =>
      n === 1
        ? '曲线在这里拐弯：一个极值点。'
        : `曲线拐了 ${n} 次弯：极大值和极小值。`,
    monotone: '在这个范围内曲线一直没有拐弯：函数单调。',
    takeaway: '零点、截距和极值点：一眼看懂函数的形状',
    beats: ['曲线', 'y 轴截距', '零点', '极值点'],
    zerosLabel: '零点',
    extremaLabel: '极值点',
    interceptLabel: 'y 轴截距',
  },
};

function analyse(params: TemplateParamValues) {
  const expr = expressionOf(params, 'f');
  const xmin = Number(params.xmin);
  const xmax = Number(params.xmax);
  if (!(xmax > xmin)) throw new Error('xmax must be greater than xmin');
  let finite = 0;
  for (let i = 0; i <= 200; i += 1)
    if (Number.isFinite(expr.f(xmin + ((xmax - xmin) * i) / 200))) finite += 1;
  if (finite < 20) throw new Error('f is undefined on most of this window');
  const zeroList = roots(expr.f, xmin, xmax).slice(0, 6);
  const turnList = extrema(expr.f, xmin, xmax).slice(0, 6);
  const intercept =
    xmin <= 0 && xmax >= 0 && Number.isFinite(expr.f(0))
      ? expr.f(0)
      : undefined;
  return { ...expr, xmin, xmax, zeroList, turnList, intercept };
}

const pair = (x: number, y: number) =>
  `(${latexNumber(round(x, 2))},\\ ${latexNumber(round(y, 2))})`;

export const functionGraph: VideoTemplate = {
  id: 'function-graph',
  version: 1,
  category: 'functions',
  title: { en: 'Graph of a function', zh: '函数图像' },
  summary: {
    en: 'Draws y = f(x) and marks what matters: the y-intercept, every zero and every turning point, with coordinates.',
    zh: '画出 y = f(x)，标出 y 轴截距、全部零点和极值点及其坐标。',
  },
  matchHint:
    'Plot or graph a function, show what y = f(x) looks like, zeros/roots, intercepts, maxima and minima of a single function. Not: comparing transformations of a function (use function-transform), quadratic vertex form lessons (use quadratic-function).',
  examples: [
    {
      prompt: 'Graph y = x^3 - 3x',
      params: { f: 'x^3 - 3*x', xmin: -3, xmax: 3 },
    },
    {
      prompt: '画出 y = x·e^(-x) 的图像',
      params: { f: 'x*exp(-x)', xmin: -1, xmax: 6 },
    },
  ],
  params: [
    functionParam({ default: 'x^3 - 3*x' }),
    numberParam({
      key: 'xmin',
      default: -3,
      min: -50,
      max: 50,
      label: { en: 'x from', zh: 'x 起点' },
    }),
    numberParam({
      key: 'xmax',
      default: 3,
      min: -50,
      max: 50,
      label: { en: 'x to', zh: 'x 终点' },
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
    const { f, xmin, xmax, zeroList, turnList, intercept } = analyse(params);
    const extra = [
      ...turnList.map((p) => p.y),
      ...(intercept !== undefined ? [intercept] : []),
    ];
    const view = functionWindow(f, xmin, xmax, {
      include: extra,
      focus: turnList.length || zeroList.length ? extra : undefined,
    });
    return {
      x: view.x,
      y: view.y,
      shapes: [
        ...curve(f, view.x[0], view.x[1], view.window, 'amber', { width: 3 }),
        ...zeroList.map((x) => ({
          kind: 'dot' as const,
          at: [x, 0] as [number, number],
          tone: 'green' as const,
        })),
        ...turnList.map((p) => ({
          kind: 'dot' as const,
          at: [p.x, p.y] as [number, number],
          tone: 'red' as const,
        })),
        ...(intercept !== undefined
          ? [
              {
                kind: 'dot' as const,
                at: [0, intercept] as [number, number],
                tone: 'blue' as const,
              },
            ]
          : []),
      ],
    };
  },
  build(params, context) {
    const t = copy[context.locale];
    const {
      source,
      f,
      latex,
      plain,
      xmin,
      xmax,
      zeroList,
      turnList,
      intercept,
    } = analyse(params);
    const s = new ManimScript(context);
    s.intro(t.title(plain), t.subtitle);
    const stage = functionStage(s, {
      source,
      f,
      xmin,
      xmax,
      include: [
        ...turnList.map((p) => p.y),
        ...(intercept !== undefined ? [intercept] : []),
      ],
      focus:
        turnList.length || zeroList.length
          ? [
              ...turnList.map((p) => p.y),
              ...(intercept !== undefined ? [intercept] : []),
            ]
          : undefined,
    });
    s.panelTex('formula', `y = ${latex}`, 0);
    s.caption(t.draw);
    s.play(
      [
        `FadeIn(${stage.grid})`,
        `Create(${stage.axes})`,
        `FadeIn(${stage.labels})`,
      ],
      1.2
    );
    s.play([`Create(${stage.curve})`, 'Write(formula)'], 3, 'linear');
    s.wait(0.8);

    // Labels sit above maxima and below minima; zeros alternate.
    const dot = (
      name: string,
      x: number,
      y: number,
      color: string,
      direction: string
    ) =>
      s.line(
        `${name} = Dot(${stage.axes}.c2p(${num(x)}, ${num(y)}), radius=0.08, color=${color})`,
        `${name}_label = ${s.tex(pair(x, y), { size: 28, color })}.next_to(${name}, ${direction}, buff=0.15)`
      );
    let row = 1.1;
    const interceptIsZero =
      intercept !== undefined &&
      Math.abs(intercept) < 1e-9 &&
      zeroList.some((x) => Math.abs(x) < 1e-6);
    if (intercept !== undefined && !interceptIsZero) {
      dot('intercept', 0, intercept, 'BLUE', 'RIGHT');
      s.caption(t.intercept(latexNumber(round(intercept, 3))));
      s.play(['FadeIn(intercept, scale=0.5)', 'FadeIn(intercept_label)'], 0.8);
      s.wait(1.2);
    }
    if (zeroList.length) {
      zeroList.forEach((x, i) => dot(`zero_${i}`, x, 0, 'GREEN', 'UR'));
      s.panelMixed(
        'zeros_row',
        t.zerosLabel,
        `x = ${zeroList.map((x) => latexNumber(round(x, 3))).join(',\\ ')}`,
        row,
        { color: 'GREEN' }
      );
      row += 0.9;
      s.caption(t.zeros(zeroList.length));
      s.play(
        [
          ...zeroList.map((_, i) => `FadeIn(zero_${i}, scale=0.5)`),
          ...zeroList.map((_, i) => `FadeIn(zero_${i}_label)`),
          'FadeIn(zeros_row)',
        ],
        1
      );
      s.wait(1.8);
    } else {
      s.caption(t.noZeros);
      s.wait(2);
    }
    if (turnList.length) {
      turnList.forEach((p, i) =>
        dot(`turn_${i}`, p.x, p.y, 'RED', p.kind === 'max' ? 'UP' : 'DOWN')
      );
      s.caption(t.turns(turnList.length));
      s.play(
        [
          ...turnList.map((_, i) => `FadeIn(turn_${i}, scale=0.5)`),
          ...turnList.map((_, i) => `FadeIn(turn_${i}_label)`),
        ],
        1
      );
      s.play(
        turnList.map((_, i) => `Indicate(turn_${i}, color=RED)`),
        1
      );
      s.wait(1.6);
    } else {
      s.caption(t.monotone);
      s.wait(2);
    }
    s.wait(0.6);
    s.outro(`y = ${latex}`, t.takeaway);
    const facts = [
      ...(intercept !== undefined
        ? [{ label: t.interceptLabel, value: latexNumber(round(intercept, 4)) }]
        : []),
      {
        label: t.zerosLabel,
        value: zeroList.length
          ? zeroList.map((x) => latexNumber(round(x, 4))).join(', ')
          : '—',
      },
      {
        label: t.extremaLabel,
        value: turnList.length
          ? turnList
              .map((p) => `${p.kind} (${round(p.x, 3)}, ${round(p.y, 3)})`)
              .join('; ')
          : '—',
      },
    ];
    return {
      title: t.title(plain),
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts,
      beats: t.beats,
    };
  },
};
