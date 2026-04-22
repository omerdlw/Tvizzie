import { NextResponse } from 'next/server';

import { ACCOUNT_READ_FUNCTION } from '@/core/services/account/account.constants';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = normalizeValue(searchParams.get('searchTerm'));
    const limitCount = Number(searchParams.get('limitCount'));
    const resolvedLimit = Number.isFinite(limitCount) ? limitCount : 6;
    const items = await getOrLoadCachedValue({
      cacheKey: `account-search|term=${searchTerm}|limit=${resolvedLimit}`,
      enabled: true,
      ttlMs: 1500,
      loader: async () => {
        const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
          body: {
            limitCount: resolvedLimit,
            resource: 'search',
            searchTerm,
          },
        });

        return Array.isArray(payload?.items) ? payload.items : [];
      },
    });

    return NextResponse.json({
      items: Array.isArray(items) ? items : [],
    });
  } catch (error) {
    console.error('[Account Search API Error]', error);

    // Graceful recovery for Search: don't break the UI on account search failure.
    return NextResponse.json({
      items: [],
    });
  }
}
