import assert from 'node:assert/strict';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  parseRingEscapeAudioPlan,
  type RingEscapeAudioPlan,
} from '../src/lib/simulation-audio';

const pipeline = join(process.cwd(), 'renderer', 'audio_pipeline.py');
const samplesPerFrame = 1_600;

function makeTempDirectory(prefix: string): string {
  // macOS exposes /var as a symlink to /private/var. The renderer deliberately
  // rejects noncanonical parents, so resolve the test directory before use.
  return realpathSync(mkdtempSync(join(tmpdir(), prefix)));
}

function fixturePlan(): RingEscapeAudioPlan {
  return parseRingEscapeAudioPlan({
    schemaVersion: 1,
    family: 'ring_escape',
    fps: 30,
    sampleRate: 48_000,
    channels: 2,
    durationFrames: 240,
    cues: [
      {
        eventSeq: 0,
        kind: 'spawn',
        frame: 0,
        sampleIndex: 0,
        gain: 0.18,
        frequency: 220,
        durationMs: 120,
      },
      {
        eventSeq: 1,
        kind: 'contact_enter',
        frame: 72,
        sampleIndex: 72 * samplesPerFrame,
        gain: 0.42,
        frequency: 880,
        durationMs: 90,
      },
      {
        eventSeq: 2,
        kind: 'contact_exit',
        frame: 104,
        sampleIndex: 104 * samplesPerFrame,
        gain: 0.24,
        frequency: 440,
        durationMs: 70,
      },
      {
        eventSeq: 3,
        kind: 'escape',
        frame: 214,
        sampleIndex: 214 * samplesPerFrame,
        gain: 0.58,
        frequency: 1_320,
        durationMs: 240,
      },
    ],
  });
}

