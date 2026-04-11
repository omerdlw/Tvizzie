import { NextResponse } from 'next/server';

import { resolveOptionalSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { fetchAccountActivityFeedServer } from '@/core/services/account/account-feed.server';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizePageSize(value, fallback = 20) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.floor(parsed), 100));
}

export async function GET(request) {
  try {
    const authContext = await resolveOptionalSessionRequest(request);
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const pageSize = normalizePageSize(searchParams.get('pageSize'), 20);
    const scope = normalizeValue(searchParams.get('scope')) || 'user';
    const userId = normalizeValue(searchParams.get('userId'));
    const viewerId = authContext?.userId || null;
    const cacheKey = `account-activity|cursor=${cursor || ''}|pageSize=${pageSize}|scope=${scope}|user=${userId}|viewer=${
      viewerId || 'anon'
    }`;
    const result = await getOrLoadCachedValue({
      cacheKey,
      enabled: !viewerId,
      ttlMs: 2000,
      loader: () =>
        fetchAccountActivityFeedServer({
          cursor,
          pageSize,
          scope,
          userId,
          viewerId,
        }),
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    return NextResponse.json(
      {
        error: String(error?.message || 'Activity could not be loaded'),
      },
      { status }
    );
  }
}
