import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

type SocialProofResource = 'account' | 'media';

type SocialProofReadRequest = {
  canViewPrivateContent?: boolean | string | null;
  entityId?: string | null;
  entityType?: string | null;
  knownMovieIds?: string | string[] | null;
  resource?: SocialProofResource | string | null;
  targetUserId?: string | null;
  viewerId?: string | null;
};

const PREVIEW_LIMIT = 3;
const SHARED_TITLES_LIMIT = 2;
const BASE_HEADERS = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};
const FOLLOWING_SELECT = ['following_avatar_url', 'following_display_name', 'following_id', 'following_username'].join(
  ','
);

let adminClient: SupabaseClient | null = null;

function normalizeTrim(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeLower(value: unknown): string {
  return normalizeTrim(value).toLowerCase();
}

function parseBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;

  const normalized = normalizeLower(value);
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: BASE_HEADERS,
    status,
  });
}

function errorResponse(status: number, message: string) {
  return jsonResponse(status, { error: normalizeTrim(message) || 'Request failed' });
}

function mapErrorToStatus(error: unknown, fallback = 500): number {
  const explicitStatus = Number((error as { status?: number })?.status);
  if (Number.isFinite(explicitStatus) && explicitStatus >= 100) return explicitStatus;

  const message = normalizeLower((error as Error)?.message);
  if (message.includes('unauthorized') || message.includes('forbidden')) return 401;
  if (message.includes('private')) return 403;
  if (message.includes('required') || message.includes('invalid') || message.includes('not found')) return 400;
  return fallback;
}

function assertMethod(request: Request, allowed: string[]) {
  const method = normalizeTrim(request.method).toUpperCase();
  const normalizedAllowed = allowed.map((item) => normalizeTrim(item).toUpperCase());

  if (normalizedAllowed.includes(method)) return;

  const error = new Error(`Method ${method || 'UNKNOWN'} not allowed`);
  (error as Error & { status?: number }).status = 405;
  throw error;
}

function requireEnv(name: string): string {
  const value = normalizeTrim(Deno.env.get(name));
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

function assertInternalAccess(request: Request) {
  const expectedToken = requireEnv('INFRA_INTERNAL_TOKEN');
  const receivedToken = normalizeTrim(request.headers.get('x-infra-internal-token'));

  if (!receivedToken || !timingSafeEqual(receivedToken, expectedToken)) {
    const error = new Error('Unauthorized');
    (error as Error & { status?: number }).status = 401;
    throw error;
  }
}

function createAdminClient() {
  if (adminClient) return adminClient;

  adminClient = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

function assertResult(result: { error: { message?: string } | null }, fallbackMessage: string): void {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage);
  }
}

async function readJsonBody<T>(request: Request): Promise<T> {
  return (await request.json().catch(() => ({}))) as T;
}

function normalizeResource(value: unknown): SocialProofResource {
  return normalizeLower(value) === 'account' ? 'account' : 'media';
}

function buildMediaItemKey(entityType: unknown, entityId: unknown): string | null {
  const normalizedEntityType = normalizeLower(entityType);
  const normalizedEntityId = normalizeTrim(entityId);
  return normalizedEntityType && normalizedEntityId ? `${normalizedEntityType}_${normalizedEntityId}` : null;
}

function createEmptyProofGroup() {
  return {
    count: 0,
    previewUsers: [],
    users: [],
  };
}

