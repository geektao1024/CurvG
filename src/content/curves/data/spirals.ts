import { sweep, TAU, type CurveDef } from '../types';

const GOLDEN_B = Math.log((1 + Math.sqrt(5)) / 2) / (Math.PI / 2);

export const spiralCurves: CurveDef[] = [
  {
    slug: 'archimedean-spiral',
    category: 'spiral',
    name: { en: 'Archimedean Spiral', zh: '阿基米德螺线' },
    short: {
      en: 'The constant-pitch spiral r = a + bθ, whose successive turns stay exactly 2πb apart.',
      zh: '等距螺线 r = a + bθ,相邻两圈的间距恒等于 2πb。',
    },
    equations: ['r = a + b\\theta'],
    params: [
      {
        key: 'b',
        label: { en: 'b (spacing / 2π)', zh: 'b(圈距 ÷ 2π)' },
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
        '阿基米德螺线 r = a + bθ 以恒定速度向外生长:每转一整圈,半径恰好增加 2πb,因此圈与圈之间的距离永远相同。阿基米德在公元前 225 年左右的《论螺线》中系统研究了它,并用它完成化圆为方与三等分角——这两件事仅靠尺规是不可能的。',
        '正因为圈距均匀,它是"缠绕起来的实物"的螺线:卷纸、黑胶唱片纹路、钟表发条,以及许多空调里的涡旋压缩机。',
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
        '对 r = bθ,从 0 到 θ 的弧长为 (b/2)[θ√(1+θ²) + ln(θ + √(1+θ²))]。',
        'r = bθ 第一圈扫过的面积是外接圆的三分之一——这是阿基米德本人的结果。',
        '极坐标切线角随 θ 增大,离中心越远,螺线越接近圆。',
      ],
    },
    seenIn: {
      en: 'Record grooves, scroll compressors, clock springs, spiral antennas, and CNC spiral toolpaths.',
      zh: '唱片纹路、涡旋压缩机、钟表发条、螺旋天线,以及 CNC 螺旋走刀路径。',
    },
    prompt: {
      en: 'Animate the Archimedean spiral r = 0.16θ over four turns: draw a ray from the origin, mark where it crosses each coil, and show with measured segments that the crossings are equally spaced at 2πb.',
      zh: '演示阿基米德螺线 r = 0.16θ 转四圈的生长过程:从原点画一条射线,标出它与每一圈的交点,并用测量线段展示这些交点间距恒为 2πb。',
    },
    related: ['logarithmic-spiral', 'fermat-spiral', 'involute-of-a-circle'],
  },
  {
    slug: 'logarithmic-spiral',
    category: 'spiral',
    name: { en: 'Logarithmic Spiral', zh: '对数螺线' },
    short: {
      en: 'The self-similar spiral r = a·e^{bθ} that crosses every radius at the same angle — nature’s growth curve.',
      zh: '自相似螺线 r = a·e^{bθ},与每条半径线的夹角恒定,是自然界的生长曲线。',
    },
    equations: ['r = a e^{b\\theta}'],
    params: [
      {
        key: 'b',
        label: { en: 'b (growth rate)', zh: 'b(生长率)' },
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
        '对数螺线(又称等角螺线)r = a·e^{bθ} 每转一圈,半径乘以一个固定倍数,而不是加上固定长度。结果是完美的自相似:无论放大还是缩小,得到的仍是同一条螺线,只是转了个角度。雅各布·伯努利深爱这一性质,要求把它刻上自己的墓碑,铭文"纵使改变,我依然故我"——可惜石匠误刻成了阿基米德螺线。',
        '它的定义特征是曲线与所有从中心出发的射线夹角恒定,该角的余切恰为 b。这解释了鹰为何沿对数螺线俯冲接近猎物,也解释了鹦鹉螺壳——一种生长中形状不变的结构——为何遵循它。',
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
        '等角性:切线与每条半径的夹角 α 恒定,且 cot α = b。',
        '自相似:按 e^{2πb} 缩放等价于旋转一整圈。',
        '每转一圈,半径乘以 e^{2πb}。',
        '从极点到角 θ 的弧长是有限的:r(θ)·√(1+b²)/b。',
        'b → 0 的极限情形退化为圆。',
      ],
    },
    seenIn: {
      en: 'Nautilus shells, hurricane cloud bands, spiral galaxies, hawk flight paths, and low-noise spiral antennas.',
      zh: '鹦鹉螺壳、飓风云带、旋涡星系、鹰的飞行轨迹,以及低噪声螺旋天线。',
    },
    prompt: {
      en: 'Animate the logarithmic spiral r = e^{0.17θ}: trace it inward and outward from the pole, draw several rays from the center, and show the tangent crossing each ray at the same constant angle.',
      zh: '演示对数螺线 r = e^{0.17θ}:从极点向内、向外同时描出曲线,从中心画出几条射线,并展示切线与每条射线的夹角保持恒定。',
    },
    related: ['golden-spiral', 'archimedean-spiral', 'fermat-spiral'],
  },
  {
    slug: 'fermat-spiral',
    category: 'spiral',
    name: { en: 'Fermat Spiral', zh: '费马螺线' },
    short: {
      en: 'The two-armed spiral r² = a²θ whose coils pack tighter as they grow — the pattern behind sunflower seed heads.',
      zh: '双臂螺线 r² = a²θ,越向外圈越密——向日葵种子排布背后的图案。',
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
        '费马螺线采用平方根生长律 r = a√θ,由费马于 1636 年提出。半径增长越来越慢,因此外圈一圈比一圈更靠近内圈——与对数螺线的观感正好相反。取平方根的正负两支,得到在原点平滑相接的两条臂,把平面分成两块全等且互相咬合的区域。',
        '它最出名的应用是等面积排布:Vogel 在 1979 年提出的向日葵模型把第 n 颗种子放在 r = √n 处、相邻种子夹黄金角 137.5°,使圆盘被均匀填满。如今一些聚光太阳能电站的定日镜也采用同样的布局。',
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
        '完整曲线(正负两支)在原点处光滑,没有尖点。',
        '它是抛物型螺线族 r^n = aⁿθ 中 n = 2 的特例。',
        '圈距随生长按 1/√θ 收缩。',
        'Vogel 模型:r = c√n、θ = n × 137.5°,可复现向日葵花盘。',
      ],
    },
    seenIn: {
      en: 'Sunflower and daisy seed heads, heliostat layouts in solar plants, and low-crossing cable spooling.',
      zh: '向日葵与雏菊的花盘、太阳能电站定日镜布局,以及减少交叉的电缆盘绕。',
    },
    prompt: {
      en: 'Animate Fermat’s spiral r = ±√θ: grow both arms from the origin, then place dots at r = √n with 137.5° between them to build a sunflower head, and highlight that each ring holds equal area.',
      zh: '演示费马螺线 r = ±√θ:从原点同时生长两条臂,然后按 r = √n、相邻夹角 137.5° 放置圆点,拼出向日葵花盘,并高亮"每个环带面积相等"的性质。',
    },
    related: ['archimedean-spiral', 'logarithmic-spiral', 'golden-spiral'],
  },
  {
    slug: 'golden-spiral',
    category: 'spiral',
    name: { en: 'Golden Spiral', zh: '黄金螺线' },
    short: {
      en: 'The logarithmic spiral that widens by the golden ratio φ every quarter turn, approximated by the Fibonacci arc construction.',
      zh: '每转四分之一圈半径就扩大黄金比 φ 的对数螺线,常用斐波那契圆弧近似。',
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
        '黄金螺线是生长因子固定为黄金比 φ ≈ 1.618/四分之一圈的对数螺线,即 r = a·φ^{2θ/π}。它继承等角螺线家族的全部性质——尤其是自相似,同时把生长率与古典比例理论中最著名的常数绑定在一起。',
        '大多数人最先见到的其实是斐波那契螺线:在边长为 1、1、2、3、5、8…的正方形铺成的矩形里画四分之一圆弧拼接而成。由于相邻斐波那契数之比收敛于 φ,这个圆弧构造收敛于真正的黄金螺线,但两者永远不会完全重合。',
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
        '每四分之一圈生长 φ 倍,每整圈约 φ⁴ ≈ 6.854 倍。',
        '等角螺线,螺距参数 b = ln φ / (π/2) ≈ 0.3063。',
        '斐波那契四分之一圆弧螺线只是近似,并非曲线本身。',
        '从黄金矩形中切掉最大的正方形,剩下的仍是黄金矩形——这是螺线的几何发动机。',
        '"鹦鹉螺壳是黄金螺线"的说法大多言过其实:实测贝壳符合其他螺距的一般对数螺线。',
      ],
    },
    seenIn: {
      en: 'Golden-rectangle constructions, composition guides in photography and design, and Fibonacci-themed lessons.',
      zh: '黄金矩形作图、摄影与设计中的构图参考线,以及斐波那契主题课程。',
    },
    prompt: {
      en: 'Animate the golden spiral: tile a golden rectangle with squares of Fibonacci sides 1, 1, 2, 3, 5, 8, draw the quarter-circle arcs through them, then overlay the true logarithmic spiral r = φ^{2θ/π} and point out where the two differ.',
      zh: '演示黄金螺线:用边长 1、1、2、3、5、8 的斐波那契正方形铺满黄金矩形,在其中画四分之一圆弧,再叠加真正的对数螺线 r = φ^{2θ/π},指出两者的差异所在。',
    },
    related: ['logarithmic-spiral', 'fermat-spiral'],
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
        '把一根拉紧的线绕在圆上,再保持张紧地退绕:线的自由端画出的就是圆的渐开线。任一时刻,退绕出的那段线都与圆相切、与曲线垂直,长度恰等于它刚离开的那段圆弧——这些几何事实可以直接从参数方程 x = r(cos t + t·sin t)、y = r(sin t − t·cos t) 中读出。',
        '惠更斯在 1673 年设计摆钟时引入了渐开线,欧拉后来提议将它用作齿轮齿形,并从此成为标准:两条渐开线齿廓的接触点始终落在一条固定的啮合直线上,即使两齿轮中心距略有漂移,转速比也保持精确恒定。',
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
        '退绕出的线段始终与基圆相切,并与渐开线垂直。',
        '从起始尖点到参数 t 的弧长为 r·t²/2。',
        '曲线从圆上的尖点出发,向外无限盘旋。',
        '它的渐屈线(法线包络)正是基圆本身。',
        '齿轮啮合:两条渐开线的接触点沿一条固定的"啮合线"移动,传动比恒定。',
      ],
    },
    seenIn: {
      en: 'Nearly every modern gear tooth, scroll compressor walls, and the classic string-unwinding demonstration.',
      zh: '几乎所有现代齿轮的齿形、涡旋压缩机壁面,以及经典的"绕线退绕"演示。',
    },
    prompt: {
      en: 'Animate the involute of a circle: show a taut string unwinding from a unit circle with the straight segment always tangent, trace the path of the free end, and annotate that the segment length equals the unwrapped arc r·t.',
      zh: '演示圆的渐开线:一根拉紧的线从单位圆上退绕,直线段始终与圆相切,描出线端的轨迹,并标注"线段长度等于已退绕圆弧长 r·t"。',
    },
    related: ['archimedean-spiral', 'cycloid', 'tractrix'],
  },
];
