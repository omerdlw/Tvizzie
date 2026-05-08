import { NextResponse } from 'next/server';

import { resolveOptionalSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  try {
    const authContext = await resolveOptionalSessionRequest(request);

    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));
    const viewerId = authContext?.userId || null;
    const canViewPrivateContent = normalizeValue(searchParams.get('canViewPrivateContent')) === 'true';
    const targetUserId = normalizeValue(searchParams.get('targetUserId'));
    const entityId = normalizeValue(searchParams.get('entityId'));
    const entityType = normalizeValue(searchParams.get('entityType'));
    const cacheKey =
      `social-proof|resource=${resource}|viewer=${viewerId || 'anon'}|target=${targetUserId}` +
      `|canPrivate=${canViewPrivateContent}|entity=${entityType}:${entityId}`;
    const data = await getOrLoadCachedValue({
      cacheKey,
      enabled: !viewerId,
      ttlMs: 1500,
      loader: async () => {
        const payload = await invokeInternalEdgeFunction('social-proof-read', {
          body:
            resource === 'account'
              ? {
                  canViewPrivateContent,
                  resource: 'account',
                  targetUserId,
                  viewerId,
                }
              : {
                  entityId,
                  entityType,
                  resource: 'media',
                  viewerId,
                },
        });

        return payload?.data || null;
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Social proof could not be loaded'),
      },
      {
        status: Number.isFinite(Number(error?.status)) ? Number(error.status) : 500,
      }
    );
  }
}
