import 'server-only';

import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { invalidateCachedValuesWhere } from '@/core/services/shared';
import { normalizeValue } from './follows.shared';

export function publishFollowChange({ followerId, followingId, reason, status = null, traceId = null }) {
  const payload = {
    eventType: 'follows',
    followerId,
    followingId,
    reason,
    status,
    traceId: traceId || null,
  };

  publishUserEvent(followerId, 'follows', payload);
  publishUserEvent(followingId, 'follows', payload);
}

export function invalidateNotificationCachesForUsers(userIds = []) {
  const normalizedUserIds = [...new Set((Array.isArray(userIds) ? userIds : []).map(normalizeValue).filter(Boolean))];

  if (!normalizedUserIds.length) {
    return;
  }

  invalidateCachedValuesWhere(
    (cacheKey) =>
      cacheKey.startsWith('notifications|') && normalizedUserIds.some((userId) => cacheKey.includes(`|user=${userId}`))
  );
}
