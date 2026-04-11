import { NextResponse } from 'next/server';

import { getAccountIdByUsername } from '@/core/services/browser/browser-data.server';
import { getOrLoadCachedValue } from '@/core/services/shared/memory-cache.server';

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
      loader: () => getAccountIdByUsername(username),
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
