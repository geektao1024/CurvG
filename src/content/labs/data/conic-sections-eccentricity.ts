import { pick, type Lab } from '../types';

// Focus at the origin, semi-latus rectum ℓ = 2, directrix x = −ℓ/e:
// r(θ) = ℓ / (1 − e·cosθ). Fixing ℓ instead of the directrix keeps the curve
// on screen as e → 0 (a circle of radius ℓ) instead of collapsing to a point.
const R = '2 / (1 - e * cos(t))';

export const conicSectionsEccentricity: Lab = {
  slug: 'conic-sections-eccentricity',
  publication: 'public',
  primaryCategoryId: 'conic',
  levels: ['high', 'university'],
  chapterTitle: { en: 'Eccentricity', zh: '离心率' },
  title: {
    en: 'Conic sections and eccentricity',
    zh: '圆锥曲线与离心率',
  },
  question: {
    en: 'How can one number turn a circle into an ellipse, a parabola and a hyperbola?',
    zh: '为什么一个数就能让圆变成椭圆、抛物线和双曲线？',
  },
  summary: {
    en: 'Every conic is the set of points whose distance to a focus is e times their distance to a directrix. Drag e from 0 to 2 and watch the curve change family at e = 1.',
    zh: '每一条圆锥曲线，都是"到焦点的距离等于到准线距离的 e 倍"的点的集合。把 e 从 0 拖到 2，看曲线在 e = 1 处换了一个家族。',
  },
  keyPoints: [
    { en: 'Focus and directrix', zh: '焦点与准线' },
    { en: 'Eccentricity', zh: '离心率' },
    { en: 'Ellipse, parabola, hyperbola', zh: '椭圆、抛物线、双曲线' },
    { en: 'Polar equation', zh: '极坐标方程' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-7, 7], y: [-5, 5] },
      params: [
        {
          id: 'e',
          label: 'e',
          min: 0,
          max: 2,
          step: 0.01,
          value: 0.6,
          play: 10,
          bands: [
            { from: 0, to: 0.99, label: t('ellipse', '椭圆'), color: 'primary' },
            { from: 1, to: 1, label: t('parabola', '抛物线'), color: 'green' },
            { from: 1.01, to: 2, label: t('hyperbola', '双曲线'), color: 'blue' },
          ],
        },
        { id: 't0', label: '\\theta_P', min: 0, max: 6.2832, step: 0.01, value: 2 },
      ],
      scalars: [
        { id: 'r0', expr: '2 / (1 - e * cos(t0))' },
        { id: 'px', expr: 'r0 * cos(t0)' },
        { id: 'py', expr: 'r0 * sin(t0)' },
        { id: 'hasD', expr: 'e > 0.05' },
        { id: 'dx', expr: 'hasD ? -2 / e : -1000' },
        { id: 'PF', expr: 'abs(r0)' },
        { id: 'PD', expr: 'abs(px - dx)' },
      ],
      objects: [
        {
          type: 'parametric',
          x: `${R} * cos(t)`,
          y: `${R} * sin(t)`,
          range: [0, '2 * pi'],
          samples: 900,
          color: 'primary',
          width: 3.5,
        },
        {
          type: 'line',
          through: ['dx', 0],
          to: ['dx', 1],
          color: 'green',
          dashed: true,
          width: 2,
          visible: 'hasD',
          label: t('directrix', '准线'),
        },
        { type: 'segment', from: ['px', 'py'], to: [0, 0], color: 'blue', width: 2.2, label: 'PF' },
        {
          type: 'segment',
          from: ['px', 'py'],
          to: ['dx', 'py'],
          color: 'green',
          width: 2.5,
          visible: 'hasD',
          label: 'PD',
        },
        { type: 'point', at: [0, 0], color: 'ink', size: 6, label: 'F' },
        { type: 'point', at: ['px', 'py'], color: 'red', size: 6, label: 'P', drag: { angle: 't0' } },
      ],
      readouts: [
        { label: 'e', expr: 'e', digits: 2 },
        { label: '|PF|', expr: 'PF', digits: 3 },
        { label: '|PD|', expr: 'hasD ? PD : 0 / 0', digits: 3 },
        { label: '|PF| / |PD|', expr: 'hasD ? PF / PD : 0 / 0', digits: 3, highlight: true },
        {
          kind: 'status',
          label: t('Closed curve', '封闭曲线'),
          expr: 'e < 0.995',
          ok: t('yes: an ellipse', '是：椭圆'),
          bad: t('no: it runs off to infinity', '否：曲线伸向无穷远'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'e = 0: a circle', zh: 'e = 0：圆' },
      body: {
        en: 'With $e=0$ the directrix is infinitely far away and every point is the same distance, $2$, from the focus $F$. The curve is a circle.',
        zh: '$e=0$ 时准线在无穷远处，每个点到焦点 $F$ 的距离都是 $2$，曲线是一个圆。',
      },
      set: { e: 0, t0: 2 },
    },
    {
      title: { en: '0 < e < 1: an ellipse', zh: '0 < e < 1：椭圆' },
      body: {
        en: 'At $e=0.5$ every point is half as far from $F$ as from the green directrix. Check the readout: $|PF|/|PD|=0.5$ wherever $P$ is. The circle has stretched into a closed ellipse.',
        zh: '$e=0.5$ 时，每个点到 $F$ 的距离都是到绿色准线距离的一半。看读数：无论 $P$ 在哪里，$|PF|/|PD|=0.5$。圆被拉成了一个封闭的椭圆。',
      },
      set: { e: 0.5, t0: 2 },
    },
    {
      title: { en: 'e = 1: a parabola', zh: 'e = 1：抛物线' },
      body: {
        en: 'At $e=1$ the two distances are equal. The far end of the ellipse has run off to infinity and the curve opens up: $y^2=4(x+1)$.',
        zh: '$e=1$ 时两个距离相等。椭圆的远端跑到了无穷远，曲线张开了：$y^2=4(x+1)$。',
      },
      set: { e: 1, t0: 2 },
    },
    {
      title: { en: 'e > 1: a hyperbola', zh: 'e > 1：双曲线' },
      body: {
        en: 'At $e=1.5$ points are farther from $F$ than from the directrix, and the curve splits into two branches. Move $\\theta_P$ and the ratio stays $1.5$ on both of them.',
        zh: '$e=1.5$ 时，点到 $F$ 的距离比到准线的远，曲线分成两支。拖动 $\\theta_P$，两支上的比值都保持 $1.5$。',
      },
      set: { e: 1.5, t0: 2 },
    },
  ],
  sections: [
    {
      id: 'definition',
      title: { en: 'One definition for all three', zh: '一个定义统一三种曲线' },
      body: {
        en: 'Fix a point $F$ (the **focus**), a line $D$ (the **directrix**) and a number $e\\ge0$ (the **eccentricity**). The conic is every point $P$ with\n\n$$|PF| = e\\cdot|PD|$$\n\n- $e<1$: ellipse (the circle is the limit $e=0$)\n- $e=1$: parabola\n- $e>1$: hyperbola',
        zh: '取定一点 $F$（**焦点**）、一条直线 $D$（**准线**）和一个数 $e\\ge0$（**离心率**）。圆锥曲线就是满足下式的所有点 $P$：\n\n$$|PF| = e\\cdot|PD|$$\n\n- $e<1$：椭圆（圆是 $e=0$ 的极限情形）\n- $e=1$：抛物线\n- $e>1$：双曲线',
      },
    },
    {
      id: 'polar',
      title: { en: 'The polar equation behind the board', zh: '画板背后的极坐标方程' },
      body: {
        en: 'Put the focus at the origin and the directrix at $x=-\\frac{\\ell}{e}$. The definition becomes\n\n$$r=\\frac{\\ell}{1-e\\cos\\theta}$$\n\nwhere $\\ell$ is the semi-latus rectum (here $\\ell=2$). When $e\\ge1$ the denominator can reach $0$: that is the direction in which the curve escapes to infinity.',
        zh: '把焦点放在原点、准线放在 $x=-\\frac{\\ell}{e}$，定义就变成\n\n$$r=\\frac{\\ell}{1-e\\cos\\theta}$$\n\n其中 $\\ell$ 是半通径（这里 $\\ell=2$）。当 $e\\ge1$ 时分母可以等于 $0$，那正是曲线跑向无穷远的方向。',
      },
    },
    {
      id: 'standard',
      title: { en: 'Eccentricity in the standard equations', zh: '标准方程里的离心率' },
      body: {
        en: 'For the ellipse $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$ with $a>b$, the foci are at $(\\pm c,0)$ with $c^2=a^2-b^2$ and $e=\\frac{c}{a}<1$. For the hyperbola $\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1$, $c^2=a^2+b^2$ and $e=\\frac{c}{a}>1$. For the parabola $y^2=2px$, $e=1$.\n\nThe closer $e$ is to $0$, the rounder the ellipse; the closer to $1$, the flatter.',
        zh: '对椭圆 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$（$a>b$），焦点在 $(\\pm c,0)$，$c^2=a^2-b^2$，$e=\\frac{c}{a}<1$。对双曲线 $\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1$，$c^2=a^2+b^2$，$e=\\frac{c}{a}>1$。对抛物线 $y^2=2px$，$e=1$。\n\n$e$ 越接近 $0$，椭圆越圆；越接近 $1$，越扁。',
      },
    },
    {
      id: 'why-cone',
      title: { en: 'Why they are called conic sections', zh: '为什么叫"圆锥曲线"' },
      body: {
        en: 'Slice a double cone with a plane. A cut across one nappe gives an ellipse, a cut parallel to a side line gives a parabola, and a steep cut through both nappes gives a hyperbola. The tilt of the plane against the cone sets $e$, which is why the same three shapes come out of both definitions.\n\nThe focus also explains their optics: a parabolic dish sends incoming parallel rays to its focus, and light from one focus of an ellipse reflects to the other.',
        zh: '用平面去截一个双圆锥。斜着截过一叶得到椭圆，平行于母线截得到抛物线，陡峭地截过两叶得到双曲线。平面相对圆锥的倾斜程度决定了 $e$，所以两种定义得到的是同样三种曲线。\n\n焦点还解释了它们的光学性质：抛物面天线把平行射入的光汇聚到焦点，从椭圆一个焦点发出的光反射后经过另一个焦点。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'What is the eccentricity of $\\frac{x^2}{25}+\\frac{y^2}{16}=1$?',
        zh: '$\\frac{x^2}{25}+\\frac{y^2}{16}=1$ 的离心率是？',
      },
      choices: [
        { en: '$\\frac35$', zh: '$\\frac35$' },
        { en: '$\\frac45$', zh: '$\\frac45$' },
        { en: '$\\frac53$', zh: '$\\frac53$' },
        { en: '$\\frac{16}{25}$', zh: '$\\frac{16}{25}$' },
      ],
      answer: 0,
      explanation: {
        en: '$c^2=25-16=9$, so $c=3$ and $e=\\frac{c}{a}=\\frac35$.',
        zh: '$c^2=25-16=9$，$c=3$，$e=\\frac{c}{a}=\\frac35$。',
      },
    },
    {
      question: {
        en: 'On a parabola, how does $|PF|$ compare with the distance from $P$ to the directrix?',
        zh: '抛物线上的点 $P$，$|PF|$ 与它到准线的距离相比如何？',
      },
      choices: [
        { en: 'They are equal', zh: '相等' },
        { en: '$|PF|$ is larger', zh: '$|PF|$ 更大' },
        { en: '$|PF|$ is smaller', zh: '$|PF|$ 更小' },
        { en: 'It depends on $P$', zh: '取决于 $P$ 的位置' },
      ],
      answer: 0,
      explanation: {
        en: 'A parabola is exactly the case $e=1$.',
        zh: '抛物线就是 $e=1$ 的情形。',
      },
    },
    {
      question: {
        en: 'A conic has $e=\\sqrt2$. Which curve is it?',
        zh: '一条圆锥曲线的离心率是 $\\sqrt2$，它是哪种曲线？',
      },
      choices: [
        { en: 'Hyperbola', zh: '双曲线' },
        { en: 'Ellipse', zh: '椭圆' },
        { en: 'Parabola', zh: '抛物线' },
        { en: 'Circle', zh: '圆' },
      ],
      answer: 0,
      explanation: {
        en: '$\\sqrt2>1$. It is the rectangular hyperbola, whose asymptotes are perpendicular.',
        zh: '$\\sqrt2>1$。这是等轴双曲线，两条渐近线互相垂直。',
      },
    },
  ],
  resultTex: '|PF| = e \\cdot |PD|',
  curveSlugs: ['ellipse', 'parabola', 'hyperbola'],
  related: ['quadratic-transformations', 'unit-circle-sine'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Animate conic sections by eccentricity: with a fixed focus, sweep e from 0 to 2 so a circle becomes an ellipse, a parabola at e = 1 and a hyperbola, showing |PF| = e·|PD| for a moving point P.',
    zh: '用离心率串起圆锥曲线：焦点固定，让 e 从 0 扫到 2，圆依次变成椭圆、e = 1 时的抛物线和双曲线，并对一个动点 P 显示 |PF| = e·|PD|。',
  },
};
