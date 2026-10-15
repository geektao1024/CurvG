import { pick, type Lab } from '../types';

const G = 9.8;

export const simplePendulum: Lab = {
  slug: 'simple-pendulum',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Simple pendulum', zh: '单摆' },
  title: {
    en: 'The simple pendulum: what sets its period',
    zh: '单摆：周期由什么决定',
  },
  question: {
    en: 'Does a heavier bob or a wider swing make a pendulum slower? Only the length does, nearly.',
    zh: '摆球更重、摆得更大，单摆会变慢吗？几乎只有摆长说了算。',
  },
  summary: {
    en: 'Change the length, the swing angle and the mass of the bob. For small swings T = 2π√(L/g): quarter the length and the period halves, while the mass does nothing. Swing wider and the true period creeps above the formula.',
    zh: '调摆长、摆角和摆球质量。小角度下 T = 2π√(L/g)：摆长变为四分之一，周期减半，质量毫无影响。摆角越大，真实周期越比公式算出的长。',
  },
  keyPoints: [
    { en: 'Restoring force mg sin θ', zh: '回复力 mg sin θ' },
    { en: 'Small-angle approximation', zh: '小角度近似' },
    { en: 'T = 2π√(L/g)', zh: '单摆周期公式' },
    { en: 'Seconds pendulum', zh: '秒摆' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-2.8, 2.8], y: [-3.7, 0.4], axes: false },
      params: [
        { id: 'L', label: 'L', min: 0.25, max: 2.5, step: 0.01, value: 1.5 },
        {
          id: 'deg',
          label: '\\theta_0\\,(^\\circ)',
          min: 2,
          max: 60,
          step: 1,
          value: 25,
          bands: [{ from: 2, to: 10, label: t('small angle', '小角度'), color: 'green' }],
        },
        { id: 'm', label: 'm', min: 0.1, max: 2, step: 0.1, value: 0.5 },
        { id: 'T', label: 't', min: 0, max: 10, step: 0.02, value: 0, play: 10 },
      ],
      scalars: [
        { id: 'th0', expr: 'deg * pi / 180' },
        { id: 'P0', expr: `2 * pi * sqrt(L / ${G})` },
        // Large-amplitude period, series in θ0 (good to 0.01% at 60°).
        { id: 'Pt', expr: 'P0 * (1 + th0^2 / 16 + 11 * th0^4 / 3072 + 173 * th0^6 / 737280)' },
        { id: 'th', expr: 'th0 * cos(2 * pi * T / Pt)' },
        { id: 'bx', expr: 'L * sin(th)' },
        { id: 'by', expr: '-L * cos(th)' },
        { id: 'F', expr: `m * ${G} * sin(th)` },
        // Weight drawn 1 long; its components to the same scale.
        { id: 'kf', expr: 'sin(th)' },
        { id: 'fx', expr: 'bx - kf * cos(th)' },
        { id: 'fy', expr: 'by - kf * sin(th)' },
      ],
      objects: [
        { type: 'segment', from: [-0.7, 0], to: [0.7, 0], color: 'ink', width: 4 },
        { type: 'segment', from: [0, 0], to: [0, '-L'], color: 'muted', dashed: true, width: 1 },
        {
          type: 'arc',
          center: [0, 0],
          r: 'L',
          start: '-pi / 2 - th0',
          end: '-pi / 2 + th0',
          color: 'muted',
          dashed: true,
          width: 1.5,
        },
        { type: 'arc', center: [0, 0], r: 0.35, start: '-pi / 2', end: '-pi / 2 + th', color: 'primary', width: 2 },
        { type: 'segment', from: [0, 0], to: ['bx', 'by'], color: 'ink', width: 1.5 },
        { type: 'point', at: [0, 0], color: 'ink', size: 3 },
        { type: 'segment', from: ['bx', 'by'], to: ['bx', 'by - 1'], color: 'muted', width: 2, arrow: true },
        { type: 'text', at: ['bx + 0.08', 'by - 1.05'], text: 'mg', color: 'muted' },
        {
          type: 'segment',
          from: ['bx', 'by'],
          to: ['bx + cos(th) * sin(th)', 'by - cos(th) * cos(th)'],
          color: 'muted',
          width: 1.5,
          dashed: true,
          arrow: true,
        },
        {
          type: 'segment',
          from: ['bx', 'by'],
          to: ['fx', 'fy'],
          color: 'red',
          width: 3,
          arrow: true,
          visible: 'abs(th) > 0.02',
        },
        { type: 'text', at: ['fx', 'fy - 0.22'], text: 'mg sinθ', anchor: 'middle', color: 'red', visible: 'abs(th) > 0.02' },
        { type: 'circle', center: ['bx', 'by'], r: '0.07 + 0.05 * sqrt(m)', fill: true, color: 'primary' },
      ],
      readouts: [
        { label: 'T_0 = 2\\pi\\sqrt{L/g}', expr: 'P0', digits: 2, highlight: true },
        { label: t('T_{\\text{true}}', 'T_{\\text{实际}}'), expr: 'Pt', digits: 2 },
        { label: 'T_{\\text{true}} / T_0', expr: 'Pt / P0', digits: 3 },
        { label: '\\theta\\,(^\\circ)', expr: 'th * 180 / pi', digits: 1 },
        { label: 'F = mg\\sin\\theta', expr: 'F', digits: 2 },
        {
          kind: 'status',
          label: t('Formula', '周期公式'),
          expr: 'Pt / P0 < 1.002',
          ok: t('accurate to 0.2%', '误差小于 0.2%'),
          bad: t('underestimates', '偏小'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'A one-metre pendulum', zh: '一米长的单摆' },
      body: {
        en: 'A $1\\,\\text{m}$ pendulum swung through $10^\\circ$: $T=2\\pi\\sqrt{L/g}\\approx2.01\\,\\text{s}$. Press play and count: one full swing out and back takes about two seconds.',
        zh: '$1\\,\\text{m}$ 长的单摆，摆角 $10^\\circ$：$T=2\\pi\\sqrt{L/g}\\approx2.01\\,\\text{s}$。点播放数一数，来回摆一次大约两秒。',
      },
      set: { L: 1, deg: 10, m: 0.5 },
    },
    {
      title: { en: 'A quarter of the length', zh: '摆长变为四分之一' },
      body: {
        en: 'Shorten the string to $0.25\\,\\text{m}$. The period halves to $1.00\\,\\text{s}$: $T$ grows with $\\sqrt L$, so a quarter of the length gives half the period.',
        zh: '把摆线缩短到 $0.25\\,\\text{m}$，周期减半为 $1.00\\,\\text{s}$：$T$ 与 $\\sqrt L$ 成正比，摆长变为四分之一，周期变为一半。',
      },
      set: { L: 0.25, deg: 10, m: 0.5 },
    },
    {
      title: { en: 'A wide swing runs slow', zh: '摆角太大，周期变长' },
      body: {
        en: 'Back to $1\\,\\text{m}$, now swung through $60^\\circ$. The formula still says $2.01\\,\\text{s}$, but the true period is about $2.15\\,\\text{s}$, roughly $7\\%$ longer. $T=2\\pi\\sqrt{L/g}$ rests on $\\sin\\theta\\approx\\theta$, which only holds for small angles.',
        zh: '回到 $1\\,\\text{m}$，摆角加到 $60^\\circ$。公式仍给出 $2.01\\,\\text{s}$，实际周期约 $2.15\\,\\text{s}$，长了约 $7\\%$。$T=2\\pi\\sqrt{L/g}$ 依赖 $\\sin\\theta\\approx\\theta$，只在小角度时成立。',
      },
      set: { L: 1, deg: 60, m: 0.5 },
    },
    {
      title: { en: 'The seconds pendulum', zh: '秒摆' },
      body: {
        en: 'Set $L=0.99\\,\\text{m}$, a small swing and a bob four times heavier. The period is $2.00\\,\\text{s}$, one second each way, and the mass changed nothing: a heavier bob feels more pull but is harder to move by the same factor. Clockmakers used exactly this length.',
        zh: '令 $L=0.99\\,\\text{m}$、小摆角，摆球换成 4 倍重。周期是 $2.00\\,\\text{s}$，单程正好一秒；质量没有任何影响：摆球越重，受的回复力越大，但也越难推动，两者抵消。老式摆钟用的就是这个摆长。',
      },
      set: { L: 0.99, deg: 10, m: 2 },
    },
  ],
  sections: [
    {
      id: 'restoring',
      title: { en: 'Where the restoring force comes from', zh: '回复力从哪里来' },
      body: {
        en: 'Split gravity along the string and along the arc. The string cancels the first part; the second, $mg\\sin\\theta$, pulls the bob back toward the bottom. Along the arc the displacement is $s=L\\theta$, so\n\n$$F=-mg\\sin\\theta\\approx-mg\\theta=-\\frac{mg}{L}\\,s$$\n\nFor small $\\theta$ this has the form $F=-ks$ with $k=mg/L$: the pendulum moves like a mass on a spring.',
        zh: '把重力分解到沿摆线和沿圆弧两个方向。沿摆线的分力被拉力抵消，沿圆弧的分力 $mg\\sin\\theta$ 把摆球拉回最低点。沿圆弧的位移是 $s=L\\theta$，于是\n\n$$F=-mg\\sin\\theta\\approx-mg\\theta=-\\frac{mg}{L}\\,s$$\n\n$\\theta$ 很小时它就是 $F=-ks$ 的形式，其中 $k=mg/L$：单摆的运动和弹簧振子一样。',
      },
    },
    {
      id: 'period',
      title: { en: 'The period formula', zh: '周期公式' },
      body: {
        en: 'Put $k=mg/L$ into the spring formula $T=2\\pi\\sqrt{m/k}$:\n\n$$T=2\\pi\\sqrt{\\frac Lg}$$\n\nThe mass cancels and the amplitude never appeared. Measure $T$ and $L$ and you can work out $g$, which is how $g$ was measured for two centuries.',
        zh: '把 $k=mg/L$ 代入弹簧振子的周期 $T=2\\pi\\sqrt{m/k}$：\n\n$$T=2\\pi\\sqrt{\\frac Lg}$$\n\n质量约掉了，振幅也没有出现。测出 $T$ 和 $L$ 就能算出 $g$，两百年来人们一直这样测重力加速度。',
      },
    },
    {
      id: 'large',
      title: { en: 'When the angle is not small', zh: '摆角不小时' },
      body: {
        en: 'Since $\\sin\\theta<\\theta$, the real restoring force is weaker than the approximation, so a wide swing takes longer. The correction starts as\n\n$$T\\approx2\\pi\\sqrt{\\frac Lg}\\left(1+\\frac{\\theta_0^2}{16}+\\cdots\\right)$$\n\nBelow about $10^\\circ$ the error is under $0.2\\%$, which is why textbooks ask for small swings.',
        zh: '因为 $\\sin\\theta<\\theta$，真实的回复力比近似值小，所以摆角大时周期更长。修正项开头是\n\n$$T\\approx2\\pi\\sqrt{\\frac Lg}\\left(1+\\frac{\\theta_0^2}{16}+\\cdots\\right)$$\n\n摆角小于约 $10^\\circ$ 时误差不到 $0.2\\%$，所以课本要求摆角要小。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A pendulum has a period of $2\\,\\text{s}$. Its length is made four times longer. The new period is',
        zh: '单摆周期为 $2\\,\\text{s}$，把摆长变为原来的 4 倍，新周期为',
      },
      choices: [
        { en: '$8\\,\\text{s}$', zh: '$8\\,\\text{s}$' },
        { en: '$4\\,\\text{s}$', zh: '$4\\,\\text{s}$' },
        { en: '$1\\,\\text{s}$', zh: '$1\\,\\text{s}$' },
        { en: '$2\\,\\text{s}$', zh: '$2\\,\\text{s}$' },
      ],
      answer: 1,
      explanation: {
        en: '$T\\propto\\sqrt L$: four times the length, twice the period.',
        zh: '$T\\propto\\sqrt L$：摆长 4 倍，周期 2 倍。',
      },
    },
    {
      question: {
        en: 'The same pendulum is taken to the Moon, where $g$ is about $\\tfrac16$ of Earth\'s. Its period',
        zh: '把同一个单摆带到月球上，那里的 $g$ 约为地球的 $\\tfrac16$。周期',
      },
      choices: [
        { en: 'is unchanged', zh: '不变' },
        { en: 'becomes 6 times longer', zh: '变为 6 倍' },
        { en: 'becomes about 2.45 times longer', zh: '变为约 2.45 倍' },
        { en: 'becomes 6 times shorter', zh: '变为六分之一' },
      ],
      answer: 2,
      explanation: {
        en: '$T\\propto1/\\sqrt g$, so it grows by $\\sqrt6\\approx2.45$.',
        zh: '$T\\propto1/\\sqrt g$，变为 $\\sqrt6\\approx2.45$ 倍。',
      },
    },
    {
      question: {
        en: 'Which change makes a pendulum swing more slowly (longer period)?',
        zh: '下列哪种改变会让单摆周期变长？',
      },
      choices: [
        { en: 'A heavier bob', zh: '换更重的摆球' },
        { en: 'A lighter bob', zh: '换更轻的摆球' },
        { en: 'A shorter string', zh: '缩短摆线' },
        { en: 'A much wider swing', zh: '把摆角加得很大' },
      ],
      answer: 3,
      explanation: {
        en: 'Mass does not appear in the period and a shorter string speeds it up. A wide swing breaks $\\sin\\theta\\approx\\theta$ and lengthens the period.',
        zh: '周期与质量无关，缩短摆线周期变短。摆角很大时 $\\sin\\theta\\approx\\theta$ 不再成立，周期变长。',
      },
    },
  ],
  resultTex: 'T = 2\\pi\\sqrt{\\dfrac{L}{g}}',
  related: ['spring-oscillator', 'energy-conservation', 'circular-motion'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Explain the simple pendulum: a bob on a 1 m string swinging through 10°, with the gravity component mg sin θ drawn as a restoring arrow along the arc. Derive T = 2π√(L/g) ≈ 2.01 s from F ≈ −(mg/L)s; show that a quarter of the length halves the period, that a 60° swing runs about 7% slow (2.15 s), and that a 0.99 m seconds pendulum ticks every second whatever the bob weighs.',
    zh: '讲解单摆：1 米长的摆线、摆角 10°，把重力沿圆弧的分力 mg sin θ 画成回复力箭头。由 F ≈ −(mg/L)s 推出 T = 2π√(L/g) ≈ 2.01 s；摆长变为四分之一周期减半；摆角 60° 时实际周期约 2.15 s，长了约 7%；0.99 米的秒摆单程正好一秒，与摆球质量无关。',
  },
};
