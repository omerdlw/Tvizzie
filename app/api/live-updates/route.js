import { requireAuthenticatedRequest } from '@/lib/auth/servers/session/authenticated-request.server'
import { createUserEventStream } from '@/lib/live-updates/user-events.server'
import { isTransientSessionError } from '@/lib/auth/servers/session/session.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request)
    const stream = createUserEventStream(authContext.userId)

    return new Response(stream, {
      headers: {
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    if (isTransientSessionError(error)) {
      return new Response('Service temporarily unavailable', { status: 503 })
    }
    return new Response('Authentication required', { status: 401 })
  }
}

