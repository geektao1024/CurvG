import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the gallery's
 * positive Lyapunov exponents, the 3-cycle at a = −0.95, the bounds
 * |x| ≤ 1 + |c| and the three million points all come from
 * `@/lib/wonders/attractors`.
 */
export const strangeAttractors: Wonder = {
  slug: 'strange-attractors',
  publication: 'public',
  number: 11,
  updated: '2026-10-17',
  field: { zh: '动力系统 · 混沌', en: 'Dynamical systems · Chaos' },
  name: { zh: '奇异吸引子画廊', en: 'Strange attractor gallery' },
  metaTitle: {
    zh: '奇异吸引子：两行公式四个数，为什么能画出这样的图 | CurvG',
    en: 'Strange Attractors: Art From Two Lines of Math | CurvG',
  },
  question: {
    zh: '两行公式、四个数，为什么能画出这样的图？',
    en: 'Two lines of formula and four numbers: how do they draw pictures like these?',
  },
  summary: {
    zh: '从一个点出发，代进两行公式得到下一个点，再代进去……跳三百万次，把落点的疏密画出来，就是一幅画。改动四个数，画面连续变形；有些数下，混沌会突然消失，只剩几个点。',
    en: 'Start from a point, put it into two lines of formula to get the next, and repeat. After three million hops, draw where the points landed and you have a picture. Change the four numbers and it morphs; for some values the chaos suddenly vanishes, leaving just a few points.',
  },
  takeaway: {
    zh: '每一步都完全确定，点却永远不重复、也不会跑远，在一个有分形细节的形状上无穷无尽地游走：这就是奇异吸引子。李雅普诺夫指数大于 0 是混沌，小于 0 时轨道会落进少数几个点的循环。',
    en: 'Every step is fully determined, yet the point never repeats and never wanders off, roaming for ever over a shape with fractal detail: a strange attractor. A positive Lyapunov exponent means chaos; a negative one means the orbit settles into a cycle of a few points.',
  },
  beats: [
    {
      zh: '两行公式、四个数 a、b、c、d：x′ = sin(a·y) + c·cos(a·x)，y′ = sin(b·x) + d·cos(b·y)。从一个点出发，代进去，得到下一个点。',
      en: 'Two lines and four numbers a, b, c, d: x′ = sin(a·y) + c·cos(a·x), y′ = sin(b·x) + d·cos(b·y). Start from a point, put it in, get the next point.',
    },
    {
      zh: '一步一步跳，看起来东一下西一下，毫无章法。',
      en: 'Hop after hop it jumps here and there, with no pattern in sight.',
    },
    {
      zh: '跳三百万次，把落点的疏密画出来：越亮的地方，点落得越多。一幅图出现了。',
      en: 'Hop three million times and draw how densely the points land, brighter where more land. A picture appears.',
    },
    {
      zh: '点永远不会停，也从不重复，却始终待在这个形状上，放大还有更细的纹理。这叫奇异吸引子。',
      en: 'The point never stops and never repeats, yet it stays on this shape, which shows finer and finer texture as you zoom. This is a strange attractor.',
    },
    {
      zh: '让四个数慢慢变，画面连续地变形。每一帧都是一组新的数、一幅新的画。',
      en: 'Let the four numbers drift and the picture morphs smoothly. Every frame is a new set of numbers, a new picture.',
    },
    {
      zh: '但把 a 从 −1.4 调到 −0.95，混沌突然消失：点只在 3 个位置之间循环。判断标准是李雅普诺夫指数，大于 0 才是混沌。',
      en: 'But slide a from −1.4 to −0.95 and the chaos suddenly vanishes: the point just cycles between 3 places. The test is the Lyapunov exponent; only above 0 is it chaos.',
    },
    {
      zh: '画廊：每一幅都只是四个数。',
      en: 'The gallery: each picture is just four numbers.',
    },
    {
      zh: '现在轮到你：拖动四个滑块，或者让它随机找一幅混沌的画。',
      en: 'Your turn: drag the four sliders, or let it find you a random chaotic picture.',
    },
  ],
  sections: [
    {
      id: 'map',
      title: { zh: '一个映射', en: 'One map' },
      body: {
        zh: '这组公式叫 Clifford 吸引子（归于 Clifford Pickover）：\n\n$$x_{n+1}=\\sin(a\\,y_n)+c\\cos(a\\,x_n),\\qquad y_{n+1}=\\sin(b\\,x_n)+d\\cos(b\\,y_n)$$\n\n因为 $|\\sin|$、$|\\cos|$ 不超过 1，点永远待在 $|x|\\le1+|c|$、$|y|\\le1+|d|$ 的方框里，不会跑到无穷远。画板做的事情很简单：迭代三百万次，统计每个像素被落中多少次，用对数把次数映射成亮度。',
        en: 'These are the Clifford attractor equations (attributed to Clifford Pickover):\n\n$$x_{n+1}=\\sin(a\\,y_n)+c\\cos(a\\,x_n),\\qquad y_{n+1}=\\sin(b\\,x_n)+d\\cos(b\\,y_n)$$\n\nSince $|\\sin|$ and $|\\cos|$ never exceed 1, the point always stays inside the box $|x|\\le1+|c|$, $|y|\\le1+|d|$ and cannot escape. The stage does something simple: iterate three million times, count how often each pixel is hit, and map the counts to brightness on a log scale.',
      },
    },
    {
      id: 'lyapunov',
      title: { zh: '混沌的标尺：李雅普诺夫指数', en: 'Measuring chaos: the Lyapunov exponent' },
      body: {
        zh: '取两个挨得极近的起点，各自迭代。如果它们的距离平均每步乘以 $e^{\\lambda}$，$\\lambda$ 就是（最大）李雅普诺夫指数。画板用雅可比矩阵带着一个切向量一起迭代来算它。\n\n- $\\lambda>0$：微小的差别被指数放大，这是混沌，点铺成一幅有分形细节的画。\n- $\\lambda<0$：差别被压小，所有点都被吸进同一个循环。$a=-0.95$、$b=1.6$、$c=1$、$d=0.7$ 时是一个 3 点循环。\n- $\\lambda\\approx0$：点沿一条闭合曲线绕圈，不混沌也不停下。\n\n画廊里的六幅，$\\lambda$ 都大于 0。',
        en: 'Take two starting points extremely close together and iterate both. If their distance is multiplied on average by $e^{\\lambda}$ each step, $\\lambda$ is the (largest) Lyapunov exponent. The stage computes it by carrying a tangent vector along with the Jacobian matrix.\n\n- $\\lambda>0$: tiny differences grow exponentially; that is chaos, and the points spread into a picture with fractal detail.\n- $\\lambda<0$: differences shrink, and every point is drawn into the same cycle. At $a=-0.95$, $b=1.6$, $c=1$, $d=0.7$ it is a 3-point cycle.\n- $\\lambda\\approx0$: the point circles along a closed curve, neither chaotic nor settling.\n\nAll six pictures in the gallery have $\\lambda$ above 0.',
      },
    },
    {
      id: 'why',
      title: { zh: '为什么会有"形状"', en: 'Why there is a shape at all' },
      body: {
        zh: '混沌并不意味着点在方框里乱撒。映射会把平面反复拉伸、折叠：拉伸让相邻的点分开（混沌），折叠把它们收回有限的区域。一遍遍拉伸折叠之后留下的，是一个面积为零、却有无穷层细节的集合，点在上面的分布还有固定的疏密，这就是画面里的明暗。\n\n洛伦兹吸引子（本站第 3 个奇观）是连续时间里的同一类东西；这里是离散的一步一跳，所以几百万个点只要零点几秒就能算完。',
        en: 'Chaos does not mean the points are sprinkled at random over the box. The map stretches and folds the plane again and again: stretching pulls neighbouring points apart (the chaos), folding brings them back into a bounded region. What survives endless stretching and folding is a set with zero area but infinite layers of detail, and the points cover it with a fixed density, which is the light and shade in the picture.\n\nThe Lorenz attractor (wonder No. 3 on this site) is the same kind of object in continuous time; here time moves in discrete hops, so millions of points take only a fraction of a second.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '同一组数，每次画出来都一样吗？',
        en: 'Does the same set of numbers always give the same picture?',
      },
      answer: {
        zh: '一样。虽然单个点的轨迹对起点极其敏感，但点落下的疏密（吸引子上的"不变测度"）和起点无关，所以画面稳定，换个起点也一样。',
        en: 'Yes. A single orbit is extremely sensitive to its start, but the density of landing points (the attractor’s "invariant measure") does not depend on it, so the picture is stable from any start.',
      },
    },
    {
      question: {
        zh: '"随机一幅"是怎么找的？',
        en: 'How does "random picture" choose?',
      },
      answer: {
        zh: '在 −2.5 到 2.5 之间随机取四个数，算李雅普诺夫指数，只接受大于 0.1 且点铺得够开的组合；不满足就再抽一次。大约几次就能抽到一幅。',
        en: 'It draws four numbers between −2.5 and 2.5, computes the Lyapunov exponent and keeps only sets above 0.1 whose points spread out enough, drawing again otherwise. It usually takes only a few tries.',
      },
    },
    {
      question: {
        zh: '可以把它打印出来吗？',
        en: 'Can I print one?',
      },
      answer: {
        zh: '可以用底栏的"保存分享图"或导出视频。把四个数记下来，就能在任何程序里用同样的两行公式重新画出同一幅画。',
        en: 'Use "save share image" or export a video from the bar below. Write down the four numbers and you can redraw the same picture anywhere with the same two lines.',
      },
    },
  ],
  relatedCurves: ['lissajous-curve'],
  relatedLabs: ['unit-circle-sine', 'sinusoidal-function'],
  sources: [
    {
      title: 'Paul Bourke — Clifford attractors',
      url: 'https://paulbourke.net/fractals/clifford/',
    },
    {
      title: 'Lyapunov exponent — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lyapunov_exponent',
    },
    {
      title: 'Attractor — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Attractor',
    },
  ],
};
