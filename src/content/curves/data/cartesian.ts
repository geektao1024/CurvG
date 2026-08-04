import { sweep, TAU, type CurveDef } from '../types';

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
        label: { en: 'A (amplitude)', zh: 'A(振幅)' },
        min: 0.3,
        max: 1.8,
        step: 0.05,
        defaultValue: 1.2,
      },
      {
        key: 'w',
        label: { en: 'ω (angular frequency)', zh: 'ω(角频率)' },
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
        '正弦曲线 y = A·sin(ωx) 是匀速圆周运动的投影:把绕圆运动的点投影到一条直线上,再让时间沿横轴展开,得到的就是这条图像。振幅 A 决定高度,角频率 ω 决定单位长度里装下多少弧度——周期为 2π/ω。',
        '它的特殊地位来自傅里叶定理:任何合理的周期信号都能分解为正弦与余弦之和。仅这一条事实,就让正弦波成为声学、交流电、无线电与信号处理的通用货币——也是每个三角函数初学者最先学会变换的曲线。',
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
        '周期 2π/ω,振幅 A,零点位于 x = kπ/ω。',
        '它是匀速圆周运动在直径上的投影。',
        '导数是余弦——同一条波形向左平移四分之一周期。',
        '傅里叶定理:周期信号可分解为正弦与余弦之和。',
        '简谐运动(弹簧振子、小摆角单摆)随时间的图像就是正弦曲线。',
      ],
    },
    seenIn: {
      en: 'Sound and radio waves, AC electricity, tides, oscilloscope screens, and every trigonometry classroom.',
      zh: '声波与无线电波、交流电、潮汐、示波器屏幕,以及每一间三角函数教室。',
    },
    prompt: {
      en: 'Animate the sine wave as a projection: move a point around a unit circle, project its height onto a time axis to draw y = sin x, then vary amplitude to 1.5 and frequency to 2 while keeping the circle-projection link visible.',
      zh: '把正弦波演示为投影:点绕单位圆运动,把它的高度投影到时间轴上画出 y = sin x;再把振幅调到 1.5、频率调到 2,全程保持"圆周运动 ↔ 波形"的对应关系可见。',
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
        label: { en: 'a (sag parameter)', zh: 'a(垂度参数)' },
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
        '把一条均匀链条挂在两点之间,它自然垂成悬链线 y = a·cosh(x/a)。伽利略猜想它是抛物线;Jungius 用实验推翻了这一猜想,1691 年莱布尼茨、惠更斯与约翰·伯努利响应雅各布·伯努利的挑战,分别推导出真正的方程。名字来自拉丁语 catena,意为"链条"。',
        '把它倒过来,纯受拉的链条就变成纯受压的拱——这是胡克的洞见:"柔线如何下垂,刚拱便如何倒立而立"。因此圣路易斯大拱门与高迪的悬链模型遵循的是(加权)悬链线,而不是抛物线。',
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
        '从顶点起的弧长为 s = a·sinh(x/a);垂度与张力的几何全部由常数 a 决定。',
        '链条中水平方向的张力分量处处相同。',
        '顶点附近可用抛物线 y ≈ a + x²/(2a) 近似——伽利略混淆的根源。',
        '绕 x 轴旋转得到悬链面:唯一的非平面旋转极小曲面。',
        '方形轮子可以在由倒悬链线拼成的路面上平稳滚动。',
      ],
    },
    seenIn: {
      en: 'Hanging cables and chains, the Gateway Arch, Gaudí’s architecture, suspension bridge design, and soap-film catenoids.',
      zh: '悬挂的缆索与链条、圣路易斯大拱门、高迪的建筑、悬索桥设计,以及肥皂膜悬链面。',
    },
    prompt: {
      en: 'Animate the catenary: hang a chain of dots between two posts and let it settle into y = a·cosh(x/a), overlay the best-fit parabola to show the mismatch near the ends, then flip the curve into an arch.',
      zh: '演示悬链线:在两根立柱间挂一串珠点,让它稳定成 y = a·cosh(x/a);叠加最佳拟合抛物线,展示两端附近的偏差;最后把曲线倒置成拱。',
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
        label: { en: 'a (leash length)', zh: 'a(拖绳长度)' },
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
        '沿直线行走,用长度为 a 的绳子拖一个不情愿移动的物体:物体画出的轨迹就是曳物线。约 1670 年,佩罗在巴黎用桌上的怀表提出这个谜题;惠更斯为曲线命名,莱布尼茨于 1693 年给出分析。它的定义性质就藏在故事里:从曲线上任一点到牵引直线的切线段,长度恒等于 a。',
        '这条曲线的"后世"非常辉煌:绕渐近线旋转曳物线得到伪球面——一个常负曲率的喇叭形曲面。1868 年,Beltrami 在它上面具体实现了双曲几何,把"虚构的几何"变成了拿得起放得下的实物。',
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
        'x 轴是渐近线;曲线从尖点 (0, a) 出发。',
        '它的渐屈线(法线包络)是悬链线。',
        '绕渐近线旋转得到伪球面:高斯曲率恒为 −1/a²。',
        '伪球面虽无限延伸,面积却是有限的 4πa²,体积也有限。',
      ],
    },
    seenIn: {
      en: 'The dragged-watch story, pseudosphere models of hyperbolic geometry, tractrix horns in audio, and gear tooth research.',
      zh: '"拖怀表"的典故、双曲几何的伪球面模型、音响中的曳物线号角,以及齿形研究。',
    },
    prompt: {
      en: 'Animate the tractrix: walk a point along the x-axis pulling an object on a unit leash, keep the taut leash drawn at every step to show its constant length, and trace the curve approaching the axis.',
      zh: '演示曳物线:一点沿 x 轴行走,用单位长度的绳子拖动物体,每一步都画出绷紧的绳子以显示其长度恒定,同时描出逐渐贴近横轴的曲线。',
    },
    related: ['catenary', 'cissoid-of-diocles', 'involute-of-a-circle'],
  },
  {
    slug: 'witch-of-agnesi',
    category: 'cartesian',
    name: { en: 'Witch of Agnesi', zh: '箕舌线' },
    short: {
      en: 'The bell-shaped cubic y = 8a³/(x² + 4a²), misnamed “witch” by a translation slip, and the Cauchy distribution’s profile.',
      zh: '钟形三次曲线 y = 8a³/(x² + 4a²),因翻译失误得名"女巫",也是柯西分布的轮廓。',
    },
    equations: ['y = \\frac{8a^3}{x^2 + 4a^2}'],
    params: [
      {
        key: 'a',
        label: { en: 'a (circle radius)', zh: 'a(生成圆半径)' },
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
        '取半径为 a、坐落在 x 轴上的圆。对从原点出发的每条射线,把"它与圆顶切线交点的高度"和"它与圆交点的横坐标"组合起来,得到的点画出钟形曲线 y = 8a³/(x² + 4a²)。费马在 1630 年研究过它;Agnesi 在 1748 年那部里程碑式的微积分教材中把它讲得清晰透彻。',
        '英文名"女巫"是著名的翻译事故:Agnesi 称它 la versiera(回转曲线),译者 Colson 误读为 l\'avversiera(女巫)。在统计学里,同一形状是柯西—洛伦兹分布——均值不存在的重尾密度;物理学家则在共振的洛伦兹线形中与它相遇。',
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
        '峰值高度 2a,位于 x = 0;x 轴是渐近线。',
        '曲线与渐近线之间的面积为 4πa²——生成圆面积的四倍。',
        '拐点位于 x = ±2a/√3。',
        '归一化后即柯西分布:均值不存在、方差无穷。',
        '绕渐近线旋转所得体积为 4π²a³。',
      ],
    },
    seenIn: {
      en: 'The Cauchy distribution in statistics, Lorentzian resonance peaks in physics, smooth-hill test terrain in fluid dynamics, and calculus textbooks since 1748.',
      zh: '统计学中的柯西分布、物理学中的洛伦兹共振峰、流体力学的光滑山丘试验地形,以及 1748 年以来的微积分教材。',
    },
    prompt: {
      en: 'Animate the witch of Agnesi: rotate a ray from the origin through a circle of radius 0.8 resting on the x-axis, combine the two intersection coordinates to plot each point, and trace the full bell curve with its asymptote.',
      zh: '演示箕舌线的生成:从原点旋转一条射线,穿过坐落在 x 轴上的半径 0.8 的圆,组合两个交点的坐标得到描点,最终画出完整的钟形曲线及其渐近线。',
    },
    related: ['cissoid-of-diocles', 'catenary', 'parabola'],
  },
  {
    slug: 'folium-of-descartes',
    category: 'cartesian',
    name: { en: 'Folium of Descartes', zh: '笛卡尔叶形线' },
    short: {
      en: 'The looped cubic x³ + y³ = 3axy that sparked the Descartes–Fermat duel over tangent lines.',
      zh: '带环的三次曲线 x³ + y³ = 3axy,引发了笛卡尔与费马关于切线方法的对决。',
    },
    equations: [
      'x^3 + y^3 = 3axy',
      'x = \\frac{3at}{1+t^3}, \\quad y = \\frac{3at^2}{1+t^3}',
    ],
    params: [
      {
        key: 'a',
        label: { en: 'a (size)', zh: 'a(大小)' },
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
        '笛卡尔在 1638 年提出曲线 x³ + y³ = 3axy,并向费马挑战求其切线——本想让对方难堪。费马用他的"拟等法"轻松解决,成为通往导数概念的早期里程碑。folium 是拉丁语"叶子":曲线在第一象限绕出一个经过原点的环,并沿两条臂伸向远方。',
        '叶形线是隐函数求导的标准first example,而且回报实在:环在原点处自交形成结点,拥有两条不同的切线;两条臂逼近同一条渐近线 x + y + a = 0。对称轴是直线 y = x,环的顶点位于 (3a/2, 3a/2)。',
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
        '原点是结点,两条切线分别沿两条坐标轴。',
        '两条臂共用渐近线 x + y + a = 0。',
        '环的面积为 3a²/2,且恰好等于臂与渐近线之间的面积。',
        '关于 y = x 对称;环的顶点为 (3a/2, 3a/2)。',
        '有理参数化 x = 3at/(1+t³)、y = 3at²/(1+t³) 覆盖整条曲线。',
      ],
    },
    seenIn: {
      en: 'Implicit differentiation lessons, the history of tangent methods before calculus, and algebraic curve galleries.',
      zh: '隐函数求导课程、微积分诞生前的切线方法史,以及代数曲线图鉴。',
    },
    prompt: {
      en: 'Animate the folium of Descartes x³ + y³ = 3xy: trace the loop through the origin and both infinite arms, draw the asymptote x + y + 1 = 0, then use implicit differentiation to show the tangent at the loop’s vertex (3/2, 3/2) has slope −1.',
      zh: '演示笛卡尔叶形线 x³ + y³ = 3xy:描出经过原点的环与两条无限延伸的臂,画出渐近线 x + y + 1 = 0,并用隐函数求导展示顶点 (3/2, 3/2) 处切线斜率为 −1。',
    },
    related: ['cissoid-of-diocles', 'lemniscate-of-bernoulli', 'witch-of-agnesi'],
  },
];
