import { NextResponse } from 'next/server';

import { resolveAccountRequestUserId } from '@/domains/account/server/request-target';
import { resolveOptionalSessionRequest } from '@/domains/auth/server/session.js';
import { fetchProfileReviewFeedServer } from '@/domains/reviews/server/feeds';
import { normalizeProfileReviewFeedMode } from '@/domains/reviews/utils/constants';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';
import { normalizeValue } from '@/shared';

export async function GET(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);
    const requestedMode = normalizeValue(searchParams.get('mode'));
    const resolvedUserId = await resolveAccountRequestUserId({ searchParams });

    if (!resolvedUserId) {
      return NextResponse.json({ hasMore: false, items: [], nextCursor: null, totalCount: 0 });
    }

    const payload = await fetchProfileReviewFeedServer({
      cursor: searchParams.get('cursor'),
      mode: normalizeProfileReviewFeedMode(requestedMode),
      pageSize: Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20)),
      userId: resolvedUserId,
      viewerId,
    });
    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_REVIEWS);

    return NextResponse.json(payload, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    if (status === 403) return NextResponse.json({ items: [], private: true });

    console.error('Reviews could not be loaded:', error);
    return NextResponse.json({ error: 'Reviews could not be loaded' }, { status });
  }
}
