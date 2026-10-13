import assert from 'node:assert/strict';
import test from 'node:test';

import { CURVES } from '../src/content/curves';
import {
  categoryCurveCount,
  curvesForCategory,
  featuredCurves,
  getCategory,
  getLibraryScene,
  getPrimaryTrail,
  indexableTopics,
  isPublicHub,
  libraryPath,
  pathCurves,
  publicPaths,
  rootCategories,
  scenesForCategory,
} from '../src/content/library';

test('public hubs are the four math shelves', () => {
  assert.deepEqual(
    rootCategories.map((category) => category.id),
    ['geometry-curves', 'algebra-functions', 'calculus', 'waves-signals']
  );
  assert.equal(isPublicHub('motion-systems'), false);
  assert.equal(getCategory('motion-systems'), undefined);
  assert.equal(isPublicHub('scenes'), false);
});

test('every encyclopedia curve hangs on a public geometry child', () => {
  for (const curve of CURVES) {
    const category = getCategory(curve.category);
    assert.ok(category, curve.slug);
    assert.equal(category.primaryParentId, 'geometry-curves');
    assert.equal(
      libraryPath(category),
      `/library/geometry-curves/${curve.category}`
    );
  }
  assert.equal(categoryCurveCount('geometry-curves'), CURVES.length);
});

test('sine wave is also filed under harmonics', () => {
  const harmonic = curvesForCategory('harmonic');
  assert.deepEqual(
    harmonic.additional.map((curve) => curve.slug),
    ['sine-wave']
  );
  assert.equal(harmonic.primary.length, 0);
  const trail = getPrimaryTrail('harmonic');
  assert.deepEqual(
    trail.map((category) => category.id),
    ['waves-signals', 'harmonic']
  );
});

test('the roulette path resolves and draft paths stay off the index', () => {
  assert.deepEqual(
    publicPaths.map((path) => path.id),
    ['roulette-family']
  );
  assert.deepEqual(
    pathCurves(publicPaths[0]).map((curve) => curve.slug),
    ['cycloid', 'hypocycloid', 'astroid']
  );
});

test('choosing two letters is a timed clip with formulas', () => {
  const scene = getLibraryScene('permutations-vs-combinations');
  assert.ok(scene);
  assert.equal(scene.durationSeconds, 17.9);
  assert.equal(scene.phases.length, 5);
  assert.equal(scene.phases[0]?.start, 0);
  assert.equal(scene.phases.at(-1)?.end, 17.9);
  assert.equal(scene.equations.length, 3);
  assert.match(scene.video?.src ?? '', /permutations-vs-combinations\.mp4$/);
});

test('the first scene is the verified parabola clip', () => {
  const scene = getLibraryScene('parabola-rise');
  assert.ok(scene);
  assert.equal(scene.primaryCategoryId, 'maps-graphs');
  assert.equal(scene.evidence, 'verified');
  assert.equal(scene.durationSeconds, 5);
  assert.equal(
    scene.phases.reduce((total, phase) => total + phase.end - phase.start, 0),
    5
  );
  assert.ok(indexableTopics().some((topic) => topic.id === 'maps-graphs'));
  assert.equal(scenesForCategory('conic')[0]?.slug, 'parabola-rise');
  assert.equal(getLibraryScene('missing'), undefined);
});

test('sitemap topics are the non-empty children', () => {
  const ids = indexableTopics().map((category) => category.id);
  assert.ok(ids.includes('parametric'));
  assert.ok(ids.includes('harmonic'));
  assert.equal(ids.includes('visual-proofs'), false);
  assert.equal(ids.includes('geometry-curves'), false);
  assert.equal(featuredCurves().length, 6);
});
