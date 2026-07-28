import { createFileRoute } from '@tanstack/react-router';

import { getAuth } from '@/core/auth';
import { AITaskStatus, updateTask } from '@/modules/ai-tasks/service';
import { cancelAnimationRender } from '@/modules/animations/service';
import { respData, respErr } from '@/lib/resp';

async function POST({
  request,
  params,
}: {
  request: Request;
  params: { id: string };
}) {
  try {
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return respErr('Unauthorized', { status: 401 });
    const result = await cancelAnimationRender(session.user.id, params.id);
    if (result.creditTaskId) {
      await updateTask({
        taskId: result.creditTaskId,
        status: AITaskStatus.CANCELED,
      });
    }
    return respData(result.animation);
  } catch (error) {
    return respErr(error instanceof Error ? error.message : 'Cancel failed', {
      status: 400,
    });
  }
}

export const Route = createFileRoute('/api/animations/$id/cancel')({
  server: { handlers: { POST } },
});
