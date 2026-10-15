import { sweep, TAU, type CurveDef, type CurvePoints } from '../types';

const GOLDEN_B = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2);

/**
 * Quarter circles of radius F₁, F₂, … Fₙ, each turning a further 90°, with
 * the squares they sit in as one faint guide path (edges may be retraced).
 */
function fibonacciSpiral(n: number): CurvePoints {
  const fib = [1, 1];
  while (fib.length < n) fib.push(fib[fib.length - 1] + fib[fib.length - 2]);
  const unit = (angle: number): [number, number] => [
    Math.cos(angle),
    Math.sin(angle),
  ];
  const arcs: Array<[number, number]> = [];
  const squares: Array<[number, number]> = [];
  let center: [number, number] = [0, 0];
  for (let k = 0; k < n; k += 1) {
    const r = fib[k];
    const start = (k * Math.PI) / 2;
    if (k > 0) {
      // Keep the joint smooth: the new centre lies on the same radius,
      // moved back by the difference of the two radii.
      const [ux, uy] = unit(start);
      const shift = fib[k] - fib[k - 1];
      center = [center[0] - shift * ux, center[1] - shift * uy];
    }
    const [ax, ay] = unit(start);
    const [bx, by] = unit(start + Math.PI / 2);
    const from: [number, number] = [center[0] + r * ax, center[1] + r * ay];
    const corner: [number, number] = [from[0] + r * bx, from[1] + r * by];
    const to: [number, number] = [center[0] + r * bx, center[1] + r * by];
    squares.push(from, corner, to, center, from, center, to);
    const arc = sweep(start, start + Math.PI / 2, 60, (t) => [
      center[0] + r * Math.cos(t),
      center[1] + r * Math.sin(t),
    ]);
    arcs.push(...(k === 0 ? arc : arc.slice(1)));
  }
  return [squares, arcs];
}

