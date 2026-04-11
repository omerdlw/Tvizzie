import { NextResponse } from 'next/server';

import { resolveOptionalSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { fetchProfileReviewFeedServer } from '@/core/services/media/reviews.server';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';

const REVIEW_MODES = new Set(['authored', 'liked']);

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeMode(value) {
  const normalized = normalizeValue(value).toLowerCase();

  return REVIEW_MODES.has(normalized) ? normalized : 'authored';
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authContext = await resolveOptionalSessionRequest(request);
    const cursor = searchParams.get('cursor');
    const mode = normalizeMode(searchParams.get('mode'));
    const pageSize = Math.min(normalizePositiveInteger(searchParams.get('pageSize'), 20), 100);
    const userId = normalizeValue(searchParams.get('userId'));
    const viewerId = authContext?.userId || null;
    const cacheKey = `account-reviews|cursor=${cursor || ''}|mode=${mode}|pageSize=${pageSize}|user=${userId}|viewer=${
      viewerId || 'anon'
    }`;
    const result = await getOrLoadCachedValue({
      cacheKey,
      enabled: !viewerId,
      ttlMs: 2000,
      loader: () =>
        fetchProfileReviewFeedServer({
          cursor,
          mode,
          pageSize,
          userId,
          viewerId,
        }),
    });

    return NextResponse.json({
      hasMore: result?.hasMore === true,
      items: Array.isArray(result?.items) ? result.items : [],
      nextCursor: result?.nextCursor ?? null,
    });
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;
    const message = String(error?.message || 'Reviews could not be loaded');

    return NextResponse.json({ error: message }, { status });
  }
}
