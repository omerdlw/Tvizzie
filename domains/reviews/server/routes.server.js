import 'server-only';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  CACHE_CONTROL,
  cacheControlHeaders,
  assertRateLimit,
} from '@/infrastructure/http/http-server';
import {
  createAuthenticatedSupabaseClient,
  requireSessionRequest,
  resolveOptionalSessionRequest,
} from '@/domains/auth/server/session.server.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.server.js';
import { normalizeValue } from '@/domains/shell/shared/utils.js';
import { readReviews } from './resources.server.js';
import { executeReviewWriteAction, resolveWriteStatusCode } from './actions.server.js';

export async function handleReviewsGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request).catch(() => null);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const data = await readReviews(Object.fromEntries(searchParams));

    // If user is logged in or viewing dynamic list comments, use private user state (no-store)
    // so new comments/reviews reflect immediately without CDN caching delay
    const headers =
      viewerId || resource === 'list'
        ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
        : cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_REVIEWS);

    return NextResponse.json(data, {
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Reviews could not be loaded'),
      },
      {
        status: Number.isFinite(Number(error?.status)) ? Number(error.status) : 500,
        headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
      },
    );
  }
}

export async function handleReviewsWritePost(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireSessionRequest(request);
    assertRateLimit(request, {
      key: 'reviews-write',
      limit: 30,
      userId: session.userId,
      windowSeconds: 60,
    });
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await executeReviewWriteAction({
      action,
      admin,
      body,
      userClient: createAuthenticatedSupabaseClient(session.accessToken),
      userId: session.userId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const status = Number.isInteger(error?.status)
      ? error.status
      : resolveWriteStatusCode(error?.message);
    return NextResponse.json({ error: error?.message || 'Review write failed' }, { status });
  }
}

export {
  handleReviewsGet as GET,
  handleReviewsWritePost as POST,
};
