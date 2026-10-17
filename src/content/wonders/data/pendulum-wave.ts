import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: swing counts,
 * lengths, the 6° gap per second, the group counts at 15/20/30/40/45/60 s,
 * the 330° / −30° alias at 55 s and the large-swing correction all come from
 * `@/lib/wonders/pendulum-wave`.
 */
export const pendulumWave: Wonder = {
  slug: 'pendulum-wave',
  publication: 'public',
  number: 5,
  updated: '2026-10-17',
  field: { zh: '三角函数 · 波', en: 'Trigonometry · Waves' },
  name: { zh: '摆波', en: 'Pendulum wave' },
  metaTitle: {
    zh: '摆波：15 个单摆为什么会排出蛇形和整齐的队列 | CurvG',
    en: 'Pendulum Wave Explained: Snakes, Rows and Aliasing | CurvG',
  },
  question: {
    zh: '15 个互不相连的单摆，为何时而成蛇、时而成排？',
    en: 'Why do fifteen unconnected pendulums snake, split into rows and line up again?',
  },
  summary: {
    zh: '15 个单摆长度略有不同：最长的每分钟摆 51 次，往右每个多摆 1 次。它们互不相连，却会排成蛇形，在第 15、20、30 秒分成 4、3、2 组，60 秒后重新对齐。跳到任意时刻试试。',
    en: 'Fifteen pendulums of slightly different lengths: the longest swings 51 times a minute, each next one once more. Nothing connects them, yet they form a snake, split into 4, 3 and 2 groups at 15, 20 and 30 seconds, and line up again after 60. Jump to any moment and see.',
  },
  takeaway: {
    zh: '每个摆都只在做最简单的周期运动，所有图案都来自相邻两摆的相位差随时间均匀增长：走到周期的 p/q，就分成 q 组；后半程倒着重演，是因为太密的波被 15 个点看成了一条慢波，这叫混叠。',
    en: 'Each pendulum does nothing but the simplest periodic swing; every pattern comes from the phase gap between neighbours growing steadily: at p/q of the cycle there are q groups, and the second half replays in reverse because a wave too dense for fifteen points is seen as a slow one. That is aliasing.',
  },
  beats: [
    {
      zh: '15 个单摆一个比一个短，被一块板推到同一边，同时放手。它们之间没有任何连接。',
      en: 'Fifteen pendulums, each a little shorter than the last, are pushed aside by one board and let go together. Nothing connects them.',
    },
    {
      zh: '最左边最长的一分钟摆 51 次，往右每个多摆 1 次。相邻两个每秒错开 6°，很快排成一条游动的蛇。颜色表示步调：同色就是同步。',
      en: 'The longest, on the left, swings 51 times a minute; each one to its right swings once more. Neighbours drift apart by 6° a second and soon form a swimming snake. Colour shows the step: same colour, same step.',
    },
    {
      zh: '第 15 秒，正好四分之一个周期：相邻两个差 90°，15 个摆分成 4 组，同组完全同步。',
      en: 'At 15 seconds, a quarter of the cycle, neighbours are 90° apart: the fifteen split into 4 groups, each in perfect step.',
    },
    {
      zh: '第 20 秒，三分之一个周期：分成 3 组。走到周期的几分之一，就分成几组。',
      en: 'At 20 seconds, a third of the cycle: 3 groups. Whatever fraction of the cycle has passed, its denominator is the number of groups.',
    },
    {
      zh: '第 30 秒，半个周期：每个摆都和邻居正好相反，整整齐齐分成两排，交替摆动。',
      en: 'At 30 seconds, half the cycle, every pendulum is exactly opposite its neighbour: two neat rows, swinging in turn.',
    },
    {
      zh: '过了一半，图案倒着重演：40 秒又是 3 组，45 秒又是 4 组。',
      en: 'Past halfway the patterns replay in reverse: 3 groups again at 40 seconds, 4 at 45.',
    },
    {
      zh: '为什么倒着来？第 55 秒，每个摆其实比左边领先 330°，是青色的密波；15 个点却只显出琥珀色的慢波：落后 30°，往回游。这叫混叠。',
      en: 'Why in reverse? At 55 seconds each pendulum is really 330° ahead of its neighbour, the dense cyan wave; fifteen points can only show the slow amber one, 30° behind, swimming back. This is aliasing.',
    },
    {
      zh: '第 60 秒，每个摆都正好摆完整数次，从 51 次到 65 次，全体重新对齐，一切从头再来。',
      en: 'At 60 seconds every pendulum has made a whole number of swings, from 51 to 65, and all fifteen line up again. Then it all starts over.',
    },
    {
      zh: '现在轮到你：跳到任意时刻，调快调慢，增减摆的个数，打开隐藏的波。',
      en: 'Your turn: jump to any moment, speed up or slow down, add or remove pendulums, and reveal the hidden wave.',
    },
  ],
  sections: [
    {
      id: 'lengths',
      title: { zh: '长度决定节奏', en: 'Length sets the beat' },
      body: {
        zh: '摆角很小时，单摆的周期只和摆长 $L$ 有关：\n\n$$T=2\\pi\\sqrt{\\frac{L}{g}}$$\n\n要让第 $k$ 个摆（从 0 数起）每 60 秒正好摆 $51+k$ 次，它的频率是 $f_k=\\frac{51+k}{60}$ 赫兹，摆长反过来算：\n\n$$L_k=\\frac{g}{(2\\pi f_k)^2}$$\n\n最长的约 34.4 厘米，最短的约 21.2 厘米。15 根绳子的长度一旦定好，后面所有图案就都定了，没有任何一个摆"知道"别的摆在做什么。',
        en: 'For small swings, the period of a pendulum depends only on its length $L$:\n\n$$T=2\\pi\\sqrt{\\frac{L}{g}}$$\n\nFor pendulum $k$ (counting from 0) to swing exactly $51+k$ times every 60 seconds, its frequency is $f_k=\\frac{51+k}{60}$ hertz, and the length follows:\n\n$$L_k=\\frac{g}{(2\\pi f_k)^2}$$\n\nThe longest is about 34.4 cm, the shortest about 21.2 cm. Once the fifteen lengths are set, every pattern that follows is set too; no pendulum "knows" what the others are doing.',
      },
    },
    {
      id: 'phase',
      title: { zh: '一切都是相位差', en: 'It is all phase' },
      body: {
        zh: '所有摆从同一边同时放手，第 $k$ 个摆的水平位置是\n\n$$x_k(t)=A\\cos\\left(2\\pi\\,\\frac{51+k}{60}\\,t\\right)$$\n\n相邻两个摆的相位差对每一对都一样：\n\n$$\\Delta(t)=2\\pi\\,\\frac{t}{60}$$\n\n也就是每秒 6°。第 $k$ 个摆比第一个领先 $k\\Delta$，所以任何时刻，15 个摆的位置都是同一条余弦波 $A\\cos(\\varphi_0+s\\Delta)$ 在 $s=0,1,\\dots,14$ 这 15 个点上的取值。画板上的颜色就是这个相对相位：同色的摆步调一致。',
        en: 'All the pendulums are let go from the same side together, so pendulum $k$ sits at\n\n$$x_k(t)=A\\cos\\left(2\\pi\\,\\frac{51+k}{60}\\,t\\right)$$\n\nThe phase gap between neighbours is the same for every pair:\n\n$$\\Delta(t)=2\\pi\\,\\frac{t}{60}$$\n\nthat is, 6° a second. Pendulum $k$ runs $k\\Delta$ ahead of the first, so at any moment the fifteen positions are one cosine wave $A\\cos(\\varphi_0+s\\Delta)$ read at the fifteen points $s=0,1,\\dots,14$. The colours on the stage show this relative phase: same colour, same step.',
      },
    },
    {
      id: 'groups',
      title: { zh: '为什么分成 q 组', en: 'Why q groups' },
      body: {
        zh: '在 $t=\\frac{p}{q}\\times60$ 秒（$\\frac{p}{q}$ 是最简分数），第 $k$ 个摆的相对相位是\n\n$$k\\Delta=2\\pi\\,\\frac{kp}{q}$$\n\n它只取决于 $k$ 除以 $q$ 的余数，所以摆分成 $q$ 组，组内完全同步：15 秒（$\\frac14$）4 组，20 秒（$\\frac13$）3 组，30 秒（$\\frac12$）2 组，12 秒（$\\frac15$）5 组。\n\n到第 60 秒，第 $k$ 个摆正好摆完 $51+k$ 次，全部回到起点，图案从头再来。',
        en: 'At $t=\\frac{p}{q}\\times60$ seconds (with $\\frac{p}{q}$ in lowest terms), pendulum $k$ is ahead by\n\n$$k\\Delta=2\\pi\\,\\frac{kp}{q}$$\n\nwhich depends only on the remainder of $k$ divided by $q$, so the pendulums fall into $q$ groups, each in perfect step: 4 groups at 15 s ($\\frac14$), 3 at 20 s ($\\frac13$), 2 at 30 s ($\\frac12$), 5 at 12 s ($\\frac15$).\n\nAt 60 seconds pendulum $k$ has made exactly $51+k$ swings, all are back where they started, and the show begins again.',
      },
    },
    {
      id: 'aliasing',
      title: { zh: '倒着重演与混叠', en: 'Running backwards: aliasing' },
      body: {
        zh: '对整数 $k$，相位差加减一整圈看不出区别：\n\n$$\\cos(\\varphi_0+k\\Delta)=\\cos\\big(\\varphi_0+k(\\Delta-2\\pi)\\big)$$\n\n第 55 秒，$\\Delta=330^\\circ$，和 $-30^\\circ$ 落在同样的 15 个点上。眼睛把点连成最平缓的那条波，于是看到一条落后 30°、往回游的慢蛇，而真正的波密得多。\n\n所以 $60-t$ 秒的图案正是 $t$ 秒的倒放：$\\Delta(60-t)=360^\\circ-\\Delta(t)$，等同于 $-\\Delta(t)$。\n\n这就是取样定理说的事：每个波长至少要有两个取样点（$|\\Delta|\\le180^\\circ$）才能看对。电影里车轮倒转、手机拍屏幕出现的条纹，都是同一种混叠。',
        en: 'For whole numbers $k$, adding or removing a full turn from the gap makes no difference:\n\n$$\\cos(\\varphi_0+k\\Delta)=\\cos\\big(\\varphi_0+k(\\Delta-2\\pi)\\big)$$\n\nAt 55 seconds $\\Delta=330^\\circ$, which lands on the same fifteen points as $-30^\\circ$. The eye joins the dots with the gentlest wave, so it sees a slow snake 30° behind, swimming back, while the real wave is far denser.\n\nThat is why the pattern at $60-t$ seconds is the one at $t$ played backwards: $\\Delta(60-t)=360^\\circ-\\Delta(t)$, the same as $-\\Delta(t)$.\n\nThis is what the sampling theorem says: a wave is only seen correctly with at least two samples per wavelength ($|\\Delta|\\le180^\\circ$). Wagon wheels turning backwards on film and the stripes when you photograph a screen are the same aliasing.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '能自己做一个吗？',
        en: 'Can I build one?',
      },
      answer: {
        zh: '可以。按上面的公式算出每根摆长（从悬点量到摆球中心），用同样重的小球，放手时用一块板把所有球推到同一位置。摆角保持小一些，图案能维持好几个周期；空气阻力会让摆幅慢慢变小，但几乎不改变节奏。',
        en: 'Yes. Work out each length with the formula above (measured from the pivot to the centre of the bob), use identical bobs, and let them all go from one board held at the same offset. Keep the swings small and the pattern holds for several cycles; air drag shrinks the swings slowly but hardly changes their rhythm.',
      },
    },
    {
      question: {
        zh: '为什么摆角要小？',
        en: 'Why keep the swings small?',
      },
      answer: {
        zh: '周期公式只在小摆角时准确。摆角 20° 时，周期大约长 0.8%，51 次摆动下来就差出约 0.4 次，图案会糊掉。画板上的动画按小摆角公式计算。',
        en: 'The period formula is exact only for small swings. At 20° the period is about 0.8% longer, which adds up to about 0.4 of a swing over 51 swings, enough to blur the pattern. The animation on this page uses the small-swing formula.',
      },
    },
    {
      question: {
        zh: '这和正弦波有什么关系？',
        en: 'What does this have to do with sine waves?',
      },
      answer: {
        zh: '每个摆单独看就是一条正弦曲线随时间的变化；整排摆在某一刻的位置，是一条余弦波在 15 个点上的取样。所谓"蛇形"，就是这条波的形状。',
        en: 'Each pendulum on its own traces a sine curve over time; the whole row at one instant is a cosine wave sampled at fifteen points. The "snake" is simply the shape of that wave.',
      },
    },
  ],
  relatedCurves: ['sine-wave'],
  relatedLabs: ['simple-pendulum', 'sinusoidal-function'],
  sources: [
    {
      title: 'Pendulum (mechanics) — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Pendulum_(mechanics)',
    },
    {
      title: 'Flaten & Parendo, “Pendulum waves: A lesson in aliasing”, Am. J. Phys. 69, 778 (2001)',
      url: 'https://doi.org/10.1119/1.1349543',
    },
    {
      title: 'Aliasing — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Aliasing',
    },
  ],
};
