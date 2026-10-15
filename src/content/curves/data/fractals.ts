import type { CurveDef, CurvePoints } from '../types';

type Point = [number, number];

/** Koch snowflake: an equilateral triangle, each edge bent `level` times. */
export function kochSnowflake(level: number): Point[] {
  const h = Math.sqrt(3) / 2;
  // Side 1, centred on the origin, drawn clockwise so the bumps point out.
  let points: Point[] = [
    [-0.5, -h / 3],
    [0, (2 * h) / 3],
    [0.5, -h / 3],
    [-0.5, -h / 3],
  ];
  for (let step = 0; step < level; step += 1) {
    const next: Point[] = [];
    for (let i = 0; i < points.length - 1; i += 1) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      const dx = (bx - ax) / 3;
      const dy = (by - ay) / 3;
      const p: Point = [ax + dx, ay + dy];
      const q: Point = [ax + 2 * dx, ay + 2 * dy];
      // The new peak: the middle third turned 60° to the left, which on a
      // clockwise outline is outward.
      const peak: Point = [
        p[0] + dx * 0.5 - dy * h,
        p[1] + dy * 0.5 + dx * h,
      ];
      next.push(points[i], p, peak, q);
    }
    next.push(points[points.length - 1]);
    points = next;
  }
  return points;
}

/** Hilbert curve of order n through the centres of a 2ⁿ × 2ⁿ grid on [0, 1]². */
export function hilbertCurve(order: number): Point[] {
  const side = 2 ** order;
  const points: Point[] = [];
  for (let index = 0; index < side * side; index += 1) {
    let x = 0;
    let y = 0;
    let t = index;
    for (let s = 1; s < side; s *= 2) {
      const rx = 1 & (t / 2);
      const ry = 1 & (t ^ rx);
      if (ry === 0) {
        if (rx === 1) {
          x = s - 1 - x;
          y = s - 1 - y;
        }
        [x, y] = [y, x];
      }
      x += s * rx;
      y += s * ry;
      t = Math.floor(t / 4);
    }
    points.push([(x + 0.5) / side, (y + 0.5) / side]);
  }
  return points;
}

/** Heighway dragon after n folds, scaled so it runs from (0, 0) to (1, 0). */
export function dragonCurve(folds: number): Point[] {
  let points: Point[] = [
    [0, 0],
    [1, 0],
  ];
  for (let step = 0; step < folds; step += 1) {
    const [px, py] = points[points.length - 1];
    // Unfold: append the path reversed and turned 90° about its end.
    const turned = points
      .slice(0, -1)
      .reverse()
      .map(([x, y]): Point => [px - (y - py), py + (x - px)]);
    points = points.concat(turned);
  }
  // The end now sits at distance (√2)ⁿ, at angle n·45°; map it to (1, 0).
  const [ex, ey] = points[points.length - 1];
  const length = Math.hypot(ex, ey);
  const cos = ex / length;
  const sin = ey / length;
  return points.map(([x, y]): Point => [
    (x * cos + y * sin) / length,
    (-x * sin + y * cos) / length,
  ]);
}

/** Lévy C curve: every segment becomes two at ±45°, from (0, 0) to (1, 0). */
export function levyCCurve(steps: number): Point[] {
  let points: Point[] = [
    [0, 0],
    [1, 0],
  ];
  for (let step = 0; step < steps; step += 1) {
    const next: Point[] = [points[0]];
    for (let i = 0; i < points.length - 1; i += 1) {
      const [ax, ay] = points[i];
      const [bx, by] = points[i + 1];
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      // The apex of a right isosceles triangle on the segment.
      next.push([mx - (by - ay) / 2, my + (bx - ax) / 2], [bx, by]);
    }
    points = next;
  }
  return points;
}

/**
 * Sierpiński arrowhead curve: A → B−A−B, B → A+B+A, turns of 60°, from
 * (0, 0) to (1, 0) inside the triangle above that base.
 */
