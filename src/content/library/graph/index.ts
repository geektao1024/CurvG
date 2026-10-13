import { CURVES, getCurve, type CurveDef } from '@/content/curves';

import { publicLibraryScenes } from '../scenes';
import type { LibraryCategory, LibraryPath } from '../types';
import { curveAdditionalCategoryIds, libraryCategories } from './categories';
import { libraryPaths } from './paths';

const RESERVED_IDS = new Set(['scenes']);

function uniqueById<T extends { id: string }>(
  items: readonly T[],
  kind: string
): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    if (result.has(item.id)) {
      throw new Error(`Duplicate library ${kind} id: ${item.id}`);
    }
    if (RESERVED_IDS.has(item.id)) {
      throw new Error(`Library ${kind} id is reserved: ${item.id}`);
    }
    result.set(item.id, item);
  }
  return result;
}

function sortByOrder<T extends { id: string; order: number }>(
  items: readonly T[]
): T[] {
  return [...items].sort(
    (left, right) => left.order - right.order || left.id.localeCompare(right.id)
  );
}

const categoryById = uniqueById(libraryCategories, 'category');
uniqueById(libraryPaths, 'path');

function parentIds(category: LibraryCategory): string[] {
  return [
    category.primaryParentId,
    ...(category.additionalParentIds ?? []),
  ].filter((id): id is string => Boolean(id));
}

function assertCategoryGraph(): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string) => {
    if (visiting.has(id)) {
      throw new Error(`Library category graph contains a cycle at ${id}`);
    }
    if (visited.has(id)) return;
    visiting.add(id);
    const category = categoryById.get(id);
    if (!category) throw new Error(`Unknown library category: ${id}`);
    for (const parentId of parentIds(category)) visit(parentId);
    visiting.delete(id);
    visited.add(id);
  };

  for (const category of libraryCategories) {
    const parents = parentIds(category);
    if (new Set(parents).size !== parents.length) {
      throw new Error(`Library category ${category.id} repeats a parent`);
    }
    for (const parentId of parents) {
      if (parentId === category.id) {
        throw new Error(`Library category ${category.id} cannot parent itself`);
      }
      const parent = categoryById.get(parentId);
      if (!parent) {
        throw new Error(
          `Library category ${category.id} has unknown parent ${parentId}`
        );
      }
      if (
        category.publication === 'public' &&
        parent.publication !== 'public'
      ) {
        throw new Error(
          `Public library category ${category.id} has non-public parent ${parentId}`
        );
      }
    }
    if (category.publication === 'public' && category.primaryParentId) {
      const parent = categoryById.get(category.primaryParentId);
      if (parent?.primaryParentId) {
        throw new Error(
          `Public library category ${category.id} is nested deeper than a hub child`
        );
      }
    }
    visit(category.id);
  }
}

function assertCurveLinks(): void {
  for (const [slug, categoryIds] of Object.entries(
    curveAdditionalCategoryIds
  )) {
    if (!getCurve(slug)) {
      throw new Error(`Library additional shelf names unknown curve ${slug}`);
    }
    for (const categoryId of categoryIds) {
      if (!categoryById.has(categoryId)) {
        throw new Error(
          `Curve ${slug} lists unknown additional category ${categoryId}`
        );
      }
    }
  }
  for (const curve of CURVES) {
    if (!categoryById.has(curve.category)) {
      throw new Error(
        `Curve ${curve.slug} category ${curve.category} is not in the library graph`
      );
    }
  }
}

function assertScenes(): void {
  for (const scene of publicLibraryScenes) {
    if (!categoryById.has(scene.primaryCategoryId)) {
      throw new Error(
        `Library scene ${scene.slug} has unknown category ${scene.primaryCategoryId}`
      );
    }
    for (const categoryId of scene.additionalCategoryIds ?? []) {
      if (!categoryById.has(categoryId)) {
        throw new Error(
          `Library scene ${scene.slug} lists unknown category ${categoryId}`
        );
      }
    }
    for (const slug of scene.curveSlugs ?? []) {
      if (!getCurve(slug)) {
        throw new Error(
          `Library scene ${scene.slug} names unknown curve ${slug}`
        );
      }
    }
    if (scene.durationSeconds === undefined) continue;
    const covered = scene.phases.reduce((total, phase) => {
      if (phase.start === undefined || phase.end === undefined) {
        throw new Error(`Library scene ${scene.slug} is missing phase times`);
      }
      return total + (phase.end - phase.start);
    }, 0);
    if (Math.abs(covered - scene.durationSeconds) > 0.05) {
      throw new Error(
        `Library scene ${scene.slug} phases do not cover its duration`
      );
    }
  }
}

function assertPaths(): void {
  for (const path of libraryPaths) {
    const seen = new Set<string>();
    for (const slug of path.curveSlugs) {
      if (seen.has(slug)) {
        throw new Error(`Library path ${path.id} repeats ${slug}`);
      }
      seen.add(slug);
      if (!getCurve(slug)) {
        throw new Error(`Library path ${path.id} names unknown curve ${slug}`);
      }
    }
    if (path.publication === 'public' && path.curveSlugs.length < 2) {
      throw new Error(
        `Public library path ${path.id} needs at least two curves`
      );
    }
  }
}

