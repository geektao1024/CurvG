import type { LibraryScene } from '../types';

/**
 * 16:9 clip for choosing 2 letters from {A, B, C}.
 * Phase times match scripts/library-scenes/permutations_vs_combinations.py.
 * The page seeks the file; it does not replace the file with a diagram.
 */
const permutationsVsCombinations: LibraryScene = {
  slug: 'permutations-vs-combinations',
  publication: 'public',
  primaryCategoryId: 'numbers-structure',
  difficulty: 'intro',
  evidence: 'verified',
  durationSeconds: 17.9,
  video: {
    src: '/videos/library/permutations-vs-combinations.mp4',
    poster: '/videos/library/permutations-vs-combinations-poster.jpg',
  },
  title: {
    en: 'Order, then forget the order',
    zh: '先数顺序，再把顺序收回去',
  },
  question: {
    en: 'From A, B, and C, is AB a different choice from BA?',
    zh: '从 A、B、C 里挑两个，AB 和 BA 算两件事情吗？',
  },
  hook: {
    en: 'Pick a first letter, then a second one from what remains. Six ordered pairs appear. Fold each pair with its reverse, and three piles are left.',
    zh: '先挑一个字母，再从剩下的里挑第二个。六种有顺序的结果都在。把互为颠倒的两张叠在一起，剩下三叠。',
  },
  payoff: {
    en: 'When order counts, there are P(3, 2) = 6 permutations. When it does not, there are C(3, 2) = 3 combinations, because each pile was counted 2! times.',
    zh: '顺序要算，就是排列，P(3, 2) = 6。顺序不算，就是组合，C(3, 2) = 3。每一叠都被数了 2! 次。',
  },
  equations: [
    'P(3,2)=\\dfrac{3!}{(3-2)!}=6',
    'C(3,2)=\\dfrac{3!}{2!\\,1!}=3',
    'C(3,2)=\\dfrac{P(3,2)}{2!}',
  ],
  prompt: {
    en: 'Animate choosing 2 letters from A, B, and C. Grow a tree: first letter, then second letter. Show the six ordered leaves AB, AC, BA, BC, CA, CB and the value P(3,2)=6. Then dim each reverse leaf so only {A,B}, {A,C}, and {B,C} remain, and show C(3,2)=P(3,2)/2!. Keep the background light and the drawing in one indigo.',
    zh: '演示从 A、B、C 里选 2 个。先长出一棵树：第一个字母，再从剩下的里选第二个。列出六片有序叶子 AB、AC、BA、BC、CA、CB，并写出 P(3,2)=6。然后把颠倒的那一片变淡，只留下 {A,B}、{A,C}、{B,C}，并写出 C(3,2)=P(3,2)/2!。背景用浅色，线条只用一种靛蓝。',
  },
  phases: [
    {
      name: { en: 'The set', zh: '这三张' },
      start: 0,
      end: 2.7,
      description: {
        en: 'The question is on screen, then the set {A, B, C}. Nothing has been chosen yet.',
        zh: '先出问题，再放出集合 {A, B, C}。这时还没有开始挑。',
      },
    },
    {
      name: { en: 'The tree', zh: '长出树' },
      start: 2.7,
      end: 6.5,
      description: {
        en: 'A first letter, then a second letter from what remains. Six leaves are drawn, still uncounted.',
        zh: '先选第一个字母，再从剩下的里选第二个。六片叶子画出来，还没计数。',
      },
    },
    {
      name: { en: 'Six orders', zh: '六种顺序' },
      start: 6.5,
      end: 10.6,
      description: {
        en: 'Every leaf is an order. The count is 6, and P(3, 2) = 3! / 1! = 6 is written.',
        zh: '每一片叶子都是一种顺序。计数是 6，并写出 P(3, 2) = 3! / 1! = 6。',
      },
    },
    {
      name: { en: 'Fold the reverses', zh: '把颠倒收起来' },
      start: 10.6,
      end: 14.2,
      description: {
        en: 'BA, CA, and CB fade. AB, AC, and BC fill in. The count becomes 3, and C(3, 2) = 6 / 2! = 3 is written.',
        zh: 'BA、CA、CB 变淡。AB、AC、BC 填成实心。计数变成 3，并写出 C(3, 2) = 6 / 2! = 3。',
      },
    },
    {
      name: { en: 'Why divide by 2!', zh: '为什么再除以 2!' },
      start: 14.2,
      end: 17.9,
      description: {
        en: 'The last line stays up: each pile was counted 2! times.',
        zh: '最后一行留在画面上：每一叠都被数了 2! 次。',
      },
    },
  ],
  layout: `            { A, B, C }
           /     |     \\
          A      B      C
         / \\    / \\    / \\
        B   C  A   C  A   B
       AB  AC BA  BC CA  CB

   keep AB, AC, BC
   dim  BA, CA, CB`,
  areas: [
    {
      area: { en: 'Top', zh: '上方' },
      content: {
        en: 'The three letters being chosen from.',
        zh: '被挑选的三个字母。',
      },
      notes: {
        en: 'They stay put for the whole explanation.',
        zh: '整段说明里都不挪走。',
      },
    },
    {
      area: { en: 'Middle', zh: '中间' },
      content: {
        en: 'A tree: first pick, then second pick.',
        zh: '一棵树：先选第一个，再选第二个。',
      },
      notes: {
        en: 'A letter is not offered again on its own branch.',
        zh: '同一根树枝上，字母不重复出现。',
      },
    },
    {
      area: { en: 'Leaves', zh: '叶子' },
      content: {
        en: 'Six ordered pairs, then three surviving piles.',
        zh: '六对有顺序的结果，再收成三叠。',
      },
      notes: {
        en: 'The reverse of a pair fades. It is not repainted in another hue.',
        zh: '颠倒的那一对变淡，不用另一种颜色重画。',
      },
    },
    {
      area: { en: 'Bottom', zh: '下方' },
      content: {
        en: 'P(3, 2) and C(3, 2), then the division by 2!.',
        zh: 'P(3, 2) 和 C(3, 2)，最后是再除以 2!。',
      },
      notes: {
        en: 'The formulas appear only after the counts are visible.',
        zh: '数字先出现，公式后出现。',
      },
    },
  ],
  dependencies: [
    {
      en: 'Manim Community 0.21, 1920×1080, 30 fps. Formulas in the file are text, because the render machine has no TeX install. The page sets the same identities with KaTeX.',
      zh: 'Manim Community 0.21，1920×1080，30 帧。成片里的公式是文字，因为渲染这台机器没有装 TeX。这一页用 KaTeX 排同一组式子。',
    },
  ],
  onScreen: [
    {
      en: 'Letters A, B, and C.',
      zh: '字母 A、B、C。',
    },
    {
      en: 'A two-level tree and the six ordered leaves.',
      zh: '两层树，以及六片有序的叶子。',
    },
    {
      en: 'The count falling from 6 to 3, then both formulas.',
      zh: '计数从 6 收到 3，然后两条公式。',
    },
  ],
  absent: [
    {
      en: 'No second example, such as choosing 3 from 5. One small case is the whole clip.',
      zh: '没有第二个例子，比如从 5 个里选 3 个。整段成片只做这一个小例子。',
    },
    {
      en: 'The clip does not speak. The formulas are written, not narrated.',
      zh: '成片没有旁白。公式是写出来的，不是念出来的。',
    },
  ],
};

export default permutationsVsCombinations;
