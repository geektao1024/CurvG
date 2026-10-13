import { pick, type Lab } from '../types';

// Triangle ABC (A draggable, B and C fixed) and its image under the
// homothety with centre O and ratio k: X' = O + k (X − O).
const img = (x: string, y: string) =>
  [`ox + k * (${x} - ox)`, `oy + k * (${y} - oy)`] as [string, string];
// Twice the signed area of a triangle, from its vertices.
const cross = (p: [string, string], q: [string, string], r: [string, string]) =>
  `((${q[0]}) - (${p[0]})) * ((${r[1]}) - (${p[1]})) - ((${r[0]}) - (${p[0]})) * ((${q[1]}) - (${p[1]}))`;
// Angle at the first vertex, in degrees.
const angle = (p: [string, string], q: [string, string], r: [string, string]) => {
  const u = `atan2((${q[1]}) - (${p[1]}), (${q[0]}) - (${p[0]}))`;
  const v = `atan2((${r[1]}) - (${p[1]}), (${r[0]}) - (${p[0]}))`;
  return `abs(atan2(sin(${v} - ${u}), cos(${v} - ${u}))) * 180 / pi`;
};

const A: [string, string] = ['ax', 'ay'];
const B: [string, string] = ['-3', '-1'];
const C: [string, string] = ['0', '-1'];
const A2: [string, string] = ['a2x', 'a2y'];
const B2: [string, string] = ['b2x', 'b2y'];
const C2: [string, string] = ['c2x', 'c2y'];

