import { NextResponse } from 'next/server';

import { fetchAccountActivityFeedServer } from '@/domains/account/server/feed';
import { resolveAccountRequestUserId } from '@/domains/account/server/request-target';
import { resolveOptionalSessionRequest } from '@/domains/auth/server/session.js';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/cache-policy.server';

export async function GET(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);
    const resolvedUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!resolvedUserId) {
      return NextResponse.json({ hasMore: false, items: [], nextCursor: null, totalCount: 0 });
    }

    const payload = await fetchAccountActivityFeedServer({
      cursor: searchParams.get('cursor'),
      pageSize: searchParams.get('pageSize'),
      scope: searchParams.get('scope'),
      sort: searchParams.get('sort'),
      subject: searchParams.get('subject'),
      userId: resolvedUserId,
      viewerId,
    });
    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_COLLECTIONS);

    return NextResponse.json(payload, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    if (status === 403) return NextResponse.json({ items: [], private: true });

    console.error('Activity feed could not be loaded:', error);
    return NextResponse.json({ error: 'Activity feed could not be loaded' }, { status });
  }
}
