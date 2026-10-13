import { pick, type Lab } from '../types';

/** g in m/s², rounded the way Chinese and most US textbooks round it. */
const G = 9.8;

export const projectileMotion: Lab = {
  slug: 'projectile-motion',
  publication: 'public',
  primaryCategoryId: 'parametric',
  additionalCategoryIds: ['cartesian'],
  levels: ['high'],
  chapterTitle: { en: 'Projectile motion', zh: '平抛与斜抛' },
  title: {
    en: 'Projectile motion: two motions at once',
    zh: '抛体运动：水平匀速，竖直自由落体',
  },
  question: {
    en: 'Why does a thrown ball follow a parabola, and which angle throws farthest?',
    zh: '抛出去的球为什么走抛物线？什么角度扔得最远？',
  },
  summary: {
    en: 'Launch a ball at any speed, angle and height and watch its velocity split into a steady horizontal part and a vertical part that gravity changes. Read off flight time, range and peak height.',
    zh: '设定初速度、抛射角和高度，把球抛出去，看速度分解成不变的水平分量和受重力改变的竖直分量，同时读出飞行时间、射程和最大高度。',
  },
  keyPoints: [
    { en: 'Independent components', zh: '运动的合成与分解' },
    { en: 'Horizontal launch', zh: '平抛运动' },
    { en: 'Range and angle', zh: '射程与抛射角' },
    { en: 'Parabolic path', zh: '抛物线轨迹' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-3, 46], y: [-2, 25] },
      params: [
        { id: 'v0', label: 'v_0', min: 2, max: 20, step: 0.5, value: 16 },
        {
          id: 'deg',
          label: '\\theta\\,(^\\circ)',
          min: 0,
          max: 80,
          step: 1,
          value: 45,
          bands: [{ from: 45, to: 45, label: '45°', color: 'green' }],
        },
        { id: 'h0', label: 'h', min: 0, max: 20, step: 0.5, value: 0 },
        { id: 'T', label: 't', min: 0, max: 5, step: 0.02, value: 1.2, play: 5 },
      ],
      scalars: [
        { id: 'th', expr: 'deg * pi / 180' },
        { id: 'vx', expr: 'v0 * cos(th)' },
        { id: 'vy0', expr: 'v0 * sin(th)' },
        // Time to land on y = 0 from height h0.
        { id: 'tf', expr: `(vy0 + sqrt(vy0^2 + 2 * ${G} * h0)) / ${G}` },
        { id: 'tt', expr: 'min(T, tf)' },
        { id: 'bx', expr: 'vx * tt' },
        { id: 'by', expr: `h0 + vy0 * tt - ${G / 2} * tt^2` },
        { id: 'vy', expr: `vy0 - ${G} * tt` },
        { id: 'range', expr: 'vx * tf' },
        { id: 'peak', expr: `h0 + vy0^2 / ${2 * G}` },
        // Velocity arrows drawn at a fixed scale.
        { id: 'k', expr: '0.45' },
      ],
      objects: [
        { type: 'segment', from: [-3, 0], to: [46, 0], color: 'ink', width: 1.5 },
        { type: 'segment', from: [0, 0], to: [0, 'h0'], color: 'ink', width: 4, visible: 'h0 > 0.2' },
        {
          type: 'parametric',
          x: 'vx * s',
          y: `h0 + vy0 * s - ${G / 2} * s^2`,
          variable: 's',
          range: [0, 'tf'],
          color: 'muted',
          dashed: true,
          width: 1.5,
        },
        {
          type: 'parametric',
          x: 'vx * s',
          y: `h0 + vy0 * s - ${G / 2} * s^2`,
          variable: 's',
          range: [0, 'tt'],
          color: 'primary',
          width: 3,
        },
        { type: 'segment', from: ['bx', 'by'], to: ['bx + k * vx', 'by'], color: 'blue', width: 2.5, arrow: true, label: 'vₓ', visible: 'tt < tf' },
        { type: 'segment', from: ['bx', 'by'], to: ['bx', 'by + k * vy'], color: 'red', width: 2.5, arrow: true, label: 'vy', visible: '(abs(vy) > 0.5) * (tt < tf)' },
        { type: 'segment', from: ['bx', 'by'], to: ['bx + k * vx', 'by + k * vy'], color: 'ink', width: 2, arrow: true, visible: 'tt < tf' },
        { type: 'segment', from: ['range', -0.8], to: ['range', 0.8], color: 'green', width: 2, label: t('range', '射程') },
        { type: 'point', at: [0, 'h0'], color: 'blue', size: 5, drag: { y: 'h0' } },
        { type: 'point', at: ['bx', 'by'], color: 'primary', size: 7 },
        { type: 'text', at: [45, -1.4], text: 'x / m', color: 'muted', anchor: 'end' },
      ],
      readouts: [
        { label: 't', expr: 'tt', digits: 2 },
        { label: 't_{\\text{flight}}', expr: 'tf', digits: 2 },
        { label: t('\\text{range}', '\\text{射程}'), expr: 'range', digits: 2, highlight: true },
        { label: 'H_{\\max}', expr: 'peak', digits: 2 },
        { label: 'v_x', expr: 'vx', digits: 2 },
        { label: 'v_y', expr: 'vy', digits: 2 },
        {
          kind: 'status',
          label: t('Ball', '小球'),
          expr: 'T >= tf',
          ok: t('landed', '已落地'),
          bad: t('in the air', '在空中'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Thrown sideways from a cliff', zh: '从高处水平抛出' },
      body: {
        en: 'Throw horizontally at $10\\,\\text{m/s}$ from $h=20\\,\\text{m}$. Falling takes the same time as a dropped ball, $t=\\sqrt{2h/g}\\approx2.02\\,\\text{s}$, and in that time the ball travels $10\\times2.02\\approx20.2\\,\\text{m}$ sideways.',
        zh: '从 $h=20\\,\\text{m}$ 高处以 $10\\,\\text{m/s}$ 水平抛出。下落时间和自由落体一样，$t=\\sqrt{2h/g}\\approx2.02\\,\\text{s}$，这段时间里水平方向走了 $10\\times2.02\\approx20.2\\,\\text{m}$。',
      },
      set: { v0: 10, deg: 0, h0: 20, T: 5 },
    },
    {
      title: { en: 'Launched at 45°', zh: '45° 斜向上抛' },
      body: {
        en: 'From the ground at $12\\,\\text{m/s}$ and $45^\\circ$, both components are $12\\cos45^\\circ\\approx8.49\\,\\text{m/s}$. The ball is up for $1.73\\,\\text{s}$, peaks at $3.67\\,\\text{m}$ and lands $14.69\\,\\text{m}$ away.',
        zh: '从地面以 $12\\,\\text{m/s}$、$45^\\circ$ 抛出，两个分量都是 $12\\cos45^\\circ\\approx8.49\\,\\text{m/s}$。小球在空中 $1.73\\,\\text{s}$，最高 $3.67\\,\\text{m}$，落在 $14.69\\,\\text{m}$ 外。',
      },
      set: { v0: 12, deg: 45, h0: 0, T: 5 },
    },
    {
      title: { en: '30°: lower and shorter', zh: '30°：更低，也更近' },
      body: {
        en: 'Drop the angle to $30^\\circ$. The path is flatter and the range shrinks to $\\dfrac{v_0^2\\sin60^\\circ}{g}\\approx12.73\\,\\text{m}$.',
        zh: '把角度降到 $30^\\circ$，轨迹更平，射程缩短为 $\\dfrac{v_0^2\\sin60^\\circ}{g}\\approx12.73\\,\\text{m}$。',
      },
      set: { v0: 12, deg: 30, h0: 0, T: 5 },
    },
    {
      title: { en: '60°: same landing spot', zh: '60°：落在同一个地方' },
      body: {
        en: 'Now try $60^\\circ$. The ball goes much higher but lands at the same $12.73\\,\\text{m}$: angles that add up to $90^\\circ$ give the same range, and $45^\\circ$ sits in the middle with the longest one.',
        zh: '再试 $60^\\circ$：球飞得高得多，却落在同样的 $12.73\\,\\text{m}$ 处。互余的两个角射程相同，$45^\\circ$ 正好在中间，射程最远。',
      },
      set: { v0: 12, deg: 60, h0: 0, T: 5 },
    },
  ],
  sections: [
    {
      id: 'split',
      title: { en: 'Two motions that ignore each other', zh: '两个互不干扰的运动' },
      body: {
        en: 'Ignoring air resistance, the only force is gravity, and it points straight down. So the horizontal velocity never changes, while the vertical velocity changes by $g=9.8\\,\\text{m/s}^2$ every second:\n\n$$x=v_0\\cos\\theta\\cdot t,\\qquad y=h+v_0\\sin\\theta\\cdot t-\\tfrac12gt^2$$\n\nWatch the blue arrow on the board: it keeps its length the whole flight. Only the red one changes.',
        zh: '忽略空气阻力时，物体只受重力，而重力竖直向下。所以水平速度始终不变，竖直速度每秒改变 $g=9.8\\,\\text{m/s}^2$：\n\n$$x=v_0\\cos\\theta\\cdot t,\\qquad y=h+v_0\\sin\\theta\\cdot t-\\tfrac12gt^2$$\n\n看画板上的蓝色箭头：整个飞行过程中长度都不变，变的只有红色箭头。',
      },
    },
    {
      id: 'parabola',
      title: { en: 'Why the path is a parabola', zh: '为什么轨迹是抛物线' },
      body: {
        en: 'Eliminate $t$ using $t=\\dfrac{x}{v_0\\cos\\theta}$:\n\n$$y=h+x\\tan\\theta-\\frac{g}{2v_0^2\\cos^2\\theta}\\,x^2$$\n\nThat is a quadratic in $x$ with a negative leading coefficient, a parabola opening downward. The constant horizontal speed turns "time" into "distance", and the $t^2$ of free fall becomes $x^2$.',
        zh: '用 $t=\\dfrac{x}{v_0\\cos\\theta}$ 消去 $t$：\n\n$$y=h+x\\tan\\theta-\\frac{g}{2v_0^2\\cos^2\\theta}\\,x^2$$\n\n这是关于 $x$ 的二次函数，二次项系数为负，所以是开口向下的抛物线。水平匀速把"时间"换成了"距离"，自由落体里的 $t^2$ 就变成了 $x^2$。',
      },
    },
    {
      id: 'range',
      title: { en: 'Range from level ground', zh: '地面抛出的射程' },
      body: {
        en: 'With $h=0$ the ball lands when $y=0$ again, after $t=\\dfrac{2v_0\\sin\\theta}{g}$. Multiply by the horizontal speed:\n\n$$R=\\frac{v_0^2\\sin2\\theta}{g}$$\n\n$\\sin2\\theta$ is largest at $2\\theta=90^\\circ$, so $45^\\circ$ throws farthest, and $\\theta$ and $90^\\circ-\\theta$ give the same $\\sin2\\theta$. From a height the best angle is a little below $45^\\circ$; set $h$ and try it.',
        zh: '当 $h=0$ 时，小球在 $t=\\dfrac{2v_0\\sin\\theta}{g}$ 时回到 $y=0$。乘以水平速度得：\n\n$$R=\\frac{v_0^2\\sin2\\theta}{g}$$\n\n$\\sin2\\theta$ 在 $2\\theta=90^\\circ$ 时最大，所以 $45^\\circ$ 扔得最远；$\\theta$ 和 $90^\\circ-\\theta$ 的 $\\sin2\\theta$ 相同，射程也相同。从高处抛出时，最佳角度略小于 $45^\\circ$，可以调高 $h$ 试一试。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'Two balls leave a table at the same moment: one is dropped, one is pushed off horizontally. Which lands first?',
        zh: '同一时刻，一个球从桌边自由下落，另一个被水平推出。哪个先落地？',
      },
      choices: [
        { en: 'The dropped ball', zh: '自由下落的球' },
        { en: 'The pushed ball', zh: '被推出的球' },
        { en: 'They land together', zh: '同时落地' },
        { en: 'It depends on the push', zh: '取决于推得多快' },
      ],
      answer: 2,
      explanation: {
        en: 'Both start with zero vertical velocity and fall under the same $g$, so their vertical motions are identical.',
        zh: '两球竖直方向初速度都为零，又受同样的重力，竖直运动完全相同。',
      },
    },
    {
      question: {
        en: 'At the top of its path, what is the velocity of a ball launched at $v_0$ and angle $\\theta$?',
        zh: '以 $v_0$、抛射角 $\\theta$ 抛出的球，在最高点的速度是多少？',
      },
      choices: [
        { en: '$0$', zh: '$0$' },
        { en: '$v_0\\cos\\theta$, horizontal', zh: '$v_0\\cos\\theta$，水平方向' },
        { en: '$v_0\\sin\\theta$, horizontal', zh: '$v_0\\sin\\theta$，水平方向' },
        { en: '$v_0$', zh: '$v_0$' },
      ],
      answer: 1,
      explanation: {
        en: 'At the peak the vertical part is zero, but the horizontal part $v_0\\cos\\theta$ never changed.',
        zh: '最高点竖直分速度为零，但水平分速度 $v_0\\cos\\theta$ 一直没变。',
      },
    },
    {
      question: {
        en: 'Launched from the ground at $20\\,\\text{m/s}$ and $30^\\circ$ ($g=10$), what is the range?',
        zh: '从地面以 $20\\,\\text{m/s}$、$30^\\circ$ 抛出（取 $g=10$），射程是多少？',
      },
      choices: [
        { en: '$20\\,\\text{m}$', zh: '$20\\,\\text{m}$' },
        { en: '$40\\,\\text{m}$', zh: '$40\\,\\text{m}$' },
        { en: '$20\\sqrt3\\approx34.6\\,\\text{m}$', zh: '$20\\sqrt3\\approx34.6\\,\\text{m}$' },
        { en: '$10\\sqrt3\\approx17.3\\,\\text{m}$', zh: '$10\\sqrt3\\approx17.3\\,\\text{m}$' },
      ],
      answer: 2,
      explanation: {
        en: '$R=\\dfrac{v_0^2\\sin2\\theta}{g}=\\dfrac{400\\sin60^\\circ}{10}=20\\sqrt3\\approx34.6\\,\\text{m}$.',
        zh: '$R=\\dfrac{v_0^2\\sin2\\theta}{g}=\\dfrac{400\\sin60^\\circ}{10}=20\\sqrt3\\approx34.6\\,\\text{m}$。',
      },
    },
  ],
  resultTex: 'R = \\dfrac{v_0^2\\sin 2\\theta}{g}',
  curveSlugs: ['parabola'],
  related: ['uniform-acceleration-vt', 'quadratic-transformations', 'circular-motion'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Animate projectile motion without air resistance: split the velocity into a constant horizontal arrow and a vertical arrow that gravity shrinks and reverses. Show a horizontal throw from 20 m at 10 m/s landing 20.2 m away, then launches at 30°, 45° and 60° with v0 = 12 m/s, highlighting that 30° and 60° land at the same 12.73 m and 45° goes farthest.',
    zh: '用动画讲解忽略空气阻力的抛体运动：把速度分解成长度不变的水平箭头，和被重力缩短、反向的竖直箭头。先展示从 20 米高处以 10 m/s 水平抛出、落在 20.2 米外；再以 v0 = 12 m/s 分别用 30°、45°、60° 抛出，强调 30° 和 60° 都落在 12.73 米处，45° 最远。',
  },
};
