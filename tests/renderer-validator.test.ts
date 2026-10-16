import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

import {
  buildDeterministicCycloidArtifacts,
  buildDeterministicHeartCurveArtifacts,
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

type RenderedVideoMetadataParser = (
  value: string,
  deliveryContract?: {
    frame: '16:9' | '9:16';
    durationSeconds: number;
    productionMode: 'explainer' | 'simulation_short';
    audioPlan?: Record<string, unknown>;
  }
) => unknown;

function loadRenderedVideoMetadataParser(): RenderedVideoMetadataParser {
  const firstHelper = rendererSource.indexOf('function isRecord(');
  const evidenceBuilder = rendererSource.indexOf(
    'async function prepareRenderEvidence('
  );
  assert.notEqual(firstHelper, -1);
  assert.notEqual(evidenceBuilder, -1);
  const sizeStart = rendererSource.indexOf('export function deliverySize(');
  const sizeEnd = rendererSource.indexOf('export function deliveryQuality(');
  assert.notEqual(sizeStart, -1);
  const helperSource = `${rendererSource
    .slice(sizeStart, sizeEnd)
    .replace('export function', 'function')}\n${rendererSource
    .slice(firstHelper, evidenceBuilder)
    .replace(/throw new NonRetryableRenderError/g, 'throw new Error')}`;
  const javascript = ts.transpileModule(
    `${helperSource}\nreturn parseRenderedVideoMetadata;`,
    {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }
  ).outputText;
  return new Function(
    'TARGET_VIDEO_FRAME_RATE',
    'VIDEO_FRAME_RATE_TOLERANCE',
    'MAX_VIDEO_DURATION_SECONDS',
    javascript
  )(30, 0.1, 300) as RenderedVideoMetadataParser;
}

function ffprobeMetadata(
  overrides: Record<string, unknown> = {},
  extraStreams: Array<Record<string, unknown>> = [],
  format: Record<string, unknown> = { duration: '10.010000' }
) {
  return JSON.stringify({
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264',
        pix_fmt: 'yuv420p',
        width: 1920,
        height: 1080,
        avg_frame_rate: '30000/1001',
        r_frame_rate: '30/1',
        nb_frames: '300',
        nb_read_frames: '300',
        ...overrides,
      },
      ...extraStreams,
    ],
    format,
  });
}

const explainerDelivery = {
  frame: '16:9' as const,
  durationSeconds: 10.01,
  productionMode: 'explainer' as const,
};

const simulationDelivery = {
  frame: '16:9' as const,
  durationSeconds: 10.01,
  productionMode: 'simulation_short' as const,
  audioPlan: {},
};

const compliantAacStream = {
  codec_type: 'audio',
  codec_name: 'aac',
  sample_rate: '48000',
  channels: 2,
};

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

