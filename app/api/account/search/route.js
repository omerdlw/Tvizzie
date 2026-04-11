import { NextResponse } from 'next/server';

import { searchAccountProfiles } from '@/core/services/browser/browser-data.server';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';

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
      loader: () => searchAccountProfiles(searchTerm, resolvedLimit),
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
