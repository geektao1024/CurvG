import { pick, type Lab } from '../types';

/**
 * A recorded simulation, not live randomness: the board engine has no random
 * numbers and no loops. 1000 runs of 1000 trials each, drawn with mulberry32
 * from seed 20261013 (trial counts as a success when the draw is below p);
 * tests/labs-content.test.ts re-runs it and checks every number below.
 */
export const LLN_NS = [1, 2, 3, 5, 10, 15, 20, 30, 50, 100, 150, 200, 300, 500, 1000];
export const LLN_EPS = 0.05;
export const LLN_DATA = {
  coin: {
    // Running frequency of the first three runs at each n.
    runs: [
      [1, 1, 0.6667, 0.6, 0.7, 0.5333, 0.5, 0.5, 0.6, 0.55, 0.5667, 0.585, 0.56, 0.548, 0.526],
      [1, 0.5, 0.6667, 0.4, 0.3, 0.3333, 0.35, 0.5, 0.5, 0.53, 0.54, 0.53, 0.52, 0.502, 0.514],
      [0, 0.5, 0.3333, 0.6, 0.4, 0.4667, 0.5, 0.5333, 0.62, 0.6, 0.54, 0.52, 0.5367, 0.512, 0.49],
    ],
    // Share of the 1000 runs whose frequency is at least ε away from p.
    off: [1, 0.48, 1, 1, 0.731, 0.615, 0.834, 0.574, 0.482, 0.382, 0.217, 0.172, 0.088, 0.025, 0],
  },
  die: {
    runs: [
      [1, 0.5, 0.3333, 0.4, 0.4, 0.2667, 0.25, 0.1667, 0.18, 0.2, 0.1933, 0.195, 0.1867, 0.174, 0.161],
      [0, 0, 0, 0, 0.1, 0.0667, 0.15, 0.2667, 0.2, 0.17, 0.18, 0.17, 0.15, 0.164, 0.173],
      [0, 0.5, 0.3333, 0.2, 0.2, 0.2, 0.2, 0.2333, 0.28, 0.23, 0.1933, 0.21, 0.2, 0.184, 0.158],
    ],
    off: [1, 1, 1, 0.606, 0.698, 0.503, 0.557, 0.444, 0.336, 0.18, 0.072, 0.053, 0.02, 0.001, 0],
  },
};

// Value at slider step i, as a chain of comparisons.
const lookup = (values: readonly number[]) =>
  values
    .slice(0, -1)
    .map((v, i) => `i < ${i + 0.5} ? ${v} : `)
    .join('') + values[values.length - 1];
const either = (die: number, coin: number) => `(die > 0.5 ? ${die} : ${coin})`;
const lg = LLN_NS.map((n) => Math.log10(n));