export function sierpinskiArrowhead(order: number): Point[] {
  let rule = 'A';
  for (let step = 0; step < order; step += 1) {
    rule = rule.replace(/[AB]/g, (c) => (c === 'A' ? 'B-A-B' : 'A+B+A'));
  }
  const length = 1 / 2 ** order;
  // Odd orders start turned so the curve stays above its base.
  let angle = order % 2 === 0 ? 0 : Math.PI / 3;
  let x = 0;
  let y = 0;
  const points: Point[] = [[0, 0]];
  for (const c of rule) {
    if (c === '+') angle += Math.PI / 3;
    else if (c === '-') angle -= Math.PI / 3;
    else {
      x += length * Math.cos(angle);
      y += length * Math.sin(angle);
      points.push([x, y]);
    }
  }
  return points;
}

/** Peano curve of order n through the centres of a 3ⁿ × 3ⁿ grid on [0, 1]². */
export function peanoCurve(order: number): Point[] {
  const cells = (n: number): Point[] => {
    if (n === 0) return [[0, 0]];
    const inner = cells(n - 1);
    const size = 3 ** (n - 1);
    const out: Point[] = [];
    for (let column = 0; column < 3; column += 1) {
      for (let k = 0; k < 3; k += 1) {
        // Columns go up, down, up; each block is mirrored to join its neighbours.
        const row = column % 2 === 0 ? k : 2 - k;
        for (const [x, y] of inner) {
          const mx = row % 2 === 1 ? size - 1 - x : x;
          const my = column % 2 === 1 ? size - 1 - y : y;
          out.push([column * size + mx, row * size + my]);
        }
      }
    }
    return out;
  };
  const side = 3 ** order;
  return cells(order).map(([x, y]): Point => [(x + 0.5) / side, (y + 0.5) / side]);
}

const one = (points: Point[]): CurvePoints => [points];