export const similarityHomothety: Lab = {
  slug: 'similarity-homothety',
  publication: 'public',
  primaryCategoryId: 'visual-proofs',
  levels: ['middle', 'high'],
  chapterTitle: { en: 'Similarity & homothety', zh: '相似与位似' },
  title: {
    en: 'Similar triangles and homothety: lengths times k, area times k²',
    zh: '相似与位似：边长乘 k，面积乘 k²',
  },
  question: {
    en: 'When a triangle is scaled from a point, why do its angles stay put, and why does the area grow by k² rather than k?',
    zh: '从一点出发把三角形放大，为什么角不变？面积为什么变成 k² 倍而不是 k 倍？',
  },
  summary: {
    en: 'Pick a centre O and a ratio k. Every vertex slides along its ray from O to k times the distance. The board measures the new sides, angles and area: each side ratio is |k|, each angle is unchanged and the area ratio is k².',
    zh: '选一个位似中心 O 和比 k，每个顶点沿着从 O 出发的射线移到 k 倍距离处。画板实时量出新三角形的边、角和面积：每条边之比都是 |k|，每个角都不变，面积之比是 k²。',
  },
  keyPoints: [
    { en: 'Homothety (dilation)', zh: '位似变换' },
    { en: 'Similar triangles', zh: '相似三角形' },
    { en: 'Ratio of similitude', zh: '相似比' },
    { en: 'Area ratio k²', zh: '面积比等于相似比的平方' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-8, 8], y: [-5.5, 5.5], grid: true },
      params: [
        {
          id: 'k',
          label: 'k',
          min: -1.5,
          max: 2.5,
          step: 0.05,
          value: 2,
          bands: [
            { from: 1, to: 1, label: t('congruent', '全等'), color: 'green' },
            { from: -1, to: -1, label: t('point symmetry', '中心对称'), color: 'purple' },
          ],
        },
        { id: 'ox', label: 'O_x', min: -7, max: 7, step: 0.1, value: -5 },
        { id: 'oy', label: 'O_y', min: -5, max: 5, step: 0.1, value: -2 },
        { id: 'ax', label: 'A_x', min: -7, max: 7, step: 0.1, value: -2 },
        { id: 'ay', label: 'A_y', min: -5, max: 5, step: 0.1, value: 1 },
      ],
      scalars: [
        { id: 'a2x', expr: img('ax', 'ay')[0] },
        { id: 'a2y', expr: img('ax', 'ay')[1] },
        { id: 'b2x', expr: img(...B)[0] },
        { id: 'b2y', expr: img(...B)[1] },
        { id: 'c2x', expr: img(...C)[0] },
        { id: 'c2y', expr: img(...C)[1] },
        // Everything below is measured from the six vertices.
        { id: 'AB', expr: `hypot(${A[0]} - (${B[0]}), ${A[1]} - (${B[1]}))` },
        { id: 'BC', expr: `hypot(${B[0]} - (${C[0]}), ${B[1]} - (${C[1]}))` },
        { id: 'CA', expr: `hypot(${C[0]} - (${A[0]}), ${C[1]} - (${A[1]}))` },
        { id: 'A2B2', expr: 'hypot(a2x - b2x, a2y - b2y)' },
        { id: 'B2C2', expr: 'hypot(b2x - c2x, b2y - c2y)' },
        { id: 'C2A2', expr: 'hypot(c2x - a2x, c2y - a2y)' },
        { id: 'S', expr: `abs(${cross(A, B, C)}) / 2` },
        { id: 'S2', expr: `abs(${cross(A2, B2, C2)}) / 2` },
        { id: 'flat', expr: 'S < 0.01' },
      ],
      objects: [
        // Rays from the centre through each vertex to its image.
        ...[
          [A, A2],
          [B, B2],
          [C, C2],
        ].flatMap(([p, q]) => [
          { type: 'segment' as const, from: ['ox', 'oy'] as [string, string], to: p, color: 'muted' as const, dashed: true, width: 1.2 },
          { type: 'segment' as const, from: ['ox', 'oy'] as [string, string], to: q, color: 'muted' as const, dashed: true, width: 1.2 },
        ]),
        { type: 'polygon', points: [A, B, C], color: 'blue', opacity: 0.2, width: 2.5 },
        { type: 'polygon', points: [A2, B2, C2], color: 'amber', opacity: 0.2, width: 2.5, visible: 'abs(k) > 0.01' },
        { type: 'point', at: B, color: 'blue', size: 5, label: 'B' },
        { type: 'point', at: C, color: 'blue', size: 5, label: 'C' },
        { type: 'point', at: A2, color: 'amber', size: 5, label: "A'" },
        { type: 'point', at: B2, color: 'amber', size: 5, label: "B'" },
        { type: 'point', at: C2, color: 'amber', size: 5, label: "C'" },
        { type: 'point', at: A, color: 'blue', size: 7, label: 'A', drag: { x: 'ax', y: 'ay' } },
        { type: 'point', at: ['ox', 'oy'], color: 'red', size: 7, label: 'O', drag: { x: 'ox', y: 'oy' } },
      ],
      readouts: [
        { label: "|A'B'| / |AB|", expr: 'AB > 0 ? A2B2 / AB : 0 / 0', digits: 3 },
        { label: "|B'C'| / |BC|", expr: 'B2C2 / BC', digits: 3 },
        { label: "|C'A'| / |CA|", expr: 'CA > 0 ? C2A2 / CA : 0 / 0', digits: 3 },
        { label: '\\angle A', expr: `flat ? 0 / 0 : ${angle(A, B, C)}`, digits: 1 },
        { label: "\\angle A'", expr: `flat + (abs(k) < 0.01) ? 0 / 0 : ${angle(A2, B2, C2)}`, digits: 1 },
        { label: "S_{A'B'C'} / S_{ABC}", expr: 'flat ? 0 / 0 : S2 / S', digits: 3, highlight: true },
        { label: 'k^2', expr: 'k^2', digits: 3 },
        {
          kind: 'status',
          label: t("A'B'C' is", "A'B'C' 的方向"),
          expr: 'k > 0',
          ok: t('same way round', '与原图同向'),
          bad: t('turned through O', '绕 O 翻转到对面'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Double every distance from O', zh: '把到 O 的距离都变成 2 倍' },
      body: {
        en: 'With $k=2$, each vertex moves along its ray from $O$ to twice the distance: $A\'=O+2(A-O)$. The board measures all three new sides, and each ratio comes out $2$. The angles at $A$ and at $A\'$ are both $71.6^\\circ$.',
        zh: '$k=2$ 时，每个顶点沿着从 $O$ 出发的射线移到 2 倍距离处：$A\'=O+2(A-O)$。画板量出新三角形的三条边，三个比值都是 $2$。$A$ 处和 $A\'$ 处的角都是 $71.6^\\circ$。',
      },
      set: { k: 2, ox: -5, oy: -2, ax: -2, ay: 1 },
    },
    {
      title: { en: 'Area grows by k²', zh: '面积变成 k² 倍' },
      body: {
        en: 'The lengths doubled, but the area ratio reads $4$, not $2$: base and height both doubled. At $k=1.5$ the sides grow by $1.5$ and the area by $2.25$.',
        zh: '边长变成 2 倍，面积之比却是 $4$ 而不是 $2$：底和高都变成了 2 倍。$k=1.5$ 时边长是 $1.5$ 倍，面积是 $2.25$ 倍。',
      },
      set: { k: 1.5, ox: -5, oy: -2, ax: -2, ay: 1 },
    },
    {
      title: { en: 'The centre can be anywhere', zh: '中心放哪里都行' },
      body: {
        en: 'Drag $O$ inside the triangle, or far away. The image moves, but the side ratios stay $1.5$ and the angles stay equal: where $O$ sits only decides where the copy lands, not its shape.',
        zh: '把 $O$ 拖到三角形里面，或者拖得很远。像的位置变了，但边之比仍是 $1.5$，角仍然相等：$O$ 放在哪里只决定复制品落在哪儿，不影响形状。',
      },
      set: { k: 1.5, ox: -1.5, oy: -0.3, ax: -2, ay: 1 },
    },
    {
      title: { en: 'Negative k: through the centre', zh: 'k 为负：穿过中心' },
      body: {
        en: 'At $k=-1$ each vertex goes through $O$ to the same distance on the other side. The copy is turned half a revolution but is congruent: ratios $1$, area ratio $1$. Any negative $k$ does the same with scaling $|k|$.',
        zh: '$k=-1$ 时，每个顶点穿过 $O$ 到对面同样远的地方。复制品转了半圈，但和原图全等：边之比为 $1$，面积之比为 $1$。其他负的 $k$ 也一样翻到对面，只是再缩放 $|k|$ 倍。',
      },
      set: { k: -1, ox: -1.5, oy: -0.3, ax: -2, ay: 1 },
    },
  ],
  sections: [
    {
      id: 'definition',
      title: { en: 'Homothety', zh: '位似变换' },
      body: {
        en: 'Fix a point $O$ and a number $k\\ne0$. The **homothety** with centre $O$ and ratio $k$ sends each point $X$ to\n\n$$X\'=O+k\\,(X-O)$$\n\nso $X\'$ lies on line $OX$ and $|OX\'|=|k|\\,|OX|$. For $k<0$ it lands on the other side of $O$.',
        zh: '取定一点 $O$ 和一个数 $k\\ne0$。以 $O$ 为中心、$k$ 为比的**位似变换**把每个点 $X$ 变到\n\n$$X\'=O+k\\,(X-O)$$\n\n所以 $X\'$ 在直线 $OX$ 上，且 $|OX\'|=|k|\\,|OX|$。$k<0$ 时它落在 $O$ 的另一侧。',
      },
    },
    {
      id: 'sides',
      title: { en: 'Why every side scales by |k|', zh: '为什么每条边都乘 |k|' },
      body: {
        en: 'Subtract the definition for two points:\n\n$$A\'-B\'=\\big(O+k(A-O)\\big)-\\big(O+k(B-O)\\big)=k\\,(A-B)$$\n\n$O$ cancels. So $A\'B\'$ is parallel to $AB$ and $|k|$ times as long, and the same holds for every pair of points. This is the whole reason the side ratios agree and do not depend on where $O$ is.',
        zh: '把两个点的定义式相减：\n\n$$A\'-B\'=\\big(O+k(A-O)\\big)-\\big(O+k(B-O)\\big)=k\\,(A-B)$$\n\n$O$ 被消掉了。所以 $A\'B\'$ 与 $AB$ 平行，长度是 $|k|$ 倍，任意两点都如此。这就是三条边之比相同、而且与 $O$ 的位置无关的全部原因。',
      },
    },
    {
      id: 'angles',
      title: { en: 'Why angles stay the same', zh: '为什么角不变' },
      body: {
        en: 'Each side of the image is parallel to the matching side of the original. The angle at $A\'$ is made by two lines parallel to the two lines at $A$, and two pairs of parallel lines meet at equal angles (corresponding angles). So the triangles are **similar**: equal angles, proportional sides.\n\nThe converse is what makes the idea general: any two similar triangles can be moved by a rigid motion until they are in homothetic position, so everything proved here holds for all similar figures.',
        zh: '像的每条边都与原图对应的边平行。$A\'$ 处的角由两条分别平行于 $A$ 处两边的直线构成，两组平行线相交成的角相等（同位角）。所以两个三角形**相似**：角对应相等，边对应成比例。\n\n反过来同样成立，这让结论具有一般性：任意两个相似三角形，经过平移、旋转（必要时翻折）总能摆成位似的位置，所以这里证明的结论对一切相似图形都成立。',
      },
    },
    {
      id: 'area',
      title: { en: 'Why area scales by k²', zh: '为什么面积乘 k²' },
      body: {
        en: 'Area is $\\tfrac12\\cdot\\text{base}\\cdot\\text{height}$. The base is a length, so it scales by $|k|$. The height is the distance from a vertex to the opposite side, also a length, so it scales by $|k|$ too. The product scales by $k^2$:\n\n$$\\frac{S\'}{S}=\\frac{\\tfrac12\\,(|k|\\,b)(|k|\\,h)}{\\tfrac12\\,bh}=k^2$$\n\nFor the same reason volume scales by $|k|^3$: three lengths multiply.',
        zh: '面积是 $\\tfrac12\\cdot\\text{底}\\cdot\\text{高}$。底是长度，乘 $|k|$；高是顶点到对边的距离，也是长度，也乘 $|k|$。两者相乘就乘了 $k^2$：\n\n$$\\frac{S\'}{S}=\\frac{\\tfrac12\\,(|k|\\,b)(|k|\\,h)}{\\tfrac12\\,bh}=k^2$$\n\n同样的道理，体积由三个长度相乘，所以乘 $|k|^3$。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'Two similar triangles have sides in ratio $3:5$. What is the ratio of their areas?',
        zh: '两个相似三角形的边长之比是 $3:5$，面积之比是多少？',
      },
      choices: [
        { en: '$9:25$', zh: '$9:25$' },
        { en: '$3:5$', zh: '$3:5$' },
        { en: '$6:10$', zh: '$6:10$' },
        { en: '$27:125$', zh: '$27:125$' },
      ],
      answer: 0,
      explanation: {
        en: 'Area ratio is the square of the length ratio: $3^2:5^2$. $27:125$ would be the volume ratio of similar solids.',
        zh: '面积比是边长比的平方：$3^2:5^2$。$27:125$ 是相似立体的体积比。',
      },
    },
    {
      question: {
        en: 'Under a homothety with centre $O$, why is $A\'B\'$ parallel to $AB$?',
        zh: '位似变换下，为什么 $A\'B\'$ 平行于 $AB$？',
      },
      choices: [
        { en: "$A'-B'=k(A-B)$: $O$ cancels", zh: "$A'-B'=k(A-B)$，$O$ 被消掉" },
        { en: 'Because the triangles are congruent', zh: '因为两个三角形全等' },
        { en: 'Only when $O$ is inside the triangle', zh: '只有 $O$ 在三角形内部时才平行' },
        { en: 'Only when $k>1$', zh: '只有 $k>1$ 时才平行' },
      ],
      answer: 0,
      explanation: {
        en: 'Subtracting the two images leaves $k$ times the original vector, whatever $O$ and $k$ are.',
        zh: '两个像相减得到原向量的 $k$ 倍，与 $O$、$k$ 取什么值无关。',
      },
    },
    {
      question: {
        en: 'A map is drawn at scale $1:1000$. A field covers $12\\,\\text{cm}^2$ on the map. How large is it in reality?',
        zh: '一张地图的比例尺是 $1:1000$，图上一块地的面积是 $12\\,\\text{cm}^2$，实际面积是多少？',
      },
      choices: [
        { en: '$1200\\,\\text{m}^2$', zh: '$1200\\,\\text{m}^2$' },
        { en: '$12\\,\\text{m}^2$', zh: '$12\\,\\text{m}^2$' },
        { en: '$120\\,\\text{m}^2$', zh: '$120\\,\\text{m}^2$' },
        { en: '$12000\\,\\text{m}^2$', zh: '$12000\\,\\text{m}^2$' },
      ],
      answer: 0,
      explanation: {
        en: 'Lengths scale by $1000$, so areas by $10^6$: $12\\times10^6\\,\\text{cm}^2=1200\\,\\text{m}^2$.',
        zh: '长度放大 $1000$ 倍，面积放大 $10^6$ 倍：$12\\times10^6\\,\\text{cm}^2=1200\\,\\text{m}^2$。',
      },
    },
  ],
  resultTex: "\\dfrac{S'}{S} = k^2",
  related: ['inscribed-angle-theorem', 'pythagorean-theorem-rearrangement'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Show a homothety: a triangle is scaled from a centre O by k = 2, every vertex sliding along its ray; label the side ratios 2 and the area ratio 4, then flip to k = −1 to show the copy turned through O.',
    zh: '演示位似变换：三角形以 O 为中心按 k = 2 放大，每个顶点沿射线滑动；标出边之比 2、面积之比 4，再切换到 k = −1，展示穿过 O 翻到对面的全等图形。',
  },
};
