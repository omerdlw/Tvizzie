'use server';

import { getOrLoadCachedValue, invokeInternalEdgeFunction } from '@/infrastructure/http/http-server';

export async function getSocialProofServer({ entityId, entityType, viewerId, resource = 'media', targetUserId, canViewPrivateContent }) {
  try {
    const cacheKey =
      `social-proof|resource=${resource}|viewer=${viewerId || 'anon'}|target=${targetUserId}` +
      `|canPrivate=${canViewPrivateContent}|entity=${entityType}:${entityId}`;

    const data = await getOrLoadCachedValue({
      cacheKey,
      enabled: true,
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

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message || 'Social proof could not be loaded' };
  }
}
