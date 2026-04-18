import { NextResponse } from 'next/server';

import { ACCOUNT_READ_FUNCTION } from '@/core/services/account/contracts';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = normalizeValue(searchParams.get('username'));
    const userId = await getOrLoadCachedValue({
      cacheKey: `account-resolve|username=${username}`,
      enabled: true,
      ttlMs: 1500,
      loader: async () => {
        const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
          body: {
            resource: 'resolve',
            username,
          },
        });

        return payload?.userId || null;
      },
    });

    return NextResponse.json({
      userId: userId || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Username could not be resolved'),
      },
      { status: 500 }
    );
  }
}
