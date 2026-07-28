export interface AnimationRenderRequest {
  animationId: string;
  code: string;
  callbackUrl: string;
  signal?: AbortSignal;
}

export interface AnimationRenderResult {
  jobId: string;
  status: string;
  provider: string;
}

export interface AnimationRenderer {
  readonly name: string;
  render(request: AnimationRenderRequest): Promise<AnimationRenderResult>;
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
        format: 'mp4',
        quality: 'medium',
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
    return {
      jobId,
      status,
      provider: this.name,
    };
  }
}