export const lawOfLargeNumbers: Lab = {
  slug: 'law-of-large-numbers',
  publication: 'public',
  primaryCategoryId: 'series-limits',
  additionalCategoryIds: ['numbers-structure'],
  levels: ['high'],
  chapterTitle: { en: 'Law of large numbers', zh: '大数定律' },
  title: {
    en: 'The law of large numbers: why the frequency settles at p',
    zh: '大数定律：频率为什么会稳定在概率附近',
  },
  question: {
    en: 'A coin has no memory, so why does the share of heads close in on one half as the tosses pile up?',
    zh: '硬币没有记忆，为什么抛的次数越多，正面的比例就越接近一半？',
  },
  summary: {
    en: 'Three recorded runs of 1000 coin tosses (or die rolls) wander at first and then squeeze towards p. Out of 1000 runs, the board counts how many are still more than 0.05 away at each n, and compares that with the bound p(1 − p)/(nε²) derived from the variance.',
    zh: '三组记录下来的 1000 次抛硬币（或掷骰子）一开始忽高忽低，后来逐渐挤向 p。画板在 1000 组试验里数出每个 n 时仍偏离 p 超过 0.05 的有多少组，再和由方差推出的上界 p(1 − p)/(nε²) 比较。',
  },
  keyPoints: [
    { en: 'Frequency and probability', zh: '频率与概率' },
    { en: 'Variance of the mean p(1 − p)/n', zh: '平均值的方差 p(1 − p)/n' },
    { en: "Chebyshev's inequality", zh: '切比雪夫不等式' },
    { en: "Gambler's fallacy", zh: '赌徒谬误' },
  ],
  board: (lang) => {
    const t = pick(lang);
    const runColors = ['blue', 'green', 'purple'] as const;
    return {
      view: { x: [-0.35, 3.45], y: [-0.13, 1.05], grid: false, axes: false, equal: false },
      params: [
        {
          id: 'die',
          label: t('\\text{trial}', '\\text{试验}'),
          min: 0,
          max: 1,
          step: 1,
          value: 0,
          bands: [
            { from: 0, to: 0, label: t('coin, p = 1/2', '硬币 p = 1/2'), color: 'blue' },
            { from: 1, to: 1, label: t('six, p = 1/6', '六点 p = 1/6'), color: 'amber' },
          ],
        },
        { id: 'i', label: t('\\text{step}', '\\text{档位}'), min: 0, max: LLN_NS.length - 1, step: 1, value: 9, play: 8 },
      ],
      functions: [
        { id: 'up', expr: 'p + 2 * sqrt(p * (1 - p) / 10^x)' },
        { id: 'dn', expr: 'p - 2 * sqrt(p * (1 - p) / 10^x)' },
      ],
      scalars: [
        { id: 'p', expr: 'die > 0.5 ? 1 / 6 : 1 / 2' },
        { id: 'n', expr: lookup(LLN_NS) },
        { id: 'lx', expr: 'log10(n)' },
        { id: 'fc', expr: lookup(LLN_DATA.coin.runs[0]) },
        { id: 'fd', expr: lookup(LLN_DATA.die.runs[0]) },
        { id: 'fr', expr: 'die > 0.5 ? fd : fc' },
        { id: 'oc', expr: lookup(LLN_DATA.coin.off) },
        { id: 'od', expr: lookup(LLN_DATA.die.off) },
        { id: 'off', expr: 'die > 0.5 ? od : oc' },
        { id: 'sig', expr: 'sqrt(p * (1 - p) / n)' },
        { id: 'cheb', expr: `p * (1 - p) / (n * ${LLN_EPS}^2)` },
      ],
      objects: [
        // Hand-drawn axes: n runs on a log scale.
        { type: 'segment', from: [0, 0], to: [3.1, 0], color: 'ink', width: 1.2 },
        { type: 'segment', from: [0, 0], to: [0, 1], color: 'ink', width: 1.2 },
        ...[1, 10, 100, 1000].map((v) => ({
          type: 'text' as const,
          at: [Math.log10(v), -0.07] as [number, number],
          text: `n = ${v}`,
          color: 'muted' as const,
        })),
        ...[0, 0.5, 1].map((v) => ({
          type: 'text' as const,
          at: [-0.06, v] as [number, number],
          text: String(v),
          color: 'muted' as const,
          anchor: 'end' as const,
        })),
        { type: 'segment', from: [0, 'p'], to: [3, 'p'], color: 'amber', width: 2 },
        { type: 'text', at: [3.06, 'p'], text: 'p', color: 'amber', anchor: 'start' },
        { type: 'segment', from: [0, `p + ${LLN_EPS}`], to: [3, `p + ${LLN_EPS}`], color: 'green', dashed: true, width: 1 },
        { type: 'segment', from: [0, `p - ${LLN_EPS}`], to: [3, `p - ${LLN_EPS}`], color: 'green', dashed: true, width: 1 },
        // p ± 2σ of the mean: where most runs should be by now.
        { type: 'function', fn: 'up', domain: [0.3, 3], color: 'muted', dashed: true, width: 1.2 },
        { type: 'function', fn: 'dn', domain: [0.3, 3], color: 'muted', dashed: true, width: 1.2 },
        { type: 'segment', from: ['lx', 0], to: ['lx', 1], color: 'muted', width: 1 },
        ...runColors.flatMap((color, r) =>
          lg.slice(0, -1).map((x, j) => ({
            type: 'segment' as const,
            from: [x, either(LLN_DATA.die.runs[r][j], LLN_DATA.coin.runs[r][j])] as [number, string],
            to: [lg[j + 1], either(LLN_DATA.die.runs[r][j + 1], LLN_DATA.coin.runs[r][j + 1])] as [number, string],
            color,
            width: 1.8,
            opacity: 0.85,
          }))
        ),
        { type: 'point', at: ['lx', 'fr'], color: 'blue', size: 6 },
      ],
      readouts: [
        { label: 'n', expr: 'n', digits: 0 },
        { label: t('\\bar X_n\\ \\text{(blue run)}', '\\bar X_n\\ \\text{（蓝线）}'), expr: 'fr', digits: 4 },
        { label: '\\sqrt{p(1-p)/n}', expr: 'sig', digits: 4 },
        { label: t('\\text{share of runs off by} \\ge 0.05', '\\text{偏离} \\ge 0.05\\ \\text{的组占比}'), expr: 'off', digits: 3, highlight: true },
        { label: '\\dfrac{p(1-p)}{n\\varepsilon^2}', expr: 'cheb', digits: 3 },
        {
          kind: 'status',
          label: t('measured share ≤ bound', '实测占比 ≤ 上界'),
          expr: 'off <= cheb',
          ok: t('yes', '成立'),
          bad: t('no', '不成立'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Ten tosses tell you little', zh: '抛 10 次说明不了什么' },
      body: {
        en: 'After $10$ tosses the three runs read $0.7$, $0.3$ and $0.4$. Out of $1000$ runs, $73.1\\%$ are still $0.05$ or more away from $\\tfrac12$. The bound $\\frac{p(1-p)}{n\\varepsilon^2}=10$ is true but says nothing yet.',
        zh: '抛 $10$ 次后，三组的正面比例是 $0.7$、$0.3$、$0.4$。$1000$ 组里有 $73.1\\%$ 偏离 $\\tfrac12$ 达到 $0.05$ 以上。上界 $\\frac{p(1-p)}{n\\varepsilon^2}=10$ 虽然成立，但还没有任何约束力。',
      },
      set: { die: 0, i: 4 },
    },
    {
      title: { en: 'A hundred tosses', zh: '抛 100 次' },
      body: {
        en: 'At $n=100$ the typical distance $\\sqrt{p(1-p)/n}$ is $0.05$, and $38.2\\%$ of runs are still off by that much. The bound has come down to $1$.',
        zh: '$n=100$ 时，典型偏离 $\\sqrt{p(1-p)/n}$ 是 $0.05$，仍有 $38.2\\%$ 的组偏离这么多。上界降到了 $1$。',
      },
      set: { die: 0, i: 9 },
    },
    {
      title: { en: 'A thousand tosses', zh: '抛 1000 次' },
      body: {
        en: 'At $n=1000$ the runs read $0.526$, $0.514$ and $0.49$, and none of the $1000$ runs is $0.05$ away. The bound guarantees at most $10\\%$; reality is far better. The spread shrinks like $\\frac1{\\sqrt n}$: ten times the tosses, about a third of the wobble.',
        zh: '$n=1000$ 时三组分别是 $0.526$、$0.514$、$0.49$，$1000$ 组里没有一组偏离到 $0.05$。上界只保证不超过 $10\\%$，实际要好得多。波动按 $\\frac1{\\sqrt n}$ 缩小：次数变成 $10$ 倍，波动大约只剩三分之一。',
      },
      set: { die: 0, i: 14 },
    },
    {
      title: { en: 'Same law for a die', zh: '换成骰子也一样' },
      body: {
        en: 'Count sixes instead, $p=\\tfrac16$. After $1000$ rolls the runs read $0.161$, $0.173$ and $0.158$, all within $0.05$ of $0.1667$, and the bound is $0.056$. A smaller $p(1-p)$ means a narrower funnel.',
        zh: '改成数六点，$p=\\tfrac16$。掷 $1000$ 次后三组是 $0.161$、$0.173$、$0.158$，都在 $0.1667$ 的 $0.05$ 以内，上界是 $0.056$。$p(1-p)$ 越小，漏斗越窄。',
      },
      set: { die: 1, i: 14 },
    },
  ],
  sections: [
    {
      id: 'statement',
      title: { en: 'What the law says', zh: '定律说的是什么' },
      body: {
        en: 'Repeat a trial with success chance $p$ independently, and let $\\bar X_n$ be the share of successes in the first $n$. For any margin $\\varepsilon>0$,\n\n$$P\\big(|\\bar X_n-p|\\ge\\varepsilon\\big)\\to0\\quad(n\\to\\infty)$$\n\nIt does not say that any particular run reaches $p$, only that the chance of being far from it can be made as small as you like.',
        zh: '把成功概率为 $p$ 的试验独立重复，记前 $n$ 次中成功的比例为 $\\bar X_n$。对任意给定的误差 $\\varepsilon>0$，\n\n$$P\\big(|\\bar X_n-p|\\ge\\varepsilon\\big)\\to0\\quad(n\\to\\infty)$$\n\n它没有说某一组试验一定会到达 $p$，只是说偏离 $p$ 很远的可能性可以小到任意程度。',
      },
    },
    {
      id: 'variance',
      title: { en: 'Step 1: the mean wobbles less', zh: '第一步：平均值的波动变小' },
      body: {
        en: 'From the binomial chapter, the number of successes has variance $np(1-p)$. Dividing by $n$ divides the variance by $n^2$:\n\n$$D(\\bar X_n)=\\frac{np(1-p)}{n^2}=\\frac{p(1-p)}{n}$$\n\nSo the typical distance from $p$ is $\\sqrt{p(1-p)/n}$, the dashed funnel on the board ($\\pm2$ of it).',
        zh: '由二项分布一章，成功次数的方差是 $np(1-p)$。除以 $n$，方差就除以 $n^2$：\n\n$$D(\\bar X_n)=\\frac{np(1-p)}{n^2}=\\frac{p(1-p)}{n}$$\n\n所以与 $p$ 的典型距离是 $\\sqrt{p(1-p)/n}$，画板上的虚线漏斗就是它的 $\\pm2$ 倍。',
      },
    },
    {
      id: 'chebyshev',
      title: { en: "Step 2: Chebyshev's inequality", zh: '第二步：切比雪夫不等式' },
      body: {
        en: 'The variance is the average of $(\\bar X_n-p)^2$ over all outcomes. Throw away every outcome within $\\varepsilon$ of $p$; each remaining one contributes at least $\\varepsilon^2$. So\n\n$$\\frac{p(1-p)}{n}=D(\\bar X_n)\\ge\\varepsilon^2\\cdot P\\big(|\\bar X_n-p|\\ge\\varepsilon\\big)$$\n\nwhich rearranges to\n\n$$P\\big(|\\bar X_n-p|\\ge\\varepsilon\\big)\\le\\frac{p(1-p)}{n\\varepsilon^2}\\to0$$\n\nThat is the whole proof. The board compares the bound with what $1000$ simulated runs actually do: the bound always holds and is usually generous.',
        zh: '方差是 $(\\bar X_n-p)^2$ 对所有结果的平均。把离 $p$ 不到 $\\varepsilon$ 的结果都扔掉，剩下的每个结果至少贡献 $\\varepsilon^2$，所以\n\n$$\\frac{p(1-p)}{n}=D(\\bar X_n)\\ge\\varepsilon^2\\cdot P\\big(|\\bar X_n-p|\\ge\\varepsilon\\big)$$\n\n整理得\n\n$$P\\big(|\\bar X_n-p|\\ge\\varepsilon\\big)\\le\\frac{p(1-p)}{n\\varepsilon^2}\\to0$$\n\n证明就这么多。画板把这个上界和 $1000$ 组模拟的实际结果比较：上界始终成立，而且通常很宽松。',
      },
    },
    {
      id: 'fallacy',
      title: { en: "No memory needed: the gambler's fallacy", zh: '不需要记忆：赌徒谬误' },
      body: {
        en: 'After five tails, heads is no more likely; the coin does not compensate. The share still settles because old surprises are **diluted**, not corrected: $5$ extra tails are a large share of $10$ tosses and a negligible share of $10\\,000$. The difference between heads and tails typically grows like $\\sqrt n$, while the share converges.\n\nThe runs on the board are a recorded pseudo-random simulation with a fixed seed, so every visitor sees the same three runs and the tests can re-run them.',
        zh: '连续五次反面之后，下一次正面的概率并不会变大，硬币不会"找补"。比例之所以稳定，是因为早先的偏差被**稀释**了，而不是被纠正了：多出来的 $5$ 次反面在 $10$ 次里占很大比例，在 $10\\,000$ 次里几乎可以忽略。正反面次数之差通常还会按 $\\sqrt n$ 增长，但比例却收敛了。\n\n画板上的几组试验是用固定种子生成的伪随机模拟记录，所以每个人看到的都是同样三条线，测试也能重新跑一遍核对。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A fair coin has landed tails $5$ times in a row. What is the chance the next toss is heads?',
        zh: '均匀硬币连续 $5$ 次反面，下一次是正面的概率是多少？',
      },
      choices: [
        { en: '$\\tfrac12$', zh: '$\\tfrac12$' },
        { en: 'More than $\\tfrac12$', zh: '大于 $\\tfrac12$' },
        { en: 'Less than $\\tfrac12$', zh: '小于 $\\tfrac12$' },
        { en: '$\\tfrac1{32}$', zh: '$\\tfrac1{32}$' },
      ],
      answer: 0,
      explanation: {
        en: 'Tosses are independent. The law works by dilution, not by compensation.',
        zh: '各次抛掷相互独立。大数定律靠的是稀释，不是补偿。',
      },
    },
    {
      question: {
        en: 'To halve the typical error of a sample proportion, the sample size must be:',
        zh: '要让样本比例的典型误差减半，样本量需要：',
      },
      choices: [
        { en: 'Multiplied by $4$', zh: '变成 $4$ 倍' },
        { en: 'Doubled', zh: '变成 $2$ 倍' },
        { en: 'Halved', zh: '减半' },
        { en: 'Multiplied by $10$', zh: '变成 $10$ 倍' },
      ],
      answer: 0,
      explanation: {
        en: 'The typical error is $\\sqrt{p(1-p)/n}$, which halves when $n$ is multiplied by $4$.',
        zh: '典型误差是 $\\sqrt{p(1-p)/n}$，$n$ 变成 $4$ 倍时它才减半。',
      },
    },
    {
      question: {
        en: 'For a fair coin, $n=500$ and $\\varepsilon=0.05$, what does Chebyshev\'s inequality guarantee?',
        zh: '均匀硬币，$n=500$，$\\varepsilon=0.05$，切比雪夫不等式能保证什么？',
      },
      choices: [
        { en: '$P(|\\bar X_n-\\tfrac12|\\ge0.05)\\le0.2$', zh: '$P(|\\bar X_n-\\tfrac12|\\ge0.05)\\le0.2$' },
        { en: '$P(|\\bar X_n-\\tfrac12|\\ge0.05)=0.2$', zh: '$P(|\\bar X_n-\\tfrac12|\\ge0.05)=0.2$' },
        { en: '$\\bar X_n=\\tfrac12$', zh: '$\\bar X_n=\\tfrac12$' },
        { en: 'Nothing, $n$ is too small', zh: '什么也保证不了，$n$ 太小' },
      ],
      answer: 0,
      explanation: {
        en: '$\\frac{0.25}{500\\times0.0025}=0.2$. It is an upper bound; the simulation shows the real share is about $2.5\\%$.',
        zh: '$\\frac{0.25}{500\\times0.0025}=0.2$。这是上界，模拟显示实际比例约为 $2.5\\%$。',
      },
    },
  ],
  resultTex: 'P(|\\bar X_n - p| \\ge \\varepsilon) \\to 0',
  related: ['binomial-distribution', 'normal-distribution'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Plot the running share of heads for three runs of 1000 coin tosses on a log scale of n: they swing wildly at first and then squeeze into a funnel around 1/2 that narrows like 1/√n; label the Chebyshev bound p(1 − p)/(nε²).',
    zh: '在对数刻度的 n 轴上画出三组 1000 次抛硬币的正面比例：起初大起大落，随后被挤进围绕 1/2、按 1/√n 收窄的漏斗；标出切比雪夫上界 p(1 − p)/(nε²)。',
  },
};
