import 'server-only';

import { createAdminClient } from '@/infrastructure/supabase/admin-client.server';

const PREVIEW_LIMIT = 3;
const SHARED_TITLES_LIMIT = 2;
const FOLLOWING_SELECT =
  'following_avatar_url,following_display_name,following_id,following_username';

function normalizeTrim(value) {
  return String(value ?? '').trim();
}

function normalizeLower(value) {
  return normalizeTrim(value).toLowerCase();
}

function buildMediaItemKey(entityType, entityId) {
  const normalizedEntityType = normalizeLower(entityType);
  const normalizedEntityId = normalizeTrim(entityId);
  return normalizedEntityType && normalizedEntityId
    ? `${normalizedEntityType}_${normalizedEntityId}`
    : null;
}

function createEmptyProofGroup() {
  return {
    count: 0,
    previewUsers: [],
    users: [],
  };
}

export function createEmptyMediaSocialProof() {
  return {
    followingCount: 0,
    highlights: [],
    likes: createEmptyProofGroup(),
    lists: {
      count: 0,
      previewLists: [],
      previewUsers: [],
      users: [],
    },
    scope: 'following',
    reviews: createEmptyProofGroup(),
    similarTaste: {
      count: 0,
      previewTitles: [],
    },
    watched: createEmptyProofGroup(),
    watchlist: createEmptyProofGroup(),
  };
}

export function createEmptyProfileSocialProof() {
  return {
    mutualFollowersCount: 0,
    sharedLikes: {
      count: 0,
      titles: [],
    },
  };
}

function normalizeSocialUser(user = {}) {
  const userId = normalizeTrim(user.id);
  if (!userId) return null;

  return {
    avatarUrl: normalizeTrim(user.avatarUrl) || null,
    displayName:
      normalizeTrim(user.displayName || user.name || user.email || user.username) || 'User',
    id: userId,
    username: normalizeTrim(user.username) || null,
  };
}

