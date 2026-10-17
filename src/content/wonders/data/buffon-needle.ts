import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: 2/π ≈ 63.66%,
 * the story's estimate after 10,000 needles, the ±0.05 band, Lazzarini's
 * 3408 / 1808 and the 1.4% chance of hitting it, all from
 * `@/lib/wonders/buffon`.
 */
export const buffonNeedle: Wonder = {
  slug: 'buffon-needle',
  publication: 'public',
  number: 9,
  updated: '2026-10-17',
  field: { zh: '概率 · 几何', en: 'Probability · Geometry' },
  name: { zh: '布丰投针', en: 'Buffon’s needle' },
  metaTitle: {
    zh: '布丰投针：随手扔针为什么能算出 π | CurvG',
    en: 'Buffon’s Needle: How Dropping Needles Finds π | CurvG',
  },
  question: {
    zh: '往画着平行线的地板上随手扔针，为什么能算出 π？',
    en: 'Drop needles on a floor ruled with parallel lines: why does that give you π?',
  },
  summary: {
    zh: '针和线距一样长时，大约 63.66% 的针会压到线，这个比例正好是 2/π。扔得越多估得越准，但慢得出奇。把针弯成面条、再弯成圆环，就能看出 π 是从哪里来的。',
    en: 'When the needles are as long as the gap between lines, about 63.66% of them land across a line, and that share is exactly 2/π. The more you drop the better the estimate, but painfully slowly. Bend the needle into a noodle, then a ring, and you can see where the π comes from.',
  },
  takeaway: {
    zh: '针的平均压线次数只和长度成正比，与形状无关；直径等于线距的圆环每次恰好压线 2 次，周长却是 π 倍直径，所以比例里出现了 π。随机实验能估出 π，但误差只按 1/√N 缩小：多准一位，要多扔 100 倍。',
    en: 'The average number of crossings depends only on a needle’s length, not its shape; a ring as wide as the gap always crosses exactly twice yet is π times its width around, which is how π gets into the ratio. Random throws can estimate π, but the error only shrinks like 1/√N: one more correct digit costs a hundred times more needles.',
  },
  beats: [
    {
      zh: '地板上画着间距相等的平行线，往上扔和线距一样长的针。压到线的针亮起琥珀色。',
      en: 'A floor is ruled with evenly spaced lines, and we drop needles exactly as long as the gap. Needles that land across a line light up amber.',
    },
    {
      zh: '压线的大约占 63.66%，正好是 2/π。反过来，π 约等于 2 乘扔的针数，再除以压线的针数。',
      en: 'About 63.66% land across a line, which is exactly 2/π. Turn it round: π is about twice the needles thrown divided by the needles crossing.',
    },
    {
      zh: '扔一万根针：估计值（琥珀色）在 π 附近上下抖动，慢慢收拢。这一次一万根针得到 3.1546。',
      en: 'Drop ten thousand: the estimate (amber) wobbles around π and slowly settles. This time ten thousand needles give 3.1546.',
    },
    {
      zh: '误差只按 1/√N 缩小（青色漏斗）：一万根针通常在 π ± 0.05 之内，只准一位小数；多准一位要多扔 100 倍。',
      en: 'The error only shrinks like 1/√N (the cyan funnel): ten thousand needles usually land within π ± 0.05, one decimal place; each extra digit takes a hundred times more.',
    },
    {
      zh: '为什么是 2/π？把针弯成面条：不管弯成什么样，平均压线次数只和长度有关，长度加倍，次数也加倍。',
      en: 'Why 2/π? Bend the needle into a noodle: whatever its shape, the average number of crossings depends only on its length. Double the length, double the crossings.',
    },
    {
      zh: '再弯成直径等于线距的圆环：它每次都恰好压线 2 次，周长却是 π 乘直径。所以每单位长度平均压线 2/π 次，直针也一样。',
      en: 'Now bend it into a ring as wide as the gap: it always crosses exactly twice, and its length is π times its width. So every unit of length crosses 2/π times on average, straight needles included.',
    },
    {
      zh: '1901 年拉扎里尼说扔了 3408 根针，算出 355/113（紫点），准到 6 位小数。恰好压线 1808 根的机会只有约 1.4%：他多半挑了停手的时机。',
      en: 'In 1901 Lazzarini reported 3408 needles giving 355/113 (violet), right to six decimals. The chance of exactly his 1808 crossings is about 1.4%: most likely he chose when to stop.',
    },
    {
      zh: '现在轮到你：改针的长度，一次扔一千根，看估计值多久才能稳在 3.14。',
      en: 'Your turn: change the needle length, drop a thousand at a time, and see how long it takes the estimate to settle on 3.14.',
    },
  ],
  sections: [
    {
      id: 'chance',
      title: { zh: '压线的概率', en: 'The chance of a crossing' },
      body: {
        zh: '设线距为 $d$，针长 $l\\le d$。一根针由两个数决定：针的中点到最近一条线的距离 $y$（在 $0$ 到 $d/2$ 之间均匀）和针与线的夹角 $\\theta$（在 $0$ 到 $\\pi$ 之间均匀）。针压线当且仅当\n\n$$y\\le\\frac{l}{2}\\sin\\theta$$\n\n把所有可能的 $(\\theta,y)$ 画成一个长方形，压线的部分是一条正弦曲线下面的面积：\n\n$$P=\\frac{\\displaystyle\\int_0^\\pi\\frac{l}{2}\\sin\\theta\\,d\\theta}{\\pi\\cdot\\frac{d}{2}}=\\frac{2l}{\\pi d}$$\n\n$l=d$ 时 $P=2/\\pi\\approx63.66\\%$。π 来自对角度的平均。',
        en: 'Let the lines be $d$ apart and the needle $l\\le d$ long. A needle is fixed by two numbers: the distance $y$ from its middle to the nearest line (uniform between $0$ and $d/2$) and its angle $\\theta$ to the lines (uniform between $0$ and $\\pi$). It crosses exactly when\n\n$$y\\le\\frac{l}{2}\\sin\\theta$$\n\nDraw every possible $(\\theta,y)$ as a rectangle: the crossings are the area under a sine curve,\n\n$$P=\\frac{\\displaystyle\\int_0^\\pi\\frac{l}{2}\\sin\\theta\\,d\\theta}{\\pi\\cdot\\frac{d}{2}}=\\frac{2l}{\\pi d}$$\n\nWith $l=d$, $P=2/\\pi\\approx63.66\\%$. The π comes from averaging over the angle.',
      },
    },
    {
      id: 'slow',
      title: { zh: '为什么估得这么慢', en: 'Why the estimate is so slow' },
      body: {
        zh: '扔 $N$ 根、压线 $C$ 根，估计 $\\hat\\pi=\\dfrac{2lN}{dC}$。$C$ 是二项分布，相对波动约为 $1/\\sqrt N$ 量级。$l=d$ 时，估计值的标准差约为\n\n$$\\sigma\\approx\\frac{2.37}{\\sqrt N}$$\n\n一万根针时约 0.024，两个标准差约 0.05，所以通常只准到一位小数。想准到 0.001，要扔两千万根以上。这就是蒙特卡罗方法的特点：什么问题都能估，但每多一位都贵 100 倍。',
        en: 'Drop $N$ needles with $C$ crossings and estimate $\\hat\\pi=\\dfrac{2lN}{dC}$. $C$ is binomial, with relative fluctuations of order $1/\\sqrt N$. With $l=d$ the estimate has standard deviation about\n\n$$\\sigma\\approx\\frac{2.37}{\\sqrt N}$$\n\nAbout 0.024 after ten thousand needles, about 0.05 for two standard deviations: usually one decimal place. To be within 0.001 takes more than twenty million. That is the Monte Carlo method in a nutshell: it can estimate almost anything, but each extra digit costs a hundred times more.',
      },
    },
    {
      id: 'noodle',
      title: { zh: '布丰的面条', en: 'Buffon’s noodle' },
      body: {
        zh: '把针分成很多小段，每一小段压线的期望次数只和它的长度成正比（方向是随机的），而期望可以相加。所以任何形状的"面条"，平均压线次数都是\n\n$$E[\\text{压线次数}]=k\\cdot L$$\n\n$k$ 是同一个常数。直径为 $d$ 的圆环，不论落在哪里都恰好和线相交 2 次，周长 $L=\\pi d$，于是 $2=k\\pi d$，$k=\\dfrac{2}{\\pi d}$。长度为 $l$ 的直针最多压线一次，压线概率就是 $\\dfrac{2l}{\\pi d}$。不用积分，π 从圆的周长里来。',
        en: 'Cut the needle into many tiny pieces. Each piece crosses a line on average in proportion to its length (its direction is random), and averages add up. So for a "noodle" of any shape,\n\n$$E[\\text{crossings}]=k\\cdot L$$\n\nwith one and the same constant $k$. A ring of diameter $d$ meets the lines exactly twice wherever it lands, and its length is $L=\\pi d$, so $2=k\\pi d$ and $k=\\dfrac{2}{\\pi d}$. A straight needle of length $l$ crosses at most once, so its chance of crossing is $\\dfrac{2l}{\\pi d}$. No integral needed: the π comes from the circumference of a circle.',
      },
    },
    {
      id: 'lazzarini',
      title: { zh: '拉扎里尼的好运气', en: 'Lazzarini’s luck' },
      body: {
        zh: '1901 年，意大利数学家拉扎里尼报告：针长是线距的 5/6，扔 3408 根，压线 1808 根，\n\n$$\\hat\\pi=\\frac{2\\cdot\\frac56\\cdot3408}{1808}=\\frac{355}{113}=3.1415929\\ldots$$\n\n只差 0.0000003。按上面的误差，3408 根针的标准差约 0.05，准到这个程度本该几乎不可能。\n\n关键在于：要得到 $\\frac{355}{113}$，扔的针数必须是 213 的倍数（3408 = 16 × 213），压线数也必须正好对上。扔 3408 根时恰好压线 1808 根的概率约 1.4%；如果边扔边看、在合适的时候停下，或者干脆凑数，就容易得多。统计学家常拿它当"挑选停止时机"的例子。',
        en: 'In 1901 the Italian mathematician Lazzarini reported needles 5/6 of the gap long, 3408 thrown and 1808 crossing:\n\n$$\\hat\\pi=\\frac{2\\cdot\\frac56\\cdot3408}{1808}=\\frac{355}{113}=3.1415929\\ldots$$\n\noff by only 0.0000003. With the error above, about 0.05 for 3408 needles, that accuracy should be all but impossible.\n\nThe catch: to get $\\frac{355}{113}$ the number thrown must be a multiple of 213 (3408 = 16 × 213), and the crossings must then match exactly. The chance of exactly 1808 crossings in 3408 throws is about 1.4%; watching as you go and stopping at the right moment, or simply making the numbers fit, makes it far easier. Statisticians often cite it as an example of choosing when to stop.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '针比线距长怎么办？',
        en: 'What if the needle is longer than the gap?',
      },
      answer: {
        zh: '那一根针可能同时压两条线，"压线的概率"公式就不再是 $2l/(\\pi d)$。但"平均压线次数 = $2l/(\\pi d)$"仍然成立（面条的论证不要求 $l\\le d$），数压线次数而不是压线根数，照样能估 π。画板上只让针长在线距以内。',
        en: 'Then one needle can cross two lines at once, and the chance of crossing is no longer $2l/(\\pi d)$. But the average number of crossings is still $2l/(\\pi d)$ (the noodle argument does not need $l\\le d$), so counting crossings rather than needles still estimates π. The stage keeps needles no longer than the gap.',
      },
    },
    {
      question: {
        zh: '画板上的针是真的随机吗？',
        en: 'Are the needles on the stage really random?',
      },
      answer: {
        zh: '每根针的位置和角度由"种子 + 编号"的哈希决定。自由模式每次清空换一个种子；故事用固定种子，所以每次播放一模一样，一万根针总是得到 3.1546。在这里，它们和真随机看不出区别。',
        en: 'Free play uses fixed seeds hashed per needle, a new seed each time you clear; the story uses one fixed seed, so it plays the same every time and ten thousand needles always give 3.1546. Statistically neither can be told apart from true randomness here.',
      },
    },
    {
      question: {
        zh: '有没有更快估 π 的随机方法？',
        en: 'Is there a faster random way to estimate π?',
      },
      answer: {
        zh: '往正方形里随机撒点、数落在内切圆里的比例（π/4），误差同样按 $1/\\sqrt N$ 缩小，只是常数小一些。所有这类"扔骰子"的方法都受同一个 $1/\\sqrt N$ 限制；真要算 π，用的是收敛极快的级数。',
        en: 'Scatter points in a square and count the share inside the inscribed circle (π/4): the error also shrinks like $1/\\sqrt N$, just with a smaller constant. Every dice-throwing method shares that $1/\\sqrt N$ limit; to actually compute π, people use series that converge extremely fast.',
      },
    },
  ],
  relatedCurves: ['sine-wave'],
  relatedLabs: ['law-of-large-numbers', 'riemann-sum-area'],
  sources: [
    {
      title: 'Buffon’s needle problem — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Buffon%27s_needle_problem',
    },
    {
      title: 'Buffon’s noodle — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Buffon%27s_noodle',
    },
  ],
};
