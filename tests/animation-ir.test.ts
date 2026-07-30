import assert from 'node:assert/strict';
import test from 'node:test';

import type { AnimationSpec } from '../src/lib/animation';
import {
  parseManimCode,
  validateAnimationSpec,
} from '../src/lib/animation-schema';
import { compileAnimationSpec } from '../src/lib/manim-compiler';
import {
  detectMathObjectType,
  evaluateMathExpression,
  integralParts,
  parseMatrix,
  seriesParts,
} from '../src/lib/math-preview';
import { auditedGeometrySpec } from './animation-spec-fixture';

function validSpec(): AnimationSpec {
  return {
    schemaVersion: 2 as const,
    title: 'Parabola area',
    summary: 'Draw a parabola and its area.',
    durationSeconds: 6,
    assumptions: [],
    style: {
      background: '#0B1020',
      palette: ['BLUE', 'TEAL'],
      camera: 'Static 16:9 camera',
    },
    objects: [
      { id: 'axes', kind: 'axes' as const, region: 'graph' as const },
      {
        id: 'formula',
        kind: 'formula' as const,
        region: 'formula' as const,
        expr: 'y=x^2',
        color: 'WHITE',
      },
      {
        id: 'curve',
        kind: 'curve' as const,
        region: 'graph' as const,
        expr: 'x^2',
        domain: [-2, 2] as [number, number],
        color: 'BLUE',
      },
    ],
    timeline: [
      {
        id: 'draw-axes',
        at: 0,
        op: 'draw' as const,
        ref: 'axes',
        runTime: 1,
        ease: 'smooth' as const,
      },
      {
        id: 'draw-curve',
        at: 1,
        op: 'draw' as const,
        ref: 'curve',
        runTime: 2,
        ease: 'linear' as const,
      },
      {
        id: 'write-formula',
        at: 3,
        op: 'write' as const,
        ref: 'formula',
        runTime: 1,
        ease: 'smooth' as const,
      },
    ],
    layout: { regions: 'left|right' as const },
    dependencies: [],
    notes: [],
  };
}

function validDirectorSpec(): AnimationSpec {
  return {
    schemaVersion: 3,
    title: 'Derivative as slope',
    summary: 'Turn secant motion into the tangent slope.',
    durationSeconds: 9,
    assumptions: ['The function is differentiable near x.'],
    intent: {
      learningGoal: 'Connect the limiting secant slope to the derivative.',
      hook: 'A moving secant line visibly settles onto one tangent.',
      takeaway: 'The derivative is the slope left by the limit.',
    },
    direction: {
      preset: 'cinematic-math',
      frame: '16:9',
      pacing: 'balanced',
      textPolicy: { maxWordsPerObject: 8, maxSimultaneousText: 2 },
    },
    style: {
      background: '#0B1020',
      palette: ['BLUE', 'TEAL', 'YELLOW'],
      camera: 'Compiler-owned safe frame',
    },
    objects: [
      {
        id: 'formula',
        kind: 'formula',
        region: 'formula',
        importance: 'hero',
        expr: "f'(x)",
        color: 'WHITE',
      },
      {
        id: 'axes',
        kind: 'axes',
        region: 'graph',
        importance: 'context',
      },
      {
        id: 'curve',
        kind: 'curve',
        region: 'graph',
        importance: 'hero',
        expr: 'x^2',
        domain: [-2, 2],
        color: 'TEAL',
      },
    ],
    shots: [
      {
        id: 'hook',
        beat: 'hook',
        purpose: 'Pose the derivative as a visible slope.',
        startAt: 0,
        endAt: 2,
        focusRef: 'formula',
        transition: 'build',
        acceptance: ['The formula is readable before the graph appears.'],
      },
      {
        id: 'proof',
        beat: 'proof',
        purpose: 'Draw and emphasize the curve.',
        startAt: 2,
        endAt: 6,
        focusRef: 'curve',
        transition: 'emphasis',
        acceptance: ['The curve is the dominant object.'],
      },
      {
        id: 'payoff',
        beat: 'payoff',
        purpose: 'Hold the resolved visual relationship.',
        startAt: 6,
        endAt: 9,
        focusRef: 'curve',
        transition: 'hold',
        acceptance: ['The final tableau remains readable.'],
      },
    ],
    timeline: [
      {
        id: 'formula-in',
        shotId: 'hook',
        at: 0,
        op: 'write',
        ref: 'formula',
        runTime: 1,
        ease: 'smooth',
      },
      {
        id: 'axes-in',
        shotId: 'proof',
        at: 2,
        op: 'draw',
        ref: 'axes',
        runTime: 2,
        ease: 'smooth',
      },
      {
        id: 'curve-in',
        shotId: 'proof',
        at: 2,
        op: 'draw',
        ref: 'curve',
        runTime: 2,
        ease: 'smooth',
      },
      {
        id: 'curve-focus',
        shotId: 'proof',
        at: 4,
        op: 'emphasize',
        ref: 'curve',
        runTime: 1,
        ease: 'smooth',
      },
      {
        id: 'payoff-hold',
        shotId: 'payoff',
        at: 6,
        op: 'hold',
        ref: 'curve',
        runTime: 3,
        ease: 'linear',
      },
    ],
    layout: { regions: 'top|bottom' },
    dependencies: ['Manim Community', 'LaTeX'],
    notes: [],
  };
}

