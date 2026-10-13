import { pick, type Lab } from '../types';

export const derivativeTangentSlope: Lab = {
  slug: 'derivative-tangent-slope',
  publication: 'public',
  primaryCategoryId: 'rates',
  levels: ['high', 'university'],
  chapterTitle: { en: 'Secant to tangent', zh: '导数的几何意义' },
  title: {
    en: 'Derivative as the slope of a tangent',
    zh: '导数：切线的斜率',
  },
  question: {
    en: 'Why is the derivative the slope of the tangent line?',
    zh: '为什么导数就是切线的斜率？',
  },
  summary: {
    en: 'Shrink the gap between two points on y = x² and watch the secant line turn into the tangent. The limit of its slope is the derivative.',
    zh: '在 y = x² 上把两点的间距不断缩小，看割线怎样转成切线。割线斜率的极限，就是导数。',
  },
  keyPoints: [
    { en: 'Secant slope', zh: '割线斜率' },
    { en: 'Limit definition', zh: '导数定义' },
    { en: 'Tangent line', zh: '切线方程' },
    { en: 'Rate of change', zh: '变化率' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-3.5, 3.5], y: [-1.5, 9], equal: false },
      params: [
        { id: 'x0', label: 'x_0', min: -2, max: 2, step: 0.05, value: 1 },
        {
          id: 'h',
          label: 'h',
          min: 0.02,
          max: 2,
          step: 0.01,
          value: 1.5,
          play: 6,
          bands: [{ from: 0.02, to: 0.15, label: 'h → 0', color: 'green' }],
        },
      ],
      functions: [{ id: 'f', expr: 'x^2' }],
      scalars: [
        { id: 'x1', expr: 'x0 + h' },
        { id: 'y0', expr: 'f(x0)' },
        { id: 'y1', expr: 'f(x1)' },
        { id: 'ms', expr: '(y1 - y0) / h' },
        { id: 'mt', expr: '(f(x0 + 0.00001) - f(x0 - 0.00001)) / 0.00002' },
      ],
      objects: [
        { type: 'function', fn: 'f', color: 'ink', width: 2.6, label: 'y = x²' },
        // Tangent dashed green, secant solid blue: wedulab's colour scheme.
        {
          type: 'line',
          through: ['x0', 'y0'],
          slope: 'mt',
          color: 'green',
          dashed: true,
          width: 2,
        },
        {
          type: 'line',
          through: ['x0', 'y0'],
          to: ['x1', 'y1'],
          color: 'blue',
          width: 2.4,
        },
        {
          type: 'segment',
          from: ['x0', 'y0'],
          to: ['x1', 'y0'],
          color: 'muted',
          dashed: true,
          width: 1.5,
          label: 'h',
          // Too short to read once Q sits on P.
          visible: 'h > 0.3',
        },
        {
          type: 'segment',
          from: ['x1', 'y0'],
          to: ['x1', 'y1'],
          color: 'muted',
          dashed: true,
          width: 1.5,
          label: 'Δy',
          // Too short to read once Q sits on P.
          visible: 'h > 0.3',
        },
        { type: 'point', at: ['x1', 'y1'], color: 'blue', size: 6, label: 'Q' },
        { type: 'point', at: ['x0', 'y0'], color: 'primary', size: 6, label: 'P', drag: { x: 'x0' } },
      ],
      readouts: [
        { label: 'h', expr: 'h', digits: 2 },
        { label: '\\dfrac{\\Delta y}{h}', expr: 'ms', digits: 3 },
        { label: "f'(x_0)", expr: 'mt', digits: 3 },
        { label: t('\\text{gap}', '\\text{差}'), expr: 'ms - mt', digits: 3, highlight: true },
        {
          kind: 'status',
          label: t('Secant vs tangent', '割线与切线'),
          expr: 'abs(ms - mt) < 0.06',
          ok: t('almost the same line', '几乎重合'),
          bad: t('still apart', '还没有重合'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'A wide secant', zh: '一条宽的割线' },
      body: {
        en: 'Start at $P=(1,1)$ with $h=1.5$. The blue secant through $P$ and $Q$ rises $5.25$ over a run of $1.5$, so its slope is $3.5$, far from the tangent.',
        zh: '从 $P=(1,1)$ 出发，取 $h=1.5$。蓝色割线经过 $P$ 和 $Q$，水平走 $1.5$、上升 $5.25$，斜率是 $3.5$，和切线差得很远。',
      },
      set: { x0: 1, h: 1.5 },
    },
    {
      title: { en: 'Halve the gap', zh: '把间距缩小' },
      body: {
        en: 'At $h=0.5$ the slope is $2.5$. Every time $h$ shrinks, the secant swings closer to the dashed green tangent.',
        zh: '$h=0.5$ 时斜率是 $2.5$。$h$ 每缩小一次，割线就向绿色虚线切线转近一点。',
      },
      set: { x0: 1, h: 0.5 },
    },
    {
      title: { en: 'Almost touching', zh: '几乎贴住' },
      body: {
        en: 'At $h=0.05$ the slope reads $2.05$. The pattern is exact: for $y=x^2$ at $x_0=1$ the secant slope is $2+h$, so it approaches $2$.',
        zh: '$h=0.05$ 时斜率是 $2.05$。规律是精确的：在 $x_0=1$ 处，割线斜率恰好等于 $2+h$，所以它趋近于 $2$。',
      },
      set: { x0: 1, h: 0.05 },
    },
    {
      title: { en: 'Move the point', zh: '换一个点' },
      body: {
        en: 'Slide to $x_0=-1$. The tangent now falls: its slope is $-2$. The derivative of $x^2$ is $2x$, a new slope for every point.',
        zh: '把点移到 $x_0=-1$，切线变成下降的，斜率是 $-2$。$x^2$ 的导数是 $2x$：每个点都有自己的斜率。',
      },
      set: { x0: -1, h: 0.05 },
    },
  ],
  sections: [
    {
      id: 'secant',
      title: { en: 'What a secant measures', zh: '割线量的是什么' },
      body: {
        en: 'A secant joins two points of a curve, $P=(x_0, f(x_0))$ and $Q=(x_0+h, f(x_0+h))$. Its slope is the **average rate of change** over that interval:\n\n$$\\frac{f(x_0+h)-f(x_0)}{h}$$\n\nIt answers "how fast, on average, between these two points", not "how fast at $P$".',
        zh: '割线连接曲线上的两点 $P=(x_0, f(x_0))$ 与 $Q=(x_0+h, f(x_0+h))$。它的斜率是这一段上的**平均变化率**：\n\n$$\\frac{f(x_0+h)-f(x_0)}{h}$$\n\n它回答的是"这两点之间平均变得多快"，而不是"在 $P$ 这一点变得多快"。',
      },
    },
    {
      id: 'limit',
      title: { en: 'From secant to tangent', zh: '从割线到切线' },
      body: {
        en: 'Let $Q$ slide toward $P$ by shrinking $h$. The secants settle on one line, the tangent, and their slopes settle on one number. That number is the derivative:\n\n$$f\'(x_0)=\\lim_{h\\to 0}\\frac{f(x_0+h)-f(x_0)}{h}$$\n\nYou cannot just set $h=0$: the quotient becomes $\\frac{0}{0}$. The limit asks what the slopes approach, which is why the board never lets $h$ reach zero.',
        zh: '缩小 $h$，让 $Q$ 沿曲线滑向 $P$。割线会稳定到同一条直线上，就是切线；它们的斜率也稳定到同一个数，就是导数：\n\n$$f\'(x_0)=\\lim_{h\\to 0}\\frac{f(x_0+h)-f(x_0)}{h}$$\n\n不能直接令 $h=0$，那样会得到 $\\frac{0}{0}$。极限问的是斜率趋近于什么，所以画板上的 $h$ 永远到不了零。',
      },
    },
    {
      id: 'example',
      title: { en: 'Worked example: y = x² at x = 1', zh: '例题：y = x² 在 x = 1 处' },
      body: {
        en: 'Expand the difference quotient:\n\n$$\\frac{(1+h)^2-1^2}{h}=\\frac{2h+h^2}{h}=2+h$$\n\nAs $h\\to 0$ this goes to $2$, so $f\'(1)=2$. The tangent passes through $(1,1)$ with slope $2$:\n\n$$y-1=2(x-1)\\quad\\Longrightarrow\\quad y=2x-1$$',
        zh: '把差商展开：\n\n$$\\frac{(1+h)^2-1^2}{h}=\\frac{2h+h^2}{h}=2+h$$\n\n当 $h\\to 0$ 时它趋于 $2$，所以 $f\'(1)=2$。切线过 $(1,1)$、斜率为 $2$：\n\n$$y-1=2(x-1)\\quad\\Longrightarrow\\quad y=2x-1$$',
      },
    },
    {
      id: 'general',
      title: { en: 'The derivative is a function', zh: '导数本身是一个函数' },
      body: {
        en: 'Repeat the computation at any $x_0$: $\\frac{(x_0+h)^2-x_0^2}{h}=2x_0+h\\to 2x_0$. So $(x^2)\'=2x$. Negative $x$ gives a falling tangent, $x=0$ gives a flat one, and the slope grows the further right you go.',
        zh: '在任意 $x_0$ 处重复这个计算：$\\frac{(x_0+h)^2-x_0^2}{h}=2x_0+h\\to 2x_0$，所以 $(x^2)\'=2x$。$x$ 为负时切线下降，$x=0$ 时切线水平，越往右斜率越大。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'For $f(x)=x^2$ at $x_0=1$, what is the secant slope when $h=0.1$?',
        zh: '对 $f(x)=x^2$，在 $x_0=1$ 处取 $h=0.1$，割线斜率是多少？',
      },
      choices: [
        { en: '$2$', zh: '$2$' },
        { en: '$2.1$', zh: '$2.1$' },
        { en: '$1.1$', zh: '$1.1$' },
        { en: '$0.21$', zh: '$0.21$' },
      ],
      answer: 1,
      explanation: {
        en: 'The secant slope is $2+h$, so $2.1$. The tangent slope $2$ is only reached in the limit.',
        zh: '割线斜率是 $2+h$，所以是 $2.1$。切线斜率 $2$ 只在极限中达到。',
      },
    },
    {
      question: {
        en: 'Why can we not simply substitute $h=0$ into the difference quotient?',
        zh: '为什么不能直接把 $h=0$ 代入差商？',
      },
      choices: [
        { en: 'It gives $\\frac{0}{0}$, which has no value', zh: '会得到 $\\frac{0}{0}$，没有意义' },
        { en: 'It always gives $0$', zh: '结果总是 $0$' },
        { en: 'It gives the secant slope', zh: '得到的是割线斜率' },
        { en: 'It is allowed for polynomials', zh: '多项式可以直接代入' },
      ],
      answer: 0,
      explanation: {
        en: 'Both numerator and denominator are $0$. Simplify first ($2+h$), then take the limit.',
        zh: '分子分母都是 $0$。要先化简成 $2+h$，再取极限。',
      },
    },
    {
      question: {
        en: 'What is the tangent line to $y=x^2$ at $x=-1$?',
        zh: '$y=x^2$ 在 $x=-1$ 处的切线是？',
      },
      choices: [
        { en: '$y=-2x-1$', zh: '$y=-2x-1$' },
        { en: '$y=2x+1$', zh: '$y=2x+1$' },
        { en: '$y=-2x+1$', zh: '$y=-2x+1$' },
        { en: '$y=-x$', zh: '$y=-x$' },
      ],
      answer: 0,
      explanation: {
        en: 'Slope $2\\cdot(-1)=-2$ through $(-1,1)$: $y-1=-2(x+1)$, so $y=-2x-1$.',
        zh: '斜率 $2\\cdot(-1)=-2$，过点 $(-1,1)$：$y-1=-2(x+1)$，即 $y=-2x-1$。',
      },
    },
  ],
  resultTex: "\\frac{\\Delta y}{h} \\;\\to\\; f'(x_0)",
  curveSlugs: ['parabola'],
  related: ['riemann-sum-area', 'quadratic-transformations'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Animate why the derivative is the slope of a tangent line: on y = x², shrink a secant from P(1,1) until it becomes the tangent y = 2x − 1, showing the slope 2 + h approach 2.',
    zh: '用动画解释为什么导数是切线斜率：在 y = x² 上，从 P(1,1) 出发让割线不断缩小，直到变成切线 y = 2x − 1，同时显示斜率 2 + h 趋近于 2。',
  },
};
