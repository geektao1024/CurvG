import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildDeterministicCycloidArtifacts,
  composeAnimationSpecFromArtifacts,
} from '../src/lib/animation-pipeline';
import { compileAnimationSpec } from '../src/lib/manim-compiler';
import { auditedGeometrySpec } from './animation-spec-fixture';

const validator = join(process.cwd(), 'renderer', 'validate_scene.py');
const analyzer = join(process.cwd(), 'renderer', 'analyze_contact_sheet.py');
const rendererSource = readFileSync(
  join(process.cwd(), 'renderer', 'src', 'index.ts'),
  'utf8'
);

function validate(source: string) {
  const directory = mkdtempSync(join(tmpdir(), 'curvg-validator-'));
  const path = join(directory, 'scene.py');
  writeFileSync(path, source, 'utf8');
  const result = spawnSync('python3', [validator, path], {
    encoding: 'utf8',
  });
  rmSync(directory, { recursive: true, force: true });
  return result;
}

test('renderer validator accepts visible 2D and genuine 3D scenes', () => {
  const twoD = validate(`from manim import *
class CurvGScene(Scene):
    def construct(self):
        dot = Dot()
        self.play(Create(dot), run_time=1)
`);
  assert.equal(twoD.status, 0, twoD.stderr);

  const threeD = validate(`from manim import *
class CurvGScene(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        self.set_camera_orientation(phi=60 * DEGREES, theta=-45 * DEGREES)
        self.play(Create(axes), run_time=1)
`);
  assert.equal(threeD.status, 0, threeD.stderr);
});

test('renderer validator accepts deterministic geometry IR output', () => {
  const source = compileAnimationSpec(auditedGeometrySpec());
  const result = validate(source);
  assert.equal(result.status, 0, result.stderr);
  assert.match(source, /MoveAlongPath\(obj_rotating_point, obj_unit_circle\)/);
});

test('renderer validator accepts the deterministic rolling-circle cycloid profile', () => {
  const artifacts =
    buildDeterministicCycloidArtifacts('对比摆线与生成它的滚动圆。');
  assert.ok(artifacts);

  const source = compileAnimationSpec(
    composeAnimationSpecFromArtifacts(artifacts)
  );
  const result = validate(source);

  assert.equal(result.status, 0, result.stderr);
  assert.match(source, /ParametricFunction/);
  assert.match(
    source,
    /Transform\(obj_rolling_circle, obj_rolling_circle_mid\.copy\(\)\)/
  );
  assert.match(
    source,
    /Transform\(obj_cycloid_trace, obj_cycloid_trace_full\.copy\(\)\)/
  );
});

test('renderer validator rejects empty scenes, fake 3D, and file reads', () => {
  const empty = validate(`from manim import *
class CurvGScene(Scene):
    def construct(self):
        self.wait(1)
`);
  assert.notEqual(empty.status, 0);
  assert.match(empty.stderr, /does not display/);

  const fakeThreeD = validate(`from manim import *
class CurvGScene(ThreeDScene):
    def construct(self):
        dot = Dot()
        self.play(Create(dot), run_time=1)
`);
  assert.notEqual(fakeThreeD.status, 0);
  assert.match(fakeThreeD.stderr, /genuine 3D/);

  const fileRead = validate(`from manim import *
class CurvGScene(Scene):
    def construct(self):
        image = ImageMobject("/etc/passwd")
        self.add(image)
`);
  assert.notEqual(fileRead.status, 0);
  assert.match(fileRead.stderr, /external path|file-backed/);

  const texRead = validate(`from manim import *
class CurvGScene(Scene):
    def construct(self):
        formula = MathTex(r"\\input{secret}")
        self.play(Write(formula), run_time=1)
`);
  assert.notEqual(texRead.status, 0);
  assert.match(texRead.stderr, /unsafe TeX/);
});

test('renderer timeline analyzer preserves sparse motion and ignores a one-frame black lead-in', () => {
  const script = `
import importlib.util
import json
import numpy as np

spec = importlib.util.spec_from_file_location("curvg_analyzer", ${JSON.stringify(analyzer)})
analyzer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analyzer)

prior = np.zeros((90, 160, 3), dtype=np.uint8)
moving = prior.copy()
moving[:, 80, :] = 160
static_noise = prior.copy()
static_noise[0, 0, :] = 1

segments = []
analyzer.close_segment(segments, 0, 0, 6, 30)
one_frame_ignored = segments == []
analyzer.close_segment(segments, 0, 5, 6, 30)

print(json.dumps({
    "moving_is_frozen": analyzer.frames_are_effectively_frozen(moving, prior),
    "noise_is_frozen": analyzer.frames_are_effectively_frozen(static_noise, prior),
    "one_frame_ignored": one_frame_ignored,
    "retained_segment": segments,
}))
`;
  const result = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout) as {
    moving_is_frozen: boolean;
    noise_is_frozen: boolean;
    one_frame_ignored: boolean;
    retained_segment: Array<[number, number]>;
  };
  assert.equal(output.moving_is_frozen, false);
  assert.equal(output.noise_is_frozen, true);
  assert.equal(output.one_frame_ignored, true);
  assert.deepEqual(output.retained_segment, [[0, 0.2]]);
});

test('renderer QA-repairs low-quality previews before a formal 720p30 render', () => {
  assert.equal(rendererSource.match(/manim -ql --format=mp4/g)?.length, 1);
  assert.equal(rendererSource.match(/manim -qm --format=mp4/g)?.length, 1);
  assert.doesNotMatch(rendererSource, /\/workspace\/final-media/);
  assert.match(rendererSource, /quality: '720p30'/);
  assert.doesNotMatch(rendererSource, /kind: 'visual_review'/);
  assert.equal(rendererSource.match(/kind: 'final_review'/g)?.length, 1);
  assert.match(rendererSource, /preserveBestRenderEvidence/);
  assert.match(rendererSource, /visualQaCandidateRank/);
  assert.match(rendererSource, /deliveryEvidence\.playbackPath/);
  assert.match(rendererSource, /phase: 'preview'/);
  assert.match(rendererSource, /phase: 'final'/);
  assert.match(rendererSource, /approvedCode: selectedCode/);
});