function validCinematicSpec(): AnimationSpec {
  return {
    schemaVersion: 4,
    title: 'Derivative term tour',
    summary: 'Focus each meaningful part of the derivative definition.',
    durationSeconds: 12,
    assumptions: ['The limit exists.'],
    intent: {
      learningGoal: 'Read the derivative quotient term by term.',
      hook: 'The denominator shrinks while the quotient settles.',
      takeaway: 'A local rate is built from one shrinking interval.',
    },
    direction: {
      preset: 'cinematic-math',
      frame: '16:9',
      pacing: 'balanced',
      textPolicy: { maxWordsPerObject: 8, maxSimultaneousText: 2 },
    },
    cinematography: {
      scene: 'moving-camera',
      emphasis: 'term-tour',
    },
    mathDossier: {
      coreClaim: 'The derivative is the limit of secant slopes.',
      invariants: ['The denominator and horizontal interval are the same h.'],
      commonMisreading: 'The quotient itself is not yet instantaneous.',
      visualProof: 'Shrink the highlighted interval while the slope settles.',
    },
    style: {
      background: '#0B0D14',
      palette: ['#4CC9F0', '#F4A261', '#F4EDE1'],
      camera: 'Guided mathematical focus',
    },
    objects: [
      {
        id: 'definition',
        kind: 'formula',
        region: 'formula',
        importance: 'hero',
        expr: "f'(x)=\\lim_{h\\to0}\\frac{f(x+h)-f(x)}{h}",
        parts: [
          {
            id: 'derivative',
            latex: "f'(x)=",
            meaning: 'instantaneous rate',
            color: '#F4EDE1',
          },
          {
            id: 'limit',
            latex: '\\lim_{h\\to0}',
            meaning: 'shrinking interval',
            color: '#4CC9F0',
          },
          {
            id: 'quotient',
            latex: '\\frac{f(x+h)-f(x)}{h}',
            meaning: 'secant slope',
            color: '#F4A261',
          },
        ],
      },
      { id: 'axes', kind: 'axes', region: 'graph', importance: 'context' },
      {
        id: 'curve',
        kind: 'curve',
        region: 'graph',
        importance: 'hero',
        expr: 'x^2',
        domain: [-2, 2],
        color: '#4CC9F0',
      },
    ],
    shots: [
      {
        id: 'hook',
        beat: 'hook',
        purpose: 'Reveal the addressable derivative formula.',
        startAt: 0,
        endAt: 2,
        focusRef: 'definition',
        transition: 'build',
        acceptance: ['The formula is readable as one expression.'],
      },
      {
        id: 'proof',
        beat: 'proof',
        purpose: 'Connect the quotient to the curve and inspect it.',
        startAt: 2,
        endAt: 6,
        focusRef: 'curve',
        transition: 'emphasis',
        acceptance: ['The quotient receives one deliberate camera focus.'],
      },
      {
        id: 'payoff',
        beat: 'payoff',
        purpose: 'Return to the full composition for the conclusion.',
        startAt: 6,
        endAt: 12,
        focusRef: 'curve',
        transition: 'hold',
        acceptance: ['The camera returns before the final hold.'],
      },
    ],
    timeline: [
      {
        id: 'formula-in',
        shotId: 'hook',
        at: 0,
        op: 'write',
        ref: 'definition',
        runTime: 1.5,
        ease: 'smooth',
      },
      {
        id: 'axes-in',
        shotId: 'proof',
        at: 2,
        op: 'draw',
        ref: 'axes',
        runTime: 2,
        ease: 'smooth',
      },
      {
        id: 'curve-in',
        shotId: 'proof',
        at: 2,
        op: 'draw',
        ref: 'curve',
        runTime: 2,
        ease: 'smooth',
      },
      {
        id: 'quotient-focus',
        shotId: 'proof',
        at: 4,
        op: 'camera_focus',
        ref: 'definition',
        partId: 'quotient',
        zoom: 1.8,
        runTime: 1,
        ease: 'smooth',
      },
      {
        id: 'quotient-spotlight',
        shotId: 'proof',
        at: 5,
        op: 'spotlight',
        ref: 'definition',
        partId: 'quotient',
        runTime: 1,
        ease: 'smooth',
      },
      {
        id: 'camera-out',
        shotId: 'payoff',
        at: 6,
        op: 'camera_reset',
        ref: 'definition',
        runTime: 1,
        ease: 'smooth',
      },
      {
        id: 'curve-glow',
        shotId: 'payoff',
        at: 7,
        op: 'glow',
        ref: 'curve',
        runTime: 1,
        ease: 'smooth',
      },
      {
        id: 'payoff-hold',
        shotId: 'payoff',
        at: 8,
        op: 'hold',
        ref: 'curve',
        runTime: 4,
        ease: 'linear',
      },
    ],
    layout: { regions: 'top|bottom' },
    dependencies: ['Manim Community', 'LaTeX'],
    notes: ['The quotient color remains coral.'],
  };
}

