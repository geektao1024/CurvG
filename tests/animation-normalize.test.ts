import assert from 'node:assert/strict';
import test from 'node:test';
import { ZodError } from 'zod';

import {
  applySceneTargetedRepair,
  composeAnimationSpecFromArtifacts,
  curriculumArtifactSchema,
  intentArtifactSchema,
  knowledgeArtifactSchema,
  mathematicsArtifactSchema,
  normalizeAnimationPlanningArtifact,
  planSceneTargetedRepair,
  sceneArtifactSchema,
  sceneTargetedRepairPrompt,
  storyboardArtifactSchema,
  type AnimationPlanningArtifacts,
} from '../src/lib/animation-pipeline';
import { auditedGeometrySpec } from './animation-spec-fixture';

function fixtureArtifacts(): AnimationPlanningArtifacts {
  const spec = auditedGeometrySpec();
  return {
    intent: intentArtifactSchema.parse(spec),
    knowledge: knowledgeArtifactSchema.parse(spec),
    curriculum: curriculumArtifactSchema.parse(spec),
    mathematics: mathematicsArtifactSchema.parse(spec),
    storyboard: storyboardArtifactSchema.parse(spec),
    scene: sceneArtifactSchema.parse(spec),
  };
}

function sceneObject(scene: AnimationPlanningArtifacts['scene'], id: string) {
  const object = scene.objects.find((entry) => entry.id === id);
  assert.ok(object, `fixture object ${id} missing`);
  return object;
}

test('B1: formula content is derived from the dossier when absent', () => {
  const artifacts = fixtureArtifacts();
  const formula = sceneObject(artifacts.scene, 'sine-formula');
  delete formula.expr;
  delete formula.parts;

  const { artifact, corrections } = normalizeAnimationPlanningArtifact(
    'scene',
    artifacts.scene,
    artifacts
  );
  const derived = sceneObject(artifact, 'sine-formula');
  // The fixture formula has two latexParts, so the addressable form wins.
  assert.equal(derived.parts?.length, 2);
  assert.equal(
    derived.parts?.map((part) => part.latex).join(''),
    'y=\\sin(\\theta)'
  );
  assert.ok(
    corrections.some((entry) => entry.includes('derived formula content'))
  );

  // The composed spec passes the verbatim rule by construction.
  const spec = composeAnimationSpecFromArtifacts({
    ...artifacts,
    scene: artifact,
  });
  assert.equal(spec.schemaVersion, 6);
});

test('B1: wrong hand-authored LaTeX is overwritten, matching content is kept', () => {
  const artifacts = fixtureArtifacts();
  const formula = sceneObject(artifacts.scene, 'sine-formula');
  formula.expr = 'y=\\cos(\\theta)';

  const rewritten = normalizeAnimationPlanningArtifact(
    'scene',
    artifacts.scene,
    artifacts
  );
  assert.equal(
    sceneObject(rewritten.artifact, 'sine-formula').parts?.length,
    2
  );

  const clean = fixtureArtifacts();
  const untouched = normalizeAnimationPlanningArtifact(
    'scene',
    clean.scene,
    clean
  );
  assert.deepEqual(untouched.corrections, []);
  assert.equal(
    sceneObject(untouched.artifact, 'sine-formula').expr,
    'y=\\sin(\\theta)'
  );
});

test('B2: small timeline overshoots are clamped, large drift is untouched', () => {
  const artifacts = fixtureArtifacts();
  const event = artifacts.scene.timeline.find(
    (entry) => entry.shotId === 'hook'
  );
  assert.ok(event);
  event.at = 2.4; // hook window is [0, 2]; overshoot 0.4 ≤ 0.5

  const { artifact, corrections } = normalizeAnimationPlanningArtifact(
    'scene',
    artifacts.scene,
    artifacts
  );
  const clamped = artifact.timeline.find((entry) => entry.id === event.id);
  assert.ok(clamped && clamped.at <= 2);
  assert.ok(corrections.some((entry) => entry.includes('clamped at')));

  const far = fixtureArtifacts();
  const farEvent = far.scene.timeline.find((entry) => entry.shotId === 'hook');
  assert.ok(farEvent);
  farEvent.at = 4; // overshoot 2s is a content error, not drift
  const untouched = normalizeAnimationPlanningArtifact('scene', far.scene, far);
  assert.equal(
    untouched.artifact.timeline.find((entry) => entry.id === farEvent.id)?.at,
    4
  );
});

