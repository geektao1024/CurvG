import { pick, type Lab } from '../types';

const MAX = 20;
const js = Array.from({ length: MAX + 1 }, (_, j) => j);

// C(n, k) as a running product of (n − i) / (i + 1), split in two so each
// expression stays short.
const ratio = (from: number, to: number) =>
  js
    .slice(from, to)
    .map((i) => `(${i} < k ? (n - ${i}) / ${i + 1} : 1)`)
    .join(' * ');

export const binomialDistribution: Lab = {
  slug: 'binomial-distribution',
  publication: 'public',
  primaryCategoryId: 'numbers-structure',
  levels: ['high'],
  chapterTitle: { en: 'Binomial distribution', zh: '二项分布' },
  title: {
    en: 'The binomial distribution: count the paths, multiply the chances',
    zh: '二项分布：数出路径，再乘上每条路径的概率',
  },
  question: {
    en: 'Where does P(X = k) = C(n, k) pᵏ(1 − p)ⁿ⁻ᵏ come from, and why is the mean np?',
    zh: 'P(X = k) = C(n, k) pᵏ(1 − p)ⁿ⁻ᵏ 是怎么来的？为什么均值是 np？',
  },
  summary: {
    en: 'Repeat a trial n times with success chance p. Each sequence with k successes has the same probability pᵏ(1 − p)ⁿ⁻ᵏ, and there are C(n, k) of them. The board adds up the bars to measure the total, the mean and the variance, and compares them with 1, np and np(1 − p).',
    zh: '把成功概率为 p 的试验重复 n 次。每一个恰有 k 次成功的序列概率都是 pᵏ(1 − p)ⁿ⁻ᵏ，这样的序列有 C(n, k) 个。画板把所有柱子加起来，量出总和、均值和方差，再和 1、np、np(1 − p) 比较。',
  },
  keyPoints: [
    { en: 'Independent trials', zh: '独立重复试验' },
    { en: 'Binomial probability', zh: '二项分布概率' },
    { en: 'Mean np', zh: '均值 np' },
    { en: 'Variance np(1 − p)', zh: '方差 np(1 − p)' },
  ],
  board: (lang) => {
    const t = pick(lang);
    const bar = (x: string, h: string, color: 'blue' | 'amber', visible: string) => ({
      type: 'polygon' as const,
      points: [
        [`${x} - 0.38`, 0],
        [`${x} + 0.38`, 0],
        [`${x} + 0.38`, h],
        [`${x} - 0.38`, h],
      ] as [string | number, string | number][],
      color,
      opacity: color === 'amber' ? 0.75 : 0.35,
      width: 1,
      visible,
    });
    return {
      view: { x: [-1, 21], y: [-0.06, 0.5], equal: false },
      params: [
        { id: 'n', label: 'n', min: 1, max: MAX, step: 1, value: 10 },
        { id: 'p', label: 'p', min: 0.05, max: 0.95, step: 0.01, value: 0.3 },
        { id: 'k', label: 'k', min: 0, max: MAX, step: 1, value: 3 },
      ],
      scalars: [
        // P0 = (1 − p)ⁿ, then each bar from the one before:
        // P(j + 1) = P(j) · (n − j) / (j + 1) · p / (1 − p).
        { id: 'w', expr: 'p / (1 - p)' },
        { id: 'P0', expr: '(1 - p)^n' },
        ...js.slice(1).map((j) => ({
          id: `P${j}`,
          expr: `P${j - 1} * max(n - ${j - 1}, 0) / ${j} * w`,
        })),
        // Measured from the bars.
        { id: 'total', expr: js.map((j) => `P${j}`).join(' + ') },
        { id: 'mean', expr: js.slice(1).map((j) => `${j} * P${j}`).join(' + ') },
        { id: 'sq', expr: js.slice(1).map((j) => `${j * j} * P${j}`).join(' + ') },
        // P(X = k) straight from the formula, as a cross-check on the bars.
        { id: 'ck1', expr: ratio(0, 10) },
        { id: 'ck2', expr: ratio(10, 20) },
        { id: 'ck', expr: 'ck1 * ck2' },
        { id: 'pk', expr: 'ck * p^k * (1 - p)^max(n - k, 0)' },
      ],
      objects: [
        ...js.map((j) => bar(String(j), `P${j}`, 'blue', `${j} <= n`)),
        bar('k', 'pk', 'amber', 'k <= n'),
        { type: 'segment', from: ['mean', 0], to: ['mean', 0.46], color: 'red', dashed: true, width: 1.5 },
        { type: 'text', at: ['mean', 0.48], text: 'E(X) = {mean}', color: 'red' },
      ],
      readouts: [
        { label: 'P(X = k)', expr: 'pk', digits: 4, highlight: true },
        { label: '\\binom{n}{k}', expr: 'ck', digits: 0 },
        { label: 'p^k(1-p)^{n-k}', expr: 'k <= n ? p^k * (1 - p)^(n - k) : 0', digits: 6 },
        { label: '\\textstyle\\sum P', expr: 'total', digits: 6 },
        { label: t('\\text{mean of bars}', '\\text{柱子的均值}'), expr: 'mean', digits: 4 },
        { label: 'np', expr: 'n * p', digits: 4 },
        { label: t('\\text{variance of bars}', '\\text{柱子的方差}'), expr: 'sq - mean^2', digits: 4 },
        { label: 'np(1-p)', expr: 'n * p * (1 - p)', digits: 4 },
      ],
    };
  },
  guide: [
    {
      title: { en: 'One path, then all of them', zh: '先看一条路径，再数路径' },
      body: {
        en: 'Ten trials, success chance $0.3$. One particular sequence with exactly $3$ successes, say SSSFFFFFFF, has probability $0.3^3\\times0.7^7=0.002224$ because independent chances multiply. There are $\\binom{10}{3}=120$ such sequences, all equally likely, so $P(X=3)=120\\times0.002224=0.2668$.',
        zh: '做 $10$ 次试验，每次成功概率 $0.3$。某一个恰好成功 $3$ 次的序列，比如"成成成败败败败败败败"，概率是 $0.3^3\\times0.7^7=0.002224$，因为独立事件的概率相乘。这样的序列有 $\\binom{10}{3}=120$ 个，概率都一样，所以 $P(X=3)=120\\times0.002224=0.2668$。',
      },
      set: { n: 10, p: 0.3, k: 3 },
    },
    {
      title: { en: 'The bars add to 1', zh: '柱子加起来是 1' },
      body: {
        en: 'Every sequence has some number of successes between $0$ and $n$, so the bars share out all the probability: they add to $1$. The mean of the bars, $\\sum k\\,P(X=k)$, comes out $3=np$, and their variance $2.1=np(1-p)$.',
        zh: '每个序列的成功次数总在 $0$ 到 $n$ 之间，所以这些柱子分完了全部概率，加起来是 $1$。按柱子算出的均值 $\\sum k\\,P(X=k)$ 是 $3=np$，方差是 $2.1=np(1-p)$。',
      },
      set: { n: 10, p: 0.3, k: 3 },
    },
    {
      title: { en: 'A fair coin is symmetric', zh: '均匀硬币左右对称' },
      body: {
        en: 'At $p=0.5$ swapping success and failure changes nothing, so the bars are symmetric about $np=10$. The tallest is $P(X=10)=0.1762$ for $20$ tosses: even the most likely count happens less than one time in five.',
        zh: '$p=0.5$ 时，成功和失败对调不改变任何东西，所以柱子关于 $np=10$ 对称。抛 $20$ 次，最高的一根是 $P(X=10)=0.1762$：即使是最可能的次数，也不到五次里出现一次。',
      },
      set: { n: 20, p: 0.5, k: 10 },
    },
    {
      title: { en: 'Rare events', zh: '小概率事件' },
      body: {
        en: 'With $p=0.05$ and $20$ trials, $P(X=0)=0.95^{20}=0.3585$: about a one-in-three chance of no success at all, and the mean is only $np=1$.',
        zh: '$p=0.05$、做 $20$ 次时，$P(X=0)=0.95^{20}=0.3585$：大约三分之一的可能一次都不成功，均值只有 $np=1$。',
      },
      set: { n: 20, p: 0.05, k: 0 },
    },
  ],
  sections: [
    {
      id: 'formula',
      title: { en: 'Where the formula comes from', zh: '公式从哪里来' },
      body: {
        en: 'Write the $n$ results as a string of S and F. Because the trials are independent, the probability of one string is the product of its letters\' chances; a string with $k$ S\'s and $n-k$ F\'s has probability $p^k(1-p)^{n-k}$, whatever the order. The number of such strings is the number of ways to choose which $k$ positions hold S: $\\binom nk$. Strings are disjoint outcomes, so their probabilities add:\n\n$$P(X=k)=\\binom nk\\,p^k(1-p)^{n-k}$$',
        zh: '把 $n$ 次结果写成一串"成"和"败"。各次试验相互独立，所以一串结果的概率等于每个字母的概率相乘；含 $k$ 个"成"、$n-k$ 个"败"的串，不论顺序如何，概率都是 $p^k(1-p)^{n-k}$。这样的串有多少个？就是从 $n$ 个位置里选出哪 $k$ 个放"成"：$\\binom nk$ 个。不同的串互不相容，概率直接相加：\n\n$$P(X=k)=\\binom nk\\,p^k(1-p)^{n-k}$$',
      },
    },
    {
      id: 'total',
      title: { en: 'Why the total is 1', zh: '为什么总和是 1' },
      body: {
        en: 'Expand $(p+(1-p))^n$ by multiplying out the $n$ brackets: picking $p$ from $k$ of them and $1-p$ from the rest can be done in $\\binom nk$ ways. So the bars are exactly the terms of the binomial expansion, which is where the name comes from, and they add to $1^n=1$.',
        zh: '把 $(p+(1-p))^n$ 的 $n$ 个括号乘开：从其中 $k$ 个括号里取 $p$、其余取 $1-p$，有 $\\binom nk$ 种取法。所以这些柱子正好是二项式展开的各项，"二项分布"的名字就是这么来的，它们的和是 $1^n=1$。',
      },
    },
    {
      id: 'mean',
      title: { en: 'Mean and variance without the formula', zh: '不用公式求均值和方差' },
      body: {
        en: 'Let $X_i=1$ if trial $i$ succeeds and $0$ if not, so $X=X_1+\\cdots+X_n$. Each $X_i$ has mean $1\\cdot p+0\\cdot(1-p)=p$ and variance $E(X_i^2)-p^2=p-p^2=p(1-p)$. Means always add, and for independent trials variances add too:\n\n$$E(X)=np,\\qquad D(X)=np(1-p)$$\n\nThe board does not use these: it sums the bars directly, and the results agree.',
        zh: '设第 $i$ 次成功时 $X_i=1$，失败时 $X_i=0$，那么 $X=X_1+\\cdots+X_n$。每个 $X_i$ 的均值是 $1\\cdot p+0\\cdot(1-p)=p$，方差是 $E(X_i^2)-p^2=p-p^2=p(1-p)$。均值总是可以相加；试验相互独立时，方差也可以相加：\n\n$$E(X)=np,\\qquad D(X)=np(1-p)$$\n\n画板没有用这两个公式，而是直接把柱子加起来，结果和公式一致。',
      },
    },
    {
      id: 'conditions',
      title: { en: 'When it applies', zh: '什么时候能用' },
      body: {
        en: 'Three conditions: a fixed number $n$ of trials, each with two outcomes and the same chance $p$, and independence between them. Drawing without replacement breaks the last two, since each draw changes what is left; that case is the hypergeometric distribution.',
        zh: '需要三个条件：试验次数 $n$ 固定；每次只有两种结果，成功概率都是 $p$；各次之间相互独立。不放回地抽取会破坏后两条，因为每抽一次剩下的就变了，那是超几何分布。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A fair coin is tossed $4$ times. What is $P(\\text{exactly } 2 \\text{ heads})$?',
        zh: '均匀硬币抛 $4$ 次，恰好 $2$ 次正面的概率是多少？',
      },
      choices: [
        { en: '$\\tfrac{6}{16}$', zh: '$\\tfrac{6}{16}$' },
        { en: '$\\tfrac{1}{16}$', zh: '$\\tfrac{1}{16}$' },
        { en: '$\\tfrac{1}{2}$', zh: '$\\tfrac{1}{2}$' },
        { en: '$\\tfrac{4}{16}$', zh: '$\\tfrac{4}{16}$' },
      ],
      answer: 0,
      explanation: {
        en: 'Each sequence has chance $\\tfrac1{16}$ and $\\binom42=6$ sequences have two heads.',
        zh: '每个序列的概率是 $\\tfrac1{16}$，含两次正面的序列有 $\\binom42=6$ 个。',
      },
    },
    {
      question: {
        en: 'Why is every sequence with $k$ successes equally likely?',
        zh: '为什么所有恰有 $k$ 次成功的序列概率都相同？',
      },
      choices: [
        { en: 'Independent chances multiply, and the product does not depend on order', zh: '独立事件概率相乘，乘积与顺序无关' },
        { en: 'Because $\\binom nk$ is symmetric', zh: '因为 $\\binom nk$ 是对称的' },
        { en: 'Only when $p=0.5$', zh: '只有 $p=0.5$ 时才成立' },
        { en: 'Because the bars add to $1$', zh: '因为柱子加起来是 $1$' },
      ],
      answer: 0,
      explanation: {
        en: 'Each has $k$ factors $p$ and $n-k$ factors $1-p$, in some order.',
        zh: '每个序列都是 $k$ 个 $p$ 和 $n-k$ 个 $1-p$ 相乘，只是顺序不同。',
      },
    },
    {
      question: {
        en: 'A test has $50$ multiple-choice questions with $4$ options each. Guessing every one, what is the expected score?',
        zh: '一份试卷有 $50$ 道四选一的选择题，全部瞎猜，期望答对几道？',
      },
      choices: [
        { en: '$12.5$', zh: '$12.5$' },
        { en: '$25$', zh: '$25$' },
        { en: '$4$', zh: '$4$' },
        { en: '$9.375$', zh: '$9.375$' },
      ],
      answer: 0,
      explanation: {
        en: '$np=50\\times\\tfrac14=12.5$. $9.375=np(1-p)$ is the variance.',
        zh: '$np=50\\times\\tfrac14=12.5$。$9.375=np(1-p)$ 是方差。',
      },
    },
  ],
  resultTex: '\\binom{n}{k} p^k (1-p)^{n-k}',
  related: ['permutations-combinations', 'normal-distribution'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Build the binomial distribution: for 10 trials with p = 0.3, show one sequence with 3 successes and its probability 0.3³ × 0.7⁷, count 120 such sequences, then grow the full bar chart and mark its mean np = 3.',
    zh: '搭出二项分布：10 次试验、p = 0.3，先展示一个恰有 3 次成功的序列及其概率 0.3³ × 0.7⁷，再数出这样的序列有 120 个，最后长出整张柱状图并标出均值 np = 3。',
  },
};
