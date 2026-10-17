import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the path of 6,
 * 27's 111 steps and peak 9232, 6171's 261 steps, the 21,664 numbers in the
 * tree of 1 … 10 000 and the 3/4 heuristic all come from
 * `@/lib/wonders/collatz`.
 */
export const collatzTree: Wonder = {
  slug: 'collatz-tree',
  publication: 'public',
  number: 10,
  updated: '2026-10-17',
  field: { zh: '数论 · 未解之谜', en: 'Number theory · Open problem' },
  name: { zh: 'Collatz 猜想', en: 'Collatz conjecture' },
  metaTitle: {
    zh: 'Collatz 猜想（3n+1）：为什么每个数都会掉到 1 | CurvG',
    en: 'Collatz Conjecture (3n+1): Why Every Number Falls to 1 | CurvG',
  },
  question: {
    zh: '偶数除以 2，奇数乘 3 加 1，为什么最后总会掉到 1？',
    en: 'Halve it if even, triple it and add 1 if odd: why does every number end at 1?',
  },
  summary: {
    zh: '规则一句话就能说完，从小学生到数学家都能动手算。27 要走 111 步、冲到 9232 才落回 1；已经验证过的数没有一个例外，但至今没人能证明。把所有路倒过来画，它们长成一株珊瑚。',
    en: 'The rule fits in one sentence and anyone can try it. 27 takes 111 steps and climbs to 9232 before falling to 1; no number checked has ever failed, yet nobody can prove it. Draw all the paths backwards and they grow into a coral.',
  },
  takeaway: {
    zh: '每乘一次 3，平均会接着除以 2 两次，净效果约乘 3/4，所以数"通常"会变小；但"通常"不是"一定"。已经验证到 2⁶⁸ 都成立，2019 年陶哲轩证明了"几乎所有"数都会降到很小，完整的证明仍然没有。',
    en: 'Each tripling is followed on average by two halvings, a net factor of about 3/4, so numbers "usually" shrink; but usually is not always. It has been checked up to 2⁶⁸, and in 2019 Terence Tao proved that "almost all" numbers fall very low, yet a full proof is still missing.',
  },
  beats: [
    {
      zh: '规则只有两条：偶数除以 2，奇数乘 3 加 1。从 6 开始：6、3、10、5、16、8、4、2、1，8 步落到 1。',
      en: 'Just two rules: halve an even number, triple an odd one and add 1. From 6: 6, 3, 10, 5, 16, 8, 4, 2, 1, down to 1 in 8 steps.',
    },
    {
      zh: '从 27 开始却要走 111 步，中途一度冲到 9232，像冰雹在云里上下翻滚，最后才落回 1。',
      en: 'From 27 it takes 111 steps, climbing as high as 9232 on the way, tossed up and down like a hailstone in a cloud before it finally falls to 1.',
    },
    {
      zh: '1 到 1 万，每个数要走几步？没有简单的规律，最多的是 6171，要 261 步。但每一个最后都落到 1。',
      en: 'How many steps for every number up to 10,000? No simple pattern; the longest is 6171, at 261 steps. But every one of them ends at 1.',
    },
    {
      zh: '把每个数回到 1 的路倒过来画：从 1 出发往上长，遇到偶数向一边偏一点，奇数向另一边偏一点。白线是 27 的路。',
      en: 'Now draw each path backwards: grow up from 1, turning slightly one way at each even number and the other way at each odd one. The white line is 27’s path.',
    },
    {
      zh: '把 1 到 1 万全部画上，共用的路只画一次，一共 21664 个数，长成了这样一株珊瑚。越粗的枝，经过的数越多。',
      en: 'Draw every number up to 10,000, shared stretches only once: 21,664 numbers grow into this coral. The thicker the branch, the more numbers pass through it.',
    },
    {
      zh: '为什么这么难证明？每乘一次 3，平均会接着除以 2 两次，净效果约乘 3/4，所以通常会变小。但"通常"不是"一定"。',
      en: 'Why is it so hard to prove? Each tripling is followed on average by two halvings, about 3/4 overall, so numbers usually shrink. But usually is not always.',
    },
    {
      zh: '计算机已经验证到 2⁶⁸，约 3 × 10²⁰，没有例外；2019 年陶哲轩证明"几乎所有"数都会降到很小。但"所有数都落到 1"至今没人能证明。',
      en: 'Computers have checked everything up to 2⁶⁸, about 3 × 10²⁰, with no exception; in 2019 Terence Tao proved that almost all numbers fall very low. That every number reaches 1 is still unproved.',
    },
    {
      zh: '现在轮到你：改转弯的角度和画多少个数，选一个数看它回家的路。',
      en: 'Your turn: change the turning angles and how many numbers to draw, and pick a number to see its way home.',
    },
  ],
  sections: [
    {
      id: 'rule',
      title: { zh: '一条规则', en: 'One rule' },
      body: {
        zh: '对正整数 $n$，定义\n\n$$f(n)=\\begin{cases}n/2 & n\\text{ 是偶数}\\\\3n+1 & n\\text{ 是奇数}\\end{cases}$$\n\n不断重复 $f$。Collatz 猜想（也叫 3n+1 问题、冰雹猜想）说：不管从哪个正整数开始，最后都会到达 1，然后在 4、2、1 里循环。\n\n1937 年洛塔尔·科拉茨提出这个问题。它的路径忽上忽下：27 要 111 步，最高到 9232；1 万以内最长的是 6171，要 261 步。',
        en: 'For a positive whole number $n$ let\n\n$$f(n)=\\begin{cases}n/2 & n\\text{ even}\\\\3n+1 & n\\text{ odd}\\end{cases}$$\n\nand repeat. The Collatz conjecture (also the 3n+1 problem, or the hailstone problem) says that whatever number you start from, you eventually reach 1 and then cycle through 4, 2, 1.\n\nLothar Collatz posed it in 1937. The paths jump up and down: 27 takes 111 steps and peaks at 9232; below 10,000 the longest is 6171, at 261 steps.',
      },
    },
    {
      id: 'tree',
      title: { zh: '倒过来画成一棵树', en: 'A tree, drawn backwards' },
      body: {
        zh: '每个数只有一个"下一步"，所以所有路径合起来是一棵以 1 为根的树：从 $n$ 往回走，$2n$ 一定能到 $n$；只有当 $n-1$ 是 3 的倍数、且 $(n-1)/3$ 是奇数时，才多出一个分叉。\n\n画板从根 1 出发，每往回走一步，遇到偶数向左转 0.16 弧度，遇到奇数向右转 0.29 弧度，每步长度相同。1 到 1 万的路径一共经过 21664 个不同的数（路上会经过比 1 万大得多的数）。线越粗，表示 1 到 1 万中经过这段的数越多。这种画法因 Edmund Harriss 的作品而流行，这里是按规则自己算出来的。',
        en: 'Each number has exactly one next step, so all the paths together form a tree rooted at 1. Walking back from $n$, $2n$ always leads to $n$; an extra branch appears only when $n-1$ is a multiple of 3 and $(n-1)/3$ is odd.\n\nThe stage starts at the root 1 and, for every step back, turns left 0.16 radians at an even number and right 0.29 radians at an odd one, each step the same length. The paths of 1 to 10,000 pass through 21,664 different numbers (some far above 10,000). Thicker lines are stretches more of those numbers pass through. The picture was popularised by Edmund Harriss; this one is computed from the rule.',
      },
    },
    {
      id: 'heuristic',
      title: { zh: '为什么"看起来"一定成立', en: 'Why it "looks" true' },
      body: {
        zh: '奇数 $n$ 乘 3 加 1 后一定是偶数，至少要除一次 2；一半的情况能除两次，四分之一能除三次……平均下来，每次乘 3 后要除以 2 两次。把这一步看成"乘 3、除以 4"：\n\n$$3\\times\\tfrac14=\\tfrac34<1$$\n\n所以按"平均"的想法，数会越来越小。但这只是平均：一个特定的数完全可能连续好几次只除一次 2，一路涨上去。要证明猜想，就得排除"永远涨下去"和"掉进别的循环"两种可能，目前的数学工具还做不到。',
        en: 'An odd $n$ becomes even after $3n+1$, so it is halved at least once; half the time twice, a quarter of the time three times… On average each tripling is followed by two halvings. Think of the pair as "times 3, divided by 4":\n\n$$3\\times\\tfrac14=\\tfrac34<1$$\n\nSo on average the numbers shrink. But that is only an average: a particular number could be halved only once, time after time, and keep climbing. A proof must rule out both climbing for ever and falling into some other cycle, and today’s mathematics cannot yet do either.',
      },
    },
    {
      id: 'status',
      title: { zh: '现在知道多少', en: 'What is known' },
      body: {
        zh: '- **验证**：2020 年 David Barina 用计算机验证到 $2^{68}\\approx2.95\\times10^{20}$，全部落到 1。\n- **几乎所有**：2019 年陶哲轩证明，几乎所有起点的轨道都会降到"几乎有界"的值，这是目前最强的结果之一，但"几乎所有"不是"所有"。\n- **没有其他小循环**：已知如果存在别的循环，它必须非常长。\n\n数学家保罗·埃尔德什说过："数学还没有准备好解决这样的问题。"',
        en: '- **Checked**: in 2020 David Barina verified by computer everything up to $2^{68}\\approx2.95\\times10^{20}$; all reach 1.\n- **Almost all**: in 2019 Terence Tao proved that almost all starting points have orbits that fall to "almost bounded" values, one of the strongest results so far; but almost all is not all.\n- **No small cycles**: any other cycle, if one exists, is known to be extremely long.\n\nPaul Erdős once said: "Mathematics may not be ready for such problems."',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '换成 3n − 1 会怎样？',
        en: 'What about 3n − 1?',
      },
      answer: {
        zh: '会出现别的循环。例如从 5 开始：5、14、7、20、10、5，永远到不了 1。这说明"总会到 1"并不是这类规则的普遍性质，3n+1 是不是特殊，正是难点所在。',
        en: 'Other cycles appear. From 5: 5, 14, 7, 20, 10, 5, never reaching 1. So "always reaching 1" is not a general property of such rules; whether 3n+1 is special is exactly what is hard.',
      },
    },
    {
      question: {
        zh: '树的形状有数学意义吗？',
        en: 'Does the shape of the tree mean anything?',
      },
      answer: {
        zh: '形状取决于转角，是一种可视化，不是定理。但有些东西不随转角改变：每条路通向根 1；向下翻倍的长直段、奇数处的分叉，都是规则本身的结构。',
        en: 'The shape depends on the turning angles, so it is a picture, not a theorem. Some things do not change with the angles: every path leads to the root 1, and the long runs of doubling and the forks at odd numbers come from the rule itself.',
      },
    },
    {
      question: {
        zh: '证明了能拿奖吗？',
        en: 'Is there a prize for a proof?',
      },
      answer: {
        zh: '有人设过奖金，但更大的奖励是名声：这是数论里最有名的未解问题之一。不过要当心，网上大量"证明"都有错误，数学界对此非常谨慎。',
        en: 'Prizes have been offered, but the bigger reward is fame: it is one of the most famous open problems in number theory. Be wary, though: many "proofs" online are wrong, and mathematicians treat new claims with great caution.',
      },
    },
  ],
  relatedCurves: [],
  relatedLabs: ['exponential-logarithm'],
  sources: [
    {
      title: 'Collatz conjecture — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Collatz_conjecture',
    },
    {
      title: 'Tao, “Almost all orbits of the Collatz map attain almost bounded values” (2019)',
      url: 'https://arxiv.org/abs/1909.03562',
    },
    {
      title: 'Barina, “Convergence verification of the Collatz problem”, J. Supercomputing 77 (2021)',
      url: 'https://link.springer.com/article/10.1007/s11227-020-03368-x',
    },
  ],
};