test('B2: the final storyboard shot snaps to durationSeconds within 1s', () => {
  const artifacts = fixtureArtifacts();
  const last = artifacts.storyboard.shots.at(-1)!;
  last.endAt = 9.4; // durationSeconds is 10

  const { artifact, corrections } = normalizeAnimationPlanningArtifact(
    'storyboard',
    artifacts.storyboard,
    artifacts
  );
  assert.equal(artifact.shots.at(-1)?.endAt, 10);
  assert.ok(corrections.some((entry) => entry.includes('snapped final')));
});

test('B3: uniquely matchable reference aliases are rewritten', () => {
  const artifacts = fixtureArtifacts();
  const event = artifacts.scene.timeline.find(
    (entry) => entry.ref === 'sine-formula'
  );
  assert.ok(event);
  event.ref = 'Sine_Formula';
  event.shotId = 'PAYOFF';

  const { artifact, corrections } = normalizeAnimationPlanningArtifact(
    'scene',
    artifacts.scene,
    artifacts
  );
  const fixed = artifact.timeline.find((entry) => entry.id === event.id);
  assert.equal(fixed?.ref, 'sine-formula');
  assert.equal(fixed?.shotId, 'payoff');
  assert.equal(
    corrections.filter((entry) => entry.includes('normalized')).length,
    2
  );
});

test('B4: transform targetRef is inferred only from a unique same-kind sibling', () => {
  const artifacts = fixtureArtifacts();
  // Two curve objects: sine-wave plus a second curve makes the pair unique
  // from the point of view of a transform on sine-wave.
  artifacts.scene.objects.push({
    id: 'cosine-wave',
    kind: 'curve',
    region: 'graph',
    importance: 'supporting',
    expr: 'cos(x)',
    domain: [0, 6],
  });
  artifacts.scene.timeline.push({
    id: 'wave-transform',
    shotId: 'payoff',
    at: 7.2,
    op: 'transform',
    ref: 'sine-wave',
    runTime: 1,
    ease: 'smooth',
  });

  const { artifact, corrections } = normalizeAnimationPlanningArtifact(
    'scene',
    artifacts.scene,
    artifacts
  );
  assert.equal(
    artifact.timeline.find((entry) => entry.id === 'wave-transform')?.targetRef,
    'cosine-wave'
  );
  assert.ok(corrections.some((entry) => entry.includes('inferred transform')));
});

test('B5: a compose failure maps to exactly the offending scene items', () => {
  const artifacts = fixtureArtifacts();
  const wave = sceneObject(artifacts.scene, 'sine-wave');
  delete wave.expr; // curve requires expr → objects[i] issue
  const waveIndex = artifacts.scene.objects.findIndex(
    (entry) => entry.id === 'sine-wave'
  );

  let failure: unknown;
  try {
    composeAnimationSpecFromArtifacts(artifacts);
    assert.fail('compose should reject the broken curve');
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof ZodError);

  const items = planSceneTargetedRepair(failure, artifacts.scene);
  assert.ok(items);
  assert.equal(items.length, 1);
  assert.equal(items[0].collection, 'objects');
  assert.equal(items[0].index, waveIndex);

  const prompt = sceneTargetedRepairPrompt(items);
  assert.ok(prompt.includes(`objects[${waveIndex}]`));
  assert.ok(prompt.includes('"index"'));

  const repaired = applySceneTargetedRepair(
    artifacts.scene,
    JSON.stringify({
      objects: [
        {
          index: waveIndex,
          value: { ...wave, expr: 'sin(x)' },
        },
      ],
    }),
    items
  );
  assert.equal(sceneObject(repaired, 'sine-wave').expr, 'sin(x)');
  // The merged artifact composes cleanly end to end.
  composeAnimationSpecFromArtifacts({ ...artifacts, scene: repaired });
});

test('B5: fragments outside the contract and non-item failures are refused', () => {
  const artifacts = fixtureArtifacts();
  const wave = sceneObject(artifacts.scene, 'sine-wave');
  delete wave.expr;
  let failure: unknown;
  try {
    composeAnimationSpecFromArtifacts(artifacts);
  } catch (error) {
    failure = error;
  }
  const items = planSceneTargetedRepair(failure, artifacts.scene);
  assert.ok(items);

  assert.throws(() =>
    applySceneTargetedRepair(
      artifacts.scene,
      JSON.stringify({ objects: [{ index: 0, value: { id: 'axes' } }] }),
      items
    )
  );
  assert.throws(() =>
    applySceneTargetedRepair(artifacts.scene, JSON.stringify({}), items)
  );

  // A plain Error (semantic validation) is not index-mappable.
  assert.equal(
    planSceneTargetedRepair(new Error('duplicate content'), artifacts.scene),
    undefined
  );
});
