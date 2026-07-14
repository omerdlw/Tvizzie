import { requireAuthenticatedRequest } from '@/core/auth/servers/session.js';
import { createAdminClient } from '@/core/clients/supabase/admin';
import {
  createRouteRequestMeta,
  createRouteSuccessResponse,
  createRouteValidationErrorResponse,
  createRouteErrorResponse,
} from './route-context.server';

import { executeReviewWriteAction } from './reviews-write.actions.server';
import { normalizePayloadObject, normalizeValue } from './reviews-write.shared';

export async function handleReviewsWritePost(request) {
  const requestMeta = createRouteRequestMeta(request, 'api/reviews/write');

  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (!action) {
      return createRouteValidationErrorResponse({
        authContext,
        message: 'action is required',
        requestMeta,
      });
    }

    const admin = createAdminClient();
    const result = await executeReviewWriteAction({
      action,
      admin,
      body,
      userId: authContext.userId,
    });

    return createRouteSuccessResponse({
      authContext,
      payload: {
        result,
        source: 'authoritative',
      },
      legacyPayload: {
        source: 'authoritative',
        ...normalizePayloadObject(result),
      },
      requestMeta,
    });
  } catch (error) {
    return createRouteErrorResponse({
      code: 'REVIEWS_WRITE_FAILED',
      error,
      fallbackMessage: 'Review write failed',
      requestMeta,
      clientErrorPatterns: ['invalid', 'required', 'unsupported', 'not found'],
    });
  }
}
