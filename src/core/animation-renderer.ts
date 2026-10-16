import { simulationRunManifestSchema } from '@/lib/animation-simulation';
import {
  digestRingEscapeAudioPlan,
  parseRingEscapeAudioPlan,
} from '@/lib/simulation-audio';

export interface AnimationSimulationRenderArtifacts {
  eventsJsonl: string;
  stateTrackJson: string;
  runManifestJson: string;
  audioPlanJson: string;
}

export const ANIMATION_SIMULATION_ARTIFACT_BYTE_LIMITS = {
  eventsJsonl: 128 * 1024,
  stateTrackJson: 512 * 1024,
  runManifestJson: 64 * 1024,
  audioPlanJson: 32 * 1024,
  total: 800 * 1024,
} as const;

export interface AnimationRenderRequest {
  animationId: string;
  code: string;
  callbackUrl: string;
  qualityGateUrl: string;
  frame: '16:9' | '9:16';
  durationSeconds: number;
  productionMode?: 'explainer' | 'simulation_short';
  /** Stable submission identity for timeout-safe renderer retries. */
  idempotencyKey: string;
  /**
   * preview: 720p with a CurvG watermark (free renders); hd: clean 1080p
   * (paid). Defaults to hd.
   */
  delivery?: 'preview' | 'hd';
  /** Built from a verified template: the renderer skips its repair pass. */
  trusted?: boolean;
  simulationArtifacts?: AnimationSimulationRenderArtifacts;
  signal?: AbortSignal;
}

export interface AnimationRenderResult {
  jobId: string;
  status: string;
  provider: string;
  protocolVersion?: 'curvg-renderer/v2';
}

export interface AnimationRenderer {
  readonly name: string;
  render(request: AnimationRenderRequest): Promise<AnimationRenderResult>;
}

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

async function validateSimulationArtifactEnvelope(
  productionMode: 'explainer' | 'simulation_short',
  artifacts: AnimationSimulationRenderArtifacts | undefined
) {
  if (productionMode === 'explainer') {
    if (artifacts) {
      throw new Error('Explainer renders cannot include simulation artifacts');
    }
    return;
  }
  if (!artifacts) {
    throw new Error('Simulation render artifacts are required');
  }
  const sizes = {
    eventsJsonl: utf8Length(artifacts.eventsJsonl),
    stateTrackJson: utf8Length(artifacts.stateTrackJson),
    runManifestJson: utf8Length(artifacts.runManifestJson),
    audioPlanJson: utf8Length(artifacts.audioPlanJson),
  };
  for (const [name, size] of Object.entries(sizes)) {
    const limit =
      ANIMATION_SIMULATION_ARTIFACT_BYTE_LIMITS[name as keyof typeof sizes];
    if (size === 0 || size > limit) {
      throw new Error(`Simulation ${name} exceeds its byte limit`);
    }
  }
  if (
    Object.values(sizes).reduce((total, size) => total + size, 0) >
    ANIMATION_SIMULATION_ARTIFACT_BYTE_LIMITS.total
  ) {
    throw new Error('Simulation artifacts exceed their total byte limit');
  }
  let manifestValue: unknown;
  let audioPlanValue: unknown;
  try {
    manifestValue = JSON.parse(artifacts.runManifestJson) as unknown;
    audioPlanValue = JSON.parse(artifacts.audioPlanJson) as unknown;
  } catch {
    throw new Error('Simulation manifest or audio plan is invalid JSON');
  }
  const manifest = simulationRunManifestSchema.safeParse(manifestValue);
  if (!manifest.success) {
    throw new Error('Simulation run manifest is invalid');
  }
  let audioPlan;
  try {
    audioPlan = parseRingEscapeAudioPlan(audioPlanValue);
  } catch {
    throw new Error('Simulation audio plan is invalid');
  }
  if (
    (await digestRingEscapeAudioPlan(audioPlan)) !==
    manifest.data.audioPlanDigest
  ) {
    throw new Error('Simulation audio plan digest verification failed');
  }
}

export class HttpAnimationRenderer implements AnimationRenderer {
  readonly name = 'cloudflare-sandbox';
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: { baseUrl: string; token: string }) {
    const url = new URL(config.baseUrl.replace(/\/+$/, ''));
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Renderer URL must use HTTP or HTTPS');
    }
    if (!config.token.trim()) throw new Error('Renderer token is required');
    this.baseUrl = url.toString().replace(/\/+$/, '');
    this.token = config.token.trim();
  }

  async render(
    request: AnimationRenderRequest
  ): Promise<AnimationRenderResult> {
    const productionMode = request.productionMode || 'explainer';
    if (!/^[a-f0-9]{64}$/.test(request.idempotencyKey)) {
      throw new Error('Renderer idempotency key is invalid');
    }
    await validateSimulationArtifactEnvelope(
      productionMode,
      request.simulationArtifacts
    );
    const response = await fetch(`${this.baseUrl}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        animationId: request.animationId,
        code: request.code,
        callbackUrl: request.callbackUrl,
        qualityGateUrl: request.qualityGateUrl,
        frame: request.frame,
        durationSeconds: request.durationSeconds,
        productionMode,
        idempotencyKey: request.idempotencyKey,
        ...(request.simulationArtifacts
          ? { simulationArtifacts: request.simulationArtifacts }
          : {}),
        delivery: request.delivery || 'hd',
        ...(request.trusted ? { trusted: true } : {}),
        format: 'mp4',
        quality: request.delivery === 'preview' ? '720p30' : '1080p30',
      }),
      signal: request.signal
        ? AbortSignal.any([request.signal, AbortSignal.timeout(30_000)])
        : AbortSignal.timeout(30_000),
    });
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      const message =
        typeof data.error === 'string'
          ? data.error
          : `Renderer request failed (${response.status})`;
      throw new Error(message);
    }
    const jobId = typeof data.jobId === 'string' ? data.jobId : '';
    if (!/^[A-Za-z0-9-]{1,80}$/.test(jobId)) {
      throw new Error('Renderer returned an invalid job ID');
    }
    const status = typeof data.status === 'string' ? data.status : 'queued';
    if (!['queued', 'rendering'].includes(status)) {
      throw new Error('Renderer returned an invalid job status');
    }
    const protocolVersion =
      data.protocolVersion === 'curvg-renderer/v2'
        ? data.protocolVersion
        : undefined;
    return {
      jobId,
      status,
      provider: this.name,
      protocolVersion,
    };
  }
}
