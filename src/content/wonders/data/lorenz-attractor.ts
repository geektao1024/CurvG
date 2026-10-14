import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the 1e-5 start
 * gap, when the twins part, the wing centres and the ρ thresholds all come
 * from `@/lib/wonders/lorenz`.
 */
export const lorenzAttractor: Wonder = {
  slug: 'lorenz-attractor',
  publication: 'public',
  number: 3,
  updated: '2026-10-14',
  field: { zh: '微分方程 · 混沌', en: 'Differential equations · Chaos' },
  name: { zh: '洛伦兹吸引子', en: 'The Lorenz attractor' },
  metaTitle: {
    zh: '洛伦兹吸引子与蝴蝶效应动画：确定却无法预测 | CurvG',
    en: 'Lorenz Attractor & the Butterfly Effect, Animated | CurvG',
  },
  question: {
    zh: '方程完全确定，为什么结果却无法预测？',
    en: 'If the equations are exact, why can’t we predict the outcome?',
  },
  summary: {
    zh: '三条描述空气对流的方程，让一个点画出一只永不重复的"蝴蝶"。两个只差十万分之一的起点，十几秒后就分道扬镳。拖动换个角度，调一调参数，看混沌怎样出现。',
    en: 'Three equations for rolling air send a point round a "butterfly" that never repeats. Two starts one hundred-thousandth apart part ways within seconds. Turn it round, change the parameter and watch chaos appear.',
  },
  takeaway: {
    zh: '混沌不是随机：每一步都由方程精确决定，但起点上再小的误差都会被指数放大，所以只能预测形状，预测不了位置。',
    en: 'Chaos is not randomness: every step follows the equations exactly, but any error at the start grows exponentially, so you can predict the shape, never the position.',
  },
  beats: [
    {
      zh: '这三条方程，是洛伦兹在 1963 年为空气对流写的简化模型。一个点按它们运动，画出一条轨迹。',
      en: 'These three equations are a simple model of rolling air that Lorenz wrote down in 1963. A point moving by them traces out a path.',
    },
    {
      zh: '它在两只"翅膀"之间来回绕：绕几圈、什么时候换边，看不出规律，而且永远不会重复。',
      en: 'It loops round two "wings": how many times, and when it switches sides, follows no pattern you can see, and it never repeats.',
    },
    {
      zh: '两个起点只差十万分之一。十几秒里它们形影不离，然后误差突然放大，各走各的。',
      en: 'Two starts differ by one part in a hundred thousand. For over ten seconds they move as one; then the difference blows up and they go their own ways.',
    },
    {
      zh: '放进三千个几乎重合的点：一会儿工夫，它们就铺满了整只蝴蝶。',
      en: 'Release three thousand points that almost coincide: before long they are spread over the whole butterfly.',
    },
    {
      zh: '单个点的未来无法预测，整体的形状却始终不变。这就是混沌：完全确定，却不可预测。',
      en: 'Where any one point will be is beyond prediction, yet the overall shape never changes. That is chaos: fully determined, yet unpredictable.',
    },
    {
      zh: '现在轮到你：拖动画面换个角度，调一调 ρ，看蝴蝶怎样出现、消失。',
      en: 'Your turn: drag to turn it round, and change ρ to see the butterfly appear and vanish.',
    },
  ],
  sections: [
    {
      id: 'equations',
      title: { zh: '三条方程', en: 'Three equations' },
      body: {
        zh: '气象学家洛伦兹把空气受热翻滚的过程简化成三个量：$x$ 是翻滚的快慢，$y$ 和 $z$ 描述温度分布偏离均匀的程度。它们随时间的变化是\n\n$$\\dot x=\\sigma(y-x),\\quad \\dot y=x(\\rho-z)-y,\\quad \\dot z=xy-\\beta z$$\n\n这里取他当年用的参数 $\\sigma=10$、$\\beta=8/3$、$\\rho=28$。方程里没有任何随机项：给定起点，以后的每一刻都完全确定。\n\n画面上的轨迹用四阶龙格–库塔法算出，时间步长 0.005。',
        en: 'The meteorologist Edward Lorenz boiled rolling, heated air down to three quantities: $x$ is how fast it turns over, and $y$ and $z$ describe how far the temperature is from even. They change in time as\n\n$$\\dot x=\\sigma(y-x),\\quad \\dot y=x(\\rho-z)-y,\\quad \\dot z=xy-\\beta z$$\n\nwith the values he used: $\\sigma=10$, $\\beta=8/3$, $\\rho=28$. There is nothing random in these equations: given a start, every later moment is fixed.\n\nThe paths on screen are computed with the fourth-order Runge–Kutta method and a time step of 0.005.',
      },
    },
    {
      id: 'butterfly',
      title: { zh: '蝴蝶效应', en: 'The butterfly effect' },
      body: {
        zh: '在这个系统里，两个相邻起点的距离平均每过约 0.77 个时间单位就翻一倍（最大李雅普诺夫指数约 0.906）。指数增长非常快：故事里两个点起初只差 $10^{-5}$，大约 16 个时间单位后就相距超过 1，跟着便是完全不同的两条路。\n\n洛伦兹 1961 年在计算机上重算一段天气模拟，把一个数从 6 位小数四舍五入成 3 位，结果几周后的"天气"面目全非。他在 1972 年的一次演讲题目里问：巴西一只蝴蝶扇动翅膀，会不会在得克萨斯引起一场龙卷风？"蝴蝶效应"由此得名。\n\n这也是天气预报很难准确超过两周的原因之一：初始观测再精确，误差也会被这样放大。',
        en: 'In this system, the distance between two neighbouring starts doubles on average about every 0.77 time units (the largest Lyapunov exponent is about 0.906). Exponential growth is fast: in the story the two points start $10^{-5}$ apart and are more than 1 apart after about 16 time units, after which they follow completely different paths.\n\nIn 1961 Lorenz re-ran part of a weather simulation and typed in a number rounded from six decimals to three; a few weeks into the run, the "weather" was unrecognisable. A 1972 talk of his asked whether the flap of a butterfly’s wings in Brazil could set off a tornado in Texas, and the "butterfly effect" got its name.\n\nIt is also one reason weather forecasts struggle to stay accurate beyond about two weeks: however precise the first measurements, errors grow like this.',
      },
    },
    {
      id: 'chaos',
      title: { zh: '确定，却不可预测', en: 'Determined, yet unpredictable' },
      body: {
        zh: '混沌有三个特征同时成立：\n\n- **确定**：没有随机性，同样的起点永远给出同样的结果；\n- **敏感**：起点的微小差别会指数放大；\n- **有界且不重复**：轨迹永远困在有限的区域里，却从不回到走过的路上。\n\n所以单个点的位置无法长期预测，但三千个点最后铺出的形状每次都一样。这个形状叫**奇异吸引子**，它是一个分形，维数约为 2.06：比曲面"多"一点点。',
        en: 'Chaos is three things at once:\n\n- **Determined**: nothing is random; the same start always gives the same result.\n- **Sensitive**: tiny differences at the start grow exponentially.\n- **Bounded, never repeating**: the path stays in a finite region but never retraces itself.\n\nSo no single point can be predicted for long, but the shape three thousand points end up spreading over is the same every time. It is called a **strange attractor**, and it is a fractal of dimension about 2.06, a little "more" than a surface.',
      },
    },
    {
      id: 'rho',
      title: { zh: '调大 ρ，蝴蝶才出现', en: 'Turn up ρ and the butterfly appears' },
      body: {
        zh: '$\\rho$ 代表加热的强弱（σ、β 保持不变）：\n\n- $\\rho<1$：加热太弱，所有点都回到原点，空气不动；\n- $1<\\rho<24.06$：点最终停在两只翅膀的中心之一，空气稳定地朝一个方向翻滚（$\\rho$ 在 13.93 到 24.06 之间时，可能要先乱跳很久才停下）；\n- $24.06<\\rho<24.74$：蝴蝶和两个静止点同时存在，停在哪里取决于起点；\n- $\\rho>24.74$：两个中心都不稳定了，只剩蝴蝶。\n\n两只翅膀的中心在 $\\left(\\pm\\sqrt{\\beta(\\rho-1)},\\ \\pm\\sqrt{\\beta(\\rho-1)},\\ \\rho-1\\right)$，$\\rho=28$ 时约为 $(\\pm8.49,\\pm8.49,27)$。',
        en: '$\\rho$ stands for how hard the air is heated (σ and β stay fixed):\n\n- $\\rho<1$: too little heat; every point falls back to the origin and the air stays still.\n- $1<\\rho<24.06$: points settle at the centre of one wing, and the air rolls steadily one way (between 13.93 and 24.06 they may bounce around for a long time first).\n- $24.06<\\rho<24.74$: the butterfly and the two resting points coexist; where a point ends up depends on its start.\n- $\\rho>24.74$: both centres are unstable and only the butterfly is left.\n\nThe wing centres sit at $\\left(\\pm\\sqrt{\\beta(\\rho-1)},\\ \\pm\\sqrt{\\beta(\\rho-1)},\\ \\rho-1\\right)$, about $(\\pm8.49,\\pm8.49,27)$ at $\\rho=28$.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '蝴蝶真的能引起龙卷风吗？',
        en: 'Can a butterfly really cause a tornado?',
      },
      answer: {
        zh: '这是个比喻。它说的是：在混沌系统里，任何微小的差别都可能在很久以后变成巨大的差别，所以无法追溯"哪一只蝴蝶"负责，也无法长期预测。',
        en: 'It is a metaphor. It says that in a chaotic system any tiny difference can grow into a huge one much later, so you can neither blame a particular butterfly nor forecast far ahead.',
      },
    },
    {
      question: {
        zh: '既然误差会放大，屏幕上的轨迹还可信吗？',
        en: 'If errors grow, can the paths on screen be trusted?',
      },
      answer: {
        zh: '单条轨迹算久了，舍入误差也会被放大，和"真实"轨迹分开。但吸引子的形状是可靠的：2002 年 Warwick Tucker 用计算机辅助证明，确认这个奇异吸引子确实存在（这是数学家斯梅尔列出的 18 个问题中的第 14 个）。',
        en: 'Run for long, one path drifts from the "true" one too, because rounding errors grow. The shape is reliable, though: in 2002 Warwick Tucker gave a computer-assisted proof that the strange attractor really exists, settling the 14th of Smale’s 18 problems.',
      },
    },
    {
      question: {
        zh: '混沌和随机有什么区别？',
        en: 'How is chaos different from randomness?',
      },
      answer: {
        zh: '随机是规则里本来就有不确定性；混沌的规则完全确定，只是对起点太敏感。同样的起点重算一遍，混沌系统给出一模一样的结果，随机过程不会。',
        en: 'Randomness has uncertainty built into the rules; chaos has exact rules that are extremely sensitive to the start. Re-run a chaotic system from the same start and you get exactly the same result; a random process would not.',
      },
    },
    {
      question: {
        zh: '为什么形状像一只蝴蝶？',
        en: 'Why does it look like a butterfly?',
      },
      answer: {
        zh: '两只"翅膀"各绕着一个中心，它们是方程的两个平衡点，但都不稳定：点被推着绕中心转圈、越转越远，远到一定程度就被甩到另一边。',
        en: 'Each wing wraps round a centre. These are the two balance points of the equations, but both are unstable: a point is pushed round a centre in widening loops until it is flung across to the other side.',
      },
    },
  ],
  relatedCurves: [],
  relatedLabs: ['exponential-logarithm', 'simple-pendulum'],
  sources: [
    {
      title: 'Lorenz system — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lorenz_system',
    },
    {
      title: 'Butterfly effect — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Butterfly_effect',
    },
  ],
};
