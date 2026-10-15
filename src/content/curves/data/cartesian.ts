import { polarPieces, sweep, TAU, type CurveDef } from '../types';

export const cartesianCurves: CurveDef[] = [
  {
    slug: 'sine-wave',
    category: 'cartesian',
    name: { en: 'Sine Wave', zh: '正弦曲线' },
    short: {
      en: 'The graph y = A·sin(ωx) of pure oscillation — the atom every periodic signal is built from.',
      zh: '纯振荡的图像 y = A·sin(ωx)——一切周期信号的基本原子。',
    },
    equations: ['y = A\\sin(\\omega x)'],
    params: [
      {
        key: 'A',
        label: { en: 'A (amplitude)', zh: 'A（振幅）' },
        min: 0.3,
        max: 1.8,
        step: 0.05,
        defaultValue: 1.2,
      },
      {
        key: 'w',
        label: { en: 'ω (angular frequency)', zh: 'ω（角频率）' },
        min: 0.5,
        max: 4,
        step: 0.25,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ A, w }) => [
      sweep(0, 4 * Math.PI, 800, (x) => [x, A * Math.sin(w * x)]),
    ],
    intro: {
      en: [
        'The sine wave y = A·sin(ωx) is the shadow of uniform circular motion: project a point moving around a circle onto a line, stretch time along an axis, and this is the graph you get. Amplitude A sets the height, angular frequency ω sets how many radians fit per unit — the period is 2π/ω.',
        'Its special status comes from Fourier’s theorem: any reasonable periodic signal decomposes into a sum of sines and cosines. That single fact makes the sine wave the working currency of acoustics, AC power, radio, and signal processing — and the first curve every trigonometry student learns to transform.',
      ],
      zh: [
        '正弦曲线 y = A·sin(ωx) 是匀速圆周运动的投影：把绕圆运动的点投影到一条直线上，再让时间沿横轴展开，得到的就是这条图像。振幅 A 决定高度，角频率 ω 决定单位长度里装下多少弧度——周期为 2π/ω。',
        '它的特殊地位来自傅里叶定理：任何合理的周期信号都能分解为正弦与余弦之和。仅这一条事实，就让正弦波成为声学、交流电、无线电与信号处理的通用货币——也是每个三角函数初学者最先学会变换的曲线。',
      ],
    },
    properties: {
      en: [
        'Period 2π/ω, amplitude A, zeros at x = kπ/ω.',
        'It is the projection of uniform circular motion onto a diameter.',
        'Derivative is a cosine — the same wave shifted left by a quarter period.',
        'Fourier’s theorem: periodic signals are sums of sines and cosines.',
        'Simple harmonic motion (mass on a spring, small pendulum) graphs as a sine wave in time.',
      ],
      zh: [
        '周期 2π/ω，振幅 A，零点位于 x = kπ/ω。',
        '它是匀速圆周运动在直径上的投影。',
        '导数是余弦——同一条波形向左平移四分之一周期。',
        '傅里叶定理：周期信号可分解为正弦与余弦之和。',
        '简谐运动（弹簧振子、小摆角单摆）随时间的图像就是正弦曲线。',
      ],
    },
    seenIn: {
      en: 'Sound and radio waves, AC electricity, tides, oscilloscope screens, and every trigonometry classroom.',
      zh: '声波与无线电波、交流电、潮汐、示波器屏幕，以及每一间三角函数教室。',
    },
    prompt: {
      en: 'Animate the sine wave as a projection: move a point around a unit circle, project its height onto a time axis to draw y = sin x, then vary amplitude to 1.5 and frequency to 2 while keeping the circle-projection link visible.',
      zh: '把正弦波演示为投影：点绕单位圆运动，把它的高度投影到时间轴上画出 y = sin x；再把振幅调到 1.5、频率调到 2，全程保持"圆周运动 ↔ 波形"的对应关系可见。',
    },
    related: ['lissajous-curve', 'catenary', 'parabola'],
  },
  {
    slug: 'catenary',
    category: 'cartesian',
    name: { en: 'Catenary', zh: '悬链线' },
    short: {
      en: 'The hyperbolic-cosine curve y = a·cosh(x/a) of a hanging chain — subtly different from a parabola.',
      zh: '悬挂链条形成的双曲余弦曲线 y = a·cosh(x/a)——与抛物线貌似而神异。',
    },
    equations: ['y = a\\cosh\\frac{x}{a} = \\frac{a}{2}\\big(e^{x/a} + e^{-x/a}\\big)'],
    params: [
      {
        key: 'a',
        label: { en: 'a (sag parameter)', zh: 'a（垂度参数）' },
        min: 0.5,
        max: 1.6,
        step: 0.05,
        defaultValue: 0.9,
      },
    ],
    fitMode: 'refit',
    sample: ({ a }) => [
      sweep(-1.6, 1.6, 500, (x) => [x, a * Math.cosh(x / a)]),
    ],
    intro: {
      en: [
        'Hang a uniform chain from two points and it settles into the catenary y = a·cosh(x/a). Galileo guessed the shape was a parabola; Joachim Jungius disproved that experimentally, and in 1691 Leibniz, Huygens, and Johann Bernoulli each derived the true equation in response to Jakob Bernoulli’s challenge. The name comes from the Latin catena, “chain”.',
        'Flip it upside down and the pure-tension chain becomes a pure-compression arch — Robert Hooke’s insight “as hangs the flexible line, so but inverted will stand the rigid arch”. That is why the Gateway Arch in St. Louis and Gaudí’s hanging-chain models follow (weighted) catenaries rather than parabolas.',
      ],
      zh: [
        '把一条均匀链条挂在两点之间，它自然垂成悬链线 y = a·cosh(x/a)。伽利略猜想它是抛物线；Jungius 用实验推翻了这一猜想，1691 年莱布尼茨、惠更斯与约翰·伯努利响应雅各布·伯努利的挑战，分别推导出真正的方程。名字来自拉丁语 catena，意为"链条"。',
        '把它倒过来，纯受拉的链条就变成纯受压的拱——这是胡克的洞见："柔线如何下垂，刚拱便如何倒立而立"。因此圣路易斯大拱门与高迪的悬链模型遵循的是（加权）悬链线，而不是抛物线。',
      ],
    },
    properties: {
      en: [
        'Arc length from the vertex: s = a·sinh(x/a); the sag-to-tension geometry is all in one constant a.',
        'The horizontal tension component is constant along the chain.',
        'Near the vertex it is approximated by the parabola y ≈ a + x²/(2a) — the source of Galileo’s confusion.',
        'Rotating it about the x-axis gives the catenoid, the only non-planar minimal surface of revolution.',
        'A square wheel rolls smoothly on a road made of inverted catenary humps.',
      ],
      zh: [
        '从顶点起的弧长为 s = a·sinh(x/a)；垂度与张力的几何全部由常数 a 决定。',
        '链条中水平方向的张力分量处处相同。',
        '顶点附近可用抛物线 y ≈ a + x²/(2a) 近似——伽利略混淆的根源。',
        '绕 x 轴旋转得到悬链面：唯一的非平面旋转极小曲面。',
        '方形轮子可以在由倒悬链线拼成的路面上平稳滚动。',
      ],
    },
    seenIn: {
      en: 'Hanging cables and chains, the Gateway Arch, Gaudí’s architecture, suspension bridge design, and soap-film catenoids.',
      zh: '悬挂的缆索与链条、圣路易斯大拱门、高迪的建筑、悬索桥设计，以及肥皂膜悬链面。',
    },
    prompt: {
      en: 'Animate the catenary: hang a chain of dots between two posts and let it settle into y = a·cosh(x/a), overlay the best-fit parabola to show the mismatch near the ends, then flip the curve into an arch.',
      zh: '演示悬链线：在两根立柱间挂一串珠点，让它稳定成 y = a·cosh(x/a)；叠加最佳拟合抛物线，展示两端附近的偏差；最后把曲线倒置成拱。',
    },
    related: ['parabola', 'tractrix', 'sine-wave'],
  },
  {
    slug: 'tractrix',
    category: 'cartesian',
    name: { en: 'Tractrix', zh: '曳物线' },
    short: {
      en: 'The “drag curve” with a constant-length tangent — rotate it and you get the pseudosphere of hyperbolic geometry.',
      zh: '切线段长度恒定的"拖曳曲线"——旋转它便得到双曲几何的伪球面。',
    },
    equations: [
      'x = a(t - \\tanh t), \\quad y = \\frac{a}{\\cosh t}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (leash length)', zh: 'a（拖绳长度）' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(-4.4, 4.4, 800, (t) => [
        a * (t - Math.tanh(t)),
        a / Math.cosh(t),
      ]),
    ],
    intro: {
      en: [
        'Drag a reluctant object by a leash of length a while you walk along a straight line: the object traces the tractrix. Claude Perrault posed the puzzle in Paris around 1670 with his pocket watch on a table; Huygens named the curve and Leibniz analyzed it in 1693. Its defining property is built into the story: the tangent segment from the curve to the pulling line always has length exactly a.',
        'The curve’s afterlife is remarkable. Revolving a tractrix about its asymptote produces the pseudosphere, a trumpet-shaped surface of constant negative curvature on which Beltrami realized hyperbolic geometry concretely in 1868 — turning “imaginary geometry” into something you can hold.',
      ],
      zh: [
        '沿直线行走，用长度为 a 的绳子拖一个不情愿移动的物体：物体画出的轨迹就是曳物线。约 1670 年，佩罗在巴黎用桌上的怀表提出这个谜题；惠更斯为曲线命名，莱布尼茨于 1693 年给出分析。它的定义性质就藏在故事里：从曲线上任一点到牵引直线的切线段，长度恒等于 a。',
        '这条曲线的"后世"非常辉煌：绕渐近线旋转曳物线得到伪球面——一个常负曲率的喇叭形曲面。1868 年，Beltrami 在它上面具体实现了双曲几何，把"虚构的几何"变成了拿得起放得下的实物。',
      ],
    },
    properties: {
      en: [
        'The tangent segment from any point to the asymptote has constant length a.',
        'The x-axis is an asymptote; the curve starts at the cusp (0, a).',
        'Its evolute (envelope of normals) is the catenary.',
        'Rotating about the asymptote gives the pseudosphere: constant Gaussian curvature −1/a².',
        'The pseudosphere has finite area 4πa² and finite volume despite its infinite length.',
      ],
      zh: [
        '曲线上任一点到渐近线的切线段长度恒为 a。',
        'x 轴是渐近线；曲线从尖点 (0, a) 出发。',
        '它的渐屈线（法线包络）是悬链线。',
        '绕渐近线旋转得到伪球面：高斯曲率恒为 −1/a²。',
        '伪球面虽无限延伸，面积却是有限的 4πa²，体积也有限。',
      ],
    },
    seenIn: {
      en: 'The dragged-watch story, pseudosphere models of hyperbolic geometry, tractrix horns in audio, and gear tooth research.',
      zh: '"拖怀表"的典故、双曲几何的伪球面模型、音响中的曳物线号角，以及齿形研究。',
    },
    prompt: {
      en: 'Animate the tractrix: walk a point along the x-axis pulling an object on a unit leash, keep the taut leash drawn at every step to show its constant length, and trace the curve approaching the axis.',
      zh: '演示曳物线：一点沿 x 轴行走，用单位长度的绳子拖动物体，每一步都画出绷紧的绳子以显示其长度恒定，同时描出逐渐贴近横轴的曲线。',
    },
    related: ['catenary', 'cissoid-of-diocles', 'involute-of-a-circle'],
  },
  {
    slug: 'witch-of-agnesi',
    category: 'cartesian',
    name: { en: 'Witch of Agnesi', zh: '箕舌线' },
    short: {
      en: 'The bell-shaped cubic y = 8a³/(x² + 4a²), misnamed “witch” by a translation slip, and the Cauchy distribution’s profile.',
      zh: '钟形三次曲线 y = 8a³/(x² + 4a²)，因翻译失误得名"女巫"，也是柯西分布的轮廓。',
    },
    equations: ['y = \\frac{8a^3}{x^2 + 4a^2}'],
    params: [
      {
        key: 'a',
        label: { en: 'a (circle radius)', zh: 'a（生成圆半径）' },
        min: 0.4,
        max: 1.2,
        step: 0.05,
        defaultValue: 0.8,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(-5.2, 5.2, 700, (x) => [x, (8 * a ** 3) / (x * x + 4 * a * a)]),
    ],
    intro: {
      en: [
        'Start with a circle of radius a sitting on the x-axis. For each ray from the origin, combine the height where it meets the circle’s top tangent with the x-position where it crosses the circle: the resulting point traces the bell-shaped curve y = 8a³/(x² + 4a²). Fermat studied it in 1630; Maria Gaetana Agnesi presented it clearly in her landmark 1748 calculus textbook.',
        'The English name is a famous mistranslation: Agnesi called the curve la versiera (the turning curve), which translator John Colson misread as l’avversiera — “the witch”. Under its statistician’s alias the same shape is the Cauchy–Lorentz distribution, the heavy-tailed density whose mean does not exist, and physicists meet it as the Lorentzian line shape of resonance.',
      ],
      zh: [
        '取半径为 a、坐落在 x 轴上的圆。对从原点出发的每条射线，把"它与圆顶切线交点的高度"和"它与圆交点的横坐标"组合起来，得到的点画出钟形曲线 y = 8a³/(x² + 4a²)。费马在 1630 年研究过它；Agnesi 在 1748 年那部里程碑式的微积分教材中把它讲得清晰透彻。',
        '英文名"女巫"是著名的翻译事故：Agnesi 称它 la versiera（回转曲线），译者 Colson 误读为 l\'avversiera（女巫）。在统计学里，同一形状是柯西—洛伦兹分布——均值不存在的重尾密度；物理学家则在共振的洛伦兹线形中与它相遇。',
      ],
    },
    properties: {
      en: [
        'Peak height 2a at x = 0; the x-axis is the asymptote.',
        'The area between curve and asymptote is 4πa² — four times the generating circle’s area.',
        'Inflection points occur at x = ±2a/√3.',
        'Normalized, it is the Cauchy distribution: undefined mean, infinite variance.',
        'The volume of revolution about the asymptote is 4π²a³.',
      ],
      zh: [
        '峰值高度 2a，位于 x = 0；x 轴是渐近线。',
        '曲线与渐近线之间的面积为 4πa²——生成圆面积的四倍。',
        '拐点位于 x = ±2a/√3。',
        '归一化后即柯西分布：均值不存在、方差无穷。',
        '绕渐近线旋转所得体积为 4π²a³。',
      ],
    },
    seenIn: {
      en: 'The Cauchy distribution in statistics, Lorentzian resonance peaks in physics, smooth-hill test terrain in fluid dynamics, and calculus textbooks since 1748.',
      zh: '统计学中的柯西分布、物理学中的洛伦兹共振峰、流体力学的光滑山丘试验地形，以及 1748 年以来的微积分教材。',
    },
    prompt: {
      en: 'Animate the witch of Agnesi: rotate a ray from the origin through a circle of radius 0.8 resting on the x-axis, combine the two intersection coordinates to plot each point, and trace the full bell curve with its asymptote.',
      zh: '演示箕舌线的生成：从原点旋转一条射线，穿过坐落在 x 轴上的半径 0.8 的圆，组合两个交点的坐标得到描点，最终画出完整的钟形曲线及其渐近线。',
    },
    related: ['cissoid-of-diocles', 'catenary', 'parabola', 'serpentine-curve'],
  },
  {
    slug: 'folium-of-descartes',
    category: 'cartesian',
    name: { en: 'Folium of Descartes', zh: '笛卡尔叶形线' },
    short: {
      en: 'The looped cubic x³ + y³ = 3axy that sparked the Descartes–Fermat duel over tangent lines.',
      zh: '带环的三次曲线 x³ + y³ = 3axy，引发了笛卡尔与费马关于切线方法的对决。',
    },
    equations: [
      'x^3 + y^3 = 3axy',
      'x = \\frac{3at}{1+t^3}, \\quad y = \\frac{3at^2}{1+t^3}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a（大小）' },
        min: 0.7,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => {
      const point = (t: number): [number, number] => [
        (3 * a * t) / (1 + t ** 3),
        (3 * a * t * t) / (1 + t ** 3),
      ];
      return [sweep(-0.62, 14, 900, point), sweep(-14, -1.58, 500, point)];
    },
    intro: {
      en: [
        'Descartes proposed the curve x³ + y³ = 3axy in 1638 and challenged Fermat to find its tangent lines — expecting the problem to embarrass him. Fermat’s method of adequality handled it easily, an early landmark on the road to derivatives. The name folium is Latin for “leaf”: the curve loops through the origin in the first quadrant and runs off along two arms.',
        'The folium is the standard first example of implicit differentiation with a genuine payoff: the loop closes at a node where the curve crosses itself with two distinct tangents, and both arms approach the same asymptote x + y + a = 0. Its symmetry axis is the line y = x, where the loop peaks at (3a/2, 3a/2).',
      ],
      zh: [
        '笛卡尔在 1638 年提出曲线 x³ + y³ = 3axy，并向费马挑战求其切线——本想让对方难堪。费马用他的"拟等法"轻松解决，成为通往导数概念的早期里程碑。folium 是拉丁语"叶子"：曲线在第一象限绕出一个经过原点的环，并沿两条臂伸向远方。',
        '叶形线是隐函数求导的标准first example，而且回报实在：环在原点处自交形成结点，拥有两条不同的切线；两条臂逼近同一条渐近线 x + y + a = 0。对称轴是直线 y = x，环的顶点位于 (3a/2, 3a/2)。',
      ],
    },
    properties: {
      en: [
        'Node at the origin with tangents along both axes.',
        'Asymptote: x + y + a = 0 for both arms.',
        'The loop’s area is 3a²/2 — and equals the area between the arms and the asymptote.',
        'Symmetric about y = x; the loop’s vertex is (3a/2, 3a/2).',
        'Rational parametrization x = 3at/(1+t³), y = 3at²/(1+t³) covers the whole curve.',
      ],
      zh: [
        '原点是结点，两条切线分别沿两条坐标轴。',
        '两条臂共用渐近线 x + y + a = 0。',
        '环的面积为 3a²/2，且恰好等于臂与渐近线之间的面积。',
        '关于 y = x 对称；环的顶点为 (3a/2, 3a/2)。',
        '有理参数化 x = 3at/(1+t³)、y = 3at²/(1+t³) 覆盖整条曲线。',
      ],
    },
    seenIn: {
      en: 'Implicit differentiation lessons, the history of tangent methods before calculus, and algebraic curve galleries.',
      zh: '隐函数求导课程、微积分诞生前的切线方法史，以及代数曲线图鉴。',
    },
    prompt: {
      en: 'Animate the folium of Descartes x³ + y³ = 3xy: trace the loop through the origin and both infinite arms, draw the asymptote x + y + 1 = 0, then use implicit differentiation to show the tangent at the loop’s vertex (3/2, 3/2) has slope −1.',
      zh: '演示笛卡尔叶形线 x³ + y³ = 3xy：描出经过原点的环与两条无限延伸的臂，画出渐近线 x + y + 1 = 0，并用隐函数求导展示顶点 (3/2, 3/2) 处切线斜率为 −1。',
    },
    related: ['cissoid-of-diocles', 'lemniscate-of-bernoulli', 'witch-of-agnesi'],
  },
  {
    slug: 'devils-curve',
    category: 'cartesian',
    name: { en: 'Devil’s curve', zh: '魔鬼曲线' },
    short: {
      en: 'The quartic y²(y² − b²) = x²(x² − a²), studied by Cramer in 1750: a figure eight between two arcs, or a circle crossed by two lines.',
      zh: '四次曲线 y²(y² − b²) = x²(x² − a²)，克莱姆在 1750 年研究过：夹在两段弧之间的 8 字形，或被两条直线穿过的圆。',
    },
    equations: [
      'y^2(y^2 - b^2) = x^2(x^2 - a^2)',
      'r^2 = \\frac{b^2\\sin^2\\theta - a^2\\cos^2\\theta}{\\sin^2\\theta - \\cos^2\\theta}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (with b = 1)', zh: 'a（b = 1）' },
        min: 0.2,
        max: 1.6,
        step: 0.05,
        defaultValue: 0.8,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) =>
      polarPieces((t) => {
        const s2 = Math.sin(t) ** 2;
        const c2 = Math.cos(t) ** 2;
        return (s2 - a * a * c2) / (s2 - c2);
      }, 2.6),
    intro: {
      en: [
        'Gabriel Cramer studied this quartic in 1750; the name probably comes from its resemblance to the devil-on-two-sticks juggling toy. On the axes it passes through the origin and through (±a, 0) and (0, ±b), and far from the origin it hugs the diagonals y = ±x.',
        'Everything depends on how a compares with b. When a < b, a figure eight crosses itself at the origin between (±a, 0), while two separate arcs pass through (0, ±b) and run out along the diagonals. At a = b the curve falls apart into the circle x² + y² = b² and the two diagonals; when a > b the picture turns through 90°, with the figure eight upright. Dividing out r² gives a one-line polar form that makes each case easy to sketch.',
      ],
      zh: [
        'Gabriel Cramer 在 1750 年研究了这条四次曲线；名字大概来自它和"空竹"（devil on two sticks）玩具的相似。它在坐标轴上经过原点、(±a, 0) 和 (0, ±b)，远离原点时贴着对角线 y = ±x。',
        '形状全看 a 与 b 的比较：a < b 时，一个 8 字形横在 (±a, 0) 之间、在原点自交，另有两段分开的弧经过 (0, ±b)、沿对角线伸出去；a = b 时分解成圆 x² + y² = b² 和两条对角线；a > b 时整幅图转 90°，8 字形竖了起来。约去 r² 后得到一行极坐标式，每种情形都容易画出。',
      ],
    },
    properties: {
      en: [
        'Crosses the axes at the origin, (±a, 0) and (0, ±b).',
        'Asymptotes y = ±x.',
        'a = b: the curve splits into the circle x² + y² = a² and the lines y = ±x.',
        'Polar form: r² = (b²·sin²θ − a²·cos²θ) / (sin²θ − cos²θ).',
        'Symmetric about both axes.',
      ],
      zh: [
        '与坐标轴交于原点、(±a, 0) 和 (0, ±b)。',
        '渐近线 y = ±x。',
        'a = b 时曲线分解为圆 x² + y² = a² 和直线 y = ±x。',
        '极坐标形式：r² = (b²·sin²θ − a²·cos²θ) / (sin²θ − cos²θ)。',
        '关于两条坐标轴对称。',
      ],
    },
    seenIn: {
      en: 'Catalogues of named quartics and exercises on implicit curves and asymptotes.',
      zh: '命名四次曲线的图谱，以及隐函数曲线与渐近线的练习。',
    },
    prompt: {
      en: 'Animate the devil’s curve y²(y² − 1) = x²(x² − a²): draw the asymptotes y = ±x, trace the figure eight and the two outer arcs at a = 0.8, then slide a through 1 to show the split into a circle and two lines and the upright figure eight beyond.',
      zh: '演示魔鬼曲线 y²(y² − 1) = x²(x² − a²)：先画渐近线 y = ±x，描出 a = 0.8 时的 8 字形和两段外弧，再让 a 经过 1，展示它分解成一个圆和两条直线，以及之后竖起来的 8 字形。',
    },
    related: ['lemniscate-of-bernoulli', 'cassini-oval', 'bicorn'],
  },
  {
    slug: 'bicorn',
    category: 'cartesian',
    name: { en: 'Bicorn', zh: '双角曲线' },
    short: {
      en: 'The cocked-hat curve y²(a² − x²) = (x² + 2ay − a²)²: two arcs meeting in sharp cusps at (±a, 0).',
      zh: '"三角帽"曲线 y²(a² − x²) = (x² + 2ay − a²)²：两段弧在 (±a, 0) 处交成尖角。',
    },
    equations: [
      'y^2(a^2 - x^2) = (x^2 + 2ay - a^2)^2',
      'x = a\\sin t,\\quad y = \\frac{a\\cos^2 t\\,(2 + \\cos t)}{3 + \\sin^2 t}',
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
        a * Math.sin(t),
        (a * Math.cos(t) ** 2 * (2 + Math.cos(t))) / (3 + Math.sin(t) ** 2),
      ]),
    ],
    intro: {
      en: [
        'The bicorn, or cocked-hat curve, is a rational quartic studied by James Joseph Sylvester in 1864 and Arthur Cayley in 1867. Its outline is exactly what the name suggests: a hat with two points, one arc on top and one below, meeting in cusps at (±a, 0).',
        'Being rational, it has a parametrisation by ordinary functions, x = a·sin t and y = a·cos²t·(2 + cos t)/(3 + sin²t). The upper arc crosses the y-axis at height a, the lower one at a/3.',
      ],
      zh: [
        '双角曲线又叫"三角帽"曲线，是一条有理四次曲线，James Joseph Sylvester 在 1864 年、Arthur Cayley 在 1867 年研究过它。它的轮廓正如其名：一顶有两个角的帽子，上下两段弧在 (±a, 0) 处交成尖点。',
        '因为是有理曲线，它可以用普通函数参数化：x = a·sin t，y = a·cos²t·(2 + cos t)/(3 + sin²t)。上弧在高度 a 处穿过 y 轴，下弧在 a/3 处。',
      ],
    },
    properties: {
      en: [
        'Cusps at (±a, 0).',
        'Crosses the y-axis at y = a and y = a/3.',
        'Rational parametrisation: x = a·sin t, y = a·cos²t·(2 + cos t)/(3 + sin²t).',
        'Symmetric about the y-axis.',
        'A quartic studied by Sylvester (1864) and Cayley (1867).',
      ],
      zh: [
        '尖点在 (±a, 0)。',
        '与 y 轴交于 y = a 和 y = a/3。',
        '有理参数式：x = a·sin t，y = a·cos²t·(2 + cos t)/(3 + sin²t)。',
        '关于 y 轴对称。',
        'Sylvester（1864）和 Cayley（1867）研究过的四次曲线。',
      ],
    },
    seenIn: {
      en: 'Galleries of named curves and examples of rational parametrisation.',
      zh: '命名曲线图集，以及有理参数化的例子。',
    },
    prompt: {
      en: 'Animate the bicorn with a = 1: trace x = sin t, y = cos²t(2 + cos t)/(3 + sin²t), pause at the two cusps (±1, 0), and mark where the arcs cross the y-axis at 1 and 1/3.',
      zh: '演示 a = 1 的双角曲线：按 x = sin t、y = cos²t(2 + cos t)/(3 + sin²t) 描出曲线，在两个尖点 (±1, 0) 处停顿，并标出两段弧与 y 轴的交点 1 和 1/3。',
    },
    related: ['devils-curve', 'piriform-curve', 'astroid'],
  },
  {
    slug: 'kampyle-of-eudoxus',
    category: 'cartesian',
    name: { en: 'Kampyle of Eudoxus', zh: '欧多克索斯曲线' },
    short: {
      en: 'x⁴ = a²(x² + y²): two branches opening outward from (±a, 0), traditionally linked to Eudoxus and the doubling of the cube.',
      zh: 'x⁴ = a²(x² + y²)：从 (±a, 0) 向外张开的两支，传统上与欧多克索斯和倍立方问题联系在一起。',
    },
    equations: ['x^4 = a^2(x^2 + y^2)', 'r = a\\sec^2\\theta'],
    params: [
      {
        key: 'a',
        label: { en: 'a (vertex distance)', zh: 'a（顶点距离）' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => {
      const branch = (side: number) =>
        sweep(-1.15, 1.15, 600, (t) => [
          (side * a) / Math.cos(t),
          (a * Math.tan(t)) / Math.cos(t),
        ]);
      return [branch(1), branch(-1)];
    },
    intro: {
      en: [
        'The kampyle (Greek for “curved”) is traditionally credited to Eudoxus of Cnidus in the fourth century BC, in connection with doubling the cube; the ancient sources are thin, so the attribution is conventional rather than certain. Its equation is the quartic x⁴ = a²(x² + y²).',
        'In polar form it is simply r = a·sec²θ, and with x = a·sec t, y = a·tan t·sec t it is easy to plot. Each branch starts at a vertex (±a, 0) and opens outward, growing roughly like y ≈ ±x²/a far from the origin.',
      ],
      zh: [
        'kampyle 在希腊语里是"弯曲的"。传统上把它归于公元前 4 世纪的欧多克索斯，并与倍立方问题相联系；古代文献很少，这个归属是沿袭的说法，并不确定。它的方程是四次曲线 x⁴ = a²(x² + y²)。',
        '极坐标下它就是 r = a·sec²θ；用 x = a·sec t、y = a·tan t·sec t 也很容易画。每一支从顶点 (±a, 0) 出发向外张开，远处大致按 y ≈ ±x²/a 增长。',
      ],
    },
    properties: {
      en: [
        'Polar form r = a·sec²θ.',
        'Parametric form x = a·sec t, y = a·tan t·sec t.',
        'Vertices at (±a, 0); no points with |x| < a.',
        'Far from the origin, y ≈ ±x²/a.',
        'Symmetric about both axes.',
      ],
      zh: [
        '极坐标形式 r = a·sec²θ。',
        '参数式 x = a·sec t，y = a·tan t·sec t。',
        '顶点在 (±a, 0)；|x| < a 处没有曲线上的点。',
        '远离原点时 y ≈ ±x²/a。',
        '关于两条坐标轴对称。',
      ],
    },
    seenIn: {
      en: 'Histories of Greek geometry and the doubling of the cube.',
      zh: '希腊几何史与倍立方问题的史料。',
    },
    prompt: {
      en: 'Animate the kampyle of Eudoxus with a = 1: sweep a ray with r = sec²θ, trace both branches from the vertices (±1, 0), and compare them with the parabolas y = ±x² far from the origin.',
      zh: '演示 a = 1 的欧多克索斯曲线：让射线按 r = sec²θ 扫过，从顶点 (±1, 0) 描出两支，再在远处与抛物线 y = ±x² 对比。',
    },
    related: ['hyperbola', 'conchoid-of-nicomedes', 'parabola'],
  },
  {
    slug: 'piriform-curve',
    category: 'cartesian',
    name: { en: 'Piriform curve', zh: '梨形线' },
    short: {
      en: 'The pear-shaped quartic a⁴y² = b²x³(2a − x): a teardrop with a cusp, enclosing exactly the area πab of an ellipse.',
      zh: '梨形四次曲线 a⁴y² = b²x³(2a − x)：带一个尖点的泪滴形，面积恰好等于椭圆的 πab。',
    },
    equations: [
      'a^4y^2 = b^2x^3(2a - x)',
      'x = a(1 + \\sin t),\\quad y = b\\cos t\\,(1 + \\sin t)',
    ],
    params: [
      {
        key: 'b',
        label: { en: 'b (with a = 1)', zh: 'b（a = 1）' },
        min: 0.3,
        max: 1.2,
        step: 0.05,
        defaultValue: 0.7,
      },
    ],
    fitMode: 'fixed',
    sample: ({ b }) => [
      sweep(0, TAU, 900, (t) => [
        1 + Math.sin(t),
        b * Math.cos(t) * (1 + Math.sin(t)),
      ]),
    ],
    intro: {
      en: [
        'The piriform (Latin pirum, pear) is a quartic shaped like a teardrop lying on its side: it runs from a cusp at the origin to its blunt end at (2a, 0). Near the cusp it behaves like the semicubical parabola, since y² is proportional to x³ there.',
        'Its parametrisation x = a(1 + sin t), y = b·cos t·(1 + sin t) makes the area easy to compute, and the answer is a pleasant surprise: πab, exactly the area of the ellipse with semi-axes a and b.',
      ],
      zh: [
        '梨形线（拉丁语 pirum，梨）是一条横放的泪滴形四次曲线：从原点的尖点伸到 (2a, 0) 的圆头。在尖点附近 y² 与 x³ 成比例，表现得和半立方抛物线一样。',
        '用参数式 x = a(1 + sin t)、y = b·cos t·(1 + sin t) 很容易算出面积，结果出人意料：πab，正好等于半轴为 a、b 的椭圆的面积。',
      ],
    },
    properties: {
      en: [
        'Enclosed area πab, equal to the ellipse with the same a and b.',
        'Cusp at the origin; the far end is (2a, 0).',
        'Parametrisation: x = a(1 + sin t), y = b·cos t·(1 + sin t).',
        'Symmetric about the x-axis.',
        'Near the cusp, y² ≈ (2b²/a³)·x³, like a semicubical parabola.',
      ],
      zh: [
        '围成的面积为 πab，与同样 a、b 的椭圆相等。',
        '原点处有尖点，另一端是 (2a, 0)。',
        '参数式：x = a(1 + sin t)，y = b·cos t·(1 + sin t)。',
        '关于 x 轴对称。',
        '在尖点附近 y² ≈ (2b²/a³)·x³，像半立方抛物线。',
      ],
    },
    seenIn: {
      en: 'Area-by-parametrisation exercises and modelling of drop and pear outlines.',
      zh: '用参数式求面积的练习，以及水滴、梨形轮廓的建模。',
    },
    prompt: {
      en: 'Animate the piriform curve with a = 1, b = 0.7: trace it from the cusp at the origin, shade its area, and slide in an ellipse with semi-axes 1 and 0.7 to show the two areas are both 0.7π.',
      zh: '演示 a = 1、b = 0.7 的梨形线：从原点的尖点开始描出曲线，给面积涂上阴影，再移入半轴 1 和 0.7 的椭圆，展示两者面积都是 0.7π。',
    },
    related: ['semicubical-parabola', 'ellipse', 'bicorn'],
  },
  {
    slug: 'serpentine-curve',
    category: 'cartesian',
    name: { en: 'Serpentine curve', zh: '蛇形线' },
    short: {
      en: 'y = abx/(x² + a²): an S-bend that rises to b/2, falls back and fades to the x-axis on both sides.',
      zh: 'y = abx/(x² + a²)：一个 S 形弯，升到 b/2 后回落，两侧都逐渐贴近 x 轴。',
    },
    equations: ['y = \\frac{abx}{x^2 + a^2}', 'x^2y + a^2y - abx = 0'],
    params: [
      {
        key: 'a',
        label: { en: 'a (bend position)', zh: 'a（弯的位置）' },
        min: 0.3,
        max: 2,
        step: 0.05,
        defaultValue: 1,
      },
      {
        key: 'b',
        label: { en: 'b (height)', zh: 'b（高度）' },
        min: 0.5,
        max: 4,
        step: 0.1,
        defaultValue: 2,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a, b }) => [
      sweep(-6, 6, 800, (x) => [x, (a * b * x) / (x * x + a * a)]),
    ],
    intro: {
      en: [
        'The serpentine is a cubic curve that winds like a snake through the origin. It was studied by l’Hôpital and Huygens in the 1690s, and Isaac Newton gave it its name in his enumeration of cubic curves.',
        'Written as a function, y = abx/(x² + a²), it is easy to analyse: an odd function with a maximum b/2 at x = a, a minimum −b/2 at x = −a, inflection points at x = 0 and x = ±√3·a, and the x-axis as its asymptote in both directions.',
      ],
      zh: [
        '蛇形线是一条像蛇一样蜿蜒穿过原点的三次曲线。洛必达和惠更斯在 1690 年代研究过它，牛顿在他对三次曲线的分类中给了它这个名字。',
        '写成函数 y = abx/(x² + a²) 后很容易分析：它是奇函数，在 x = a 处取最大值 b/2，在 x = −a 处取最小值 −b/2，拐点在 x = 0 和 x = ±√3·a，两侧都以 x 轴为渐近线。',
      ],
    },
    properties: {
      en: [
        'Maximum b/2 at x = a; minimum −b/2 at x = −a.',
        'Inflection points at x = 0 and x = ±√3·a.',
        'The x-axis is an asymptote on both sides.',
        'Odd function: symmetric about the origin.',
        'Named by Newton in his classification of cubic curves.',
      ],
      zh: [
        '在 x = a 处取最大值 b/2，在 x = −a 处取最小值 −b/2。',
        '拐点在 x = 0 和 x = ±√3·a。',
        '两侧都以 x 轴为渐近线。',
        '奇函数：关于原点对称。',
        '名字来自牛顿对三次曲线的分类。',
      ],
    },
    seenIn: {
      en: 'Calculus exercises on extrema and inflection points, and the shape of a damped response curve.',
      zh: '微积分里求极值与拐点的练习，以及阻尼响应曲线的形状。',
    },
    prompt: {
      en: 'Animate the serpentine y = 2x/(x² + 1): trace it from left to right, mark the maximum (1, 1) and minimum (−1, −1), then the inflection points at 0 and ±√3, and show it settling onto the x-axis.',
      zh: '演示蛇形线 y = 2x/(x² + 1)：从左到右描出曲线，标出最大值点 (1, 1) 与最小值点 (−1, −1)，再标出 0 和 ±√3 处的拐点，最后展示它贴近 x 轴。',
    },
    related: ['witch-of-agnesi', 'sigmoid-function', 'sine-wave'],
  },
  {
    slug: 'tschirnhausen-cubic',
    category: 'cartesian',
    name: { en: 'Tschirnhausen cubic', zh: '契恩豪斯三次曲线' },
    short: {
      en: '27ay² = (a − x)(8a + x)²: a cubic with a loop, the caustic of a parabola lit at right angles to its axis.',
      zh: '27ay² = (a − x)(8a + x)²：带一个环的三次曲线，是光线垂直于轴照射抛物线时的焦散线。',
    },
    equations: [
      '27ay^2 = (a - x)(8a + x)^2',
      'r = a\\sec^3\\frac{\\theta}{3}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a（大小）' },
        min: 0.5,
        max: 1.2,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(-2.25, 2.25, 900, (t) => [a * (1 - 3 * t * t), a * t * (3 - t * t)]),
    ],
    intro: {
      en: [
        'Ehrenfried Walther von Tschirnhaus studied this cubic as a caustic: shine light at a parabola perpendicular to its axis, and the reflected rays envelope this curve. It also goes by l’Hôpital’s cubic and the trisectrix of Catalan.',
        'Its polar form r = a·sec³(θ/3) and the parametrisation x = a(1 − 3t²), y = a·t(3 − t²) turn into each other with t = tan(θ/3). The curve crosses itself at (−8a, 0), closing a loop that reaches x = a and encloses area 72√3a²/5.',
      ],
      zh: [
        'Ehrenfried Walther von Tschirnhaus 把这条三次曲线当作焦散线研究：让光线垂直于抛物线的轴照射，反射光线的包络就是它。它也叫洛必达三次曲线、卡塔兰三等分角线。',
        '它的极坐标形式 r = a·sec³(θ/3) 与参数式 x = a(1 − 3t²)、y = a·t(3 − t²) 通过 t = tan(θ/3) 互相转换。曲线在 (−8a, 0) 处与自己相交，合成一个伸到 x = a 的环，环的面积为 72√3a²/5。',
      ],
    },
    properties: {
      en: [
        'Self-intersection at (−8a, 0); the loop reaches (a, 0).',
        'The loop encloses area 72√3a²/5.',
        'Polar form r = a·sec³(θ/3); parametrisation x = a(1 − 3t²), y = a·t(3 − t²).',
        'Catacaustic of a parabola for light perpendicular to its axis.',
        'Also called l’Hôpital’s cubic and the trisectrix of Catalan.',
      ],
      zh: [
        '自交点在 (−8a, 0)；环伸到 (a, 0)。',
        '环围成的面积为 72√3a²/5。',
        '极坐标 r = a·sec³(θ/3)；参数式 x = a(1 − 3t²)，y = a·t(3 − t²)。',
        '光线垂直于轴照射时，抛物线的反射焦散线。',
        '又称洛必达三次曲线、卡塔兰三等分角线。',
      ],
    },
    seenIn: {
      en: 'Optics of reflection (caustics) and catalogues of classical cubics.',
      zh: '反射光学中的焦散线，以及经典三次曲线的图谱。',
    },
    prompt: {
      en: 'Animate the Tschirnhausen cubic as a caustic: shine parallel rays at a parabola perpendicular to its axis, draw many reflected rays, and let their envelope appear as 27y² = (1 − x)(8 + x)², then shade its loop.',
      zh: '把契恩豪斯三次曲线当作焦散线来演示：让平行光垂直于抛物线的轴照射，画出许多反射光线，让它们的包络显现为 27y² = (1 − x)(8 + x)²，最后给环涂上阴影。',
    },
    related: ['semicubical-parabola', 'parabola', 'trisectrix-of-maclaurin'],
  },
  {
    slug: 'semicubical-parabola',
    category: 'cartesian',
    name: { en: 'Semicubical parabola', zh: '半立方抛物线' },
    short: {
      en: 'y² = ax³, the cusp curve: the first algebraic curve other than a straight line whose arc length was found exactly (Neile, 1657).',
      zh: 'y² = ax³，带尖点的曲线：除直线外第一条求出精确弧长的代数曲线（Neile，1657 年）。',
    },
    equations: ['y^2 = ax^3', 'x = t^2,\\quad y = \\sqrt a\\,t^3'],
    params: [
      {
        key: 'a',
        label: { en: 'a (steepness)', zh: 'a（陡峭程度）' },
        min: 0.3,
        max: 3,
        step: 0.1,
        defaultValue: 1,
      },
    ],
    fitMode: 'refit',
    sample: ({ a }) => [
      sweep(-1.2, 1.2, 900, (t) => [t * t, Math.sqrt(a) * t ** 3]),
    ],
    intro: {
      en: [
        'In 1657 William Neile found the exact length of an arc of y² = ax³, and the result surprised mathematicians who believed that curved lengths could not be expressed algebraically. The answer needs nothing beyond powers and roots.',
        'The curve has a cusp at the origin, where its two branches meet tangent to the x-axis. It turns up again and again: it is the evolute of a parabola, and it is the isochrone of Leibniz’s 1687 challenge, a path along which a falling body descends at a constant vertical speed.',
      ],
      zh: [
        '1657 年，William Neile 求出了 y² = ax³ 一段弧的精确长度。当时不少数学家认为曲线的长度不能用代数式表示，这个结果让他们吃惊：答案只需要幂和根式。',
        '曲线在原点有一个尖点，两支在那里都与 x 轴相切。它在很多地方出现：它是抛物线的渐屈线；它也是莱布尼茨 1687 年挑战题中的"等时降线"，物体沿它下落时竖直方向的速度保持不变。',
      ],
    },
    properties: {
      en: [
        'Cusp at the origin, with both branches tangent to the x-axis.',
        'Arc length from the cusp to x: (8/27a)[(1 + 9ax/4)^(3/2) − 1].',
        'Parametrisation x = t², y = √a·t³.',
        'The evolute of a parabola is a semicubical parabola.',
        'Solution of Leibniz’s isochrone problem (1687).',
      ],
      zh: [
        '原点处有尖点，两支都与 x 轴相切。',
        '从尖点到 x 的弧长：(8/27a)[(1 + 9ax/4)^(3/2) − 1]。',
        '参数式 x = t²，y = √a·t³。',
        '抛物线的渐屈线是半立方抛物线。',
        '莱布尼茨等时降线问题（1687）的解。',
      ],
    },
    seenIn: {
      en: 'The history of rectification, evolutes in differential geometry, and cusps in algebraic geometry.',
      zh: '求长问题的历史、微分几何中的渐屈线，以及代数几何中的尖点。',
    },
    prompt: {
      en: 'Animate the semicubical parabola y² = x³: trace both branches out of the cusp, then unroll an arc from the cusp to x = 1 onto a straight ruler and show its length (8/27)((13/4)^(3/2) − 1).',
      zh: '演示半立方抛物线 y² = x³：从尖点描出两支，再把从尖点到 x = 1 的一段弧"展开"到直尺上，标出它的长度 (8/27)((13/4)^(3/2) − 1)。',
    },
    related: ['tschirnhausen-cubic', 'parabola', 'piriform-curve'],
  },
  {
    slug: 'quadratrix-of-hippias',
    category: 'cartesian',
    name: { en: 'Quadratrix of Hippias', zh: '希庇亚斯割圆曲线' },
    short: {
      en: 'Where a falling line meets a turning radius: one of the oldest named curves, used to trisect angles and square the circle.',
      zh: '下降的直线与转动的半径的交点：最古老的命名曲线之一，可以三等分角、化圆为方。',
    },
    equations: [
      'x = y\\cot\\frac{\\pi y}{2a}',
      'r = \\frac{2a\\,\\theta}{\\pi\\sin\\theta}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (square side)', zh: 'a（正方形边长）' },
        min: 0.6,
        max: 1.3,
        step: 0.05,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ a }) => [
      sweep(-1.6 * a, 1.6 * a, 1201, (y) => [
        y / Math.tan((Math.PI * y) / (2 * a)),
        y,
      ]),
    ],
    intro: {
      en: [
        'Around 420 BC Hippias of Elis imagined two motions in a square of side a: the top side slides down to the bottom at constant speed while a radius from the corner turns from vertical to horizontal, also at constant speed, and both finish together. Their meeting point draws the quadratrix.',
        'Because the descent is proportional to the angle, the curve divides angles in any ratio, so it trisects them. Dinostratus later noticed that it meets the base at x = 2a/π, which turns a length into π and squares the circle. The curve cannot be drawn with straightedge and compass, which is why it does not contradict the impossibility of those constructions.',
      ],
      zh: [
        '约公元前 420 年，埃利斯的希庇亚斯在边长为 a 的正方形里设想了两种运动：上边匀速下降到底边，同时从角上出发的一条半径匀速从竖直转到水平，两者同时结束。它们的交点描出割圆曲线。',
        '下降的距离与转过的角度成正比，所以这条曲线能把角按任意比例分开，自然也能三等分角。后来 Dinostratus 发现它与底边交于 x = 2a/π，于是可以作出 π 并化圆为方。这条曲线本身不能用尺规画出，所以并不与那些作图"不可能"的结论矛盾。',
      ],
    },
    properties: {
      en: [
        'Cartesian form x = y·cot(πy/2a); polar form r = 2aθ/(π·sin θ).',
        'Meets the x-axis at x = 2a/π (Dinostratus).',
        'Horizontal asymptotes y = ±2a.',
        'Divides an angle in any ratio, so it trisects angles.',
        'Its inverse in a circle of radius a·√(2/π) is the cochleoid.',
      ],
      zh: [
        '直角坐标 x = y·cot(πy/2a)；极坐标 r = 2aθ/(π·sin θ)。',
        '与 x 轴交于 x = 2a/π（Dinostratus）。',
        '水平渐近线 y = ±2a。',
        '能把角按任意比例分开，因而能三等分角。',
        '在半径为 a·√(2/π) 的圆中反演得到蜗牛线。',
      ],
    },
    seenIn: {
      en: 'Histories of the three classical problems of Greek geometry.',
      zh: '古希腊三大几何作图问题的历史。',
    },
    prompt: {
      en: 'Animate Hippias’ construction in a unit square: slide the top side down while a radius from the corner turns from 90° to 0° in step, mark their intersection as it draws the quadratrix, and finish by marking where it meets the base at 2/π.',
      zh: '在单位正方形里演示希庇亚斯的作图：上边匀速下降，同时一条从角上出发的半径同步地从 90° 转到 0°，标出两者的交点并描出割圆曲线，最后标出它与底边的交点 2/π。',
    },
    related: ['cochleoid', 'trisectrix-of-maclaurin', 'conchoid-of-nicomedes'],
  },
  {
    slug: 'sigmoid-function',
    category: 'cartesian',
    name: { en: 'Sigmoid function', zh: 'S 形函数（逻辑斯谛曲线）' },
    short: {
      en: 'The logistic curve y = 1/(1 + e^(−kx)): growth that starts slow, speeds up, and levels off at 1.',
      zh: '逻辑斯谛曲线 y = 1/(1 + e^(−kx))：先慢、再快、最后趋于 1 的增长。',
    },
    equations: ['y = \\frac{1}{1 + e^{-kx}}', 'y\' = k\\,y(1 - y)'],
    params: [
      {
        key: 'k',
        label: { en: 'k (steepness)', zh: 'k（陡峭程度）' },
        min: 0.25,
        max: 4,
        step: 0.25,
        defaultValue: 1,
      },
    ],
    fitMode: 'fixed',
    sample: ({ k }) => [
      sweep(-7, 7, 800, (x) => [x, 1 / (1 + Math.exp(-k * x))]),
    ],
    intro: {
      en: [
        'Pierre-François Verhulst introduced the logistic curve in the late 1830s to model a population that grows in proportion to its size until resources run short. Its differential equation y′ = k·y(1 − y) says exactly that: growth is fast when y is small and stops as y approaches the ceiling 1.',
        'The same S-shape reappears wherever a quantity switches smoothly between two levels: as the activation function of early neural networks, in logistic regression, in dose–response curves and in the adoption of new technology. Its steepest point is the inflection (0, 1/2), where the slope is k/4.',
      ],
      zh: [
        'Pierre-François Verhulst 在 1830 年代后期提出逻辑斯谛曲线，用来描述一个种群：数量越多增长越快，直到资源不足。它的微分方程 y′ = k·y(1 − y) 说的正是这件事：y 小时增长快，y 接近上限 1 时增长停止。',
        '同样的 S 形出现在任何"在两个水平之间平滑切换"的地方：早期神经网络的激活函数、逻辑回归、剂量-反应曲线、新技术的普及。它最陡的地方是拐点 (0, 1/2)，那里斜率为 k/4。',
      ],
    },
    properties: {
      en: [
        'Horizontal asymptotes y = 0 and y = 1.',
        'Inflection point (0, 1/2), where the slope k/4 is the largest.',
        'Derivative y′ = k·y(1 − y).',
        'Point symmetry: σ(−x) = 1 − σ(x).',
        'Inverse function: the logit, x = (1/k)·ln(y/(1 − y)).',
      ],
      zh: [
        '水平渐近线 y = 0 和 y = 1。',
        '拐点 (0, 1/2)，那里斜率 k/4 最大。',
        '导数 y′ = k·y(1 − y)。',
        '中心对称：σ(−x) = 1 − σ(x)。',
        '反函数是 logit：x = (1/k)·ln(y/(1 − y))。',
      ],
    },
    seenIn: {
      en: 'Population models, logistic regression, neural-network activations and technology adoption curves.',
      zh: '种群模型、逻辑回归、神经网络激活函数，以及技术普及曲线。',
    },
    prompt: {
      en: 'Animate the sigmoid y = 1/(1 + e^(−x)): draw the asymptotes y = 0 and y = 1, trace the curve, mark the inflection point (0, 1/2) with its tangent of slope 1/4, then vary k from 0.5 to 4 to show the S sharpening into a step.',
      zh: '演示 S 形函数 y = 1/(1 + e^(−x))：画出渐近线 y = 0 和 y = 1，描出曲线，标出拐点 (0, 1/2) 及斜率为 1/4 的切线；再让 k 从 0.5 变到 4，展示 S 形逐渐变成台阶。',
    },
    related: ['serpentine-curve', 'catenary', 'sine-wave'],
  },
];
