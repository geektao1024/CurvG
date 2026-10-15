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
        label: { en: 'a (x frequency)', zh: 'a（x 方向频率）' },
        min: 1,
        max: 9,
        step: 1,
        defaultValue: 3,
      },
      {
        key: 'b',
        label: { en: 'b (y frequency)', zh: 'b（y 方向频率）' },
        min: 1,
        max: 9,
        step: 1,
        defaultValue: 2,
      },
      {
        key: 'delta',
        label: { en: 'δ (phase)', zh: 'δ（相位差）' },
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
        '把一路正弦信号接到 x 轴、另一路接到 y 轴，光点画出的就是利萨如曲线。Bowditch 在 1815 年用摆最早画出它；1857 年，Lissajous 把光反射到装在两支音叉上的镜子上，用光学方法生成图形，让看不见的频率之比变成看得见的几何。',
        '这条曲线是一台"肉眼频率计"：只有当 a:b 为有理数时才闭合，数一数图形贴着两条边的瓣数，就能读出频率比。相位差 δ 决定图形的姿态——当 a = b 时，它从对角直线经一系列椭圆演变为圆。模拟时代的工程师正是靠示波器上的利萨如图形来校准信号频率。',
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
        '曲线闭合 ⟺ 频率比 a:b 为有理数。',
        '沿两条边的瓣数之比为 b:a。',
        'a = b 时：δ = 0 是直线，随 δ 变为椭圆，δ = π/2 且等幅时是圆。',
        '曲线始终内切于正方形 [−1, 1] × [−1, 1]。',
        '3:1 的利萨如图形是澳大利亚广播公司（ABC）的台标。',
      ],
    },
    seenIn: {
      en: 'Oscilloscope phase measurement, laser light shows, harmonographs, and broadcast logos.',
      zh: '示波器相位测量、激光表演、谐振记录仪，以及广播机构的台标。',
    },
    prompt: {
      en: 'Animate the Lissajous curve x = sin(3t + π/2), y = sin(2t): show the two component oscillations on the edges of a square, trace the curve as t sweeps one period, and count the lobes to read off the 3 : 2 frequency ratio.',
      zh: '演示利萨如曲线 x = sin(3t + π/2)、y = sin(2t)：在正方形两条边上展示两路分量振动，让 t 扫过一个周期描出曲线，并通过数瓣读出 3:2 的频率比。',
    },
    related: ['rose-curve', 'sine-wave', 'hypotrochoid', 'lemniscate-of-gerono'],
  },
  {
    slug: 'superellipse',
    category: 'parametric',
    name: { en: 'Superellipse', zh: '超椭圆' },
    short: {
      en: 'The Lamé curve |x/a|ⁿ + |y/b|ⁿ = 1 that interpolates between ellipse and rectangle — the geometry of the squircle.',
      zh: 'Lamé 曲线 |x/a|ⁿ + |y/b|ⁿ = 1，在椭圆与矩形之间连续过渡——"方圆形"的几何。',
    },
    equations: [
      '\\left|\\frac{x}{a}\\right|^n + \\left|\\frac{y}{b}\\right|^n = 1',
    ],
    params: [
      {
        key: 'n',
        label: { en: 'n (exponent)', zh: 'n（指数）' },
        min: 0.6,
        max: 6,
        step: 0.1,
        defaultValue: 4,
      },
      {
        key: 'a',
        label: { en: 'a (half-width)', zh: 'a（半宽）' },
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
        'Lamé 在 1818 年解放了椭圆方程的指数，得到 |x/a|ⁿ + |y/b|ⁿ = 1。n = 2 是普通椭圆；n 增大时，边越来越平，逼近矩形；n 小于 1 时，边向内凹陷，到 n = 2/3（且 a = b）时成为四角星——星形线。',
        '丹麦设计师 Piet Hein 在 1959 年让 n = 2.5 名声大噪：他用它设计了斯德哥尔摩市中心的 Sergels Torg 环岛，理由是它调和了机械的矩形与有机的椭圆。n ≈ 4 附近的"方圆形"(squircle)如今勾勒着桌面、体育场，以及你手机上的圆角图标。',
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
        'n = 2:椭圆；n = 1:菱形；n → ∞：矩形；n = 2/3 且 a = b：星形线。',
        '参数化：x = a·sgn(cos t)|cos t|^{2/n}，y = b·sgn(sin t)|sin t|^{2/n}。',
        '面积涉及 Γ 函数:4ab·Γ(1+1/n)²/Γ(1+2/n)。',
        '关于两条坐标轴对称；n ≥ 1 时是凸的。',
        'Piet Hein 的"超级蛋"——超椭圆的旋转体——能稳稳立在端点上。',
      ],
    },
    seenIn: {
      en: 'App icon outlines, Sergels Torg in Stockholm, stadium and table design, and font glyph engineering.',
      zh: '手机应用图标轮廓、斯德哥尔摩 Sergels Torg 环岛、体育场与桌面设计，以及字体字形工程。',
    },
    prompt: {
      en: 'Animate the superellipse |x/1.25|ⁿ + |y|ⁿ = 1 as n sweeps from 0.7 to 6: hold the bounding box fixed, morph the shape through astroid-like, rhombus, ellipse, squircle, and near-rectangle stages, labeling n at each landmark.',
      zh: '演示超椭圆 |x/1.25|ⁿ + |y|ⁿ = 1 随 n 从 0.7 变到 6 的过程：外接框保持不动，形状依次经过类星形、菱形、椭圆、方圆形、近矩形几个阶段，并在每个关键点标注 n 值。',
    },
    related: ['ellipse', 'astroid', 'heart-curve', 'superformula'],
  },
  {
    slug: 'butterfly-curve',
    category: 'parametric',
    name: { en: 'Butterfly Curve', zh: '蝴蝶曲线' },
    short: {
      en: 'Temple Fay’s 1989 transcendental curve whose sine and exponential terms flutter into a butterfly.',
      zh: 'Temple Fay 1989 年的超越曲线，指数与正弦项交织出一只蝴蝶。',
    },
    equations: [
      'x = \\sin t\\left(e^{\\cos t} - 2\\cos 4t - \\sin^5\\tfrac{t}{12}\\right)',
      'y = \\cos t\\left(e^{\\cos t} - 2\\cos 4t - \\sin^5\\tfrac{t}{12}\\right)',
    ],
    params: [
      {
        key: 'winds',
        label: { en: 'drawn range (×π)', zh: '绘制范围（×π）' },
        min: 2,
        max: 24,
        step: 1,
        defaultValue: 24,
      },
    ],
    fitMode: 'fixed',
    sample: ({ winds }) => [
      // 24π of fast wing beats: ~80 samples per radian keeps the corners smooth.
      sweep(0, winds * Math.PI, Math.max(800, Math.round(winds * Math.PI * 80)), (t) => {
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
        '蝴蝶曲线由 Temple H. Fay 于 1989 年发表，展示了单个极坐标式公式能有多丰富。半径项 e^{cos t} − 2cos 4t − sin⁵(t/12) 混合了三种节奏：指数项缓慢的呼吸、cos 4t 的四重翅拍，以及周期长达 24π 的 sin⁵(t/12) 慢漂移——它让每一圈都与上一圈略有不同。',
        '正因为这个慢漂移，曲线要等 t 扫过 24π（整整十二圈）才重复，翅膀里叠着翅膀。它已成为绘图软件的标准测试图案，也是参数方程课程里最受欢迎的"惊叹号"示例。',
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
        '超越曲线（非代数）：指数项排除了任何多项式方程。',
        '完整周期为 24π，由 sin⁵(t/12) 项决定。',
        '关于 y 轴对称（t → −t 使 x 变号）。',
        '半径不超过 e + 3，给出翼展的上界。',
        '极坐标变体 r = e^{sin θ} − 2cos 4θ + sin⁵((2θ − π)/24) 画出一只近亲蝴蝶。',
      ],
    },
    seenIn: {
      en: 'Plotting-software demos, parametric equation showpieces, generative art, and laser projection tests.',
      zh: '绘图软件演示、参数方程教学示例、生成艺术，以及激光投影测试。',
    },
    prompt: {
      en: 'Animate the butterfly curve: trace the path continuously as t runs from 0 to 24π, letting earlier passes stay faintly visible so the layered wings build up, and end with the completed butterfly centered on screen.',
      zh: '演示蝴蝶曲线：让 t 从 0 连续跑到 24π，已画过的圈保留淡淡的痕迹，层层翅膀逐渐叠出，最后以完整的蝴蝶居中收尾。',
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
        '流传最广的"爱心曲线"是参数对 x = 16sin³t、y = 13cos t − 5cos 2t − 2cos 3t − cos 4t。三次方的正弦把两侧压成圆瓣，四个余弦谐波雕出顶部的凹口和底部的尖点——一小段手工调参的傅里叶级数，恰好拼出爱意。',
        '数学里的"心"远不止这一颗：隐式六次曲线 (x² + y² − 1)³ = x²y³ 也画得出爱心，心脏线则是它的极坐标近亲。但经图形计算器与搜索引擎彩蛋普及的正是这一版——也是"逐项读懂参数方程"的完美入门练习。',
      ],
    },
    properties: {
      en: [
        'Symmetric about the y-axis; the bottom point sits at (0, −17), the top notch at (0, 5).',
        'Before scaling: width 32 (x = ±16 at t = ±π/2), 22 from the notch to the tip, and about 28.9 in full height (the lobes peak at y ≈ 11.92).',
        'The y-series is a four-harmonic cosine sum — a hand-crafted Fourier sketch.',
        'The implicit heart (x² + y² − 1)³ = x²y³ is an algebraic alternative of degree six.',
        'Related: the cardioid gets its name from the same Greek word for heart.',
      ],
      zh: [
        '关于 y 轴对称；底部尖点在 (0, −17)，顶部凹口在 (0, 5)。',
        '缩放前：宽 32（t = ±π/2 时 x = ±16），凹口到底尖 22，整体高约 28.9（两瓣顶部在 y ≈ 11.92）。',
        'y 分量是四个余弦谐波之和——一段手工绘制的傅里叶素描。',
        '隐式爱心 (x² + y² − 1)³ = x²y³ 是六次代数曲线版本。',
        '相关：心脏线（cardioid）的名字来自同一个表示"心"的希腊词根。',
      ],
    },
    seenIn: {
      en: 'Graphing calculator art, search-engine plotting easter eggs, Valentine’s coding demos, and parametric-equations lessons.',
      zh: '图形计算器艺术、搜索引擎绘图彩蛋、情人节编程演示，以及参数方程课堂。',
    },
    prompt: {
      en: 'Animate the heart curve x = 16sin³t, y = 13cos t − 5cos 2t − 2cos 3t − cos 4t: build the y-coordinate one cosine harmonic at a time to show how each term shapes the notch and point, then trace the finished heart.',
      zh: '演示爱心曲线 x = 16sin³t、y = 13cos t − 5cos 2t − 2cos 3t − cos 4t：把 y 分量按余弦谐波一项一项叠加，展示每一项如何塑造凹口与尖点，最后完整描出爱心。',
    },
    related: ['cardioid', 'butterfly-curve', 'superellipse'],
  },
  {
    slug: 'bezier-curve',
    category: 'parametric',
    name: { en: 'Bézier curve', zh: '贝塞尔曲线' },
    short: {
      en: 'The cubic curve behind fonts, SVG paths and CSS easing: two end points and two handles, blended by repeated linear interpolation.',
      zh: '字体、SVG 路径和 CSS 缓动背后的三次曲线：两个端点、两个控制柄，用反复的线性插值混合出来。',
    },
    equations: [
      'B(t) = (1-t)^3P_0 + 3(1-t)^2t\\,P_1 + 3(1-t)t^2P_2 + t^3P_3',
    ],
    params: [
      {
        key: 'x1',
        label: { en: 'P₁ x', zh: 'P₁ 的 x' },
        min: -0.5,
        max: 1.5,
        step: 0.05,
        defaultValue: 0.15,
      },
      {
        key: 'y1',
        label: { en: 'P₁ y', zh: 'P₁ 的 y' },
        min: -1,
        max: 1.5,
        step: 0.05,
        defaultValue: 1,
      },
      {
        key: 'x2',
        label: { en: 'P₂ x', zh: 'P₂ 的 x' },
        min: -0.5,
        max: 1.5,
        step: 0.05,
        defaultValue: 0.85,
      },
      {
        key: 'y2',
        label: { en: 'P₂ y', zh: 'P₂ 的 y' },
        min: -1,
        max: 1.5,
        step: 0.05,
        defaultValue: -0.6,
      },
    ],
    fitMode: 'fixed',
    guideLines: 1,
    sample: ({ x1, y1, x2, y2 }) => [
      // The control polygon P₀P₁P₂P₃, drawn as a faint guide.
      [
        [0, 0],
        [x1, y1],
        [x2, y2],
        [1, 0],
      ] as Array<[number, number]>,
      sweep(0, 1, 400, (t) => {
        const u = 1 - t;
        return [
          3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3,
          3 * u * u * t * y1 + 3 * u * t * t * y2,
        ];
      }),
    ],
    intro: {
      en: [
        'Paul de Casteljau at Citroën (1959) and Pierre Bézier at Renault (in the 1960s) independently found a way to describe smooth car-body curves with a handful of control points. The cubic version uses four: it starts at P₀ heading towards P₁, ends at P₃ arriving from P₂, and never leaves the convex hull of the four points.',
        'De Casteljau’s algorithm builds the point B(t) by nothing but repeated linear interpolation: split each side of the control polygon at ratio t, then split the new segments, then once more. The same arithmetic outlines the glyphs of TrueType and OpenType fonts (quadratic curves in TrueType, cubic in CFF), every curve in an SVG path, and every cubic-bezier() easing in CSS.',
      ],
      zh: [
        '雪铁龙的 Paul de Casteljau（1959）和雷诺的 Pierre Bézier（1960 年代）各自找到了用少数控制点描述光滑车身曲线的方法。三次的版本用四个点：从 P₀ 出发朝 P₁ 的方向走，到达 P₃ 时来自 P₂ 的方向，而且始终不越出这四点的凸包。',
        'de Casteljau 算法只用反复的线性插值就得到点 B(t)：把控制多边形每条边按比例 t 分开，再把新线段按 t 分开，再做一次。同样的算术勾出 TrueType 和 OpenType 字体的字形（TrueType 用二次曲线，CFF 用三次），也画出 SVG 路径里的每段曲线和 CSS 里每个 cubic-bezier() 缓动。',
      ],
    },
    properties: {
      en: [
        'Passes through P₀ and P₃; generally not through P₁ or P₂.',
        'End tangents: B′(0) = 3(P₁ − P₀), B′(1) = 3(P₃ − P₂).',
        'Lies inside the convex hull of its four control points.',
        'De Casteljau’s algorithm evaluates it by three rounds of linear interpolation.',
        'The weights (1 − t)³, 3(1 − t)²t, 3(1 − t)t², t³ are the Bernstein polynomials and sum to 1.',
      ],
      zh: [
        '经过 P₀ 和 P₃；一般不经过 P₁、P₂。',
        '端点切向：B′(0) = 3(P₁ − P₀)，B′(1) = 3(P₃ − P₂)。',
        '整条曲线位于四个控制点的凸包之内。',
        'de Casteljau 算法用三轮线性插值求出曲线上的点。',
        '权重 (1 − t)³、3(1 − t)²t、3(1 − t)t²、t³ 是伯恩斯坦多项式，和为 1。',
      ],
    },
    seenIn: {
      en: 'Font outlines, the SVG path “C” command, vector drawing tools, CSS cubic-bezier() easing and animation curves.',
      zh: '字体轮廓、SVG 路径的 "C" 命令、矢量绘图工具、CSS 的 cubic-bezier() 缓动，以及动画曲线。',
    },
    prompt: {
      en: 'Animate a cubic Bézier curve with de Casteljau’s construction: show the control polygon P₀P₁P₂P₃, then for t from 0 to 1 draw the three levels of interpolated points and segments, with the final point tracing the curve.',
      zh: '用 de Casteljau 作图演示三次贝塞尔曲线：先画控制多边形 P₀P₁P₂P₃，再让 t 从 0 走到 1，画出三层插值点和线段，最后一层的点描出曲线。',
    },
    related: ['parabola', 'superellipse', 'lissajous-curve'],
  },
  {
    slug: 'lemniscate-of-gerono',
    category: 'parametric',
    name: { en: 'Lemniscate of Gerono', zh: 'Gerono 双纽线' },
    short: {
      en: 'The figure eight x⁴ = a²(x² − y²), drawn by x = a·cos t, y = a·sin t·cos t: two lobes of total area 4a²/3.',
      zh: '8 字形曲线 x⁴ = a²(x² − y²)，由 x = a·cos t、y = a·sin t·cos t 画出：两瓣合计面积 4a²/3。',
    },
    equations: [
      'x^4 = a^2(x^2 - y^2)',
      'x = a\\cos t,\\quad y = a\\sin t\\cos t',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (half-width)', zh: 'a（半宽）' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(0, TAU, 900, (t) => [
        a * Math.cos(t),
        a * Math.sin(t) * Math.cos(t),
      ]),
    ],
    intro: {
      en: [
        'Named after the French mathematician Camille-Christophe Gerono, this is the simplest figure eight to draw: x = a·cos t and y = a·sin t·cos t, which is a Lissajous figure with frequencies 1 and 2. Eliminating t gives the quartic x⁴ = a²(x² − y²).',
        'Unlike the lemniscate of Bernoulli, it is not defined by foci; its lobes are taller and rounder. Each lobe reaches height a/2, and the two together enclose exactly 4a²/3.',
      ],
      zh: [
        '它以法国数学家 Camille-Christophe Gerono 命名，是最容易画的 8 字形：x = a·cos t、y = a·sin t·cos t，也就是频率为 1 和 2 的利萨如图形。消去 t 得到四次方程 x⁴ = a²(x² − y²)。',
        '和伯努利双纽线不同，它不是用焦点定义的；它的两瓣更高更圆。每一瓣最高到 a/2，两瓣合计围成的面积恰好是 4a²/3。',
      ],
    },
    properties: {
      en: [
        'Cartesian form x⁴ = a²(x² − y²).',
        'Same as the 1 : 2 Lissajous figure x = cos t, y = sin 2t / 2, scaled by a.',
        'Total enclosed area 4a²/3.',
        'Each lobe peaks at height a/2, at x = ±a/√2.',
        'Crosses itself at the origin with tangents y = ±x.',
      ],
      zh: [
        '直角坐标形式 x⁴ = a²(x² − y²)。',
        '就是 1 : 2 的利萨如图形 x = cos t、y = sin 2t / 2 放大 a 倍。',
        '两瓣合计面积 4a²/3。',
        '每一瓣在 x = ±a/√2 处达到最高 a/2。',
        '在原点与自己相交，切线为 y = ±x。',
      ],
    },
    seenIn: {
      en: 'Figure-eight paths in robotics and drone tests, and the infinity-loop logo shape.',
      zh: '机器人和无人机测试里的 8 字路径，以及"无限循环"标志的形状。',
    },
    prompt: {
      en: 'Animate the lemniscate of Gerono: drive x = cos t and y = sin t cos t with two rotating phasors, trace the figure eight, then overlay the lemniscate of Bernoulli to compare the two shapes.',
      zh: '演示 Gerono 双纽线：用两个旋转相量分别驱动 x = cos t 和 y = sin t cos t，描出 8 字形，再叠上伯努利双纽线比较两种形状。',
    },
    related: ['lemniscate-of-bernoulli', 'lissajous-curve', 'cassini-oval'],
  },
];
