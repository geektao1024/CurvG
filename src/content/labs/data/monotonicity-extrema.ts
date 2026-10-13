import { pick, type Lab } from '../types';

export const monotonicityExtrema: Lab = {
  slug: 'monotonicity-extrema',
  publication: 'public',
  primaryCategoryId: 'rates',
  additionalCategoryIds: ['maps-graphs'],
  levels: ['high', 'university'],
  chapterTitle: { en: 'Monotonicity & extrema', zh: '单调性与极值' },
  title: {
    en: "Monotonicity and extrema: reading a function off the sign of f′",
    zh: '单调性与极值：从导数的正负读出函数的增减',
  },
  question: {
    en: "How does the sign of f′(x) tell you where f rises, where it falls, and where it turns?",
    zh: '怎样从 f′(x) 的正负看出函数在哪里递增、哪里递减、在哪里拐弯？',
  },
  summary: {
    en: "Drag a point along the cubic f(x) = x³ − 3ax and watch its tangent turn green, red or flat while the graph of f′ is drawn beneath. See why the extrema sit where f′ changes sign, and why f′ = 0 alone is not enough.",
    zh: '让点沿三次函数 f(x) = x³ − 3ax 移动，看切线变绿、变红或变平，同时对照下面画出的 f′ 图像。弄清极值为什么出现在 f′ 变号的地方，以及为什么只有 f′ = 0 还不够。',
  },
  keyPoints: [
    { en: 'Sign of the derivative', zh: '导数的正负' },
    { en: 'Intervals of increase', zh: '单调区间' },
    { en: 'Local maximum and minimum', zh: '极大值与极小值' },
    { en: 'Stationary points', zh: '驻点' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-3, 3], y: [-6, 6], equal: false },
      params: [
        {
          id: 'a',
          label: 'a',
          min: -1,
          max: 2,
          step: 0.1,
          value: 1,
          bands: [
            { from: -1, to: 0, label: t('no extrema', '无极值'), color: 'blue' },
            { from: 0.1, to: 2, label: t('two extrema', '两个极值'), color: 'primary' },
          ],
        },
        { id: 'x0', label: 'x_0', min: -2.5, max: 2.5, step: 0.1, value: -2 },
      ],
      functions: [
        { id: 'f', expr: 'x^3 - 3 * a * x' },
        { id: 'd', expr: '3 * x^2 - 3 * a' },
      ],
      scalars: [
        { id: 'y0', expr: 'f(x0)' },
        { id: 'fp', expr: 'd(x0)' },
        { id: 'two', expr: 'a > 0.001' },
        // Finite for drawing; the readouts switch to "undefined" via `two`.
        { id: 'ra', expr: 'sqrt(max(a, 0))' },
        { id: 'fmax', expr: '2 * a * ra' },
      ],
      objects: [
        // Sign chart on the x-axis: green where f rises, red where it falls.
        { type: 'segment', from: [-3, 0], to: ['-ra', 0], color: 'green', width: 5, opacity: 0.5 },
        { type: 'segment', from: ['ra', 0], to: [3, 0], color: 'green', width: 5, opacity: 0.5 },
        {
          type: 'segment',
          from: ['-ra', 0],
          to: ['ra', 0],
          color: 'red',
          width: 5,
          opacity: 0.5,
          visible: 'two',
        },
        { type: 'function', fn: 'd', color: 'blue', dashed: true, width: 1.5 },
        {
          type: 'text',
          at: ['sqrt((5.4 + 3 * a) / 3) + 0.12', 5.4],
          text: 'y = f′(x)',
          color: 'blue',
        },
        { type: 'function', fn: 'f', color: 'primary', width: 2.8 },
        { type: 'line', through: ['x0', 'y0'], slope: 'fp', color: 'green', width: 1.8, visible: 'fp > 0.05' },
        { type: 'line', through: ['x0', 'y0'], slope: 'fp', color: 'red', width: 1.8, visible: 'fp < -0.05' },
        { type: 'line', through: ['x0', 'y0'], slope: 0, color: 'amber', width: 1.8, visible: 'abs(fp) <= 0.05' },
        {
          type: 'segment',
          from: ['x0', 'y0'],
          to: ['x0', 'clamp(fp, -6, 6)'],
          color: 'muted',
          dashed: true,
          width: 1,
        },
        { type: 'point', at: ['x0', 'fp'], color: 'blue', size: 4, visible: 'abs(fp) < 6' },
        {
          type: 'point',
          at: ['-ra', 'fmax'],
          color: 'amber',
          size: 5,
          label: t('local max', '极大值'),
          visible: 'two',
        },
        {
          type: 'point',
          at: ['ra', '-fmax'],
          color: 'amber',
          size: 5,
          label: t('local min', '极小值'),
          visible: 'two',
        },
        {
          type: 'point',
          at: ['x0', 'y0'],
          color: 'primary',
          size: 6,
          label: 'P',
          drag: { x: 'x0' },
        },
      ],
      readouts: [
        { label: "f'(x_0) = 3x_0^2 - 3a", expr: 'fp', digits: 2, highlight: true },
        { label: 'f(x_0)', expr: 'y0', digits: 2 },
        { label: t('\\text{local max } f(-\\sqrt a)', '\\text{极大值 } f(-\\sqrt a)'), expr: 'two ? fmax : 0 / 0', digits: 2 },
        { label: t('\\text{local min } f(\\sqrt a)', '\\text{极小值 } f(\\sqrt a)'), expr: 'two ? -fmax : 0 / 0', digits: 2 },
        {
          kind: 'status',
          label: t('At P the function is', '在 P 处函数'),
          expr: 'fp > 0',
          ok: t("rising (f′ > 0)", '递增（f′ > 0）'),
          bad: t("not rising (f′ ≤ 0)", '不递增（f′ ≤ 0）'),
        },
        {
          kind: 'status',
          label: t('Extrema', '极值'),
          expr: 'two',
          ok: t('one maximum, one minimum', '一个极大值、一个极小值'),
          bad: t('none: f only rises', '没有：函数一直递增'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Where f′ > 0, f rises', zh: 'f′ > 0 的地方，函数递增' },
      body: {
        en: "Take $f(x)=x^3-3x$ ($a=1$) and put $P$ at $x_0=-2$. The tangent slopes up: $f'(-2)=3\\cdot4-3=9>0$, and the blue graph of $f'$ is above the axis. On $(-\\infty,-1)$ the curve climbs.",
        zh: "取 $f(x)=x^3-3x$（$a=1$），把 $P$ 放在 $x_0=-2$。切线向上倾斜：$f'(-2)=3\\cdot4-3=9>0$，蓝色的 $f'$ 图像在 $x$ 轴上方。在 $(-\\infty,-1)$ 上曲线一路上升。",
      },
      set: { a: 1, x0: -2 },
    },
    {
      title: { en: 'Where f′ < 0, f falls', zh: 'f′ < 0 的地方，函数递减' },
      body: {
        en: "Move $P$ to $x_0=0$: $f'(0)=-3<0$, the tangent turns red and points down. Between the roots of $f'$, on $(-1,1)$, $f'$ is negative and the curve falls. That red stretch on the axis is the interval of decrease.",
        zh: "把 $P$ 移到 $x_0=0$：$f'(0)=-3<0$，切线变红、向下倾斜。在 $f'$ 的两个零点之间，即 $(-1,1)$ 上，$f'$ 为负，曲线下降。$x$ 轴上那段红色就是递减区间。",
      },
      set: { a: 1, x0: 0 },
    },
    {
      title: { en: 'The turn is where f′ changes sign', zh: '拐弯处是 f′ 变号的地方' },
      body: {
        en: "At $x_0=-1$ the tangent is flat: $f'(-1)=0$. Left of it $f'>0$, right of it $f'<0$, so the curve stops rising and starts falling: a **local maximum**, $f(-1)=2$. At $x=1$ the sign goes from $-$ to $+$: a local minimum, $f(1)=-2$.",
        zh: "$x_0=-1$ 时切线水平：$f'(-1)=0$。它左边 $f'>0$，右边 $f'<0$，曲线由升转降，这是**极大值**，$f(-1)=2$。在 $x=1$ 处符号由 $-$ 变 $+$，是极小值，$f(1)=-2$。",
      },
      set: { a: 1, x0: -1 },
    },
    {
      title: { en: 'f′ = 0 is not enough', zh: '只有 f′ = 0 还不够' },
      body: {
        en: "Set $a=0$, so $f(x)=x^3$. At $x_0=0$ the tangent is flat, $f'(0)=0$, but $f'=3x^2$ is positive on both sides: the curve keeps rising and there is **no extremum**. For $a<0$, $f'$ never reaches $0$ at all.",
        zh: "令 $a=0$，即 $f(x)=x^3$。$x_0=0$ 时切线水平，$f'(0)=0$，但 $f'=3x^2$ 在两侧都是正的：曲线一直上升，**没有极值**。$a<0$ 时 $f'$ 根本取不到 $0$。",
      },
      set: { a: 0, x0: 0 },
    },
  ],
  sections: [
    {
      id: 'sign',
      title: { en: 'The sign test', zh: '用导数判断单调性' },
      body: {
        en: "On an interval:\n\n- $f'(x)>0$ everywhere $\\Rightarrow$ $f$ is **increasing** there;\n- $f'(x)<0$ everywhere $\\Rightarrow$ $f$ is **decreasing** there.\n\nWhy: for any $x_1<x_2$ in the interval, the mean value theorem gives a point $\\xi$ between them with $f(x_2)-f(x_1)=f'(\\xi)(x_2-x_1)$. If $f'>0$ throughout, the right side is positive, so $f(x_2)>f(x_1)$. In pictures: some tangent between the two points is parallel to the chord, so the chord can only slope the way the tangents do. To find the intervals, solve $f'(x)=0$, cut the number line at the roots, and test the sign of $f'$ on each piece.",
        zh: "在某个区间上：\n\n- 处处 $f'(x)>0$ $\\Rightarrow$ $f$ 在该区间**递增**；\n- 处处 $f'(x)<0$ $\\Rightarrow$ $f$ 在该区间**递减**。\n\n理由：对区间内任意 $x_1<x_2$，由拉格朗日中值定理，存在介于两者之间的 $\\xi$，使 $f(x_2)-f(x_1)=f'(\\xi)(x_2-x_1)$。若处处 $f'>0$，右边为正，所以 $f(x_2)>f(x_1)$。画成图就是：两点之间总有一条切线与连接两点的弦平行，所以弦的倾斜方向只能和切线一致。求单调区间时，先解 $f'(x)=0$，用它的根把数轴分段，再逐段判断 $f'$ 的正负。",
      },
    },
    {
      id: 'extrema',
      title: { en: 'Local extrema', zh: '极值' },
      body: {
        en: "A **local maximum** at $x_0$ means $f(x_0)$ beats every nearby value. If $f'$ changes from $+$ to $-$ at $x_0$, $f(x_0)$ is a local maximum; from $-$ to $+$, a local minimum; no change of sign, no extremum.\n\nFor $f(x)=x^3-3ax$ with $a>0$: $f'(x)=3(x^2-a)=0$ at $x=\\pm\\sqrt a$, giving the maximum $f(-\\sqrt a)=2a\\sqrt a$ and the minimum $f(\\sqrt a)=-2a\\sqrt a$.",
        zh: "$x_0$ 处取**极大值**，意思是 $f(x_0)$ 比它附近的函数值都大。若 $f'$ 在 $x_0$ 处由 $+$ 变 $-$，$f(x_0)$ 是极大值；由 $-$ 变 $+$，是极小值；不变号，就不是极值。\n\n对 $f(x)=x^3-3ax$（$a>0$）：$f'(x)=3(x^2-a)=0$ 得 $x=\\pm\\sqrt a$，极大值 $f(-\\sqrt a)=2a\\sqrt a$，极小值 $f(\\sqrt a)=-2a\\sqrt a$。",
      },
    },
    {
      id: 'stationary',
      title: { en: 'Stationary is not the same as extreme', zh: '驻点不一定是极值点' },
      body: {
        en: "A point with $f'(x_0)=0$ is a **stationary point**. Every extremum of a differentiable function is stationary, but not every stationary point is an extremum: $y=x^3$ is flat at $0$ and still increasing. $f'(x_0)=0$ is necessary; the change of sign is what makes it sufficient.",
        zh: "使 $f'(x_0)=0$ 的点叫**驻点**。可导函数的极值点一定是驻点，但驻点不一定是极值点：$y=x^3$ 在 $0$ 处切线水平，却仍然递增。$f'(x_0)=0$ 是必要条件，导数在两侧变号才使它成为充分条件。",
      },
    },
    {
      id: 'max-min',
      title: { en: 'Extremum versus maximum', zh: '极值与最值' },
      body: {
        en: 'A local maximum need not be the largest value overall: on $[-1,3]$ the cubic $x^3-3x$ has a local maximum $2$ at $x=-1$, but $f(3)=18$ is bigger. On a closed interval, compare the extrema with the values at the two endpoints; the largest of them is the maximum.',
        zh: '极大值不一定是最大值：在 $[-1,3]$ 上，$x^3-3x$ 在 $x=-1$ 处取极大值 $2$，但 $f(3)=18$ 更大。在闭区间上求最值，要把极值和两个端点处的函数值放在一起比较，其中最大的才是最大值。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'On which interval is $f(x)=x^3-12x$ decreasing?',
        zh: '$f(x)=x^3-12x$ 的递减区间是？',
      },
      choices: [
        { en: '$(-2,2)$', zh: '$(-2,2)$' },
        { en: '$(-\\infty,-2)$', zh: '$(-\\infty,-2)$' },
        { en: '$(2,+\\infty)$', zh: '$(2,+\\infty)$' },
        { en: '$(-2\\sqrt3,2\\sqrt3)$', zh: '$(-2\\sqrt3,2\\sqrt3)$' },
      ],
      answer: 0,
      explanation: {
        en: "$f'(x)=3x^2-12<0$ when $x^2<4$, that is on $(-2,2)$.",
        zh: "$f'(x)=3x^2-12<0$ 即 $x^2<4$，所以递减区间是 $(-2,2)$。",
      },
    },
    {
      question: {
        en: "If $f'(x_0)=0$, then $x_0$ is…",
        zh: "若 $f'(x_0)=0$，则 $x_0$…",
      },
      choices: [
        { en: 'possibly, but not necessarily, an extremum', zh: '可能是极值点，也可能不是' },
        { en: 'always a local maximum', zh: '一定是极大值点' },
        { en: 'always an extremum', zh: '一定是极值点' },
        { en: 'never an extremum', zh: '一定不是极值点' },
      ],
      answer: 0,
      explanation: {
        en: "$y=x^3$ has $f'(0)=0$ but no extremum at $0$. It is an extremum only if $f'$ changes sign there.",
        zh: "$y=x^3$ 有 $f'(0)=0$，但 $0$ 不是极值点。只有 $f'$ 在该点两侧变号时才是极值点。",
      },
    },
    {
      question: {
        en: 'What is the local minimum value of $f(x)=x^3-3x$?',
        zh: '$f(x)=x^3-3x$ 的极小值是？',
      },
      choices: [
        { en: '$-2$', zh: '$-2$' },
        { en: '$2$', zh: '$2$' },
        { en: '$1$', zh: '$1$' },
        { en: '$0$', zh: '$0$' },
      ],
      answer: 0,
      explanation: {
        en: "$f'$ goes from $-$ to $+$ at $x=1$, so the minimum is $f(1)=1-3=-2$. Note the question asks for the value, not the point $x=1$.",
        zh: "$f'$ 在 $x=1$ 处由 $-$ 变 $+$，极小值是 $f(1)=1-3=-2$。注意题目问的是极小值，不是极小值点 $x=1$。",
      },
    },
  ],
  resultTex: "f'(x) = 3x^2 - 3a",
  related: ['derivative-tangent-slope', 'zeros-bisection'],
  updated: '2026-10-13',
  videoPrompt: {
    en: "Move a point along f(x) = x³ − 3x with its tangent coloured by the sign of f′: green and rising before x = −1, red and falling between −1 and 1, flat at the local maximum 2 and the local minimum −2. Finish with y = x³, flat at 0 but with no extremum.",
    zh: "让点沿 f(x) = x³ − 3x 移动，切线按 f′ 的正负着色：x = −1 之前是绿色、递增，−1 到 1 之间是红色、递减，在极大值 2 和极小值 −2 处切线变平。最后展示 y = x³ 在 0 处切线水平却没有极值。",
  },
};
