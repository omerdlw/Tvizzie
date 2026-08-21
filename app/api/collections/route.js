import { NextResponse } from 'next/server';

import { getAccountResource, isAccountResource } from '@/domains/account/server/collections';
import { resolveAccountRequestUserId } from '@/domains/account/server/request-target';
import { resolveOptionalSessionRequest } from '@/domains/auth/server/session.js';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/cache-policy.server';
import { normalizeValue } from '@/shared/normalize';

export async function GET(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));
    const slug = searchParams.get('slug');
    const listId = searchParams.get('listId');
    const limitCount = searchParams.get('limitCount');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const resolvedUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!resolvedUserId && resource !== 'list-by-slug') {
      return NextResponse.json({ data: null, items: [] });
    }

    if (!isAccountResource(resource)) {
      return NextResponse.json({ error: 'Unsupported account resource' }, { status: 400 });
    }

    const data = await getAccountResource({
      limitCount,
      listId,
      media: entityType && entityId ? { entityId, entityType } : null,
      resource,
      slug,
      userId: resolvedUserId,
      viewerId,
    });
    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_MEDIA_COLLECTIONS);

    return NextResponse.json({ data, items: Array.isArray(data) ? data : [] }, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    if (status === 403) {
      return NextResponse.json({ data: null, items: [], private: true });
    }

    console.error('Collections could not be loaded:', error);
    return NextResponse.json({ error: 'Collections could not be loaded' }, { status });
  }
}
