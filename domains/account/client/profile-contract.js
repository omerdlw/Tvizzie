function toFiniteCount(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}

// Account views consume a flat profile; the Core remains responsible only for
// the public document contract.
export function toAccountClientProfile(profile = {}) {
  const counts = profile?.counts || {};

  return {
    avatarUrl: profile.avatarUrl || null,
    bannerUrl: profile.bannerUrl || null,
    description: profile.description || null,
    displayName: profile.displayName || 'Anonymous User',
    favoriteShowcase: Array.isArray(profile.favoriteShowcase) ? profile.favoriteShowcase : [],
    followerCount: toFiniteCount(counts.followers),
    followingCount: toFiniteCount(counts.following),
    id: profile.id || null,
    isPrivate: Boolean(profile.isPrivate),
    likesCount: toFiniteCount(counts.likes),
    listsCount: toFiniteCount(counts.lists),
    updatedAt: profile.updatedAt || null,
    username: profile.handle || null,
    watchedCount: toFiniteCount(counts.watched),
    watchlistCount: toFiniteCount(counts.watchlist),
  };
}
