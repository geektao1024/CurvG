import { pick, type Lab } from '../types';

export const exponentialLogarithm: Lab = {
  slug: 'exponential-logarithm',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Exponentials & logs', zh: '指数与对数' },
  title: {
    en: 'y = aˣ and y = logₐ x: inverse functions mirrored in y = x',
    zh: 'y = aˣ 与 y = logₐ x：关于 y = x 对称的反函数',
  },
  question: {
    en: 'How are y = aˣ and y = logₐ x related, and what does the base a decide?',
    zh: 'y = aˣ 和 y = logₐ x 是什么关系？底数 a 决定了什么？',
  },
  summary: {
    en: 'Slide the base a and drag a point along y = aˣ: its mirror image in y = x walks along y = logₐ x. See why both graphs pass through a fixed point, when they rise or fall, and why e is the base whose slope at (0, 1) is exactly 1.',
    zh: '拖动底数 a，再让点沿 y = aˣ 移动：它关于 y = x 的对称点正好走在 y = logₐ x 上。看两条曲线为什么都过定点、什么时候递增或递减，以及为什么 e 是在 (0, 1) 处斜率恰好为 1 的底数。',
  },
  keyPoints: [
    { en: 'Exponential function', zh: '指数函数' },
    { en: 'Logarithmic function', zh: '对数函数' },
    { en: 'Inverse functions', zh: '反函数' },
    { en: 'Monotonicity and the base', zh: '底数与单调性' },
    { en: 'The number e', zh: '自然常数 e' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-4, 9], y: [-3, 9] },
      params: [
        {
          id: 'a',
          label: 'a',
          min: 0.2,
          max: 4,
          step: 0.1,
          value: 2,
          bands: [
            { from: 0.2, to: 0.9, label: t('0 < a < 1', '0 < a < 1'), color: 'blue' },
            { from: 1.1, to: 4, label: t('a > 1', 'a > 1'), color: 'primary' },
          ],
        },
        { id: 'x0', label: 'x_0', min: -3, max: 3, step: 0.1, value: 1 },
      ],
      functions: [
        { id: 'g', expr: 'a^x' },
        // a = 1 has no logarithm: ln a = 0 makes this infinite, and the
        // sampler drops non-finite points, so the curve simply disappears.
        { id: 'h', expr: 'ln(x) / ln(a)' },
      ],
      scalars: [
        { id: 'y0', expr: 'a^x0' },
        { id: 'k', expr: 'ln(a)' },
        { id: 'one', expr: 'abs(a - 1) < 0.001' },
      ],
      objects: [
        {
          type: 'line',
          through: [0, 0],
          slope: 1,
          color: 'muted',
          dashed: true,
          width: 1.5,
        },
        { type: 'text', at: [8.6, 8.1], text: 'y = x', color: 'muted', anchor: 'end' },
        // Tangent to y = aˣ at (0, 1): its slope is ln a.
        {
          type: 'line',
          through: [0, 1],
          slope: 'k',
          color: 'green',
          dashed: true,
          width: 1.5,
          visible: '1 - one',
        },
        { type: 'function', fn: 'g', color: 'primary', width: 2.8 },
        {
          type: 'function',
          fn: 'h',
          domain: [0.001, 20],
          color: 'blue',
          width: 2.8,
          visible: '1 - one',
        },
        { type: 'text', at: ['one ? 3 : clamp(ln(8) / k, -3.6, 8.4) + 0.2', 8.3], text: 'y = aˣ', color: 'primary' },
        {
          type: 'text',
          at: [8.8, 'one ? 0 : ln(8.8) / k + 0.35'],
          text: 'y = logₐ x',
          color: 'blue',
          anchor: 'end',
          visible: '1 - one',
        },
        // P on y = aˣ and its mirror Q on y = logₐ x.
        {
          type: 'segment',
          from: ['x0', 'y0'],
          to: ['y0', 'x0'],
          color: 'muted',
          dashed: true,
          width: 1.2,
        },
        { type: 'point', at: [0, 1], color: 'primary', size: 4, label: '(0, 1)' },
        {
          type: 'point',
          at: [1, 0],
          color: 'blue',
          size: 4,
          label: '(1, 0)',
          visible: '1 - one',
        },
        {
          type: 'point',
          at: ['x0', 'y0'],
          color: 'primary',
          size: 6,
          label: 'P',
          drag: { x: 'x0' },
        },
        {
          type: 'point',
          at: ['y0', 'x0'],
          color: 'blue',
          size: 6,
          label: 'Q',
          visible: '1 - one',
        },
      ],
      readouts: [
        { label: 'x_0', expr: 'x0', digits: 1 },
        { label: 'y_0 = a^{x_0}', expr: 'y0', digits: 3, highlight: true },
        { label: '\\log_a y_0', expr: 'one ? 0 / 0 : ln(y0) / k', digits: 3 },
        {
          label: t('\\ln a\\ (\\text{slope at } (0,1))', '\\ln a\\ (\\text{(0,1) 处斜率})'),
          expr: 'k',
          digits: 3,
        },
        {
          kind: 'status',
          label: t('As x grows, y', 'x 增大时，y'),
          expr: 'a > 1.001',
          ok: t('increases (a > 1)', '增大（a > 1）'),
          bad: t('does not increase (a ≤ 1)', '不增大（a ≤ 1）'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Two curves, one fixed point each', zh: '两条曲线，各过一个定点' },
      body: {
        en: 'With $a=2$, $y=2^x$ passes through $(0,1)$ because $a^0=1$ for every base, and $y=\\log_2 x$ passes through $(1,0)$. Point $P=(1,2)$ sits on the first curve; its mirror $Q=(2,1)$ sits on the second.',
        zh: '$a=2$ 时，$y=2^x$ 过点 $(0,1)$，因为任何底数都有 $a^0=1$；$y=\\log_2 x$ 过点 $(1,0)$。点 $P=(1,2)$ 在第一条曲线上，它的对称点 $Q=(2,1)$ 在第二条上。',
      },
      set: { a: 2, x0: 1 },
    },
    {
      title: { en: 'The log undoes the power', zh: '对数把幂还原' },
      body: {
        en: 'Move $P$ to $x_0=3$: $y_0=2^3=8$, and $\\log_2 8$ reads $3$ again. Swapping the coordinates of every point on $y=a^x$ gives $y=\\log_a x$, which is why the two graphs mirror each other in $y=x$.',
        zh: '把 $P$ 拖到 $x_0=3$：$y_0=2^3=8$，而 $\\log_2 8$ 又读回 $3$。把 $y=a^x$ 上每个点的横纵坐标对调，就得到 $y=\\log_a x$，所以两条曲线关于 $y=x$ 对称。',
      },
      set: { a: 2, x0: 3 },
    },
    {
      title: { en: 'A base below 1 turns both curves around', zh: '底数小于 1，两条曲线都反过来' },
      body: {
        en: 'At $a=0.5$, $y=0.5^x$ falls: $x_0=-2$ gives $0.5^{-2}=4$. Its mirror $y=\\log_{0.5}x$ falls too. A base above 1 makes both rise, a base between 0 and 1 makes both fall, and $a=1$ is not allowed.',
        zh: '$a=0.5$ 时，$y=0.5^x$ 递减：$x_0=-2$ 时 $0.5^{-2}=4$。它的对称曲线 $y=\\log_{0.5}x$ 也递减。底数大于 1 时两者都递增，在 0 和 1 之间时都递减，$a=1$ 不允许。',
      },
      set: { a: 0.5, x0: -2 },
    },
    {
      title: { en: 'Why e is special', zh: '为什么 e 特殊' },
      body: {
        en: 'The green line touches $y=a^x$ at $(0,1)$ and its slope is $\\ln a$: $0.693$ for $a=2$. At $a=2.7$ it reads $0.993$, almost exactly 1. The base that makes it exactly 1 is $e\\approx2.718$, so $e^x$ is the exponential that is its own slope.',
        zh: '绿色直线在 $(0,1)$ 处与 $y=a^x$ 相切，斜率是 $\\ln a$：$a=2$ 时是 $0.693$。$a=2.7$ 时读数是 $0.993$，几乎正好是 1。让斜率恰好为 1 的底数就是 $e\\approx2.718$，所以 $e^x$ 是斜率等于自身的指数函数。',
      },
      set: { a: 2.7, x0: 0 },
    },
  ],
  sections: [
    {
      id: 'definition',
      title: { en: 'Two ways to read one equation', zh: '同一个等式的两种读法' },
      body: {
        en: '$$a^x=y\\iff x=\\log_a y\\qquad(a>0,\\ a\\ne1,\\ y>0)$$\n\nThe exponential asks "what is $a$ to the power $x$?"; the logarithm asks the reverse, "what power of $a$ gives $y$?". So $y=\\log_a x$ is the **inverse function** of $y=a^x$: its domain $(0,+\\infty)$ is the other one\'s range, and the other way round.',
        zh: '$$a^x=y\\iff x=\\log_a y\\qquad(a>0,\\ a\\ne1,\\ y>0)$$\n\n指数问的是"$a$ 的 $x$ 次方是多少"，对数反过来问"$a$ 的几次方等于 $y$"。所以 $y=\\log_a x$ 是 $y=a^x$ 的**反函数**：它的定义域 $(0,+\\infty)$ 就是后者的值域，反之亦然。',
      },
    },
    {
      id: 'mirror',
      title: { en: 'Why the graphs mirror in y = x', zh: '为什么图像关于 y = x 对称' },
      body: {
        en: 'If $(m,n)$ lies on $y=a^x$, then $n=a^m$, so $m=\\log_a n$ and $(n,m)$ lies on $y=\\log_a x$. Swapping coordinates is reflection in the line $y=x$, which is exactly the dashed segment from $P$ to $Q$: it always crosses $y=x$ at a right angle, at its midpoint.',
        zh: '若 $(m,n)$ 在 $y=a^x$ 上，则 $n=a^m$，于是 $m=\\log_a n$，点 $(n,m)$ 就在 $y=\\log_a x$ 上。对调坐标就是关于直线 $y=x$ 的反射，也就是画板上从 $P$ 到 $Q$ 的虚线：它总是在中点处垂直穿过 $y=x$。',
      },
    },
    {
      id: 'base',
      title: { en: 'What the base decides', zh: '底数决定了什么' },
      body: {
        en: '- $a>1$: both functions are **increasing**; $a^x\\to0$ as $x\\to-\\infty$ and $\\log_a x\\to-\\infty$ as $x\\to0^+$.\n- $0<a<1$: both are **decreasing**. $y=\\left(\\tfrac1a\\right)^x$ is the reflection of $y=a^x$ in the $y$-axis.\n- Every exponential passes through $(0,1)$ and every logarithm through $(1,0)$, whatever the base.\n\nTo compare $\\log_2 3$ with $\\log_3 2$, use these anchors: $\\log_2 3>\\log_2 2=1$, while $\\log_3 2<\\log_3 3=1$.',
        zh: '- $a>1$：两个函数都**递增**；$x\\to-\\infty$ 时 $a^x\\to0$，$x\\to0^+$ 时 $\\log_a x\\to-\\infty$。\n- $0<a<1$：两者都**递减**。$y=\\left(\\tfrac1a\\right)^x$ 是 $y=a^x$ 关于 $y$ 轴的对称图形。\n- 不论底数是多少，指数函数都过 $(0,1)$，对数函数都过 $(1,0)$。\n\n比较 $\\log_2 3$ 和 $\\log_3 2$ 就靠这些"锚点"：$\\log_2 3>\\log_2 2=1$，而 $\\log_3 2<\\log_3 3=1$。',
      },
    },
    {
      id: 'e',
      title: { en: 'The natural base e', zh: '自然底数 e' },
      body: {
        en: 'Take the slope of $y=a^x$ from its definition: $\\dfrac{a^{x+h}-a^x}{h}=a^x\\cdot\\dfrac{a^h-1}{h}$. The second factor does not depend on $x$; as $h\\to0$ it is the slope at $(0,1)$, the number written $\\ln a$. So the slope everywhere is the height times the slope at $(0,1)$: $(a^x)\'=a^x\\ln a$. Choosing $a=e\\approx2.71828$ makes the factor 1, so $(e^x)\'=e^x$. That is why calculus, growth and decay models, and $\\ln x=\\log_e x$ all use this base.',
        zh: '直接用斜率的定义：$\\dfrac{a^{x+h}-a^x}{h}=a^x\\cdot\\dfrac{a^h-1}{h}$。后一个因子与 $x$ 无关，$h\\to0$ 时它就是 $(0,1)$ 处的斜率，记作 $\\ln a$。所以任意一点的斜率都等于高度乘以 $(0,1)$ 处的斜率：$(a^x)\'=a^x\\ln a$。取 $a=e\\approx2.71828$ 时系数正好是 1，于是 $(e^x)\'=e^x$。微积分、增长与衰减模型以及 $\\ln x=\\log_e x$ 都用这个底数，原因就在这里。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'Which point lies on $y=\\log_a x$ for every allowed base $a$?',
        zh: '对所有允许的底数 $a$，$y=\\log_a x$ 都经过哪个点？',
      },
      choices: [
        { en: '$(1,0)$', zh: '$(1,0)$' },
        { en: '$(0,1)$', zh: '$(0,1)$' },
        { en: '$(a,0)$', zh: '$(a,0)$' },
        { en: '$(1,1)$', zh: '$(1,1)$' },
      ],
      answer: 0,
      explanation: {
        en: '$a^0=1$, so $\\log_a 1=0$. The point $(0,1)$ belongs to $y=a^x$; swapping it gives $(1,0)$.',
        zh: '$a^0=1$，所以 $\\log_a 1=0$。$(0,1)$ 是 $y=a^x$ 上的定点，坐标对调后得到 $(1,0)$。',
      },
    },
    {
      question: {
        en: 'For $0<a<1$, which statement is true?',
        zh: '当 $0<a<1$ 时，下列说法正确的是？',
      },
      choices: [
        { en: '$y=a^x$ and $y=\\log_a x$ are both decreasing', zh: '$y=a^x$ 和 $y=\\log_a x$ 都递减' },
        { en: '$y=a^x$ decreases but $y=\\log_a x$ increases', zh: '$y=a^x$ 递减，$y=\\log_a x$ 递增' },
        { en: 'Both are increasing', zh: '两者都递增' },
        { en: '$y=\\log_a x$ is undefined', zh: '$y=\\log_a x$ 没有定义' },
      ],
      answer: 0,
      explanation: {
        en: 'A function and its inverse always share their monotonicity: reflecting a falling graph in $y=x$ gives a falling graph.',
        zh: '函数和它的反函数单调性一致：把递减的图像关于 $y=x$ 翻折，得到的仍是递减图像。',
      },
    },
    {
      question: {
        en: 'Which is larger, $\\log_2 3$ or $\\log_3 2$?',
        zh: '$\\log_2 3$ 和 $\\log_3 2$ 哪个大？',
      },
      choices: [
        { en: '$\\log_2 3$', zh: '$\\log_2 3$' },
        { en: '$\\log_3 2$', zh: '$\\log_3 2$' },
        { en: 'They are equal', zh: '相等' },
        { en: 'It cannot be decided', zh: '无法比较' },
      ],
      answer: 0,
      explanation: {
        en: '$\\log_2 3>\\log_2 2=1$ and $\\log_3 2<\\log_3 3=1$, so $\\log_2 3$ is larger.',
        zh: '$\\log_2 3>\\log_2 2=1$，$\\log_3 2<\\log_3 3=1$，所以 $\\log_2 3$ 更大。',
      },
    },
  ],
  resultTex: 'a^x = y \\iff x = \\log_a y',
  related: ['quadratic-transformations', 'derivative-tangent-slope'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Show y = 2ˣ and y = log₂ x mirrored in the line y = x: move a point from (1, 2) to (3, 8) and its mirror from (2, 1) to (8, 3), flip to base 0.5 to show both curves falling, then draw the tangent at (0, 1) and grow the base until its slope ln a reaches 1 at a = e.',
    zh: '展示 y = 2ˣ 和 y = log₂ x 关于直线 y = x 对称：把一个点从 (1, 2) 移到 (3, 8)，它的对称点从 (2, 1) 移到 (8, 3)；把底数换成 0.5，展示两条曲线都递减；再画出 (0, 1) 处的切线，增大底数直到斜率 ln a 在 a = e 时等于 1。',
  },
};
