import { sweep, type CurveDef } from '../types';

export const conicCurves: CurveDef[] = [
  {
    slug: 'parabola',
    category: 'conic',
    name: { en: 'Parabola', zh: '抛物线' },
    short: {
      en: 'The set of points equidistant from a focus and a directrix — the shape of projectile paths and satellite dishes.',
      zh: '到焦点与准线距离相等的点的轨迹——抛体轨迹与卫星天线的形状。',
    },
    equations: ['y = \\frac{x^2}{4p}', 'x^2 = 4py'],
    params: [
      {
        key: 'p',
        label: { en: 'p (focal distance)', zh: 'p(焦距)' },
        min: 0.3,
        max: 2,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ p }) => [
      sweep(-4, 4, 600, (x) => [x, (x * x) / (4 * p)]),
    ],
    intro: {
      en: [
        'The parabola is the locus of points equidistant from a fixed point (the focus) and a fixed line (the directrix). It is also the conic section cut by a plane parallel to the cone’s slant side. Menaechmus studied it around 350 BC while attacking the cube-doubling problem; Apollonius gave it its name.',
        'Two properties make it ubiquitous. Galileo showed that projectiles under uniform gravity follow parabolas. And its reflective property — rays from the focus emerge parallel to the axis, and incoming parallel rays converge to the focus — puts a parabola inside every satellite dish, car headlight, and radio telescope.',
      ],
      zh: [
        '抛物线是到定点(焦点)与定直线(准线)距离相等的点的轨迹,也是平面平行于圆锥母线截出的圆锥曲线。Menaechmus 约在公元前 350 年研究倍立方问题时研究了它;阿波罗尼奥斯给了它现在的名字。',
        '两条性质让它无处不在。伽利略证明匀强重力下的抛体沿抛物线运动;而它的反射性质——从焦点发出的光线经反射后平行于对称轴射出,入射的平行光则汇聚于焦点——把抛物线放进了每一面卫星天线、车灯和射电望远镜。',
      ],
    },
    properties: {
      en: [
        'Focus at (0, p) and directrix y = −p for x² = 4py.',
        'All parabolas are geometrically similar — they differ only by scale.',
        'Reflective property: focal rays exit parallel to the axis.',
        'The latus rectum (chord through the focus, parallel to the directrix) has length 4p.',
        'Eccentricity is exactly 1 — the boundary between ellipses and hyperbolas.',
      ],
      zh: [
        '对 x² = 4py,焦点为 (0, p),准线为 y = −p。',
        '所有抛物线彼此几何相似——只差一个缩放比例。',
        '反射性质:过焦点的光线反射后平行于对称轴。',
        '通径(过焦点且平行于准线的弦)长为 4p。',
        '离心率恰为 1——椭圆与双曲线之间的分界。',
      ],
    },
    seenIn: {
      en: 'Projectile motion, satellite dishes, headlight reflectors, suspension-free arch bridges, and quadratic functions everywhere.',
      zh: '抛体运动、卫星天线、车灯反射面、拱桥剖面,以及所有二次函数图像。',
    },
    prompt: {
      en: 'Animate the parabola x² = 4py: mark the focus and directrix, pick three points and show their two defining distances are equal, then reflect a family of vertical rays off the curve and watch them converge at the focus.',
      zh: '演示抛物线 x² = 4py:标出焦点与准线,取三个点展示"到焦点与到准线的距离相等";再让一组竖直光线在曲线上反射,观察它们汇聚于焦点。',
    },
    related: ['ellipse', 'hyperbola', 'catenary', 'sine-wave'],
  },
  {
    slug: 'ellipse',
    category: 'conic',
    name: { en: 'Ellipse', zh: '椭圆' },
    short: {
      en: 'The locus with a constant sum of distances to two foci — the true shape of planetary orbits.',
      zh: '到两焦点距离之和恒定的点的轨迹——行星轨道的真实形状。',
    },
    equations: [
      '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1',
      'x = a\\cos t, \\quad y = b\\sin t',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (semi-major axis)', zh: 'a(长半轴)' },
        min: 0.6,
        max: 2,
        step: 0.05,
        defaultValue: 1.6,
      },
      {
        key: 'b',
        label: { en: 'b (semi-minor axis)', zh: 'b(短半轴)' },
        min: 0.4,
        max: 2,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a, b }) => [
      sweep(0, 2 * Math.PI, 600, (t) => [a * Math.cos(t), b * Math.sin(t)]),
    ],
    intro: {
      en: [
        'The ellipse is the set of points whose distances to two foci add to a constant 2a — the geometry behind the pins-and-string drawing method. Squash a circle by a uniform factor along one axis and you get an ellipse; that is exactly what the parametrization x = a·cos t, y = b·sin t says.',
        'Kepler’s first law of 1609 made the ellipse the most important curve in the sky: every planet orbits the Sun along an ellipse with the Sun at one focus. Its reflective property — a signal leaving one focus arrives at the other — powers whispering galleries and the shock-wave lithotripters used to break kidney stones.',
      ],
      zh: [
        '椭圆是到两个焦点距离之和恒为 2a 的点的集合——"两钉一线"画椭圆的方法正源于此。把圆沿一个方向均匀压扁就得到椭圆,参数方程 x = a·cos t、y = b·sin t 说的就是这件事。',
        '开普勒 1609 年的第一定律让椭圆成为天空中最重要的曲线:每颗行星都沿椭圆绕太阳运行,太阳位于其中一个焦点。它的反射性质——从一个焦点发出的信号会聚到另一个焦点——造就了回音廊,也用于击碎肾结石的体外冲击波碎石机。',
      ],
    },
    properties: {
      en: [
        'Foci at (±c, 0) with c² = a² − b²; eccentricity e = c/a < 1.',
        'Area is exactly πab; the perimeter has no elementary closed form (Ramanujan’s approximation is the standard workaround).',
        'Sum of focal distances is constant: r₁ + r₂ = 2a.',
        'Reflective property: one focus maps to the other.',
        'A circle is the special case a = b (e = 0).',
      ],
      zh: [
        '焦点位于 (±c, 0),其中 c² = a² − b²;离心率 e = c/a < 1。',
        '面积恰为 πab;周长没有初等闭式,通常用拉马努金近似公式。',
        '到两焦点的距离之和恒定:r₁ + r₂ = 2a。',
        '反射性质:从一个焦点出发必到达另一个焦点。',
        'a = b(e = 0)的特例是圆。',
      ],
    },
    seenIn: {
      en: 'Planetary and satellite orbits, whispering galleries, medical lithotripsy, and elliptical gears and cams.',
      zh: '行星与卫星轨道、回音廊、体外碎石术,以及椭圆齿轮与凸轮。',
    },
    prompt: {
      en: 'Animate an ellipse with a = 1.6, b = 1: draw it with the pins-and-string construction from the two foci, keep the string length 2a visible as the point moves, then send a ray from one focus and reflect it to the other.',
      zh: '演示椭圆 a = 1.6、b = 1:用"两钉一线"法从两个焦点作图,动点移动时保持总长 2a 的细线可见;再从一个焦点发出光线,反射后到达另一个焦点。',
    },
    related: ['hyperbola', 'parabola', 'superellipse', 'lissajous-curve'],
  },
  {
    slug: 'hyperbola',
    category: 'conic',
    name: { en: 'Hyperbola', zh: '双曲线' },
    short: {
      en: 'The two-branched conic with a constant difference of focal distances, hugging its asymptotes forever.',
      zh: '到两焦点距离之差恒定的双支圆锥曲线,永远贴近它的渐近线。',
    },
    equations: [
      '\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1',
      'y = \\pm\\frac{b}{a}x \\;\\; (\\text{asymptotes})',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (vertex distance)', zh: 'a(顶点距)' },
        min: 0.4,
        max: 1.4,
        step: 0.05,
        defaultValue: 0.8,
      },
      {
        key: 'b',
        label: { en: 'b (asymptote slope ×a)', zh: 'b(渐近线斜率 ×a)' },
        min: 0.4,
        max: 1.4,
        step: 0.05,
        defaultValue: 0.7,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a, b }) => {
      const branch = (sign: number) =>
        sweep(-1.6, 1.6, 400, (u) => [
          sign * a * Math.cosh(u),
          b * Math.sinh(u),
        ]);
      return [branch(1), branch(-1)];
    },
    intro: {
      en: [
        'The hyperbola is the conic with eccentricity greater than 1: the set of points whose focal distances differ by a constant 2a. Unlike the ellipse it splits into two branches, and unlike any other conic it comes with a pair of built-in guide lines — the asymptotes y = ±(b/a)x that the branches approach but never touch.',
        'Constant difference of distances is exactly what a time difference of arrival measures, which made hyperbolas the mathematics of LORAN radio navigation before GPS. The same curve appears as y = 1/x in disguise (a rotated rectangular hyperbola), as the shadow of a sundial tip through a day, and as the profile of power-plant cooling towers.',
      ],
      zh: [
        '双曲线是离心率大于 1 的圆锥曲线:到两焦点距离之差恒为 2a 的点的集合。与椭圆不同,它分成两支;与其他圆锥曲线不同,它自带一对参考线——渐近线 y = ±(b/a)x,曲线无限逼近却永不触碰。',
        '"距离差恒定"正是信号到达时间差所测量的量,因此在 GPS 之前,双曲线是 LORAN 无线电导航的数学基础。同一条曲线还以多种面目出现:y = 1/x 是旋转后的等轴双曲线,日晷针尖影子一天扫过的轨迹是双曲线,电厂冷却塔的侧影也是双曲线。',
      ],
    },
    properties: {
      en: [
        'Foci at (±c, 0) with c² = a² + b²; eccentricity e = c/a > 1.',
        'Difference of focal distances is constant: |r₁ − r₂| = 2a.',
        'Asymptotes y = ±(b/a)x; a = b gives the rectangular hyperbola (y = 1/x rotated 45°).',
        'Reflective property: rays aimed at one focus reflect toward the other.',
        'Conjugate hyperbola swaps the roles of the two axes.',
      ],
      zh: [
        '焦点位于 (±c, 0),其中 c² = a² + b²;离心率 e = c/a > 1。',
        '到两焦点距离之差恒定:|r₁ − r₂| = 2a。',
        '渐近线为 y = ±(b/a)x;a = b 时为等轴双曲线(y = 1/x 旋转 45°)。',
        '反射性质:射向一个焦点的光线反射后指向另一个焦点。',
        '共轭双曲线交换两条轴的角色。',
      ],
    },
    seenIn: {
      en: 'Radio navigation (LORAN), cooling tower silhouettes, sundial shadow paths, gravitational slingshot trajectories, and y = 1/x.',
      zh: '无线电导航(LORAN)、冷却塔轮廓、日晷影子轨迹、引力弹弓轨道,以及反比例函数 y = 1/x。',
    },
    prompt: {
      en: 'Animate the hyperbola x²/0.64 − y²/0.49 = 1: draw both branches with their asymptotes dashed, pick a moving point and display |r₁ − r₂| staying constant at 2a, then zoom out to show the branches hugging the asymptotes.',
      zh: '演示双曲线 x²/0.64 − y²/0.49 = 1:画出两支与虚线渐近线,取一动点实时显示 |r₁ − r₂| 恒等于 2a;再缩小视角,展示两支曲线越来越贴近渐近线。',
    },
    related: ['ellipse', 'parabola', 'lemniscate-of-bernoulli', 'tractrix'],
  },
];