function validAuditedSpec(): AnimationSpec {
  return {
    ...validCinematicSpec(),
    schemaVersion: 5,
    knowledgeMap: [
      {
        id: 'secant',
        concept: 'A secant slope is a difference quotient.',
        dependsOn: [],
        misconception: 'It is not yet an instantaneous slope.',
      },
      {
        id: 'derivative',
        concept: 'The derivative is the limit of secant slopes.',
        dependsOn: ['secant'],
        misconception: 'Setting h to zero is not the limiting process.',
      },
    ],
    curriculum: [
      {
        id: 'identify-secant',
        learningJob: 'Identify the secant quotient.',
        dependsOn: ['secant'],
        visualEvidence: 'A chord joins two points on the curve.',
        notationBudget: 1,
      },
      {
        id: 'shrink-h',
        learningJob: 'See the horizontal interval shrink.',
        dependsOn: ['identify-secant', 'derivative'],
        visualEvidence: 'The second point moves toward the first.',
        notationBudget: 2,
      },
      {
        id: 'resolve-tangent',
        learningJob: 'Connect the limiting secant to the tangent.',
        dependsOn: ['shrink-h'],
        visualEvidence: 'The chord settles onto the tangent direction.',
        notationBudget: 2,
      },
    ],
    mathDossier: {
      ...validCinematicSpec().mathDossier!,
      definitions: [
        {
          concept: 'Difference quotient',
          statement: '(f(x+h)-f(x))/h for h not equal to zero.',
        },
      ],
      derivationSteps: [
        'For f(x)=x^2, expand (x+h)^2-x^2 as 2xh+h^2.',
        'Divide by h and take h to zero to obtain 2x.',
      ],
      checks: [
        {
          claim: 'The derivative of x^2 is 2x.',
          method: 'Differentiate by the power rule.',
          expected: '2x',
        },
      ],
      limitations: ['The derivative claim assumes the limit exists.'],
    },
  };
}

