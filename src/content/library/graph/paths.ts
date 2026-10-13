import type { LibraryPath } from '../types';

/**
 * Ordered journeys. Draft paths stay in the graph so the editorial order is
 * recorded, and they stay off the public index until their members exist.
 * See docs/LIBRARY_PLAN.md §4.
 */
export const libraryPaths: readonly LibraryPath[] = [
  {
    id: 'unit-circle-to-fourier',
    publication: 'draft',
    order: 1,
    title: { en: 'From the unit circle to Fourier', zh: '从单位圆到傅里叶' },
    description: {
      en: 'A point on the circle, a sine wave, then circles stacked into a periodic curve. Scene entries are not written yet.',
      zh: '圆上的一点、一条正弦，再把一串圆叠成周期曲线。场景条目还没写。',
    },
    curveSlugs: [],
  },
  {
    id: 'roulette-family',
    publication: 'public',
    order: 2,
    title: { en: 'One roulette family', zh: '一条旋轮线家族' },
    description: {
      en: 'The same idea of a rolling circle: the cycloid, the hypocycloid, then the astroid.',
      zh: '同一个滚动的圆：摆线、内摆线，然后收到星形线。',
    },
    curveSlugs: ['cycloid', 'hypocycloid', 'astroid'],
  },
  {
    id: 'quadratic-three-views',
    publication: 'draft',
    order: 3,
    title: {
      en: 'Three views of a quadratic',
      zh: '二次函数的三种看法',
    },
    description: {
      en: 'The graph, completing the square, and area. Only the parabola object exists so far.',
      zh: '图像、配方和面积。目前只有抛物线这个对象。',
    },
    curveSlugs: ['parabola'],
  },
];
