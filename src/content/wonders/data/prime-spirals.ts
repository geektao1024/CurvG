import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the 6/44/710
 * near-turns, the continued fraction of 2π, φ(6)/φ(44)/φ(710), the prime
 * counts below a million and per arm all come from
 * `@/lib/wonders/prime-spiral`.
 */
export const primeSpirals: Wonder = {
  slug: 'prime-spirals',
  publication: 'public',
  number: 6,
  updated: '2026-10-17',
  field: { zh: '数论 · 质数', en: 'Number theory · Primes' },
  name: { zh: '质数螺旋', en: 'Prime spirals' },
  metaTitle: {
    zh: '质数螺旋：极坐标里的质数为什么排成螺旋和射线 | CurvG',
    en: 'Prime Spirals: Why Primes Make Spirals and Rays | CurvG',
  },
  question: {
    zh: '把质数画在极坐标上，为什么会出现螺旋和射线？',
    en: 'Plot the primes in polar coordinates: why do spirals and rays appear?',
  },
  summary: {
    zh: '把每个整数 n 放在离中心 n、转过 n 弧度的位置。拉远看，数字排成 6 条臂、44 条螺旋、710 条射线，质数只落在其中 2 条、20 条、280 条上。缩放看看规律从哪里来。',
    en: 'Put every whole number n at distance n from the centre, turned by n radians. Zoom out and the numbers line up in 6 arms, then 44 spirals, then 710 rays; the primes sit on only 2, 20 and 280 of them. Zoom and see where the pattern comes from.',
  },
  takeaway: {
    zh: '螺旋属于整数，不属于质数：6、44、710 弧度都几乎是整圈（44/7 和 710/113 是 2π 最好的分数逼近）。质数只是避开和这些数有公因数的臂，再在剩下的臂上平分（狄利克雷定理）。',
    en: 'The spirals belong to the whole numbers, not the primes: 6, 44 and 710 radians are each almost whole turns (44/7 and 710/113 are the best fractions for 2π). The primes only avoid the arms that share a factor with those numbers, and split evenly among the rest (Dirichlet’s theorem).',
  },
  beats: [
    {
      zh: '把每个整数 n 画在离中心 n 的地方，方向转 n 弧度。1、2、3……绕出一条螺旋，质数标成琥珀色。',
      en: 'Draw each whole number n at distance n from the centre, turned by n radians. 1, 2, 3… wind out in a spiral; the primes are amber.',
    },
    {
      zh: '只看质数，它们东一个西一个，看不出规律。',
      en: 'Look at the primes alone: scattered here and there, no pattern in sight.',
    },
    {
      zh: '拉远到 150，按除以 6 的余数上色：整数排成 6 条旋臂，质数只在其中 2 条上。',
      en: 'Zoom out to 150 and colour by remainder after dividing by 6: the whole numbers form 6 spiral arms, and the primes sit on just 2 of them.',
    },
    {
      zh: '因为 6 弧度只比一整圈少 0.28：每隔 6 个数，方向几乎转回原处。质数除了 2 和 3，不是 6k+1 就是 6k+5，只能落在这两条臂上。',
      en: 'Because 6 radians is just 0.28 short of a full turn: every sixth number points almost the same way again. Apart from 2 and 3, every prime is 6k+1 or 6k+5, so only those two arms can hold them.',
    },
    {
      zh: '拉到 5000：变成 44 条螺旋，因为 44 弧度只比 7 整圈多 0.018。只留质数，24 条臂整条消失：上面全是偶数或 11 的倍数，剩下 20 条。',
      en: 'Zoom to 5000: now 44 spirals, because 44 radians is only 0.018 more than 7 full turns. Keep only the primes and 24 whole arms vanish, all even numbers or multiples of 11, leaving 20.',
    },
    {
      zh: '拉到 60 万：710 条几乎笔直的射线，710 弧度和 113 整圈只差 0.00006。质数落在其中 280 条上。',
      en: 'Zoom to 600,000: 710 almost straight rays, since 710 radians misses 113 full turns by only 0.00006. The primes sit on 280 of them.',
    },
    {
      zh: '6、44、710 都来自 2π 最好的分数逼近：44/7 和 710/113，也就是 22/7 和 355/113 逼近 π。螺旋是整数的性质，不是质数的。',
      en: '6, 44 and 710 come from the best fractions for 2π: 44/7 and 710/113, the same as 22/7 and 355/113 for π. The spirals belong to the whole numbers, not to the primes.',
    },
    {
      zh: '质数唯一的规律，是在这 280 条射线上平分：100 万以内的 78498 个质数，每条约 280 个。这是狄利克雷定理。',
      en: 'The one thing the primes do is share those 280 rays evenly: the 78,498 primes below a million come to about 280 per ray. That is Dirichlet’s theorem.',
    },
    {
      zh: '现在轮到你：自由缩放，只看质数或看全部整数，按余数给旋臂上色。',
      en: 'Your turn: zoom freely, show the primes or every number, and colour the arms by remainder.',
    },
  ],
  sections: [
    {
      id: 'polar',
      title: { zh: '一个数，一个点', en: 'One number, one point' },
      body: {
        zh: '极坐标用"离中心多远"和"转了多少"确定一个点。把整数 $n$ 放在\n\n$$r=n,\\qquad\\theta=n\\ \\text{弧度}$$\n\n所有点都落在阿基米德螺线 $r=\\theta$ 上，相邻两个数相差 1 弧度（约 57.3°）。画板上琥珀色是质数，蓝色是其他整数。\n\n近看只有一条松散的螺旋；规律要拉远才出现。',
        en: 'Polar coordinates fix a point by how far it is from the centre and how far it has turned. Put the whole number $n$ at\n\n$$r=n,\\qquad\\theta=n\\ \\text{radians}$$\n\nEvery point lies on the Archimedean spiral $r=\\theta$, and neighbouring numbers are 1 radian (about 57.3°) apart. On the stage the primes are amber and the other numbers blue.\n\nClose in there is only one loose spiral; the pattern appears as you zoom out.',
      },
    },
    {
      id: 'arms',
      title: { zh: '为什么是 6、44、710', en: 'Why 6, 44 and 710' },
      body: {
        zh: '$n$ 和 $n+m$ 的方向相差 $m$ 弧度。如果 $m$ 几乎是整数圈，$n+m$ 就落在 $n$ 的正外侧、只偏一点点，于是每隔 $m$ 个数连成一条慢慢弯过去的臂，一共 $m$ 条：\n\n$$6-2\\pi\\approx-0.283,\\quad 44-14\\pi\\approx0.0177,\\quad 710-226\\pi\\approx0.00006$$\n\n偏得越少，臂越直：6 条臂每向外 133 个数就绕一圈，所以要在 150 左右看；44 条螺旋绕一圈要约 1.56 万；710 条要 7400 万，在 100 万以内看起来就是射线。\n\n这些数来自 $2\\pi$ 的连分数\n\n$$2\\pi=[6;3,1,1,7,2,146,\\dots]$$\n\n它的渐近分数是 $6,\\frac{19}{3},\\frac{25}{4},\\frac{44}{7},\\frac{333}{53},\\frac{710}{113}$。下一项越大，这个分数逼近得越好，对应的臂也越清楚：6 后面是 3，44 后面是 7，710 后面是 146。约掉 2 就是 π 的著名近似 $\\frac{22}{7}$ 和 $\\frac{355}{113}$。',
        en: '$n$ and $n+m$ point $m$ radians apart. If $m$ is almost a whole number of turns, $n+m$ lands just outside $n$, a little off to one side, so every $m$-th number joins into one slowly curving arm, $m$ arms in all:\n\n$$6-2\\pi\\approx-0.283,\\quad 44-14\\pi\\approx0.0177,\\quad 710-226\\pi\\approx0.00006$$\n\nThe smaller the miss, the straighter the arms: the 6 arms wind once every 133 numbers outwards, so they show around 150; the 44 spirals take about 15,600 to wind once; the 710 take 74 million, so below a million they look like rays.\n\nThe numbers come from the continued fraction of $2\\pi$:\n\n$$2\\pi=[6;3,1,1,7,2,146,\\dots]$$\n\nIts convergents are $6,\\frac{19}{3},\\frac{25}{4},\\frac{44}{7},\\frac{333}{53},\\frac{710}{113}$. The larger the next term, the better that fraction and the clearer its arms: 6 is followed by 3, 44 by 7, 710 by 146. Halved, they are the famous approximations $\\frac{22}{7}$ and $\\frac{355}{113}$ for π.',
      },
    },
    {
      id: 'primes',
      title: { zh: '质数挑走了哪些臂', en: 'Which arms the primes keep' },
      body: {
        zh: '第 $r$ 条臂上的数都是 $mk+r$。如果 $r$ 和 $m$ 有公因数 $d>1$，这条臂上的每个数都能被 $d$ 整除，最多只有 $d$ 本身是质数。所以质数只落在 $r$ 和 $m$ 互质的臂上，这样的臂有 $\\varphi(m)$ 条（欧拉函数）：\n\n$$\\varphi(6)=2,\\qquad\\varphi(44)=20,\\qquad\\varphi(710)=280$$\n\n44 条里空掉的 24 条，是偶数臂和 11 的倍数臂；$710=2\\times5\\times71$，空掉的是 2、5、71 的倍数。',
        en: 'Arm $r$ holds the numbers $mk+r$. If $r$ and $m$ share a factor $d>1$, every number on that arm is divisible by $d$, and at most $d$ itself is prime. So primes sit only on arms where $r$ and $m$ have no common factor; there are $\\varphi(m)$ of them (Euler’s totient):\n\n$$\\varphi(6)=2,\\qquad\\varphi(44)=20,\\qquad\\varphi(710)=280$$\n\nThe 24 empty arms of the 44 are the even arms and the multiples of 11; $710=2\\times5\\times71$, so the empty rays hold multiples of 2, 5 or 71.',
      },
    },
    {
      id: 'dirichlet',
      title: { zh: '狄利克雷定理：平分', en: 'Dirichlet: an even split' },
      body: {
        zh: '1837 年狄利克雷证明：只要 $r$ 和 $m$ 互质，$mk+r$ 里就有无穷多个质数，而且长远看每条这样的臂分到的质数一样多。\n\n画板上的数据可以验证：100 万以内有 78498 个质数，按除以 44 的余数分到 20 条臂上，每条在 3874 到 3964 个之间；分到 710 的 280 条射线上，平均约 280 个。\n\n所以这些图案说的不是"质数有隐藏的螺旋结构"，而是两件更朴素的事：整数在极坐标里排成螺旋，质数在允许的臂上分布均匀。',
        en: 'In 1837 Dirichlet proved that whenever $r$ and $m$ have no common factor, $mk+r$ contains infinitely many primes, and in the long run every such arm gets the same share.\n\nThe stage’s own numbers bear it out: the 78,498 primes below a million, sorted by remainder mod 44, put between 3874 and 3964 on each of the 20 arms; over the 280 rays of 710 they average about 280.\n\nSo the pictures do not say that primes hide a spiral structure; they say two plainer things: whole numbers form spirals in polar coordinates, and primes spread evenly over the arms they are allowed.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '这能用来找质数吗？',
        en: 'Can this be used to find primes?',
      },
      answer: {
        zh: '不能。图案只告诉你哪些臂上一定没有质数（和模数有公因数的臂）；在允许的臂上，哪个数是质数仍然要逐个判断，看起来和随机差不多。',
        en: 'No. The picture only tells you which arms can hold no primes (those sharing a factor with the count); on the allowed arms, which numbers are prime still has to be checked one by one, and looks close to random.',
      },
    },
    {
      question: {
        zh: '和乌拉姆螺旋是一回事吗？',
        en: 'Is this the Ulam spiral?',
      },
      answer: {
        zh: '不是。乌拉姆螺旋把整数绕成方形螺旋，质数常排在斜线上，那些斜线对应二次多项式，比如欧拉的 $n^2+n+41$ 在 $n=0$ 到 $39$ 时全是质数。这里的螺旋和射线则来自 2π 的分数逼近。',
        en: 'No. The Ulam spiral winds the integers in a square spiral, where primes often line up along diagonals that correspond to quadratic polynomials, such as Euler’s $n^2+n+41$, prime for every $n$ from 0 to 39. The spirals and rays here come from fractions close to 2π.',
      },
    },
    {
      question: {
        zh: '如果用角度而不是弧度呢？',
        en: 'What if I use degrees instead of radians?',
      },
      answer: {
        zh: '那每 360 个数正好转回原处，图案变成 360 条笔直的射线，不会弯。质数落在其中 $\\varphi(360)=96$ 条上。弧度让 2π 成为无理数，螺旋才会出现。',
        en: 'Then every 360th number comes back exactly, and the picture becomes 360 perfectly straight rays that never curve. The primes sit on $\\varphi(360)=96$ of them. Radians make a full turn the irrational 2π, which is what bends the arms into spirals.',
      },
    },
  ],
  relatedCurves: ['archimedean-spiral'],
  relatedLabs: ['unit-circle-sine'],
  sources: [
    {
      title: 'Dirichlet’s theorem on arithmetic progressions — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Dirichlet%27s_theorem_on_arithmetic_progressions',
    },
    {
      title: 'Continued fraction — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Continued_fraction',
    },
    {
      title: 'Ulam spiral — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Ulam_spiral',
    },
  ],
};
