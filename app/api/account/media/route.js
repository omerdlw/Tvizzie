import { NextResponse } from 'next/server';

import { uploadAccountMedia } from '@/domains/account/server/media-upload';
import {
  assertCsrfRequest,
  enforceSlidingWindowRateLimit,
  isSlidingWindowRateLimitError,
} from '@/domains/auth/server/security.js';
import { getRequestContext, requireProtectedSession } from '@/domains/auth/server/session.js';

export async function POST(request) {
  try {
    const authContext = await requireProtectedSession(request, { allowBearerFallback: true });
    assertCsrfRequest(request, getRequestContext(request));
    await enforceSlidingWindowRateLimit({
      namespace: 'account-media-upload',
      windowMs: 60 * 1000,
      dimensions: [{ id: 'user', value: authContext.userId, limit: 15 }],
    });

    const formData = await request.formData();
    const mediaResult = await uploadAccountMedia({
      file: formData.get('file'),
      target: formData.get('target'),
      userId: authContext.userId,
    });

    return NextResponse.json({
      bucket: mediaResult.bucket || null,
      path: mediaResult.path || null,
      url: mediaResult.url || null,
      success: true,
    });
  } catch (error) {
    if (isSlidingWindowRateLimitError(error)) {
      const response = NextResponse.json(
        { error: error.message || 'Rate limit exceeded' },
        { status: 429 },
      );
      if (Number.isFinite(Number(error.retryAfterSeconds))) {
        response.headers.set(
          'Retry-After',
          String(Math.max(1, Math.ceil(error.retryAfterSeconds))),
        );
      }
      return response;
    }

    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Image upload failed' }, { status });
  }
}