export const spiralCurves: CurveDef[] = [
  {
    slug: 'archimedean-spiral',
    category: 'spiral',
    name: { en: 'Archimedean Spiral', zh: '阿基米德螺线' },
    short: {
      en: 'The constant-pitch spiral r = a + bθ, whose successive turns stay exactly 2πb apart.',
      zh: '等距螺线 r = a + bθ，相邻两圈的间距恒等于 2πb。',
    },
    equations: ['r = a + b\\theta'],
    params: [
      {
        key: 'b',
        label: { en: 'b (spacing / 2π)', zh: 'b（圈距 ÷ 2π）' },
        min: 0.06,
        max: 0.3,
        step: 0.01,
        defaultValue: 0.16,
      },
      {
        key: 'turns',
        label: { en: 'turns', zh: '圈数' },
        min: 2,
        max: 6,
        step: 1,
        defaultValue: 4,
      },
    ],
    fitMode: 'refit',
    sample: ({ b, turns }) => [
      sweep(0, turns * TAU, 1200, (t) => {
        const r = b * t;
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The Archimedean spiral r = a + bθ grows outward at a constant rate: every full turn adds exactly 2πb to the radius, so the gap between coils never changes. Archimedes analyzed it in his treatise On Spirals around 225 BC, using it to square the circle and trisect angles — two feats impossible with compass and straightedge alone.',
        'Because the spacing is uniform, this is the spiral of wound-up physical things: rolled paper, vinyl record grooves, watch springs, and the scroll compressor inside many air conditioners.',
      ],
      zh: [
        '阿基米德螺线 r = a + bθ 以恒定速度向外生长：每转一整圈，半径恰好增加 2πb，因此圈与圈之间的距离永远相同。阿基米德在公元前 225 年左右的《论螺线》中系统研究了它，并用它完成化圆为方与三等分角——这两件事仅靠尺规是不可能的。',
        '正因为圈距均匀，它是"缠绕起来的实物"的螺线：卷纸、黑胶唱片纹路、钟表发条，以及许多空调里的涡旋压缩机。',
      ],
    },
    properties: {
      en: [
        'Successive turns are separated by a constant distance 2πb.',
        'A ray from the origin meets consecutive coils at equal spacing — the defining property.',
        'Arc length from 0 to θ: (b/2)[θ√(1+θ²) + ln(θ + √(1+θ²))] for r = bθ.',
        'The area swept by the first turn of r = bθ is (4/3)π³b² (Archimedes’ own result: one third of the enclosing circle).',
        'Polar slope angle grows with θ — the spiral becomes ever more circle-like far from the center.',
      ],
      zh: [
        '相邻两圈之间的距离恒为 2πb。',
        '从原点出发的任意射线与各圈的交点等距分布——这是它的定义性质。',
        '对 r = bθ，从 0 到 θ 的弧长为 (b/2)[θ√(1+θ²) + ln(θ + √(1+θ²))]。',
        'r = bθ 第一圈扫过的面积是外接圆的三分之一——这是阿基米德本人的结果。',
        '极坐标切线角随 θ 增大，离中心越远，螺线越接近圆。',
      ],
    },
    seenIn: {
      en: 'Record grooves, scroll compressors, clock springs, spiral antennas, and CNC spiral toolpaths.',
      zh: '唱片纹路、涡旋压缩机、钟表发条、螺旋天线，以及 CNC 螺旋走刀路径。',
    },
    prompt: {
      en: 'Animate the Archimedean spiral r = 0.16θ over four turns: draw a ray from the origin, mark where it crosses each coil, and show with measured segments that the crossings are equally spaced at 2πb.',
      zh: '演示阿基米德螺线 r = 0.16θ 转四圈的生长过程：从原点画一条射线，标出它与每一圈的交点，并用测量线段展示这些交点间距恒为 2πb。',
    },
    related: ['logarithmic-spiral', 'fermat-spiral', 'involute-of-a-circle', 'hyperbolic-spiral'],
  },
  {
    slug: 'logarithmic-spiral',
    category: 'spiral',
    name: { en: 'Logarithmic Spiral', zh: '对数螺线' },
    short: {
      en: 'The self-similar spiral r = a·e^{bθ} that crosses every radius at the same angle — nature’s growth curve.',
      zh: '自相似螺线 r = a·e^{bθ}，与每条半径线的夹角恒定，是自然界的生长曲线。',
    },
    equations: ['r = a e^{b\\theta}'],
    params: [
      {
        key: 'b',
        label: { en: 'b (growth rate)', zh: 'b（生长率）' },
        min: 0.08,
        max: 0.28,
        step: 0.01,
        defaultValue: 0.17,
      },
    ],
    fitMode: 'refit',
    sample: ({ b }) => [
      sweep(-4 * TAU, 2.5 * TAU, 1400, (t) => {
        const r = Math.exp(b * t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The logarithmic (or equiangular) spiral r = a·e^{bθ} multiplies its radius by a fixed factor with every turn, instead of adding a fixed amount. The result is perfect self-similarity: zooming in or out gives back the same spiral, only rotated. Jacob Bernoulli was so taken with the property that he asked for the curve on his tombstone with the motto “eadem mutata resurgo” — though the stonemason mistakenly carved an Archimedean spiral.',
        'Its defining feature is the constant angle between the curve and every ray from the center, with cot of that angle equal to b. This is why hawks approach prey along one and why the nautilus shell, which grows without changing shape, follows it.',
      ],
      zh: [
        '对数螺线（又称等角螺线）r = a·e^{bθ} 每转一圈，半径乘以一个固定倍数，而不是加上固定长度。结果是完美的自相似：无论放大还是缩小，得到的仍是同一条螺线，只是转了个角度。雅各布·伯努利深爱这一性质，要求把它刻上自己的墓碑，铭文"纵使改变，我依然故我"——可惜石匠误刻成了阿基米德螺线。',
        '它的定义特征是曲线与所有从中心出发的射线夹角恒定，该角的余切恰为 b。这解释了鹰为何沿对数螺线俯冲接近猎物，也解释了鹦鹉螺壳——一种生长中形状不变的结构——为何遵循它。',
      ],
    },
    properties: {
      en: [
        'Equiangular: the tangent makes a constant angle α with every radius, cot α = b.',
        'Self-similar: scaling by e^{2πb} equals rotating by one turn.',
        'Each turn multiplies the radius by e^{2πb}.',
        'Total arc length from the pole to angle θ is finite: r(θ)·√(1+b²)/b.',
        'Special case b → 0 degenerates to a circle.',
      ],
      zh: [
        '等角性：切线与每条半径的夹角 α 恒定，且 cot α = b。',
        '自相似：按 e^{2πb} 缩放等价于旋转一整圈。',
        '每转一圈，半径乘以 e^{2πb}。',
        '从极点到角 θ 的弧长是有限的：r(θ)·√(1+b²)/b。',
        'b → 0 的极限情形退化为圆。',
      ],
    },
    seenIn: {
      en: 'Nautilus shells, hurricane cloud bands, spiral galaxies, hawk flight paths, and low-noise spiral antennas.',
      zh: '鹦鹉螺壳、飓风云带、旋涡星系、鹰的飞行轨迹，以及低噪声螺旋天线。',
    },
    prompt: {
      en: 'Animate the logarithmic spiral r = e^{0.17θ}: trace it inward and outward from the pole, draw several rays from the center, and show the tangent crossing each ray at the same constant angle.',
      zh: '演示对数螺线 r = e^{0.17θ}：从极点向内、向外同时描出曲线，从中心画出几条射线，并展示切线与每条射线的夹角保持恒定。',
    },
    related: ['golden-spiral', 'archimedean-spiral', 'fermat-spiral'],
  },
  {
    slug: 'fermat-spiral',
    category: 'spiral',
    name: { en: 'Fermat Spiral', zh: '费马螺线' },
    short: {
      en: 'The two-armed spiral r² = a²θ whose coils pack tighter as they grow — the pattern behind sunflower seed heads.',
      zh: '双臂螺线 r² = a²θ，越向外圈越密——向日葵种子排布背后的图案。',
    },
    equations: ['r^2 = a^2\\theta', 'r = \\pm a\\sqrt{\\theta}'],
    params: [
      {
        key: 'turns',
        label: { en: 'turns', zh: '圈数' },
        min: 2,
        max: 8,
        step: 1,
        defaultValue: 5,
      },
    ],
    fitMode: 'refit',
    sample: ({ turns }) => {
      const arm = (sign: number) =>
        sweep(0, turns * TAU, 1200, (t) => {
          const r = sign * Math.sqrt(t);
          return [r * Math.cos(t), r * Math.sin(t)];
        });
      return [arm(1), arm(-1)];
    },
    intro: {
      en: [
        'Fermat’s spiral takes the square-root growth law r = a√θ, proposed by Pierre de Fermat in 1636. Because the radius grows ever more slowly, each successive coil sits closer to the previous one — the opposite feel of the logarithmic spiral. Taking both signs of the square root yields two arms that meet smoothly at the origin, dividing the plane into two congruent interlocking regions.',
        'Its claim to fame is equal-area packing: Vogel’s 1979 sunflower model places the n-th seed at r = √n with the golden angle 137.5° between neighbors, filling the disk with uniform density. The same layout now positions mirrors in some concentrated solar power plants.',
      ],
      zh: [
        '费马螺线采用平方根生长律 r = a√θ，由费马于 1636 年提出。半径增长越来越慢，因此外圈一圈比一圈更靠近内圈——与对数螺线的观感正好相反。取平方根的正负两支，得到在原点平滑相接的两条臂，把平面分成两块全等且互相咬合的区域。',
        '它最出名的应用是等面积排布：Vogel 在 1979 年提出的向日葵模型把第 n 颗种子放在 r = √n 处、相邻种子夹黄金角 137.5°，使圆盘被均匀填满。如今一些聚光太阳能电站的定日镜也采用同样的布局。',
      ],
    },
    properties: {
      en: [
        'Each ring between consecutive turns encloses the same area — the key to uniform seed packing.',
        'The full curve (both signs) is smooth at the origin, with no cusp.',
        'It is the special case n = 2 of the parabolic spirals r^n = aⁿθ.',
        'Coil spacing shrinks like 1/√θ as the spiral grows.',
        'Vogel’s model: r = c√n, θ = n × 137.5° reproduces sunflower heads.',
      ],
      zh: [
        '相邻两圈之间的每个环带面积相同——这是种子均匀排布的关键。',
        '完整曲线（正负两支）在原点处光滑，没有尖点。',
        '它是抛物型螺线族 r^n = aⁿθ 中 n = 2 的特例。',
        '圈距随生长按 1/√θ 收缩。',
        'Vogel 模型：r = c√n、θ = n × 137.5°，可复现向日葵花盘。',
      ],
    },
    seenIn: {
      en: 'Sunflower and daisy seed heads, heliostat layouts in solar plants, and low-crossing cable spooling.',
      zh: '向日葵与雏菊的花盘、太阳能电站定日镜布局，以及减少交叉的电缆盘绕。',
    },
    prompt: {
      en: 'Animate Fermat’s spiral r = ±√θ: grow both arms from the origin, then place dots at r = √n with 137.5° between them to build a sunflower head, and highlight that each ring holds equal area.',
      zh: '演示费马螺线 r = ±√θ：从原点同时生长两条臂，然后按 r = √n、相邻夹角 137.5° 放置圆点，拼出向日葵花盘，并高亮"每个环带面积相等"的性质。',
    },
    related: ['archimedean-spiral', 'logarithmic-spiral', 'golden-spiral'],
  },
  {
    slug: 'golden-spiral',
    category: 'spiral',
    name: { en: 'Golden Spiral', zh: '黄金螺线' },
    short: {
      en: 'The logarithmic spiral that widens by the golden ratio φ every quarter turn, approximated by the Fibonacci arc construction.',
      zh: '每转四分之一圈半径就扩大黄金比 φ 的对数螺线，常用斐波那契圆弧近似。',
    },
    equations: [
      'r = a\\,\\varphi^{2\\theta/\\pi}',
      '\\varphi = \\tfrac{1+\\sqrt5}{2} \\approx 1.618',
    ],
    params: [
      {
        key: 'turns',
        label: { en: 'turns', zh: '圈数' },
        min: 2,
        max: 5,
        step: 0.5,
        defaultValue: 3.5,
      },
    ],
    fitMode: 'refit',
    sample: ({ turns }) => [
      sweep(-turns * TAU, 0.75 * TAU, 1400, (t) => {
        const r = Math.exp(GOLDEN_B * t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'The golden spiral is the logarithmic spiral whose growth factor is the golden ratio φ ≈ 1.618 per quarter turn, i.e. r = a·φ^{2θ/π}. It inherits every property of the equiangular family — self-similarity above all — but ties the growth rate to the most famous constant in classical proportion theory.',
        'The version most people meet is the Fibonacci spiral: quarter-circle arcs drawn inside a rectangle tiled by squares of side 1, 1, 2, 3, 5, 8… Because ratios of consecutive Fibonacci numbers converge to φ, the arc construction converges to the true golden spiral, though the two never exactly coincide.',
      ],
      zh: [
        '黄金螺线是生长因子固定为黄金比 φ ≈ 1.618/四分之一圈的对数螺线，即 r = a·φ^{2θ/π}。它继承等角螺线家族的全部性质——尤其是自相似，同时把生长率与古典比例理论中最著名的常数绑定在一起。',
        '大多数人最先见到的其实是斐波那契螺线：在边长为 1、1、2、3、5、8…的正方形铺成的矩形里画四分之一圆弧拼接而成。由于相邻斐波那契数之比收敛于 φ，这个圆弧构造收敛于真正的黄金螺线，但两者永远不会完全重合。',
      ],
    },
    properties: {
      en: [
        'Growth factor φ per quarter turn; φ⁴ ≈ 6.854 per full turn.',
        'Equiangular with pitch b = ln φ / (π/2) ≈ 0.3063.',
        'The Fibonacci quarter-arc spiral is an approximation, not the curve itself.',
        'Removing the largest square from a golden rectangle leaves a golden rectangle — the geometric engine of the spiral.',
        'Claims of golden spirals in nautilus shells are mostly overstated; measured shells fit general logarithmic spirals with other pitches.',
      ],
      zh: [
        '每四分之一圈生长 φ 倍，每整圈约 φ⁴ ≈ 6.854 倍。',
        '等角螺线，螺距参数 b = ln φ / (π/2) ≈ 0.3063。',
        '斐波那契四分之一圆弧螺线只是近似，并非曲线本身。',
        '从黄金矩形中切掉最大的正方形，剩下的仍是黄金矩形——这是螺线的几何发动机。',
        '"鹦鹉螺壳是黄金螺线"的说法大多言过其实：实测贝壳符合其他螺距的一般对数螺线。',
      ],
    },
    seenIn: {
      en: 'Golden-rectangle constructions, composition guides in photography and design, and Fibonacci-themed lessons.',
      zh: '黄金矩形作图、摄影与设计中的构图参考线，以及斐波那契主题课程。',
    },
    prompt: {
      en: 'Animate the golden spiral: tile a golden rectangle with squares of Fibonacci sides 1, 1, 2, 3, 5, 8, draw the quarter-circle arcs through them, then overlay the true logarithmic spiral r = φ^{2θ/π} and point out where the two differ.',
      zh: '演示黄金螺线：用边长 1、1、2、3、5、8 的斐波那契正方形铺满黄金矩形，在其中画四分之一圆弧，再叠加真正的对数螺线 r = φ^{2θ/π}，指出两者的差异所在。',
    },
    related: ['logarithmic-spiral', 'fermat-spiral', 'fibonacci-spiral'],
  },
  {
    slug: 'involute-of-a-circle',
    category: 'spiral',
    name: { en: 'Involute of a Circle', zh: '圆的渐开线' },
    short: {
      en: 'The path of a string end unwinding from a circle — the profile that makes modern gear teeth run smoothly.',
      zh: '从圆上退绕的线端走出的轨迹——让现代齿轮平稳啮合的齿形曲线。',
    },
    equations: [
      'x = r(\\cos t + t\\sin t)',
      'y = r(\\sin t - t\\cos t)',
    ],
    params: [
      {
        key: 'turns',
        label: { en: 'unwound turns', zh: '退绕圈数' },
        min: 1,
        max: 4,
        step: 0.5,
        defaultValue: 2.5,
      },
    ],
    fitMode: 'refit',
    guideLines: 1,
    sample: ({ turns }) => {
      const base = sweep(0, TAU, 200, (t) => [Math.cos(t), Math.sin(t)]);
      const involute = sweep(0, turns * TAU, 1200, (t) => [
        Math.cos(t) + t * Math.sin(t),
        Math.sin(t) - t * Math.cos(t),
      ]);
      return [base, involute];
    },
    intro: {
      en: [
        'Wrap a taut string around a circle, then unwind it while keeping it tight: the free end traces the involute of the circle. At every instant the unwound string segment is tangent to the circle and perpendicular to the curve, and its length equals the arc it just left — geometry you can read directly off the parametric form x = r(cos t + t·sin t), y = r(sin t − t·cos t).',
        'Christiaan Huygens introduced involutes in 1673 while designing pendulum clocks. Leonhard Euler later proposed the curve for gear teeth, and it stuck: two involute profiles always meet along a fixed straight line of action, so the speed ratio stays perfectly constant even when the distance between gear centers drifts.',
      ],
      zh: [
        '把一根拉紧的线绕在圆上，再保持张紧地退绕：线的自由端画出的就是圆的渐开线。任一时刻，退绕出的那段线都与圆相切、与曲线垂直，长度恰等于它刚离开的那段圆弧——这些几何事实可以直接从参数方程 x = r(cos t + t·sin t)、y = r(sin t − t·cos t) 中读出。',
        '惠更斯在 1673 年设计摆钟时引入了渐开线，欧拉后来提议将它用作齿轮齿形，并从此成为标准：两条渐开线齿廓的接触点始终落在一条固定的啮合直线上，即使两齿轮中心距略有漂移，转速比也保持精确恒定。',
      ],
    },
    properties: {
      en: [
        'The unwound string is always tangent to the base circle and normal to the involute.',
        'Arc length from the starting cusp to parameter t: r·t²/2.',
        'The curve starts at a cusp on the circle and spirals outward forever.',
        'Its evolute (envelope of normals) is the base circle itself.',
        'Gear meshing: contact between two involutes travels along a straight “line of action”, giving a constant transmission ratio.',
      ],
      zh: [
        '退绕出的线段始终与基圆相切，并与渐开线垂直。',
        '从起始尖点到参数 t 的弧长为 r·t²/2。',
        '曲线从圆上的尖点出发，向外无限盘旋。',
        '它的渐屈线（法线包络）正是基圆本身。',
        '齿轮啮合：两条渐开线的接触点沿一条固定的"啮合线"移动，传动比恒定。',
      ],
    },
    seenIn: {
      en: 'Nearly every modern gear tooth, scroll compressor walls, and the classic string-unwinding demonstration.',
      zh: '几乎所有现代齿轮的齿形、涡旋压缩机壁面，以及经典的"绕线退绕"演示。',
    },
    prompt: {
      en: 'Animate the involute of a circle: show a taut string unwinding from a unit circle with the straight segment always tangent, trace the path of the free end, and annotate that the segment length equals the unwrapped arc r·t.',
      zh: '演示圆的渐开线：一根拉紧的线从单位圆上退绕，直线段始终与圆相切，描出线端的轨迹，并标注"线段长度等于已退绕圆弧长 r·t"。',
    },
    related: ['archimedean-spiral', 'cycloid', 'tractrix'],
  },
  {
    slug: 'hyperbolic-spiral',
    category: 'spiral',
    name: { en: 'Hyperbolic spiral', zh: '双曲螺线' },
    short: {
      en: 'r = a/θ: it winds in towards the pole forever while its far end runs along the line y = a.',
      zh: 'r = a/θ：一端无限绕向极点，另一端沿直线 y = a 远去。',
    },
    equations: ['r = \\frac{a}{\\theta}'],
    params: [
      {
        key: 'turns',
        label: { en: 'Turns', zh: '圈数' },
        min: 1,
        max: 5,
        step: 1,
        defaultValue: 3,
      },
    ],
    fitMode: 'refit',
    sample: ({ turns }) => [
      sweep(0.3, turns * TAU, 1200, (t) => [Math.cos(t) / t, Math.sin(t) / t]),
    ],
    intro: {
      en: [
        'Pierre Varignon studied the hyperbolic spiral in 1704. Its equation r = a/θ is the Archimedean spiral turned inside out: the radius shrinks in proportion to 1/θ, so the curve circles the pole infinitely many times without ever reaching it.',
        'At the other end something unexpected happens. As θ goes to 0 the radius grows without bound, but the height r·sin θ = a·sin θ/θ tends to a, so the curve settles onto the horizontal asymptote y = a.',
      ],
      zh: [
        'Pierre Varignon 在 1704 年研究了双曲螺线。r = a/θ 相当于把阿基米德螺线"里外翻转"：半径按 1/θ 缩小，曲线绕极点无数圈却永远到不了极点。',
        '另一端则有出人意料的事：θ → 0 时半径无限增大，但高度 r·sin θ = a·sin θ/θ 趋于 a，于是曲线贴到水平渐近线 y = a 上。',
      ],
    },
    properties: {
      en: [
        'Horizontal asymptote y = a as θ → 0.',
        'Winds around the pole infinitely often as θ → ∞, never reaching it.',
        'Inversion in the unit circle maps it to the Archimedean spiral r = θ/a.',
        'Each turn shrinks the radius by a factor θ/(θ + 2π), not a constant ratio.',
        'Studied by Pierre Varignon in 1704.',
      ],
      zh: [
        'θ → 0 时以 y = a 为水平渐近线。',
        'θ → ∞ 时绕极点无数圈，但永远到不了极点。',
        '在单位圆中反演，得到阿基米德螺线 r = θ/a。',
        '每转一圈半径缩为原来的 θ/(θ + 2π)，比例不是常数。',
        'Pierre Varignon 于 1704 年研究了它。',
      ],
    },
    seenIn: {
      en: 'Exercises on polar asymptotes and the inversion of curves.',
      zh: '极坐标渐近线与曲线反演的练习。',
    },
    prompt: {
      en: 'Animate the hyperbolic spiral r = 1/θ: sweep a ray from θ = 0.3 outwards in angle, draw the asymptote y = 1 and show the height r·sin θ approaching it, then follow the spiral inward around the pole.',
      zh: '演示双曲螺线 r = 1/θ：让射线从 θ = 0.3 开始转动，画出渐近线 y = 1 并展示高度 r·sin θ 趋近于它，再跟着螺线绕向极点。',
    },
    related: ['archimedean-spiral', 'lituus', 'cochleoid'],
  },
  {
    slug: 'lituus',
    category: 'spiral',
    name: { en: 'Lituus', zh: '连锁螺线（Lituus）' },
    short: {
      en: 'r²θ = a²: a shepherd’s-crook spiral named by Roger Cotes, whose sectors have equal area whenever their angles have equal ratio.',
      zh: 'r²θ = a²：Roger Cotes 命名的"牧杖"形螺线；只要两条半径的角度之比相同，扫过的扇形面积就相同。',
    },
    equations: ['r^2\\theta = a^2', 'r = \\frac{a}{\\sqrt{\\theta}}'],
    params: [
      {
        key: 'turns',
        label: { en: 'Turns', zh: '圈数' },
        min: 1,
        max: 6,
        step: 1,
        defaultValue: 3,
      },
    ],
    fitMode: 'refit',
    sample: ({ turns }) => [
      sweep(0.04, turns * TAU, 1400, (t) => {
        const r = 1 / Math.sqrt(t);
        return [r * Math.cos(t), r * Math.sin(t)];
      }),
    ],
    intro: {
      en: [
        'Roger Cotes named this spiral in 1722 after the lituus, the curved staff of a Roman augur, which it resembles: a long straight handle that curls into a coil. In polar form r = a/√θ.',
        'Its sectors have a neat property. The area swept between angles θ₁ and θ₂ is (a²/2)·ln(θ₂/θ₁), so it depends only on their ratio. As θ → 0 the curve straightens out along the x-axis, its asymptote; as θ grows it coils ever more tightly around the pole.',
      ],
      zh: [
        'Roger Cotes 在 1722 年用古罗马占卜官的弯头手杖 lituus 给这条螺线命名，形状确实很像：一段长长的直柄，末端卷成一圈圈。极坐标形式为 r = a/√θ。',
        '它的扇形面积有个漂亮的性质：角度 θ₁ 到 θ₂ 之间扫过的面积是 (a²/2)·ln(θ₂/θ₁)，只取决于两者之比。θ → 0 时曲线沿 x 轴伸直，x 轴是它的渐近线；θ 增大时它绕极点越卷越紧。',
      ],
    },
    properties: {
      en: [
        'Polar equation r²θ = a², i.e. r = a/√θ.',
        'Sector area between θ₁ and θ₂: (a²/2)·ln(θ₂/θ₁).',
        'The x-axis is an asymptote as θ → 0.',
        'Winds into the pole as θ → ∞.',
        'Named by Roger Cotes in 1722.',
      ],
      zh: [
        '极坐标方程 r²θ = a²，即 r = a/√θ。',
        'θ₁ 到 θ₂ 之间的扇形面积：(a²/2)·ln(θ₂/θ₁)。',
        'θ → 0 时以 x 轴为渐近线。',
        'θ → ∞ 时卷向极点。',
        '由 Roger Cotes 于 1722 年命名。',
      ],
    },
    seenIn: {
      en: 'Crook-shaped ornaments and logos, and exercises on the area of polar sectors.',
      zh: '牧杖形的装饰与标志，以及极坐标扇形面积的练习。',
    },
    prompt: {
      en: 'Animate the lituus r = 1/√θ: trace it from the long straight handle near the x-axis into the coil, and shade two sectors with the same angle ratio to show their areas are equal.',
      zh: '演示连锁螺线 r = 1/√θ：从贴近 x 轴的长直柄一路描进卷曲处，再给角度之比相同的两个扇形涂上阴影，展示它们面积相等。',
    },
    related: ['hyperbolic-spiral', 'fermat-spiral', 'euler-spiral'],
  },
  {
    slug: 'euler-spiral',
    category: 'spiral',
    name: { en: 'Euler spiral (clothoid)', zh: '欧拉螺线（回旋曲线）' },
    short: {
      en: 'The curve whose curvature grows in proportion to its length: the transition bend of every motorway and railway.',
      zh: '曲率与弧长成正比的曲线：高速公路和铁路缓和曲线的形状。',
    },
    equations: [
      'x = \\int_0^t \\cos\\frac{\\pi s^2}{2}\\,ds,\\quad y = \\int_0^t \\sin\\frac{\\pi s^2}{2}\\,ds',
      '\\kappa = \\pi s',
    ],
    params: [
      {
        key: 'extent',
        label: { en: 'Arc length each way', zh: '每侧弧长' },
        min: 1,
        max: 5,
        step: 0.5,
        defaultValue: 3,
      },
    ],
    fitMode: 'refit',
    sample: ({ extent }) => {
      // Fresnel integrals by Simpson's rule, stepping outward from 0.
      const steps = Math.round(320 * extent);
      const h = extent / steps;
      const half: Array<[number, number]> = [[0, 0]];
      let x = 0;
      let y = 0;
      for (let i = 0; i < steps; i += 1) {
        const s0 = i * h;
        const f = (s: number) => (Math.PI * s * s) / 2;
        const a0 = f(s0);
        const a1 = f(s0 + h / 2);
        const a2 = f(s0 + h);
        x += (h / 6) * (Math.cos(a0) + 4 * Math.cos(a1) + Math.cos(a2));
        y += (h / 6) * (Math.sin(a0) + 4 * Math.sin(a1) + Math.sin(a2));
        half.push([x, y]);
      }
      // The curve is odd: the other arm is the point reflection.
      const other = half
        .slice(1)
        .reverse()
        .map(([px, py]): [number, number] => [-px, -py]);
      return [[...other, ...half]];
    },
    intro: {
      en: [
        'Leonhard Euler met this curve in 1744 while studying elastic rods; Augustin Fresnel’s integrals describe it, and Marie Alfred Cornu plotted it in 1874 for diffraction, so it is also called the Cornu spiral. Its defining property is simple: the curvature is proportional to the distance travelled along the curve.',
        'That property is why engineers call it the clothoid and use it everywhere. A car driven along it at constant speed turns its steering wheel at a constant rate, so a straight road can blend into a curve without a jolt. Railway and motorway transition curves are pieces of this spiral; at each end it winds into the points (±1/2, ±1/2).',
      ],
      zh: [
        '欧拉在 1744 年研究弹性杆时遇到了这条曲线；描述它的是菲涅耳积分；1874 年 Marie Alfred Cornu 为研究衍射把它画了出来，所以它也叫 Cornu 螺线。它的定义性质很简单：曲率与沿曲线走过的距离成正比。',
        '正因为这个性质，工程师叫它回旋曲线并到处使用：车以恒定速度沿它行驶时，方向盘以恒定速度转动，于是直路可以平顺地接入弯道，没有突兀的转向。铁路和高速公路的缓和曲线都是这条螺线的一段；两端分别卷向点 (±1/2, ±1/2)。',
      ],
    },
    properties: {
      en: [
        'Curvature proportional to arc length: κ = π·s in this normalisation.',
        'The parameter t is the arc length measured from the centre.',
        'Coordinates are the Fresnel integrals C(t) and S(t).',
        'The two ends wind into the points (1/2, 1/2) and (−1/2, −1/2).',
        'Used as the transition curve between straight track and circular arcs.',
      ],
      zh: [
        '曲率与弧长成正比：在这种归一化下 κ = π·s。',
        '参数 t 就是从中心量起的弧长。',
        '坐标就是菲涅耳积分 C(t) 和 S(t)。',
        '两端分别卷向点 (1/2, 1/2) 和 (−1/2, −1/2)。',
        '用作直线段与圆弧之间的缓和曲线。',
      ],
    },
    seenIn: {
      en: 'Road and railway design, roller-coaster loops, the diffraction pattern at a straight edge, and smooth font and path design.',
      zh: '道路与铁路设计、过山车的回环、直边衍射图样，以及字体与路径的平滑设计。',
    },
    prompt: {
      en: 'Animate the Euler spiral: drive a car along it from the centre, plot its curvature growing linearly with distance, and show the arms winding into the points (1/2, 1/2) and (−1/2, −1/2); finish with a straight road blending into a circular bend through a clothoid.',
      zh: '演示欧拉螺线：让一辆车从中心沿曲线行驶，同时画出曲率随距离线性增长，展示两端卷向 (1/2, 1/2) 和 (−1/2, −1/2)；最后用一段回旋曲线把直路平顺接到圆弧弯道上。',
    },
    related: ['involute-of-a-circle', 'logarithmic-spiral', 'lituus'],
  },
  {
    slug: 'spiral-of-theodorus',
    category: 'spiral',
    name: { en: 'Spiral of Theodorus', zh: '西奥多罗斯螺线' },
    short: {
      en: 'Right triangles with legs √n and 1 stacked around a point: the hypotenuses are √2, √3, √4 … and the outer edge spirals out.',
      zh: '以 √n 和 1 为直角边的直角三角形绕一点依次排开：斜边是 √2、√3、√4……外缘螺旋展开。',
    },
    equations: ['h_k = \\sqrt{k + 1}', '\\varphi_k = \\arctan\\frac{1}{\\sqrt{k}}'],
    params: [
      {
        key: 'n',
        label: { en: 'Triangles', zh: '三角形个数' },
        min: 1,
        max: 40,
        step: 1,
        defaultValue: 16,
      },
    ],
    fitMode: 'refit',
    guideLines: 1,
    sample: ({ n }) => {
      const outer: Array<[number, number]> = [[1, 0]];
      const spokes: Array<[number, number]> = [
        [0, 0],
        [1, 0],
      ];
      let angle = 0;
      for (let k = 1; k <= n; k += 1) {
        angle += Math.atan(1 / Math.sqrt(k));
        const r = Math.sqrt(k + 1);
        const vertex: [number, number] = [r * Math.cos(angle), r * Math.sin(angle)];
        outer.push(vertex);
        spokes.push([0, 0], vertex);
      }
      return [spokes, outer];
    },
    intro: {
      en: [
        'Start with a right triangle whose legs are both 1; its hypotenuse is √2. Use that hypotenuse as one leg of the next right triangle, with the other leg 1 again, and its hypotenuse is √3. Keep going and the hypotenuses run through √2, √3, √4, √5 … while the outer edges coil into a spiral.',
        'It is named after Theodorus of Cyrene, who, according to Plato’s Theaetetus, proved that the square roots of 3, 5, … up to 17 are irrational. One explanation for stopping at √17: the triangle with that hypotenuse is the last one before the spiral overlaps itself.',
      ],
      zh: [
        '先画两条直角边都为 1 的直角三角形，斜边是 √2。把这条斜边当作下一个直角三角形的一条直角边，另一条直角边仍为 1，斜边就是 √3。一直做下去，斜边依次是 √2、√3、√4、√5……外缘则卷成一条螺线。',
        '它以昔兰尼的西奥多罗斯命名。据柏拉图《泰阿泰德篇》记载，他证明了 √3、√5 直到 √17 都是无理数。对"为什么停在 √17"有一种解释：斜边为 √17 的那个三角形，是螺线自我重叠之前的最后一个。',
      ],
    },
    properties: {
      en: [
        'The k-th hypotenuse has length √(k + 1).',
        'Triangle k adds the angle arctan(1/√k) at the centre.',
        'The outer edge after n triangles has length n.',
        'The first 16 triangles (up to hypotenuse √17) turn 351°; the 17th overlaps the first.',
        'Successive turns approach a constant spacing, close to π.',
      ],
      zh: [
        '第 k 条斜边长 √(k + 1)。',
        '第 k 个三角形在中心处增加角度 arctan(1/√k)。',
        'n 个三角形之后，外缘总长为 n。',
        '前 16 个三角形（斜边到 √17）共转过 351°；第 17 个与第一个重叠。',
        '相邻两圈的间距趋于一个常数，接近 π。',
      ],
    },
    seenIn: {
      en: 'Lessons on irrational numbers and square roots, and geometric art.',
      zh: '无理数与平方根的课堂，以及几何艺术。',
    },
    prompt: {
      en: 'Animate the spiral of Theodorus: build right triangles with legs √n and 1 one by one, label each hypotenuse √2, √3, …, √17, and pause there: the next triangle would overlap the first.',
      zh: '演示西奥多罗斯螺线：一个接一个地搭出直角边为 √n 和 1 的直角三角形，依次标出斜边 √2、√3……√17，在这里停下，说明再加一个就会与第一个重叠。',
    },
    related: ['archimedean-spiral', 'golden-spiral', 'fermat-spiral'],
  },
  {
    slug: 'fibonacci-spiral',
    category: 'spiral',
    name: { en: 'Fibonacci spiral', zh: '斐波那契螺线' },
    short: {
      en: 'Quarter circles drawn in squares of side 1, 1, 2, 3, 5, 8 …: the popular approximation of the golden spiral.',
      zh: '在边长 1、1、2、3、5、8……的正方形里各画四分之一圆：黄金螺线最常见的近似画法。',
    },
    equations: ['F_{k+1} = F_k + F_{k-1}', 'L = \\frac{\\pi}{2}\\left(F_{n+2} - 1\\right)'],
    params: [
      {
        key: 'n',
        label: { en: 'Squares', zh: '正方形个数' },
        min: 3,
        max: 12,
        step: 1,
        defaultValue: 8,
      },
    ],
    fitMode: 'refit',
    guideLines: 1,
    sample: ({ n }) => fibonacciSpiral(n),
    intro: {
      en: [
        'Lay squares of side 1, 1, 2, 3, 5, 8, … edge to edge, each new one along the long side of the rectangle formed so far, and draw a quarter circle across each square. The arcs join smoothly into a spiral, and the squares always tile a rectangle of sides Fₙ × Fₙ₊₁.',
        'It is often shown as the golden spiral, but it is only an approximation. The ratio of successive radii Fₖ₊₁/Fₖ tends to the golden ratio φ, so the growth per quarter turn approaches φ; yet the curvature jumps at every joint, where a true logarithmic spiral changes smoothly.',
      ],
      zh: [
        '把边长 1、1、2、3、5、8……的正方形依次贴着已有长方形的长边摆开，在每个正方形里画四分之一圆。这些圆弧平滑地连成一条螺线，而正方形总是拼成一个 Fₙ × Fₙ₊₁ 的长方形。',
        '它常被当作黄金螺线展示，其实只是近似。相邻半径之比 Fₖ₊₁/Fₖ 趋于黄金比 φ，所以每转四分之一圈的放大倍数趋于 φ；但曲率在每个接缝处跳变，而真正的对数螺线是连续变化的。',
      ],
    },
    properties: {
      en: [
        'The k-th quarter circle has radius Fₖ, the k-th Fibonacci number.',
        'n squares tile a rectangle of sides Fₙ × Fₙ₊₁, so F₁² + … + Fₙ² = FₙFₙ₊₁.',
        'Total length of n arcs: (π/2)(Fₙ₊₂ − 1).',
        'Fₖ₊₁/Fₖ → φ ≈ 1.618, so it approaches the growth of the golden spiral.',
        'Unlike the golden spiral, its curvature jumps from 1/Fₖ to 1/Fₖ₊₁ at each joint.',
      ],
      zh: [
        '第 k 段四分之一圆的半径是第 k 个斐波那契数 Fₖ。',
        'n 个正方形拼成 Fₙ × Fₙ₊₁ 的长方形，所以 F₁² + … + Fₙ² = FₙFₙ₊₁。',
        'n 段圆弧的总长：(π/2)(Fₙ₊₂ − 1)。',
        'Fₖ₊₁/Fₖ → φ ≈ 1.618，所以它的增长趋近黄金螺线。',
        '与黄金螺线不同，它的曲率在每个接缝处从 1/Fₖ 跳到 1/Fₖ₊₁。',
      ],
    },
    seenIn: {
      en: 'Design grids and logo construction, photography composition guides, and lessons on the Fibonacci sequence.',
      zh: '设计网格与标志构图、摄影构图辅助线，以及斐波那契数列的课堂。',
    },
    prompt: {
      en: 'Animate the Fibonacci spiral: add squares of side 1, 1, 2, 3, 5, 8, 13, 21 one at a time, draw a quarter circle in each, show the ratio of the last two sides approaching 1.618, then overlay the true golden spiral to compare.',
      zh: '演示斐波那契螺线：一个接一个地加入边长 1、1、2、3、5、8、13、21 的正方形，在每个里画四分之一圆，显示最后两条边之比趋近 1.618，最后叠上真正的黄金螺线作比较。',
    },
    related: ['golden-spiral', 'logarithmic-spiral', 'spiral-of-theodorus'],
  },
];
