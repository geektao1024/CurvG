import { pick, type Lab } from '../types';

const W = 1.6; // where the unrolled wave starts, to the right of the circle

export const unitCircleSine: Lab = {
  slug: 'unit-circle-sine',
  publication: 'public',
  levels: ['middle', 'high'],
  chapterTitle: { en: 'The unit circle', zh: '单位圆与正弦' },
  title: {
    en: 'Sine and cosine on the unit circle',
    zh: '单位圆上的正弦与余弦',
  },
  question: {
    en: 'Why does a point going round a circle draw a sine wave?',
    zh: '为什么一个点绕圆转动，会画出正弦波？',
  },
  summary: {
    en: 'Turn the angle θ and follow the height of a point on the unit circle. Unrolled along the angle, that height is the sine wave; the horizontal shadow is cosine.',
    zh: '转动角 θ，追踪单位圆上一个点的高度。把高度沿着角度展开，就是正弦波；水平方向的投影是余弦。',
  },
  keyPoints: [
    { en: 'Unit circle', zh: '单位圆' },
    { en: 'Radian measure', zh: '弧度制' },
    { en: 'Special angles', zh: '特殊角' },
    { en: 'sin² + cos² = 1', zh: 'sin² + cos² = 1' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      // Own axes: the wave's horizontal axis is the angle, not x, so global
      // x ticks (2, 3, 4…) would mislabel it.
      view: { x: [-1.5, W + 6.6], y: [-1.6, 1.6], axes: false },
      params: [
        {
          id: 'th',
          label: '\\theta',
          min: 0,
          max: 6.2832,
          step: 0.01,
          value: 0.9,
          play: 8,
          bands: [
            { from: 0, to: 3.1416, label: 'sin θ ≥ 0', color: 'green' },
            { from: 3.1416, to: 6.2832, label: 'sin θ ≤ 0', color: 'red' },
          ],
        },
      ],
      scalars: [
        { id: 'c', expr: 'cos(th)' },
        { id: 's', expr: 'sin(th)' },
      ],
      objects: [
        { type: 'segment', from: [-1.35, 0], to: [1.35, 0], color: 'muted', width: 1.5 },
        { type: 'segment', from: [0, -1.35], to: [0, 1.35], color: 'muted', width: 1.5 },
        { type: 'segment', from: [W, 0], to: [`${W} + 2 * pi + 0.25`, 0], color: 'muted', width: 1.5, arrow: true },
        { type: 'segment', from: [W, -1.15], to: [W, 1.15], color: 'muted', width: 1.5 },
        { type: 'circle', center: [0, 0], r: 1, color: 'ink', width: 2 },
        {
          type: 'parametric',
          x: `${W} + t`,
          y: 'sin(t)',
          range: [0, '2 * pi'],
          color: 'muted',
          dashed: true,
          width: 1.5,
        },
        {
          type: 'parametric',
          x: `${W} + t`,
          y: 'sin(t)',
          range: [0, 'th'],
          color: 'red',
          width: 3,
          label: 'y = sin θ',
        },
        { type: 'arc', center: [0, 0], r: 0.28, start: 0, end: 'th', color: 'primary', width: 2 },
        { type: 'segment', from: [0, 0], to: ['c', 's'], color: 'ink', width: 2 },
        { type: 'segment', from: [0, 0], to: ['c', 0], color: 'blue', width: 3.5, label: 'cos θ' },
        { type: 'segment', from: ['c', 0], to: ['c', 's'], color: 'red', width: 3.5, label: 'sin θ' },
        { type: 'segment', from: ['c', 's'], to: [`${W} + th`, 's'], color: 'muted', dashed: true, width: 1.5 },
        { type: 'point', at: ['c', 's'], color: 'red', size: 6, label: 'P', drag: { angle: 'th' } },
        { type: 'point', at: [`${W} + th`, 's'], color: 'red', size: 5 },
        { type: 'text', at: [`${W} + pi / 2`, -1.3], text: 'π/2', color: 'muted' },
        { type: 'text', at: [`${W} + pi`, -1.3], text: 'π', color: 'muted' },
        { type: 'text', at: [`${W} + 3 * pi / 2`, -1.3], text: '3π/2', color: 'muted' },
        { type: 'text', at: [`${W} + 2 * pi`, -1.3], text: '2π', color: 'muted' },
      ],
      readouts: [
        { label: '\\theta\\ (\\text{rad})', expr: 'th', digits: 3 },
        { label: '\\theta\\ (^\\circ)', expr: 'th * 180 / pi', digits: 1 },
        { label: '\\sin\\theta', expr: 's', digits: 3, highlight: true },
        { label: '\\cos\\theta', expr: 'c', digits: 3 },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Thirty degrees', zh: '三十度' },
      body: {
        en: 'At $\\theta=\\frac{\\pi}{6}$ (30°) the point $P$ sits at height $\\frac12$. The red segment is $\\sin\\theta$; the blue one, $\\cos\\theta=\\frac{\\sqrt3}{2}\\approx0.866$.',
        zh: '$\\theta=\\frac{\\pi}{6}$（30°）时，点 $P$ 的高度是 $\\frac12$。红色线段是 $\\sin\\theta$，蓝色线段是 $\\cos\\theta=\\frac{\\sqrt3}{2}\\approx0.866$。',
      },
      set: { th: Math.PI / 6 },
    },
    {
      title: { en: 'The top', zh: '最高点' },
      body: {
        en: 'At $\\theta=\\frac{\\pi}{2}$ the point is straight up: $\\sin\\theta=1$, $\\cos\\theta=0$. On the right, the wave reaches its peak at the same moment.',
        zh: '$\\theta=\\frac{\\pi}{2}$ 时点在正上方：$\\sin\\theta=1$，$\\cos\\theta=0$。右边的波也在同一时刻到达波峰。',
      },
      set: { th: Math.PI / 2 },
    },
    {
      title: { en: 'Half a turn', zh: '转半圈' },
      body: {
        en: 'At $\\theta=\\pi$ the point is on the left and its height is back to $0$. The wave crosses the axis: half a period done.',
        zh: '$\\theta=\\pi$ 时点到了左边，高度回到 $0$。波穿过横轴，走完了半个周期。',
      },
      set: { th: Math.PI },
    },
    {
      title: { en: 'Below the axis', zh: '到了横轴下方' },
      body: {
        en: 'At $\\theta=\\frac{3\\pi}{2}$ the point is at the bottom, so $\\sin\\theta=-1$. After $2\\pi$ the point is home and the wave starts over: the period is $2\\pi$.',
        zh: '$\\theta=\\frac{3\\pi}{2}$ 时点在最低处，$\\sin\\theta=-1$。转满 $2\\pi$ 后点回到起点，波从头再来：周期是 $2\\pi$。',
      },
      set: { th: (3 * Math.PI) / 2 },
    },
  ],
  sections: [
    {
      id: 'definition',
      title: { en: 'Sine and cosine as coordinates', zh: '正弦和余弦就是坐标' },
      body: {
        en: 'Draw a circle of radius $1$ around the origin. Turn a ray by the angle $\\theta$ from the positive $x$-axis; it meets the circle at one point $P$. By definition\n\n$$P=(\\cos\\theta,\\ \\sin\\theta)$$\n\nThis works for every angle, not just the acute angles of a right triangle, which is why the unit circle is the definition used beyond the first quadrant.',
        zh: '以原点为圆心画半径为 $1$ 的圆。从 $x$ 轴正方向转过角 $\\theta$ 作一条射线，它与圆交于一点 $P$。按定义\n\n$$P=(\\cos\\theta,\\ \\sin\\theta)$$\n\n这对任意角都成立，不只是直角三角形里的锐角，所以出了第一象限以后，用的都是单位圆定义。',
      },
    },
    {
      id: 'wave',
      title: { en: 'Unrolling the height', zh: '把高度展开' },
      body: {
        en: 'Plot the height of $P$ against the angle turned so far. Each full turn repeats the same heights, so the graph repeats every $2\\pi$: that is the sine wave. Its highest value is $1$ and its lowest is $-1$, the radius of the circle.\n\nThe angle is measured in **radians**: an angle of $\\theta$ cuts an arc of length $\\theta$ on the unit circle, so the horizontal axis of the wave is literally the distance travelled around the circle.',
        zh: '把 $P$ 的高度画在"已经转过的角度"上方。每转一整圈，高度就重复一次，所以图像每隔 $2\\pi$ 重复：这就是正弦波。最大值 $1$、最小值 $-1$，正是圆的半径。\n\n角度用**弧度**度量：角 $\\theta$ 在单位圆上截出的弧长恰好是 $\\theta$，所以波的横轴就是点在圆上走过的路程。',
      },
    },
    {
      id: 'values',
      title: { en: 'Special angles worth knowing', zh: '要记住的特殊角' },
      body: {
        en: '$$\\begin{array}{c|ccccc}\\theta & 0 & \\frac{\\pi}{6} & \\frac{\\pi}{4} & \\frac{\\pi}{3} & \\frac{\\pi}{2}\\\\\\hline \\sin\\theta & 0 & \\frac12 & \\frac{\\sqrt2}{2} & \\frac{\\sqrt3}{2} & 1\\\\ \\cos\\theta & 1 & \\frac{\\sqrt3}{2} & \\frac{\\sqrt2}{2} & \\frac12 & 0\\end{array}$$\n\nSine climbs while cosine falls by the same table read backwards, because $\\cos\\theta=\\sin\\left(\\frac{\\pi}{2}-\\theta\\right)$.',
        zh: '$$\\begin{array}{c|ccccc}\\theta & 0 & \\frac{\\pi}{6} & \\frac{\\pi}{4} & \\frac{\\pi}{3} & \\frac{\\pi}{2}\\\\\\hline \\sin\\theta & 0 & \\frac12 & \\frac{\\sqrt2}{2} & \\frac{\\sqrt3}{2} & 1\\\\ \\cos\\theta & 1 & \\frac{\\sqrt3}{2} & \\frac{\\sqrt2}{2} & \\frac12 & 0\\end{array}$$\n\n正弦在增大，余弦在减小，而且余弦这一行正好是正弦倒过来读，因为 $\\cos\\theta=\\sin\\left(\\frac{\\pi}{2}-\\theta\\right)$。',
      },
    },
    {
      id: 'identity',
      title: { en: 'The Pythagorean identity', zh: '平方关系' },
      body: {
        en: 'The blue segment, the red segment and the radius form a right triangle with hypotenuse $1$. Pythagoras gives, for every angle,\n\n$$\\sin^2\\theta+\\cos^2\\theta=1$$',
        zh: '蓝色线段、红色线段和半径围成一个斜边为 $1$ 的直角三角形。由勾股定理，对任意角都有\n\n$$\\sin^2\\theta+\\cos^2\\theta=1$$',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'What is $\\sin\\frac{5\\pi}{6}$?',
        zh: '$\\sin\\frac{5\\pi}{6}$ 等于多少？',
      },
      choices: [
        { en: '$\\frac12$', zh: '$\\frac12$' },
        { en: '$-\\frac12$', zh: '$-\\frac12$' },
        { en: '$\\frac{\\sqrt3}{2}$', zh: '$\\frac{\\sqrt3}{2}$' },
        { en: '$-\\frac{\\sqrt3}{2}$', zh: '$-\\frac{\\sqrt3}{2}$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\frac{5\\pi}{6}$ is in the second quadrant, mirroring $\\frac{\\pi}{6}$ across the $y$-axis. Same height: $\\frac12$.',
        zh: '$\\frac{5\\pi}{6}$ 在第二象限，是 $\\frac{\\pi}{6}$ 关于 $y$ 轴的对称点，高度相同，为 $\\frac12$。',
      },
    },
    {
      question: {
        en: 'What is the period of $y=\\sin x$?',
        zh: '$y=\\sin x$ 的周期是？',
      },
      choices: [
        { en: '$2\\pi$', zh: '$2\\pi$' },
        { en: '$\\pi$', zh: '$\\pi$' },
        { en: '$360$', zh: '$360$' },
        { en: '$1$', zh: '$1$' },
      ],
      answer: 0,
      explanation: {
        en: 'One full turn of the circle is $2\\pi$ radians; after it the heights repeat.',
        zh: '转一整圈是 $2\\pi$ 弧度，之后高度开始重复。',
      },
    },
    {
      question: {
        en: 'If $\\sin\\theta=0.6$ and $\\theta$ is acute, what is $\\cos\\theta$?',
        zh: '若 $\\sin\\theta=0.6$ 且 $\\theta$ 为锐角，$\\cos\\theta$ 是多少？',
      },
      choices: [
        { en: '$0.8$', zh: '$0.8$' },
        { en: '$0.4$', zh: '$0.4$' },
        { en: '$0.6$', zh: '$0.6$' },
        { en: '$1.6$', zh: '$1.6$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\cos^2\\theta=1-0.36=0.64$, and an acute angle has positive cosine, so $0.8$.',
        zh: '$\\cos^2\\theta=1-0.36=0.64$，锐角的余弦为正，所以是 $0.8$。',
      },
    },
  ],
  resultTex: 'P = (\\cos\\theta,\\ \\sin\\theta)',
  curveSlugs: ['sine-wave'],
  related: ['pythagorean-theorem-rearrangement', 'conic-sections-eccentricity'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Transform a sine wave into its unit-circle construction: a point turns around the unit circle while its height is traced to the right as y = sin θ, marking π/2, π, 3π/2 and 2π.',
    zh: '把正弦波还原成单位圆上的投影：一个点绕单位圆转动，它的高度同步向右画出 y = sin θ，并标出 π/2、π、3π/2 和 2π。',
  },
};
