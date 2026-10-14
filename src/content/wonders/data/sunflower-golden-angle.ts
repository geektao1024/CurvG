import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the golden
 * angle, the spoke counts, the 55/89 spiral families and the spacing loss
 * at 137.6° all come from `@/lib/wonders/phyllotaxis`.
 */
export const sunflowerGoldenAngle: Wonder = {
  slug: 'sunflower-golden-angle',
  publication: 'public',
  number: 4,
  updated: '2026-10-14',
  field: { zh: '数论 · 黄金比', en: 'Number theory · Golden ratio' },
  name: { zh: '向日葵与黄金角', en: 'Sunflowers and the golden angle' },
  metaTitle: {
    zh: '黄金角 137.5°：向日葵种子为什么这样排列 | CurvG',
    en: 'Golden Angle 137.5°: Why Sunflower Seeds Spiral | CurvG',
  },
  question: {
    zh: '向日葵为什么偏爱 137.5° 这个角度？',
    en: 'Why do sunflowers favour an angle of 137.5°?',
  },
  summary: {
    zh: '每长一颗种子就转一个固定角度。转 90° 排成 4 条直线，转 144° 排成 5 条，只有转 137.5°（黄金角）时种子铺得最均匀，还会长出 55 条和 89 条螺旋。调角度看看差 0.1° 会怎样。',
    en: 'Each new seed is turned by a fixed angle. Turn by 90° and the seeds line up in 4 rows, by 144° in 5; only at 137.5°, the golden angle, do they pack most evenly, forming 55 and 89 spirals. Change the angle and see what 0.1° does.',
  },
  takeaway: {
    zh: '黄金角是"最无理"的角度，最难被分数逼近，所以种子永远不会排成辐线，空间用得最充分；螺旋数是斐波那契数，也来自同一个原因。',
    en: 'The golden angle is the "most irrational" turn, the hardest to approximate by fractions, so seeds never line up in rows and space is used best; the Fibonacci spiral counts come from the same fact.',
  },
  beats: [
    {
      zh: '向日葵每长一颗新种子，就转一个固定角度再放下。转 90°，也就是四分之一圈，种子排成 4 条直线。',
      en: 'Each time a sunflower adds a seed, it turns by a fixed angle first. Turn by 90°, a quarter turn, and the seeds form 4 straight rows.',
    },
    {
      zh: '转 120°（三分之一圈）是 3 条，转 144°（五分之二圈）是 5 条。只要转的是整齐的分数圈，种子就排成辐线，中间全是空隙。',
      en: 'Turn by 120°, a third, and you get 3 rows; by 144°, two fifths, 5 rows. Any tidy fraction of a turn lines the seeds up in spokes with empty gaps between.',
    },
    {
      zh: '越接近 137.5°，空隙越少；正好是黄金角 137.508° 时，种子铺得最均匀。',
      en: 'The closer the angle gets to 137.5°, the smaller the gaps; at exactly the golden angle, 137.508°, the seeds pack most evenly.',
    },
    {
      zh: '数一数外圈的螺旋：一个方向 55 条，另一个方向 89 条。两个都是斐波那契数。',
      en: 'Count the spirals on the outer ring: 55 one way, 89 the other. Both are Fibonacci numbers.',
    },
    {
      zh: '只偏 0.1°，变成 137.6°，种子就开始排成弯曲的辐线，空隙又出现了。',
      en: 'Off by just 0.1°, at 137.6°, the seeds start forming curved spokes, and the gaps come back.',
    },
    {
      zh: '现在轮到你：拖动角度，加减种子，打开螺旋看看它们怎样变化。',
      en: 'Your turn: change the angle, add or remove seeds, and turn on the spirals to see how they change.',
    },
  ],
  sections: [
    {
      id: 'model',
      title: { zh: '一颗种子，一个角度', en: 'One seed, one angle' },
      body: {
        zh: '向日葵花盘中心不断长出新种子，旧种子被推向外圈。数学家 Vogel 在 1979 年把它写成一个简单的模型：第 $n$ 颗种子的位置是\n\n$$\\theta_n=n\\alpha,\\qquad r_n=\\sqrt{n}$$\n\n$\\alpha$ 是每颗种子相对上一颗转过的角度。半径取 $\\sqrt n$，是为了让每颗种子分到差不多一样的面积。整个图案只由 $\\alpha$ 一个数决定。',
        en: 'New seeds keep appearing at the centre of a sunflower head and push older ones outwards. In 1979 the mathematician Vogel wrote this as a simple model: seed $n$ sits at\n\n$$\\theta_n=n\\alpha,\\qquad r_n=\\sqrt{n}$$\n\nwhere $\\alpha$ is the angle each seed is turned from the one before. The radius $\\sqrt n$ gives every seed roughly the same area. The whole pattern depends on the single number $\\alpha$.',
      },
    },
    {
      id: 'fractions',
      title: { zh: '分数角为什么不行', en: 'Why fractions fail' },
      body: {
        zh: '如果每次转 $\\frac{p}{q}$ 圈，那么每过 $q$ 颗种子就转回原来的方向，种子排成 $q$ 条直线，直线之间的空间全部浪费。\n\n如果转的角度只是**接近**某个分数，比如 137°，接近 $\\frac{8}{21}$ 圈，种子会排成 21 条稍微弯曲的辐线，离中心越远，空隙越明显。\n\n所以最好的角度要离所有简单分数都尽量远。',
        en: 'Turn by $\\frac{p}{q}$ of a circle each time and every $q$ seeds you are back facing the same way: the seeds line up in $q$ straight rows, and the space between them is wasted.\n\nAn angle that is merely **close** to a fraction, such as 137°, close to $\\frac{8}{21}$ of a turn, gives 21 slightly curved spokes, with gaps that widen further out.\n\nSo the best angle should stay as far as possible from every simple fraction.',
      },
    },
    {
      id: 'golden',
      title: { zh: '最"无理"的数', en: 'The most irrational number' },
      body: {
        zh: '黄金比 $\\varphi=\\frac{1+\\sqrt5}{2}\\approx1.618$ 写成连分数时，每一层都是 1：\n\n$$\\varphi=1+\\cfrac{1}{1+\\cfrac{1}{1+\\cfrac{1}{1+\\cdots}}}$$\n\n连分数里的数越大，就越容易被分数逼近；全是 1，意味着它是所有无理数里最难被分数逼近的一个。\n\n黄金角就是把一整圈按黄金比分开后较小的那一份：\n\n$$\\alpha=360^\\circ\\,(2-\\varphi)\\approx137.508^\\circ$$\n\n用它转，种子永远不会排成辐线。画板上的"最小间距"读数，就是比较当前角度下最挤的两颗种子和黄金角时相比还剩多少：137.6° 时只剩约 63%。',
        en: 'Written as a continued fraction, the golden ratio $\\varphi=\\frac{1+\\sqrt5}{2}\\approx1.618$ has a 1 at every level:\n\n$$\\varphi=1+\\cfrac{1}{1+\\cfrac{1}{1+\\cfrac{1}{1+\\cdots}}}$$\n\nLarge numbers in a continued fraction make a number easy to approximate by fractions; all ones make it the hardest of all irrational numbers to approximate.\n\nThe golden angle is the smaller part of a full turn split in the golden ratio:\n\n$$\\alpha=360^\\circ\\,(2-\\varphi)\\approx137.508^\\circ$$\n\nTurn by it and the seeds never line up in spokes. The "minimum spacing" readout compares the two most crowded seeds at the current angle with the golden angle: at 137.6° only about 63% is left.',
      },
    },
    {
      id: 'fibonacci',
      title: { zh: '为什么是斐波那契数', en: 'Why Fibonacci numbers' },
      body: {
        zh: '肉眼看到的螺旋，是每颗种子和它最近的邻居连起来的线。黄金角下，第 $n$ 颗种子最近的邻居，正好是第 $n-55$ 或第 $n-89$ 颗（在 1000 颗种子的外圈），所以看到 55 条和 89 条螺旋。\n\n原因是黄金比的最佳分数逼近恰好是相邻斐波那契数之比：$\\frac{3}{2},\\frac{5}{3},\\frac{8}{5},\\frac{13}{8},\\dots,\\frac{89}{55}$。越往外，种子越多，看到的螺旋数就换成更大的一对：内圈是 13 和 21、21 和 34，外圈是 55 和 89。真实的向日葵上常数出 34 和 55、55 和 89 条螺旋。',
        en: 'The spirals your eye picks out join each seed to its nearest neighbours. At the golden angle, the nearest neighbours of seed $n$ are seeds $n-55$ and $n-89$ (on the outer ring of 1000 seeds), so you see 55 and 89 spirals.\n\nThe reason is that the best fractional approximations of the golden ratio are ratios of consecutive Fibonacci numbers: $\\frac{3}{2},\\frac{5}{3},\\frac{8}{5},\\frac{13}{8},\\dots,\\frac{89}{55}$. Further out there are more seeds and the visible pair moves up: 13 and 21, 21 and 34 nearer the centre, 55 and 89 at the edge. Real sunflowers often show 34 and 55 or 55 and 89 spirals.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '向日葵真的"会算"黄金角吗？',
        en: 'Do sunflowers really compute the golden angle?',
      },
      answer: {
        zh: '不需要会算。一种被广泛接受的解释是：新的原基总是长在离已有原基最远、最有空间的地方，这个局部规则自然把角度推向黄金角。真实植物也会有偏差，所以螺旋数偶尔不是斐波那契数。',
        en: 'They do not need to. A widely accepted explanation is that each new bud forms where there is the most room, furthest from the existing ones, and this local rule drives the angle towards the golden angle by itself. Real plants deviate a little, so spiral counts are occasionally not Fibonacci numbers.',
      },
    },
    {
      question: {
        zh: '为什么半径要取 √n？',
        en: 'Why is the radius √n?',
      },
      answer: {
        zh: '半径为 $r$ 的圆面积和 $r^2$ 成正比。取 $r=\\sqrt n$，前 $n$ 颗种子占的面积就和 $n$ 成正比，每颗种子分到的面积差不多一样大。',
        en: 'A disc of radius $r$ has area proportional to $r^2$. With $r=\\sqrt n$, the first $n$ seeds fill an area proportional to $n$, so every seed gets about the same space.',
      },
    },
    {
      question: {
        zh: '还有哪些地方能看到这种排列？',
        en: 'Where else does this pattern show up?',
      },
      answer: {
        zh: '松果的鳞片、菠萝表面的六边形、菜花和罗马花椰菜、多肉植物和很多树枝上的叶序，都能数出相邻的斐波那契数。',
        en: 'Pine cone scales, the hexagons on a pineapple, cauliflower and romanesco, succulents and the leaf arrangement on many stems all show consecutive Fibonacci numbers.',
      },
    },
  ],
  relatedCurves: ['fermat-spiral', 'golden-spiral'],
  relatedLabs: ['similarity-homothety', 'unit-circle-sine'],
  sources: [
    {
      title: 'Phyllotaxis — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Phyllotaxis',
    },
    {
      title: 'Golden angle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Golden_angle',
    },
  ],
};
