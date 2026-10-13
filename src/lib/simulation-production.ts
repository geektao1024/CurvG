import {
  adaptRingEscapeSolverResult,
  buildSimulationRunManifest,
  digestUtf8Text,
  parseAnimationSimulationScenarioConfig,
  stableCanonicalJson,
  type AnimationSimulationEvidence,
  type AnimationSimulationScenarioConfig,
  type RingEscapeScenarioConfig,
} from './animation-simulation';
import {
  buildRingEscapeReplayPlan,
  compileRingEscapeSimulationShort,
} from './manim-simulation-compiler';
import {
  buildRingEscapeAudioPlan,
  digestRingEscapeAudioPlan,
  serializeRingEscapeAudioPlan,
} from './simulation-audio';
import {
  solveRingEscape,
  type RingEscapeResult,
} from './simulation-ring-escape';

export interface AnimationSimulationArtifactBundle {
  eventsJsonl: string;
  stateTrackJson: string;
  runManifestJson: string;
  audioPlanJson: string;
}

export interface VerifiedRingEscapeProduction {
  scenario: RingEscapeScenarioConfig;
  result: RingEscapeResult;
  code: string;
  evidence: AnimationSimulationEvidence;
  artifacts: AnimationSimulationArtifactBundle;
}

function asRingEscapeScenario(
  value: AnimationSimulationScenarioConfig | unknown
): RingEscapeScenarioConfig {
  const scenario = parseAnimationSimulationScenarioConfig(value);
  if (scenario.family !== 'ring_escape') {
    throw new Error(`Unsupported simulation family: ${scenario.family}`);
  }
  return scenario;
}

/**
 * Executes the trusted solver twice and refuses production unless the full
 * canonical result is byte-for-byte stable and reaches `escaped`.
 */
export async function buildVerifiedRingEscapeProduction(params: {
  scenario: AnimationSimulationScenarioConfig | unknown;
  title?: string;
  durationSeconds?: number;
}): Promise<VerifiedRingEscapeProduction> {
  const scenario = asRingEscapeScenario(params.scenario);
  const first = solveRingEscape(scenario.solverConfig);
  const second = solveRingEscape(scenario.solverConfig);
  if (
    first.digest !== second.digest ||
    stableCanonicalJson(first) !== stableCanonicalJson(second)
  ) {
    throw new Error('Simulation determinism check failed');
  }
  if (first.finalState.terminalReason !== 'escaped') {
    throw new Error(
      `Simulation did not reach the required escaped terminal state (${first.finalState.terminalReason})`
    );
  }
  const run = await adaptRingEscapeSolverResult({ scenario, result: first });
  if (
    run.summary.terminalReason !== 'escaped' ||
    run.summary.counts.escape !== 1 ||
    run.summary.counts.terminal !== 1
  ) {
    throw new Error('Simulation canonical event log failed terminal checks');
  }
  // Compile before sealing the manifest: presentation inputs (including the
  // title) change the exact trusted Python and therefore the run identity.
  const code = compileRingEscapeSimulationShort(first, {
    title: params.title,
    durationSeconds: params.durationSeconds,
  });
  const compiledSourceDigest = await digestUtf8Text(code);
  const replay = buildRingEscapeReplayPlan(first, {
    durationSeconds: params.durationSeconds,
  });
  const audioPlan = buildRingEscapeAudioPlan({
    events: run.events,
    eventFrameMap: replay.eventFrames.map(({ sequence, type, frame }) => ({
      seq: sequence,
      kind: type,
      frame,
    })),
    durationFrames: replay.timeline.totalFrames,
  });
  const audioPlanJson = serializeRingEscapeAudioPlan(audioPlan);
  const audioPlanDigest = await digestRingEscapeAudioPlan(audioPlan);
  const manifest = await buildSimulationRunManifest({
    scenario,
    result: first,
    compiledSourceDigest,
    audioPlanDigest,
  });
  if (manifest.summary.terminalReason !== 'escaped') {
    throw new Error('Simulation manifest does not prove an escaped run');
  }

  const artifacts: AnimationSimulationArtifactBundle = {
    eventsJsonl: `${run.events.map((event) => JSON.stringify(event)).join('\n')}\n`,
    stateTrackJson: JSON.stringify(run.checkpoints),
    runManifestJson: JSON.stringify(manifest),
    audioPlanJson,
  };
  return {
    scenario,
    result: first,
    code,
    artifacts,
    evidence: {
      schemaVersion: 1,
      family: 'ring_escape',
      solver: 'ring_escape/v1',
      seed: scenario.solverConfig.seed,
      fixedDt: scenario.solverConfig.fixedDt,
      substeps: scenario.solverConfig.substeps,
      terminalReason: 'escaped',
      simulatedDuration: run.summary.simulatedDuration,
      eventCount: run.summary.eventCount,
      checkpointCount: run.checkpoints.length,
      solverDigest: first.digest,
      compiledSourceDigest,
      audioPlanDigest,
      manifest,
    },
  };
}
