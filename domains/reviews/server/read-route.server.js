import 'server-only';

import { NextResponse } from 'next/server';
import { readReviews } from './read-reviews.server.js';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/http-server';
import { resolveOptionalSessionRequest } from '@/domains/auth/server/session.server';

export async function GET(request) {
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


