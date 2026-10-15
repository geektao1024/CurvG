import { pick, type Lab } from '../types';

export const riemannSumArea: Lab = {
  slug: 'riemann-sum-area',
  publication: 'public',
  levels: ['high', 'university'],
  chapterTitle: { en: 'Riemann sums', zh: '定积分与黎曼和' },
  title: {
    en: 'Integral as area: Riemann sums',
    zh: '定积分即面积：黎曼和',
  },
  question: {
    en: 'How do thin rectangles add up to the exact area under a curve?',
    zh: '细长的矩形怎样拼出曲线下方的精确面积？',
  },
  summary: {
    en: 'Fill the region under y = x²/4 + 1/2 with rectangles, then add more of them. The total closes in on the integral, and the error shrinks like 1/n.',
    zh: '用矩形填满 y = x²/4 + 1/2 下方的区域，再不断增加矩形数量。总面积逐渐逼近定积分，误差大约按 1/n 缩小。',
  },
  keyPoints: [
    { en: 'Riemann sum', zh: '黎曼和' },
    { en: 'Definite integral', zh: '定积分' },
    { en: 'Limit of a sum', zh: '和式的极限' },
    { en: 'Fundamental theorem', zh: '微积分基本定理' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-0.6, 4.6], y: [-0.6, 5.2], equal: false },
      params: [
        { id: 'n', label: 'n', min: 1, max: 60, step: 1, value: 4, play: 8 },
        { id: 'b', label: 'b', min: 0.5, max: 4, step: 0.05, value: 3 },
      ],
      functions: [{ id: 'f', expr: 'x^2 / 4 + 0.5' }],
      scalars: [
        { id: 'dx', expr: 'b / n' },
        // Left sum in closed form: Σ_{i=0}^{n-1} f(i·dx) · dx
        { id: 'L', expr: 'dx * (dx^2 / 4 * (n - 1) * n * (2 * n - 1) / 6 + 0.5 * n)' },
        { id: 'A', expr: 'b^3 / 12 + b / 2' },
        { id: 'err', expr: 'A - L' },
      ],
      objects: [
        { type: 'area', fn: 'f', from: 0, to: 'b', color: 'primary', opacity: 0.12 },
        {
          type: 'riemann',
          fn: 'f',
          from: 0,
          to: 'b',
          n: 'n',
          rule: 'left',
          color: 'blue',
          opacity: 0.2,
          width: 1.2,
        },
        { type: 'function', fn: 'f', color: 'ink', width: 2.6, label: 'y = x²/4 + 1/2' },
        { type: 'segment', from: ['b', 0], to: ['b', 'f(b)'], color: 'primary', dashed: true, width: 2 },
        { type: 'point', at: ['b', 0], color: 'primary', size: 6, label: 'b', drag: { x: 'b' } },
      ],
      readouts: [
        { label: 'n', expr: 'n', digits: 0 },
        { label: '\\Delta x', expr: 'dx', digits: 3 },
        { label: 'L_n', expr: 'L', digits: 4 },
        { label: '\\int_0^b f\\,dx', expr: 'A', digits: 4 },
        { label: t('\\text{error}', '\\text{误差}'), expr: 'err', digits: 4, highlight: true },
        {
          kind: 'status',
          label: t('Error under 0.01', '误差小于 0.01'),
          expr: 'abs(err) < 0.01',
          ok: t('yes', '是'),
          bad: t('not yet', '还没有'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Two rough blocks', zh: '两块粗糙的矩形' },
      body: {
        en: 'With $n=2$ on $[0,3]$ each rectangle takes its height from its left edge. Because the curve rises, every block falls short: the sum is $2.34$ against an exact area of $3.75$.',
        zh: '在 $[0,3]$ 上取 $n=2$，每个矩形的高取左端点的函数值。曲线在上升，所以每块都偏矮：面积和是 $2.34$，而精确面积是 $3.75$。',
      },
      set: { n: 2, b: 3 },
    },
    {
      title: { en: 'Four blocks', zh: '四块矩形' },
      body: {
        en: 'At $n=4$ the sum is $2.98$. The gaps between the staircase and the curve are the error, and each gap is a thin sliver.',
        zh: '$n=4$ 时面积和是 $2.98$。台阶和曲线之间的空隙就是误差，每一块空隙都是细细的一条。',
      },
      set: { n: 4, b: 3 },
    },
    {
      title: { en: 'Sixteen blocks', zh: '十六块矩形' },
      body: {
        en: 'At $n=16$ the sum is $3.54$ and the error is about $0.21$. Quadrupling $n$ cut the error by roughly four.',
        zh: '$n=16$ 时面积和是 $3.54$，误差约 $0.21$。$n$ 变成四倍，误差大约缩小到四分之一。',
      },
      set: { n: 16, b: 3 },
    },
    {
      title: { en: 'The limit is the integral', zh: '极限就是积分' },
      body: {
        en: 'At $n=60$ the staircase is almost the curve and the sum is $3.69$. As $n\\to\\infty$ it reaches $\\int_0^3 f(x)\\,dx = 3.75$ exactly.',
        zh: '$n=60$ 时台阶几乎贴着曲线，面积和是 $3.69$。当 $n\\to\\infty$，它恰好达到 $\\int_0^3 f(x)\\,dx = 3.75$。',
      },
      set: { n: 60, b: 3 },
    },
  ],
  sections: [
    {
      id: 'idea',
      title: { en: 'Slice, approximate, add', zh: '切开、近似、相加' },
      body: {
        en: 'Area under a straight line is easy; area under a curve is not. So cut $[a,b]$ into $n$ strips of width $\\Delta x=\\frac{b-a}{n}$ and pretend each strip is a rectangle. Its height is the function value at one sample point $x_i$ in the strip.\n\n$$L_n=\\sum_{i=0}^{n-1} f(x_i)\\,\\Delta x$$\n\nThis is a **Riemann sum**. On the board the sample is the left edge of each strip, so $L_n$ is a left sum.',
        zh: '直线下方的面积好算，曲线下方的不好算。于是把 $[a,b]$ 切成 $n$ 条宽为 $\\Delta x=\\frac{b-a}{n}$ 的窄条，把每一条近似看成矩形，高取窄条里某个采样点 $x_i$ 的函数值。\n\n$$L_n=\\sum_{i=0}^{n-1} f(x_i)\\,\\Delta x$$\n\n这就是**黎曼和**。画板上的采样点取每条的左端点，所以 $L_n$ 是左和。',
      },
    },
    {
      id: 'limit',
      title: { en: 'The definite integral', zh: '定积分的定义' },
      body: {
        en: 'More strips make thinner slivers of error. The definite integral is the value the sums approach:\n\n$$\\int_a^b f(x)\\,dx=\\lim_{n\\to\\infty}\\sum_{i=0}^{n-1} f(x_i)\\,\\Delta x$$\n\nFor a continuous function the limit is the same whichever sample point you use: left, right or midpoint.',
        zh: '窄条越多，误差的缝隙越细。定积分就是这些和式趋近的值：\n\n$$\\int_a^b f(x)\\,dx=\\lim_{n\\to\\infty}\\sum_{i=0}^{n-1} f(x_i)\\,\\Delta x$$\n\n对连续函数，无论采样点取左端、右端还是中点，极限都相同。',
      },
    },
    {
      id: 'exact',
      title: { en: 'Computing the exact area', zh: '算出精确面积' },
      body: {
        en: 'The fundamental theorem of calculus replaces the limit with an antiderivative. For $f(x)=\\frac{x^2}{4}+\\frac12$, an antiderivative is $F(x)=\\frac{x^3}{12}+\\frac{x}{2}$, so\n\n$$\\int_0^b f(x)\\,dx = F(b)-F(0)=\\frac{b^3}{12}+\\frac{b}{2}$$\n\nAt $b=3$ that is $\\frac{27}{12}+\\frac32=3.75$, the number the readout shows.',
        zh: '微积分基本定理用原函数代替了求极限。对 $f(x)=\\frac{x^2}{4}+\\frac12$，取原函数 $F(x)=\\frac{x^3}{12}+\\frac{x}{2}$，于是\n\n$$\\int_0^b f(x)\\,dx = F(b)-F(0)=\\frac{b^3}{12}+\\frac{b}{2}$$\n\n$b=3$ 时等于 $\\frac{27}{12}+\\frac32=3.75$，就是读数里显示的值。',
      },
    },
    {
      id: 'error',
      title: { en: 'Why a left sum undershoots here', zh: '为什么这里左和偏小' },
      body: {
        en: 'On an increasing function the left edge is the lowest point of each strip, so every rectangle sits under the curve and $L_n$ is too small. A right sum would overshoot by about the same amount. Their average, the trapezoid rule, is far more accurate.',
        zh: '函数递增时，左端点是每条里最低的点，所以每个矩形都在曲线下方，$L_n$ 偏小。右和则会偏大差不多同样的量。两者取平均就是梯形法，精度高得多。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'On $[0,3]$ with $n=6$ strips, what is $\\Delta x$?',
        zh: '在 $[0,3]$ 上取 $n=6$ 条，$\\Delta x$ 是多少？',
      },
      choices: [
        { en: '$0.5$', zh: '$0.5$' },
        { en: '$2$', zh: '$2$' },
        { en: '$3$', zh: '$3$' },
        { en: '$0.6$', zh: '$0.6$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\Delta x = \\frac{3-0}{6}=0.5$.',
        zh: '$\\Delta x = \\frac{3-0}{6}=0.5$。',
      },
    },
    {
      question: {
        en: 'For an increasing function, how does the left Riemann sum compare with the integral?',
        zh: '对递增函数，左黎曼和与定积分相比怎样？',
      },
      choices: [
        { en: 'It is smaller', zh: '偏小' },
        { en: 'It is larger', zh: '偏大' },
        { en: 'It is always equal', zh: '总是相等' },
        { en: 'It depends on $n$ only', zh: '只取决于 $n$' },
      ],
      answer: 0,
      explanation: {
        en: 'Each rectangle uses the lowest value in its strip, so the staircase stays under the curve.',
        zh: '每个矩形都取所在窄条里的最小值，台阶始终在曲线下方。',
      },
    },
    {
      question: {
        en: 'What is $\\int_0^2 \\left(\\frac{x^2}{4}+\\frac12\\right)dx$?',
        zh: '$\\int_0^2 \\left(\\frac{x^2}{4}+\\frac12\\right)dx$ 等于多少？',
      },
      choices: [
        { en: '$\\frac{5}{3}$', zh: '$\\frac{5}{3}$' },
        { en: '$2$', zh: '$2$' },
        { en: '$\\frac{3}{2}$', zh: '$\\frac{3}{2}$' },
        { en: '$\\frac{8}{3}$', zh: '$\\frac{8}{3}$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\frac{2^3}{12}+\\frac22=\\frac{2}{3}+1=\\frac53$.',
        zh: '$\\frac{2^3}{12}+\\frac22=\\frac{2}{3}+1=\\frac53$。',
      },
    },
  ],
  resultTex: 'L_n \\to \\int_0^b f(x)\\,dx',
  related: ['derivative-tangent-slope'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Animate the integral as area: fill the region under y = x²/4 + 1/2 on [0, 3] with left Riemann rectangles, increase n from 2 to 60, and show the sum approach the exact area 3.75.',
    zh: '用动画展示定积分即面积：在 [0, 3] 上用左黎曼矩形填满 y = x²/4 + 1/2 下方区域，让 n 从 2 增加到 60，显示面积和逼近精确值 3.75。',
  },
};
