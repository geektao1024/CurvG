import { pick, type Lab } from '../types';

export const uniformAccelerationVt: Lab = {
  slug: 'uniform-acceleration-vt',
  publication: 'public',
  primaryCategoryId: 'rates',
  additionalCategoryIds: ['accumulation'],
  levels: ['high'],
  chapterTitle: { en: 'Velocity–time graphs', zh: '匀变速直线运动与 v-t 图' },
  title: {
    en: 'Uniform acceleration on a v–t graph',
    zh: '匀变速直线运动：读懂 v-t 图',
  },
  question: {
    en: 'How do you read acceleration and distance off a velocity–time graph?',
    zh: '怎样从 v-t 图上读出加速度和位移？',
  },
  summary: {
    en: 'Set the starting velocity and the acceleration, then let time run. The slope of the v–t line is the acceleration and the shaded area under it is the displacement.',
    zh: '设定初速度和加速度，让时间走起来。v-t 图线的斜率就是加速度，图线下方的面积就是位移。',
  },
  keyPoints: [
    { en: 'Slope = acceleration', zh: '斜率即加速度' },
    { en: 'Area = displacement', zh: '面积即位移' },
    { en: 'Kinematic equations', zh: '匀变速公式' },
    { en: 'Turning back', zh: '减速与反向' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-0.6, 6.6], y: [-7, 14], equal: false },
      params: [
        { id: 'v0', label: 'v_0', min: -4, max: 8, step: 0.5, value: 2 },
        {
          id: 'a',
          label: 'a',
          min: -3,
          max: 3,
          step: 0.25,
          value: 1,
          bands: [{ from: 0, to: 0, label: t('uniform', '匀速'), color: 'green' }],
        },
        { id: 'T', label: 't', min: 0, max: 6, step: 0.05, value: 4, play: 6 },
      ],
      functions: [{ id: 'v', arg: 'x', expr: 'v0 + a * x' }],
      scalars: [
        { id: 'vt', expr: 'v(T)' },
        { id: 's', expr: 'v0 * T + a * T^2 / 2' },
        // Distance travelled, counting the leg after a turn-around as positive.
        { id: 'tc', expr: 'abs(a) < 0.001 ? -1 : -v0 / a' },
        {
          id: 'dist',
          expr: '(tc > 0) * (tc < T) > 0 ? abs(v0 * tc + a * tc^2 / 2) + abs(s - (v0 * tc + a * tc^2 / 2)) : abs(s)',
        },
      ],
      objects: [
        { type: 'area', fn: 'v', from: 0, to: 'T', color: 'blue', opacity: 0.18 },
        { type: 'function', fn: 'v', domain: [0, 6], color: 'muted', width: 1.5, dashed: true },
        { type: 'function', fn: 'v', domain: [0, 'T'], color: 'ink', width: 2.8, label: 'v = v₀ + at' },
        { type: 'segment', from: ['T', 0], to: ['T', 'vt'], color: 'muted', dashed: true, width: 1.5 },
        { type: 'segment', from: [0, 'vt'], to: ['T', 'vt'], color: 'muted', dashed: true, width: 1, visible: 'T > 0.2' },
        { type: 'point', at: [0, 'v0'], color: 'blue', size: 5, label: 'v₀', drag: { y: 'v0' } },
        { type: 'point', at: ['T', 'vt'], color: 'primary', size: 6, label: 'v', drag: { x: 'T' } },
        { type: 'text', at: [6.35, -0.9], text: 't / s', color: 'muted', anchor: 'end' },
      ],
      readouts: [
        { label: 't', expr: 'T', digits: 2 },
        { label: 'v = v_0 + at', expr: 'vt', digits: 2 },
        { label: 'x = v_0t + \\tfrac12 at^2', expr: 's', digits: 2, highlight: true },
        { label: t('\\text{distance}', '\\text{路程}'), expr: 'dist', digits: 2 },
        {
          kind: 'status',
          label: t('Speed', '速度大小'),
          expr: 'vt * a > 0',
          ok: t('increasing', '在变大'),
          bad: t('steady or falling', '不变或在变小'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Constant velocity', zh: '匀速：一个矩形' },
      body: {
        en: 'With $a=0$ the graph is flat at $v_0=3\\,\\text{m/s}$. After $4\\,\\text{s}$ the shaded rectangle is $3\\times4=12$: the object has moved $12\\,\\text{m}$.',
        zh: '$a=0$ 时图线是一条水平线，$v_0=3\\,\\text{m/s}$。$4\\,\\text{s}$ 后阴影是一个 $3\\times4=12$ 的矩形：物体走了 $12\\,\\text{m}$。',
      },
      set: { v0: 3, a: 0, T: 4 },
    },
    {
      title: { en: 'Starting from rest', zh: '从静止开始加速' },
      body: {
        en: 'Now $v_0=0$ and $a=2\\,\\text{m/s}^2$. The line climbs $2$ for every second, so at $t=4\\,\\text{s}$ the velocity is $8\\,\\text{m/s}$. The area is a triangle, $\\tfrac12\\times4\\times8=16\\,\\text{m}$.',
        zh: '令 $v_0=0$、$a=2\\,\\text{m/s}^2$。图线每秒升高 $2$，所以 $t=4\\,\\text{s}$ 时速度是 $8\\,\\text{m/s}$。面积是三角形，$\\tfrac12\\times4\\times8=16\\,\\text{m}$。',
      },
      set: { v0: 0, a: 2, T: 4 },
    },
    {
      title: { en: 'A head start', zh: '带着初速度加速' },
      body: {
        en: 'With $v_0=2$ and $a=1$ the velocity at $4\\,\\text{s}$ is $6\\,\\text{m/s}$. The area is a trapezoid, $\\tfrac{2+6}{2}\\times4=16\\,\\text{m}$: average velocity times time.',
        zh: '$v_0=2$、$a=1$ 时，$4\\,\\text{s}$ 末速度是 $6\\,\\text{m/s}$。面积是梯形，$\\tfrac{2+6}{2}\\times4=16\\,\\text{m}$，也就是平均速度乘时间。',
      },
      set: { v0: 2, a: 1, T: 4 },
    },
    {
      title: { en: 'Braking, then reversing', zh: '减速，然后反向' },
      body: {
        en: 'Start at $6\\,\\text{m/s}$ with $a=-2$. The line crosses zero at $t=3\\,\\text{s}$: the object stops after $9\\,\\text{m}$, then comes back. At $t=5\\,\\text{s}$, $v=-4$ and the area below the axis is $-4$, so the displacement is $9-4=5\\,\\text{m}$ while the distance travelled is $13\\,\\text{m}$.',
        zh: '以 $6\\,\\text{m/s}$ 出发，$a=-2$。图线在 $t=3\\,\\text{s}$ 穿过零：物体走了 $9\\,\\text{m}$ 后停下，再往回走。$t=5\\,\\text{s}$ 时 $v=-4$，轴下方面积是 $-4$，所以位移是 $9-4=5\\,\\text{m}$，而路程是 $13\\,\\text{m}$。',
      },
      set: { v0: 6, a: -2, T: 5 },
    },
  ],
  sections: [
    {
      id: 'slope',
      title: { en: 'The slope is the acceleration', zh: '斜率就是加速度' },
      body: {
        en: 'Acceleration is how fast velocity changes: $a=\\dfrac{\\Delta v}{\\Delta t}$. On a $v$–$t$ graph that is rise over run, the slope. **Uniform** acceleration means the slope never changes, so the graph is a straight line:\n\n$$v=v_0+at$$\n\nA steeper line is a harder push; a line sloping down is braking.',
        zh: '加速度描述速度变化的快慢：$a=\\dfrac{\\Delta v}{\\Delta t}$。在 $v$–$t$ 图上，这正是"竖直变化除以水平变化"，也就是斜率。**匀变速**意味着斜率不变，所以图线是直线：\n\n$$v=v_0+at$$\n\n图线越陡，加速越猛；图线向下倾斜，就是在减速。',
      },
    },
    {
      id: 'area',
      title: { en: 'The area is the displacement', zh: '面积就是位移' },
      body: {
        en: 'Over a short moment $\\Delta t$ the object moves about $v\\,\\Delta t$: a thin strip of height $v$ and width $\\Delta t$. Adding the strips gives the area under the line. For a straight line the area is a trapezoid:\n\n$$x=\\frac{v_0+v}{2}\\,t=v_0t+\\tfrac12at^2$$\n\nArea **below** the axis counts as negative: the object is moving backwards.',
        zh: '在很短的时间 $\\Delta t$ 里，物体大约移动 $v\\,\\Delta t$，相当于一条高 $v$、宽 $\\Delta t$ 的细条。把细条加起来，就是图线下方的面积。直线下方是梯形：\n\n$$x=\\frac{v_0+v}{2}\\,t=v_0t+\\tfrac12at^2$$\n\n横轴**下方**的面积记为负，表示物体在往回走。',
      },
    },
    {
      id: 'equations',
      title: { en: 'Three equations, one graph', zh: '三个公式，同一张图' },
      body: {
        en: 'Everything in uniformly accelerated motion follows from the slope and the area:\n\n$$v=v_0+at,\\qquad x=v_0t+\\tfrac12at^2,\\qquad v^2-v_0^2=2ax$$\n\nThe third comes from eliminating $t$ between the first two. Use it when the time is not given, for example a braking distance: from $6\\,\\text{m/s}$ at $a=-2$, the car stops after $x=\\dfrac{0-36}{-4}=9\\,\\text{m}$.',
        zh: '匀变速直线运动的所有结论都来自斜率和面积：\n\n$$v=v_0+at,\\qquad x=v_0t+\\tfrac12at^2,\\qquad v^2-v_0^2=2ax$$\n\n第三个式子由前两个消去 $t$ 得到，适合题目不给时间的情况，比如刹车距离：以 $6\\,\\text{m/s}$、$a=-2$ 减速，停下前走了 $x=\\dfrac{0-36}{-4}=9\\,\\text{m}$。',
      },
    },
    {
      id: 'distance',
      title: { en: 'Displacement is not distance', zh: '位移不等于路程' },
      body: {
        en: 'Once the line crosses the axis the object has turned around. Displacement adds the areas with their signs; distance adds their sizes. In the last guide step they differ: $9-4=5\\,\\text{m}$ of displacement, $9+4=13\\,\\text{m}$ of distance. Whether the speed is rising depends on **both** signs: speed grows when $v$ and $a$ point the same way.',
        zh: '图线一旦穿过横轴，物体就掉头了。位移把面积带符号相加，路程把面积的大小相加。引导的最后一步里两者不同：位移 $9-4=5\\,\\text{m}$，路程 $9+4=13\\,\\text{m}$。速度大小是否在变大，要看 $v$ 和 $a$ **两个**符号：同号时越来越快，异号时越来越慢。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A car starts from rest with $a=3\\,\\text{m/s}^2$. How far has it gone after $4\\,\\text{s}$?',
        zh: '汽车从静止开始以 $a=3\\,\\text{m/s}^2$ 加速，$4\\,\\text{s}$ 内走了多远？',
      },
      choices: [
        { en: '$12\\,\\text{m}$', zh: '$12\\,\\text{m}$' },
        { en: '$24\\,\\text{m}$', zh: '$24\\,\\text{m}$' },
        { en: '$48\\,\\text{m}$', zh: '$48\\,\\text{m}$' },
        { en: '$6\\,\\text{m}$', zh: '$6\\,\\text{m}$' },
      ],
      answer: 1,
      explanation: {
        en: '$x=\\tfrac12at^2=\\tfrac12\\times3\\times16=24\\,\\text{m}$, the triangle under a line that reaches $12\\,\\text{m/s}$.',
        zh: '$x=\\tfrac12at^2=\\tfrac12\\times3\\times16=24\\,\\text{m}$，就是末速度 $12\\,\\text{m/s}$ 的三角形面积。',
      },
    },
    {
      question: {
        en: 'On a $v$–$t$ graph, what does a line sloping downward but still above the axis mean?',
        zh: '$v$–$t$ 图线在横轴上方、但向下倾斜，表示什么？',
      },
      choices: [
        { en: 'Moving forward and slowing down', zh: '向前运动，越来越慢' },
        { en: 'Moving backward', zh: '在往回走' },
        { en: 'Standing still', zh: '静止' },
        { en: 'Moving forward and speeding up', zh: '向前运动，越来越快' },
      ],
      answer: 0,
      explanation: {
        en: '$v>0$ means forward; a negative slope means $a<0$, opposite to $v$, so the speed falls.',
        zh: '$v>0$ 表示向前；斜率为负说明 $a<0$，与 $v$ 方向相反，所以速度大小在减小。',
      },
    },
    {
      question: {
        en: 'A train brakes from $20\\,\\text{m/s}$ at $a=-4\\,\\text{m/s}^2$. What is its stopping distance?',
        zh: '火车以 $20\\,\\text{m/s}$ 开始刹车，$a=-4\\,\\text{m/s}^2$，刹车距离是多少？',
      },
      choices: [
        { en: '$5\\,\\text{m}$', zh: '$5\\,\\text{m}$' },
        { en: '$80\\,\\text{m}$', zh: '$80\\,\\text{m}$' },
        { en: '$50\\,\\text{m}$', zh: '$50\\,\\text{m}$' },
        { en: '$100\\,\\text{m}$', zh: '$100\\,\\text{m}$' },
      ],
      answer: 2,
      explanation: {
        en: '$v^2-v_0^2=2ax$ gives $0-400=-8x$, so $x=50\\,\\text{m}$. It takes $5\\,\\text{s}$ to stop.',
        zh: '由 $v^2-v_0^2=2ax$ 得 $0-400=-8x$，所以 $x=50\\,\\text{m}$，用时 $5\\,\\text{s}$。',
      },
    },
  ],
  resultTex: 'x = v_0t + \\tfrac12 at^2',
  related: ['projectile-motion', 'riemann-sum-area', 'derivative-tangent-slope'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Explain uniformly accelerated motion with a v–t graph: the slope is the acceleration and the area under the line is the displacement. Show a rectangle (v = 3, 4 s → 12 m), a triangle (from rest, a = 2 → 16 m), a trapezoid (2 → 6 m/s → 16 m), and a car braking from 6 m/s at a = −2 that stops at 3 s and reverses.',
    zh: '用 v-t 图讲解匀变速直线运动：斜率是加速度，图线下面积是位移。依次展示矩形（v = 3，4 秒走 12 米）、三角形（从静止以 a = 2 加速，16 米）、梯形（2 → 6 m/s，16 米），以及从 6 m/s 以 a = −2 刹车、3 秒时停下再反向的过程。',
  },
};