assertCategoryGraph();
assertCurveLinks();
assertScenes();
assertPaths();

export const publicCategories = sortByOrder(
  libraryCategories.filter((category) => category.publication === 'public')
);

export const rootCategories = publicCategories.filter(
  (category) => !category.primaryParentId
);

export const publicPaths = sortByOrder(
  libraryPaths.filter((path) => path.publication === 'public')
);

const publicCategoryById = uniqueById(publicCategories, 'public category');

export function getCategory(id: string): LibraryCategory | undefined {
  return publicCategoryById.get(id);
}

export function getPrimaryTrail(id: string): LibraryCategory[] {
  const trail: LibraryCategory[] = [];
  let current = getCategory(id);
  while (current) {
    trail.unshift(current);
    current = current.primaryParentId
      ? getCategory(current.primaryParentId)
      : undefined;
  }
  return trail;
}

export function libraryPath(category: LibraryCategory): string {
  const trail = getPrimaryTrail(category.id);
  if (trail.length === 0) return '/library';
  if (trail.length === 1) return `/library/${trail[0].id}`;
  return `/library/${trail[0].id}/${category.id}`;
}

export function childCategories(parentId: string): LibraryCategory[] {
  return publicCategories.filter(
    (category) => category.primaryParentId === parentId
  );
}

export function isPublicHub(id: string): boolean {
  const category = getCategory(id);
  return Boolean(category && !category.primaryParentId);
}

function additionalIds(curve: CurveDef): readonly string[] {
  return curveAdditionalCategoryIds[curve.slug] ?? [];
}

export function curvesForCategory(categoryId: string): {
  primary: CurveDef[];
  additional: CurveDef[];
} {
  const primary: CurveDef[] = [];
  const additional: CurveDef[] = [];
  for (const curve of CURVES) {
    if (curve.category === categoryId) primary.push(curve);
    else if (additionalIds(curve).includes(categoryId)) additional.push(curve);
  }
  return { primary, additional };
}

export function curvesInCategory(categoryId: string): CurveDef[] {
  const { primary, additional } = curvesForCategory(categoryId);
  return [...primary, ...additional];
}

export function categoryCurveCount(categoryId: string): number {
  const own = curvesInCategory(categoryId).length;
  const children = childCategories(categoryId).reduce(
    (total, child) => total + curvesInCategory(child.id).length,
    0
  );
  return own + children;
}

/** Curves to preview on a hub: one pass through children, primary shelves first. */
export function hubPreviewCurves(hubId: string, limit = 4): CurveDef[] {
  const picked: CurveDef[] = [];
  const seen = new Set<string>();
  const take = (curve: CurveDef) => {
    if (seen.has(curve.slug) || picked.length >= limit) return;
    seen.add(curve.slug);
    picked.push(curve);
  };
  for (const child of childCategories(hubId)) {
    for (const curve of curvesForCategory(child.id).primary) take(curve);
    if (picked.length >= limit) return picked;
  }
  for (const child of childCategories(hubId)) {
    for (const curve of curvesForCategory(child.id).additional) take(curve);
  }
  return picked;
}

export const FEATURED_CURVE_SLUGS = [
  'lissajous-curve',
  'cardioid',
  'cycloid',
  'archimedean-spiral',
  'parabola',
  'sine-wave',
] as const;

export function featuredCurves(): CurveDef[] {
  return FEATURED_CURVE_SLUGS.map((slug) => getCurve(slug)).filter(
    (curve): curve is CurveDef => curve !== undefined
  );
}

export function pathCurves(path: LibraryPath): CurveDef[] {
  return path.curveSlugs
    .map((slug) => getCurve(slug))
    .filter((curve): curve is CurveDef => curve !== undefined);
}

export function scenesForCategory(categoryId: string) {
  return publicLibraryScenes.filter(
    (scene) =>
      scene.primaryCategoryId === categoryId ||
      scene.additionalCategoryIds?.includes(categoryId)
  );
}

/** Scenes whose primary shelf is this hub or one of its children. */
export function primaryScenesForHub(hubId: string) {
  const childIds = new Set(
    childCategories(hubId).map((category) => category.id)
  );
  return publicLibraryScenes.filter(
    (scene) =>
      scene.primaryCategoryId === hubId || childIds.has(scene.primaryCategoryId)
  );
}

export function scenesForCurve(curveSlug: string) {
  return publicLibraryScenes.filter((scene) =>
    scene.curveSlugs?.includes(curveSlug)
  );
}

/** Topics with a curve or a scene. Empty shelves stay reachable but out of the sitemap. */
export function indexableTopics(): LibraryCategory[] {
  return publicCategories.filter(
    (category) =>
      Boolean(category.primaryParentId) &&
      (curvesInCategory(category.id).length > 0 ||
        scenesForCategory(category.id).length > 0)
  );
}
