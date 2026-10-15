import { pick, type Lab } from '../types';

const MAX = 7;
const range = (n: number) => Array.from({ length: n }, (_, i) => i);

// N(N−1)…(N−K+1): one factor per slot, the choices left for that slot.
const falling = (N: string, K: string) =>
  range(MAX)
    .map((i) => `(${i} < ${K} ? max(${N} - ${i}, 0) : 1)`)
    .join(' * ');
// K! = the number of orders K chosen things can be put in.
const factorial = (K: string) =>
  range(MAX)
    .map((i) => `(${i} < ${K} ? ${i + 1} : 1)`)
    .join(' * ');

// Pascal's triangle built by addition only, so the board can compare it with
// the multiplicative count.
const PASCAL: number[][] = [[1]];
for (let r = 1; r <= MAX; r += 1) {
  const prev = PASCAL[r - 1];
  PASCAL.push(range(r + 1).map((j) => (prev[j - 1] ?? 0) + (prev[j] ?? 0)));
}
// Cell (r, j) of the triangle, as a board expression and as a number.
const cellX = (r: string, j: string) => `3.2 + ((${j}) - (${r}) / 2) * 0.95`;
const cellY = (r: string) => `3.4 - (${r})`;
const cellAt = (r: number, j: number): [number, number] => [
  3.2 + (j - r / 2) * 0.95,
  3.4 - r,
];

