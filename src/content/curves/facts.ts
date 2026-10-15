/**
 * Formula cards: the forms of each curve's equation and the quantities
 * people search for (arc length, perimeter, area, foci…), keyed by slug.
 *
 * Same red line as `properties`: only standard, checkable results. Facts
 * with `measure` are re-derived from the drawn curve in
 * tests/curves-seo.test.ts; the rest must agree with the curve's
 * `properties`.
 */

import { gamma, gcd, TAU, type CurveFacts } from './types';

/** Lemniscate constant ϖ = 2.62205755429211981… */
const LEMNISCATE = 2.6220575542921198;

export const CURVE_FACTS: Record<string, CurveFacts> = {
  'lissajous-curve': {
    where: {
      en: 'a and b are the two frequencies, δ is the phase shift, and t runs over one period.',
      zh: 'a、b 是两个方向的频率，δ 是相位差，t 走过一个周期。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: ['x = \\sin(at + \\delta)', 'y = \\sin(bt)'],
      },
      {
        kind: 'period',
        tex: 'T = \\frac{2\\pi}{\\gcd(a, b)}',
        note: { en: 'whole-number a, b', zh: 'a、b 为整数' },
      },
      {
        kind: 'other',
        label: { en: 'Closed curve', zh: '闭合条件' },
        tex: 'a : b \\in \\mathbb{Q}',
      },
      {
        kind: 'other',
        label: { en: 'Bounding box', zh: '外接方框' },
        tex: '[-1, 1] \\times [-1, 1]',
      },
    ],
  },

  superellipse: {
    where: {
      en: 'a and b are the semi-axes (b = 1 in the graph) and n is the exponent; n = 2 is an ellipse.',
      zh: 'a、b 是半轴长（图中 b = 1），n 是指数；n = 2 时就是椭圆。',
    },
    facts: [
      {
        kind: 'cartesian',
        tex: '\\left|\\frac{x}{a}\\right|^n + \\left|\\frac{y}{b}\\right|^n = 1',
      },
      {
        kind: 'parametric',
        tex: [
          'x = a\\,\\operatorname{sgn}(\\cos t)\\,|\\cos t|^{2/n}',
          'y = b\\,\\operatorname{sgn}(\\sin t)\\,|\\sin t|^{2/n}',
        ],
      },
      {
        kind: 'area',
        tex: 'A = 4ab\\,\\frac{\\Gamma(1 + 1/n)^2}{\\Gamma(1 + 2/n)}',
        value: ({ n, a }) => (4 * a * gamma(1 + 1 / n) ** 2) / gamma(1 + 2 / n),
        measure: 'area',
      },
    ],
  },

  'butterfly-curve': {
    where: {
      en: 't is the parameter; the whole butterfly takes t from 0 to 24π.',
      zh: 't 是参数；整只蝴蝶需要 t 从 0 走到 24π。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: [
          'x = \\sin t\\left(e^{\\cos t} - 2\\cos 4t - \\sin^5\\tfrac{t}{12}\\right)',
          'y = \\cos t\\left(e^{\\cos t} - 2\\cos 4t - \\sin^5\\tfrac{t}{12}\\right)',
        ],
      },
      { kind: 'period', tex: 'T = 24\\pi' },
      {
        kind: 'other',
        label: { en: 'Distance from the center', zh: '到中心的距离' },
        tex: '\\sqrt{x^2 + y^2} \\le e + 3',
      },
    ],
  },

  'heart-curve': {
    where: {
      en: 't runs from 0 to 2π; s scales the whole heart (s = 1 below).',
      zh: 't 从 0 走到 2π；s 整体缩放爱心（下面按 s = 1）。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: [
          'x = 16\\sin^3 t',
          'y = 13\\cos t - 5\\cos 2t - 2\\cos 3t - \\cos 4t',
        ],
      },
      {
        kind: 'area',
        tex: 'A = 180\\pi \\approx 565.5',
        value: ({ s }) => 180 * Math.PI * s * s,
        measure: 'area',
      },
      {
        kind: 'other',
        label: { en: 'Width', zh: '宽度' },
        tex: '32',
      },
    ],
  },

  'rose-curve': {
    where: {
      en: 'a is the petal length (a = 1 in the graph) and k decides the number of petals.',
      zh: 'a 是花瓣长度（图中 a = 1），k 决定花瓣数。',
    },
    facts: [
      { kind: 'polar', tex: 'r = a\\cos(k\\theta)' },
      {
        kind: 'other',
        label: { en: 'Petals', zh: '花瓣数' },
        tex: 'k',
        note: { en: 'odd k', zh: 'k 为奇数' },
      },
      {
        kind: 'other',
        label: { en: 'Petals', zh: '花瓣数' },
        tex: '2k',
        note: { en: 'even k', zh: 'k 为偶数' },
      },
      {
        kind: 'area',
        tex: 'A = \\frac{\\pi a^2}{4}',
        note: { en: 'odd k', zh: 'k 为奇数' },
      },
      {
        kind: 'area',
        tex: 'A = \\frac{\\pi a^2}{2}',
        note: { en: 'even k', zh: 'k 为偶数' },
      },
    ],
  },

  cardioid: {
    where: {
      en: 'a sets the size: the cusp is at the origin and the far end at (2a, 0).',
      zh: 'a 决定大小：尖点在原点，最远点在 (2a, 0)。',
    },
    facts: [
      { kind: 'polar', tex: 'r = a(1 + \\cos\\theta)' },
      {
        kind: 'cartesian',
        tex: '(x^2 + y^2 - ax)^2 = a^2(x^2 + y^2)',
      },
      {
        kind: 'perimeter',
        tex: 'L = 8a',
        value: ({ a }) => 8 * a,
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = \\frac{3}{2}\\pi a^2',
        value: ({ a }) => 1.5 * Math.PI * a * a,
        measure: 'area',
      },
      { kind: 'cusps', tex: '1' },
    ],
  },

  limacon: {
    where: {
      en: 'a = 1 in the graph; b moves it from an inner loop (b < a) through the cardioid (b = a) to a convex curve (b ≥ 2a).',
      zh: '图中 a = 1；b 让它从带内环（b < a）经过心脏线（b = a）变成凸曲线（b ≥ 2a）。',
    },
    facts: [
      { kind: 'polar', tex: 'r = b + a\\cos\\theta' },
      {
        kind: 'area',
        tex: 'A = \\pi\\left(b^2 + \\frac{a^2}{2}\\right)',
        note: { en: 'b ≥ a', zh: 'b ≥ a' },
      },
    ],
  },

  'lemniscate-of-bernoulli': {
    where: {
      en: 'a is the distance from the center to each tip; ϖ ≈ 2.6221 is the lemniscate constant.',
      zh: 'a 是中心到两端的距离；ϖ ≈ 2.6221 是双纽线常数。',
    },
    facts: [
      { kind: 'polar', tex: 'r^2 = a^2\\cos 2\\theta' },
      { kind: 'cartesian', tex: '(x^2 + y^2)^2 = a^2(x^2 - y^2)' },
      {
        kind: 'perimeter',
        tex: 'L = 2\\varpi a \\approx 5.2441\\,a',
        value: ({ a }) => 2 * LEMNISCATE * a,
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = a^2',
        note: { en: 'both loops', zh: '两个环合计' },
        value: ({ a }) => a * a,
        measure: 'area',
      },
      { kind: 'foci', tex: '\\left(\\pm\\frac{a}{\\sqrt{2}},\\ 0\\right)' },
    ],
  },

  'cissoid-of-diocles': {
    where: {
      en: 'a is the radius of the generating circle; the curve approaches the line x = 2a.',
      zh: 'a 是生成圆的半径；曲线逼近直线 x = 2a。',
    },
    facts: [
      { kind: 'polar', tex: 'r = 2a\\sin\\theta\\tan\\theta' },
      { kind: 'cartesian', tex: 'y^2(2a - x) = x^3' },
      { kind: 'asymptote', tex: 'x = 2a' },
      {
        kind: 'area',
        tex: 'A = 3\\pi a^2',
        note: {
          en: 'between the curve and its asymptote',
          zh: '曲线与渐近线之间',
        },
      },
    ],
  },

  cycloid: {
    where: {
      en: 'r is the radius of the rolling circle (r = 1 in the graph) and t is the angle it has turned.',
      zh: 'r 是滚动圆的半径（图中 r = 1），t 是圆转过的角度。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: ['x = r(t - \\sin t)', 'y = r(1 - \\cos t)'],
      },
      {
        kind: 'arc_length',
        tex: 'L = 8r',
        note: { en: 'one arch', zh: '一拱' },
        value: () => 8,
      },
      {
        kind: 'area',
        tex: 'A = 3\\pi r^2',
        note: { en: 'under one arch', zh: '一拱下方' },
        value: () => 3 * Math.PI,
      },
      {
        kind: 'other',
        label: { en: 'Arch width', zh: '一拱的宽度' },
        tex: '2\\pi r',
      },
    ],
  },

  epicycloid: {
    where: {
      en: 'R is the fixed circle’s radius (R = 1 in the graph), r the rolling circle’s, and k = R/r.',
      zh: 'R 是定圆半径（图中 R = 1），r 是滚动圆半径，k = R/r。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: [
          'x = (R+r)\\cos t - r\\cos\\!\\big(\\tfrac{R+r}{r}t\\big)',
          'y = (R+r)\\sin t - r\\sin\\!\\big(\\tfrac{R+r}{r}t\\big)',
        ],
      },
      {
        kind: 'cusps',
        tex: 'k',
        note: { en: 'whole-number k', zh: 'k 为整数' },
        value: ({ k }) => k,
      },
      {
        kind: 'perimeter',
        tex: 'L = 8(R + r)',
        note: { en: 'whole-number k', zh: 'k 为整数' },
        value: ({ k }) => 8 * (1 + 1 / k),
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = \\pi(R + r)(R + 2r)',
        value: ({ k }) => Math.PI * (1 + 1 / k) * (1 + 2 / k),
        measure: 'area',
      },
    ],
  },

  hypocycloid: {
    where: {
      en: 'R is the fixed circle’s radius (R = 1 in the graph), r the rolling circle’s, and k = R/r.',
      zh: 'R 是定圆半径（图中 R = 1），r 是滚动圆半径，k = R/r。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: [
          'x = (R-r)\\cos t + r\\cos\\!\\big(\\tfrac{R-r}{r}t\\big)',
          'y = (R-r)\\sin t - r\\sin\\!\\big(\\tfrac{R-r}{r}t\\big)',
        ],
      },
      {
        kind: 'cusps',
        tex: 'k',
        note: { en: 'whole-number k', zh: 'k 为整数' },
        value: ({ k }) => k,
      },
      {
        kind: 'perimeter',
        tex: 'L = 8(R - r)',
        note: { en: 'whole-number k', zh: 'k 为整数' },
        value: ({ k }) => 8 * (1 - 1 / k),
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = \\pi(R - r)(R - 2r)',
        value: ({ k }) => Math.PI * (1 - 1 / k) * (1 - 2 / k),
        measure: 'area',
      },
    ],
  },

  hypotrochoid: {
    where: {
      en: 'R is the fixed ring, r the rolling circle, and d the pen’s distance from the rolling circle’s center.',
      zh: 'R 是定圆，r 是滚动圆，d 是笔尖到滚动圆圆心的距离。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: [
          'x = (R-r)\\cos t + d\\cos\\!\\big(\\tfrac{R-r}{r}t\\big)',
          'y = (R-r)\\sin t - d\\sin\\!\\big(\\tfrac{R-r}{r}t\\big)',
        ],
      },
      {
        kind: 'period',
        tex: 'T = \\frac{2\\pi r}{\\gcd(R, r)}',
        note: { en: 'whole-number R, r', zh: 'R、r 为整数' },
      },
      {
        kind: 'other',
        label: { en: 'Farthest from the center', zh: '离中心最远' },
        tex: 'R - r + d',
      },
    ],
  },

  epitrochoid: {
    where: {
      en: 'R is the fixed circle, r the rolling circle, and d the pen’s distance from the rolling circle’s center.',
      zh: 'R 是定圆，r 是滚动圆，d 是笔尖到滚动圆圆心的距离。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: [
          'x = (R+r)\\cos t - d\\cos\\!\\big(\\tfrac{R+r}{r}t\\big)',
          'y = (R+r)\\sin t - d\\sin\\!\\big(\\tfrac{R+r}{r}t\\big)',
        ],
      },
      {
        kind: 'period',
        tex: 'T = \\frac{2\\pi r}{\\gcd(R, r)}',
        note: { en: 'whole-number R, r', zh: 'R、r 为整数' },
      },
      {
        kind: 'other',
        label: { en: 'Farthest from the center', zh: '离中心最远' },
        tex: 'R + r + d',
      },
    ],
  },

  astroid: {
    where: {
      en: 'a is the distance from the center to each cusp (the fixed circle’s radius).',
      zh: 'a 是中心到每个尖点的距离（即定圆半径）。',
    },
    facts: [
      { kind: 'cartesian', tex: 'x^{2/3} + y^{2/3} = a^{2/3}' },
      { kind: 'parametric', tex: ['x = a\\cos^3 t', 'y = a\\sin^3 t'] },
      {
        kind: 'perimeter',
        tex: 'L = 6a',
        value: ({ a }) => 6 * a,
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = \\frac{3}{8}\\pi a^2',
        value: ({ a }) => (3 / 8) * Math.PI * a * a,
        measure: 'area',
      },
      { kind: 'cusps', tex: '4' },
    ],
  },

  'deltoid-curve': {
    where: {
      en: 'r is the rolling circle’s radius; the fixed circle’s radius is 3r.',
      zh: 'r 是滚动圆半径；定圆半径为 3r。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: ['x = r(2\\cos t + \\cos 2t)', 'y = r(2\\sin t - \\sin 2t)'],
      },
      {
        kind: 'perimeter',
        tex: 'L = 16r',
        value: ({ r }) => 16 * r,
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = 2\\pi r^2',
        value: ({ r }) => 2 * Math.PI * r * r,
        measure: 'area',
      },
      { kind: 'cusps', tex: '3' },
    ],
  },

  nephroid: {
    where: {
      en: 'r is the rolling circle’s radius; the fixed circle’s radius is 2r.',
      zh: 'r 是滚动圆半径；定圆半径为 2r。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: ['x = r(3\\cos t - \\cos 3t)', 'y = r(3\\sin t - \\sin 3t)'],
      },
      {
        kind: 'perimeter',
        tex: 'L = 24r',
        value: ({ r }) => 24 * r,
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = 12\\pi r^2',
        value: ({ r }) => 12 * Math.PI * r * r,
        measure: 'area',
      },
      { kind: 'cusps', tex: '2' },
    ],
  },

  'archimedean-spiral': {
    where: {
      en: 'a is the starting radius (a = 0 in the graph) and b sets the gap between turns.',
      zh: 'a 是起始半径（图中 a = 0），b 决定相邻两圈的间距。',
    },
    facts: [
      { kind: 'polar', tex: 'r = a + b\\theta' },
      {
        kind: 'other',
        label: { en: 'Gap between turns', zh: '相邻两圈的间距' },
        tex: '2\\pi b',
        value: ({ b }) => TAU * b,
      },
      {
        kind: 'arc_length',
        tex: 'L = \\frac{b}{2}\\left[\\theta\\sqrt{1+\\theta^2} + \\ln\\!\\left(\\theta + \\sqrt{1+\\theta^2}\\right)\\right]',
        note: { en: 'from 0 to θ, a = 0', zh: '从 0 到 θ，a = 0' },
        value: ({ b, turns }) => {
          const theta = turns * TAU;
          const root = Math.sqrt(1 + theta * theta);
          return (b / 2) * (theta * root + Math.log(theta + root));
        },
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A = \\frac{4}{3}\\pi^3 b^2',
        note: { en: 'first turn, a = 0', zh: '第一圈，a = 0' },
        value: ({ b }) => (4 / 3) * Math.PI ** 3 * b * b,
      },
    ],
  },

  'logarithmic-spiral': {
    where: {
      en: 'a is the radius at θ = 0 (a = 1 in the graph) and b sets how fast it widens.',
      zh: 'a 是 θ = 0 处的半径（图中 a = 1），b 决定张开的快慢。',
    },
    facts: [
      { kind: 'polar', tex: 'r = a e^{b\\theta}' },
      {
        kind: 'other',
        label: { en: 'Growth per turn', zh: '每转一圈放大' },
        tex: 'e^{2\\pi b}',
        value: ({ b }) => Math.exp(TAU * b),
      },
      {
        kind: 'other',
        label: { en: 'Tangent–radius angle', zh: '切线与半径的夹角' },
        tex: '\\cot\\alpha = b',
      },
      {
        kind: 'arc_length',
        tex: 'L = \\frac{\\sqrt{1 + b^2}}{b}\\,r(\\theta)',
        note: { en: 'from the pole to θ', zh: '从极点到 θ' },
      },
    ],
  },

  'fermat-spiral': {
    where: {
      en: 'a is a scale constant (a = 1 in the graph); θ ≥ 0, and the two signs draw the two arms.',
      zh: 'a 是比例常数（图中 a = 1）；θ ≥ 0，正负号各画一支。',
    },
    facts: [
      { kind: 'polar', tex: ['r^2 = a^2\\theta', 'r = \\pm a\\sqrt{\\theta}'] },
      {
        kind: 'area',
        tex: 'A = 2\\pi^2 a^2',
        note: {
          en: 'each ring between consecutive turns of one arm',
          zh: '同一支相邻两圈之间的每一环',
        },
      },
    ],
  },

  'golden-spiral': {
    where: {
      en: 'φ is the golden ratio and a is the radius at θ = 0.',
      zh: 'φ 是黄金比，a 是 θ = 0 处的半径。',
    },
    facts: [
      {
        kind: 'polar',
        tex: [
          'r = a\\,\\varphi^{2\\theta/\\pi}',
          '\\varphi = \\tfrac{1+\\sqrt5}{2} \\approx 1.618',
        ],
      },
      {
        kind: 'other',
        label: { en: 'Growth per quarter turn', zh: '每转四分之一圈放大' },
        tex: '\\varphi \\approx 1.618',
      },
      {
        kind: 'other',
        label: { en: 'Growth per turn', zh: '每转一圈放大' },
        tex: '\\varphi^4 \\approx 6.854',
      },
      {
        kind: 'other',
        label: { en: 'Pitch b in r = ae^(bθ)', zh: 'r = ae^(bθ) 中的 b' },
        tex: 'b = \\frac{2\\ln\\varphi}{\\pi} \\approx 0.3063',
      },
    ],
  },

  'involute-of-a-circle': {
    where: {
      en: 'r is the base circle’s radius (r = 1 in the graph) and t is the angle of string unwound.',
      zh: 'r 是基圆半径（图中 r = 1），t 是绳子展开的角度。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: ['x = r(\\cos t + t\\sin t)', 'y = r(\\sin t - t\\cos t)'],
      },
      {
        kind: 'arc_length',
        tex: 'L = \\frac{r t^2}{2}',
        note: { en: 'from the cusp to t', zh: '从尖点到 t' },
        value: ({ turns }) => (turns * TAU) ** 2 / 2,
        measure: 'length',
      },
    ],
  },

  parabola: {
    where: {
      en: 'p is the distance from the vertex to the focus.',
      zh: 'p 是顶点到焦点的距离。',
    },
    facts: [
      { kind: 'cartesian', tex: ['x^2 = 4py', 'y = \\frac{x^2}{4p}'] },
      {
        kind: 'other',
        label: { en: 'Focus', zh: '焦点' },
        tex: '(0,\\ p)',
      },
      {
        kind: 'other',
        label: { en: 'Directrix', zh: '准线' },
        tex: 'y = -p',
      },
      {
        kind: 'other',
        label: { en: 'Latus rectum', zh: '通径' },
        tex: '4p',
        value: ({ p }) => 4 * p,
      },
      { kind: 'eccentricity', tex: 'e = 1' },
    ],
  },

  ellipse: {
    where: {
      en: 'a and b are the semi-axes (a ≥ b) and c is the center-to-focus distance.',
      zh: 'a、b 是半轴长（a ≥ b），c 是中心到焦点的距离。',
    },
    facts: [
      { kind: 'cartesian', tex: '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1' },
      { kind: 'parametric', tex: ['x = a\\cos t', 'y = b\\sin t'] },
      {
        kind: 'area',
        tex: 'A = \\pi ab',
        value: ({ a, b }) => Math.PI * a * b,
        measure: 'area',
      },
      {
        kind: 'perimeter',
        tex: 'L \\approx \\pi\\left[3(a + b) - \\sqrt{(3a + b)(a + 3b)}\\right]',
        note: { en: 'Ramanujan’s approximation', zh: '拉马努金近似' },
        value: ({ a, b }) =>
          Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))),
        measure: 'length',
      },
      { kind: 'foci', tex: '(\\pm c,\\ 0),\\quad c^2 = a^2 - b^2' },
      { kind: 'eccentricity', tex: 'e = \\frac{c}{a} < 1' },
    ],
  },

  hyperbola: {
    where: {
      en: 'a is the center-to-vertex distance, b sets the asymptote slope, and c is the center-to-focus distance.',
      zh: 'a 是中心到顶点的距离，b 决定渐近线斜率，c 是中心到焦点的距离。',
    },
    facts: [
      { kind: 'cartesian', tex: '\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1' },
      { kind: 'asymptote', tex: 'y = \\pm\\frac{b}{a}x' },
      { kind: 'foci', tex: '(\\pm c,\\ 0),\\quad c^2 = a^2 + b^2' },
      {
        kind: 'eccentricity',
        tex: 'e = \\frac{c}{a} = \\sqrt{1 + \\frac{b^2}{a^2}} > 1',
        value: ({ a, b }) => Math.sqrt(1 + (b * b) / (a * a)),
      },
    ],
  },

  'sine-wave': {
    where: {
      en: 'A is the amplitude and ω the angular frequency.',
      zh: 'A 是振幅，ω 是角频率。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y = A\\sin(\\omega x)' },
      {
        kind: 'period',
        tex: 'T = \\frac{2\\pi}{\\omega}',
        value: ({ w }) => TAU / w,
      },
      {
        kind: 'other',
        label: { en: 'Zeros', zh: '零点' },
        tex: 'x = \\frac{k\\pi}{\\omega},\\quad k \\in \\mathbb{Z}',
      },
    ],
  },

  catenary: {
    where: {
      en: 'a is the height of the lowest point, the ratio of horizontal tension to weight per unit length.',
      zh: 'a 是最低点的高度，也是水平张力与单位长度重量之比。',
    },
    facts: [
      {
        kind: 'cartesian',
        tex: 'y = a\\cosh\\frac{x}{a} = \\frac{a}{2}\\big(e^{x/a} + e^{-x/a}\\big)',
      },
      {
        kind: 'arc_length',
        tex: 's = a\\sinh\\frac{x}{a}',
        note: { en: 'from the lowest point to x', zh: '从最低点到 x' },
      },
      {
        kind: 'other',
        label: { en: 'Lowest point', zh: '最低点' },
        tex: '(0,\\ a)',
      },
    ],
  },

  tractrix: {
    where: {
      en: 'a is the length of the leash; the x-axis is the line it is pulled along.',
      zh: 'a 是牵引绳的长度；x 轴是拉绳一端走过的直线。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: ['x = a(t - \\tanh t)', 'y = \\frac{a}{\\cosh t}'],
      },
      { kind: 'asymptote', tex: 'y = 0' },
      {
        kind: 'other',
        label: {
          en: 'Tangent segment to the asymptote',
          zh: '切线段到渐近线的长度',
        },
        tex: 'a',
      },
      {
        kind: 'area',
        tex: 'A = \\frac{\\pi a^2}{2}',
        note: {
          en: 'between both branches and the asymptote',
          zh: '两支与渐近线之间',
        },
      },
    ],
  },

  'witch-of-agnesi': {
    where: {
      en: 'a is the radius of the generating circle; the peak is at height 2a.',
      zh: 'a 是生成圆的半径；最高点高 2a。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y = \\frac{8a^3}{x^2 + 4a^2}' },
      { kind: 'asymptote', tex: 'y = 0' },
      {
        kind: 'area',
        tex: 'A = 4\\pi a^2',
        note: { en: 'between the curve and the x-axis', zh: '曲线与 x 轴之间' },
        value: ({ a }) => 4 * Math.PI * a * a,
      },
      {
        kind: 'other',
        label: { en: 'Inflection points', zh: '拐点' },
        tex: 'x = \\pm\\frac{2a}{\\sqrt{3}}',
      },
    ],
  },

  'folium-of-descartes': {
    where: {
      en: 'a sets the size; the tip of the loop is at (3a/2, 3a/2).',
      zh: 'a 决定大小；叶片尖端在 (3a/2, 3a/2)。',
    },
    facts: [
      { kind: 'cartesian', tex: 'x^3 + y^3 = 3axy' },
      {
        kind: 'parametric',
        tex: ['x = \\frac{3at}{1+t^3}', 'y = \\frac{3at^2}{1+t^3}'],
      },
      { kind: 'asymptote', tex: 'x + y + a = 0' },
      {
        kind: 'area',
        tex: 'A = \\frac{3}{2}a^2',
        note: { en: 'inside the loop', zh: '叶片内部' },
        value: ({ a }) => 1.5 * a * a,
      },
    ],
  },

  // Added 2026-10-15 with the second batch of curves.
  'bezier-curve': {
    where: {
      en: 'P₀ = (0, 0) and P₃ = (1, 0) are the end points; P₁ and P₂ are the handles you drag with the sliders; t runs from 0 to 1.',
      zh: 'P₀ = (0, 0)、P₃ = (1, 0) 是端点；P₁、P₂ 是用滑杆拖动的控制柄；t 从 0 走到 1。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: 'B(t) = (1-t)^3P_0 + 3(1-t)^2t\\,P_1 + 3(1-t)t^2P_2 + t^3P_3',
      },
      {
        kind: 'other',
        label: { en: 'Tangent at the ends', zh: '端点处的切向' },
        tex: ["B'(0) = 3(P_1 - P_0)", "B'(1) = 3(P_3 - P_2)"],
      },
      {
        kind: 'rule',
        text: {
          en: 'De Casteljau: split each side of the control polygon at ratio t, split the new segments at t, then once more; the last point is B(t).',
          zh: 'de Casteljau：把控制多边形每条边按比例 t 分开，再把新线段按 t 分开，再分一次，最后得到的点就是 B(t)。',
        },
      },
    ],
  },
  'lemniscate-of-gerono': {
    where: {
      en: 'a is the half-width: the curve spans −a ≤ x ≤ a.',
      zh: 'a 是半宽：曲线占据 −a ≤ x ≤ a。',
    },
    facts: [
      { kind: 'cartesian', tex: 'x^4 = a^2(x^2 - y^2)' },
      { kind: 'parametric', tex: ['x = a\\cos t', 'y = a\\sin t\\cos t'] },
      {
        kind: 'area',
        tex: 'A = \\frac{4}{3}a^2',
        note: { en: 'both lobes', zh: '两瓣合计' },
        value: ({ a }) => (4 / 3) * a * a,
        measure: 'area',
      },
    ],
  },
  trochoid: {
    where: {
      en: 'r is the wheel’s radius (r = 1 in the graph), d the pen’s distance from its centre, and t the angle the wheel has turned.',
      zh: 'r 是车轮半径（图中 r = 1），d 是笔尖到圆心的距离，t 是车轮转过的角度。',
    },
    facts: [
      { kind: 'parametric', tex: ['x = rt - d\\sin t', 'y = r - d\\cos t'] },
      {
        kind: 'other',
        label: { en: 'Height range', zh: '高度范围' },
        tex: 'r - d \\le y \\le r + d',
      },
      {
        kind: 'period',
        tex: 'T = 2\\pi r',
        note: { en: 'along the line', zh: '沿直线' },
        value: () => TAU,
      },
    ],
  },
  'cassini-oval': {
    where: {
      en: 'The foci are (±c, 0) with c = 1 in the graph; b² is the product of the two focal distances.',
      zh: '焦点为 (±c, 0)，图中 c = 1；b² 是到两焦点距离的乘积。',
    },
    facts: [
      {
        kind: 'cartesian',
        tex: '\\big((x-c)^2+y^2\\big)\\big((x+c)^2+y^2\\big) = b^4',
      },
      { kind: 'polar', tex: 'r^4 - 2c^2r^2\\cos 2\\theta = b^4 - c^4' },
      { kind: 'foci', tex: '(\\pm c,\\ 0)' },
      {
        kind: 'other',
        label: { en: 'Product of focal distances', zh: '到两焦点距离之积' },
        tex: 'r_1 r_2 = b^2',
      },
    ],
  },
  'conchoid-of-nicomedes': {
    where: {
      en: 'The pole O is the origin, the fixed line is x = a (a = 1 in the graph), and b is the distance marked off along each ray.',
      zh: '极点 O 在原点，定直线为 x = a（图中 a = 1），b 是在每条射线上量出的距离。',
    },
    facts: [
      { kind: 'polar', tex: 'r = a\\sec\\theta \\pm b' },
      { kind: 'cartesian', tex: '(x - a)^2(x^2 + y^2) = b^2x^2' },
      { kind: 'asymptote', tex: 'x = a' },
    ],
  },
  strophoid: {
    where: {
      en: 'a sets the size: the loop passes through (−a, 0) and the asymptote is x = a.',
      zh: 'a 决定大小：环经过 (−a, 0)，渐近线为 x = a。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y^2(a - x) = x^2(a + x)' },
      { kind: 'polar', tex: 'r = -a\\,\\frac{\\cos 2\\theta}{\\cos\\theta}' },
      { kind: 'asymptote', tex: 'x = a' },
      {
        kind: 'area',
        tex: 'A = \\left(2 - \\frac{\\pi}{2}\\right)a^2',
        note: { en: 'inside the loop', zh: '环内' },
        value: ({ a }) => (2 - Math.PI / 2) * a * a,
      },
    ],
  },
  'trisectrix-of-maclaurin': {
    where: {
      en: 'a sets the size: the loop reaches x = 3a/2 and the asymptote is x = −a/2.',
      zh: 'a 决定大小：环伸到 x = 3a/2，渐近线为 x = −a/2。',
    },
    facts: [
      { kind: 'cartesian', tex: '2x(x^2 + y^2) = a(3x^2 - y^2)' },
      { kind: 'polar', tex: 'r = a\\,\\frac{\\sin 3\\theta}{\\sin 2\\theta}' },
      { kind: 'asymptote', tex: 'x = -\\frac{a}{2}' },
      {
        kind: 'area',
        tex: 'A = \\frac{3\\sqrt3}{4}a^2',
        note: { en: 'inside the loop', zh: '环内' },
        value: ({ a }) => ((3 * Math.sqrt(3)) / 4) * a * a,
      },
    ],
  },
  cochleoid: {
    where: {
      en: 'a is the radius at θ = 0 (a = 1 in the graph); θ runs both ways from 0.',
      zh: 'a 是 θ = 0 处的半径（图中 a = 1）；θ 从 0 向两侧取值。',
    },
    facts: [
      { kind: 'polar', tex: 'r = \\frac{a\\sin\\theta}{\\theta}' },
      { kind: 'cartesian', tex: '(x^2 + y^2)\\arctan\\frac{y}{x} = ay' },
      {
        kind: 'other',
        label: { en: 'Returns to the pole at', zh: '回到极点的角度' },
        tex: '\\theta = k\\pi,\\quad k = \\pm1, \\pm2, \\dots',
      },
    ],
  },
  superformula: {
    where: {
      en: 'm sets the symmetry, n₁ the overall pinch, n₂ and n₃ the shape of the two halves of each lobe; here a = b = 1.',
      zh: 'm 决定对称数，n₁ 决定整体收缩，n₂、n₃ 决定每瓣两半的形状；这里 a = b = 1。',
    },
    facts: [
      {
        kind: 'polar',
        tex: 'r(\\varphi) = \\left(\\left|\\cos\\tfrac{m\\varphi}{4}\\right|^{n_2} + \\left|\\sin\\tfrac{m\\varphi}{4}\\right|^{n_3}\\right)^{-1/n_1}',
      },
      {
        kind: 'period',
        tex: '\\frac{4\\pi}{m}',
        note: { en: 'in angle', zh: '角度方向' },
        value: ({ m }) => (4 * Math.PI) / m,
      },
      {
        kind: 'other',
        label: { en: 'Unit circle', zh: '单位圆' },
        tex: 'm = 4,\\quad n_1 = n_2 = n_3 = 2',
      },
    ],
  },
  'maurer-rose': {
    where: {
      en: 'n is the rose’s petal number and d the step in degrees between joined points.',
      zh: 'n 是玫瑰线的花瓣参数，d 是相邻连接点之间的度数步长。',
    },
    facts: [
      { kind: 'polar', tex: 'r = \\sin(n\\theta)' },
      {
        kind: 'rule',
        tex: '\\theta_k = k\\,d^\\circ,\\quad k = 0, 1, \\dots, 360',
        text: {
          en: 'Join the points of the rose at these angles in order with straight segments.',
          zh: '按顺序用线段连起玫瑰线上这些角度处的点。',
        },
      },
      {
        kind: 'other',
        label: { en: 'Closes after', zh: '至多几步闭合' },
        tex: '\\frac{360}{\\gcd(d,\\ 360)}',
        note: { en: 'steps at most', zh: '步' },
        value: ({ d }) => 360 / gcd(d, 360),
      },
    ],
  },
  'devils-curve': {
    where: {
      en: 'a and b are where the curve meets the axes, at (±a, 0) and (0, ±b); b = 1 in the graph.',
      zh: 'a、b 是曲线与坐标轴的交点 (±a, 0)、(0, ±b)；图中 b = 1。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y^2(y^2 - b^2) = x^2(x^2 - a^2)' },
      {
        kind: 'polar',
        tex: 'r^2 = \\frac{b^2\\sin^2\\theta - a^2\\cos^2\\theta}{\\sin^2\\theta - \\cos^2\\theta}',
      },
      { kind: 'asymptote', tex: 'y = \\pm x' },
    ],
  },
  bicorn: {
    where: {
      en: 'a is the half-width: the cusps sit at (±a, 0).',
      zh: 'a 是半宽：尖点在 (±a, 0)。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y^2(a^2 - x^2) = (x^2 + 2ay - a^2)^2' },
      {
        kind: 'parametric',
        tex: [
          'x = a\\sin t',
          'y = \\frac{a\\cos^2 t\\,(2 + \\cos t)}{3 + \\sin^2 t}',
        ],
      },
      { kind: 'cusps', tex: '(\\pm a,\\ 0)' },
    ],
  },
  'kampyle-of-eudoxus': {
    where: {
      en: 'a is the distance from the centre to each vertex (±a, 0).',
      zh: 'a 是中心到顶点 (±a, 0) 的距离。',
    },
    facts: [
      { kind: 'cartesian', tex: 'x^4 = a^2(x^2 + y^2)' },
      { kind: 'polar', tex: 'r = a\\sec^2\\theta' },
      { kind: 'parametric', tex: ['x = a\\sec t', 'y = a\\tan t\\sec t'] },
    ],
  },
  'piriform-curve': {
    where: {
      en: 'a is half the length (a = 1 in the graph: the curve runs from 0 to 2a) and b sets the width.',
      zh: 'a 是长度的一半（图中 a = 1，曲线从 0 伸到 2a），b 决定宽度。',
    },
    facts: [
      { kind: 'cartesian', tex: 'a^4y^2 = b^2x^3(2a - x)' },
      {
        kind: 'parametric',
        tex: ['x = a(1 + \\sin t)', 'y = b\\cos t\\,(1 + \\sin t)'],
      },
      {
        kind: 'area',
        tex: 'A = \\pi ab',
        value: ({ b }) => Math.PI * b,
        measure: 'enclosed',
      },
    ],
  },
  'serpentine-curve': {
    where: {
      en: 'a is where the bend peaks and b twice its height.',
      zh: 'a 是弯曲最高点的位置，b 是最高点高度的两倍。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y = \\frac{abx}{x^2 + a^2}' },
      {
        kind: 'other',
        label: { en: 'Maximum', zh: '最大值点' },
        tex: '\\left(a,\\ \\frac{b}{2}\\right)',
      },
      {
        kind: 'other',
        label: { en: 'Inflection points', zh: '拐点' },
        tex: 'x = 0,\\ \\pm\\sqrt3\\,a',
      },
      { kind: 'asymptote', tex: 'y = 0' },
    ],
  },
  'tschirnhausen-cubic': {
    where: {
      en: 'a sets the size: the loop runs from x = −8a to x = a.',
      zh: 'a 决定大小：环从 x = −8a 伸到 x = a。',
    },
    facts: [
      { kind: 'cartesian', tex: '27ay^2 = (a - x)(8a + x)^2' },
      { kind: 'polar', tex: 'r = a\\sec^3\\frac{\\theta}{3}' },
      { kind: 'parametric', tex: ['x = a(1 - 3t^2)', 'y = a\\,t(3 - t^2)'] },
      {
        kind: 'area',
        tex: 'A = \\frac{72\\sqrt3}{5}a^2',
        note: { en: 'inside the loop', zh: '环内' },
        value: ({ a }) => ((72 * Math.sqrt(3)) / 5) * a * a,
      },
    ],
  },
  'semicubical-parabola': {
    where: {
      en: 'a sets how steeply the branches rise from the cusp at the origin.',
      zh: 'a 决定两支从原点尖点升起的陡峭程度。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y^2 = ax^3' },
      { kind: 'parametric', tex: ['x = t^2', 'y = \\sqrt a\\,t^3'] },
      {
        kind: 'arc_length',
        tex: 'L = \\frac{8}{27a}\\left[\\left(1 + \\frac{9ax}{4}\\right)^{3/2} - 1\\right]',
        note: { en: 'from the cusp to x', zh: '从尖点到 x' },
      },
    ],
  },
  'quadratrix-of-hippias': {
    where: {
      en: 'a is the side of Hippias’ square; the curve meets its base at x = 2a/π.',
      zh: 'a 是希庇亚斯正方形的边长；曲线与底边交于 x = 2a/π。',
    },
    facts: [
      { kind: 'cartesian', tex: 'x = y\\cot\\frac{\\pi y}{2a}' },
      { kind: 'polar', tex: 'r = \\frac{2a\\,\\theta}{\\pi\\sin\\theta}' },
      {
        kind: 'other',
        label: { en: 'Meets the x-axis at', zh: '与 x 轴的交点' },
        tex: 'x = \\frac{2a}{\\pi}',
        value: ({ a }) => (2 * a) / Math.PI,
      },
      { kind: 'asymptote', tex: 'y = \\pm 2a' },
    ],
  },
  'sigmoid-function': {
    where: {
      en: 'k sets the steepness; the curve rises from 0 to 1 and is centred at x = 0.',
      zh: 'k 决定陡峭程度；曲线从 0 升到 1，中心在 x = 0。',
    },
    facts: [
      { kind: 'cartesian', tex: 'y = \\frac{1}{1 + e^{-kx}}' },
      {
        kind: 'other',
        label: { en: 'Derivative', zh: '导数' },
        tex: "y' = k\\,y(1 - y)",
      },
      {
        kind: 'other',
        label: { en: 'Steepest slope', zh: '最大斜率' },
        tex: "y'(0) = \\frac{k}{4}",
        note: { en: 'at the inflection point (0, 1/2)', zh: '在拐点 (0, 1/2)' },
        value: ({ k }) => k / 4,
      },
      { kind: 'asymptote', tex: 'y = 0,\\quad y = 1' },
    ],
  },
  'hyperbolic-spiral': {
    where: {
      en: 'a sets the scale (a = 1 in the graph) and is also the height of the asymptote.',
      zh: 'a 是比例常数（图中 a = 1），也是渐近线的高度。',
    },
    facts: [
      { kind: 'polar', tex: 'r = \\frac{a}{\\theta}' },
      { kind: 'asymptote', tex: 'y = a' },
    ],
  },
  lituus: {
    where: {
      en: 'a sets the scale (a = 1 in the graph); θ > 0.',
      zh: 'a 是比例常数（图中 a = 1）；θ > 0。',
    },
    facts: [
      {
        kind: 'polar',
        tex: ['r^2\\theta = a^2', 'r = \\frac{a}{\\sqrt\\theta}'],
      },
      { kind: 'asymptote', tex: 'y = 0' },
      {
        kind: 'area',
        tex: 'A = \\frac{a^2}{2}\\ln\\frac{\\theta_2}{\\theta_1}',
        note: { en: 'sector between θ₁ and θ₂', zh: 'θ₁ 到 θ₂ 之间的扇形' },
      },
    ],
  },
  'euler-spiral': {
    where: {
      en: 't is the arc length measured from the centre; s is arc length in the curvature formula.',
      zh: 't 是从中心量起的弧长；曲率公式里的 s 也是弧长。',
    },
    facts: [
      {
        kind: 'parametric',
        tex: [
          'x = \\int_0^t \\cos\\frac{\\pi s^2}{2}\\,ds',
          'y = \\int_0^t \\sin\\frac{\\pi s^2}{2}\\,ds',
        ],
      },
      {
        kind: 'other',
        label: { en: 'Curvature', zh: '曲率' },
        tex: '\\kappa = \\pi s',
      },
      {
        kind: 'other',
        label: { en: 'The ends wind into', zh: '两端卷向' },
        tex: '\\left(\\pm\\tfrac12,\\ \\pm\\tfrac12\\right)',
      },
    ],
  },
  'spiral-of-theodorus': {
    where: {
      en: 'n is the number of right triangles; triangle k has legs √k and 1.',
      zh: 'n 是直角三角形的个数；第 k 个三角形的直角边为 √k 和 1。',
    },
    facts: [
      {
        kind: 'rule',
        text: {
          en: 'Put a leg of length 1 at right angles to the last hypotenuse, and join its end to the centre.',
          zh: '在上一条斜边的端点处垂直接一条长为 1 的直角边，再把它的端点与中心相连。',
        },
      },
      {
        kind: 'other',
        label: { en: 'Hypotenuse k', zh: '第 k 条斜边' },
        tex: 'h_k = \\sqrt{k + 1}',
      },
      {
        kind: 'other',
        label: { en: 'Angle of triangle k', zh: '第 k 个三角形的角' },
        tex: '\\varphi_k = \\arctan\\frac{1}{\\sqrt k}',
      },
      {
        kind: 'other',
        label: { en: 'Outer edge length', zh: '外缘长度' },
        tex: 'n',
        value: ({ n }) => n,
        measure: 'length',
      },
    ],
  },
  'koch-snowflake': {
    where: {
      en: 's is the side of the starting triangle (s = 1 in the graph) and n the number of iterations.',
      zh: 's 是初始三角形的边长（图中 s = 1），n 是迭代次数。',
    },
    facts: [
      {
        kind: 'rule',
        text: {
          en: 'Replace the middle third of every edge with two sides of an equilateral triangle pointing outward.',
          zh: '把每条边的中间三分之一换成一个向外的正三角形的两条边。',
        },
      },
      {
        kind: 'perimeter',
        tex: 'P_n = 3s\\left(\\frac43\\right)^n',
        value: ({ level }) => 3 * (4 / 3) ** level,
        measure: 'length',
      },
      {
        kind: 'area',
        tex: 'A_n = \\frac{\\sqrt3}{4}s^2\\left(\\frac85 - \\frac35\\left(\\frac49\\right)^n\\right)',
        value: ({ level }) =>
          (Math.sqrt(3) / 4) * (8 / 5 - (3 / 5) * (4 / 9) ** level),
        measure: 'enclosed',
      },
      {
        kind: 'other',
        label: { en: 'Fractal dimension', zh: '分形维数' },
        tex: 'D = \\frac{\\log 4}{\\log 3} \\approx 1.2619',
      },
    ],
  },
  'hilbert-curve': {
    where: {
      en: 'n is the order; the curve lives in the unit square.',
      zh: 'n 是阶数；曲线位于单位正方形内。',
    },
    facts: [
      {
        kind: 'rule',
        text: {
          en: 'Visit the four quarters of the square in a U; inside each quarter, repeat the whole pattern at half size, rotated so the pieces join.',
          zh: '按 U 形依次经过正方形的四个四分之一；在每个四分之一里，把整个图案缩小一半重复一遍，并旋转到首尾相接。',
        },
      },
      {
        kind: 'arc_length',
        tex: 'L_n = 2^n - 2^{-n}',
        value: ({ order }) => 2 ** order - 2 ** -order,
        measure: 'length',
      },
      {
        kind: 'other',
        label: { en: 'Cells visited', zh: '经过的格子数' },
        tex: '4^n',
        value: ({ order }) => 4 ** order,
      },
      {
        kind: 'other',
        label: { en: 'Dimension of the limit', zh: '极限的维数' },
        tex: 'D = 2',
      },
    ],
  },
  'dragon-curve': {
    where: {
      en: 'n is the number of folds; the ends are held 1 apart.',
      zh: 'n 是对折次数；两端距离保持为 1。',
    },
    facts: [
      {
        kind: 'rule',
        text: {
          en: 'Each fold appends a copy of the whole path, reversed and turned 90° about its end.',
          zh: '每对折一次，就在路径后接上整条路径的副本：倒过来走，并绕终点转 90°。',
        },
      },
      {
        kind: 'arc_length',
        tex: 'L_n = (\\sqrt2)^n',
        value: ({ folds }) => Math.SQRT2 ** folds,
        measure: 'length',
      },
      {
        kind: 'other',
        label: { en: 'Segments', zh: '线段数' },
        tex: '2^n',
        value: ({ folds }) => 2 ** folds,
      },
      {
        kind: 'other',
        label: { en: 'Boundary dimension', zh: '边界维数' },
        tex: 'D \\approx 1.5236',
      },
    ],
  },
  'levy-c-curve': {
    where: {
      en: 'n is the number of iterations; the ends are held 1 apart.',
      zh: 'n 是迭代次数；两端距离保持为 1。',
    },
    facts: [
      {
        kind: 'rule',
        text: {
          en: 'Replace every segment by the two legs of a right isosceles triangle built on it, always on the same side.',
          zh: '把每条线段换成以它为斜边的等腰直角三角形的两条直角边，总是朝同一侧。',
        },
      },
      {
        kind: 'arc_length',
        tex: 'L_n = (\\sqrt2)^n',
        value: ({ steps }) => Math.SQRT2 ** steps,
        measure: 'length',
      },
      {
        kind: 'other',
        label: { en: 'Segments', zh: '线段数' },
        tex: '2^n',
        value: ({ steps }) => 2 ** steps,
      },
      {
        kind: 'other',
        label: { en: 'Dimension of the limit', zh: '极限的维数' },
        tex: 'D = 2',
      },
    ],
  },
  'sierpinski-arrowhead-curve': {
    where: {
      en: 'n is the order; the base runs from (0, 0) to (1, 0).',
      zh: 'n 是阶数；底边从 (0, 0) 到 (1, 0)。',
    },
    facts: [
      {
        kind: 'rule',
        tex: 'A \\to B{-}A{-}B,\\quad B \\to A{+}B{+}A',
        text: {
          en: 'Rewrite the string n times, then draw: A and B are steps forward, + and − are turns of 60°.',
          zh: '把字符串改写 n 次再画：A、B 表示向前走一步，+、− 表示转 60°。',
        },
      },
      {
        kind: 'arc_length',
        tex: 'L_n = \\left(\\frac32\\right)^n',
        value: ({ order }) => 1.5 ** order,
        measure: 'length',
      },
      {
        kind: 'other',
        label: { en: 'Fractal dimension', zh: '分形维数' },
        tex: 'D = \\frac{\\log 3}{\\log 2} \\approx 1.585',
      },
    ],
  },
  'peano-curve': {
    where: {
      en: 'n is the order; the curve lives in the unit square.',
      zh: 'n 是阶数；曲线位于单位正方形内。',
    },
    facts: [
      {
        kind: 'rule',
        text: {
          en: 'Visit the nine blocks of the square column by column, up, down, up; inside each block repeat the whole snake, mirrored so neighbours join.',
          zh: '按列依次经过正方形的九块，上、下、上；每一块里重复整条蛇形，并做镜像让相邻块首尾相接。',
        },
      },
      {
        kind: 'arc_length',
        tex: 'L_n = 3^n - 3^{-n}',
        value: ({ order }) => 3 ** order - 3 ** -order,
        measure: 'length',
      },
      {
        kind: 'other',
        label: { en: 'Cells visited', zh: '经过的格子数' },
        tex: '9^n',
        value: ({ order }) => 9 ** order,
      },
      {
        kind: 'other',
        label: { en: 'Dimension of the limit', zh: '极限的维数' },
        tex: 'D = 2',
      },
    ],
  },
  'fibonacci-spiral': {
    where: {
      en: 'Fₖ is the k-th Fibonacci number (1, 1, 2, 3, 5, …) and n the number of squares.',
      zh: 'Fₖ 是第 k 个斐波那契数（1, 1, 2, 3, 5, …），n 是正方形个数。',
    },
    facts: [
      {
        kind: 'rule',
        tex: 'F_{k+1} = F_k + F_{k-1}',
        text: {
          en: 'Draw a quarter circle of radius Fₖ in the k-th square, turning 90° further each time.',
          zh: '在第 k 个正方形里画半径为 Fₖ 的四分之一圆，每次多转 90°。',
        },
      },
      {
        kind: 'arc_length',
        tex: 'L = \\frac{\\pi}{2}\\left(F_{n+2} - 1\\right)',
        value: ({ n }) => {
          const fib = [1, 1];
          while (fib.length < n + 2) {
            fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
          }
          return (Math.PI / 2) * (fib[n + 1] - 1);
        },
        measure: 'length',
      },
      {
        kind: 'other',
        label: { en: 'Ratio of successive radii', zh: '相邻半径之比' },
        tex: '\\frac{F_{k+1}}{F_k} \\to \\varphi \\approx 1.618',
      },
    ],
  },
};