test('v2 IR validates and compiles deterministically', () => {
  const spec = validateAnimationSpec(validSpec());
  const first = compileAnimationSpec(spec);
  const second = compileAnimationSpec(spec);

  assert.equal(first, second);
  assert.match(first, /class CurvGScene\(Scene\):/);
  assert.match(first, /lambda x: x\*\*2/);
  assert.match(first, /run_time=2, rate_func=linear/);
  assert.doesNotMatch(first, /eval\(|exec\(|subprocess/);
});

test('v3 director IR compiles shot intent and teaching emphasis', () => {
  const spec = validateAnimationSpec(validDirectorSpec());
  const code = compileAnimationSpec(spec);

  assert.match(code, /config\.pixel_width = 1920/);
  assert.match(code, /# Shot hook: hook/);
  assert.match(code, /Indicate\(obj_curve, color=TEAL, scale_factor=1\.06\)/);
  assert.doesNotMatch(code, /to_edge\(UP/);
});

test('v3 director IR rejects events outside their shot', () => {
  const spec = validDirectorSpec();
  if (!spec.timeline) throw new Error('test spec must have a timeline');
  spec.timeline[0] = { ...spec.timeline[0], at: 2.5 };
  assert.throws(
    () => validateAnimationSpec(spec),
    /inside its shot|Overlapping start times/
  );
});

test('v4 cinematic IR compiles addressable formula terms and camera grammar', () => {
  const spec = validateAnimationSpec(validCinematicSpec());
  const code = compileAnimationSpec(spec);

  assert.match(code, /class CurvGScene\(MovingCameraScene\):/);
  assert.match(code, /MathTex\("f'\(x\)=", "\\\\lim_\{h\\\\to0\}", "\\\\frac/);
  assert.match(code, /obj_definition\[2\]\.set_color\("#F4A261"\)/);
  assert.match(
    code,
    /self\.camera\.frame\.animate\.move_to\(obj_definition\[2\]\)/
  );
  assert.match(code, /Restore\(self\.camera\.frame\)/);
  assert.match(code, /Circumscribe\(obj_definition\[2\]/);
});

test('v4 rejects camera moves on static scenes and unknown formula terms', () => {
  const staticSpec = validCinematicSpec();
  if (!staticSpec.cinematography || !staticSpec.timeline) {
    throw new Error('test spec must have cinematography and timeline');
  }
  staticSpec.cinematography.scene = 'static';
  assert.throws(
    () => validateAnimationSpec(staticSpec),
    /Camera operations require a moving-camera scene/
  );

  const unknownTermSpec = validCinematicSpec();
  if (!unknownTermSpec.timeline) throw new Error('test spec needs timeline');
  unknownTermSpec.timeline[2] = {
    ...unknownTermSpec.timeline[2],
    partId: 'missing_term',
  };
  assert.throws(
    () => validateAnimationSpec(unknownTermSpec),
    /Unknown formula part reference/
  );
});

test('v5 requires an ordered curriculum and an auditable math dossier', () => {
  assert.equal(validateAnimationSpec(validAuditedSpec()).schemaVersion, 5);

  const invalid = validAuditedSpec();
  invalid.curriculum![0] = {
    ...invalid.curriculum![0],
    dependsOn: ['future-beat'],
  };
  assert.throws(
    () => validateAnimationSpec(invalid),
    /Curriculum dependency must refer/
  );

  const incomplete = validAuditedSpec();
  incomplete.mathDossier = {
    ...incomplete.mathDossier!,
    derivationSteps: [],
  };
  assert.throws(() => validateAnimationSpec(incomplete));
});

test('v5 geometry IR can express and compile a unit-circle projection proof', () => {
  const spec = validateAnimationSpec(auditedGeometrySpec());
  const code = compileAnimationSpec(spec);

  assert.match(code, /obj_unit_circle = ParametricFunction/);
  assert.match(code, /obj_rotating_point = Dot\(obj_axes\.c2p\(2, 0\)/);
  assert.match(code, /obj_projection_line = Line\(/);
  assert.match(code, /obj_direction_arrow = Arrow\(/);
  assert.match(code, /obj_angle_arc = ParametricFunction/);
  assert.match(code, /MoveAlongPath\(obj_rotating_point, obj_unit_circle\)/);
});

test('v5 geometry IR rejects a claimed rotating circle point without timeline motion', () => {
  const staticProjection = auditedGeometrySpec();
  staticProjection.timeline = staticProjection.timeline?.filter(
    (event) => event.op !== 'move_along'
  );

  assert.throws(
    () => validateAnimationSpec(staticProjection),
    /static sample does not prove the dynamic relationship/
  );
});

test('geometry IR rejects incomplete primitives and invalid motion paths', () => {
  const missingCenter = auditedGeometrySpec();
  const circle = missingCenter.objects?.find(
    (object) => object.id === 'unit-circle'
  );
  if (!circle) throw new Error('fixture circle is missing');
  circle.center = undefined;
  assert.throws(
    () => validateAnimationSpec(missingCenter),
    /circle requires center and radius/
  );

  const invalidPath = auditedGeometrySpec();
  const motion = invalidPath.timeline?.find(
    (event) => event.id === 'point-around-circle'
  );
  if (!motion) throw new Error('fixture motion is missing');
  motion.pathRef = 'sine-formula';
  assert.throws(
    () => validateAnimationSpec(invalidPath),
    /move_along requires a valid circle, curve, arc or line pathRef/
  );
});

test('IR rejects missing references, overlapping events, and invalid domains', () => {
  assert.throws(() =>
    validateAnimationSpec({
      ...validSpec(),
      objects: [
        {
          id: 'curve',
          kind: 'curve',
          region: 'graph',
          expr: 'x',
          domain: [2, -2],
        },
      ],
      timeline: [
        {
          id: 'a',
          at: 0,
          op: 'draw',
          ref: 'missing',
          runTime: 2,
          ease: 'smooth',
        },
        {
          id: 'b',
          at: 1,
          op: 'draw',
          ref: 'curve',
          runTime: 1,
          ease: 'smooth',
        },
      ],
    })
  );
});

test('compiler rejects expression injection instead of emitting Python', () => {
  const spec = validSpec();
  if (!spec.objects) throw new Error('test spec must have objects');
  spec.objects[2] = {
    ...spec.objects[2],
    expr: '__import__(os).system(x)',
  };
  assert.throws(() => compileAnimationSpec(spec), /not supported|unsupported/);
});

test('generated code accepts genuine 3D scenes and normalizes one scene name', () => {
  const code = parseManimCode(`
from manim import *

class SurfaceProof(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        self.add(axes)
        self.wait(1)
`);

  assert.match(code, /class CurvGScene\(ThreeDScene\):/);
});

test('browser math preview detects and evaluates supported inputs', () => {
  assert.equal(detectMathObjectType('sin(x) + x^2'), 'function');
  assert.equal(detectMathObjectType('int(x^2, x, 0, 1)'), 'integral');
  assert.equal(detectMathObjectType('sum(1/n^2, n, 1, 12)'), 'series');
  assert.equal(detectMathObjectType('[[1, 0], [0, 1]]'), 'matrix');
  assert.ok(
    Math.abs(evaluateMathExpression('sin(pi / 2) + 2x', { x: 2 }) - 5) < 1e-9
  );
  assert.deepEqual(integralParts('int(x^2, x, 0, 2)'), {
    expression: 'x^2',
    from: 0,
    to: 2,
  });
  assert.deepEqual(seriesParts('sum(1/n^2, n, 1, 20)'), {
    expression: '1/n^2',
    from: 1,
    to: 20,
  });
  assert.deepEqual(parseMatrix('[[1, 2], [3, 4]]'), [
    [1, 2],
    [3, 4],
  ]);
});
