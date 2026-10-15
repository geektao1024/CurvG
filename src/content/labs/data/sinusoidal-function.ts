import { pick, type Lab } from '../types';

export const sinusoidalFunction: Lab = {
  slug: 'sinusoidal-function',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'y = A sin(ωx + φ)', zh: '正弦型函数' },
  title: {
    en: 'y = A sin(ωx + φ): amplitude, period and phase shift',
    zh: 'y = A sin(ωx + φ)：振幅、周期与相位平移',
  },
  question: {
    en: 'What do A, ω and φ each do to the graph of y = sin x?',
    zh: 'A、ω、φ 分别把 y = sin x 的图像怎样变换？',
  },
  summary: {
    en: 'Three sliders turn y = sin x into y = A sin(ωx + φ). Watch the amplitude, the period 2π/ω and the starting point −φ/ω move, and see why sin(2x + π/3) shifts by π/6, not π/3.',
    zh: '用三个滑块把 y = sin x 变成 y = A sin(ωx + φ)。看振幅、周期 2π/ω 和起点 −φ/ω 怎样移动，弄清为什么 sin(2x + π/3) 平移的是 π/6 而不是 π/3。',
  },
  keyPoints: [
    { en: 'Amplitude', zh: '振幅' },
    { en: 'Period T = 2π/ω', zh: '周期 T = 2π/ω' },
    { en: 'Phase shift', zh: '相位与平移' },
    { en: 'Order of transformations', zh: '图像变换的顺序' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-7, 7], y: [-4.2, 4.2] },
      params: [
        { id: 'A', label: 'A', min: 0.5, max: 3, step: 0.1, value: 2 },
        { id: 'w', label: '\\omega', min: 0.5, max: 3, step: 0.1, value: 2 },
        {
          id: 'phi',
          label: '\\varphi\\,(^\\circ)',
          min: -180,
          max: 180,
          step: 15,
          value: 60,
        },
      ],
      functions: [
        { id: 's', expr: 'sin(x)' },
        { id: 'f', expr: 'A * sin(w * x + p)' },
      ],
      scalars: [
        { id: 'p', expr: 'phi * pi / 180' },
        { id: 'T', expr: '2 * pi / w' },
        // Where ωx + φ = 0: the copy of sin's starting point at the origin.
        { id: 'xs', expr: '-p / w' },
        { id: 'xm', expr: 'xs + T / 4' },
        { id: 'yb', expr: '-A - 0.6' },
      ],
      objects: [
        { type: 'function', fn: 's', color: 'muted', dashed: true, width: 1.5 },
        { type: 'text', at: [-6.8, 1.35], text: 'y = sin x', color: 'muted', anchor: 'start' },
        { type: 'segment', from: [-20, 'A'], to: [20, 'A'], color: 'amber', dashed: true, width: 1 },
        { type: 'segment', from: [-20, '-A'], to: [20, '-A'], color: 'amber', dashed: true, width: 1 },
        { type: 'text', at: [6.9, 'A + 0.25'], text: 'y = A', color: 'amber', anchor: 'end' },
        { type: 'function', fn: 'f', color: 'primary', width: 2.8, samples: 600 },
        // One period, measured from the starting point.
        { type: 'segment', from: ['xs', 'yb'], to: ['xs + T', 'yb'], color: 'blue', width: 2, label: 'T' },
        { type: 'segment', from: ['xs', 'yb - 0.15'], to: ['xs', 'yb + 0.15'], color: 'blue', width: 2 },
        { type: 'segment', from: ['xs + T', 'yb - 0.15'], to: ['xs + T', 'yb + 0.15'], color: 'blue', width: 2 },
        // Shift of the starting point from the origin.
        {
          type: 'segment',
          from: [0, 0],
          to: ['xs', 0],
          arrow: true,
          color: 'red',
          width: 2.5,
          visible: 'abs(xs) > 0.05',
        },
        {
          type: 'point',
          at: ['xs', 0],
          color: 'red',
          size: 5,
          label: t('start ωx + φ = 0', '起点 ωx + φ = 0'),
        },
        { type: 'point', at: ['xm', 'A'], color: 'green', size: 5, label: t('peak', '最高点') },
      ],
      readouts: [
        { label: 'A', expr: 'A', digits: 1 },
        { label: 'T = \\dfrac{2\\pi}{\\omega}', expr: 'T', digits: 3, highlight: true },
        { label: '\\varphi\\ (\\text{rad})', expr: 'p', digits: 3 },
        { label: '-\\dfrac{\\varphi}{\\omega}', expr: 'xs', digits: 3 },
        { label: t('x_{\\text{peak}}', 'x_{\\text{最高}}'), expr: 'xm', digits: 3 },
        { label: 'f(0) = A\\sin\\varphi', expr: 'A * sin(p)', digits: 3 },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Start from y = sin x', zh: '从 y = sin x 出发' },
      body: {
        en: 'With $A=1$, $\\omega=1$, $\\varphi=0$ the curve is $y=\\sin x$: it starts rising at the origin, peaks at $1$ and repeats every $T=2\\pi\\approx6.283$.',
        zh: '$A=1$、$\\omega=1$、$\\varphi=0$ 时就是 $y=\\sin x$：从原点开始上升，最高到 $1$，每隔 $T=2\\pi\\approx6.283$ 重复一次。',
      },
      set: { A: 1, w: 1, phi: 0 },
    },
    {
      title: { en: 'A sets the height', zh: 'A 决定高低' },
      body: {
        en: 'At $A=2$ every value doubles: the curve now runs between $-2$ and $2$. The zeros and the period stay where they were, because $A$ only acts on $y$.',
        zh: '$A=2$ 时每个函数值都翻倍，曲线在 $-2$ 和 $2$ 之间起伏。零点和周期都没动，因为 $A$ 只作用在 $y$ 上。',
      },
      set: { A: 2, w: 1, phi: 0 },
    },
    {
      title: { en: 'ω sets the period', zh: 'ω 决定周期' },
      body: {
        en: 'At $\\omega=2$ the angle $2x$ runs twice as fast, so one full wave fits into $T=\\frac{2\\pi}{2}=\\pi\\approx3.142$. Larger $\\omega$ squeezes the graph horizontally.',
        zh: '$\\omega=2$ 时角度 $2x$ 跑得快一倍，一个完整的波只占 $T=\\frac{2\\pi}{2}=\\pi\\approx3.142$。$\\omega$ 越大，图像横向压得越紧。',
      },
      set: { A: 2, w: 2, phi: 0 },
    },
    {
      title: { en: 'φ shifts by φ/ω, not by φ', zh: 'φ 平移的是 φ/ω，不是 φ' },
      body: {
        en: 'Set $\\varphi=60^\\circ=\\frac{\\pi}{3}$. The wave starts where $2x+\\frac{\\pi}{3}=0$, at $x=-\\frac{\\pi}{6}\\approx-0.524$: it moved **left by $\\frac{\\pi}{6}$**. Write it as $y=2\\sin 2\\left(x+\\frac{\\pi}{6}\\right)$ to see why. The first peak is at $x=\\frac{\\pi}{12}\\approx0.262$.',
        zh: '令 $\\varphi=60^\\circ=\\frac{\\pi}{3}$。波的起点满足 $2x+\\frac{\\pi}{3}=0$，即 $x=-\\frac{\\pi}{6}\\approx-0.524$：图像**向左平移了 $\\frac{\\pi}{6}$**。写成 $y=2\\sin 2\\left(x+\\frac{\\pi}{6}\\right)$ 就能看出原因。第一个最高点在 $x=\\frac{\\pi}{12}\\approx0.262$。',
      },
      set: { A: 2, w: 2, phi: 60 },
    },
  ],
  sections: [
    {
      id: 'parameters',
      title: { en: 'Three parameters, three jobs', zh: '三个参数，各管一件事' },
      body: {
        en: '$$y=A\\sin(\\omega x+\\varphi)\\qquad(A>0,\\ \\omega>0)$$\n\n- **Amplitude** $A$: the curve runs between $-A$ and $A$.\n- **Period** $T=\\dfrac{2\\pi}{\\omega}$: the length of one full wave. Its reciprocal $f=\\dfrac1T$ is the frequency.\n- **Initial phase** $\\varphi$: the phase $\\omega x+\\varphi$ at $x=0$, so $f(0)=A\\sin\\varphi$.',
        zh: '$$y=A\\sin(\\omega x+\\varphi)\\qquad(A>0,\\ \\omega>0)$$\n\n- **振幅** $A$：曲线在 $-A$ 与 $A$ 之间起伏。\n- **周期** $T=\\dfrac{2\\pi}{\\omega}$：一个完整波的长度，它的倒数 $f=\\dfrac1T$ 叫频率。\n- **初相** $\\varphi$：$x=0$ 时的相位 $\\omega x+\\varphi$，所以 $f(0)=A\\sin\\varphi$。',
      },
    },
    {
      id: 'shift',
      title: { en: 'Finding the shift', zh: '怎样求平移量' },
      body: {
        en: 'Factor $\\omega$ out of the bracket:\n\n$$A\\sin(\\omega x+\\varphi)=A\\sin\\omega\\left(x+\\frac{\\varphi}{\\omega}\\right)$$\n\nSo the graph of $y=A\\sin\\omega x$ moves by $\\dfrac{\\varphi}{\\omega}$: left when $\\varphi>0$, right when $\\varphi<0$. A reliable shortcut is to solve $\\omega x+\\varphi=0$ for the starting point of the wave.',
        zh: '把 $\\omega$ 从括号里提出来：\n\n$$A\\sin(\\omega x+\\varphi)=A\\sin\\omega\\left(x+\\frac{\\varphi}{\\omega}\\right)$$\n\n所以是把 $y=A\\sin\\omega x$ 的图像平移 $\\dfrac{\\varphi}{\\omega}$：$\\varphi>0$ 向左，$\\varphi<0$ 向右。最稳妥的办法是解 $\\omega x+\\varphi=0$，求出这个波的起点。',
      },
    },
    {
      id: 'order',
      title: { en: 'Two orders, two different shifts', zh: '两种变换顺序，平移量不同' },
      body: {
        en: 'From $y=\\sin x$ to $y=\\sin\\left(2x+\\frac{\\pi}{3}\\right)$:\n\n- **Shift first**: left by $\\frac{\\pi}{3}$ to get $\\sin\\left(x+\\frac{\\pi}{3}\\right)$, then halve every $x$-coordinate.\n- **Stretch first**: halve every $x$-coordinate to get $\\sin 2x$, then shift left by only $\\frac{\\pi}{6}$.\n\nBoth arrive at the same curve. The shift is different because in the second route it acts on $x$ after $x$ has already been scaled by $\\omega$.',
        zh: '从 $y=\\sin x$ 变到 $y=\\sin\\left(2x+\\frac{\\pi}{3}\\right)$：\n\n- **先平移**：向左移 $\\frac{\\pi}{3}$ 得到 $\\sin\\left(x+\\frac{\\pi}{3}\\right)$，再把每个点的横坐标缩为原来的一半。\n- **先伸缩**：横坐标缩为一半得到 $\\sin 2x$，再只向左移 $\\frac{\\pi}{6}$。\n\n两条路得到同一条曲线。平移量不同，是因为第二条路里平移作用在已经被 $\\omega$ 缩放过的 $x$ 上。',
      },
    },
    {
      id: 'peaks',
      title: { en: 'Peaks, zeros and the five key points', zh: '最值点、零点与"五点法"' },
      body: {
        en: 'Set the phase $\\omega x+\\varphi$ to $0,\\ \\frac{\\pi}{2},\\ \\pi,\\ \\frac{3\\pi}{2},\\ 2\\pi$ and solve for $x$. These five points (zero, peak, zero, trough, zero) are a quarter period apart and are all you need to sketch one period by hand. The peak value is $A$, reached where $\\omega x+\\varphi=\\frac{\\pi}{2}+2k\\pi$.',
        zh: '令相位 $\\omega x+\\varphi$ 分别等于 $0,\\ \\frac{\\pi}{2},\\ \\pi,\\ \\frac{3\\pi}{2},\\ 2\\pi$，解出 $x$。这五个点（零点、最高点、零点、最低点、零点）彼此相隔四分之一个周期，手画一个周期只需要它们。最大值是 $A$，在 $\\omega x+\\varphi=\\frac{\\pi}{2}+2k\\pi$ 处取到。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'What is the period of $y=3\\sin\\left(4x-\\frac{\\pi}{5}\\right)$?',
        zh: '$y=3\\sin\\left(4x-\\frac{\\pi}{5}\\right)$ 的周期是？',
      },
      choices: [
        { en: '$\\frac{\\pi}{2}$', zh: '$\\frac{\\pi}{2}$' },
        { en: '$8\\pi$', zh: '$8\\pi$' },
        { en: '$\\frac{2\\pi}{3}$', zh: '$\\frac{2\\pi}{3}$' },
        { en: '$2\\pi$', zh: '$2\\pi$' },
      ],
      answer: 0,
      explanation: {
        en: '$T=\\frac{2\\pi}{\\omega}=\\frac{2\\pi}{4}=\\frac{\\pi}{2}$. Neither $A$ nor $\\varphi$ changes the period.',
        zh: '$T=\\frac{2\\pi}{\\omega}=\\frac{2\\pi}{4}=\\frac{\\pi}{2}$。$A$ 和 $\\varphi$ 都不影响周期。',
      },
    },
    {
      question: {
        en: 'How is $y=\\sin\\left(2x-\\frac{\\pi}{3}\\right)$ obtained from $y=\\sin 2x$?',
        zh: '$y=\\sin\\left(2x-\\frac{\\pi}{3}\\right)$ 的图像可由 $y=\\sin 2x$ 怎样平移得到？',
      },
      choices: [
        { en: 'Right by $\\frac{\\pi}{6}$', zh: '向右平移 $\\frac{\\pi}{6}$' },
        { en: 'Right by $\\frac{\\pi}{3}$', zh: '向右平移 $\\frac{\\pi}{3}$' },
        { en: 'Left by $\\frac{\\pi}{6}$', zh: '向左平移 $\\frac{\\pi}{6}$' },
        { en: 'Left by $\\frac{\\pi}{3}$', zh: '向左平移 $\\frac{\\pi}{3}$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\sin\\left(2x-\\frac{\\pi}{3}\\right)=\\sin 2\\left(x-\\frac{\\pi}{6}\\right)$: replace $x$ by $x-\\frac{\\pi}{6}$, a shift right by $\\frac{\\pi}{6}$.',
        zh: '$\\sin\\left(2x-\\frac{\\pi}{3}\\right)=\\sin 2\\left(x-\\frac{\\pi}{6}\\right)$：用 $x-\\frac{\\pi}{6}$ 替换 $x$，即向右平移 $\\frac{\\pi}{6}$。',
      },
    },
    {
      question: {
        en: 'What is the maximum value of $y=2\\sin\\left(x+\\frac{\\pi}{4}\\right)$?',
        zh: '$y=2\\sin\\left(x+\\frac{\\pi}{4}\\right)$ 的最大值是？',
      },
      choices: [
        { en: '$2$', zh: '$2$' },
        { en: '$1$', zh: '$1$' },
        { en: '$2+\\frac{\\pi}{4}$', zh: '$2+\\frac{\\pi}{4}$' },
        { en: '$\\sqrt2$', zh: '$\\sqrt2$' },
      ],
      answer: 0,
      explanation: {
        en: 'The sine is at most $1$, so the maximum is $A=2$. $\\sqrt2$ is the value at $x=0$, not the maximum.',
        zh: '正弦最大是 $1$，所以最大值是 $A=2$。$\\sqrt2$ 是 $x=0$ 处的函数值，不是最大值。',
      },
    },
  ],
  resultTex: 'y = A\\sin(\\omega x + \\varphi)',
  curveSlugs: ['sine-wave'],
  related: ['unit-circle-sine', 'quadratic-transformations'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Transform y = sin x into y = 2 sin(2x + π/3) step by step: double the amplitude, halve the period to π, then show the starting point moving left by π/6 (not π/3) by rewriting it as 2 sin 2(x + π/6).',
    zh: '把 y = sin x 一步步变成 y = 2 sin(2x + π/3)：振幅翻倍，周期缩短为 π，再把式子改写成 2 sin 2(x + π/6)，展示起点向左平移 π/6 而不是 π/3。',
  },
};
