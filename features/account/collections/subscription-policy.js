'use client';

export function resolveCollectionPreviewLimits(previewLimits = null) {
  return {
    likes: Number(previewLimits?.likes) || 0,
    lists: Number(previewLimits?.lists) || 0,
    watched: Number(previewLimits?.watched) || 0,
    watchlist: Number(previewLimits?.watchlist) || 0,
  };
}

export function hasCollectionPreviewLimits(limits) {
  return limits.likes > 0 || limits.lists > 0 || limits.watched > 0 || limits.watchlist > 0;
}

export function resolveCollectionSubscriptionScope(activeTab = null) {
  const normalizedActiveTab = String(activeTab || '')
    .trim()
    .toLowerCase();
  const shouldScopeByActiveTab = Boolean(normalizedActiveTab);

  return {
    normalizedActiveTab,
    shouldSubscribe: {
      likes: !shouldScopeByActiveTab || normalizedActiveTab === 'likes',
      lists: !shouldScopeByActiveTab || normalizedActiveTab === 'lists',
      watched: !shouldScopeByActiveTab || normalizedActiveTab === 'watched',
      watchlist: !shouldScopeByActiveTab || normalizedActiveTab === 'watchlist',
    },
  };
}
