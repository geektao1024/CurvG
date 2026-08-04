import { sweep, TAU, type CurveDef } from '../types';

export const polarCurves: CurveDef[] = [
  {
    slug: 'rose-curve',
    category: 'polar',
    name: { en: 'Rose Curve', zh: '玫瑰线' },
    short: {
      en: 'The polar curve r = a·cos(kθ) that blooms into k or 2k petals depending on whether k is odd or even.',
      zh: '极坐标曲线 r = a·cos(kθ),k 为奇数时开出 k 片花瓣,偶数时开出 2k 片。',
    },
    equations: ['r = a\\cos(k\\theta)'],
    params: [
      {
        key: 'k',
        label: { en: 'k (petal frequency)', zh: 'k(花瓣频率)' },
        min: 1,
        max: 9,
        step: 1,
        defaultValue: 5,
      },
    ],
    fitMode: 'refit',
    sample: ({ k }) => [
      sweep(0, TAU, 900, (t) => {
        const r = Math.cos(k * t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The rose curve, or rhodonea, is the polar graph r = a·cos(kθ). As θ sweeps around the origin, the radius oscillates between a and −a, folding the circle into evenly spaced petals. The curve was named and studied by the Italian mathematician Guido Grandi in the 1720s.',
        'The petal count follows a simple parity rule: when k is odd the curve closes after half a turn and shows exactly k petals; when k is even it needs a full turn and shows 2k petals. Watching the count jump as k moves from 4 to 5 is one of the clearest demonstrations of how polar symmetry works.',
      ],
      zh: [
        '玫瑰线(又称 rhodonea)是极坐标方程 r = a·cos(kθ) 的图像。当 θ 绕原点扫过一周,半径在 a 与 −a 之间振荡,把圆折叠成等间距的花瓣。它由意大利数学家 Guido Grandi 在 18 世纪 20 年代命名并系统研究。',
        '花瓣数量遵循一条简单的奇偶规则:k 为奇数时,曲线只需半圈就闭合,共 k 片花瓣;k 为偶数时需要整整一圈,共 2k 片。把 k 从 4 拨到 5、看着花瓣数量跳变,是理解极坐标对称性最直观的方式之一。',
      ],
    },
    properties: {
      en: [
        'k odd → k petals traced in θ ∈ [0, π); k even → 2k petals over a full turn.',
        'Each petal spans an angle of π/k and has maximum radius a.',
        'The total enclosed area is πa²/4 for odd k and πa²/2 for even k.',
        'Using sin(kθ) instead of cos(kθ) rotates the whole rose by π/(2k).',
        'Non-integer k produces overlapping petals that may never close.',
      ],
      zh: [
        'k 为奇数 → θ ∈ [0, π) 内画出 k 片花瓣;k 为偶数 → 一整圈画出 2k 片。',
        '每片花瓣张角为 π/k,最大半径为 a。',
        '总面积:k 为奇数时为 πa²/4,k 为偶数时为 πa²/2。',
        '把 cos(kθ) 换成 sin(kθ),整朵玫瑰旋转 π/(2k)。',
        'k 不是整数时,花瓣互相重叠,曲线可能永不闭合。',
      ],
    },
    seenIn: {
      en: 'Rose curves appear in antenna radiation patterns, vibration mode diagrams, and virtually every polar-coordinates lesson.',
      zh: '玫瑰线出现在天线方向图、振动模态图,以及几乎每一节极坐标课程里。',
    },
    prompt: {
      en: 'Animate the rose curve r = cos(5θ): trace it petal by petal as θ sweeps from 0 to π, label the petal angle π/5, then switch k to 4 and show why an even k doubles the petal count.',
      zh: '演示玫瑰线 r = cos(5θ):让 θ 从 0 扫到 π,一片一片画出花瓣,标注花瓣张角 π/5;然后把 k 换成 4,展示偶数 k 为什么会让花瓣数量翻倍。',
    },
    related: ['cardioid', 'limacon', 'lissajous-curve', 'lemniscate-of-bernoulli'],
  },
  {
    slug: 'cardioid',
    category: 'polar',
    name: { en: 'Cardioid', zh: '心脏线' },
    short: {
      en: 'The heart-shaped curve r = a(1 + cos θ) traced by a point on a circle rolling around an equal circle.',
      zh: '心形曲线 r = a(1 + cos θ),由一个圆绕等大的圆滚动时圆周上一点画出。',
    },
    equations: [
      'r = a(1 + \\cos\\theta)',
      'x = a\\cos t\\,(1+\\cos t), \\quad y = a\\sin t\\,(1+\\cos t)',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a(大小)' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(0, TAU, 700, (t) => {
        const r = a * (1 + Math.cos(t));
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The cardioid is the path of a point on a circle rolling around a second, equal circle — the simplest epicycloid. Its polar equation r = a(1 + cos θ) makes the heart shape explicit: the radius doubles at θ = 0 and collapses to a cusp at θ = π. The name, from the Greek for “heart”, was given by Giovanni Salvemini de Castillon in 1741.',
        'The cardioid keeps appearing where circles interact: it is the envelope of light rays reflected inside a coffee cup (a caustic), the boundary of the main bulb of the Mandelbrot set, and the pickup pattern of the microphones named after it.',
      ],
      zh: [
        '心脏线是一个圆绕另一个等大的圆滚动时,圆周上一点走出的轨迹——最简单的外摆线。极坐标方程 r = a(1 + cos θ) 直接给出心形:θ = 0 处半径最大为 2a,θ = π 处收缩成一个尖点。名字源于希腊语"心",由 Castillon 在 1741 年命名。',
        '凡是圆与圆相互作用的地方,心脏线就常常出现:咖啡杯里光线反射形成的焦散包络、Mandelbrot 集主心形区的边界,以及以它命名的心形指向麦克风的拾音图。',
      ],
    },
    properties: {
      en: [
        'Arc length: 8a. Enclosed area: (3/2)πa².',
        'It is the epicycloid with one cusp (rolling circle equal to the fixed circle).',
        'It is also the special limaçon r = b + a·cos θ with b = a.',
        'The caustic of a circle with a light source on its rim is a cardioid.',
        'Maximum width 2a occurs along the axis of symmetry.',
      ],
      zh: [
        '弧长为 8a,围成的面积为 (3/2)πa²。',
        '它是只有一个尖点的外摆线(滚动圆与固定圆等大)。',
        '它也是蚶线 r = b + a·cos θ 在 b = a 时的特例。',
        '光源位于圆周上时,圆的焦散曲线正是心脏线。',
        '最大宽度 2a 出现在对称轴方向上。',
      ],
    },
    seenIn: {
      en: 'Cardioid microphones, coffee-cup caustics, the Mandelbrot set’s main bulb, and cam profiles in machinery.',
      zh: '心形指向麦克风、咖啡杯焦散、Mandelbrot 集主体边界,以及机械凸轮轮廓。',
    },
    prompt: {
      en: 'Animate a cardioid two ways: first trace r = 1 + cos θ in polar coordinates, then show a circle rolling around an equal fixed circle with the tracing point leaving the same curve, and highlight the cusp.',
      zh: '用两种方式演示心脏线:先在极坐标中描出 r = 1 + cos θ,再展示一个圆绕等大的定圆滚动、圆周上的点画出同一条曲线,并高亮尖点。',
    },
    related: ['limacon', 'nephroid', 'epicycloid', 'heart-curve'],
  },
  {
    slug: 'limacon',
    category: 'polar',
    name: { en: 'Limaçon', zh: '蚶线' },
    short: {
      en: 'The family r = b + a·cos θ that morphs from an inner-loop snail through the cardioid to a convex oval as b grows.',
      zh: '曲线族 r = b + a·cos θ:随 b 增大,从带内环的蜗形经过心脏线,一路变形到凸卵形。',
    },
    equations: ['r = b + a\\cos\\theta'],
    params: [
      {
        key: 'b',
        label: { en: 'b (offset, with a = 1)', zh: 'b(偏移量,固定 a = 1)' },
        min: 0,
        max: 3,
        step: 0.05,
        defaultValue: 0.5,
      },
    ],
    fitMode: 'refit',
    sample: ({ b }) => [
      sweep(0, TAU, 900, (t) => {
        const r = b + Math.cos(t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The limaçon — French for “snail” — is the polar family r = b + a·cos θ, studied by Étienne Pascal (father of Blaise) in the early 1600s. Geometrically it is the path of a point rigidly attached to a circle rolling around another circle of the same radius, where the point need not lie on the rim.',
        'One slider tells the whole story. With a = 1: for b < 1 the radius goes negative and the curve crosses itself in an inner loop; at b = 1 the loop collapses to the cardioid’s cusp; for 1 < b < 2 the curve is dimpled; and from b ≥ 2 on it is a convex oval. It is the standard example of how a single constant reshapes a polar graph.',
      ],
      zh: [
        '蚶线(limaçon,法语"蜗牛")是极坐标曲线族 r = b + a·cos θ,17 世纪初由 Étienne Pascal(布莱兹·帕斯卡的父亲)研究。几何上,它是刚性固定在滚动圆上的一点画出的轨迹——滚动圆绕等大的定圆转动,而该点不必在圆周上。',
        '一个滑杆讲完整个故事。取 a = 1:b < 1 时半径出现负值,曲线自交形成内环;b = 1 时内环收缩为心脏线的尖点;1 < b < 2 时是带凹陷的形状;b ≥ 2 后变成凸卵形。它是"一个常数如何重塑极坐标图像"的标准示例。',
      ],
    },
    properties: {
      en: [
        'b < a: inner loop (the radius changes sign); b = a: cardioid.',
        'a < b < 2a: dimpled limaçon; b ≥ 2a: convex.',
        'Enclosed area (b ≥ a): π(b² + a²/2).',
        'It is the conchoid of a circle with respect to a point on the circle.',
        'The inner-loop case is a classic area-between-loops integration exercise.',
      ],
      zh: [
        'b < a:出现内环(半径变号);b = a:退化为心脏线。',
        'a < b < 2a:带凹陷的蚶线;b ≥ 2a:凸形。',
        'b ≥ a 时围成面积为 π(b² + a²/2)。',
        '它是圆关于圆周上一点的蚌线(conchoid)。',
        '内环情形是"内外环之间面积"积分的经典练习题。',
      ],
    },
    seenIn: {
      en: 'Polar-coordinate courses, directional microphone patterns (subcardioid and hypercardioid are limaçons), and rotary engine geometry.',
      zh: '极坐标课程、指向性麦克风拾音图(次心形与超心形都是蚶线),以及转子发动机几何。',
    },
    prompt: {
      en: 'Animate the limaçon family r = b + cos θ as b slides from 0.3 to 2.5: hold the axes fixed, morph the curve through the inner-loop, cardioid, dimpled, and convex stages, and label each transition value of b.',
      zh: '演示蚶线族 r = b + cos θ 随 b 从 0.3 滑到 2.5 的变化:坐标轴保持不动,曲线依次经过内环、心脏线、凹陷、凸形四个阶段,并标注每个转变对应的 b 值。',
    },
    related: ['cardioid', 'rose-curve', 'lemniscate-of-bernoulli'],
  },
  {
    slug: 'lemniscate-of-bernoulli',
    category: 'polar',
    name: { en: 'Lemniscate of Bernoulli', zh: '伯努利双纽线' },
    short: {
      en: 'The figure-eight curve r² = a²·cos 2θ — the set of points whose distances to two foci multiply to a constant.',
      zh: '8 字形曲线 r² = a²·cos 2θ:到两个焦点距离之积为常数的点的轨迹。',
    },
    equations: [
      'r^2 = a^2\\cos 2\\theta',
      '(x^2+y^2)^2 = a^2(x^2-y^2)',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a(大小)' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(0, TAU, 900, (t) => {
        const s = Math.sin(t);
        const c = Math.cos(t);
        const d = 1 + s * s;
        return [(a * c) / d, (a * s * c) / d];
      }),
    ],
    intro: {
      en: [
        'The lemniscate of Bernoulli is the locus of points whose distances to two foci have a constant product — the multiplicative cousin of the ellipse, which fixes the sum. Jacob Bernoulli described it in 1694 and named it after the Latin lemniscus, a hanging ribbon. Its polar form r² = a²·cos 2θ shows why the curve only exists where cos 2θ ≥ 0: two symmetric lobes meeting at the origin.',
        'The curve became far more than a pretty figure eight: attempts to compute its arc length led Fagnano and Euler to the lemniscatic integrals, a direct ancestor of the theory of elliptic functions.',
      ],
      zh: [
        '伯努利双纽线是到两个焦点距离之积为常数的点的轨迹——椭圆固定"距离之和",它固定"距离之积"。雅各布·伯努利在 1694 年描述了它,名字来自拉丁语 lemniscus(垂下的缎带)。极坐标形式 r² = a²·cos 2θ 解释了曲线为何只存在于 cos 2θ ≥ 0 的角度范围:两片对称的叶在原点相交。',
        '这条曲线远不止是漂亮的 8 字:为计算其弧长,Fagnano 与 Euler 引出了双纽线积分,成为椭圆函数理论的直接源头。',
      ],
    },
    properties: {
      en: [
        'Total enclosed area: a² (both lobes together).',
        'Foci sit at (±a/√2, 0); the distance product equals a²/2.',
        'The origin is a crossing point where the two tangents are y = ±x.',
        'It is the inverse of the rectangular hyperbola with respect to its center.',
        'Arc length involves the lemniscate constant ϖ ≈ 2.6221, computed via elliptic integrals.',
      ],
      zh: [
        '两叶合计围成的面积恰为 a²。',
        '焦点位于 (±a/√2, 0),距离之积等于 a²/2。',
        '原点是自交点,两条切线为 y = ±x。',
        '它是等轴双曲线关于中心的反演像。',
        '弧长涉及双纽线常数 ϖ ≈ 2.6221,需用椭圆积分计算。',
      ],
    },
    seenIn: {
      en: 'The infinity symbol ∞, analog signal constellations, and the historical road from arc length to elliptic functions.',
      zh: '无穷符号 ∞ 的原型、模拟信号星座图,以及从弧长问题通往椭圆函数的历史路径。',
    },
    prompt: {
      en: 'Animate the lemniscate r² = cos 2θ: mark the two foci, pick three sample points and show their distance product staying constant, then trace the full figure eight and shade the region where cos 2θ < 0 to explain the gaps.',
      zh: '演示双纽线 r² = cos 2θ:标出两个焦点,取三个样本点展示"到两焦点距离之积保持不变",再完整描出 8 字形,并用阴影标出 cos 2θ < 0 的角度区间,解释曲线为何在那里不存在。',
    },
    related: ['limacon', 'hyperbola', 'rose-curve'],
  },
  {
    slug: 'cissoid-of-diocles',
    category: 'polar',
    name: { en: 'Cissoid of Diocles', zh: '狄奥克莱斯蔓叶线' },
    short: {
      en: 'The cusped curve r = 2a·sin θ·tan θ invented around 180 BC to solve the ancient problem of doubling the cube.',
      zh: '带尖点的曲线 r = 2a·sin θ·tan θ,公元前 180 年左右为解决"倍立方"古典难题而发明。',
    },
    equations: [
      'r = 2a\\sin\\theta\\tan\\theta',
      'y^2(2a - x) = x^3',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (asymptote at x = 2a)', zh: 'a(渐近线 x = 2a)' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(-1.12, 1.12, 900, (t) => {
        const r = 2 * a * Math.sin(t) * Math.tan(t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The cissoid of Diocles — from the Greek for “ivy-shaped” — was constructed around 180 BC as a tool for doubling the cube: finding a cube with exactly twice the volume of a given one. Compass and straightedge cannot do it, but intersecting this curve with a line yields the required ∛2 ratio exactly.',
        'The curve has a cusp at the origin and hugs the vertical asymptote x = 2a. Geometrically it is generated from a circle of diameter 2a: for each ray from the origin, the cissoid point copies the distance between where the ray leaves the circle and where it meets the tangent line at the far end.',
      ],
      zh: [
        '蔓叶线得名于希腊语"常春藤形",由狄奥克莱斯在公元前 180 年左右构造,用来解决倍立方问题:作一个体积恰为给定立方体两倍的立方体。仅用尺规无法完成,但让直线与这条曲线相交,就能精确得到所需的 ∛2 比例。',
        '曲线在原点有一个尖点,并紧贴竖直渐近线 x = 2a。它由直径为 2a 的圆生成:对从原点出发的每条射线,蔓叶线上的点复制"射线离开圆的位置"与"射线到达远端切线的位置"之间的距离。',
      ],
    },
    properties: {
      en: [
        'Cusp at the origin; vertical asymptote at x = 2a.',
        'The area between the curve and its asymptote is 3πa².',
        'Cartesian form: y²(2a − x) = x³, a cubic curve.',
        'It is the pedal-related cissoid of a circle and its tangent line, taken from the point opposite the tangency.',
        'Newton later showed how to draw it with two rulers and a fixed right angle.',
      ],
      zh: [
        '原点处为尖点,x = 2a 处为竖直渐近线。',
        '曲线与渐近线之间的面积为 3πa²。',
        '直角坐标形式 y²(2a − x) = x³,是一条三次曲线。',
        '它是圆与其切线相对于切点对侧点构造出的蔓叶线。',
        '牛顿后来给出了用两把直尺和一个固定直角绘制它的方法。',
      ],
    },
    seenIn: {
      en: 'The history of the three classical Greek construction problems, cubic-curve galleries, and mechanism design exercises.',
      zh: '希腊三大古典作图难题的历史、三次曲线图鉴,以及机构设计练习。',
    },
    prompt: {
      en: 'Animate the cissoid of Diocles: build it from a circle of diameter 2 and its far tangent line by transferring segment lengths along a rotating ray, trace the ivy-shaped curve with its cusp, and show the asymptote x = 2.',
      zh: '演示蔓叶线的生成:以直径为 2 的圆和它远端的切线为基础,沿旋转射线转移线段长度,描出带尖点的常春藤形曲线,并标出渐近线 x = 2。',
    },
    related: ['folium-of-descartes', 'witch-of-agnesi', 'tractrix'],
  },
];