export const permutationsCombinations: Lab = {
  slug: 'permutations-combinations',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Permutations & combinations', zh: '排列与组合' },
  title: {
    en: 'Permutations and combinations: count the orders, then divide them out',
    zh: '排列与组合：先按顺序数，再除掉重复的顺序',
  },
  question: {
    en: 'Why is the number of ways to choose k things from n equal to n(n−1)…(n−k+1) divided by k!, and why does Pascal’s triangle give the same numbers by adding?',
    zh: '从 n 个里选 k 个，为什么是 n(n−1)…(n−k+1) 再除以 k!？杨辉三角只用加法，为什么得到的是同一批数？',
  },
  summary: {
    en: 'Fill k slots one by one and multiply the choices left at each step: that counts ordered picks. Every unordered group was counted once for each of its k! orders, so divide. Pascal’s triangle reaches the same number by a different route: the last item is either in the group or not.',
    zh: '把 k 个位置一个个填满，每一步剩几种选法就乘几：这样数出的是有顺序的排法。每一组不计顺序的组合都被它的 k! 种顺序各数了一次，所以要除掉。杨辉三角走另一条路得到同一个数：最后一个元素要么选进来，要么不选。',
  },
  keyPoints: [
    { en: 'Multiplication principle', zh: '分步乘法计数原理' },
    { en: 'Permutations', zh: '排列数' },
    { en: 'Combinations', zh: '组合数' },
    { en: "Pascal's triangle", zh: '杨辉三角' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-7.5, 7.5], y: [-5, 4.4], grid: false, axes: false },
      params: [
        { id: 'n', label: 'n', min: 1, max: MAX, step: 1, value: 5 },
        { id: 'k', label: 'k', min: 0, max: MAX, step: 1, value: 3 },
      ],
      scalars: [
        ...range(MAX).map((i) => ({ id: `s${i + 1}`, expr: `max(n - ${i}, 0)` })),
        { id: 'P', expr: falling('n', 'k') },
        { id: 'F', expr: factorial('k') },
        { id: 'C', expr: 'P / F' },
        // The two cells above (n, k) in the triangle, counted the same way.
        { id: 'Pin', expr: falling('n - 1', 'k - 1') },
        { id: 'Fin', expr: factorial('k - 1') },
        { id: 'Cin', expr: '(k >= 1) * Pin / Fin' },
        { id: 'Cout', expr: `(${falling('n - 1', 'k')}) / F` },
        { id: 'fits', expr: 'k <= n' },
        // Choosing who stays out: the same count with n − k in place of k.
        { id: 'Psym', expr: falling('n', 'n - k') },
        { id: 'Fsym', expr: factorial('n - k') },
      ],
      objects: [
        // Left: the slots, then the division.
        { type: 'text', at: [-7, 3.4], text: t('choices per slot', '每个位置的选法'), color: 'muted', anchor: 'start' },
        ...range(MAX).flatMap((i) => [
          {
            type: 'text' as const,
            at: [-6.6 + i * 0.95, 2.4] as [number, number],
            text: `{s${i + 1}}`,
            color: 'blue' as const,
            visible: `k >= ${i + 1}`,
          },
          ...(i > 0
            ? [
                {
                  type: 'text' as const,
                  at: [-6.6 + (i - 0.5) * 0.95, 2.4] as [number, number],
                  text: '×',
                  color: 'muted' as const,
                  visible: `k >= ${i + 1}`,
                },
              ]
            : []),
        ]),
        { type: 'text', at: [-6.6, 2.4], text: t('choose nothing: 1 way', '一个都不选：1 种'), color: 'blue', anchor: 'start', visible: 'k < 0.5' },
        { type: 'text', at: [-7, 1.3], text: t('= {P} ordered picks', '= {P} 种有序排法'), color: 'ink', anchor: 'start' },
        { type: 'text', at: [-7, 0.2], text: t('each group counted {F} times', '每组被数了 {F} 次'), color: 'muted', anchor: 'start', visible: 'fits' },
        { type: 'text', at: [-7, -0.9], text: t('{P} ÷ {F} = {C} groups', '{P} ÷ {F} = {C} 种组合'), color: 'amber', anchor: 'start', visible: 'fits' },
        { type: 'text', at: [-7, 0.2], text: t('k > n: the choices run out', 'k > n：选法用完了'), color: 'red', anchor: 'start', visible: '1 - fits' },
        // Right: Pascal's triangle, with (n, k) and the two cells it adds.
        { type: 'circle', center: [cellX('n', 'k'), cellY('n')], r: 0.36, fill: true, color: 'amber', opacity: 0.35, visible: 'fits' },
        { type: 'circle', center: [cellX('n - 1', 'k - 1'), cellY('n - 1')], r: 0.36, fill: true, color: 'blue', opacity: 0.25, visible: 'fits * (k >= 1)' },
        { type: 'circle', center: [cellX('n - 1', 'k'), cellY('n - 1')], r: 0.36, fill: true, color: 'green', opacity: 0.25, visible: 'fits * (k <= n - 1)' },
        ...PASCAL.flatMap((row, r) =>
          row.map((value, j) => ({
            type: 'text' as const,
            at: cellAt(r, j),
            text: String(value),
            color: 'ink' as const,
          }))
        ),
      ],
      readouts: [
        { label: 'A_n^k = n(n-1)\\cdots(n-k+1)', expr: 'P', digits: 0 },
        { label: 'k!', expr: 'F', digits: 0 },
        { label: '\\binom{n}{k}', expr: 'C', digits: 0, highlight: true },
        { label: '\\binom{n-1}{k-1} + \\binom{n-1}{k}', expr: 'Cin + Cout', digits: 0 },
        { label: '\\binom{n}{n-k}', expr: 'fits ? Psym / Fsym : 0', digits: 0 },
        {
          kind: 'status',
          label: t('k ≤ n', 'k ≤ n'),
          expr: 'fits',
          ok: t('yes: there are groups to count', '成立：有组合可数'),
          bad: t('no: no groups of that size', '不成立：选不出这么多'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Fill the slots', zh: '一个位置一个位置地填' },
      body: {
        en: 'Pick $3$ of $5$ people in order: $5$ choices for the first slot, $4$ left for the second, $3$ for the third. Each choice can follow every earlier one, so the counts multiply: $5\\times4\\times3=60$ ordered picks.',
        zh: '从 $5$ 个人里按顺序选 $3$ 个：第一个位置有 $5$ 种选法，第二个剩 $4$ 种，第三个剩 $3$ 种。每种选法都能接在前面任何一种之后，所以相乘：$5\\times4\\times3=60$ 种有序排法。',
      },
      set: { n: 5, k: 3 },
    },
    {
      title: { en: 'Divide out the orders', zh: '除掉重复的顺序' },
      body: {
        en: 'A group like $\\{A,B,C\\}$ appeared in the $60$ as $ABC$, $ACB$, $BAC$, $BCA$, $CAB$ and $CBA$: once for each of its $3!=6$ orders. Every group is counted exactly $6$ times, so there are $60\\div6=10$ groups.',
        zh: '像 $\\{A,B,C\\}$ 这样一组，在 $60$ 种排法里出现成 $ABC$、$ACB$、$BAC$、$BCA$、$CAB$、$CBA$，它的 $3!=6$ 种顺序各一次。每一组都恰好被数了 $6$ 次，所以组合数是 $60\\div6=10$。',
      },
      set: { n: 5, k: 3 },
    },
    {
      title: { en: 'The triangle adds instead', zh: '杨辉三角用加法' },
      body: {
        en: 'Look at the last person. Groups that include them need $2$ more from the other $4$: $\\binom42=6$ (blue). Groups that leave them out take all $3$ from the other $4$: $\\binom43=4$ (green). $6+4=10$, the highlighted cell. The triangle is built from this rule alone, with no multiplication.',
        zh: '盯住最后一个人。含他的组合还要从其余 $4$ 人里再选 $2$ 个：$\\binom42=6$（蓝）。不含他的组合要从其余 $4$ 人里选满 $3$ 个：$\\binom43=4$（绿）。$6+4=10$，正是高亮的那一格。整个三角形只用这条加法规则搭出来，没有用到乘法。',
      },
      set: { n: 5, k: 3 },
    },
    {
      title: { en: 'Choosing in = choosing out', zh: '选进来 = 剩下来' },
      body: {
        en: 'Choosing $2$ of $7$ to go is the same as choosing the $5$ who stay: $\\binom72=\\binom75=21$. That is why every row of the triangle reads the same backwards.',
        zh: '从 $7$ 人里选 $2$ 个出发，等于选出留下的 $5$ 个：$\\binom72=\\binom75=21$。所以三角形每一行正着读、倒着读都一样。',
      },
      set: { n: 7, k: 2 },
    },
    {
      title: { en: 'Edge cases', zh: '边界情况' },
      body: {
        en: 'Choosing $0$ things can be done in exactly one way, doing nothing, so $\\binom n0=1$ and $0!=1$. Ask for more than you have and a slot runs out of choices: a factor $0$ appears and the count is $0$.',
        zh: '一个都不选只有一种做法，就是什么都不做，所以 $\\binom n0=1$，$0!=1$。要选的比手上的多，某个位置就没得选：乘积里出现因子 $0$，结果是 $0$。',
      },
      set: { n: 4, k: 0 },
    },
  ],
  sections: [
    {
      id: 'multiplication',
      title: { en: 'The multiplication principle', zh: '分步乘法计数原理' },
      body: {
        en: 'If a task is done in steps, with $m_1$ ways for the first step and, whatever happened, $m_2$ ways for the second, then there are $m_1m_2$ ways in all: each of the $m_1$ starts branches into $m_2$. Everything in this chapter is this one rule applied carefully.',
        zh: '如果一件事分几步完成，第一步有 $m_1$ 种做法，而且不管第一步怎么做，第二步都有 $m_2$ 种，那么总共有 $m_1m_2$ 种做法：$m_1$ 种开头每种都分出 $m_2$ 个分支。本章的所有结论都只是认真地用这一条规则。',
      },
    },
    {
      id: 'permutations',
      title: { en: 'Permutations: order counts', zh: '排列：顺序算数' },
      body: {
        en: 'Fill $k$ slots from $n$ distinct things. The first slot has $n$ choices, the next $n-1$ and so on, one fewer each time:\n\n$$A_n^k=n(n-1)\\cdots(n-k+1)=\\frac{n!}{(n-k)!}$$\n\nWith $k=n$ this is $n!$, the number of ways to line up all $n$.',
        zh: '从 $n$ 个不同的元素里取出 $k$ 个填进 $k$ 个位置。第一个位置有 $n$ 种选法，下一个 $n-1$ 种，每次少一种：\n\n$$A_n^k=n(n-1)\\cdots(n-k+1)=\\frac{n!}{(n-k)!}$$\n\n$k=n$ 时就是 $n!$，把 $n$ 个元素全部排成一列的方法数。',
      },
    },
    {
      id: 'combinations',
      title: { en: 'Combinations: divide out the order', zh: '组合：把顺序除掉' },
      body: {
        en: 'Count the ordered picks in two steps: first choose the group, then put it in order. The second step has $k!$ ways whatever the group is, so by the multiplication principle\n\n$$A_n^k=\\binom nk\\cdot k!\\qquad\\Longrightarrow\\qquad\\binom nk=\\frac{n(n-1)\\cdots(n-k+1)}{k!}$$\n\nThis is why the division is exact: it undoes a multiplication.',
        zh: '把有序排法分两步来数：先选出一组，再给这一组排顺序。不管选出的是哪一组，第二步都有 $k!$ 种，所以由乘法原理\n\n$$A_n^k=\\binom nk\\cdot k!\\qquad\\Longrightarrow\\qquad\\binom nk=\\frac{n(n-1)\\cdots(n-k+1)}{k!}$$\n\n这也是为什么这个除法总能除尽：它只是把一次乘法还原回去。',
      },
    },
    {
      id: 'pascal',
      title: { en: "Pascal's rule and the row sums", zh: '杨辉三角的加法规则与行和' },
      body: {
        en: 'Single out one element. Every group of $k$ either contains it or does not, never both:\n\n$$\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}$$\n\nThe board builds the triangle from this rule and $\\binom00=1$ alone, and the highlighted cell always matches the multiplicative formula.\n\nAdding a whole row counts all subsets of $n$ things. Each element is in or out, two choices $n$ times, so the row sums to $2^n$.',
        zh: '单独拿出一个元素。每一组 $k$ 个元素要么含它，要么不含它，不会两者都是：\n\n$$\\binom nk=\\binom{n-1}{k-1}+\\binom{n-1}{k}$$\n\n画板上的三角形只用这条规则和 $\\binom00=1$ 搭出来，高亮的格子始终和乘法公式算出的一致。\n\n把一整行加起来，就是 $n$ 个元素所有子集的个数。每个元素选或不选，$n$ 次二选一，所以行和是 $2^n$。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'How many ways can a president and a secretary be chosen from $8$ people?',
        zh: '从 $8$ 人中选出一名主席和一名秘书，有多少种选法？',
      },
      choices: [
        { en: '$56$', zh: '$56$' },
        { en: '$28$', zh: '$28$' },
        { en: '$64$', zh: '$64$' },
        { en: '$16$', zh: '$16$' },
      ],
      answer: 0,
      explanation: {
        en: 'The two roles differ, so order counts: $8\\times7=56$.',
        zh: '两个职位不同，顺序算数：$8\\times7=56$。',
      },
    },
    {
      question: {
        en: 'Why do we divide by $k!$ to get $\\binom nk$?',
        zh: '求 $\\binom nk$ 时为什么要除以 $k!$？',
      },
      choices: [
        { en: 'Each group appears once for each of its $k!$ orders', zh: '每一组都按它的 $k!$ 种顺序各被数了一次' },
        { en: 'To make the answer smaller', zh: '为了让结果变小' },
        { en: 'Because there are $k!$ groups', zh: '因为一共有 $k!$ 组' },
        { en: 'Because $n$ things have $n!$ orders', zh: '因为 $n$ 个元素有 $n!$ 种顺序' },
      ],
      answer: 0,
      explanation: {
        en: 'Ordered picks $=$ groups $\\times$ orders per group, and every group has the same $k!$ orders.',
        zh: '有序排法数 $=$ 组数 $\\times$ 每组的顺序数，而每组的顺序数都是 $k!$。',
      },
    },
    {
      question: {
        en: 'What is $\\binom{10}{8}$?',
        zh: '$\\binom{10}{8}$ 等于多少？',
      },
      choices: [
        { en: '$45$', zh: '$45$' },
        { en: '$80$', zh: '$80$' },
        { en: '$90$', zh: '$90$' },
        { en: '$1814400$', zh: '$1814400$' },
      ],
      answer: 0,
      explanation: {
        en: 'Choosing $8$ to keep is choosing $2$ to drop: $\\binom{10}{2}=\\frac{10\\times9}{2}=45$.',
        zh: '选 $8$ 个留下就是选 $2$ 个去掉：$\\binom{10}{2}=\\frac{10\\times9}{2}=45$。',
      },
    },
  ],
  resultTex: '\\binom{n}{k} = \\dfrac{A_n^k}{k!}',
  related: ['binomial-distribution'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Count combinations from first principles: fill 3 slots from 5 people to get 5 × 4 × 3 = 60 ordered picks, show one group appearing in all 6 of its orders, divide to get 10, then confirm 10 = 6 + 4 in Pascal’s triangle.',
    zh: '从第一性原理数组合：从 5 人中依次填 3 个位置得到 5 × 4 × 3 = 60 种有序排法，展示同一组以 6 种顺序各出现一次，相除得到 10，再在杨辉三角里验证 10 = 6 + 4。',
  },
};