function run(
  executable: string,
  args: string[],
  options: { cwd?: string } = {}
): SpawnSyncReturns<string> {
  return spawnSync(executable, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

function parseReport(result: SpawnSyncReturns<string>) {
  const source =
    result.status === 0 ? result.stdout : result.stdout || result.stderr;
  return JSON.parse(source.trim()) as {
    status: string;
    sampleCount?: number;
    sha256?: string;
    metrics?: {
      sampleCount: number;
      globalLagSamples: number;
      globalCorrelation: number;
      reference: { peak: number; rms: number; clippingSamples: number };
      decoded: { peak: number; rms: number; clippingSamples: number };
    };
    cues?: Array<{
      status: string;
      onsetErrorSamples: number;
      durationErrorSamples: number;
      correlation: number;
    }>;
  };
}

function makeShiftedPcm(source: Buffer, frames: number): Buffer {
  const shiftBytes = frames * samplesPerFrame * 2 * 2;
  assert.ok(shiftBytes < source.length);
  return Buffer.concat([
    Buffer.alloc(shiftBytes),
    source.subarray(0, -shiftBytes),
  ]);
}

test('audio synthesizer is byte-stable and emits exact canonical stereo WAV', () => {
  const directory = makeTempDirectory('curvg-audio-synth-');
  try {
    const planPath = join(directory, 'audio-plan.json');
    const firstPath = join(directory, 'first.wav');
    const secondPath = join(directory, 'second.wav');
    writeFileSync(planPath, JSON.stringify(fixturePlan()), 'utf8');

    const first = run('python3', [
      pipeline,
      'synth',
      '--plan',
      planPath,
      '--output',
      firstPath,
    ]);
    assert.equal(first.status, 0, first.stderr);
    const second = run('python3', [
      pipeline,
      'synth',
      '--plan',
      planPath,
      '--output',
      secondPath,
    ]);
    assert.equal(second.status, 0, second.stderr);

    const firstWav = readFileSync(firstPath);
    const secondWav = readFileSync(secondPath);
    assert.deepEqual(firstWav, secondWav);
    assert.equal(firstWav.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(firstWav.subarray(8, 16).toString('ascii'), 'WAVEfmt ');
    assert.equal(firstWav.readUInt16LE(20), 1);
    assert.equal(firstWav.readUInt16LE(22), 2);
    assert.equal(firstWav.readUInt32LE(24), 48_000);
    assert.equal(firstWav.readUInt16LE(34), 16);
    assert.equal(firstWav.readUInt32LE(40), 240 * samplesPerFrame * 4);
    assert.equal(firstWav.length, 44 + 240 * samplesPerFrame * 4);

    const report = parseReport(first);
    assert.equal(report.status, 'pass');
    assert.equal(report.sampleCount, 240 * samplesPerFrame);
    assert.equal(
      report.sha256,
      createHash('sha256').update(firstWav).digest('hex')
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('audio pipeline rejects noncanonical paths and extra plan fields', () => {
  const directory = makeTempDirectory('curvg-audio-schema-');
  try {
    const invalidPlan = { ...fixturePlan(), unexpected: true };
    const planPath = join(directory, 'audio-plan.json');
    const wavPath = join(directory, 'audio.wav');
    writeFileSync(planPath, JSON.stringify(invalidPlan), 'utf8');

    const invalid = run('python3', [
      pipeline,
      'synth',
      '--plan',
      planPath,
      '--output',
      wavPath,
    ]);
    assert.notEqual(invalid.status, 0);
    assert.match(invalid.stderr, /fields do not match schema/);

    const relative = run(
      'python3',
      [pipeline, 'synth', '--plan', 'audio-plan.json', '--output', wavPath],
      { cwd: directory }
    );
    assert.notEqual(relative.status, 0);
    assert.match(relative.stderr, /path must be absolute/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('AAC round-trip passes analysis; one-frame drift passes and two-frame drift fails', () => {
  const ffmpeg = run('ffmpeg', ['-version']);
  assert.equal(ffmpeg.status, 0, 'ffmpeg is required for renderer audio QA');

  const directory = makeTempDirectory('curvg-audio-analyze-');
  try {
    const plan = fixturePlan();
    const totalSamples = plan.durationFrames * samplesPerFrame;
    const planPath = join(directory, 'audio-plan.json');
    const wavPath = join(directory, 'audio.wav');
    const videoPath = join(directory, 'aac-roundtrip.mp4');
    const pcmPath = join(directory, 'decoded-audio.pcm');
    const oneFramePath = join(directory, 'shift-one.pcm');
    const twoFramesPath = join(directory, 'shift-two.pcm');
    writeFileSync(planPath, JSON.stringify(plan), 'utf8');

    const synth = run('python3', [
      pipeline,
      'synth',
      '--plan',
      planPath,
      '--output',
      wavPath,
    ]);
    assert.equal(synth.status, 0, synth.stderr);

    const mux = run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=c=black:s=64x64:r=30:d=8',
      '-i',
      wavPath,
      '-c:v',
      'mpeg4',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      '-y',
      videoPath,
    ]);
    assert.equal(mux.status, 0, mux.stderr);

    const decode = run('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      videoPath,
      '-map',
      '0:a:0',
      '-af',
      `apad=whole_len=${totalSamples},atrim=end_sample=${totalSamples}`,
      '-f',
      's16le',
      '-ar',
      '48000',
      '-ac',
      '2',
      '-y',
      pcmPath,
    ]);
    assert.equal(decode.status, 0, decode.stderr);

    const analyzed = run('python3', [
      pipeline,
      'analyze',
      '--plan',
      planPath,
      '--reference',
      wavPath,
      '--pcm',
      pcmPath,
    ]);
    assert.equal(analyzed.status, 0, analyzed.stderr || analyzed.stdout);
    const report = parseReport(analyzed);
    assert.equal(report.status, 'pass');
    assert.equal(report.metrics?.sampleCount, totalSamples);
    assert.equal(report.metrics?.reference.clippingSamples, 0);
    assert.equal(report.metrics?.decoded.clippingSamples, 0);
    assert.ok((report.metrics?.reference.peak ?? 0) > 0.5);
    assert.ok((report.metrics?.decoded.rms ?? 0) > 0.02);
    assert.ok((report.metrics?.globalCorrelation ?? 0) >= 0.72);
    assert.equal(report.cues?.length, plan.cues.length);
    for (const cue of report.cues ?? []) {
      assert.equal(cue.status, 'pass');
      assert.ok(Math.abs(cue.onsetErrorSamples) <= samplesPerFrame);
      assert.ok(Math.abs(cue.durationErrorSamples) <= samplesPerFrame);
      assert.ok(cue.correlation >= 0.68);
    }

    const decodedPcm = readFileSync(pcmPath);
    writeFileSync(oneFramePath, makeShiftedPcm(decodedPcm, 1));
    writeFileSync(twoFramesPath, makeShiftedPcm(decodedPcm, 2));

    const oneFrame = run('python3', [
      pipeline,
      'analyze',
      '--plan',
      planPath,
      '--reference',
      wavPath,
      '--pcm',
      oneFramePath,
    ]);
    assert.equal(oneFrame.status, 0, oneFrame.stderr || oneFrame.stdout);
    assert.equal(parseReport(oneFrame).status, 'pass');

    const twoFrames = run('python3', [
      pipeline,
      'analyze',
      '--plan',
      planPath,
      '--reference',
      wavPath,
      '--pcm',
      twoFramesPath,
    ]);
    assert.notEqual(twoFrames.status, 0);
    const failed = parseReport(twoFrames);
    assert.equal(failed.status, 'fail');
    assert.ok(
      Math.abs(failed.metrics?.globalLagSamples ?? 0) > samplesPerFrame
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