function createEmptyMediaSocialProof() {
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

function createEmptyProfileSocialProof() {
  return {
    mutualFollowersCount: 0,
    sharedLikes: {
      count: 0,
      titles: [],
    },
  };
}

function normalizeSocialUser(user: Record<string, unknown> = {}) {
  const userId = normalizeTrim(user.id);

  if (!userId) return null;

  return {
    avatarUrl: normalizeTrim(user.avatarUrl) || null,
    displayName: normalizeTrim(user.displayName || user.name || user.email || user.username) || 'User',
    id: userId,
    username: normalizeTrim(user.username) || null,
  };
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function buildPreviewUsers(
  records: Array<{ user: Record<string, unknown> | null; userId: string }>,
  followProfileMap: Map<string, Record<string, unknown>>
) {
  const previews: Array<{ avatarUrl: string | null; displayName: string; id: string; username: string | null }> = [];
  const seen = new Set<string>();

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

function buildUsers(
  records: Array<{ user: Record<string, unknown> | null; userId: string }>,
  followProfileMap: Map<string, Record<string, unknown>>
) {
  const users: Array<{ avatarUrl: string | null; displayName: string; id: string; username: string | null }> = [];
  const seen = new Set<string>();

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

function buildProofGroup(
  recordsMap: Map<string, { user: Record<string, unknown> | null; userId: string }>,
  followProfileMap: Map<string, Record<string, unknown>>
) {
  const records = Array.from(recordsMap.values());

  return {
    count: records.length,
    previewUsers: buildPreviewUsers(records, followProfileMap),
    users: buildUsers(records, followProfileMap),
  };
}

async function loadFollowing(admin: SupabaseClient, viewerId: string) {
  if (!viewerId) {
    return {
      followProfileMap: new Map<string, Record<string, unknown>>(),
      followingIds: [],
    };
  }

  const followingResult = await admin
    .from('follows')
    .select(FOLLOWING_SELECT)
    .eq('follower_id', viewerId)
    .eq('status', 'accepted');

  assertResult(followingResult, 'Following list could not be loaded');

  const followingRows = (followingResult.data || []) as Record<string, unknown>[];
  const followProfileMap = new Map<string, Record<string, unknown>>();
  const followingIds: string[] = [];

  followingRows.forEach((row) => {
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

function addRowsToCategory(
  rows: Record<string, unknown>[],
  categoryMap: Map<string, { user: Record<string, unknown> | null; userId: string }>
) {
  rows.forEach((row) => {
    const userId = normalizeTrim(row.user_id);
    if (!userId) return;

    categoryMap.set(userId, {
      user: null,
      userId,
    });
  });
}

async function loadFollowingMediaActivity(admin: SupabaseClient, mediaKeys: string[], followingIds: string[]) {
  const categoryState = {
    likes: new Map<string, { user: Record<string, unknown> | null; userId: string }>(),
    reviews: new Map<string, { user: Record<string, unknown> | null; userId: string }>(),
    watched: new Map<string, { user: Record<string, unknown> | null; userId: string }>(),
    watchlist: new Map<string, { user: Record<string, unknown> | null; userId: string }>(),
  };

  if (mediaKeys.length === 0 || followingIds.length === 0) {
    return categoryState;
  }

  const [likesResult, watchedResult, watchlistResult, reviewsResult] = await Promise.all([
    admin.from('likes').select('user_id').in('media_key', mediaKeys).in('user_id', followingIds),
    admin.from('watched').select('user_id').in('media_key', mediaKeys).in('user_id', followingIds),
    admin.from('watchlist').select('user_id').in('media_key', mediaKeys).in('user_id', followingIds),
    admin.from('media_reviews').select('user_id').in('media_key', mediaKeys).in('user_id', followingIds),
  ]);

  assertResult(likesResult, 'Media social proof could not be loaded');
  assertResult(watchedResult, 'Media social proof could not be loaded');
  assertResult(watchlistResult, 'Media social proof could not be loaded');
  assertResult(reviewsResult, 'Media social proof could not be loaded');

  addRowsToCategory((likesResult.data || []) as Record<string, unknown>[], categoryState.likes);
  addRowsToCategory((watchedResult.data || []) as Record<string, unknown>[], categoryState.watched);
  addRowsToCategory((watchlistResult.data || []) as Record<string, unknown>[], categoryState.watchlist);
  addRowsToCategory((reviewsResult.data || []) as Record<string, unknown>[], categoryState.reviews);

  return categoryState;
}

async function loadFollowingListSignals(
  admin: SupabaseClient,
  mediaKeys: string[],
  followingIds: string[],
  followProfileMap: Map<string, Record<string, unknown>>
) {
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
  assertResult(listItemsResult, 'List social proof could not be loaded');

  const listItemRows = (listItemsResult.data || []) as Record<string, unknown>[];
  const listIds = Array.from(new Set(listItemRows.map((row) => normalizeTrim(row.list_id)).filter(Boolean)));

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

  assertResult(listsResult, 'List social proof could not be loaded');

  const lists = ((listsResult.data || []) as Record<string, unknown>[]).map((list) => ({
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

  const listUserMap = new Map<string, { user: Record<string, unknown> | null; userId: string }>();

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

function buildHighlights({
  isPerson,
  likes,
  lists,
  reviews,
  watched,
  watchlist,
}: {
  isPerson: boolean;
  likes: ReturnType<typeof createEmptyProofGroup>;
  lists: { count: number; previewLists: unknown[]; previewUsers: unknown[]; users: unknown[] };
  reviews: ReturnType<typeof createEmptyProofGroup>;
  watched: ReturnType<typeof createEmptyProofGroup>;
  watchlist: ReturnType<typeof createEmptyProofGroup>;
}) {
  const highlights: Array<{
    key: string;
    label: string;
    previewUsers?: unknown[];
    score: number;
  }> = [];

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

async function getMediaSocialProofResource(
  admin: SupabaseClient,
  {
    entityId,
    entityType,
    viewerId,
  }: {
    entityId: string;
    entityType: string;
    viewerId: string;
  }
) {
  if (!viewerId || !entityId || !entityType) {
    return createEmptyMediaSocialProof();
  }

  const normalizedEntityType = normalizeLower(entityType);
  if (normalizedEntityType !== 'movie') {
    return createEmptyMediaSocialProof();
  }

  const mediaKeys = [buildMediaItemKey(normalizedEntityType, entityId)].filter(Boolean);

  if (mediaKeys.length === 0) {
    return createEmptyMediaSocialProof();
  }

  const { followProfileMap, followingIds } = await loadFollowing(admin, viewerId);

  if (followingIds.length === 0) {
    return createEmptyMediaSocialProof();
  }

  const [categoryState, lists] = await Promise.all([
    loadFollowingMediaActivity(admin, mediaKeys as string[], followingIds),
    loadFollowingListSignals(admin, mediaKeys as string[], followingIds, followProfileMap),
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

async function getAccountSocialProofResource(
  admin: SupabaseClient,
  {
    canViewPrivateContent,
    targetUserId,
    viewerId,
  }: {
    canViewPrivateContent: boolean;
    targetUserId: string;
    viewerId: string;
  }
) {
  if (!viewerId || !targetUserId || viewerId === targetUserId || !canViewPrivateContent) {
    return createEmptyProfileSocialProof();
  }

  const viewerFollowersResult = await admin
    .from('follows')
    .select('follower_id')
    .eq('following_id', viewerId)
    .eq('status', 'accepted');

  assertResult(viewerFollowersResult, 'Social proof could not be loaded');

  const viewerFollowerIds = (viewerFollowersResult.data || [])
    .map((row) => normalizeTrim((row as Record<string, unknown>).follower_id))
    .filter(Boolean);

  let mutualFollowersCount = 0;

  if (viewerFollowerIds.length > 0) {
    const mutualFollowersResult = await admin
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', targetUserId)
      .eq('status', 'accepted')
      .in('follower_id', viewerFollowerIds.slice(0, 1000));

    assertResult(mutualFollowersResult, 'Social proof could not be loaded');
    mutualFollowersCount = Number(mutualFollowersResult.count || 0);
  }

  const viewerLikesResult = await admin.from('likes').select('media_key,title').eq('user_id', viewerId);
  assertResult(viewerLikesResult, 'Social proof could not be loaded');

  const viewerLikesKeys = (viewerLikesResult.data || [])
    .map((row) => normalizeTrim((row as Record<string, unknown>).media_key))
    .filter(Boolean);

  let sharedCount = 0;
  let sharedTitles: string[] = [];

  if (viewerLikesKeys.length > 0) {
    const sharedLikesResult = await admin
      .from('likes')
      .select('media_key,title', { count: 'exact' })
      .eq('user_id', targetUserId)
      .in('media_key', viewerLikesKeys.slice(0, 1000));

    assertResult(sharedLikesResult, 'Social proof could not be loaded');
    sharedCount = Number(sharedLikesResult.count || 0);
    sharedTitles = (sharedLikesResult.data || [])
      .map((item) => normalizeTrim((item as Record<string, unknown>).title))
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

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ['POST']);
    assertInternalAccess(request);

    const payload = await readJsonBody<SocialProofReadRequest>(request);
    const resource = normalizeResource(payload.resource);
    const admin = createAdminClient();

    if (resource === 'account') {
      const data = await getAccountSocialProofResource(admin, {
        canViewPrivateContent: parseBoolean(payload.canViewPrivateContent, false),
        targetUserId: normalizeTrim(payload.targetUserId),
        viewerId: normalizeTrim(payload.viewerId),
      });

      return jsonResponse(200, {
        data,
        ok: true,
        resource,
      });
    }

    const data = await getMediaSocialProofResource(admin, {
      entityId: normalizeTrim(payload.entityId),
      entityType: normalizeTrim(payload.entityType),
      viewerId: normalizeTrim(payload.viewerId),
    });

    return jsonResponse(200, {
      data,
      ok: true,
      resource,
    });
  } catch (error) {
    return errorResponse(mapErrorToStatus(error), String((error as Error)?.message || 'social-proof-read failed'));
  }
});
