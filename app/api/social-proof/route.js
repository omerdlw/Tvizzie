import { NextResponse } from 'next/server';

import { canViewerAccessUserContent } from '@/domains/account/server';
import { resolveOptionalSessionRequest } from '@/domains/auth/server/session.js';
import {
  getAccountSocialProofResource,
  getMediaSocialProofResource,
} from '@/domains/social/server/social-proof';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/server';
import { getOrLoadCachedValue } from '@/infrastructure/http/server';
import { normalizeValue } from '@/shared';

export async function GET(request) {
  try {
    const authContext = await resolveOptionalSessionRequest(request);
    const { searchParams } = new URL(request.url);
    const resource = normalizeValue(searchParams.get('resource'));
    const viewerId = authContext?.userId || null;
    const targetUserId = normalizeValue(searchParams.get('targetUserId'));
    const entityId = normalizeValue(searchParams.get('entityId'));
    const entityType = normalizeValue(searchParams.get('entityType'));
    const canViewPrivateContent =
      resource === 'account' && targetUserId
        ? await canViewerAccessUserContent({ ownerId: targetUserId, viewerId })
        : false;
    const cacheKey =
      `social-proof|resource=${resource}|viewer=${viewerId || 'anon'}|target=${targetUserId}` +
      `|canPrivate=${canViewPrivateContent}|entity=${entityType}:${entityId}`;
    const data = await getOrLoadCachedValue({
      cacheKey,
      enabled: !viewerId,
      ttlMs: 1500,
      loader: () =>
        resource === 'account'
          ? getAccountSocialProofResource({
              canViewPrivateContent,
              targetUserId,
              viewerId,
            })
          : getMediaSocialProofResource({ entityId, entityType, viewerId }),
    });
    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_SOCIAL_PROOF);

    return NextResponse.json({ data }, { headers });
  } catch (error) {
    return NextResponse.json(
      { error: String(error?.message || 'Social proof could not be loaded') },
      {
        status: Number.isFinite(Number(error?.status)) ? Number(error.status) : 500,
        headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
      },
    );
  }
}
