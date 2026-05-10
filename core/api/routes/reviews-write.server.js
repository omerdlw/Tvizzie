import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { createAdminClient } from '@/core/clients/supabase/admin';
import { createApiErrorResponse, createApiSuccessResponse } from '@/core/services/shared/api-response.server';
import { buildInternalRequestMeta } from '@/core/services/shared/request-meta.server';
import { executeWriteRollout } from '@/core/services/shared/write-rollout.server';
import { executeLegacyReviewWriteAction } from './reviews-write.legacy.server';
import { normalizePayloadObject, normalizeValue, resolveWriteStatusCode } from './reviews-write.shared';

export async function handleReviewsWritePost(request) {
  const requestMeta = buildInternalRequestMeta({
    request,
    source: 'api/reviews/write',
  });

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (!action) {
      return createApiErrorResponse(
        {
          code: 'VALIDATION_ERROR',
          message: 'action is required',
        },
        {
          requestMeta: {
            ...requestMeta,
            sessionId: authContext.sessionJti,
            userId: authContext.userId,
          },
          status: 400,
        }
      );
    }

    const admin = createAdminClient();
    const rolloutResult = await executeWriteRollout({
      domain: 'reviews',
      endpoint: action,
      userId: authContext.userId,
      requestId: requestMeta.requestId,
      logger(entry) {
        console.warn('[Rollout][reviews-write]', entry);
      },
      legacyWrite: async () =>
        executeLegacyReviewWriteAction({
          action,
          admin,
          body,
          userId: authContext.userId,
        }),
    });

    return createApiSuccessResponse(
      {
        decision: rolloutResult?.decision || null,
        result: rolloutResult?.result || null,
        source: rolloutResult?.source || 'legacy',
      },
      {
        legacyPayload: {
          decision: rolloutResult?.decision || null,
          source: rolloutResult?.source || 'legacy',
          ...normalizePayloadObject(rolloutResult?.result),
        },
        requestMeta: {
          ...requestMeta,
          sessionId: authContext.sessionJti,
          userId: authContext.userId,
        },
      }
    );
  } catch (error) {
    const message = normalizeValue(error?.message || 'Review write failed');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return createApiErrorResponse(
      {
        code: status === 401 ? 'UNAUTHORIZED' : 'REVIEWS_WRITE_FAILED',
        message,
      },
      {
        requestMeta,
        status,
      }
    );
  }
}
