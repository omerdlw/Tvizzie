import { NextResponse } from 'next/server';

import { getAccountIdByUsername } from '@/domains/account/server/profile';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/cache-policy.server';
import { getOrLoadCachedValue } from '@/infrastructure/http/memory-cache.server';
import { normalizeValue } from '@/shared/normalize';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = normalizeValue(searchParams.get('username'));
    if (!username) return NextResponse.json({ userId: null });

    const userId = await getOrLoadCachedValue({
      cacheKey: `account-resolve|username=${username}`,
      enabled: true,
      ttlMs: 3000,
      loader: () => getAccountIdByUsername(username),
    });

    return NextResponse.json(
      { userId: userId || null },
      { headers: cacheControlHeaders(CACHE_CONTROL.PUBLIC_ACCOUNT_RESOLVE) },
    );
  } catch (error) {
    console.error('Username could not be resolved:', error);
    return NextResponse.json(
      { error: 'Username could not be resolved' },
      { status: 500, headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE) },
    );
  }
}
