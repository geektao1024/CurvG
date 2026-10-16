import { expressionOf, functionParam, numberParam } from '../common';
import { latexNumber, toNumpy } from '../expr';
import { ManimScript, niceRange, num, plotSegments, yWindow } from '../manim';
import type { TemplateParamValues, VideoTemplate } from '../types';

const copy = {
  en: {
    title: 'Transforming a graph step by step',
    subtitle: 'y = a·f(b(x − h)) + k, one parameter at a time',
    base: (f: string) => `Start from the parent graph y = ${f}.`,
    b: (b: number) =>
      b < 0
        ? `Replace x with ${b}x: squeeze by ${Math.abs(b)} horizontally and mirror in the y-axis.`
        : b > 1
          ? `Replace x with ${b}x: the graph squeezes toward the y-axis by a factor of ${b}.`
          : `Replace x with ${b}x: the graph stretches away from the y-axis.`,
    h: (h: number) =>
      `Replace x with x ${h > 0 ? '−' : '+'} ${Math.abs(h)}: the graph shifts ${h > 0 ? 'right' : 'left'} by ${Math.abs(h)}.`,
    a: (a: number) =>
      a < 0
        ? `Multiply by ${a}: stretch vertically by ${Math.abs(a)} and flip over the x-axis.`
        : a > 1
          ? `Multiply by ${a}: every height is stretched ${a} times.`
          : `Multiply by ${a}: every height shrinks to ${a} of itself.`,
    k: (k: number) =>
      `Add ${k}: the whole graph moves ${k > 0 ? 'up' : 'down'} by ${Math.abs(k)}.`,
    compare: 'The parent graph and the result, side by side.',
    takeaway:
      'Inside the f changes x (horizontal), outside changes y (vertical)',
    beats: [
      'Parent graph',
      'Horizontal scale',
      'Horizontal shift',
      'Vertical scale',
      'Vertical shift',
      'Compare',
    ],
  },
  zh: {
    title: '一步一步变换函数图像',
    subtitle: 'y = a·f(b(x − h)) + k，一次只动一个参数',
    base: (f: string) => `从原函数 y = ${f} 出发。`,
    b: (b: number) =>
      b < 0
        ? `把 x 换成 ${b}x：横向压缩为原来的 1/${Math.abs(b)}，并关于 y 轴翻折。`
        : b > 1
          ? `把 x 换成 ${b}x：图像向 y 轴压缩为原来的 1/${b}。`
          : `把 x 换成 ${b}x：图像沿横向拉伸。`,
    h: (h: number) =>
      `把 x 换成 x ${h > 0 ? '−' : '+'} ${Math.abs(h)}：图像向${h > 0 ? '右' : '左'}平移 ${Math.abs(h)} 个单位。`,
    a: (a: number) =>
      a < 0
        ? `乘以 ${a}：纵向拉伸 ${Math.abs(a)} 倍，并关于 x 轴翻折。`
        : a > 1
          ? `乘以 ${a}：每个点的高度变成原来的 ${a} 倍。`
          : `乘以 ${a}：每个点的高度缩小为原来的 ${a}。`,
    k: (k: number) =>
      `加上 ${k}：整个图像向${k > 0 ? '上' : '下'}平移 ${Math.abs(k)} 个单位。`,
    compare: '原图像与结果放在一起对比。',
    takeaway:
      'f 里面的改动作用在 x 上（横向），f 外面的改动作用在 y 上（纵向）',
    beats: ['原函数', '横向伸缩', '横向平移', '纵向伸缩', '纵向平移', '对比'],
  },
};

function analyse(params: TemplateParamValues) {
  const base = expressionOf(params, 'f');
  const a = Number(params.a);
  const b = Number(params.b);
  const h = Number(params.h);
  const k = Number(params.k);
  if (a === 0)
    throw new Error('a cannot be 0 (the graph would collapse onto the x-axis)');
  if (b === 0) throw new Error('b cannot be 0');
  if (a === 1 && b === 1 && h === 0 && k === 0)
    throw new Error('Choose at least one change: a, b, h or k');
  return { ...base, a, b, h, k };
}

const n = (value: number) => latexNumber(value);

