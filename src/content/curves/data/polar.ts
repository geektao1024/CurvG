import { sweep, TAU, type CurveDef } from '../types';

export const polarCurves: CurveDef[] = [
  {
    slug: 'rose-curve',
    category: 'polar',
    name: { en: 'Rose Curve', zh: '玫瑰线' },
    short: {
      en: 'The polar curve r = a·cos(kθ) that blooms into k or 2k petals depending on whether k is odd or even.',
      zh: '极坐标曲线 r = a·cos(kθ)，k 为奇数时开出 k 片花瓣，偶数时开出 2k 片。',
    },
    equations: ['r = a\\cos(k\\theta)'],
    params: [
      {
        key: 'k',
        label: { en: 'k (petal frequency)', zh: 'k（花瓣频率）' },
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
        '玫瑰线（又称 rhodonea）是极坐标方程 r = a·cos(kθ) 的图像。当 θ 绕原点扫过一周，半径在 a 与 −a 之间振荡，把圆折叠成等间距的花瓣。它由意大利数学家 Guido Grandi 在 18 世纪 20 年代命名并系统研究。',
        '花瓣数量遵循一条简单的奇偶规则：k 为奇数时，曲线只需半圈就闭合，共 k 片花瓣；k 为偶数时需要整整一圈，共 2k 片。把 k 从 4 拨到 5、看着花瓣数量跳变，是理解极坐标对称性最直观的方式之一。',
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
        'k 为奇数 → θ ∈ [0, π) 内画出 k 片花瓣；k 为偶数 → 一整圈画出 2k 片。',
        '每片花瓣张角为 π/k，最大半径为 a。',
        '总面积：k 为奇数时为 πa²/4，k 为偶数时为 πa²/2。',
        '把 cos(kθ) 换成 sin(kθ)，整朵玫瑰旋转 π/(2k)。',
        'k 不是整数时，花瓣互相重叠，曲线可能永不闭合。',
      ],
    },
    seenIn: {
      en: 'Rose curves appear in antenna radiation patterns, vibration mode diagrams, and virtually every polar-coordinates lesson.',
      zh: '玫瑰线出现在天线方向图、振动模态图，以及几乎每一节极坐标课程里。',
    },
    prompt: {
      en: 'Animate the rose curve r = cos(5θ): trace it petal by petal as θ sweeps from 0 to π, label the petal angle π/5, then switch k to 4 and show why an even k doubles the petal count.',
      zh: '演示玫瑰线 r = cos(5θ)：让 θ 从 0 扫到 π，一片一片画出花瓣，标注花瓣张角 π/5；然后把 k 换成 4，展示偶数 k 为什么会让花瓣数量翻倍。',
    },
    related: ['cardioid', 'limacon', 'lissajous-curve', 'maurer-rose'],
  },
  {
    slug: 'cardioid',
    category: 'polar',
    name: { en: 'Cardioid', zh: '心脏线' },
    short: {
      en: 'The heart-shaped curve r = a(1 + cos θ) traced by a point on a circle rolling around an equal circle.',
      zh: '心形曲线 r = a(1 + cos θ)，由一个圆绕等大的圆滚动时圆周上一点画出。',
    },
    equations: [
      'r = a(1 + \\cos\\theta)',
      'x = a\\cos t\\,(1+\\cos t), \\quad y = a\\sin t\\,(1+\\cos t)',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a（大小）' },
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
        '心脏线是一个圆绕另一个等大的圆滚动时，圆周上一点走出的轨迹——最简单的外摆线。极坐标方程 r = a(1 + cos θ) 直接给出心形：θ = 0 处半径最大为 2a，θ = π 处收缩成一个尖点。名字源于希腊语"心"，由 Castillon 在 1741 年命名。',
        '凡是圆与圆相互作用的地方，心脏线就常常出现：咖啡杯里光线反射形成的焦散包络、Mandelbrot 集主心形区的边界，以及以它命名的心形指向麦克风的拾音图。',
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
        '弧长为 8a，围成的面积为 (3/2)πa²。',
        '它是只有一个尖点的外摆线（滚动圆与固定圆等大）。',
        '它也是蚶线 r = b + a·cos θ 在 b = a 时的特例。',
        '光源位于圆周上时，圆的焦散曲线正是心脏线。',
        '最大宽度 2a 出现在对称轴方向上。',
      ],
    },
    seenIn: {
      en: 'Cardioid microphones, coffee-cup caustics, the Mandelbrot set’s main bulb, and cam profiles in machinery.',
      zh: '心形指向麦克风、咖啡杯焦散、Mandelbrot 集主体边界，以及机械凸轮轮廓。',
    },
    prompt: {
      en: 'Animate a cardioid two ways: first trace r = 1 + cos θ in polar coordinates, then show a circle rolling around an equal fixed circle with the tracing point leaving the same curve, and highlight the cusp.',
      zh: '用两种方式演示心脏线：先在极坐标中描出 r = 1 + cos θ，再展示一个圆绕等大的定圆滚动、圆周上的点画出同一条曲线，并高亮尖点。',
    },
    related: ['limacon', 'nephroid', 'epicycloid', 'heart-curve'],
  },
  {
    slug: 'limacon',
    category: 'polar',
    name: { en: 'Limaçon', zh: '蚶线' },
    short: {
      en: 'The family r = b + a·cos θ that morphs from an inner-loop snail through the cardioid to a convex oval as b grows.',
      zh: '曲线族 r = b + a·cos θ：随 b 增大，从带内环的蜗形经过心脏线，一路变形到凸卵形。',
    },
    equations: ['r = b + a\\cos\\theta'],
    params: [
      {
        key: 'b',
        label: { en: 'b (offset, with a = 1)', zh: 'b（偏移量，固定 a = 1）' },
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
        '蚶线（limaçon，法语"蜗牛"）是极坐标曲线族 r = b + a·cos θ，17 世纪初由 Étienne Pascal（布莱兹·帕斯卡的父亲）研究。几何上，它是刚性固定在滚动圆上的一点画出的轨迹——滚动圆绕等大的定圆转动，而该点不必在圆周上。',
        '一个滑杆讲完整个故事。取 a = 1:b < 1 时半径出现负值，曲线自交形成内环；b = 1 时内环收缩为心脏线的尖点；1 < b < 2 时是带凹陷的形状；b ≥ 2 后变成凸卵形。它是"一个常数如何重塑极坐标图像"的标准示例。',
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
        'b < a：出现内环（半径变号）；b = a：退化为心脏线。',
        'a < b < 2a：带凹陷的蚶线；b ≥ 2a：凸形。',
        'b ≥ a 时围成面积为 π(b² + a²/2)。',
        '它是圆关于圆周上一点的蚌线（conchoid）。',
        '内环情形是"内外环之间面积"积分的经典练习题。',
      ],
    },
    seenIn: {
      en: 'Polar-coordinate courses, directional microphone patterns (subcardioid and hypercardioid are limaçons), and rotary engine geometry.',
      zh: '极坐标课程、指向性麦克风拾音图（次心形与超心形都是蚶线），以及转子发动机几何。',
    },
    prompt: {
      en: 'Animate the limaçon family r = b + cos θ as b slides from 0.3 to 2.5: hold the axes fixed, morph the curve through the inner-loop, cardioid, dimpled, and convex stages, and label each transition value of b.',
      zh: '演示蚶线族 r = b + cos θ 随 b 从 0.3 滑到 2.5 的变化：坐标轴保持不动，曲线依次经过内环、心脏线、凹陷、凸形四个阶段，并标注每个转变对应的 b 值。',
    },
    related: ['cardioid', 'rose-curve', 'lemniscate-of-bernoulli'],
  },
  {
    slug: 'lemniscate-of-bernoulli',
    category: 'polar',
    name: { en: 'Lemniscate of Bernoulli', zh: '伯努利双纽线' },
    short: {
      en: 'The figure-eight curve r² = a²·cos 2θ — the set of points whose distances to two foci multiply to a constant.',
      zh: '8 字形曲线 r² = a²·cos 2θ：到两个焦点距离之积为常数的点的轨迹。',
    },
    equations: [
      'r^2 = a^2\\cos 2\\theta',
      '(x^2+y^2)^2 = a^2(x^2-y^2)',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a（大小）' },
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
        '伯努利双纽线是到两个焦点距离之积为常数的点的轨迹——椭圆固定"距离之和"，它固定"距离之积"。雅各布·伯努利在 1694 年描述了它，名字来自拉丁语 lemniscus（垂下的缎带）。极坐标形式 r² = a²·cos 2θ 解释了曲线为何只存在于 cos 2θ ≥ 0 的角度范围：两片对称的叶在原点相交。',
        '这条曲线远不止是漂亮的 8 字：为计算其弧长，Fagnano 与 Euler 引出了双纽线积分，成为椭圆函数理论的直接源头。',
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
        '焦点位于 (±a/√2, 0)，距离之积等于 a²/2。',
        '原点是自交点，两条切线为 y = ±x。',
        '它是等轴双曲线关于中心的反演像。',
        '弧长涉及双纽线常数 ϖ ≈ 2.6221，需用椭圆积分计算。',
      ],
    },
    seenIn: {
      en: 'The infinity symbol ∞, analog signal constellations, and the historical road from arc length to elliptic functions.',
      zh: '无穷符号 ∞ 的原型、模拟信号星座图，以及从弧长问题通往椭圆函数的历史路径。',
    },
    prompt: {
      en: 'Animate the lemniscate r² = cos 2θ: mark the two foci, pick three sample points and show their distance product staying constant, then trace the full figure eight and shade the region where cos 2θ < 0 to explain the gaps.',
      zh: '演示双纽线 r² = cos 2θ：标出两个焦点，取三个样本点展示"到两焦点距离之积保持不变"，再完整描出 8 字形，并用阴影标出 cos 2θ < 0 的角度区间，解释曲线为何在那里不存在。',
    },
    related: ['limacon', 'hyperbola', 'rose-curve', 'cassini-oval'],
  },
  {
    slug: 'cissoid-of-diocles',
    category: 'polar',
    name: { en: 'Cissoid of Diocles', zh: '狄奥克莱斯蔓叶线' },
    short: {
      en: 'The cusped curve r = 2a·sin θ·tan θ invented around 180 BC to solve the ancient problem of doubling the cube.',
      zh: '带尖点的曲线 r = 2a·sin θ·tan θ，公元前 180 年左右为解决"倍立方"古典难题而发明。',
    },
    equations: [
      'r = 2a\\sin\\theta\\tan\\theta',
      'y^2(2a - x) = x^3',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (asymptote at x = 2a)', zh: 'a（渐近线 x = 2a）' },
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
        '蔓叶线得名于希腊语"常春藤形"，由狄奥克莱斯在公元前 180 年左右构造，用来解决倍立方问题：作一个体积恰为给定立方体两倍的立方体。仅用尺规无法完成，但让直线与这条曲线相交，就能精确得到所需的 ∛2 比例。',
        '曲线在原点有一个尖点，并紧贴竖直渐近线 x = 2a。它由直径为 2a 的圆生成：对从原点出发的每条射线，蔓叶线上的点复制"射线离开圆的位置"与"射线到达远端切线的位置"之间的距离。',
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
        '原点处为尖点，x = 2a 处为竖直渐近线。',
        '曲线与渐近线之间的面积为 3πa²。',
        '直角坐标形式 y²(2a − x) = x³，是一条三次曲线。',
        '它是圆与其切线相对于切点对侧点构造出的蔓叶线。',
        '牛顿后来给出了用两把直尺和一个固定直角绘制它的方法。',
      ],
    },
    seenIn: {
      en: 'The history of the three classical Greek construction problems, cubic-curve galleries, and mechanism design exercises.',
      zh: '希腊三大古典作图难题的历史、三次曲线图鉴，以及机构设计练习。',
    },
    prompt: {
      en: 'Animate the cissoid of Diocles: build it from a circle of diameter 2 and its far tangent line by transferring segment lengths along a rotating ray, trace the ivy-shaped curve with its cusp, and show the asymptote x = 2.',
      zh: '演示蔓叶线的生成：以直径为 2 的圆和它远端的切线为基础，沿旋转射线转移线段长度，描出带尖点的常春藤形曲线，并标出渐近线 x = 2。',
    },
    related: ['folium-of-descartes', 'witch-of-agnesi', 'tractrix', 'strophoid'],
  },
  {
    slug: 'cassini-oval',
    category: 'polar',
    name: { en: 'Cassini oval', zh: '卡西尼卵形线' },
    short: {
      en: 'Points whose distances to two foci multiply to b²: one oval, a figure eight, or two separate loops.',
      zh: '到两个焦点距离之积为 b² 的点：可能是一个卵形、一个 8 字，或两个分开的环。',
    },
    equations: [
      '\\big((x-c)^2+y^2\\big)\\big((x+c)^2+y^2\\big) = b^4',
      'r^4 - 2c^2r^2\\cos 2\\theta = b^4 - c^4',
    ],
    params: [
      {
        key: 'b',
        label: { en: 'b (with c = 1)', zh: 'b（c = 1）' },
        min: 0.6,
        max: 1.8,
        step: 0.05,
        defaultValue: 1.2,
      },
    ],
    fitMode: 'fixed',
    sample: ({ b }) => {
      // Foci at (±1, 0): r² = cos 2θ ± √(cos² 2θ + b⁴ − 1).
      const k = b ** 4 - 1;
      if (k >= 0) {
        return [
          sweep(0, TAU, 1200, (t) => {
            const c2 = Math.cos(2 * t);
            const r = Math.sqrt(c2 + Math.sqrt(c2 * c2 + k));
            return [r * Math.cos(t), r * Math.sin(t)];
          }),
        ];
      }
      // Two loops: each runs out on the far branch and back on the near one,
      // meeting where the square root vanishes (θ = ±θm).
      const thetaMax = Math.acos(Math.sqrt(-k)) / 2;
      const loop = (side: number) =>
        sweep(-Math.PI / 2, 1.5 * Math.PI, 1200, (s) => {
          const t = thetaMax * Math.sin(s);
          const c2 = Math.cos(2 * t);
          const root = Math.sqrt(Math.max(0, c2 * c2 + k));
          const r = Math.sqrt(Math.cos(s) >= 0 ? c2 + root : c2 - root);
          return [side * r * Math.cos(t), r * Math.sin(t)];
        });
      return [loop(1), loop(-1)];
    },
    intro: {
      en: [
        'An ellipse fixes the sum of the distances to two foci; a Cassini oval fixes their product. Giovanni Domenico Cassini proposed these curves in 1680 as a model for planetary orbits, before Newton’s gravity settled the matter in favour of Kepler’s ellipses.',
        'With the foci at (±c, 0) and the product b², one ratio decides the shape. For b < c the curve splits into two loops around the foci; at b = c it becomes the lemniscate of Bernoulli; for b > c it is a single closed curve, pinched like a peanut until b reaches √2·c, after which it is convex.',
      ],
      zh: [
        '椭圆固定到两焦点的距离之和，卡西尼卵形线固定距离之积。Giovanni Domenico Cassini 在 1680 年提出这类曲线作为行星轨道模型；后来牛顿的引力理论支持了开普勒的椭圆。',
        '焦点在 (±c, 0)、距离之积为 b² 时，形状只由 b 与 c 的比决定：b < c 时分成绕着两个焦点的两个环；b = c 时就是伯努利双纽线；b > c 时是一条闭曲线，b 小于 √2·c 时中间凹进去像花生，b ≥ √2·c 后变成凸的。',
      ],
    },
    properties: {
      en: [
        'Defining property: the product of the distances to (±c, 0) equals b².',
        'b < c: two separate loops; b = c: the lemniscate of Bernoulli; b > c: one closed curve.',
        'The single curve is convex exactly when b ≥ √2·c.',
        'Polar form: r⁴ − 2c²r²·cos 2θ = b⁴ − c⁴.',
        'Symmetric about both axes for every b.',
      ],
      zh: [
        '定义：到 (±c, 0) 两点的距离之积等于 b²。',
        'b < c 时是两个分开的环；b = c 时是伯努利双纽线；b > c 时是一条闭曲线。',
        '单条闭曲线在 b ≥ √2·c 时恰好是凸的。',
        '极坐标形式：r⁴ − 2c²r²·cos 2θ = b⁴ − c⁴。',
        '对任意 b，曲线都关于两条坐标轴对称。',
      ],
    },
    seenIn: {
      en: 'Cassini’s orbit model, level sets of |z² − c²| in complex analysis, and slices of a torus by a plane parallel to its axis at a distance equal to the tube radius.',
      zh: 'Cassini 的轨道模型、复分析中 |z² − c²| 的等值线，以及用平行于环面轴、且到轴距离等于管半径的平面截环面得到的截线。',
    },
    prompt: {
      en: 'Animate Cassini ovals with foci at (±1, 0): show two distances from a moving point to the foci and their product b², then sweep b from 0.8 to 1.6 so two loops merge into the lemniscate at b = 1 and open into a peanut and finally a convex oval.',
      zh: '演示焦点在 (±1, 0) 的卡西尼卵形线：显示动点到两焦点的距离及其乘积 b²；再让 b 从 0.8 变到 1.6，两个环在 b = 1 时合成双纽线，然后张开成花生形，最后变成凸卵形。',
    },
    related: ['lemniscate-of-bernoulli', 'ellipse', 'limacon'],
  },
  {
    slug: 'conchoid-of-nicomedes',
    category: 'polar',
    name: { en: 'Conchoid of Nicomedes', zh: '尼科梅德斯蚌线' },
    short: {
      en: 'Slide a ruler through a fixed point and mark a fixed distance b beyond a line: the shell-shaped curve Nicomedes used to trisect angles.',
      zh: '让直尺绕一个定点转动，在越过一条直线后再量出定长 b：尼科梅德斯用来三等分角的贝壳形曲线。',
    },
    equations: [
      'r = a\\sec\\theta \\pm b',
      '(x - a)^2(x^2 + y^2) = b^2x^2',
    ],
    params: [
      {
        key: 'b',
        label: { en: 'b (with a = 1)', zh: 'b（a = 1）' },
        min: 0.3,
        max: 2.5,
        step: 0.1,
        defaultValue: 1.5,
      },
    ],
    fitMode: 'fixed',
    sample: ({ b }) => [
      sweep(-1.25, 1.25, 900, (t) => {
        const r = 1 / Math.cos(t) - b;
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
      sweep(-1.25, 1.25, 900, (t) => {
        const r = 1 / Math.cos(t) + b;
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'Fix a point O and a line at distance a from it. Draw any line through O; where it crosses the fixed line, measure a distance b along it on both sides. The marked points trace the conchoid (Greek konche, shell). Nicomedes, around 200 BC, built a mechanical instrument to draw it and used it to trisect angles and double the cube.',
        'The two branches share the line x = a as an asymptote. The ratio of b to a decides the inner branch: for b < a it is a smooth arch, for b = a it has a cusp at O, and for b > a it forms a loop through O.',
      ],
      zh: [
        '取定点 O 和到它距离为 a 的一条直线。过 O 任作一条直线，在它与定直线的交点两侧沿这条直线各量出距离 b。这些点描出的就是蚌线（希腊语 konche，贝壳）。约公元前 200 年，尼科梅德斯做了画这条曲线的工具，并用它三等分角、解决倍立方问题。',
        '两支曲线都以直线 x = a 为渐近线。b 与 a 的大小关系决定内侧一支的样子：b < a 时是光滑的拱，b = a 时在 O 处有尖点，b > a 时绕过 O 形成一个环。',
      ],
    },
    properties: {
      en: [
        'Polar form with the pole at O: r = a·sec θ ± b.',
        'Cartesian form: (x − a)²(x² + y²) = b²x².',
        'Both branches approach the asymptote x = a.',
        'Inner branch: smooth for b < a, a cusp at O for b = a, a loop through O for b > a.',
        'Nicomedes’ neusis construction with it trisects any angle.',
      ],
      zh: [
        '以 O 为极点：r = a·sec θ ± b。',
        '直角坐标形式：(x − a)²(x² + y²) = b²x²。',
        '两支都以 x = a 为渐近线。',
        '内侧一支：b < a 时光滑，b = a 时在 O 处有尖点，b > a 时绕 O 成环。',
        '借助它的"插入法"作图可以三等分任意角。',
      ],
    },
    seenIn: {
      en: 'Histories of the three classical construction problems, and neusis (verging) constructions.',
      zh: '古希腊三大作图问题的历史，以及"插入法"（neusis）作图。',
    },
    prompt: {
      en: 'Animate the conchoid of Nicomedes: rotate a line about the pole O, mark where it crosses the line x = 1, and lay off b = 1.5 on both sides to trace the two branches; then vary b through 1 to show the inner loop shrinking to a cusp.',
      zh: '演示尼科梅德斯蚌线：让直线绕极点 O 转动，标出它与直线 x = 1 的交点，在两侧各量出 b = 1.5，描出两支曲线；再让 b 变到 1，展示内环缩成尖点。',
    },
    related: ['limacon', 'strophoid', 'trisectrix-of-maclaurin'],
  },
  {
    slug: 'strophoid',
    category: 'polar',
    name: { en: 'Strophoid', zh: '环索线' },
    short: {
      en: 'The right strophoid y²(a − x) = x²(a + x): a loop through the origin and two arms reaching for the asymptote x = a.',
      zh: '直角环索线 y²(a − x) = x²(a + x)：一个穿过原点的环，加上两条伸向渐近线 x = a 的臂。',
    },
    equations: [
      'y^2(a - x) = x^2(a + x)',
      'r = -a\\,\\frac{\\cos 2\\theta}{\\cos\\theta}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a（大小）' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(-1.32, 1.32, 1201, (t) => {
        const r = (-a * Math.cos(2 * t)) / Math.cos(t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The right strophoid is a cubic curve with a node: it crosses itself at the origin, where its two tangents are the lines y = ±x. On the left it closes into a loop through (−a, 0); on the right its two arms climb towards the vertical asymptote x = a. Its name comes from the Greek for a twisted band.',
        'The polar form r = −a·cos 2θ / cos θ shows the whole shape at once: r is zero at θ = ±45°, which is the node, and grows without bound as θ approaches ±90°, which is the asymptote.',
      ],
      zh: [
        '直角环索线是一条有结点的三次曲线：它在原点与自己相交，两条切线是 y = ±x。左边合成一个经过 (−a, 0) 的环，右边两条臂向竖直渐近线 x = a 爬升。名字来自希腊语"扭转的带子"。',
        '从极坐标形式 r = −a·cos 2θ / cos θ 可以直接读出它的样子：θ = ±45° 时 r = 0（就是结点），θ → ±90° 时 r 趋于无穷（就是渐近线）。',
      ],
    },
    properties: {
      en: [
        'Node at the origin with tangents y = ±x.',
        'Vertical asymptote x = a.',
        'The loop passes through (−a, 0) and encloses area (2 − π/2)a².',
        'Polar form: r = −a·cos 2θ / cos θ.',
        'Symmetric about the x-axis.',
      ],
      zh: [
        '原点是结点，两条切线为 y = ±x。',
        '竖直渐近线 x = a。',
        '环经过 (−a, 0)，围成面积 (2 − π/2)a²。',
        '极坐标形式：r = −a·cos 2θ / cos θ。',
        '关于 x 轴对称。',
      ],
    },
    seenIn: {
      en: 'Catalogues of cubic curves and exercises on nodes, asymptotes and polar sketching.',
      zh: '三次曲线图谱，以及关于结点、渐近线和极坐标作图的练习。',
    },
    prompt: {
      en: 'Animate the right strophoid y²(1 − x) = x²(1 + x): sweep a ray from the origin with r = −cos 2θ / cos θ, show r passing through zero at ±45° to form the node, draw the asymptote x = 1, and shade the loop with its area 2 − π/2.',
      zh: '演示直角环索线 y²(1 − x) = x²(1 + x)：让射线从原点扫过，r = −cos 2θ / cos θ；展示 r 在 ±45° 处为零形成结点，画出渐近线 x = 1，并给环涂上阴影、标出面积 2 − π/2。',
    },
    related: ['folium-of-descartes', 'trisectrix-of-maclaurin', 'cissoid-of-diocles'],
  },
  {
    slug: 'trisectrix-of-maclaurin',
    category: 'polar',
    name: { en: 'Trisectrix of Maclaurin', zh: '麦克劳林三等分角线' },
    short: {
      en: 'The cubic 2x(x² + y²) = a(3x² − y²): a loop and an asymptote, studied by Maclaurin in 1742 for trisecting angles.',
      zh: '三次曲线 2x(x² + y²) = a(3x² − y²)：一个环加一条渐近线，麦克劳林在 1742 年为三等分角而研究它。',
    },
    equations: [
      '2x(x^2 + y^2) = a(3x^2 - y^2)',
      'r = a\\,\\frac{\\sin 3\\theta}{\\sin 2\\theta}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a（大小）' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(-1.42, 1.42, 1201, (t) => {
        const r = (a * Math.sin(3 * t)) / Math.sin(2 * t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'Colin Maclaurin studied this cubic in his Treatise of Fluxions (1742) as a tool for trisecting an angle, one of the problems that cannot be solved with straightedge and compass alone. A curve that is allowed to be drawn in advance gets around that limit.',
        'In polar form, r = a·sin 3θ / sin 2θ, the factor sin 3θ is the trisection at work. The curve crosses itself at the origin, closes a loop that reaches x = 3a/2, and has the vertical asymptote x = −a/2.',
      ],
      zh: [
        'Colin Maclaurin 在《流数论》（1742）里研究了这条三次曲线，用来三等分角——这是只用直尺和圆规做不到的问题之一。允许事先画好一条曲线，就能绕过这个限制。',
        '极坐标形式 r = a·sin 3θ / sin 2θ 中的 sin 3θ 正是三等分在起作用。曲线在原点与自己相交，合成一个伸到 x = 3a/2 的环，并有竖直渐近线 x = −a/2。',
      ],
    },
    properties: {
      en: [
        'Polar form: r = a·sin 3θ / sin 2θ.',
        'Node at the origin; the loop reaches x = 3a/2 on the x-axis.',
        'Vertical asymptote x = −a/2.',
        'The loop encloses area 3√3a²/4.',
        'Maclaurin used it to trisect angles (1742).',
      ],
      zh: [
        '极坐标形式：r = a·sin 3θ / sin 2θ。',
        '原点是结点；环在 x 轴上伸到 x = 3a/2。',
        '竖直渐近线 x = −a/2。',
        '环围成的面积为 3√3a²/4。',
        '麦克劳林用它三等分角（1742）。',
      ],
    },
    seenIn: {
      en: 'The history of angle trisection and catalogues of classical cubics.',
      zh: '三等分角问题的历史，以及经典三次曲线的图谱。',
    },
    prompt: {
      en: 'Animate the trisectrix of Maclaurin with a = 1: sweep a ray with r = sin 3θ / sin 2θ, trace the loop out to x = 3/2 and the arms towards the asymptote x = −1/2, then shade the loop with its area 3√3/4.',
      zh: '演示 a = 1 的麦克劳林三等分角线：让射线按 r = sin 3θ / sin 2θ 扫过，描出伸到 x = 3/2 的环和伸向渐近线 x = −1/2 的两臂，再给环涂上阴影、标出面积 3√3/4。',
    },
    related: ['strophoid', 'conchoid-of-nicomedes', 'folium-of-descartes'],
  },
  {
    slug: 'cochleoid',
    category: 'polar',
    name: { en: 'Cochleoid', zh: '蜗牛线' },
    short: {
      en: 'r = a·sin θ / θ: a snail-shell spiral that passes through the pole at every multiple of π.',
      zh: 'r = a·sin θ / θ：一条蜗牛壳形的螺线，θ 每到 π 的整数倍就回到极点。',
    },
    equations: ['r = \\frac{a\\sin\\theta}{\\theta}', '(x^2 + y^2)\\arctan\\frac{y}{x} = ay'],
    params: [
      {
        key: 'turns',
        label: { en: 'Turns each way', zh: '每侧圈数' },
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
      },
    ],
    fitMode: 'refit',
    sample: ({ turns }) => [
      sweep(-turns * TAU, turns * TAU, 2401, (t) => {
        const r = Math.sin(t) / t;
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The cochleoid (Latin cochlea, snail shell) is the polar graph of sin θ / θ, the function known elsewhere as sinc. At θ = 0 the radius is a; every time θ reaches a multiple of π the radius is zero, so the curve keeps returning to the pole in ever smaller loops.',
        'It is the inverse of the quadratrix of Hippias: multiplying the two radii, a·sin θ/θ and 2aθ/(π sin θ), gives the constant 2a²/π. Its loops are all tangent to one another at the pole.',
      ],
      zh: [
        '蜗牛线（拉丁语 cochlea，蜗牛壳）是 sin θ / θ 的极坐标图像，这个函数在别处叫 sinc。θ = 0 时半径为 a；θ 每到 π 的整数倍，半径就是零，所以曲线以越来越小的环一次次回到极点。',
        '它是希庇亚斯割圆曲线的反演：两者的半径 a·sin θ/θ 与 2aθ/(π sin θ) 相乘恒等于 2a²/π。所有的环都在极点处彼此相切。',
      ],
    },
    properties: {
      en: [
        'Polar form r = a·sin θ / θ, with r = a at θ = 0.',
        'Passes through the pole whenever θ is a nonzero multiple of π.',
        'Cartesian form: (x² + y²)·arctan(y/x) = ay.',
        'Inversion turns it into the quadratrix of Hippias (product of radii 2a²/π).',
        'Symmetric about the x-axis.',
      ],
      zh: [
        '极坐标 r = a·sin θ / θ，θ = 0 时 r = a。',
        'θ 为 π 的非零整数倍时经过极点。',
        '直角坐标形式：(x² + y²)·arctan(y/x) = ay。',
        '反演后变成希庇亚斯割圆曲线（两半径之积为 2a²/π）。',
        '关于 x 轴对称。',
      ],
    },
    seenIn: {
      en: 'Polar plots of the sinc function and textbook examples of curve inversion.',
      zh: 'sinc 函数的极坐标图，以及教材里关于曲线反演的例子。',
    },
    prompt: {
      en: 'Animate the cochleoid r = sin θ / θ: sweep θ from −6π to 6π, pause each time r returns to zero at a multiple of π, then invert the curve in a circle of radius √(2/π) to reveal the quadratrix of Hippias.',
      zh: '演示蜗牛线 r = sin θ / θ：让 θ 从 −6π 走到 6π，每当 r 在 π 的整数倍处回到零就停一下；再在半径 √(2/π) 的圆中做反演，变出希庇亚斯割圆曲线。',
    },
    related: ['quadratrix-of-hippias', 'archimedean-spiral', 'hyperbolic-spiral'],
  },
  {
    slug: 'superformula',
    category: 'polar',
    name: { en: 'Superformula', zh: '超级公式曲线' },
    short: {
      en: 'Johan Gielis’s one formula for stars, flowers, squares and circles: four numbers reshape a single polar curve.',
      zh: 'Johan Gielis 的"一条公式画星星、花朵、方形和圆"：四个数改变同一条极坐标曲线。',
    },
    equations: [
      'r(\\varphi) = \\left(\\left|\\cos\\tfrac{m\\varphi}{4}\\right|^{n_2} + \\left|\\sin\\tfrac{m\\varphi}{4}\\right|^{n_3}\\right)^{-1/n_1}',
    ],
    params: [
      {
        key: 'm',
        label: { en: 'm (symmetry)', zh: 'm（对称数）' },
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 5,
      },
      {
        key: 'n1',
        label: { en: 'n₁', zh: 'n₁' },
        min: 0.2,
        max: 8,
        step: 0.1,
        defaultValue: 2,
      },
      {
        key: 'n2',
        label: { en: 'n₂', zh: 'n₂' },
        min: 0.5,
        max: 8,
        step: 0.5,
        defaultValue: 7,
      },
      {
        key: 'n3',
        label: { en: 'n₃', zh: 'n₃' },
        min: 0.5,
        max: 8,
        step: 0.5,
        defaultValue: 7,
      },
    ],
    fitMode: 'refit',
    sample: ({ m, n1, n2, n3 }) => [
      sweep(0, 2 * TAU, 2400, (t) => {
        const u = (m * t) / 4;
        const r =
          (Math.abs(Math.cos(u)) ** n2 + Math.abs(Math.sin(u)) ** n3) **
          (-1 / n1);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'In 2003 the biologist Johan Gielis published a generalisation of the superellipse in the American Journal of Botany: one polar formula with a symmetry number m and three exponents. Varying them produces circles, rounded polygons, stars and many shapes reminiscent of leaves, shells and flowers.',
        'The formula is a superellipse wrapped around the circle m/4 times. With m = 4 and all three exponents equal to 2 it is exactly the unit circle; raising the exponents squares it off; lowering n₁ pinches the sides into a star.',
      ],
      zh: [
        '2003 年，生物学家 Johan Gielis 在《美国植物学杂志》上发表了超椭圆的推广：一条带对称数 m 和三个指数的极坐标公式。改变这四个数，可以得到圆、圆角多边形、星形，以及许多像叶片、贝壳、花朵的形状。',
        '这条公式相当于把超椭圆绕圆周包了 m/4 圈。m = 4 且三个指数都等于 2 时，它正好是单位圆；指数调大会变方；n₁ 调小会把边捏成星形。',
      ],
    },
    properties: {
      en: [
        'm = 4 with n₁ = n₂ = n₃ = 2 gives the unit circle.',
        'With n₂ = n₃ and whole-number m, the shape has m-fold rotational symmetry.',
        'm = 4, n₁ = n₂ = n₃ = n gives the superellipse |x|ⁿ + |y|ⁿ = 1.',
        'The radius repeats every 4π/m in angle.',
        'Published by Johan Gielis in 2003.',
      ],
      zh: [
        'm = 4 且 n₁ = n₂ = n₃ = 2 时是单位圆。',
        'n₂ = n₃ 且 m 为整数时，图形有 m 重旋转对称。',
        'm = 4、n₁ = n₂ = n₃ = n 时就是超椭圆 |x|ⁿ + |y|ⁿ = 1。',
        '半径随角度每 4π/m 重复一次。',
        '由 Johan Gielis 于 2003 年发表。',
      ],
    },
    seenIn: {
      en: 'Generative art, procedural modelling of leaves and shells, and 3D tools that extend it to surfaces.',
      zh: '生成艺术、叶片与贝壳的程序化建模，以及把它推广到曲面的三维工具。',
    },
    prompt: {
      en: 'Animate the Gielis superformula: start from the circle (m = 4, n₁ = n₂ = n₃ = 2), raise the exponents to square it off, then set m = 5 and lower n₁ to morph it into a starfish, labelling each parameter as it changes.',
      zh: '演示 Gielis 超级公式：从圆（m = 4，n₁ = n₂ = n₃ = 2）开始，调大指数让它变方，再把 m 设为 5、调小 n₁，变成海星形，每改一个参数就标注出来。',
    },
    related: ['superellipse', 'rose-curve', 'maurer-rose'],
  },
  {
    slug: 'maurer-rose',
    category: 'polar',
    name: { en: 'Maurer rose', zh: 'Maurer 玫瑰' },
    short: {
      en: 'Walk around the rose r = sin nθ in steps of d degrees and join the dots: 361 straight lines weave a rose.',
      zh: '沿玫瑰线 r = sin nθ 每次前进 d 度，把点连起来：361 个点之间的直线织成一朵玫瑰。',
    },
    equations: ['r = \\sin(n\\theta)', '\\theta_k = k\\,d^\\circ,\\quad k = 0, 1, \\dots, 360'],
    params: [
      {
        key: 'n',
        label: { en: 'n (petals)', zh: 'n（花瓣参数）' },
        min: 1,
        max: 12,
        step: 1,
        defaultValue: 6,
      },
      {
        key: 'd',
        label: { en: 'd (degrees per step)', zh: 'd（每步度数）' },
        min: 1,
        max: 179,
        step: 1,
        defaultValue: 71,
      },
    ],
    fitMode: 'fixed',
    guideLines: 1,
    sample: ({ n, d }) => {
      const rose = sweep(0, TAU, 900, (t) => {
        const r = Math.sin(n * t);
        return [r * Math.cos(t), r * Math.sin(t)];
      });
      const lines: Array<[number, number]> = [];
      for (let k = 0; k <= 360; k += 1) {
        const t = (k * d * Math.PI) / 180;
        const r = Math.sin(n * t);
        lines.push([r * Math.cos(t), r * Math.sin(t)]);
      }
      return [rose, lines];
    },
    intro: {
      en: [
        'Peter Maurer described this construction in the American Mathematical Monthly in 1987. Take the rose r = sin nθ, mark the 361 points at angles 0°, d°, 2d°, … 360d°, and connect them in order with straight segments. The same rose underlies every picture; the step d decides the weave.',
        'Because the angles are taken in whole degrees, the polygon closes after at most 360 steps. Steps that share a large factor with 360 revisit the same few points and give sparse stars; steps like 29° or 71° visit many points and give dense, lace-like patterns.',
      ],
      zh: [
        'Peter Maurer 在 1987 年的《美国数学月刊》上描述了这种作法。取玫瑰线 r = sin nθ，在 0°、d°、2d°……360d° 处标出 361 个点，按顺序用线段连起来。每幅图背后都是同一朵玫瑰，步长 d 决定怎么"织"。',
        '因为角度都取整数度，折线最多 360 步就会闭合。与 360 有较大公因数的步长只会反复走过少数几个点，得到稀疏的星形；像 29°、71° 这样的步长会走过很多点，织出细密的花边。',
      ],
    },
    properties: {
      en: [
        'Vertices: (sin(nkd°), kd°) in polar form, for k = 0, 1, …, 360.',
        'The rose behind it, r = sin nθ, has n petals for odd n and 2n for even n.',
        'The polygon closes after 360 / gcd(d, 360) steps at most.',
        'Different d give different weaves on the same rose.',
        'Described by Peter M. Maurer in 1987.',
      ],
      zh: [
        '顶点在极坐标下为 (sin(nkd°), kd°)，k = 0, 1, …, 360。',
        '背后的玫瑰线 r = sin nθ：n 为奇数时 n 瓣，偶数时 2n 瓣。',
        '折线至多 360 / gcd(d, 360) 步就闭合。',
        '同一朵玫瑰，不同的 d 织出不同的图案。',
        '由 Peter M. Maurer 于 1987 年描述。',
      ],
    },
    seenIn: {
      en: 'Creative-coding exercises, string art, and introductions to polar coordinates.',
      zh: '创意编程练习、绕线画，以及极坐标的入门课。',
    },
    prompt: {
      en: 'Animate a Maurer rose with n = 6 and d = 71°: first draw the rose r = sin 6θ faintly, then connect the points at multiples of 71° one segment at a time until all 361 points are joined.',
      zh: '演示 n = 6、d = 71° 的 Maurer 玫瑰：先淡淡画出玫瑰线 r = sin 6θ，再把 71° 的整数倍处的点一段一段连起来，直到 361 个点全部连完。',
    },
    related: ['rose-curve', 'superformula', 'lissajous-curve'],
  },
];