test('renderer validator applies aspect-aware text safe zones', () => {
  const portrait = validate(`from manim import *
config.frame_width = 9
config.frame_height = 16
class CurvGScene(Scene):
    def construct(self):
        title = Text("TITLE")
        title.move_to([0, 5.7, 0])
        status = Text("STATUS")
        status.move_to([0, -4.92, 0])
        self.play(FadeIn(title), FadeIn(status), run_time=1)
`);
  assert.equal(portrait.status, 0, portrait.stderr);

  const portraitUnsafe = validate(`from manim import *
config.frame_width = 9
config.frame_height = 16
class CurvGScene(Scene):
    def construct(self):
        title = Text("TITLE")
        title.move_to([0, 6.5, 0])
        self.play(FadeIn(title), run_time=1)
`);
  assert.notEqual(portraitUnsafe.status, 0);
  assert.match(portraitUnsafe.stderr, /outside the safe frame/);

  const portraitUnsafeBottom = validate(`from manim import *
config.frame_width = 9
config.frame_height = 16
class CurvGScene(Scene):
    def construct(self):
        status = Text("STATUS")
        status.move_to([0, -5.7, 0])
        self.play(FadeIn(status), run_time=1)
`);
  assert.notEqual(portraitUnsafeBottom.status, 0);
  assert.match(portraitUnsafeBottom.stderr, /outside the safe frame/);

  const landscapeLegacyLimit = validate(`from manim import *
config.frame_width = 16
config.frame_height = 9
class CurvGScene(Scene):
    def construct(self):
        title = Text("TITLE")
        title.move_to([0, 3.5, 0])
        self.play(FadeIn(title), run_time=1)
`);
  assert.notEqual(landscapeLegacyLimit.status, 0);
  assert.match(landscapeLegacyLimit.stderr, /outside the safe frame/);
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

test('renderer validator accepts the verified heart-curve profile', () => {
  const artifacts =
    buildDeterministicHeartCurveArtifacts('用 xy 坐标轴画一个爱心');
  assert.ok(artifacts);
  const source = compileAnimationSpec(
    composeAnimationSpecFromArtifacts(artifacts)
  );
  const result = validate(source);

  assert.equal(result.status, 0, result.stderr);
  assert.match(source, /obj_heart_curve = ParametricFunction/);
  assert.match(source, /MoveAlongPath\(obj_heart_point, obj_heart_curve\)/);
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

test('renderer validator blocks NumPy native FFI bridges', () => {
  const chainedCtypes = validate(`from manim import *
import numpy as np
class CurvGScene(Scene):
    def construct(self):
        dot = Dot()
        np.ctypeslib.ctypes.CDLL(None).getpid()
        self.play(FadeIn(dot), run_time=1)
`);
  assert.notEqual(chainedCtypes.status, 0);
  assert.match(chainedCtypes.stderr, /blocked native bridge/);

  const importedCtypes = validate(`from manim import *
from numpy.ctypeslib import ctypes
class CurvGScene(Scene):
    def construct(self):
        dot = Dot()
        ctypes.CDLL(None).getpid()
        self.play(FadeIn(dot), run_time=1)
`);
  assert.notEqual(importedCtypes.status, 0);
  assert.match(importedCtypes.stderr, /native bridge/);

  const indirectOs = validate(`from manim import *
import numpy as np
class CurvGScene(Scene):
    def construct(self):
        dot = Dot()
        np.lib._npyio_impl.os.system("true")
        self.play(FadeIn(dot), run_time=1)
`);
  assert.notEqual(indirectOs.status, 0);
  assert.match(indirectOs.stderr, /blocked system namespace/);

  const dataSourceOs = validate(`from manim import *
import numpy as np
class CurvGScene(Scene):
    def construct(self):
        dot = Dot()
        bridge = np.lib._datasource.os
        bridge.system("true")
        self.play(FadeIn(dot), run_time=1)
`);
  assert.notEqual(dataSourceOs.status, 0);
  assert.match(dataSourceOs.stderr, /blocked system namespace/);
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

test('renderer sizes preview deliveries at 720p with a burned-in watermark', () => {
  assert.match(
    rendererSource,
    /body\.delivery === 'preview' \? 'preview' : 'hd'/
  );
  assert.match(rendererSource, /deliveryContract\?\.delivery === 'preview'/);
  assert.match(
    rendererSource,
    /-vf "\$\{watermarkFilter\(deliveryContract\.frame\)\}"/
  );
  assert.match(rendererSource, /text='CurvG\.com/);
  assert.match(rendererSource, /DejaVuSans-Bold\.ttf/);
});

test('renderer QA-repairs previews before an independently reviewed 1080p30 delivery', () => {
  assert.equal(rendererSource.match(/manim -ql --format=mp4/g)?.length, 1);
  assert.equal(
    rendererSource.match(/manim -qh --fps 30 --resolution/g)?.length,
    1
  );
  assert.doesNotMatch(rendererSource, /\/workspace\/final-media/);
  assert.match(rendererSource, /quality: deliveryQuality\(job\.delivery\)/);
  assert.match(
    rendererSource,
    /delivery === 'preview' \? '720p30-watermarked' : '1080p30'/
  );
  assert.doesNotMatch(rendererSource, /kind: 'visual_review'/);
  assert.equal(rendererSource.match(/kind: 'final_review'/g)?.length, 1);
  assert.equal(rendererSource.match(/kind: 'delivery_review'/g)?.length, 1);
  assert.match(rendererSource, /function applyRepairResult/);
  assert.match(rendererSource, /job\.frame = gate\.frame/);
  assert.match(rendererSource, /job\.durationSeconds = gate\.durationSeconds/);
  assert.match(rendererSource, /function sourceWithRenderContract/);
  assert.match(rendererSource, /phase: 'preview'/);
  assert.match(rendererSource, /phase: 'delivery'/);
  assert.match(rendererSource, /config\.pixel_width = \$\{pixelWidth\}/);
  assert.match(rendererSource, /config\.frame_rate = \$\{frameRate\}/);
  assert.match(rendererSource, /function isReusableDeliveryReport/);
  assert.match(rendererSource, /deliveryReview: 'approved'/);
  assert.match(rendererSource, /deliveryReviewDigest: videoDigest/);
  assert.match(rendererSource, /videoDigest: deliveryEvidence\.videoDigest/);
  assert.match(rendererSource, /videoDigest,/);
  assert.match(
    rendererSource,
    /runDigest: job\.simulationArtifacts\.runDigest/
  );
  assert.match(rendererSource, /V2_RENDER_PROTOCOL = 'curvg-renderer\/v2'/);
  assert.match(
    rendererSource,
    /existingVideo\.customMetadata\.deliveryReview === 'approved'/
  );
  assert.match(
    rendererSource,
    /existingContactSheet\?\.customMetadata\?\.phase === 'final'/
  );
  assert.match(rendererSource, /preserveBestRenderEvidence/);
  assert.match(rendererSource, /visualQaCandidateRank/);
  assert.match(rendererSource, /deliveryEvidence\.playbackPath/);
  assert.match(rendererSource, /phase: 'preview'/);
  assert.match(rendererSource, /phase: 'final'/);
  assert.match(rendererSource, /approvedCode: selectedCode/);
  assert.match(
    rendererSource,
    /productionMode: 'simulation_short'[\s\S]*?audioPlan: ringEscapeAudioPlanSchema\.parse/
  );
});

test('renderer keeps previews silent and wires deterministic audio only into formal simulation delivery', () => {
  assert.match(
    rendererSource,
    /python3 \/opt\/curvg\/audio_pipeline\.py synth --plan \/workspace\/audio-plan\.json --output \/workspace\/audio\.wav/
  );
  assert.match(
    rendererSource,
    /-c:v copy -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags \+faststart/
  );
  assert.match(
    rendererSource,
    /python3 \/opt\/curvg\/audio_pipeline\.py analyze --plan \/workspace\/audio-plan\.json --reference \/workspace\/audio\.wav --pcm \/workspace\/audio-decoded\.pcm/
  );
  const simulationBranch = rendererSource.slice(
    rendererSource.indexOf(
      "if (deliveryContract?.productionMode === 'simulation_short')"
    ),
    rendererSource.indexOf(
      '} else ',
      rendererSource.indexOf(
        "if (deliveryContract?.productionMode === 'simulation_short')"
      )
    )
  );
  assert.doesNotMatch(simulationBranch, / -an /);
  assert.match(rendererSource, /-map 0:v:0 -an -c copy/);
});

test('renderer bounds quality-gate and callback requests independently', () => {
  assert.match(rendererSource, /const QUALITY_GATE_TIMEOUT_MS = 120_000;/);
  assert.match(rendererSource, /const CALLBACK_TIMEOUT_MS = 30_000;/);

  const qualityGateSource = rendererSource.slice(
    rendererSource.indexOf('async function requestQualityGate('),
    rendererSource.indexOf('async function notify(')
  );
  const notifySource = rendererSource.slice(
    rendererSource.indexOf('async function notify('),
    rendererSource.indexOf('async function notifyStage(')
  );
  assert.match(
    qualityGateSource,
    /signal: AbortSignal\.timeout\(QUALITY_GATE_TIMEOUT_MS\)/
  );
  assert.doesNotMatch(qualityGateSource, /CALLBACK_TIMEOUT_MS/);
  assert.match(
    notifySource,
    /signal: AbortSignal\.timeout\(CALLBACK_TIMEOUT_MS\)/
  );
  assert.doesNotMatch(notifySource, /QUALITY_GATE_TIMEOUT_MS/);
});

test('renderer verifies a machine-readable MP4 delivery contract', () => {
  assert.match(
    rendererSource,
    /ffprobe -v error -count_frames -show_entries format=duration:stream=/
  );
  assert.match(
    rendererSource,
    /codec_type,codec_name,pix_fmt,width,height,avg_frame_rate,r_frame_rate,nb_frames,nb_read_frames,sample_rate,channels -of json/
  );
  assert.doesNotMatch(rendererSource, /-of default=noprint_wrappers=1:nokey=1/);

  assert.match(rendererSource, /videoStreams\.length !== 1/);
  assert.match(rendererSource, /stream\.codec_name !== 'h264'/);
  assert.match(rendererSource, /stream\.pix_fmt !== 'yuv420p'/);
  assert.match(
    rendererSource,
    /width: expectedWidth, height: expectedHeight \} = deliverySize\(\s*deliveryContract\.frame,\s*deliveryContract\.delivery\s*\)/
  );
  assert.match(
    rendererSource,
    /delivery === 'preview' \? \[1280, 720\] : \[1920, 1080\]/
  );
  assert.match(rendererSource, /TARGET_VIDEO_FRAME_RATE = 30/);
  assert.match(rendererSource, /VIDEO_FRAME_RATE_TOLERANCE = 0\.1/);
  assert.match(rendererSource, /duration <= 0/);
  assert.match(rendererSource, /duration > MAX_VIDEO_DURATION_SECONDS/);
  assert.match(rendererSource, /positiveInteger\(stream\.nb_read_frames\)/);
  assert.match(rendererSource, /positiveInteger\(stream\.nb_frames\)/);
  assert.match(rendererSource, /frameCount,/);
  assert.match(
    rendererSource,
    /JSON\.stringify\(\{ \.\.\.visualQa, media, audio: audioQa \}\)/
  );
});

test('renderer parses compliant landscape and portrait ffprobe JSON', () => {
  const parseMetadata = loadRenderedVideoMetadataParser();
  assert.deepEqual(parseMetadata(ffprobeMetadata(), explainerDelivery), {
    codec: 'h264',
    pixelFormat: 'yuv420p',
    width: 1920,
    height: 1080,
    frameRate: 30000 / 1001,
    frameCount: 300,
    durationSeconds: 10.01,
    audio: null,
  });
  assert.deepEqual(
    parseMetadata(
      ffprobeMetadata(
        {
          width: 1080,
          height: 1920,
          avg_frame_rate: 'N/A',
          r_frame_rate: '30/1',
          nb_read_frames: 'N/A',
          nb_frames: '300',
        },
        [compliantAacStream]
      ),
      { ...simulationDelivery, frame: '9:16' }
    ),
    {
      codec: 'h264',
      pixelFormat: 'yuv420p',
      width: 1080,
      height: 1920,
      frameRate: 30,
      frameCount: 300,
      durationSeconds: 10.01,
      audio: { codec: 'aac', sampleRate: 48_000, channels: 2 },
    }
  );
});

test('renderer rejects ffprobe metadata outside the MP4 contract', () => {
  const parseMetadata = loadRenderedVideoMetadataParser();
  const invalid: Array<[string, () => string, RegExp]> = [
    ['JSON', () => '{', /not valid JSON/],
    ['codec', () => ffprobeMetadata({ codec_name: 'hevc' }), /codec/],
    ['pixel format', () => ffprobeMetadata({ pix_fmt: 'yuv444p' }), /pixel/],
    [
      'resolution',
      () => ffprobeMetadata({ width: 1280, height: 720 }),
      /resolution/,
    ],
    [
      'frame rate',
      () => ffprobeMetadata({ avg_frame_rate: '60/1' }),
      /frame rate/,
    ],
    [
      'frame count',
      () => ffprobeMetadata({ nb_read_frames: 'N/A', nb_frames: 'N/A' }),
      /frame count/,
    ],
    [
      'video stream count',
      () =>
        ffprobeMetadata({}, [
          {
            codec_type: 'video',
            codec_name: 'h264',
            pix_fmt: 'yuv420p',
            width: 1920,
            height: 1080,
            avg_frame_rate: '30/1',
            nb_read_frames: '300',
          },
        ]),
      /exactly one video stream/,
    ],
    [
      'duration',
      () =>
        JSON.stringify({
          ...JSON.parse(ffprobeMetadata()),
          format: { duration: '0' },
        }),
      /duration/,
    ],
  ];

  for (const [label, metadata, expected] of invalid) {
    assert.throws(
      () => parseMetadata(metadata(), explainerDelivery),
      expected,
      label
    );
  }
});

test('renderer permits low-resolution previews but enforces delivery duration and frame count', () => {
  const parseMetadata = loadRenderedVideoMetadataParser();
  assert.deepEqual(
    parseMetadata(
      ffprobeMetadata({
        width: 854,
        height: 480,
        avg_frame_rate: '15/1',
        r_frame_rate: '15/1',
        nb_read_frames: '150',
        nb_frames: '150',
      })
    ),
    {
      codec: 'h264',
      pixelFormat: 'yuv420p',
      width: 854,
      height: 480,
      frameRate: 15,
      frameCount: 150,
      durationSeconds: 10.01,
      audio: null,
    }
  );
  assert.throws(
    () =>
      parseMetadata(ffprobeMetadata(), {
        ...explainerDelivery,
        durationSeconds: 12,
      }),
    /duration does not match/
  );
  assert.throws(
    () =>
      parseMetadata(
        ffprobeMetadata({ nb_read_frames: '250' }),
        explainerDelivery
      ),
    /frame count/
  );
  assert.throws(
    () =>
      parseMetadata(
        ffprobeMetadata({ nb_read_frames: '304', nb_frames: '304' }, [], {
          duration: '10.133333',
        }),
        explainerDelivery
      ),
    /duration does not match/
  );
});

test('renderer enforces the formal audio contract by production mode', () => {
  const parseMetadata = loadRenderedVideoMetadataParser();
  assert.throws(
    () => parseMetadata(ffprobeMetadata(), simulationDelivery),
    /exactly one audio stream/
  );
  assert.throws(
    () =>
      parseMetadata(
        ffprobeMetadata({}, [{ ...compliantAacStream, codec_name: 'mp3' }]),
        simulationDelivery
      ),
    /codec must be AAC/
  );
  assert.throws(
    () =>
      parseMetadata(
        ffprobeMetadata({}, [{ ...compliantAacStream, sample_rate: '44100' }]),
        simulationDelivery
      ),
    /sample rate/
  );
  assert.throws(
    () =>
      parseMetadata(
        ffprobeMetadata({}, [{ ...compliantAacStream, channels: 1 }]),
        simulationDelivery
      ),
    /two channels/
  );
  assert.throws(
    () =>
      parseMetadata(
        ffprobeMetadata({}, [compliantAacStream]),
        explainerDelivery
      ),
    /explainer video must not contain an audio stream/
  );
});