export const fractalCurves: CurveDef[] = [
  {
    slug: 'koch-snowflake',
    category: 'fractal',
    name: { en: 'Koch snowflake', zh: '科赫雪花' },
    short: {
      en: 'A triangle whose edges bend again and again: the perimeter grows without bound while the area stays finite.',
      zh: '把三角形的每条边一次次折出尖角：周长无限增长，面积却始终有限。',
    },
    equations: ['P_n = 3\\left(\\tfrac43\\right)^n s', 'D = \\frac{\\log 4}{\\log 3}'],
    params: [
      {
        key: 'level',
        label: { en: 'Iterations', zh: '迭代次数' },
        min: 0,
        max: 6,
        step: 1,
        defaultValue: 4,
      },
    ],
    fitMode: 'fixed',
    sample: ({ level }) => one(kochSnowflake(level)),
    intro: {
      en: [
        'Start with an equilateral triangle. Cut every edge into thirds, and on the middle third raise a smaller equilateral triangle pointing outward. Repeat on every new edge, forever. Helge von Koch described the edge curve in 1904 as an example of a curve that is continuous everywhere yet has a tangent nowhere.',
        'Each round multiplies the number of edges by 4 and shrinks them by 3, so the perimeter grows by a factor of 4/3 every time and has no limit. The area, though, only adds ever-smaller triangles and converges to 8/5 of the original triangle. A finite region with an infinitely long boundary is the snowflake’s whole lesson.',
      ],
      zh: [
        '从一个正三角形开始。把每条边三等分，在中间一段上向外立起一个小正三角形；对每条新边重复这一步，一直做下去。Helge von Koch 在 1904 年描述了这条边界曲线，作为"处处连续、处处没有切线"的例子。',
        '每一轮边数乘 4、边长除以 3，所以周长每次乘以 4/3，没有上限。面积却只是加上越来越小的三角形，收敛到原三角形的 8/5。有限的面积被无限长的边界围住，这就是雪花要讲的事。',
      ],
    },
    properties: {
      en: [
        'Perimeter after n steps: 3s(4/3)ⁿ, which grows without bound.',
        'Area after n steps: (√3/4)s²(8/5 − (3/5)(4/9)ⁿ), converging to 2√3s²/5.',
        'Fractal dimension log 4 / log 3 ≈ 1.2619.',
        'Each step multiplies the number of edges by 4: 3·4ⁿ edges after n steps.',
        'The limit curve is continuous but has no tangent at any point.',
      ],
      zh: [
        'n 次迭代后周长为 3s(4/3)ⁿ，无限增长。',
        'n 次迭代后面积为 (√3/4)s²(8/5 − (3/5)(4/9)ⁿ)，收敛到 2√3s²/5。',
        '分形维数 log 4 / log 3 ≈ 1.2619。',
        '每次迭代边数乘 4：n 次后共 3·4ⁿ 条边。',
        '极限曲线处处连续，却在任何一点都没有切线。',
      ],
    },
    seenIn: {
      en: 'The coastline paradox, fractal antennas, and every first lesson on fractal dimension.',
      zh: '海岸线悖论、分形天线，以及几乎每一堂讲分形维数的入门课。',
    },
    prompt: {
      en: 'Animate the Koch snowflake: start from an equilateral triangle, add one iteration at a time, and keep a running counter of the perimeter (3s·(4/3)ⁿ) beside the area (approaching 8/5 of the triangle) so the infinite boundary around a finite area is visible.',
      zh: '演示科赫雪花：从正三角形开始，一次加一轮迭代，旁边同时显示周长 3s·(4/3)ⁿ 和面积（趋近原三角形的 8/5），让"有限面积、无限边界"一眼可见。',
    },
    related: ['hilbert-curve', 'sierpinski-arrowhead-curve', 'levy-c-curve'],
  },
  {
    slug: 'hilbert-curve',
    category: 'fractal',
    name: { en: 'Hilbert curve', zh: '希尔伯特曲线' },
    short: {
      en: 'A single path that visits every cell of a 2ⁿ × 2ⁿ grid; in the limit it passes through every point of the square.',
      zh: '一条不重复的路径走遍 2ⁿ × 2ⁿ 网格的每一格；取极限后，它经过正方形里的每一个点。',
    },
    equations: ['L_n = 2^n - 2^{-n}', 'D = 2'],
    params: [
      {
        key: 'order',
        label: { en: 'Order n', zh: '阶数 n' },
        min: 1,
        max: 7,
        step: 1,
        defaultValue: 5,
      },
    ],
    fitMode: 'fixed',
    sample: ({ order }) => one(hilbertCurve(order)),
    intro: {
      en: [
        'Divide a square into four quarters and join their centres with a U-shaped path. Then replace each quarter by a smaller copy of the whole pattern, rotated so the copies connect end to end. David Hilbert published this construction in 1891, a year after Peano showed that a curve can fill a square.',
        'The order-n path visits all 4ⁿ cells of the grid once. As n grows, the curves converge to a continuous map from a line segment onto the entire square. Its practical virtue is locality: points close along the curve are close in the square, which is why it orders pixels, map tiles and database keys.',
      ],
      zh: [
        '把正方形分成四块，用一条 U 形路径连起四块的中心。再把每一块换成整个图案缩小后的副本，并旋转到首尾相接。David Hilbert 在 1891 年发表了这个构造，比 Peano 证明"曲线可以填满正方形"晚一年。',
        'n 阶路径恰好经过网格的全部 4ⁿ 个格子一次。n 增大时，这些曲线收敛到一个把线段连续地映满整个正方形的映射。它在实际中的好处是"局部性"：在曲线上相邻的点，在正方形里也相邻，所以被用来给像素、地图瓦片和数据库键排序。',
      ],
    },
    properties: {
      en: [
        'Order n visits 4ⁿ grid cells, each exactly once.',
        'In the unit square the order-n path has length 2ⁿ − 2⁻ⁿ.',
        'The limit is a continuous surjection from [0, 1] onto the square: a space-filling curve.',
        'Its image has dimension 2, the dimension of the square it fills.',
        'Nearby positions along the curve land in nearby cells, which makes it a good 1-D index for 2-D data.',
      ],
      zh: [
        'n 阶曲线经过 4ⁿ 个格子，每格恰好一次。',
        '在单位正方形里，n 阶路径长 2ⁿ − 2⁻ⁿ。',
        '极限是从 [0, 1] 到正方形的连续满射：一条填满空间的曲线。',
        '它的像的维数是 2，就是被填满的正方形的维数。',
        '曲线上相近的位置落在相近的格子里，因此适合给二维数据做一维索引。',
      ],
    },
    seenIn: {
      en: 'Image dithering and texture layout, geographic indexes, database keys, and space-filling-curve art.',
      zh: '图像抖动与纹理排布、地理索引、数据库键，以及空间填充曲线艺术。',
    },
    prompt: {
      en: 'Animate the Hilbert curve from order 1 to order 5: draw the U-shaped first order, then show each quarter being replaced by a rotated copy, and finish by tracing the order-5 path so it visibly visits every cell of the grid.',
      zh: '演示希尔伯特曲线从 1 阶到 5 阶：先画出 U 形的 1 阶，再展示每个四分之一被旋转后的副本替换，最后描出 5 阶路径，让它看得见地走遍每一格。',
    },
    related: ['peano-curve', 'koch-snowflake', 'dragon-curve'],
  },
  {
    slug: 'dragon-curve',
    category: 'fractal',
    name: { en: 'Dragon curve', zh: '龙形曲线' },
    short: {
      en: 'Fold a strip of paper in half n times and open every fold to a right angle: the edge draws the Heighway dragon.',
      zh: '把纸条对折 n 次，再把每道折痕打开成直角：纸条的边就画出了 Heighway 龙。',
    },
    equations: ['L_n = (\\sqrt2)^n', 'N_n = 2^n'],
    params: [
      {
        key: 'folds',
        label: { en: 'Folds n', zh: '对折次数 n' },
        min: 1,
        max: 14,
        step: 1,
        defaultValue: 10,
      },
    ],
    fitMode: 'refit',
    sample: ({ folds }) => one(dragonCurve(folds)),
    intro: {
      en: [
        'Take a strip of paper, fold it in half, fold it again in the same direction, and keep going. Unfold it so every crease makes a right angle, and the strip traces the dragon curve. NASA physicists John Heighway, Bruce Banks and William Harter studied it in the 1960s; Martin Gardner introduced it to readers of Scientific American in 1967.',
        'Algebraically, each fold appends a copy of the whole path, reversed and turned 90° about its end. The curve never crosses itself, although it touches itself at corners. Four copies around a point tile the plane, and the boundary of the limit shape has fractal dimension about 1.5236.',
      ],
      zh: [
        '拿一条纸条对折，再沿同一方向对折，不断重复。展开时让每道折痕成直角，纸条就描出了龙形曲线。NASA 的物理学家 John Heighway、Bruce Banks 和 William Harter 在 1960 年代研究了它；1967 年 Martin Gardner 在《科学美国人》上把它介绍给大众。',
        '用代数说，每对折一次，就在路径后面接上整条路径的副本：倒过来走，并绕终点转 90°。曲线从不穿过自己，只在拐角处与自己相碰。四条龙绕一点拼在一起能铺满平面，极限图形的边界分形维数约为 1.5236。',
      ],
    },
    properties: {
      en: [
        'After n folds the path has 2ⁿ segments, all meeting at right angles.',
        'With the endpoints held at distance 1, the length is (√2)ⁿ.',
        'The turn sequence is the regular paper-folding sequence.',
        'It never crosses itself; it only touches itself at corners.',
        'Copies of the limit shape tile the plane; its boundary has dimension ≈ 1.5236.',
      ],
      zh: [
        '对折 n 次后路径有 2ⁿ 段，段与段都成直角。',
        '两端距离固定为 1 时，长度为 (√2)ⁿ。',
        '拐弯方向序列就是"正则折纸序列"。',
        '它从不穿过自己，只在拐角处相碰。',
        '极限图形的副本可以铺满平面；它的边界维数约 1.5236。',
      ],
    },
    seenIn: {
      en: 'Paper-folding demonstrations, the chapter openers of Jurassic Park, and L-system art.',
      zh: '折纸演示、小说《侏罗纪公园》的章节扉页，以及 L 系统生成艺术。',
    },
    prompt: {
      en: 'Animate the dragon curve as paper folding: show a strip folded in half three times, then unfold every crease to 90° and continue the doubling rule (append the path rotated 90° about its end) up to 10 folds.',
      zh: '用折纸演示龙形曲线：先把纸条对折三次，再把每道折痕展开成 90°，然后沿用"把整条路径绕终点转 90° 接在后面"的规则，一直加到 10 次。',
    },
    related: ['levy-c-curve', 'hilbert-curve', 'koch-snowflake'],
  },
  {
    slug: 'levy-c-curve',
    category: 'fractal',
    name: { en: 'Lévy C curve', zh: '莱维 C 曲线' },
    short: {
      en: 'Replace every segment by two legs of a right isosceles triangle, again and again: the segments bloom into a C.',
      zh: '把每一段换成等腰直角三角形的两条直角边，不断重复，线段就长成一个 C 字形。',
    },
    equations: ['L_n = (\\sqrt2)^n', 'D = 2'],
    params: [
      {
        key: 'steps',
        label: { en: 'Iterations', zh: '迭代次数' },
        min: 1,
        max: 14,
        step: 1,
        defaultValue: 10,
      },
    ],
    fitMode: 'fixed',
    sample: ({ steps }) => one(levyCCurve(steps)),
    intro: {
      en: [
        'Start with one segment. Replace it by the two short sides of a right isosceles triangle built on it, both turned the same way. Do the same to every new segment, n times. Paul Lévy studied the limit in 1938, describing how parts of it are similar to the whole.',
        'Every step doubles the number of segments and shrinks each by √2, so the length grows by √2 per step while the endpoints stay put. Unlike the dragon curve, which turns alternately, every replacement here turns the same way, and the limit set fills a region of the plane: its Hausdorff dimension is 2.',
      ],
      zh: [
        '从一条线段开始，把它换成以它为斜边的等腰直角三角形的两条直角边，方向一致。对每一条新线段重复 n 次。Paul Lévy 在 1938 年研究了它的极限，描述了其中局部与整体相似的结构。',
        '每一步线段数翻倍、每段缩短为原来的 1/√2，所以总长每步乘 √2，而两端点不动。和左右交替拐弯的龙形曲线不同，这里每次替换都朝同一侧，极限集合会占满平面上的一块区域：它的豪斯多夫维数是 2。',
      ],
    },
    properties: {
      en: [
        'After n steps there are 2ⁿ segments, each of length (1/√2)ⁿ of the original.',
        'Total length (√2)ⁿ times the original segment.',
        'The endpoints never move; the curve stays inside a bounded region.',
        'The limit set has Hausdorff dimension 2.',
        'Unlike the dragon curve it is not self-avoiding: from the fourth step on, some segments are traced twice.',
      ],
      zh: [
        'n 步后共有 2ⁿ 段，每段长为原线段的 (1/√2)ⁿ。',
        '总长为原线段的 (√2)ⁿ 倍。',
        '两个端点始终不动，曲线停留在一块有界区域内。',
        '极限集合的豪斯多夫维数是 2。',
        '与龙形曲线不同，它不是自回避的：从第四步起，有些线段会被走两遍。',
      ],
    },
    seenIn: {
      en: 'L-system examples, fractal art, and comparisons with the dragon curve.',
      zh: 'L 系统的经典例子、分形艺术，以及与龙形曲线的对照。',
    },
    prompt: {
      en: 'Animate the Lévy C curve: start with a horizontal segment, replace it by the two legs of a right isosceles triangle, and repeat ten times, showing segment count 2ⁿ and length (√2)ⁿ beside the growing C.',
      zh: '演示莱维 C 曲线：从一条水平线段开始，换成等腰直角三角形的两条直角边，重复十次，旁边显示段数 2ⁿ 和长度 (√2)ⁿ。',
    },
    related: ['dragon-curve', 'koch-snowflake', 'sierpinski-arrowhead-curve'],
  },
  {
    slug: 'sierpinski-arrowhead-curve',
    category: 'fractal',
    name: { en: 'Sierpiński arrowhead curve', zh: '谢尔宾斯基箭头曲线' },
    short: {
      en: 'One unbroken path whose limit is the Sierpiński triangle, drawn with nothing but 60° turns.',
      zh: '一条不断开的路径，只用 60° 转弯，极限就是谢尔宾斯基三角形。',
    },
    equations: ['L_n = \\left(\\tfrac32\\right)^n', 'D = \\frac{\\log 3}{\\log 2}'],
    params: [
      {
        key: 'order',
        label: { en: 'Order n', zh: '阶数 n' },
        min: 1,
        max: 8,
        step: 1,
        defaultValue: 6,
      },
    ],
    fitMode: 'fixed',
    sample: ({ order }) => one(sierpinskiArrowhead(order)),
    intro: {
      en: [
        'The Sierpiński triangle, described by Wacław Sierpiński in 1915, is usually drawn by cutting holes. The arrowhead curve reaches the same shape as a single path: two rewriting rules, A → B−A−B and B → A+B+A, with every + and − a 60° turn, produce an order-n path whose limit is the triangle.',
        'Each order replaces every segment by three half-length segments, so the length grows by 3/2 each time while the endpoints stay fixed. The limit has the triangle’s fractal dimension, log 3 / log 2 ≈ 1.585: more than a line, less than an area.',
      ],
      zh: [
        '谢尔宾斯基三角形由 Wacław Sierpiński 在 1915 年描述，通常用"挖洞"的方式画。箭头曲线用一条路径得到同样的图形：两条改写规则 A → B−A−B、B → A+B+A，每个 + 和 − 都是 60° 转弯，n 阶路径的极限就是这个三角形。',
        '每升一阶，每条线段换成三条一半长的线段，所以总长每次乘 3/2，而两端点不动。极限的分形维数与三角形相同，log 3 / log 2 ≈ 1.585：比线多，比面少。',
      ],
    },
    properties: {
      en: [
        'Order n has 3ⁿ segments of length 2⁻ⁿ (base length 1).',
        'Total length (3/2)ⁿ, growing without bound.',
        'Rules: A → B−A−B, B → A+B+A, with turns of 60°.',
        'The limit is the Sierpiński triangle, of dimension log 3 / log 2 ≈ 1.585.',
        'The path never crosses itself.',
      ],
      zh: [
        'n 阶有 3ⁿ 段，每段长 2⁻ⁿ（底边长 1）。',
        '总长 (3/2)ⁿ，无限增长。',
        '规则：A → B−A−B，B → A+B+A，转角 60°。',
        '极限是谢尔宾斯基三角形，维数 log 3 / log 2 ≈ 1.585。',
        '路径从不穿过自己。',
      ],
    },
    seenIn: {
      en: 'L-system tutorials, turtle graphics, and Pascal’s triangle taken mod 2.',
      zh: 'L 系统教程、海龟绘图，以及杨辉三角对 2 取余的图样。',
    },
    prompt: {
      en: 'Animate the Sierpiński arrowhead curve: show the rewriting rules A → B−A−B and B → A+B+A, draw orders 1 to 6 with a turtle turning 60°, then overlay the Sierpiński triangle to show the limit.',
      zh: '演示谢尔宾斯基箭头曲线：先展示改写规则 A → B−A−B、B → A+B+A，用每次转 60° 的海龟画出 1 到 6 阶，最后叠上谢尔宾斯基三角形说明极限。',
    },
    related: ['koch-snowflake', 'levy-c-curve', 'hilbert-curve'],
  },
  {
    slug: 'peano-curve',
    category: 'fractal',
    name: { en: 'Peano curve', zh: '皮亚诺曲线' },
    short: {
      en: 'The first space-filling curve (1890): a snake through a 3ⁿ × 3ⁿ grid whose limit covers the whole square.',
      zh: '第一条空间填充曲线（1890 年）：在 3ⁿ × 3ⁿ 网格里蛇行，极限覆盖整个正方形。',
    },
    equations: ['L_n = 3^n - 3^{-n}', 'D = 2'],
    params: [
      {
        key: 'order',
        label: { en: 'Order n', zh: '阶数 n' },
        min: 1,
        max: 4,
        step: 1,
        defaultValue: 3,
      },
    ],
    fitMode: 'fixed',
    sample: ({ order }) => one(peanoCurve(order)),
    intro: {
      en: [
        'In 1890 Giuseppe Peano surprised his contemporaries with a continuous curve that passes through every point of a square. His construction splits the square into nine, visits the nine blocks in a snake (up, down, up), and inside each block repeats the same snake, mirrored so neighbouring blocks join.',
        'The order-n path visits all 9ⁿ cells of a 3ⁿ × 3ⁿ grid. Its limit is a continuous map of a segment onto the square, which showed that a curve, in this sense, can have dimension 2. Hilbert’s simpler two-by-two version came a year later.',
      ],
      zh: [
        '1890 年，Giuseppe Peano 给出一条经过正方形每一个点的连续曲线，让同时代的人大吃一惊。他的构造把正方形分成九块，按蛇形（上、下、上）依次经过这九块；每一块里重复同样的蛇形，并做镜像，使相邻块首尾相接。',
        'n 阶路径经过 3ⁿ × 3ⁿ 网格的全部 9ⁿ 个格子。它的极限把一条线段连续地映满整个正方形，说明这种意义下的曲线可以是二维的。Hilbert 更简单的 2 × 2 版本在一年后出现。',
      ],
    },
    properties: {
      en: [
        'Order n visits 9ⁿ cells, each exactly once.',
        'In the unit square the order-n path has length 3ⁿ − 3⁻ⁿ.',
        'The limit is a continuous surjection from [0, 1] onto the square.',
        'Its image has dimension 2.',
        'Each block is the whole pattern, mirrored horizontally, vertically, or both.',
      ],
      zh: [
        'n 阶曲线经过 9ⁿ 个格子，每格恰好一次。',
        '在单位正方形里，n 阶路径长 3ⁿ − 3⁻ⁿ。',
        '极限是从 [0, 1] 到正方形的连续满射。',
        '它的像的维数是 2。',
        '每一块都是整个图案的副本，做了水平、竖直或两者同时的镜像。',
      ],
    },
    seenIn: {
      en: 'The history of analysis and topology, and comparisons with the Hilbert curve in indexing.',
      zh: '分析与拓扑的历史，以及在索引应用中与希尔伯特曲线的比较。',
    },
    prompt: {
      en: 'Animate the Peano curve: split a square into nine blocks, trace the snake order up–down–up, then replace each block by a mirrored copy of the whole snake for orders 2 and 3.',
      zh: '演示皮亚诺曲线：把正方形分成九块，按上、下、上的蛇形顺序走一遍；再把每一块换成整条蛇形的镜像副本，画出 2 阶和 3 阶。',
    },
    related: ['hilbert-curve', 'koch-snowflake', 'dragon-curve'],
  },
];
