import { NextResponse } from 'next/server';

import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));
    const listId = normalizeValue(searchParams.get('listId'));
    const ownerId = normalizeValue(searchParams.get('ownerId'));
    const entityId = normalizeValue(searchParams.get('entityId'));
    const entityType = normalizeValue(searchParams.get('entityType'));
    const limitCount = searchParams.get('limitCount');
    const cacheKey = `reviews|resource=${resource}|listId=${listId}|ownerId=${ownerId}|entity=${entityType}:${entityId}|limit=${limitCount}`;
    const payload = await getOrLoadCachedValue({
      cacheKey,
      enabled: true,
      ttlMs: 2000,
      loader: () =>
        invokeInternalEdgeFunction('reviews-read', {
          body:
            resource === 'list'
              ? {
                  resource: 'list',
                  listId,
                  ownerId,
                  limitCount,
                }
              : {
                  resource: 'media',
                  entityId,
                  entityType,
                  limitCount,
                },
        }),
    });
    const data = Array.isArray(payload?.data) ? payload.data : [];

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Reviews could not be loaded'),
      },
      {
        status: Number.isFinite(Number(error?.status)) ? Number(error.status) : 500,
      }
    );
  }
}
