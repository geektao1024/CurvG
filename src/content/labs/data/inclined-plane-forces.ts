import { pick, type Lab } from '../types';

const G = 9.8;

export const inclinedPlaneForces: Lab = {
  slug: 'inclined-plane-forces',
  publication: 'public',
  primaryCategoryId: 'visual-proofs',
  additionalCategoryIds: ['maps-graphs'],
  levels: ['high'],
  chapterTitle: { en: 'Forces on a slope', zh: '斜面受力分解' },
  title: {
    en: 'Forces on an inclined plane: splitting gravity along and across the slope',
    zh: '斜面上的受力分析：把重力分解到沿斜面和垂直斜面',
  },
  question: {
    en: 'How steep can a slope get before a block starts to slide, and how fast does it go then?',
    zh: '斜面陡到多少，物块会开始下滑？滑下去时加速度是多少？',
  },
  summary: {
    en: 'Tilt the slope and change the mass and friction. Gravity splits into mg sin θ along the slope and mg cos θ into it; friction holds the block until tan θ passes μ, then a = g(sin θ − μ cos θ).',
    zh: '调斜面倾角、质量和动摩擦因数。重力分解成沿斜面的 mg sin θ 和垂直斜面的 mg cos θ；tan θ 超过 μ 之前静摩擦把物块拉住，之后 a = g(sin θ − μ cos θ)。',
  },
  keyPoints: [
    { en: 'Resolving forces', zh: '力的分解' },
    { en: 'Normal force', zh: '支持力' },
    { en: 'Static vs kinetic friction', zh: '静摩擦与滑动摩擦' },
    { en: "Newton's second law", zh: '牛顿第二定律' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-5.5, 6], y: [-2.6, 7.5], axes: false },
      params: [
        {
          id: 'deg',
          label: '\\theta\\,(^\\circ)',
          min: 0,
          max: 60,
          step: 1,
          value: 20,
        },
        { id: 'm', label: 'm', min: 0.5, max: 10, step: 0.5, value: 2 },
        { id: 'mu', label: '\\mu', min: 0, max: 1, step: 0.05, value: 0.5 },
      ],
      scalars: [
        { id: 'th', expr: 'deg * pi / 180' },
        { id: 'c', expr: 'cos(th)' },
        { id: 's', expr: 'sin(th)' },
        { id: 'mg', expr: `m * ${G}` },
        { id: 'N', expr: 'mg * c' },
        { id: 'Gp', expr: 'mg * s' },
        { id: 'fmax', expr: 'mu * N' },
        { id: 'slide', expr: 'Gp > fmax + 0.000001 ? 1 : 0' },
        // Static friction matches the pull; kinetic friction is μN.
        { id: 'f', expr: 'slide > 0 ? fmax : Gp' },
        { id: 'acc', expr: '(Gp - f) / m' },
        // Block centre: 4.5 up the slope, half a side off it.
        { id: 'bx', expr: '-4 + 4.5 * c - 0.5 * s' },
        { id: 'by', expr: '4.5 * s + 0.5 * c' },
        // Gravity is always drawn 3 long; the rest to the same scale.
        { id: 'k', expr: '3 / mg' },
        // Tips of the two gravity components, for their labels.
        { id: 'px', expr: 'bx - k * Gp * c' },
        { id: 'py', expr: 'by - k * Gp * s' },
        { id: 'qx', expr: 'bx + k * N * s' },
        { id: 'qy', expr: 'by - k * N * c' },
      ],
      objects: [
        { type: 'segment', from: [-5.5, 0], to: [6, 0], color: 'ink', width: 1.5 },
        {
          type: 'polygon',
          points: [
            [-4, 0],
            ['-4 + 8 * c', 0],
            ['-4 + 8 * c', '8 * s'],
          ],
          fill: true,
          color: 'muted',
          opacity: 0.25,
        },
        { type: 'segment', from: [-4, 0], to: ['-4 + 8 * c', '8 * s'], color: 'ink', width: 2 },
        { type: 'arc', center: [-4, 0], r: 1.2, start: 0, end: 'th', color: 'primary', width: 2 },
        { type: 'text', at: ['-4 + 1.6 * cos(th / 2)', '1.6 * sin(th / 2) - 0.15'], text: 'θ', color: 'primary' },
        {
          type: 'polygon',
          points: [
            ['bx - 0.5 * c + 0.5 * s', 'by - 0.5 * s - 0.5 * c'],
            ['bx + 0.5 * c + 0.5 * s', 'by + 0.5 * s - 0.5 * c'],
            ['bx + 0.5 * c - 0.5 * s', 'by + 0.5 * s + 0.5 * c'],
            ['bx - 0.5 * c - 0.5 * s', 'by - 0.5 * s + 0.5 * c'],
          ],
          fill: true,
          color: 'primary',
          opacity: 0.35,
        },
        // Components of gravity, dashed.
        {
          type: 'segment',
          from: ['bx', 'by'],
          to: ['px', 'py'],
          color: 'red',
          width: 2,
          dashed: true,
          arrow: true,
          visible: 'deg > 2',
        },
        {
          type: 'segment',
          from: ['bx', 'by'],
          to: ['qx', 'qy'],
          color: 'red',
          width: 2,
          dashed: true,
          arrow: true,
          visible: 'deg > 2',
        },
        { type: 'text', at: ['px - 0.25', 'py + 0.3'], text: 'mg sinθ', anchor: 'end', color: 'red', visible: 'deg > 2' },
        { type: 'text', at: ['qx + 0.25', 'qy - 0.15'], text: 'mg cosθ', color: 'red', visible: 'deg > 2' },
        { type: 'segment', from: ['bx', 'by'], to: ['bx', 'by - 3'], color: 'red', width: 3, arrow: true, label: 'mg' },
        {
          type: 'segment',
          from: ['bx', 'by'],
          to: ['bx - k * N * s', 'by + k * N * c'],
          color: 'blue',
          width: 3,
          arrow: true,
          label: 'N',
        },
        {
          type: 'segment',
          // Friction acts on the contact face, not through the centre.
          from: ['bx + 0.5 * s', 'by - 0.5 * c'],
          to: ['bx + 0.5 * s + k * f * c', 'by - 0.5 * c + k * f * s'],
          color: 'green',
          width: 3,
          arrow: true,
          label: 'f',
          visible: 'f > 0.01',
        },
        { type: 'point', at: ['bx', 'by'], color: 'ink', size: 3 },
      ],
      readouts: [
        { label: 'mg\\sin\\theta', expr: 'Gp', digits: 2 },
        { label: 'N = mg\\cos\\theta', expr: 'N', digits: 2 },
        { label: 'f_{\\max} = \\mu N', expr: 'fmax', digits: 2 },
        { label: 'f', expr: 'f', digits: 2 },
        { label: '\\tan\\theta', expr: 's / c', digits: 3 },
        { label: 'a', expr: 'acc', digits: 2, highlight: true },
        {
          kind: 'status',
          label: t('Block', '物块'),
          expr: 'slide',
          ok: t('slides down', '下滑'),
          bad: t('stays put', '静止'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'A gentle slope holds', zh: '缓坡上，物块不动' },
      body: {
        en: 'A $2\\,\\text{kg}$ block on a $20^\\circ$ slope with $\\mu=0.5$. Gravity, $19.6\\,\\text{N}$, splits into $mg\\sin20^\\circ\\approx6.70\\,\\text{N}$ down the slope and $mg\\cos20^\\circ\\approx18.42\\,\\text{N}$ into it. Friction could hold up to $\\mu N\\approx9.21\\,\\text{N}$, so it only has to supply $6.70\\,\\text{N}$ and the block stays put.',
        zh: '$2\\,\\text{kg}$ 的物块放在 $20^\\circ$ 的斜面上，$\\mu=0.5$。重力 $19.6\\,\\text{N}$ 分解为沿斜面向下的 $mg\\sin20^\\circ\\approx6.70\\,\\text{N}$ 和压向斜面的 $mg\\cos20^\\circ\\approx18.42\\,\\text{N}$。摩擦力最多能提供 $\\mu N\\approx9.21\\,\\text{N}$，现在只需要 $6.70\\,\\text{N}$，物块静止。',
      },
      set: { deg: 20, m: 2, mu: 0.5 },
    },
    {
      title: { en: 'The tipping angle', zh: '刚好滑动的角度' },
      body: {
        en: 'Steepen the slope. The pull $mg\\sin\\theta$ grows and the friction limit $\\mu mg\\cos\\theta$ shrinks; they cross where $\\tan\\theta=\\mu$, at about $26.6^\\circ$. At $27^\\circ$ the block has just started to slide, with $a\\approx0.08\\,\\text{m/s}^2$.',
        zh: '把斜面调陡。下滑分力 $mg\\sin\\theta$ 变大，最大静摩擦 $\\mu mg\\cos\\theta$ 变小，两者在 $\\tan\\theta=\\mu$ 处相等，约为 $26.6^\\circ$。到 $27^\\circ$ 时物块刚开始下滑，$a\\approx0.08\\,\\text{m/s}^2$。',
      },
      set: { deg: 27, m: 2, mu: 0.5 },
    },
    {
      title: { en: 'Sliding at 40°', zh: '40° 时加速下滑' },
      body: {
        en: 'At $40^\\circ$ friction is kinetic, $\\mu mg\\cos\\theta$, and the net force down the slope gives $a=g(\\sin\\theta-\\mu\\cos\\theta)\\approx2.55\\,\\text{m/s}^2$.',
        zh: '到 $40^\\circ$ 时摩擦力是滑动摩擦 $\\mu mg\\cos\\theta$，沿斜面的合力给出 $a=g(\\sin\\theta-\\mu\\cos\\theta)\\approx2.55\\,\\text{m/s}^2$。',
      },
      set: { deg: 40, m: 2, mu: 0.5 },
    },
    {
      title: { en: 'Mass cancels', zh: '质量被约掉了' },
      body: {
        en: 'Make the block four times heavier, $8\\,\\text{kg}$. Every force grows fourfold (the pull is now $50.39\\,\\text{N}$), but so does the mass being pushed, and the acceleration stays $2.55\\,\\text{m/s}^2$.',
        zh: '把物块换成 $8\\,\\text{kg}$，重 4 倍。每个力都变成 4 倍（下滑分力变为 $50.39\\,\\text{N}$），被推动的质量也变成 4 倍，加速度仍是 $2.55\\,\\text{m/s}^2$。',
      },
      set: { deg: 40, m: 8, mu: 0.5 },
    },
  ],
  sections: [
    {
      id: 'resolve',
      title: { en: 'Split gravity along the slope', zh: '沿斜面分解重力' },
      body: {
        en: 'On a slope the useful directions are along it and across it, not horizontal and vertical. Gravity $mg$ makes an angle $\\theta$ with the normal to the slope, so it splits into\n\n$$G_\\parallel=mg\\sin\\theta,\\qquad G_\\perp=mg\\cos\\theta$$\n\nThe slope pushes back on $G_\\perp$ with the normal force $N=mg\\cos\\theta$; only $G_\\parallel$ is left to move the block.',
        zh: '在斜面上，好用的方向是沿斜面和垂直斜面，而不是水平和竖直。重力 $mg$ 与斜面法线的夹角正好是 $\\theta$，所以分解为\n\n$$G_\\parallel=mg\\sin\\theta,\\qquad G_\\perp=mg\\cos\\theta$$\n\n斜面用支持力 $N=mg\\cos\\theta$ 抵消 $G_\\perp$，只剩 $G_\\parallel$ 能让物块运动。',
      },
    },
    {
      id: 'friction',
      title: { en: 'Static friction only takes what it needs', zh: '静摩擦"要多少给多少"' },
      body: {
        en: 'Static friction is not $\\mu N$. It matches the pull, up to a limit of about $\\mu N$. The block stays put while $mg\\sin\\theta\\le\\mu mg\\cos\\theta$, that is while\n\n$$\\tan\\theta\\le\\mu$$\n\nThis tipping angle does not depend on the mass, which is how $\\mu$ is measured in the lab: tilt the board until the block just slides.',
        zh: '静摩擦力不等于 $\\mu N$。它跟下滑分力一样大，直到上限（约为 $\\mu N$）为止。只要 $mg\\sin\\theta\\le\\mu mg\\cos\\theta$，物块就静止，也就是\n\n$$\\tan\\theta\\le\\mu$$\n\n这个临界角与质量无关，实验室里测 $\\mu$ 就是这么做的：慢慢抬高木板，直到物块刚好滑动。',
      },
    },
    {
      id: 'newton',
      title: { en: 'Once it slides', zh: '滑动之后' },
      body: {
        en: 'Sliding friction is $\\mu N=\\mu mg\\cos\\theta$, pointing up the slope. Newton\'s second law along the slope gives\n\n$$a=\\frac{mg\\sin\\theta-\\mu mg\\cos\\theta}{m}=g(\\sin\\theta-\\mu\\cos\\theta)$$\n\nThe mass cancels. On a smooth slope ($\\mu=0$) this is just $a=g\\sin\\theta$.',
        zh: '滑动摩擦力为 $\\mu N=\\mu mg\\cos\\theta$，方向沿斜面向上。沿斜面列牛顿第二定律：\n\n$$a=\\frac{mg\\sin\\theta-\\mu mg\\cos\\theta}{m}=g(\\sin\\theta-\\mu\\cos\\theta)$$\n\n质量约掉了。光滑斜面（$\\mu=0$）上就是 $a=g\\sin\\theta$。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A block slides down a smooth $30^\\circ$ slope. Its acceleration is ($g=9.8\\,\\text{m/s}^2$)',
        zh: '物块沿光滑的 $30^\\circ$ 斜面下滑，加速度为（$g=9.8\\,\\text{m/s}^2$）',
      },
      choices: [
        { en: '$9.8\\,\\text{m/s}^2$', zh: '$9.8\\,\\text{m/s}^2$' },
        { en: '$4.9\\,\\text{m/s}^2$', zh: '$4.9\\,\\text{m/s}^2$' },
        { en: '$8.49\\,\\text{m/s}^2$', zh: '$8.49\\,\\text{m/s}^2$' },
        { en: 'It depends on the mass', zh: '取决于质量' },
      ],
      answer: 1,
      explanation: {
        en: '$a=g\\sin30^\\circ=4.9\\,\\text{m/s}^2$, whatever the mass.',
        zh: '$a=g\\sin30^\\circ=4.9\\,\\text{m/s}^2$，与质量无关。',
      },
    },
    {
      question: {
        en: 'A $2\\,\\text{kg}$ block rests on a $30^\\circ$ slope with $\\mu=0.8$. The friction force on it is',
        zh: '$2\\,\\text{kg}$ 的物块静止在 $30^\\circ$ 斜面上，$\\mu=0.8$。它受到的摩擦力是',
      },
      choices: [
        { en: '$9.8\\,\\text{N}$', zh: '$9.8\\,\\text{N}$' },
        { en: '$13.6\\,\\text{N}$', zh: '$13.6\\,\\text{N}$' },
        { en: '$15.7\\,\\text{N}$', zh: '$15.7\\,\\text{N}$' },
        { en: '$0$', zh: '$0$' },
      ],
      answer: 0,
      explanation: {
        en: 'The block is at rest, so friction balances the pull: $mg\\sin30^\\circ=9.8\\,\\text{N}$. $\\mu N\\approx13.6\\,\\text{N}$ is only the most it could give.',
        zh: '物块静止，摩擦力与下滑分力平衡：$mg\\sin30^\\circ=9.8\\,\\text{N}$。$\\mu N\\approx13.6\\,\\text{N}$ 只是它最多能提供的值。',
      },
    },
    {
      question: {
        en: 'A block slides down a rough slope. If its mass is doubled, its acceleration',
        zh: '物块沿粗糙斜面下滑。若质量加倍，加速度',
      },
      choices: [
        { en: 'doubles', zh: '加倍' },
        { en: 'halves', zh: '减半' },
        { en: 'stays the same', zh: '不变' },
        { en: 'drops to zero', zh: '变为零' },
      ],
      answer: 2,
      explanation: {
        en: '$a=g(\\sin\\theta-\\mu\\cos\\theta)$ has no $m$ in it: the forces and the inertia grow together.',
        zh: '$a=g(\\sin\\theta-\\mu\\cos\\theta)$ 中没有 $m$：力和惯性同比例增大。',
      },
    },
  ],
  resultTex: 'a = g(\\sin\\theta - \\mu\\cos\\theta)',
  related: ['circular-motion', 'energy-conservation', 'projectile-motion'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Explain forces on an inclined plane: a 2 kg block on a slope with μ = 0.5. Split gravity into mg sin θ along the slope and mg cos θ into it, show the normal force and friction as arrows. At 20° static friction holds the block (6.70 N needed, 9.21 N available); it starts to slide past tan θ = μ, about 26.6°; at 40° a = g(sin θ − μ cos θ) ≈ 2.55 m/s², and the same for an 8 kg block.',
    zh: '讲解斜面受力分析：2 kg 物块放在 μ = 0.5 的斜面上。把重力分解成沿斜面的 mg sin θ 和垂直斜面的 mg cos θ，用箭头画出支持力和摩擦力。20° 时静摩擦把物块拉住（需要 6.70 N，最多 9.21 N）；超过 tan θ = μ，约 26.6° 时开始下滑；40° 时 a = g(sin θ − μ cos θ) ≈ 2.55 m/s²，换成 8 kg 物块结果相同。',
  },
};