export const functionTransform: VideoTemplate = {
  id: 'function-transform',
  version: 1,
  category: 'functions',
  title: { en: 'Graph transformations', zh: '函数图像的变换' },
  summary: {
    en: 'Builds y = a·f(b(x − h)) + k from y = f(x) one move at a time: horizontal scale, shift, vertical scale, shift.',
    zh: '从 y = f(x) 出发，依次做横向伸缩、平移、纵向伸缩、平移，得到 y = a·f(b(x − h)) + k。',
  },
  matchHint:
    'Translations, stretches, reflections of a graph; how a, b, h, k change y = a f(b(x-h)) + k; shifting a parabola or sine curve; phase shift and amplitude as transformations. Not: inverse functions, composition in general.',
  examples: [
    {
      prompt: 'How does y = 2(x-1)^2 - 3 come from y = x^2?',
      params: { f: 'x^2', a: 2, b: 1, h: 1, k: -3 },
    },
    {
      prompt: 'y = sin x 怎样变成 y = 3sin(2x + π/2)',
      params: { f: 'sin(x)', a: 3, b: 2, h: -0.785398, k: 0 },
    },
  ],
  params: [
    functionParam({
      default: 'x^2',
      label: { en: 'Parent function f(x)', zh: '原函数 f(x)' },
    }),
    numberParam({
      key: 'a',
      default: 2,
      min: -5,
      max: 5,
      label: { en: 'Vertical scale a', zh: '纵向倍数 a' },
    }),
    numberParam({
      key: 'b',
      default: 1,
      min: -5,
      max: 5,
      label: { en: 'Horizontal factor b', zh: '横向系数 b' },
    }),
    numberParam({
      key: 'h',
      default: 1,
      min: -10,
      max: 10,
      label: { en: 'Horizontal shift h', zh: '横向平移 h' },
    }),
    numberParam({
      key: 'k',
      default: -3,
      min: -10,
      max: 10,
      label: { en: 'Vertical shift k', zh: '纵向平移 k' },
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
  build(params, context) {
    const t = copy[context.locale];
    const { source, f, latex, plain, a, b, h, k } = analyse(params);
    const s = new ManimScript(context);
    s.define('f', 'x', toNumpy(source, { x: 'x' }));

    // Stages in the order that composes cleanly: f(x) → f(bx) → f(b(x−h)) → a·f(…) → a·f(…) + k.
    const stages: Array<{
      key: string;
      fn: (x: number) => number;
      py: string;
      tex: string;
      caption: string;
    }> = [
      {
        key: 'base',
        fn: f,
        py: 'f(x)',
        tex: 'y = f(x)',
        caption: t.base(plain),
      },
    ];
    const inner = (x: number) => b * (x - h);
    if (b !== 1)
      stages.push({
        key: 'b',
        fn: (x) => f(b * x),
        py: `f(${num(b)} * x)`,
        tex: `y = f(${n(b)}x)`,
        caption: t.b(b),
      });
    const shifted =
      h === 0
        ? null
        : b === 1
          ? `x ${h > 0 ? '-' : '+'} ${n(Math.abs(h))}`
          : `${n(b)}\\left(x ${h > 0 ? '-' : '+'} ${n(Math.abs(h))}\\right)`;
    const argTex = shifted ?? (b === 1 ? 'x' : `${n(b)}x`);
    if (h !== 0)
      stages.push({
        key: 'h',
        fn: (x) => f(inner(x)),
        py: `f(${num(b)} * (x - (${num(h)})))`,
        tex: `y = f\\left(${argTex}\\right)`,
        caption: t.h(h),
      });
    if (a !== 1)
      stages.push({
        key: 'a',
        fn: (x) => a * f(inner(x)),
        py: `${num(a)} * f(${num(b)} * (x - (${num(h)})))`,
        tex: `y = ${a === -1 ? '-' : n(a)}f\\left(${argTex}\\right)`,
        caption: t.a(a),
      });
    if (k !== 0)
      stages.push({
        key: 'k',
        fn: (x) => a * f(inner(x)) + k,
        py: `${num(a)} * f(${num(b)} * (x - (${num(h)}))) + ${num(k)}`,
        tex: `y = ${a === 1 ? '' : a === -1 ? '-' : n(a)}f\\left(${argTex}\\right) ${k > 0 ? '+' : '-'} ${n(Math.abs(k))}`,
        caption: t.k(k),
      });

    const xr = niceRange(Math.min(-5, h - 4), Math.max(5, h + 4));
    let lo = Infinity;
    let hi = -Infinity;
    for (const stage of stages) {
      const w = yWindow(stage.fn, xr.min, xr.max);
      lo = Math.min(lo, w.min);
      hi = Math.max(hi, w.max);
    }
    // Keep the interesting part: at most ±12 around the vertical shift.
    const yr = niceRange(
      Math.max(lo, Math.min(-2, k - 12)),
      Math.min(hi, Math.max(2, k + 12))
    );
    const window = { min: yr.min, max: yr.max };

    s.intro(t.title, t.subtitle);
    const ax = s.axes({ name: 'axes', x: xr, y: yr });
    stages.forEach((stage, i) =>
      s.plot(
        `stage_${i}`,
        ax.axes,
        stage.py,
        plotSegments(stage.fn, xr.min, xr.max, window),
        i === 0 ? 'MUTED' : i === stages.length - 1 ? 'AMBER' : 'BLUE'
      )
    );
    s.panelTex('parent', `f(x) = ${latex}`, 0, { color: 'MUTED', size: 38 });
    stages.forEach((stage, i) =>
      s.panelTex(`eq_${i}`, stage.tex, 1.2, {
        color: i === stages.length - 1 ? 'AMBER' : i === 0 ? 'INK' : 'BLUE',
      })
    );

    s.caption(stages[0].caption);
    s.play(
      [`FadeIn(${ax.grid})`, `Create(${ax.axes})`, `FadeIn(${ax.labels})`],
      1.2
    );
    s.play(['Create(stage_0)', 'Write(parent)', 'Write(eq_0)'], 2);
    s.line('current = stage_0.copy()', 'self.add(current)');
    s.wait(1);
    for (let i = 1; i < stages.length; i += 1) {
      s.caption(stages[i].caption);
      s.play(
        [
          `Transform(current, stage_${i}.copy())`,
          `ReplacementTransform(eq_${i - 1}, eq_${i})`,
        ],
        2.2
      );
      s.wait(1.6);
    }
    s.caption(t.compare);
    s.play(
      [`FadeIn(stage_0)`, `Indicate(eq_${stages.length - 1}, color=AMBER)`],
      1.2
    );
    s.wait(2);
    s.outro(`y = a\\,f\\big(b(x-h)\\big) + k`, t.takeaway);
    return {
      title: `${t.title} · ${plain}`,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        {
          label: context.locale === 'zh' ? '结果' : 'Result',
          value: stages[stages.length - 1].tex.replace('y = ', ''),
        },
      ],
      beats: [
        t.beats[0],
        ...stages
          .slice(1)
          .map(
            (stage) =>
              t.beats[
                { b: 1, h: 2, a: 3, k: 4 }[stage.key as 'b' | 'h' | 'a' | 'k']
              ]
          ),
        t.beats[5],
      ],
    };
  },
};
