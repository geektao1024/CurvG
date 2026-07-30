export interface AnimationWorkflowPayload {
  animationId: string;
  userId: string;
  origin: string;
}

interface AnimationWorkflowBinding {
  create(options: {
    id: string;
    params: AnimationWorkflowPayload;
  }): Promise<unknown>;
}

export function getAnimationWorkflowBinding(): AnimationWorkflowBinding | null {
  const runtimeEnv = (
    globalThis as typeof globalThis & {
      __CF_ENV__?: Record<string, unknown>;
    }
  ).__CF_ENV__;
  const binding = runtimeEnv?.ANIMATION_WORKFLOW as
    | Partial<AnimationWorkflowBinding>
    | undefined;
  return binding && typeof binding.create === 'function'
    ? (binding as AnimationWorkflowBinding)
    : null;
}

export async function startAnimationWorkflow(
  binding: AnimationWorkflowBinding,
  payload: AnimationWorkflowPayload,
  planningRunId?: string
) {
  return binding.create({
    id: `animation-${payload.animationId}-${planningRunId || 'initial'}`,
    params: payload,
  });
}
