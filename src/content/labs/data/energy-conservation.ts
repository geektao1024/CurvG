import { pick, type Lab } from '../types';

const G = 9.8;

/** Energy bars: left edges, width, baseline and full height on the board. */
const BAR = { y0: 1, h: 3.6, w: 1 };
const bar = (x: number, expr: string): Array<[number | string, number | string]> => [
  [x, BAR.y0],
  [x + BAR.w, BAR.y0],
  [x + BAR.w, `${BAR.y0} + ${BAR.h} * (${expr}) / E`],
  [x, `${BAR.y0} + ${BAR.h} * (${expr}) / E`],
];

export const energyConservation: Lab = {
  slug: 'energy-conservation',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Energy conservation', zh: '动能定理与能量守恒' },
  title: {
    en: 'Work and energy: a slide, a rough floor, and where the energy goes',
    zh: '动能定理与能量守恒：滑下来的能量去哪了',
  },
  question: {
    en: 'How fast is a block at the bottom of a slide, and how far does it get on a rough floor?',
    zh: '物块滑到底时速度多大？在粗糙地面上能滑多远？',
  },
  summary: {
    en: 'Move a block down a smooth curved slide and across a rough floor. The bars show potential energy turning into kinetic energy and then into heat; the total never changes, so v = √(2gh) at the bottom and the block stops after h/μ.',
    zh: '让物块沿光滑曲面滑下，再滑过粗糙地面。能量条显示重力势能变成动能、再变成摩擦生热，总量始终不变：滑到底时 v = √(2gh)，在地面上滑行 h/μ 后停下。',
  },
  keyPoints: [
    { en: 'Kinetic and potential energy', zh: '动能与重力势能' },
    { en: 'Work–energy theorem', zh: '动能定理' },
    { en: 'Conservation of mechanical energy', zh: '机械能守恒' },
    { en: 'Work done by friction', zh: '摩擦力做功' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-7, 12.8], y: [-1.2, 6] },
      params: [
        { id: 'h', label: 'h', min: 1, max: 5, step: 0.5, value: 3 },
        { id: 'm', label: 'm', min: 0.5, max: 5, step: 0.5, value: 1 },
        {
          id: 'mu',
          label: '\\mu',
          min: 0,
          max: 0.8,
          step: 0.05,
          value: 0.3,
          bands: [{ from: 0, to: 0, label: t('smooth', '光滑'), color: 'green' }],
        },
        { id: 'X', label: 'x', min: -6, max: 12, step: 0.05, value: -3, play: 8 },
      ],
      scalars: [
        // Stopping point on the floor; effectively never when μ = 0.
        { id: 'd', expr: 'h / max(mu, 0.0001)' },
        { id: 'xs', expr: 'min(X, d)' },
        { id: 'y', expr: 'xs < 0 ? h * (xs / 6)^2 : 0' },
        { id: 'E', expr: `m * ${G} * h` },
        { id: 'Ep', expr: `m * ${G} * y` },
        { id: 'Q', expr: `mu * m * ${G} * max(xs, 0)` },
        { id: 'Ek', expr: 'max(E - Ep - Q, 0)' },
        { id: 'v', expr: 'sqrt(2 * Ek / m)' },
        // Direction of travel along the track.
        { id: 'slope', expr: 'xs < 0 ? h * xs / 18 : 0' },
        { id: 'lv', expr: '0.25 * v / hypot(1, slope)' },
      ],
      objects: [
        { type: 'segment', from: [-7, 'h'], to: [-6, 'h'], color: 'ink', width: 2 },
        {
          type: 'parametric',
          variable: 'u',
          x: 'u',
          y: 'h * (u / 6)^2',
          range: [-6, 0],
          color: 'ink',
          width: 2,
        },
        { type: 'segment', from: [0, 0], to: [12.8, 0], color: 'ink', width: 2 },
        { type: 'segment', from: [0, -0.06], to: [12.8, -0.06], color: 'amber', width: 5, opacity: 0.6, visible: 'mu > 0' },
        { type: 'segment', from: ['d', -0.6], to: ['d', 0.6], color: 'green', width: 2.5, label: t('stops', '停下'), visible: 'd < 12.5' },
        {
          type: 'segment',
          from: ['xs', 'y + 0.25'],
          to: ['xs + lv', 'y + 0.25 + lv * slope'],
          color: 'blue',
          width: 2.5,
          arrow: true,
          label: 'v',
          visible: 'v > 0.05',
        },
        { type: 'point', at: ['xs', 'y + 0.25'], color: 'primary', size: 9, drag: { x: 'X' } },
        // Energy bars, scaled so the starting energy fills the dashed line.
        { type: 'polygon', points: bar(3.6, 'Ep'), fill: true, color: 'blue', opacity: 0.7 },
        { type: 'polygon', points: bar(5.2, 'Ek'), fill: true, color: 'red', opacity: 0.7 },
        { type: 'polygon', points: bar(6.8, 'Q'), fill: true, color: 'amber', opacity: 0.8 },
        { type: 'segment', from: [3.4, BAR.y0 + BAR.h], to: [8, BAR.y0 + BAR.h], color: 'muted', dashed: true, width: 1, label: 'mgh' },
        { type: 'segment', from: [3.4, BAR.y0], to: [8, BAR.y0], color: 'muted', width: 1 },
        { type: 'text', at: [4.1, 0.45], text: 'Ep', anchor: 'middle', color: 'blue' },
        { type: 'text', at: [5.7, 0.45], text: 'Ek', anchor: 'middle', color: 'red' },
        { type: 'text', at: [7.3, 0.45], text: 'Q', anchor: 'middle', color: 'amber' },
      ],
      readouts: [
        { label: 'E_p = mgy', expr: 'Ep', digits: 2 },
        { label: 'E_k = \\tfrac12 mv^2', expr: 'Ek', digits: 2 },
        { label: 'Q = \\mu mg\\,s', expr: 'Q', digits: 2 },
        { label: 'E_p + E_k + Q', expr: 'Ep + Ek + Q', digits: 2 },
        { label: 'v', expr: 'v', digits: 2, highlight: true },
        {
          kind: 'status',
          label: t('Block', '物块'),
          expr: 'Ek > 0.000001',
          ok: t('moving', '运动中'),
          bad: t('stopped', '已停下'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Halfway down a smooth slide', zh: '光滑曲面的半路上' },
      body: {
        en: 'A $1\\,\\text{kg}$ block starts from rest $3\\,\\text{m}$ up, with $E=mgh=29.4\\,\\text{J}$. Partway down it is $0.75\\,\\text{m}$ high: $E_p=7.35\\,\\text{J}$ is left as potential energy and the other $22.05\\,\\text{J}$ has become kinetic, so $v\\approx6.64\\,\\text{m/s}$.',
        zh: '$1\\,\\text{kg}$ 的物块从 $3\\,\\text{m}$ 高处由静止滑下，总能量 $E=mgh=29.4\\,\\text{J}$。滑到 $0.75\\,\\text{m}$ 高处时，还剩 $E_p=7.35\\,\\text{J}$ 的势能，另外 $22.05\\,\\text{J}$ 变成了动能，$v\\approx6.64\\,\\text{m/s}$。',
      },
      set: { h: 3, m: 1, mu: 0, X: -3 },
    },
    {
      title: { en: 'At the bottom', zh: '滑到底端' },
      body: {
        en: 'At the bottom all $29.4\\,\\text{J}$ is kinetic: $\\tfrac12mv^2=mgh$ gives $v=\\sqrt{2gh}\\approx7.67\\,\\text{m/s}$. The shape of the slide and the mass of the block do not enter; only the drop does.',
        zh: '到底端时 $29.4\\,\\text{J}$ 全部变成动能：由 $\\tfrac12mv^2=mgh$ 得 $v=\\sqrt{2gh}\\approx7.67\\,\\text{m/s}$。曲面的形状、物块的质量都不影响结果，只看下降的高度。',
      },
      set: { h: 3, m: 1, mu: 0, X: 0 },
    },
    {
      title: { en: 'Onto a rough floor', zh: '滑上粗糙地面' },
      body: {
        en: 'Now the floor has $\\mu=0.3$. After $5\\,\\text{m}$ friction has done $\\mu mg\\,s=14.7\\,\\text{J}$ of negative work, turned into heat. Half the energy is gone and $v\\approx5.42\\,\\text{m/s}$. The bars still add up to $29.4\\,\\text{J}$.',
        zh: '让地面的 $\\mu=0.3$。滑过 $5\\,\\text{m}$ 后，摩擦力做了 $\\mu mg\\,s=14.7\\,\\text{J}$ 的负功，变成了热。能量去了一半，$v\\approx5.42\\,\\text{m/s}$，三根能量条加起来仍是 $29.4\\,\\text{J}$。',
      },
      set: { h: 3, m: 1, mu: 0.3, X: 5 },
    },
    {
      title: { en: 'Where it stops', zh: '停在哪里' },
      body: {
        en: 'The work–energy theorem from start to stop: $mgh-\\mu mg\\,d=0$, so $d=\\dfrac h\\mu=10\\,\\text{m}$. Double the mass to $2\\,\\text{kg}$ and all $58.8\\,\\text{J}$ still turns to heat at exactly the same spot.',
        zh: '对全过程用动能定理：$mgh-\\mu mg\\,d=0$，所以 $d=\\dfrac h\\mu=10\\,\\text{m}$。质量加倍到 $2\\,\\text{kg}$，$58.8\\,\\text{J}$ 依然在同一个位置全部变成热。',
      },
      set: { h: 3, m: 2, mu: 0.3, X: 10 },
    },
  ],
  sections: [
    {
      id: 'theorem',
      title: { en: 'The work–energy theorem', zh: '动能定理' },
      body: {
        en: 'The net work done on a body equals the change in its kinetic energy:\n\n$$W_{\\text{net}}=\\tfrac12mv_2^2-\\tfrac12mv_1^2$$\n\nIt only needs the start and the end, not what happens in between, which is why it handles curved slides that Newton\'s laws would make hard. Gravity does $mgh$ of work on the way down; friction does $-\\mu mg\\,s$ on the floor.',
        zh: '合外力对物体做的功等于物体动能的变化：\n\n$$W_{\\text{合}}=\\tfrac12mv_2^2-\\tfrac12mv_1^2$$\n\n它只看始末状态，不管中间过程，所以曲面这类用牛顿定律很难算的问题，用它一步就能解决。下滑时重力做功 $mgh$，在地面上摩擦力做功 $-\\mu mg\\,s$。',
      },
    },
    {
      id: 'conservation',
      title: { en: 'Mechanical energy is conserved, until friction', zh: '机械能守恒，直到出现摩擦' },
      body: {
        en: 'When only gravity does work, potential plus kinetic energy stays fixed:\n\n$$mgh_1+\\tfrac12mv_1^2=mgh_2+\\tfrac12mv_2^2$$\n\nThe normal force does no work because it is always perpendicular to the motion. Friction does, and the energy it removes reappears as heat $Q=\\mu mg\\,s$. Count the heat and the total is still conserved.',
        zh: '只有重力做功时，势能与动能之和保持不变：\n\n$$mgh_1+\\tfrac12mv_1^2=mgh_2+\\tfrac12mv_2^2$$\n\n支持力始终与运动方向垂直，不做功。摩擦力做功，拿走的机械能变成了热 $Q=\\mu mg\\,s$；把热也算进去，总能量仍然守恒。',
      },
    },
    {
      id: 'mass',
      title: { en: 'Why the mass keeps cancelling', zh: '为什么质量总被约掉' },
      body: {
        en: 'Every term here has an $m$: $mgh$, $\\tfrac12mv^2$, $\\mu mg\\,s$. Divide it out and the speed at the bottom, $v=\\sqrt{2gh}$, and the stopping distance, $d=h/\\mu$, are the same for a feather-light block and a heavy one, as long as air resistance is ignored.',
        zh: '这里每一项都带 $m$：$mgh$、$\\tfrac12mv^2$、$\\mu mg\\,s$。约掉后，底端速度 $v=\\sqrt{2gh}$ 和滑行距离 $d=h/\\mu$ 对轻物块和重物块都一样（忽略空气阻力）。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A child slides from rest down a smooth slide $5\\,\\text{m}$ high. Speed at the bottom ($g=9.8\\,\\text{m/s}^2$)?',
        zh: '小孩从 $5\\,\\text{m}$ 高的光滑滑梯顶端由静止滑下，到底端的速度约为（$g=9.8\\,\\text{m/s}^2$）',
      },
      choices: [
        { en: '$9.9\\,\\text{m/s}$', zh: '$9.9\\,\\text{m/s}$' },
        { en: '$49\\,\\text{m/s}$', zh: '$49\\,\\text{m/s}$' },
        { en: '$7.0\\,\\text{m/s}$', zh: '$7.0\\,\\text{m/s}$' },
        { en: 'It depends on the child\'s mass', zh: '取决于小孩的质量' },
      ],
      answer: 0,
      explanation: {
        en: '$v=\\sqrt{2gh}=\\sqrt{98}\\approx9.9\\,\\text{m/s}$, for any mass and any slide shape.',
        zh: '$v=\\sqrt{2gh}=\\sqrt{98}\\approx9.9\\,\\text{m/s}$，与质量和滑梯形状无关。',
      },
    },
    {
      question: {
        en: 'A block reaches a rough floor ($\\mu=0.25$) at $5\\,\\text{m/s}$. How far does it slide?',
        zh: '物块以 $5\\,\\text{m/s}$ 滑上 $\\mu=0.25$ 的粗糙地面，能滑行多远？',
      },
      choices: [
        { en: '$20\\,\\text{m}$', zh: '$20\\,\\text{m}$' },
        { en: 'about $5.1\\,\\text{m}$', zh: '约 $5.1\\,\\text{m}$' },
        { en: 'about $10.2\\,\\text{m}$', zh: '约 $10.2\\,\\text{m}$' },
        { en: '$1.25\\,\\text{m}$', zh: '$1.25\\,\\text{m}$' },
      ],
      answer: 1,
      explanation: {
        en: '$\\tfrac12mv^2=\\mu mg\\,d$, so $d=\\dfrac{v^2}{2\\mu g}=\\dfrac{25}{4.9}\\approx5.1\\,\\text{m}$.',
        zh: '$\\tfrac12mv^2=\\mu mg\\,d$，$d=\\dfrac{v^2}{2\\mu g}=\\dfrac{25}{4.9}\\approx5.1\\,\\text{m}$。',
      },
    },
    {
      question: {
        en: 'On the curved slide, the normal force does',
        zh: '物块沿曲面下滑时，支持力做的功',
      },
      choices: [
        { en: 'positive work', zh: '为正' },
        { en: 'negative work', zh: '为负' },
        { en: 'no work', zh: '为零' },
        { en: 'work equal to $mgh$', zh: '等于 $mgh$' },
      ],
      answer: 2,
      explanation: {
        en: 'It is perpendicular to the direction of motion at every point, so it does no work. That is why mechanical energy is conserved on a smooth slide of any shape.',
        zh: '支持力每时每刻都与运动方向垂直，不做功。正因如此，任何形状的光滑曲面上机械能都守恒。',
      },
    },
  ],
  resultTex: 'mgh = \\tfrac12 mv^2 + \\mu mg\\,s',
  related: ['inclined-plane-forces', 'simple-pendulum', 'uniform-acceleration-vt'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Explain the work–energy theorem and energy conservation: a 1 kg block slides from 3 m up a smooth curved slide (29.4 J) onto a rough floor with μ = 0.3, with three bars for potential energy, kinetic energy and heat. Show v ≈ 6.64 m/s halfway, v = √(2gh) ≈ 7.67 m/s at the bottom, 14.7 J lost to friction after 5 m, and the stop at d = h/μ = 10 m whatever the mass.',
    zh: '讲解动能定理与能量守恒：1 kg 物块从 3 米高的光滑曲面滑下（29.4 J），再滑上 μ = 0.3 的粗糙地面，用三根能量条显示势能、动能和摩擦生热。展示半路 v ≈ 6.64 m/s，底端 v = √(2gh) ≈ 7.67 m/s，滑过 5 米后摩擦力做功 14.7 J，最后在 d = h/μ = 10 米处停下，与质量无关。',
  },
};
