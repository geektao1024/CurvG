import { Container, getRandom } from '@cloudflare/containers';

interface Env {
  ORCHESTRATOR_CONTAINER: DurableObjectNamespace<OrchestratorContainer>;
  ORCHESTRATOR_TOKEN: string;
}

const allowedRoutes = new Map([
  ['/health', 'GET'],
  ['/v1/prepare', 'POST'],
  ['/v1/validate-code', 'POST'],
]);

function jsonError(status: number, message: string): Response {
  return Response.json({ detail: message }, { status });
}

function hasBearerToken(request: Request, expected: string): boolean {
  const header = request.headers.get('authorization') ?? '';
  const actual = header.startsWith('Bearer ') ? header.slice(7) : '';
  const left = new TextEncoder().encode(actual);
  const right = new TextEncoder().encode(expected);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0 && right.length > 0;
}

export class OrchestratorContainer extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = '10m';

  constructor(ctx: DurableObjectState<{}>, env: Env) {
    super(ctx, env, {
      envVars: {
        ORCHESTRATOR_TOKEN: env.ORCHESTRATOR_TOKEN,
      },
    });
  }

  override onStart(): void {
    console.log('[orchestrator-container] started');
  }

  override onStop(): void {
    console.log('[orchestrator-container] stopped');
  }

  override onError(error: unknown): void {
    console.error('[orchestrator-container] error', error);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const expectedMethod = allowedRoutes.get(url.pathname);

    if (!expectedMethod) return jsonError(404, 'Not found');
    if (request.method !== expectedMethod) {
      return jsonError(405, 'Method not allowed');
    }
    if (!hasBearerToken(request, env.ORCHESTRATOR_TOKEN)) {
      return jsonError(401, 'Unauthorized');
    }

    try {
      const container = await getRandom(env.ORCHESTRATOR_CONTAINER, 2);
      return await container.fetch(request);
    } catch (error) {
      console.error('[orchestrator-worker] container unavailable', error);
      return jsonError(
        503,
        'Orchestrator container is starting or unavailable'
      );
    }
  },
} satisfies ExportedHandler<Env>;
