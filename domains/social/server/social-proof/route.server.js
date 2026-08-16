import { NextResponse } from 'next/server';

import { resolveOptionalSessionRequest } from '@/domains/auth/server/session.server.js';
import { canViewerAccessUserContent } from '@/domains/account/server/profile.server';
import {
  CACHE_CONTROL,
  cacheControlHeaders,
  getOrLoadCachedValue,
} from '@/infrastructure/http/http-server';
import {
  getAccountSocialProofResource,
  getMediaSocialProofResource,
} from './resources.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

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
        ? await canViewerAccessUserContent({
            ownerId: targetUserId,
            viewerId,
          })
        : false;
    const cacheKey =
      `social-proof|resource=${resource}|viewer=${viewerId || 'anon'}|target=${targetUserId}` +
      `|canPrivate=${canViewPrivateContent}|entity=${entityType}:${entityId}`;
    const data = await getOrLoadCachedValue({
      cacheKey,
      enabled: !viewerId,
      ttlMs: 1500,
      loader: async () => {
        if (resource === 'account') {
          return getAccountSocialProofResource({
            canViewPrivateContent,
            targetUserId,
            viewerId,
          });
        }

        return getMediaSocialProofResource({
          entityId,
          entityType,
          viewerId,
        });
      },
    });

    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_SOCIAL_PROOF);

    return NextResponse.json({ data }, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Social proof could not be loaded'),
      },
      {
        status: Number.isFinite(Number(error?.status)) ? Number(error.status) : 500,
        headers: cacheControlHeaders(CACHE_CONTROL.NO_STORE),
      },
    );
  }
}
