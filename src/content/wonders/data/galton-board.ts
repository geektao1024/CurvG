import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: 924 of 4096
 * paths (22.6%), the story's measured shares, 69% within one standard
 * deviation at 24 rows and the tilted mean 16.8 all come from
 * `@/lib/wonders/galton`.
 */
export const galtonBoard: Wonder = {
  slug: 'galton-board',
  publication: 'public',
  number: 8,
  updated: '2026-10-17',
  field: { zh: '概率 · 统计', en: 'Probability · Statistics' },
  name: { zh: '高尔顿板', en: 'Galton board' },
  metaTitle: {
    zh: '高尔顿板：小球随机乱撞，为什么总落成钟形曲线 | CurvG',
    en: 'Galton Board: Why Random Bounces Make a Bell Curve | CurvG',
  },
  question: {
    zh: '小球左右乱撞，为什么总堆成一座钟形的山？',
    en: 'Balls bounce left or right at random: why do they always pile into a bell?',
  },
  summary: {
    zh: '小球穿过 12 排钉子，每碰一颗钉子就像抛一次硬币，向左或向右。一颗球落在哪里完全说不准，两千颗球却总是堆成同一座钟形的山。数一数路径，就知道为什么。',
    en: 'A ball falls through 12 rows of pegs, and at each peg it goes left or right like a coin toss. Where one ball lands is anyone’s guess, yet two thousand always pile into the same bell. Count the paths and you will see why.',
  },
  takeaway: {
    zh: '一颗球落在哪一格，只取决于它向右拐了几次；拐 k 次的路径有"组合数"那么多条，中间多、两边少。许多独立的小偏差加在一起，结果总是接近正态分布，这就是中心极限定理。',
    en: 'Which slot a ball lands in depends only on how many times it turned right, and the number of paths with k rights is a binomial coefficient: many in the middle, few at the edges. Add up many small independent nudges and the result is always close to the normal curve. That is the central limit theorem.',
  },
  beats: [
    {
      zh: '一颗小球穿过 12 排钉子。每碰到一颗钉子，它就像抛一次硬币，向左或向右，各占一半。',
      en: 'One ball falls through 12 rows of pegs. At each peg it is a coin toss: left or right, half and half.',
    },
    {
      zh: '数一数到达每颗钉子有几条路：1、1 1、1 2 1、1 3 3 1……正好是杨辉三角。',
      en: 'Count the ways to reach each peg: 1, 1 1, 1 2 1, 1 3 3 1… It is Pascal’s triangle.',
    },
    {
      zh: '12 排一共有 4096 条路。落到正中间的有 924 条，占 22.6%；落到最边上的只有 1 条。',
      en: 'Twelve rows give 4096 paths. 924 of them end in the middle slot, 22.6%; only 1 ends at each edge.',
    },
    {
      zh: '放下两千颗球。每一颗都说不准，但柱子一根根长成了算出来的形状（青色）。',
      en: 'Drop two thousand balls. No single one can be predicted, yet the columns grow into the shape we computed (cyan).',
    },
    {
      zh: '换成 24 排：山更宽，形状更圆滑，变成正态曲线。约 69% 的球落在平均值左右一个标准差之内。',
      en: 'Now 24 rows: the hill is wider and smoother, the normal curve. About 69% of the balls land within one standard deviation of the mean.',
    },
    {
      zh: '把板子倾斜，每次向右的概率变成 0.7：山移到了平均 16.8 格的位置，但还是一座钟形的山。',
      en: 'Tilt the board so each turn goes right with probability 0.7: the hill moves to an average of 16.8, but it is still a bell.',
    },
    {
      zh: '为什么总是钟形？落点是许多独立的小偏差加起来的。只要偏差够多，加起来的结果就接近正态分布，这叫中心极限定理。',
      en: 'Why always a bell? Where a ball lands is a sum of many small independent nudges. Add enough of them and the total is close to the normal curve: the central limit theorem.',
    },
    {
      zh: '现在轮到你：改排数、倾斜板子、一次再放一千颗，看看形状还变不变。',
      en: 'Your turn: change the rows, tilt the board, drop another thousand, and see whether the shape changes.',
    },
  ],
  sections: [
    {
      id: 'paths',
      title: { zh: '数路径：杨辉三角', en: 'Counting paths: Pascal’s triangle' },
      body: {
        zh: '到达一颗钉子的路，要么从左上方来，要么从右上方来，所以路径数是上面两个数之和。这正是杨辉三角（帕斯卡三角）的规则。\n\n一颗球穿过 $n$ 排后落在第 $k$ 格（从 0 数起），等于它向右拐了 $k$ 次。这样的路径有\n\n$$\\binom{n}{k}=\\frac{n!}{k!\\,(n-k)!}$$\n\n条，每条的概率都是 $\\left(\\tfrac12\\right)^n$。12 排时一共 $2^{12}=4096$ 条路，正中一格 $\\binom{12}{6}=924$ 条，概率约 22.6%。',
        en: 'A path to a peg comes either from the upper left or the upper right, so its count is the sum of the two above: exactly the rule of Pascal’s triangle.\n\nA ball that lands in slot $k$ (counting from 0) after $n$ rows turned right $k$ times. There are\n\n$$\\binom{n}{k}=\\frac{n!}{k!\\,(n-k)!}$$\n\nsuch paths, each with probability $\\left(\\tfrac12\\right)^n$. Twelve rows make $2^{12}=4096$ paths; the middle slot has $\\binom{12}{6}=924$ of them, about 22.6%.',
      },
    },
    {
      id: 'binomial',
      title: { zh: '二项分布', en: 'The binomial distribution' },
      body: {
        zh: '每次向右的概率是 $p$ 时，落在第 $k$ 格的概率是\n\n$$P(k)=\\binom{n}{k}p^k(1-p)^{n-k}$$\n\n平均落在 $np$ 格，标准差是 $\\sqrt{np(1-p)}$。$p=\\tfrac12$、24 排时平均 12 格、标准差约 2.45；倾斜到 $p=0.7$ 时平均移到 16.8 格，标准差约 2.24，山变窄了一点，但还是钟形。\n\n画板上的故事是用固定的随机种子算出来的：两千颗球每一格的实测比例和理论值相差都不到 2 个百分点。',
        en: 'When each turn goes right with probability $p$, the chance of slot $k$ is\n\n$$P(k)=\\binom{n}{k}p^k(1-p)^{n-k}$$\n\nThe average slot is $np$ and the standard deviation $\\sqrt{np(1-p)}$. With $p=\\tfrac12$ and 24 rows that is 12 with a spread of about 2.45; tilted to $p=0.7$ the average moves to 16.8 and the spread is about 2.24, a little narrower, but still a bell.\n\nThe story on the stage uses fixed random seeds: with two thousand balls, every slot’s measured share is within two percentage points of the theory.',
      },
    },
    {
      id: 'clt',
      title: { zh: '为什么总是钟形：中心极限定理', en: 'Why always a bell: the central limit theorem' },
      body: {
        zh: '把每次向右记作 $+1$、向左记作 $0$，落点就是 $n$ 个独立小量之和。中心极限定理说：许多独立的随机小量相加，不管每一个长什么样，和的分布都接近正态分布\n\n$$\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-(x-\\mu)^2/(2\\sigma^2)}$$\n\n正态分布约 68% 落在平均值左右一个标准差之内。24 排的高尔顿板是 69%，已经很接近。\n\n身高、测量误差、考试成绩常常接近钟形，也是因为它们由许多独立的小因素叠加而成。',
        en: 'Count each right turn as $+1$ and each left as $0$: the slot is a sum of $n$ independent small amounts. The central limit theorem says that a sum of many independent random amounts, whatever each looks like, is distributed close to the normal curve\n\n$$\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-(x-\\mu)^2/(2\\sigma^2)}$$\n\nA normal distribution has about 68% within one standard deviation of the mean. A 24-row Galton board has 69%, already close.\n\nHeights, measurement errors and exam scores are often bell-shaped for the same reason: each is the sum of many small independent influences.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '真实的高尔顿板为什么不完全对称？',
        en: 'Why is a real Galton board never perfectly symmetric?',
      },
      answer: {
        zh: '真实的小球会互相碰撞、在钉子上弹得不止一格，钉子也不可能完全对齐，所以左右并不严格各占一半，各次之间也不完全独立。好在中心极限定理只要求"许多大致独立的小偏差"，形状依然接近钟形。',
        en: 'Real balls collide, bounce more than one place and meet pegs that are never perfectly aligned, so left and right are not exactly even and the turns are not fully independent. The central limit theorem only needs many roughly independent nudges, so the shape is still close to a bell.',
      },
    },
    {
      question: {
        zh: '是谁发明的？',
        en: 'Who invented it?',
      },
      answer: {
        zh: '英国科学家弗朗西斯·高尔顿在 19 世纪 70 年代用它演示正态分布，所以也叫"梅花板"或"豆子机"。',
        en: 'The British scientist Francis Galton used it in the 1870s to demonstrate the normal distribution; it is also called a bean machine or quincunx.',
      },
    },
    {
      question: {
        zh: '放多少颗球才能看出钟形？',
        en: 'How many balls before the bell shows?',
      },
      answer: {
        zh: '几十颗时柱子高低不齐，几百颗时轮廓就出来了，几千颗时和理论曲线几乎重合。偏差大约按 $1/\\sqrt N$ 缩小：球数多 100 倍，相对误差小 10 倍。',
        en: 'With a few dozen the columns are ragged; a few hundred show the outline; a few thousand sit almost on the curve. The deviations shrink roughly as $1/\\sqrt N$: a hundred times more balls, ten times smaller relative error.',
      },
    },
  ],
  relatedCurves: [],
  relatedLabs: ['binomial-distribution', 'normal-distribution', 'permutations-combinations'],
  sources: [
    {
      title: 'Galton board — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Galton_board',
    },
    {
      title: 'Central limit theorem — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Central_limit_theorem',
    },
    {
      title: 'Pascal’s triangle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Pascal%27s_triangle',
    },
  ],
};