function plural(count, singular, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function buildPreviewUsers(records, followProfileMap) {
  const previews = [];
  const seen = new Set();

  records.forEach((record) => {
    const followProfile = followProfileMap.get(record.userId) || {};
    const normalized = normalizeSocialUser({
      ...(record.user || {}),
      ...followProfile,
      id: record.userId,
    });

    if (!normalized || seen.has(normalized.id)) return;

    previews.push(normalized);
    seen.add(normalized.id);
  });

  return previews.slice(0, PREVIEW_LIMIT);
}

function buildUsers(records, followProfileMap) {
  const users = [];
  const seen = new Set();

  records.forEach((record) => {
    const followProfile = followProfileMap.get(record.userId) || {};
    const normalized = normalizeSocialUser({
      ...(record.user || {}),
      ...followProfile,
      id: record.userId,
    });

    if (!normalized || seen.has(normalized.id)) return;

    users.push(normalized);
    seen.add(normalized.id);
  });

  return users;
}

function buildProofGroup(recordsMap, followProfileMap) {
  const records = Array.from(recordsMap.values());

  return {
    count: records.length,
    previewUsers: buildPreviewUsers(records, followProfileMap),
    users: buildUsers(records, followProfileMap),
  };
}

async function loadFollowing(admin, viewerId) {
  if (!viewerId) {
    return {
      followProfileMap: new Map(),
      followingIds: [],
    };
  }

  const { data: followingRows, error } = await admin
    .from('follows')
    .select(FOLLOWING_SELECT)
    .eq('follower_id', viewerId)
    .eq('status', 'accepted');

  if (error) {
    throw new Error(error.message || 'Following list could not be loaded');
  }

  const followProfileMap = new Map();
  const followingIds = [];

  (followingRows || []).forEach((row) => {
    const followingId = normalizeTrim(row.following_id);
    if (!followingId) return;

    followingIds.push(followingId);
    followProfileMap.set(followingId, {
      avatarUrl: normalizeTrim(row.following_avatar_url) || null,
      displayName: normalizeTrim(row.following_display_name) || null,
      id: followingId,
      username: normalizeTrim(row.following_username) || null,
    });
  });

  return {
    followProfileMap,
    followingIds,
  };
}

function addRowsToCategory(rows, categoryMap) {
  rows.forEach((row) => {
    const userId = normalizeTrim(row.user_id);
    if (!userId) return;

    categoryMap.set(userId, {
      user: null,
      userId,
    });
  });
}

async function loadFollowingMediaActivity(admin, mediaKeys, followingIds) {
  const categoryState = {
    likes: new Map(),
    reviews: new Map(),
    watched: new Map(),
    watchlist: new Map(),
  };

  if (mediaKeys.length === 0 || followingIds.length === 0) {
    return categoryState;
  }

  const [likesResult, watchedResult, watchlistResult, reviewsResult] = await Promise.all([
    admin.from('likes').select('user_id').in('media_key', mediaKeys).in('user_id', followingIds),
    admin.from('watched').select('user_id').in('media_key', mediaKeys).in('user_id', followingIds),
    admin
      .from('watchlist')
      .select('user_id')
      .in('media_key', mediaKeys)
      .in('user_id', followingIds),
    admin
      .from('media_reviews')
      .select('user_id')
      .in('media_key', mediaKeys)
      .in('user_id', followingIds),
  ]);

  addRowsToCategory(likesResult.data || [], categoryState.likes);
  addRowsToCategory(watchedResult.data || [], categoryState.watched);
  addRowsToCategory(watchlistResult.data || [], categoryState.watchlist);
  addRowsToCategory(reviewsResult.data || [], categoryState.reviews);

  return categoryState;
}

async function loadFollowingListSignals(admin, mediaKeys, followingIds, followProfileMap) {
  const emptyLists = {
    count: 0,
    previewLists: [],
    previewUsers: [],
    users: [],
  };

  if (mediaKeys.length === 0 || followingIds.length === 0) {
    return emptyLists;
  }

  const listItemsResult = await admin
    .from('list_items')
    .select('list_id,user_id')
    .in('media_key', mediaKeys)
    .in('user_id', followingIds)
    .order('added_at', { ascending: false })
    .limit(160);

  const listItemRows = listItemsResult.data || [];
  const listIds = Array.from(
    new Set(listItemRows.map((row) => normalizeTrim(row.list_id)).filter(Boolean)),
  );

  if (listIds.length === 0) {
    return emptyLists;
  }

  const listsResult = await admin
    .from('lists')
    .select('id,title,slug,user_id,likes_count,reviews_count')
    .eq('is_private', false)
    .in('id', listIds.slice(0, 120))
    .in('user_id', followingIds)
    .order('likes_count', { ascending: false })
    .limit(24);

  const lists = (listsResult.data || []).map((list) => ({
    id: normalizeTrim(list.id),
    likesCount: Number(list.likes_count || 0),
    reviewsCount: Number(list.reviews_count || 0),
    slug: normalizeTrim(list.slug) || null,
    title: normalizeTrim(list.title) || 'List',
    userId: normalizeTrim(list.user_id) || null,
  }));

  if (lists.length === 0) {
    return emptyLists;
  }

  const listUserMap = new Map();
  lists.forEach((list) => {
    if (!list.userId) return;
    listUserMap.set(list.userId, {
      user: null,
      userId: list.userId,
    });
  });

  const records = Array.from(listUserMap.values());

  return {
    count: lists.length,
    previewLists: lists.slice(0, PREVIEW_LIMIT),
    previewUsers: buildPreviewUsers(records, followProfileMap),
    users: buildUsers(records, followProfileMap),
  };
}

function buildHighlights({ isPerson, likes, lists, reviews, watched, watchlist }) {
  const highlights = [];

  if (likes.count > 0) {
    highlights.push({
      key: 'following-liked',
      label: isPerson
        ? `${plural(likes.count, 'person', 'people')} you follow liked films with this person`
        : `${plural(likes.count, 'person', 'people')} you follow liked this`,
      previewUsers: likes.previewUsers,
      score: 90 + likes.count,
    });
  }

  if (watched.count > 0) {
    highlights.push({
      key: 'following-watched',
      label: isPerson
        ? `${plural(watched.count, 'person', 'people')} you follow watched films with this person`
        : `${plural(watched.count, 'person', 'people')} you follow watched this`,
      previewUsers: watched.previewUsers,
      score: 82 + watched.count,
    });
  }

  if (reviews.count > 0) {
    highlights.push({
      key: 'following-reviewed',
      label: `${plural(reviews.count, 'person', 'people')} you follow reviewed ${isPerson ? 'their films' : 'this'}`,
      previewUsers: reviews.previewUsers,
      score: 78 + reviews.count,
    });
  }

  if (watchlist.count > 0) {
    highlights.push({
      key: 'following-watchlist',
      label: `${plural(watchlist.count, 'person', 'people')} you follow saved ${isPerson ? 'their films' : 'this'}`,
      previewUsers: watchlist.previewUsers,
      score: 72 + watchlist.count,
    });
  }

  if (lists.count > 0) {
    const listUserCount = lists.users.length;
    highlights.push({
      key: 'following-lists',
      label:
        listUserCount > 0
          ? `${plural(listUserCount, 'person', 'people')} you follow added ${isPerson ? 'their films' : 'this'} to lists`
          : `${plural(lists.count, 'list')} from people you follow includes ${isPerson ? 'their films' : 'this'}`,
      previewUsers: lists.previewUsers,
      score: 68 + lists.count,
    });
  }

  return highlights.sort((first, second) => second.score - first.score).slice(0, 4);
}

export async function getMediaSocialProofResource({ entityId, entityType, viewerId }) {
  if (!viewerId || !entityId || !entityType) {
    return createEmptyMediaSocialProof();
  }

  const normalizedEntityType = normalizeLower(entityType);
  if (normalizedEntityType !== 'movie' && normalizedEntityType !== 'tv') {
    return createEmptyMediaSocialProof();
  }

  const mediaKeys = [buildMediaItemKey(normalizedEntityType, entityId)].filter(Boolean);
  if (mediaKeys.length === 0) {
    return createEmptyMediaSocialProof();
  }

  const admin = createAdminClient();
  const { followProfileMap, followingIds } = await loadFollowing(admin, viewerId);

  if (followingIds.length === 0) {
    return createEmptyMediaSocialProof();
  }

  const [categoryState, lists] = await Promise.all([
    loadFollowingMediaActivity(admin, mediaKeys, followingIds),
    loadFollowingListSignals(admin, mediaKeys, followingIds, followProfileMap),
  ]);

  const likes = buildProofGroup(categoryState.likes, followProfileMap);
  const reviews = buildProofGroup(categoryState.reviews, followProfileMap);
  const watched = buildProofGroup(categoryState.watched, followProfileMap);
  const watchlist = buildProofGroup(categoryState.watchlist, followProfileMap);
  const highlights = buildHighlights({
    isPerson: false,
    likes,
    lists,
    reviews,
    watched,
    watchlist,
  });

  return {
    followingCount: followingIds.length,
    highlights,
    likes,
    lists,
    reviews,
    similarTaste: {
      count: 0,
      previewTitles: [],
    },
    watched,
    watchlist,
  };
}

export async function getAccountSocialProofResource({
  canViewPrivateContent,
  targetUserId,
  viewerId,
}) {
  if (!viewerId || !targetUserId || viewerId === targetUserId || !canViewPrivateContent) {
    return createEmptyProfileSocialProof();
  }

  const admin = createAdminClient();
  const { data: viewerFollowersRows, error: followersError } = await admin
    .from('follows')
    .select('follower_id')
    .eq('following_id', viewerId)
    .eq('status', 'accepted');

  if (followersError) {
    throw new Error(followersError.message || 'Social proof could not be loaded');
  }

  const viewerFollowerIds = (viewerFollowersRows || [])
    .map((row) => normalizeTrim(row.follower_id))
    .filter(Boolean);

  let mutualFollowersCount = 0;

  if (viewerFollowerIds.length > 0) {
    const { count, error: mutualError } = await admin
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', targetUserId)
      .eq('status', 'accepted')
      .in('follower_id', viewerFollowerIds.slice(0, 1000));

    if (mutualError) {
      throw new Error(mutualError.message || 'Social proof could not be loaded');
    }
    mutualFollowersCount = Number(count || 0);
  }

  const { data: viewerLikesRows, error: likesError } = await admin
    .from('likes')
    .select('media_key,title')
    .eq('user_id', viewerId);

  if (likesError) {
    throw new Error(likesError.message || 'Social proof could not be loaded');
  }

  const viewerLikesKeys = (viewerLikesRows || [])
    .map((row) => normalizeTrim(row.media_key))
    .filter(Boolean);

  let sharedCount = 0;
  let sharedTitles = [];

  if (viewerLikesKeys.length > 0) {
    const {
      count: sharedLikesCount,
      data: sharedLikesData,
      error: sharedError,
    } = await admin
      .from('likes')
      .select('media_key,title', { count: 'exact' })
      .eq('user_id', targetUserId)
      .in('media_key', viewerLikesKeys.slice(0, 1000));

    if (sharedError) {
      throw new Error(sharedError.message || 'Social proof could not be loaded');
    }
    sharedCount = Number(sharedLikesCount || 0);
    sharedTitles = (sharedLikesData || [])
      .map((item) => normalizeTrim(item.title))
      .filter(Boolean)
      .slice(0, SHARED_TITLES_LIMIT);
  }

  return {
    mutualFollowersCount,
    sharedLikes: {
      count: sharedCount,
      titles: sharedTitles,
    },
  };
}
