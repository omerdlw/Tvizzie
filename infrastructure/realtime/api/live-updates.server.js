import {
  isTransientSessionError,
  requireAuthenticatedRequest,
} from '@/domains/auth/servers/auth-session.js';
import { createUserEventStream } from '@/infrastructure/realtime/user-events.server';

import { buildInternalRequestMeta, setResponseRequestMeta } from '@/infrastructure/http/http-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/live-updates',
  });
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const stream = createUserEventStream(authContext.userId);
    const response = new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    });

    return setResponseRequestMeta(response, {
      ...requestMeta,
      sessionId: authContext.sessionJti,
      userId: authContext.userId,
    });
  } catch (error) {
    if (isTransientSessionError(error)) {
      return setResponseRequestMeta(
        new Response('Service temporarily unavailable', { status: 503 }),
        requestMeta,
      );
    }
    return setResponseRequestMeta(
      new Response('Authentication required', { status: 401 }),
      requestMeta,
    );
  }
}
