function toFiniteCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

function toOptionalString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export function toAccountProfileDocument(profile = {}) {
  return {
    avatarUrl: toOptionalString(profile.avatarUrl),
    bannerUrl: toOptionalString(profile.bannerUrl),
    counts: {
      followers: toFiniteCount(profile.followerCount),
      following: toFiniteCount(profile.followingCount),
      likes: toFiniteCount(profile.likesCount),
      lists: toFiniteCount(profile.listsCount),
      watched: toFiniteCount(profile.watchedCount),
      watchlist: toFiniteCount(profile.watchlistCount),
    },
    description: toOptionalString(profile.description),
    displayName: toOptionalString(profile.displayName) || 'Anonymous User',
    favoriteShowcase: Array.isArray(profile.favoriteShowcase) ? profile.favoriteShowcase : [],
    handle: toOptionalString(profile.username),
    id: toOptionalString(profile.id),
    isPrivate: Boolean(profile.isPrivate),
    updatedAt: toOptionalString(profile.updatedAt),
  };
}

export function getAccountProfileVersion(profileDocument) {
  return profileDocument?.updatedAt || null;
}
