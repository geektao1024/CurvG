import { sweep, TAU, type CurveDef } from '../types';

export const parametricCurves: CurveDef[] = [
  {
    slug: 'lissajous-curve',
    category: 'parametric',
    name: { en: 'Lissajous Curve', zh: '利萨如曲线' },
    short: {
      en: 'The figure drawn by two perpendicular oscillations x = sin(at + δ), y = sin(bt) — the oscilloscope’s signature art.',
      zh: '两个相互垂直的振动 x = sin(at + δ)、y = sin(bt) 合成的图形——示波器上的招牌图案。',
    },
    equations: ['x = \\sin(at + \\delta)', 'y = \\sin(bt)'],
    params: [
      {
        key: 'a',
        label: { en: 'a (x frequency)', zh: 'a(x 方向频率)' },
        min: 1,
        max: 9,
        step: 1,
        defaultValue: 3,
      },
      {
        key: 'b',
        label: { en: 'b (y frequency)', zh: 'b(y 方向频率)' },
        min: 1,
        max: 9,
        step: 1,
        defaultValue: 2,
      },
      {
        key: 'delta',
        label: { en: 'δ (phase)', zh: 'δ(相位差)' },
        min: 0,
        max: 3.14,
        step: 0.01,
        defaultValue: 1.57,
      },
    ],
    fitMode: 'refit',
    sample: ({ a, b, delta }) => [
      sweep(0, TAU, 1000, (t) => [
        Math.sin(a * t + delta),
        Math.sin(b * t),
      ]),
    ],
    intro: {
      en: [
        'Feed one sine wave to the x-axis and another to the y-axis, and the point traces a Lissajous curve. Nathaniel Bowditch drew the first ones with a pendulum in 1815; Jules Antoine Lissajous produced them optically in 1857 by bouncing light off mirrors attached to two tuning forks, turning invisible frequency ratios into visible geometry.',
        'The curve is a frequency detector you can read by eye: it closes only when a : b is rational, and counting the lobes along each edge reveals the ratio. The phase δ then rotates the figure’s character — with a = b it morphs a diagonal line through ellipses into a circle. This is why analog engineers used oscilloscope Lissajous figures to tune one signal against a reference.',
      ],
      zh: [
        '把一路正弦信号接到 x 轴、另一路接到 y 轴,光点画出的就是利萨如曲线。Bowditch 在 1815 年用摆最早画出它;1857 年,Lissajous 把光反射到装在两支音叉上的镜子上,用光学方法生成图形,让看不见的频率之比变成看得见的几何。',
        '这条曲线是一台"肉眼频率计":只有当 a : b 为有理数时才闭合,数一数图形贴着两条边的瓣数,就能读出频率比。相位差 δ 决定图形的姿态——当 a = b 时,它从对角直线经一系列椭圆演变为圆。模拟时代的工程师正是靠示波器上的利萨如图形来校准信号频率。',
      ],
    },
    properties: {
      en: [
        'Closed curve ⟺ the frequency ratio a : b is rational.',
        'Lobe counts along the two edges are in the ratio b : a.',
        'a = b: a line (δ = 0), ellipses, then a circle (δ = π/2, equal amplitudes).',
        'The curve always fits in the square [−1, 1] × [−1, 1], touching each edge.',
        'The 3 : 1 Lissajous figure is the logo of the Australian Broadcasting Corporation.',
      ],
      zh: [
        '曲线闭合 ⟺ 频率比 a : b 为有理数。',
        '沿两条边的瓣数之比为 b : a。',
        'a = b 时:δ = 0 是直线,随 δ 变为椭圆,δ = π/2 且等幅时是圆。',
        '曲线始终内切于正方形 [−1, 1] × [−1, 1]。',
        '3 : 1 的利萨如图形是澳大利亚广播公司(ABC)的台标。',
      ],
    },
    seenIn: {
      en: 'Oscilloscope phase measurement, laser light shows, harmonographs, and broadcast logos.',
      zh: '示波器相位测量、激光表演、谐振记录仪,以及广播机构的台标。',
    },
    prompt: {
      en: 'Animate the Lissajous curve x = sin(3t + π/2), y = sin(2t): show the two component oscillations on the edges of a square, trace the curve as t sweeps one period, and count the lobes to read off the 3 : 2 frequency ratio.',
      zh: '演示利萨如曲线 x = sin(3t + π/2)、y = sin(2t):在正方形两条边上展示两路分量振动,让 t 扫过一个周期描出曲线,并通过数瓣读出 3 : 2 的频率比。',
    },
    related: ['rose-curve', 'sine-wave', 'hypotrochoid', 'ellipse'],
  },
  {
    slug: 'superellipse',
    category: 'parametric',
    name: { en: 'Superellipse', zh: '超椭圆' },
    short: {
      en: 'The Lamé curve |x/a|ⁿ + |y/b|ⁿ = 1 that interpolates between ellipse and rectangle — the geometry of the squircle.',
      zh: 'Lamé 曲线 |x/a|ⁿ + |y/b|ⁿ = 1,在椭圆与矩形之间连续过渡——"方圆形"的几何。',
    },
    equations: [
      '\\left|\\frac{x}{a}\\right|^n + \\left|\\frac{y}{b}\\right|^n = 1',
    ],
    params: [
      {
        key: 'n',
        label: { en: 'n (exponent)', zh: 'n(指数)' },
        min: 0.6,
        max: 6,
        step: 0.1,
        defaultValue: 4,
      },
      {
        key: 'a',
        label: { en: 'a (half-width)', zh: 'a(半宽)' },
        min: 0.7,
        max: 1.4,
        step: 0.05,
        defaultValue: 1.25,
      },
    ],
    fitMode: 'fixed',
    sample: ({ n, a }) => {
      const e = 2 / n;
      const shape = (t: number): [number, number] => {
        const c = Math.cos(t);
        const s = Math.sin(t);
        return [
          a * Math.sign(c) * Math.abs(c) ** e,
          Math.sign(s) * Math.abs(s) ** e,
        ];
      };
      return [sweep(0, TAU, 800, shape)];
    },
    intro: {
      en: [
        'Gabriel Lamé generalized the ellipse in 1818 by freeing the exponent: |x/a|ⁿ + |y/b|ⁿ = 1. At n = 2 it is the ordinary ellipse; as n grows the sides flatten toward a rectangle; below n = 1 the sides cave inward, reaching a four-pointed star (the astroid, for a = b) at n = 2/3.',
        'Danish designer Piet Hein made n = 2.5 famous in 1959 when he used it to shape Sergels Torg, a traffic roundabout in central Stockholm, arguing it blended the mechanical rectangle with the organic ellipse. The “squircle” near n = 4 now outlines tabletops, stadiums, and the rounded icons on your phone.',
      ],
      zh: [
        'Lamé 在 1818 年解放了椭圆方程的指数,得到 |x/a|ⁿ + |y/b|ⁿ = 1。n = 2 是普通椭圆;n 增大时,边越来越平,逼近矩形;n 小于 1 时,边向内凹陷,到 n = 2/3(且 a = b)时成为四角星——星形线。',
        '丹麦设计师 Piet Hein 在 1959 年让 n = 2.5 名声大噪:他用它设计了斯德哥尔摩市中心的 Sergels Torg 环岛,理由是它调和了机械的矩形与有机的椭圆。n ≈ 4 附近的"方圆形"(squircle)如今勾勒着桌面、体育场,以及你手机上的圆角图标。',
      ],
    },
    properties: {
      en: [
        'n = 2: ellipse; n = 1: rhombus; n → ∞: rectangle; n = 2/3 with a = b: astroid.',
        'Parametrization: x = a·sgn(cos t)|cos t|^{2/n}, y = b·sgn(sin t)|sin t|^{2/n}.',
        'Enclosed area involves the Gamma function: 4ab·Γ(1+1/n)²/Γ(1+2/n).',
        'Always symmetric about both axes and convex for n ≥ 1.',
        'Piet Hein’s superegg — a revolved superellipse — balances stably on its end.',
      ],
      zh: [
        'n = 2:椭圆;n = 1:菱形;n → ∞:矩形;n = 2/3 且 a = b:星形线。',
        '参数化:x = a·sgn(cos t)|cos t|^{2/n},y = b·sgn(sin t)|sin t|^{2/n}。',
        '面积涉及 Γ 函数:4ab·Γ(1+1/n)²/Γ(1+2/n)。',
        '关于两条坐标轴对称;n ≥ 1 时是凸的。',
        'Piet Hein 的"超级蛋"——超椭圆的旋转体——能稳稳立在端点上。',
      ],
    },
    seenIn: {
      en: 'App icon outlines, Sergels Torg in Stockholm, stadium and table design, and font glyph engineering.',
      zh: '手机应用图标轮廓、斯德哥尔摩 Sergels Torg 环岛、体育场与桌面设计,以及字体字形工程。',
    },
    prompt: {
      en: 'Animate the superellipse |x/1.25|ⁿ + |y|ⁿ = 1 as n sweeps from 0.7 to 6: hold the bounding box fixed, morph the shape through astroid-like, rhombus, ellipse, squircle, and near-rectangle stages, labeling n at each landmark.',
      zh: '演示超椭圆 |x/1.25|ⁿ + |y|ⁿ = 1 随 n 从 0.7 变到 6 的过程:外接框保持不动,形状依次经过类星形、菱形、椭圆、方圆形、近矩形几个阶段,并在每个关键点标注 n 值。',
    },
    related: ['ellipse', 'astroid', 'heart-curve'],
  },
  {
    slug: 'butterfly-curve',
    category: 'parametric',
    name: { en: 'Butterfly Curve', zh: '蝴蝶曲线' },
    short: {
      en: 'Temple Fay’s 1989 transcendental curve whose sine and exponential terms flutter into a butterfly.',
      zh: 'Temple Fay 1989 年的超越曲线,指数与正弦项交织出一只蝴蝶。',
    },
    equations: [
      'x = \\sin t\\left(e^{\\cos t} - 2\\cos 4t - \\sin^5\\tfrac{t}{12}\\right)',
      'y = \\cos t\\left(e^{\\cos t} - 2\\cos 4t - \\sin^5\\tfrac{t}{12}\\right)',
    ],
    params: [
      {
        key: 'winds',
        label: { en: 'drawn range (×π)', zh: '绘制范围(×π)' },
        min: 2,
        max: 24,
        step: 1,
        defaultValue: 24,
      },
    ],
    fitMode: 'fixed',
    sample: ({ winds }) => [
      sweep(0, winds * Math.PI, 1600, (t) => {
        const e =
          Math.exp(Math.cos(t)) -
          2 * Math.cos(4 * t) -
          Math.sin(t / 12) ** 5;
        return [Math.sin(t) * e, Math.cos(t) * e];
      }),
    ],
    intro: {
      en: [
        'The butterfly curve was published by Temple H. Fay in 1989 as a showcase of how rich a single polar-style formula can be. The radius e^{cos t} − 2cos 4t − sin⁵(t/12) mixes three rhythms: a slow exponential breathing, a four-fold wing beat from cos 4t, and a very slow sin⁵(t/12) drift with period 24π that keeps each pass slightly different.',
        'Because of that slow drift, the curve does not repeat until t has swept 24π — twelve full turns — layering wing inside wing. It has become a standard test piece for plotting software and a favorite “wow” example in parametric-equation lessons.',
      ],
      zh: [
        '蝴蝶曲线由 Temple H. Fay 于 1989 年发表,展示了单个极坐标式公式能有多丰富。半径项 e^{cos t} − 2cos 4t − sin⁵(t/12) 混合了三种节奏:指数项缓慢的呼吸、cos 4t 的四重翅拍,以及周期长达 24π 的 sin⁵(t/12) 慢漂移——它让每一圈都与上一圈略有不同。',
        '正因为这个慢漂移,曲线要等 t 扫过 24π(整整十二圈)才重复,翅膀里叠着翅膀。它已成为绘图软件的标准测试图案,也是参数方程课程里最受欢迎的"惊叹号"示例。',
      ],
    },
    properties: {
      en: [
        'Transcendental (not algebraic): the exponential term rules out any polynomial equation.',
        'Full period is 24π, set by the sin⁵(t/12) term.',
        'Symmetric about the y-axis (swapping t → −t mirrors x).',
        'Radius stays within e + 3 of the origin, bounding the wingspan.',
        'A polar variant r = e^{sin θ} − 2cos 4θ + sin⁵((2θ − π)/24) draws a cousin butterfly.',
      ],
      zh: [
        '超越曲线(非代数):指数项排除了任何多项式方程。',
        '完整周期为 24π,由 sin⁵(t/12) 项决定。',
        '关于 y 轴对称(t → −t 使 x 变号)。',
        '半径不超过 e + 3,给出翼展的上界。',
        '极坐标变体 r = e^{sin θ} − 2cos 4θ + sin⁵((2θ − π)/24) 画出一只近亲蝴蝶。',
      ],
    },
    seenIn: {
      en: 'Plotting-software demos, parametric equation showpieces, generative art, and laser projection tests.',
      zh: '绘图软件演示、参数方程教学示例、生成艺术,以及激光投影测试。',
    },
    prompt: {
      en: 'Animate the butterfly curve: trace the path continuously as t runs from 0 to 24π, letting earlier passes stay faintly visible so the layered wings build up, and end with the completed butterfly centered on screen.',
      zh: '演示蝴蝶曲线:让 t 从 0 连续跑到 24π,已画过的圈保留淡淡的痕迹,层层翅膀逐渐叠出,最后以完整的蝴蝶居中收尾。',
    },
    related: ['rose-curve', 'heart-curve', 'lissajous-curve'],
  },
  {
    slug: 'heart-curve',
    category: 'parametric',
    name: { en: 'Heart Curve', zh: '爱心曲线' },
    short: {
      en: 'The parametric valentine x = 16sin³t with a four-term cosine partner — mathematics’ most shared curve.',
      zh: '参数化的爱心 x = 16sin³t 配四项余弦——数学里被分享最多的曲线。',
    },
    equations: [
      'x = 16\\sin^3 t',
      'y = 13\\cos t - 5\\cos 2t - 2\\cos 3t - \\cos 4t',
    ],
    params: [
      {
        key: 's',
        label: { en: 'scale', zh: '缩放' },
        min: 0.7,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ s }) => [
      sweep(0, TAU, 700, (t) => [
        s * 16 * Math.sin(t) ** 3,
        s *
          (13 * Math.cos(t) -
            5 * Math.cos(2 * t) -
            2 * Math.cos(3 * t) -
            Math.cos(4 * t)),
      ]),
    ],
    intro: {
      en: [
        'The most popular “heart curve” is the parametric pair x = 16sin³t, y = 13cos t − 5cos 2t − 2cos 3t − cos 4t. The cubed sine flattens the sides into lobes, while the four cosine harmonics sculpt the top notch and the bottom point — a tiny, hand-tuned Fourier series that happens to spell affection.',
        'It is far from the only heart in mathematics: the implicit sextic (x² + y² − 1)³ = x²y³ draws one, and the cardioid is its polar cousin. But this version, popularized by graphing calculators and search-engine easter eggs, is the one most people have actually plotted — and a perfect first exercise in reading parametric equations term by term.',
      ],
      zh: [
        '流传最广的"爱心曲线"是参数对 x = 16sin³t、y = 13cos t − 5cos 2t − 2cos 3t − cos 4t。三次方的正弦把两侧压成圆瓣,四个余弦谐波雕出顶部的凹口和底部的尖点——一小段手工调参的傅里叶级数,恰好拼出爱意。',
        '数学里的"心"远不止这一颗:隐式六次曲线 (x² + y² − 1)³ = x²y³ 也画得出爱心,心脏线则是它的极坐标近亲。但经图形计算器与搜索引擎彩蛋普及的正是这一版——也是"逐项读懂参数方程"的完美入门练习。',
      ],
    },
    properties: {
      en: [
        'Symmetric about the y-axis; the bottom point sits at (0, −17), the top notch at (0, 5).',
        'Width 32 (from x = ±16 at t = ±π/2) and height 22 before scaling.',
        'The y-series is a four-harmonic cosine sum — a hand-crafted Fourier sketch.',
        'The implicit heart (x² + y² − 1)³ = x²y³ is an algebraic alternative of degree six.',
        'Related: the cardioid gets its name from the same Greek word for heart.',
      ],
      zh: [
        '关于 y 轴对称;底部尖点在 (0, −17),顶部凹口在 (0, 5)。',
        '缩放前宽 32(t = ±π/2 时 x = ±16)、高 22。',
        'y 分量是四个余弦谐波之和——一段手工绘制的傅里叶素描。',
        '隐式爱心 (x² + y² − 1)³ = x²y³ 是六次代数曲线版本。',
        '相关:心脏线(cardioid)的名字来自同一个表示"心"的希腊词根。',
      ],
    },
    seenIn: {
      en: 'Graphing calculator art, search-engine plotting easter eggs, Valentine’s coding demos, and parametric-equations lessons.',
      zh: '图形计算器艺术、搜索引擎绘图彩蛋、情人节编程演示,以及参数方程课堂。',
    },
    prompt: {
      en: 'Animate the heart curve x = 16sin³t, y = 13cos t − 5cos 2t − 2cos 3t − cos 4t: build the y-coordinate one cosine harmonic at a time to show how each term shapes the notch and point, then trace the finished heart.',
      zh: '演示爱心曲线 x = 16sin³t、y = 13cos t − 5cos 2t − 2cos 3t − cos 4t:把 y 分量按余弦谐波一项一项叠加,展示每一项如何塑造凹口与尖点,最后完整描出爱心。',
    },
    related: ['cardioid', 'butterfly-curve', 'superellipse'],
  },
];
