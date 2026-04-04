import { NextResponse } from 'next/server';

import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));

    const payload = await invokeInternalEdgeFunction('reviews-read', {
      body:
        resource === 'list'
          ? {
              resource: 'list',
              listId: normalizeValue(searchParams.get('listId')),
              ownerId: normalizeValue(searchParams.get('ownerId')),
              limitCount: searchParams.get('limitCount'),
            }
          : {
              resource: 'media',
              entityId: normalizeValue(searchParams.get('entityId')),
              entityType: normalizeValue(searchParams.get('entityType')),
              limitCount: searchParams.get('limitCount'),
            },
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
