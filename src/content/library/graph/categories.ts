import type { LibraryCategory } from '../types';

/**
 * v1 math wedge from docs/LIBRARY_PLAN.md §4.
 * `motion-systems` stays draft so it can be an additional parent later
 * without becoming a public hub before it has scenes.
 */
export const libraryCategories: readonly LibraryCategory[] = [
  {
    id: 'geometry-curves',
    publication: 'public',
    title: { en: 'Geometry & curves', zh: '几何与曲线' },
    description: {
      en: 'Parametric curves, polar curves, roulettes, spirals, conics, and proofs you can see.',
      zh: '参数曲线、极坐标、旋轮线、螺线、圆锥曲线，以及可以看见的证明。',
    },
    accentClass: 'bg-primary',
    order: 1,
  },
  {
    id: 'algebra-functions',
    publication: 'public',
    title: { en: 'Algebra & functions', zh: '代数与函数' },
    description: {
      en: 'Series, graphs, and the structure of number itself.',
      zh: '级数、函数图像，以及数本身的结构。',
    },
    accentClass: 'bg-foreground',
    order: 2,
  },
  {
    id: 'calculus',
    publication: 'public',
    title: { en: 'Calculus', zh: '微积分' },
    description: {
      en: 'Rates of change, and how change accumulates into area.',
      zh: '变化率，以及变化怎样积成面积。',
    },
    accentClass: 'bg-success',
    order: 3,
  },
  {
    id: 'waves-signals',
    publication: 'public',
    title: { en: 'Waves & signals', zh: '波与信号' },
    description: {
      en: 'Oscillation, harmonics, and curves built by stacking simpler waves.',
      zh: '振动、谐波，以及一条曲线怎样由更简单的波叠出来。',
    },
    accentClass: 'bg-primary',
    order: 4,
    additionalParentIds: ['geometry-curves'],
  },
  {
    id: 'motion-systems',
    publication: 'draft',
    title: { en: 'Motion & dynamical systems', zh: '运动与动力系统' },
    description: {
      en: 'Orbits, rolling, and escape. Additional parent only until scenes exist.',
      zh: '轨道、滚动和逃逸。在场景写出来之前，只作为兼挂父节点。',
    },
    accentClass: 'bg-foreground',
    order: 5,
  },
  {
    id: 'parametric',
    publication: 'public',
    title: { en: 'Parametric curves', zh: '参数曲线' },
    description: {
      en: 'Curves drawn by two coordinates changing with a shared parameter.',
      zh: '由同一个参数同时改写横纵坐标而画出的曲线。',
    },
    accentClass: 'bg-primary',
    order: 1,
    primaryParentId: 'geometry-curves',
  },
  {
    id: 'polar',
    publication: 'public',
    title: { en: 'Polar curves', zh: '极坐标曲线' },
    description: {
      en: 'Radius as a function of angle.',
      zh: '半径随角度变化的曲线。',
    },
    accentClass: 'bg-primary',
    order: 2,
    primaryParentId: 'geometry-curves',
  },
  {
    id: 'roulette',
    publication: 'public',
    title: { en: 'Roulettes', zh: '旋轮线' },
    description: {
      en: 'The path of a point on a circle that rolls along another curve.',
      zh: '一个圆沿着另一条曲线滚动时，圆上一点留下的轨迹。',
    },
    accentClass: 'bg-primary',
    order: 3,
    primaryParentId: 'geometry-curves',
  },
  {
    id: 'spiral',
    publication: 'public',
    title: { en: 'Spirals', zh: '螺线' },
    description: {
      en: 'Curves whose radius grows as they turn.',
      zh: '半径随转动增长的曲线。',
    },
    accentClass: 'bg-primary',
    order: 4,
    primaryParentId: 'geometry-curves',
  },
  {
    id: 'conic',
    publication: 'public',
    title: { en: 'Conic sections', zh: '圆锥曲线' },
    description: {
      en: 'Parabola, ellipse, and hyperbola.',
      zh: '抛物线、椭圆和双曲线。',
    },
    accentClass: 'bg-primary',
    order: 5,
    primaryParentId: 'geometry-curves',
  },
  {
    id: 'cartesian',
    publication: 'public',
    title: { en: 'Cartesian curves', zh: '直角坐标曲线' },
    description: {
      en: 'Curves given directly as y in terms of x, or by a relation in the plane.',
      zh: '直接用 y 关于 x 的式子，或平面上的一个关系给出的曲线。',
    },
    accentClass: 'bg-primary',
    order: 6,
    primaryParentId: 'geometry-curves',
  },
  {
    id: 'visual-proofs',
    publication: 'public',
    title: { en: 'Visual proofs', zh: '几何直观证明' },
    description: {
      en: 'Theorems opened up with area, projection, and motion.',
      zh: '用面积、投影和运动把定理摊开。',
    },
    accentClass: 'bg-primary',
    order: 7,
    primaryParentId: 'geometry-curves',
  },
  {
    id: 'series-limits',
    publication: 'public',
    title: { en: 'Series & limits', zh: '级数与极限' },
    description: {
      en: 'How partial sums approach a limit.',
      zh: '部分和怎样逼近一个极限。',
    },
    accentClass: 'bg-foreground',
    order: 1,
    primaryParentId: 'algebra-functions',
  },
  {
    id: 'maps-graphs',
    publication: 'public',
    title: { en: 'Functions & graphs', zh: '函数与图像' },
    description: {
      en: 'How a coefficient or a parameter rewrites a graph.',
      zh: '系数和参数怎样改写函数图像。',
    },
    accentClass: 'bg-foreground',
    order: 2,
    primaryParentId: 'algebra-functions',
  },
  {
    id: 'numbers-structure',
    publication: 'public',
    title: { en: 'Numbers & structure', zh: '数与结构' },
    description: {
      en: 'Counting, integers, and the structure inside a number.',
      zh: '计数、整数，以及一个数内部的结构。',
    },
    accentClass: 'bg-foreground',
    order: 3,
    primaryParentId: 'algebra-functions',
  },
  {
    id: 'rates',
    publication: 'public',
    title: { en: 'Rates of change', zh: '变化率' },
    description: {
      en: 'Slope, speed, and instantaneous change.',
      zh: '斜率、速度和瞬时变化。',
    },
    accentClass: 'bg-success',
    order: 1,
    primaryParentId: 'calculus',
  },
  {
    id: 'accumulation',
    publication: 'public',
    title: { en: 'Accumulation', zh: '累积与面积' },
    description: {
      en: 'Change gathered into area.',
      zh: '把变化积成面积。',
    },
    accentClass: 'bg-success',
    order: 2,
    primaryParentId: 'calculus',
  },
  {
    id: 'harmonic',
    publication: 'public',
    title: { en: 'Harmonics', zh: '谐波与分解' },
    description: {
      en: 'Sine components stacked into a curve.',
      zh: '正弦分量怎样叠成一条曲线。',
    },
    accentClass: 'bg-primary',
    order: 1,
    primaryParentId: 'waves-signals',
  },
];

/**
 * Curves whose primary home is `CurveDef.category`, plus extra shelves.
 * Sine is a Cartesian object and also a wave. Cycloid's motion-systems
 * shelf waits until that parent is public.
 */
export const curveAdditionalCategoryIds: Readonly<
  Record<string, readonly string[]>
> = {
  'sine-wave': ['harmonic'],
};
