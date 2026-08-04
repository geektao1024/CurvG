import { gcd, sweep, TAU, type CurveDef } from '../types';

export const rouletteCurves: CurveDef[] = [
  {
    slug: 'cycloid',
    category: 'roulette',
    name: { en: 'Cycloid', zh: '摆线' },
    short: {
      en: 'The arch traced by a point on a rolling wheel — solution of both the brachistochrone and tautochrone problems.',
      zh: '滚动车轮边缘一点画出的拱形曲线——最速降线与等时降线两大问题的共同答案。',
    },
    equations: ['x = r(t - \\sin t)', 'y = r(1 - \\cos t)'],
    params: [
      {
        key: 'arches',
        label: { en: 'arches', zh: '拱数' },
        min: 1,
        max: 4,
        step: 1,
        defaultValue: 2,
      },
    ],
    fitMode: 'refit',
    sample: ({ arches }) => [
      sweep(0, arches * TAU, 1000, (t) => [t - Math.sin(t), 1 - Math.cos(t)]),
    ],
    intro: {
      en: [
        'Mark a point on the rim of a wheel and roll the wheel along a straight line: the point rises and falls in a chain of arches called the cycloid. Each arch spans 2πr horizontally and reaches height 2r, with a cusp where the point touches the ground. Galileo named the curve and tried to measure its area by weighing cut-outs of it.',
        'The cycloid earned the nickname “the Helen of geometers” for the quarrels it caused. It answers two famous physics questions at once: an upside-down cycloid is the brachistochrone (the fastest slide between two points under gravity, proved via the calculus of variations after Johann Bernoulli’s 1696 challenge) and the tautochrone (from any starting point, a bead reaches the bottom in the same time — Huygens’ route to an ideal pendulum clock).',
      ],
      zh: [
        '在车轮边缘做一个记号,让车轮沿直线滚动:这个点起起落落,画出一串拱形,这就是摆线。每个拱水平跨度 2πr、最高点 2r,落地处形成尖点。伽利略给这条曲线命名,并试图通过称量剪下的纸片来测它的面积。',
        '摆线因引发的争论之多被称为"几何学家的海伦"。它同时回答了两个著名的物理问题:倒扣的摆线是最速降线(重力作用下两点间下滑最快的轨道,约翰·伯努利 1696 年公开挑战后由变分法证明),也是等时降线(小球无论从曲线哪一点释放,滑到底部耗时相同——惠更斯据此设计理想摆钟)。',
      ],
    },
    properties: {
      en: [
        'One arch has length 8r — exactly four wheel diameters (Wren, 1658).',
        'The area under one arch is 3πr² — three times the rolling circle’s area.',
        'Cusps occur at every ground contact, where speed is momentarily zero.',
        'Inverted, it is both the brachistochrone and the tautochrone.',
        'Its evolute is another cycloid of the same size, shifted half an arch.',
      ],
      zh: [
        '一个拱的弧长为 8r——恰好四倍车轮直径(Wren,1658)。',
        '一个拱下方的面积为 3πr²——滚动圆面积的三倍。',
        '每次触地都形成尖点,该瞬间点的速度为零。',
        '倒置后,它同时是最速降线与等时降线。',
        '它的渐屈线是平移半个拱的同尺寸摆线。',
      ],
    },
    seenIn: {
      en: 'Skate-park transition profiles, Huygens’ pendulum clock cheeks, gear design ancestors, and every calculus-of-variations course.',
      zh: '滑板场地的过渡剖面、惠更斯摆钟的摆线颊板、齿轮设计的前身,以及每一门变分法课程。',
    },
    prompt: {
      en: 'Animate a cycloid: roll a unit circle along a line with the tracing point marked, draw two full arches, pause at a cusp to show zero velocity, then flip the curve and drop two beads from different heights to demonstrate the tautochrone property.',
      zh: '演示摆线:让单位圆沿直线滚动并标记圆周上的描点,画出两个完整的拱,在尖点处暂停以说明该瞬间速度为零;再把曲线倒置,从不同高度释放两颗小球,演示等时降线性质。',
    },
    related: ['epicycloid', 'hypocycloid', 'involute-of-a-circle'],
  },
  {
    slug: 'epicycloid',
    category: 'roulette',
    name: { en: 'Epicycloid', zh: '外摆线' },
    short: {
      en: 'The flower of cusps traced by a circle rolling outside a fixed circle; k = R/r sets the cusp count.',
      zh: '小圆在定圆外侧滚动时描出的带尖花形;k = R/r 决定尖点数量。',
    },
    equations: [
      'x = (R+r)\\cos t - r\\cos\\!\\big(\\tfrac{R+r}{r}t\\big)',
      'y = (R+r)\\sin t - r\\sin\\!\\big(\\tfrac{R+r}{r}t\\big)',
    ],
    params: [
      {
        key: 'k',
        label: { en: 'k = R / r (cusps)', zh: 'k = R / r(尖点数)' },
        min: 1,
        max: 8,
        step: 1,
        defaultValue: 5,
      },
    ],
    fitMode: 'refit',
    sample: ({ k }) => {
      const r = 1 / k;
      const base = sweep(0, TAU, 200, (t) => [Math.cos(t), Math.sin(t)]);
      const curve = sweep(0, TAU, 1200, (t) => [
        (1 + r) * Math.cos(t) - r * Math.cos((k + 1) * t),
        (1 + r) * Math.sin(t) - r * Math.sin((k + 1) * t),
      ]);
      return [base, curve];
    },
    intro: {
      en: [
        'Roll a circle of radius r around the outside of a fixed circle of radius R, and a rim point traces the epicycloid. When the ratio k = R/r is an integer the curve closes after one lap with exactly k outward-pointing cusps: k = 1 gives the cardioid, k = 2 the nephroid.',
        'Epicycles — circles rolling on circles — carried planetary astronomy from Ptolemy to Copernicus, and the same geometry now shapes the flanks of cycloidal gears in clocks and reducers. The cusps are where the tracing point momentarily touches the base circle and reverses its radial motion.',
      ],
      zh: [
        '半径为 r 的小圆沿半径为 R 的定圆外侧滚动,小圆边缘一点画出外摆线。当比值 k = R/r 为整数时,曲线滚一圈即闭合,恰有 k 个朝外的尖点:k = 1 是心脏线,k = 2 是肾形线。',
        '"圆上滚圆"的本轮几何支撑了从托勒密到哥白尼的行星天文学,同样的几何如今塑造着钟表与减速器中摆线齿轮的齿侧。尖点出现在描点瞬间触碰基圆、径向运动反向的时刻。',
      ],
    },
    properties: {
      en: [
        'Integer k = R/r → k cusps and closure after one revolution.',
        'One arch has length 8r(R+r)/R; total length 8(R+r) for integer k.',
        'Enclosed area: π(R+r)(R+2r).',
        'k = 1 is the cardioid; k = 2 is the nephroid.',
        'Rational k = p/q closes after q revolutions; irrational k never closes.',
      ],
      zh: [
        'k = R/r 为整数时,共 k 个尖点,滚一圈闭合。',
        '每个拱的弧长为 8r(R+r)/R;k 为整数时总长 8(R+r)。',
        '围成面积为 π(R+r)(R+2r)。',
        'k = 1 即心脏线,k = 2 即肾形线。',
        'k = p/q 为有理数时滚 q 圈闭合;k 为无理数时永不闭合。',
      ],
    },
    seenIn: {
      en: 'Cycloidal gear teeth, historical planetary epicycles, spirograph toys, and rotary engine geometry.',
      zh: '摆线齿轮齿形、历史上的行星本轮模型、万花尺玩具,以及旋转发动机几何。',
    },
    prompt: {
      en: 'Animate an epicycloid with k = 5: show the small circle rolling outside the fixed circle, trace the five-cusped curve, then morph k through 1 and 2 to reveal the cardioid and nephroid as special cases.',
      zh: '演示 k = 5 的外摆线:小圆沿定圆外侧滚动,描出五个尖点的曲线;再把 k 变到 1 和 2,展示心脏线与肾形线这两个特例。',
    },
    related: ['cardioid', 'nephroid', 'hypocycloid', 'epitrochoid'],
  },
  {
    slug: 'hypocycloid',
    category: 'roulette',
    name: { en: 'Hypocycloid', zh: '内摆线' },
    short: {
      en: 'The star traced by a circle rolling inside a fixed circle; k = 3 gives the deltoid, k = 4 the astroid.',
      zh: '小圆在定圆内侧滚动画出的星形;k = 3 是三尖瓣线,k = 4 是星形线。',
    },
    equations: [
      'x = (R-r)\\cos t + r\\cos\\!\\big(\\tfrac{R-r}{r}t\\big)',
      'y = (R-r)\\sin t - r\\sin\\!\\big(\\tfrac{R-r}{r}t\\big)',
    ],
    params: [
      {
        key: 'k',
        label: { en: 'k = R / r (cusps)', zh: 'k = R / r(尖点数)' },
        min: 3,
        max: 9,
        step: 1,
        defaultValue: 5,
      },
    ],
    fitMode: 'refit',
    sample: ({ k }) => {
      const r = 1 / k;
      const base = sweep(0, TAU, 200, (t) => [Math.cos(t), Math.sin(t)]);
      const curve = sweep(0, TAU, 1200, (t) => [
        (1 - r) * Math.cos(t) + r * Math.cos((k - 1) * t),
        (1 - r) * Math.sin(t) - r * Math.sin((k - 1) * t),
      ]);
      return [base, curve];
    },
    intro: {
      en: [
        'Let a circle roll without slipping around the inside of a larger circle: a point on its rim traces the hypocycloid, a star with k = R/r inward-curving sides when the ratio is an integer. The family contains famous members — k = 3 is the deltoid, k = 4 the astroid.',
        'The case k = 2 is a genuine surprise: the traced “curve” degenerates to a straight diameter. This Tusi couple, described by Nasir al-Din al-Tusi in 1247, converts rotation into exact straight-line motion and reappeared centuries later in Copernican astronomy and in mechanical linkages.',
      ],
      zh: [
        '让小圆在大圆内侧无滑动地滚动:圆周上一点描出内摆线。当 k = R/r 为整数时,得到有 k 条内凹边的星形——k = 3 是三尖瓣线,k = 4 是星形线。',
        'k = 2 的情形出人意料:轨迹退化成一条直径。这就是纳西尔丁·图西在 1247 年描述的图西双圆(Tusi couple),它把旋转精确转化为直线运动,几个世纪后又出现在哥白尼的天文学与各种机械连杆中。',
      ],
    },
    properties: {
      en: [
        'Integer k = R/r → k cusps; the curve stays inside the fixed circle.',
        'k = 2 degenerates to a straight diameter (the Tusi couple).',
        'One arch has length 8r(R−r)/R; enclosed area is π(R−r)(R−2r).',
        'k = 3 is the deltoid; k = 4 is the astroid.',
        'The cusps touch the fixed circle where the tracing point meets it.',
      ],
      zh: [
        'k = R/r 为整数时有 k 个尖点,曲线始终位于定圆内部。',
        'k = 2 时退化为一条直径(图西双圆)。',
        '每个拱的弧长为 8r(R−r)/R,围成面积为 π(R−r)(R−2r)。',
        'k = 3 是三尖瓣线,k = 4 是星形线。',
        '尖点恰在描点接触定圆的位置。',
      ],
    },
    seenIn: {
      en: 'The Tusi couple in astronomy, cycloidal speed reducers, spirograph patterns, and star-shaped engineering logos.',
      zh: '天文学中的图西双圆、摆线针轮减速器、万花尺图案,以及各种星形工程标志。',
    },
    prompt: {
      en: 'Animate a hypocycloid with k = 5: roll the small circle inside the fixed circle and trace the five-pointed star; then set k = 2 and show the astonishing degenerate case where the point moves along a straight diameter.',
      zh: '演示 k = 5 的内摆线:小圆在定圆内滚动,描出五角星形;再把 k 设为 2,展示描点沿直径做直线运动的惊人退化情形。',
    },
    related: ['astroid', 'deltoid-curve', 'epicycloid', 'hypotrochoid'],
  },
  {
    slug: 'hypotrochoid',
    category: 'roulette',
    name: { en: 'Hypotrochoid', zh: '内旋轮线' },
    short: {
      en: 'The spirograph curve: a pen fixed at distance d from the center of a circle rolling inside another.',
      zh: '万花尺曲线:笔尖固定在小圆内距圆心 d 处,小圆沿大圆内侧滚动。',
    },
    equations: [
      'x = (R-r)\\cos t + d\\cos\\!\\big(\\tfrac{R-r}{r}t\\big)',
      'y = (R-r)\\sin t - d\\sin\\!\\big(\\tfrac{R-r}{r}t\\big)',
    ],
    params: [
      {
        key: 'R',
        label: { en: 'R (fixed ring)', zh: 'R(固定环)' },
        min: 3,
        max: 9,
        step: 1,
        defaultValue: 5,
      },
      {
        key: 'r',
        label: { en: 'r (rolling wheel)', zh: 'r(滚动轮)' },
        min: 1,
        max: 8,
        step: 1,
        defaultValue: 3,
      },
      {
        key: 'd',
        label: { en: 'd (pen offset)', zh: 'd(笔尖偏距)' },
        min: 0.5,
        max: 8,
        step: 0.5,
        defaultValue: 5,
      },
    ],
    fitMode: 'refit',
    sample: ({ R, r, d }) => {
      const turns = r / gcd(R, r);
      return [
        sweep(0, turns * TAU, 1600, (t) => [
          (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t),
          (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t),
        ]),
      ];
    },
    intro: {
      en: [
        'The hypotrochoid generalizes the hypocycloid: the drawing point sits at any distance d from the rolling circle’s center, not just on the rim. With d < r the cusps soften into waves; with d > r they blossom into loops. This is exactly the geometry of the Spirograph toy — the pen hole you choose is the parameter d.',
        'Closure is pure number theory: the pattern completes after r/gcd(R, r) trips around the ring, so the lobe count and the density of the lacework are read directly off the integers R and r. The classic Spirograph look, R = 5, r = 3, d = 5, closes after three laps with a rich three-fold symmetry.',
      ],
      zh: [
        '内旋轮线是内摆线的推广:描点可以位于滚动圆内外距圆心任意距离 d 处,而不限于圆周上。d < r 时尖点软化为波浪;d > r 时绽放成小环。这正是万花尺玩具的几何——你选择的笔孔位置就是参数 d。',
        '闭合条件是纯粹的数论:图案在绕环 r/gcd(R, r) 圈后完成,花瓣数量与花纹密度可以直接从整数 R、r 读出。经典万花尺造型 R = 5、r = 3、d = 5 绕三圈闭合,呈现丰富的三重对称。',
      ],
    },
    properties: {
      en: [
        'd = r recovers the hypocycloid; d = 0 gives a circle.',
        'The pattern closes after r/gcd(R, r) revolutions around the ring.',
        'R = 2r produces an ellipse for any d — a rolling-circle ellipsograph.',
        'Cusps (d = r), waves (d < r), or loops (d > r) — one parameter decides.',
        'All hypotrochoids stay within radius R − r + d of the center.',
      ],
      zh: [
        'd = r 时退回内摆线;d = 0 时是圆。',
        '图案绕环 r/gcd(R, r) 圈后闭合。',
        'R = 2r 时,无论 d 取何值都画出椭圆——滚圆式椭圆规。',
        '尖点(d = r)、波浪(d < r)、小环(d > r)——一个参数决定形态。',
        '所有内旋轮线都位于距中心 R − r + d 的半径范围内。',
      ],
    },
    seenIn: {
      en: 'The Spirograph toy, guilloché engraving on banknotes and watch faces, and harmonic drawing machines.',
      zh: '万花尺玩具、钞票与表盘上的扭索纹雕刻,以及谐波绘图机。',
    },
    prompt: {
      en: 'Animate the spirograph hypotrochoid with R = 5, r = 3, d = 5: show the small wheel rolling inside the ring with the pen at offset d, trace the pattern through its three closing laps, and count the lobes.',
      zh: '演示万花尺内旋轮线 R = 5、r = 3、d = 5:小轮在环内滚动,笔尖偏距为 d,完整画出三圈闭合的图案,并数出花瓣数量。',
    },
    related: ['hypocycloid', 'epitrochoid', 'lissajous-curve', 'astroid'],
  },
  {
    slug: 'epitrochoid',
    category: 'roulette',
    name: { en: 'Epitrochoid', zh: '外旋轮线' },
    short: {
      en: 'The outer-rolling trochoid family whose two-lobed member shapes the Wankel rotary engine housing.',
      zh: '小圆外滚的旋轮线家族,其双瓣成员正是转子发动机缸体的轮廓。',
    },
    equations: [
      'x = (R+r)\\cos t - d\\cos\\!\\big(\\tfrac{R+r}{r}t\\big)',
      'y = (R+r)\\sin t - d\\sin\\!\\big(\\tfrac{R+r}{r}t\\big)',
    ],
    params: [
      {
        key: 'R',
        label: { en: 'R (fixed circle)', zh: 'R(定圆)' },
        min: 2,
        max: 8,
        step: 1,
        defaultValue: 3,
      },
      {
        key: 'r',
        label: { en: 'r (rolling circle)', zh: 'r(滚动圆)' },
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 1,
      },
      {
        key: 'd',
        label: { en: 'd (pen offset)', zh: 'd(笔尖偏距)' },
        min: 0.2,
        max: 4,
        step: 0.2,
        defaultValue: 2,
      },
    ],
    fitMode: 'refit',
    sample: ({ R, r, d }) => {
      const turns = r / gcd(R, r);
      return [
        sweep(0, turns * TAU, 1600, (t) => [
          (R + r) * Math.cos(t) - d * Math.cos(((R + r) / r) * t),
          (R + r) * Math.sin(t) - d * Math.sin(((R + r) / r) * t),
        ]),
      ];
    },
    intro: {
      en: [
        'The epitrochoid is the outside-rolling counterpart of the hypotrochoid: a circle of radius r rolls around a fixed circle of radius R while a point rigidly attached at distance d from its center draws the curve. On the rim (d = r) it reduces to the epicycloid; off the rim it produces waves or loops.',
        'Its most famous member has R = 2r with a suitable d: a smooth two-lobed peanut shape. Rotate a Reuleaux-style triangular rotor inside it and all three rotor tips stay in contact with the wall — the working principle of the Wankel rotary engine that powered Mazda’s RX series.',
      ],
      zh: [
        '外旋轮线是内旋轮线的外滚版本:半径 r 的小圆绕半径 R 的定圆外侧滚动,固定在距小圆圆心 d 处的一点画出曲线。d = r 时退回外摆线;偏离圆周则出现波浪或小环。',
        '它最著名的成员取 R = 2r 与合适的 d:一条光滑的双瓣"花生"轮廓。让类勒洛三角形转子在其中旋转,三个角尖能始终贴住内壁——这正是马自达 RX 系列转子发动机(汪克尔发动机)的工作原理。',
      ],
    },
    properties: {
      en: [
        'd = r recovers the epicycloid; d = 0 gives a circle of radius R + r.',
        'Closes after r/gcd(R, r) revolutions around the fixed circle.',
        'R = 2r with moderate d gives the two-lobed Wankel housing profile.',
        'Ptolemy’s planetary model of deferents and epicycles traces epitrochoids.',
        'The curve stays within radius R + r + d of the center.',
      ],
      zh: [
        'd = r 时退回外摆线;d = 0 时是半径 R + r 的圆。',
        '绕定圆 r/gcd(R, r) 圈后闭合。',
        'R = 2r 配合适当的 d,给出汪克尔发动机缸体的双瓣轮廓。',
        '托勒密"均轮 + 本轮"的行星模型画出的正是外旋轮线。',
        '曲线位于距中心 R + r + d 的半径范围内。',
      ],
    },
    seenIn: {
      en: 'Wankel rotary engine housings, Ptolemaic planetary paths, spirograph outer-ring patterns, and guilloché ornament.',
      zh: '转子发动机缸体、托勒密行星轨迹、万花尺外环图案,以及扭索纹装饰。',
    },
    prompt: {
      en: 'Animate the epitrochoid with R = 2, r = 1, d = 1.5: roll the small circle around the fixed circle with the pen offset inside it, trace the two-lobed housing shape, then place a triangular rotor inside and rotate it keeping all three tips on the wall.',
      zh: '演示外旋轮线 R = 2、r = 1、d = 1.5:小圆绕定圆滚动、笔尖偏于圆内,画出双瓣缸体轮廓;再放入三角转子旋转,保持三个角尖始终贴壁。',
    },
    related: ['epicycloid', 'hypotrochoid', 'cardioid'],
  },
  {
    slug: 'astroid',
    category: 'roulette',
    name: { en: 'Astroid', zh: '星形线' },
    short: {
      en: 'The four-cusped star x^{2/3} + y^{2/3} = a^{2/3}, also the envelope of a sliding ladder.',
      zh: '四尖点星形 x^{2/3} + y^{2/3} = a^{2/3},同时是滑动梯子的包络线。',
    },
    equations: [
      'x^{2/3} + y^{2/3} = a^{2/3}',
      'x = a\\cos^3 t, \\quad y = a\\sin^3 t',
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
      sweep(0, TAU, 800, (t) => [
        a * Math.cos(t) ** 3,
        a * Math.sin(t) ** 3,
      ]),
    ],
    intro: {
      en: [
        'The astroid is the four-cusped hypocycloid: roll a circle inside a circle four times its radius and a rim point draws the star x^{2/3} + y^{2/3} = a^{2/3}. The exponent 2/3 makes it the Lamé curve (superellipse) with n = 2/3 — the concave extreme of that family.',
        'It has a second, entirely different construction: slide a ladder of fixed length down a wall, and the region the ladder can never enter is bounded by an astroid. In other words, the astroid is the envelope of all segments of length a with endpoints on the two axes — a staple of envelope and related-rates problems.',
      ],
      zh: [
        '星形线是四尖点的内摆线:小圆在半径为其四倍的大圆内滚动,圆周上一点画出星形 x^{2/3} + y^{2/3} = a^{2/3}。指数 2/3 使它成为 Lamé 曲线(超椭圆)族中 n = 2/3 的成员——该家族的内凹极端。',
        '它还有另一种完全不同的构造:让固定长度的梯子沿墙下滑,梯子永远进不去的区域,其边界就是星形线。换句话说,星形线是两端点分别落在坐标轴上、长度为 a 的所有线段的包络——包络问题与相关变化率问题里的常客。',
      ],
    },
    properties: {
      en: [
        'Perimeter 6a and area 3πa²/8 — both elementary despite the cusps.',
        'It is the hypocycloid with k = 4 (R = 4r).',
        'Envelope of a segment of length a sliding with ends on the axes.',
        'Every tangent line cuts the axes in a segment of constant length a.',
        'It is the evolute of an ellipse, stretched by the axis ratio.',
      ],
      zh: [
        '周长 6a、面积 3πa²/8——尽管有尖点,两者都是初等值。',
        '它是 k = 4(即 R = 4r)的内摆线。',
        '它是两端在坐标轴上滑动、长为 a 的线段的包络。',
        '每条切线被两坐标轴截出的线段长度恒为 a。',
        '它与椭圆的渐屈线只差一个轴向伸缩。',
      ],
    },
    seenIn: {
      en: 'The sliding-ladder problem, caustics of some reflected light patterns, and stress-line visualizations in mechanics.',
      zh: '滑梯子问题、某些反射光焦散图样,以及力学中的应力线可视化。',
    },
    prompt: {
      en: 'Animate the astroid two ways: first roll a small circle inside a circle of four times its radius to trace the star, then slide a fixed-length segment with its ends on the axes and reveal the same astroid as the envelope.',
      zh: '用两种方式演示星形线:先让小圆在四倍半径的大圆内滚动描出星形;再让定长线段两端沿坐标轴滑动,展示其包络恰为同一条星形线。',
    },
    related: ['hypocycloid', 'deltoid-curve', 'superellipse', 'ellipse'],
  },
  {
    slug: 'deltoid-curve',
    category: 'roulette',
    name: { en: 'Deltoid', zh: '三尖瓣线' },
    short: {
      en: 'The three-cusped hypocycloid, home of Steiner’s theorem: all Simson lines of a triangle envelope a deltoid.',
      zh: '三尖点内摆线,Steiner 定理的主角:三角形的所有 Simson 线的包络是一条三尖瓣线。',
    },
    equations: [
      'x = r(2\\cos t + \\cos 2t)',
      'y = r(2\\sin t - \\sin 2t)',
    ],
    params: [
      {
        key: 'r',
        label: { en: 'r (rolling radius)', zh: 'r(滚动圆半径)' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ r }) => [
      sweep(0, TAU, 800, (t) => [
        r * (2 * Math.cos(t) + Math.cos(2 * t)),
        r * (2 * Math.sin(t) - Math.sin(2 * t)),
      ]),
    ],
    intro: {
      en: [
        'The deltoid — named for the Greek letter Δ it resembles — is the hypocycloid with three cusps, traced inside a circle three times the rolling radius. Euler met it in 1745 while studying optical caustics; Jakob Steiner’s 1856 study made it famous enough to also be called Steiner’s curve.',
        'Steiner’s theorem is its showpiece: take any triangle, and for every point on its circumcircle draw the Simson line (the line through the feet of the perpendiculars to the three sides). All of these lines are tangent to a single deltoid. The curve also solved Kakeya’s needle question among convex-ish sets: a unit needle can be rotated 180° inside a deltoid of area π/8.',
      ],
      zh: [
        '三尖瓣线因形似希腊字母 Δ 得名,是三个尖点的内摆线,由小圆在三倍半径的定圆内滚动画出。欧拉在 1745 年研究光学焦散时遇到它;Steiner 在 1856 年的研究让它声名大噪,因此也叫 Steiner 曲线。',
        'Steiner 定理是它的代表作:任取一个三角形,对外接圆上的每一点作 Simson 线(过该点向三边所作垂足的连线),所有这些 Simson 线都与同一条三尖瓣线相切。它还回答了 Kakeya 掉头问题的一个经典情形:单位长的针可以在面积仅 π/8 的三尖瓣线内旋转 180°。',
      ],
    },
    properties: {
      en: [
        'Perimeter 16r and area 2πr² (twice the rolling circle).',
        'It is the hypocycloid with k = 3 (R = 3r).',
        'Any tangent chord between two branches has constant length 4r.',
        'Envelope of the Simson lines of any triangle (Steiner’s theorem).',
        'A unit segment can rotate fully inside a deltoid of area π/8.',
      ],
      zh: [
        '周长 16r,面积 2πr²(滚动圆面积的两倍)。',
        '它是 k = 3(R = 3r)的内摆线。',
        '夹在两支曲线之间的切线弦长恒为 4r。',
        '任意三角形的 Simson 线族的包络(Steiner 定理)。',
        '单位线段可以在面积 π/8 的三尖瓣线内完成 180° 掉头。',
      ],
    },
    seenIn: {
      en: 'Triangle geometry (Simson lines), the Kakeya needle problem, and cam profiles with three-fold symmetry.',
      zh: '三角形几何(Simson 线)、Kakeya 掉头针问题,以及三重对称的凸轮轮廓。',
    },
    prompt: {
      en: 'Animate the deltoid: roll a circle inside a circle of three times its radius to trace the three-cusped curve, then draw a triangle with its circumcircle and sweep the Simson lines to show them enveloping the same deltoid shape.',
      zh: '演示三尖瓣线:小圆在三倍半径的定圆内滚动,描出三尖点曲线;再画一个三角形及其外接圆,扫过它的 Simson 线族,展示其包络正是三尖瓣线。',
    },
    related: ['astroid', 'hypocycloid', 'nephroid'],
  },
  {
    slug: 'nephroid',
    category: 'roulette',
    name: { en: 'Nephroid', zh: '肾形线' },
    short: {
      en: 'The two-cusped epicycloid — the bright caustic you see when sunlight reflects inside a cup.',
      zh: '双尖点外摆线——阳光在杯壁内反射时看到的亮线正是它。',
    },
    equations: [
      'x = r(3\\cos t - \\cos 3t)',
      'y = r(3\\sin t - \\sin 3t)',
    ],
    params: [
      {
        key: 'r',
        label: { en: 'r (rolling radius)', zh: 'r(滚动圆半径)' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ r }) => [
      sweep(0, TAU, 800, (t) => [
        r * (3 * Math.cos(t) - Math.cos(3 * t)),
        r * (3 * Math.sin(t) - Math.sin(3 * t)),
      ]),
    ],
    intro: {
      en: [
        'The nephroid — “kidney-shaped” — is the epicycloid with two cusps, traced by a circle rolling around a fixed circle of twice its radius. Proctor named it in 1878, though Huygens had already connected it to optics in 1678.',
        'It is the everyday caustic: when parallel rays (sunlight) reflect off the inside of a circular cup, the reflected rays envelope one half of a nephroid — the bright cusped line on the surface of your coffee. A point source on the rim gives a cardioid instead; the two curves are cousins that answer slightly different lighting setups.',
      ],
      zh: [
        '肾形线(nephroid,"肾形"之意)是有两个尖点的外摆线,由小圆绕半径为其两倍的定圆滚动画出。Proctor 在 1878 年命名了它,而惠更斯早在 1678 年就把它与光学联系起来。',
        '它是日常生活里的焦散线:平行光(阳光)在圆柱形杯壁内反射后,反射光线的包络恰是半条肾形线——咖啡表面那道带尖点的亮线。若光源位于杯沿一点,得到的则是心脏线;两条曲线是回答不同打光方式的近亲。',
      ],
    },
    properties: {
      en: [
        'Arc length 24r and area 12πr².',
        'It is the epicycloid with k = 2 (R = 2r).',
        'Caustic of a circle under parallel light — the coffee-cup curve.',
        'Its evolute is another nephroid, half the size and rotated 90°.',
        'The name comes from the Greek nephros, “kidney”.',
      ],
      zh: [
        '弧长 24r,面积 12πr²。',
        '它是 k = 2(R = 2r)的外摆线。',
        '平行光照射圆的焦散线——"咖啡杯曲线"。',
        '它的渐屈线是缩小一半并旋转 90° 的另一条肾形线。',
        '名字来自希腊语 nephros,意为"肾"。',
      ],
    },
    seenIn: {
      en: 'Coffee-cup light caustics, reflector design, and epicycloid families in gear geometry.',
      zh: '咖啡杯光焦散、反射器设计,以及齿轮几何中的外摆线家族。',
    },
    prompt: {
      en: 'Animate the nephroid as a caustic: send parallel rays into a semicircular mirror, reflect each ray, and let the reflected family build up until its envelope — the two-cusped nephroid — emerges brightly.',
      zh: '把肾形线作为焦散来演示:向半圆镜内射入一组平行光线,逐条画出反射线,让反射线族逐渐累积,直到包络——双尖点的肾形线——清晰浮现。',
    },
    related: ['cardioid', 'epicycloid', 'deltoid-curve'],
  },
];
