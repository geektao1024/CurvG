import { pick, type Lab } from '../types';

/** Where the x–t graph starts on the board, and board units per second. */
const GX = -1.5;
const SCALE = 1.6;

export const springOscillator: Lab = {
  slug: 'spring-oscillator',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Mass on a spring', zh: '弹簧振子' },
  title: {
    en: 'Mass on a spring: simple harmonic motion and its period',
    zh: '弹簧振子：简谐运动与周期公式',
  },
  question: {
    en: 'What sets how fast a mass on a spring bounces, and why does pulling it further not change that?',
    zh: '弹簧振子振动快慢由什么决定？为什么拉得更远，周期却不变？',
  },
  summary: {
    en: 'Change the spring constant, the mass and the amplitude and watch the mass trace a cosine on the x–t graph beside it. The period T = 2π√(m/k) depends on k and m, never on how far you pull.',
    zh: '调劲度系数、质量和振幅，看振子在旁边的 x-t 图上画出一条余弦曲线。周期 T = 2π√(m/k) 只取决于 k 和 m，与拉开多远无关。',
  },
  keyPoints: [
    { en: 'Restoring force F = −kx', zh: '回复力 F = −kx' },
    { en: 'Simple harmonic motion', zh: '简谐运动' },
    { en: 'Period and frequency', zh: '周期与频率' },
    { en: 'x–t graph', zh: 'x-t 图像' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-4.6, 10.6], y: [-2.8, 4], axes: false },
      params: [
        { id: 'k', label: 'k', min: 2, max: 50, step: 1, value: 8 },
        { id: 'm', label: 'm', min: 0.5, max: 8, step: 0.5, value: 2 },
        { id: 'A', label: 'A', min: 0.5, max: 2, step: 0.1, value: 1.5 },
        { id: 'T', label: 't', min: 0, max: 7, step: 0.02, value: 0.6, play: 14 },
      ],
      scalars: [
        { id: 'w', expr: 'sqrt(k / m)' },
        { id: 'P', expr: '2 * pi / w' },
        { id: 'xd', expr: 'A * cos(w * T)' },
        { id: 'v', expr: '-A * w * sin(w * T)' },
        { id: 'gx', expr: `${GX} + ${SCALE} * T` },
        { id: 'lv', expr: 'clamp(0.3 * v, -1.8, 1.8)' },
      ],
      objects: [
        { type: 'segment', from: [-4, 3.6], to: [-2, 3.6], color: 'ink', width: 4 },
        {
          type: 'parametric',
          variable: 'u',
          x: '-3 + 0.22 * sin(16 * pi * u)',
          y: '3.6 - (3.25 - xd) * u',
          range: [0, 1],
          samples: 320,
          color: 'ink',
          width: 1.5,
        },
        {
          type: 'polygon',
          points: [
            [-3.35, 'xd - 0.35'],
            [-2.65, 'xd - 0.35'],
            [-2.65, 'xd + 0.35'],
            [-3.35, 'xd + 0.35'],
          ],
          fill: true,
          color: 'primary',
          opacity: 0.6,
        },
        { type: 'segment', from: [-4.2, 0], to: [-1.9, 0], color: 'muted', dashed: true, width: 1 },
        {
          type: 'segment',
          from: [-2.4, 'xd'],
          to: [-2.4, 'xd + lv'],
          color: 'blue',
          width: 2.5,
          arrow: true,
          label: 'v',
          visible: 'abs(v) > 0.05',
        },
        // x–t graph to the right, sharing the vertical scale with the mass.
        { type: 'segment', from: [GX, 0], to: [10.3, 0], color: 'ink', width: 1.5, arrow: true },
        { type: 'segment', from: [GX, -2.4], to: [GX, 2.5], color: 'ink', width: 1.5, arrow: true },
        { type: 'text', at: [10.3, -0.45], text: 't / s', color: 'muted', anchor: 'end' },
        { type: 'text', at: [GX + 0.15, 2.45], text: 'x / m', color: 'muted' },
        { type: 'segment', from: [GX, 'A'], to: [10, 'A'], color: 'muted', dashed: true, width: 1, opacity: 0.6 },
        { type: 'segment', from: [GX, '-A'], to: [10, '-A'], color: 'muted', dashed: true, width: 1, opacity: 0.6 },
        {
          type: 'parametric',
          variable: 'u',
          x: `${GX} + ${SCALE} * u`,
          y: 'A * cos(w * u)',
          range: [0, 7],
          samples: 600,
          color: 'muted',
          width: 1.5,
          dashed: true,
        },
        {
          type: 'parametric',
          variable: 'u',
          x: `${GX} + ${SCALE} * u`,
          y: 'A * cos(w * u)',
          range: [0, 'T'],
          samples: 600,
          color: 'primary',
          width: 3,
        },
        {
          type: 'segment',
          from: [`${GX} + ${SCALE} * P`, -0.25],
          to: [`${GX} + ${SCALE} * P`, 0.25],
          color: 'green',
          width: 2.5,
          label: 'T',
          visible: 'P < 7',
        },
        { type: 'segment', from: [-2.65, 'xd'], to: ['gx', 'xd'], color: 'muted', dashed: true, width: 1 },
        { type: 'point', at: ['gx', 'xd'], color: 'primary', size: 6 },
        { type: 'point', at: [GX, 'A'], color: 'amber', size: 6, drag: { y: 'A' }, label: 'A' },
      ],
      readouts: [
        { label: '\\omega = \\sqrt{k/m}', expr: 'w', digits: 2 },
        { label: 'T = 2\\pi\\sqrt{m/k}', expr: 'P', digits: 2, highlight: true },
        { label: 'x', expr: 'xd', digits: 2 },
        { label: 'v', expr: 'v', digits: 2 },
        { label: 'v_{\\max} = A\\omega', expr: 'A * w', digits: 2 },
        { label: 'a = -\\omega^2 x', expr: '-w^2 * xd', digits: 2 },
        {
          kind: 'status',
          label: t('Mass', '振子'),
          expr: 'abs(xd) < 0.05',
          ok: t('passing equilibrium', '经过平衡位置'),
          bad: t('away from equilibrium', '偏离平衡位置'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'One bounce takes π seconds', zh: '振动一次用时 π 秒' },
      body: {
        en: 'A $2\\,\\text{kg}$ mass on a spring with $k=8\\,\\text{N/m}$: $\\omega=\\sqrt{k/m}=2\\,\\text{rad/s}$ and the period is $T=2\\pi/\\omega=\\pi\\approx3.14\\,\\text{s}$. Press play and watch the mass draw $x=A\\cos\\omega t$ on the graph.',
        zh: '质量 $2\\,\\text{kg}$ 的振子挂在 $k=8\\,\\text{N/m}$ 的弹簧上：$\\omega=\\sqrt{k/m}=2\\,\\text{rad/s}$，周期 $T=2\\pi/\\omega=\\pi\\approx3.14\\,\\text{s}$。点播放，看振子在右边画出 $x=A\\cos\\omega t$。',
      },
      set: { k: 8, m: 2, A: 1.5 },
    },
    {
      title: { en: 'A spring four times stiffer', zh: '弹簧硬 4 倍' },
      body: {
        en: 'Raise $k$ to $32\\,\\text{N/m}$. Now $\\omega=4\\,\\text{rad/s}$ and $T\\approx1.57\\,\\text{s}$: four times the stiffness, half the period, because $T\\propto\\dfrac{1}{\\sqrt k}$.',
        zh: '把 $k$ 调到 $32\\,\\text{N/m}$。此时 $\\omega=4\\,\\text{rad/s}$，$T\\approx1.57\\,\\text{s}$：劲度系数变成 4 倍，周期减半，因为 $T\\propto\\dfrac{1}{\\sqrt k}$。',
      },
      set: { k: 32, m: 2, A: 1.5 },
    },
    {
      title: { en: 'A mass four times heavier', zh: '质量变成 4 倍' },
      body: {
        en: 'Back to $k=8$, but hang $8\\,\\text{kg}$. Now $\\omega=1\\,\\text{rad/s}$ and $T=2\\pi\\approx6.28\\,\\text{s}$: a heavier mass is harder to turn round, so the period doubles.',
        zh: '$k$ 回到 $8$，换上 $8\\,\\text{kg}$ 的振子。$\\omega=1\\,\\text{rad/s}$，$T=2\\pi\\approx6.28\\,\\text{s}$：质量越大越难掉头，周期翻倍。',
      },
      set: { k: 8, m: 8, A: 1.5 },
    },
    {
      title: { en: 'Amplitude does not matter', zh: '振幅不影响周期' },
      body: {
        en: 'Return to $k=8$, $m=2$ and cut the amplitude to $0.5\\,\\text{m}$. The period is still $3.14\\,\\text{s}$; the top speed drops from $A\\omega=3\\,\\text{m/s}$ to $1\\,\\text{m/s}$. A shorter trip, taken more slowly, in the same time.',
        zh: '回到 $k=8$、$m=2$，把振幅减到 $0.5\\,\\text{m}$。周期仍是 $3.14\\,\\text{s}$，最大速度从 $A\\omega=3\\,\\text{m/s}$ 降到 $1\\,\\text{m/s}$：路程短了，走得也慢了，用时一样。',
      },
      set: { k: 8, m: 2, A: 0.5 },
    },
  ],
  sections: [
    {
      id: 'restoring',
      title: { en: 'A force that always points home', zh: '总指向平衡位置的回复力' },
      body: {
        en: 'Measure $x$ from the equilibrium position. Stretch the spring by $x$ and it pulls back with\n\n$$F=-kx$$\n\nThe minus sign says the force points back toward equilibrium, and it grows the further you go. Any motion driven by a force like this is **simple harmonic motion**. For a hanging spring gravity only moves the equilibrium point down; measured from there, the force is still $-kx$.',
        zh: '以平衡位置为原点量位移 $x$。弹簧被拉伸 $x$ 时，拉回来的力是\n\n$$F=-kx$$\n\n负号表示力总指向平衡位置，而且离得越远力越大。受这种力的运动就是**简谐运动**。竖直悬挂的弹簧，重力只是把平衡位置往下移了；从新的平衡位置量起，合力仍是 $-kx$。',
      },
    },
    {
      id: 'period',
      title: { en: 'The period formula', zh: '周期公式' },
      body: {
        en: 'Newton\'s second law, $ma=-kx$, asks for a motion whose acceleration is $-\\frac km$ times its position. Try $x=A\\cos\\omega t$: differentiating twice gives $a=-\\omega^2A\\cos\\omega t=-\\omega^2x$, which fits exactly when $\\omega^2=\\frac km$. So\n\n$$T=\\frac{2\\pi}{\\omega}=2\\pi\\sqrt{\\frac mk}$$\n\n$A$ does not appear: pull further and the force is larger in proportion, so the mass covers the longer trip in the same time. This is why a spring makes a good clock.',
        zh: '牛顿第二定律 $ma=-kx$ 要求加速度始终是位移的 $-\\frac km$ 倍。试 $x=A\\cos\\omega t$：求两次导数得 $a=-\\omega^2A\\cos\\omega t=-\\omega^2x$，只要 $\\omega^2=\\frac km$ 就完全吻合。于是\n\n$$T=\\frac{2\\pi}{\\omega}=2\\pi\\sqrt{\\frac mk}$$\n\n式子里没有 $A$：拉得越远，回复力也按比例越大，更长的路程用同样的时间走完。所以弹簧可以用来计时。',
      },
    },
    {
      id: 'graph',
      title: { en: 'Reading the x–t graph', zh: '读懂 x-t 图' },
      body: {
        en: 'At the ends ($x=\\pm A$) the mass stops for an instant and the force, and so the acceleration $a=-\\omega^2x$, is largest. Through equilibrium ($x=0$) the force is zero and the speed is largest, $v_{\\max}=A\\omega$. On the graph, speed is the steepness of the curve: flat at the peaks, steepest where it crosses the axis.',
        zh: '在两端（$x=\\pm A$）振子瞬间停住，回复力和加速度 $a=-\\omega^2x$ 最大；经过平衡位置（$x=0$）时回复力为零，速度最大，$v_{\\max}=A\\omega$。在图上，速度就是曲线的陡峭程度：波峰处是平的，穿过横轴处最陡。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A $0.5\\,\\text{kg}$ mass on a spring with $k=200\\,\\text{N/m}$ has a period of about',
        zh: '$0.5\\,\\text{kg}$ 的振子挂在 $k=200\\,\\text{N/m}$ 的弹簧上，周期约为',
      },
      choices: [
        { en: '$0.31\\,\\text{s}$', zh: '$0.31\\,\\text{s}$' },
        { en: '$3.14\\,\\text{s}$', zh: '$3.14\\,\\text{s}$' },
        { en: '$0.05\\,\\text{s}$', zh: '$0.05\\,\\text{s}$' },
        { en: '$20\\,\\text{s}$', zh: '$20\\,\\text{s}$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\omega=\\sqrt{200/0.5}=20\\,\\text{rad/s}$, so $T=2\\pi/20\\approx0.31\\,\\text{s}$.',
        zh: '$\\omega=\\sqrt{200/0.5}=20\\,\\text{rad/s}$，所以 $T=2\\pi/20\\approx0.31\\,\\text{s}$。',
      },
    },
    {
      question: {
        en: 'Pull the same mass twice as far before letting go. The period',
        zh: '把同一个振子拉开到原来的 2 倍再释放，周期',
      },
      choices: [
        { en: 'doubles', zh: '加倍' },
        { en: 'stays the same', zh: '不变' },
        { en: 'halves', zh: '减半' },
        { en: 'grows by $\\sqrt2$', zh: '变为 $\\sqrt2$ 倍' },
      ],
      answer: 1,
      explanation: {
        en: '$T=2\\pi\\sqrt{m/k}$ has no amplitude in it. The top speed doubles instead.',
        zh: '$T=2\\pi\\sqrt{m/k}$ 中没有振幅。变成 2 倍的是最大速度。',
      },
    },
    {
      question: {
        en: 'Where is the mass moving fastest?',
        zh: '振子在哪里速度最大？',
      },
      choices: [
        { en: 'At the highest point', zh: '最高点' },
        { en: 'At the lowest point', zh: '最低点' },
        { en: 'At equilibrium', zh: '平衡位置' },
        { en: 'Halfway between equilibrium and an end', zh: '平衡位置与端点的中间' },
      ],
      answer: 2,
      explanation: {
        en: 'The restoring force speeds the mass up all the way back to equilibrium and slows it after. At the ends it stops.',
        zh: '回复力一路把振子加速到平衡位置，过了平衡位置才开始减速；在两端速度为零。',
      },
    },
  ],
  resultTex: 'T = 2\\pi\\sqrt{\\dfrac{m}{k}}',
  related: ['simple-pendulum', 'unit-circle-sine', 'circular-motion'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Explain the mass on a spring: a 2 kg mass on a k = 8 N/m spring bouncing beside its x–t graph, which traces x = A cos ωt. Show F = −kx, ω = √(k/m) = 2 rad/s and T = 2π√(m/k) ≈ 3.14 s; a spring four times stiffer halves the period, a mass four times heavier doubles it, and cutting the amplitude to a third leaves the period unchanged while the top speed drops from 3 to 1 m/s.',
    zh: '讲解弹簧振子：2 kg 振子挂在 k = 8 N/m 的弹簧上振动，旁边同步画出 x = A cos ωt 的 x-t 图。展示 F = −kx、ω = √(k/m) = 2 rad/s、T = 2π√(m/k) ≈ 3.14 s；弹簧硬 4 倍周期减半，质量变 4 倍周期翻倍，振幅减为三分之一时周期不变，最大速度从 3 m/s 降到 1 m/s。',
  },
};
