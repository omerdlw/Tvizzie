import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import {
  assertInternalAccess,
  assertMethod,
  assertResult,
  createAdminClient,
  errorResponse,
  isListSubjectType,
  isMovieMediaType,
  isTvReference,
  jsonResponse,
  mapErrorToStatus,
  normalizeTimestamp,
  normalizeTrim,
  readJsonBody,
  resolveLimitCount,
} from '../_internal/common.ts';

type ReviewMode = 'authored' | 'liked';

type AccountReviewsFeedRequest = {
  cursor?: number | string | null;
  mode?: ReviewMode | string | null;
  pageSize?: number | string | null;
  userId?: string;
  viewerId?: string | null;
};

const MEDIA_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'media_key',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');

const LIST_REVIEW_SELECT = [
  'content',
  'created_at',
  'is_spoiler',
  'list_id',
  'payload',
  'rating',
  'updated_at',
  'user_id',
].join(',');

const REVIEW_LIKE_SELECT = ['created_at', 'media_key', 'review_user_id'].join(',');

function normalizeMode(value: unknown): ReviewMode {
  const normalized = normalizeTrim(value).toLowerCase();

  if (normalized === 'liked') {
    return 'liked';
  }

  return 'authored';
}

function resolvePageSize(value: unknown): number {
  return resolveLimitCount(value, 20, 100);
}

function createListReviewLikeKey(ownerId: string, listId: string) {
  return `list:${ownerId}:${listId}`;
}

function parseListReviewLikeKey(value: unknown): { listId: string; ownerId: string } | null {
  const match = normalizeTrim(value).match(/^list:([^:]+):(.+)$/);

  if (!match) {
    return null;
  }

  return {
    listId: normalizeTrim(match[2]),
    ownerId: normalizeTrim(match[1]),
  };
}

function buildReviewDocPath(
  subject: {
    subjectId?: string | null;
    subjectKey?: string | null;
    subjectOwnerId?: string | null;
    subjectType?: string | null;
  } = {},
  userId: string | null
) {
  if (subject.subjectType === 'list') {
    return `users/${subject.subjectOwnerId}/lists/${subject.subjectId}/reviews/${userId}`;
  }

  return `media_items/${subject.subjectKey}/reviews/${userId}`;
}

function normalizeReviewRow(
  row: Record<string, unknown> = {},
  subjectOverrides: Record<string, unknown> = {},
  likes: string[] = []
) {
  const payload = row.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};
  const user = payload.user && typeof payload.user === 'object' ? (payload.user as Record<string, unknown>) : {};
  const subject = {
    subjectHref: normalizeTrim(payload.subjectHref) || null,
    subjectId: normalizeTrim(payload.subjectId) || null,
    subjectKey: normalizeTrim(payload.subjectKey || row.media_key) || null,
    subjectOwnerId: normalizeTrim(payload.subjectOwnerId) || null,
    subjectOwnerUsername: normalizeTrim(payload.subjectOwnerUsername) || null,
    subjectPreviewItems: Array.isArray(payload.subjectPreviewItems) ? payload.subjectPreviewItems : [],
    subjectPoster: normalizeTrim(payload.subjectPoster) || null,
    subjectSlug: normalizeTrim(payload.subjectSlug) || null,
    subjectTitle: normalizeTrim(payload.subjectTitle || payload.title) || 'Untitled',
    subjectType: normalizeTrim(payload.subjectType) || null,
    ...subjectOverrides,
  };
  const reviewUserId = normalizeTrim(row.user_id || payload.authorId || user.id) || null;
  const docPath = buildReviewDocPath(subject, reviewUserId);

  return {
    authorId: reviewUserId,
    content: normalizeTrim(row.content || payload.content) || '',
    createdAt: normalizeTimestamp(row.created_at),
    docPath,
    id: `${docPath}:${reviewUserId}`,
    isSpoiler: Boolean(row.is_spoiler || payload.isSpoiler),
    likes,
    mediaKey: normalizeTrim(row.media_key || subject.subjectKey) || null,
    rating: row.rating === null || row.rating === undefined ? (payload.rating ?? null) : Number(row.rating),
    reviewUserId,
    subjectHref: subject.subjectHref,
    subjectId: subject.subjectId,
    subjectKey: subject.subjectKey,
    subjectOwnerId: subject.subjectOwnerId,
    subjectOwnerUsername: subject.subjectOwnerUsername,
    subjectPreviewItems: subject.subjectPreviewItems,
    subjectPoster: subject.subjectPoster,
    subjectSlug: subject.subjectSlug,
    subjectTitle: subject.subjectTitle,
    subjectType: subject.subjectType,
    updatedAt: normalizeTimestamp(row.updated_at),
    user: {
      avatarUrl: normalizeTrim(user.avatarUrl) || null,
      id: reviewUserId,
      name: normalizeTrim(user.name) || 'Anonymous User',
      username: normalizeTrim(user.username) || null,
    },
  };
}

function buildLikesMap(rows: Record<string, unknown>[] = []) {
  const map = new Map<string, string[]>();

  rows.forEach((row) => {
    const key = `${normalizeTrim(row.media_key)}:${normalizeTrim(row.review_user_id)}`;

    if (!key || key === ':') {
      return;
    }

    const current = map.get(key) || [];
    current.push(normalizeTrim(row.user_id));
    map.set(key, current.filter(Boolean));
  });

  return map;
}

async function fetchReviewLikes(
  admin: ReturnType<typeof createAdminClient>,
  mediaKeys: string[]
): Promise<Map<string, string[]>> {
  if (!Array.isArray(mediaKeys) || mediaKeys.length === 0) {
    return new Map();
  }

  const uniqueKeys = [...new Set(mediaKeys.filter(Boolean))];
  const likesRows: Record<string, unknown>[] = [];

  for (let index = 0; index < uniqueKeys.length; index += 100) {
    const chunk = uniqueKeys.slice(index, index + 100);
    const result = await admin.from('review_likes').select('media_key,review_user_id,user_id').in('media_key', chunk);

    assertResult(result, 'Review likes could not be loaded');
    likesRows.push(...((result.data || []) as Record<string, unknown>[]));
  }

  return buildLikesMap(likesRows);
}

function getSortableTimestamp(value: unknown): number {
  const normalized = normalizeTrim(value);

  if (!normalized) {
    return 0;
  }

  const timestamp = Date.parse(normalized);

  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortReviewsByUpdatedAtDesc(items: Record<string, unknown>[] = []) {
  return [...items].sort((left, right) => {
    const updatedDiff = getSortableTimestamp(right.updatedAt) - getSortableTimestamp(left.updatedAt);

    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return String(right.id || '').localeCompare(String(left.id || ''));
  });
}

function dedupeReviews(items: Record<string, unknown>[] = []) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = normalizeTrim(item.id);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isSupportedReviewItem(item: Record<string, unknown> = {}) {
  if (isListSubjectType(item.subjectType)) {
    return true;
  }

  if (!isMovieMediaType(item.subjectType)) {
    return false;
  }

  return !isTvReference(item.subjectHref);
}

function paginateReviewItems(items: Record<string, unknown>[] = [], cursor: unknown, pageSize: number) {
  const offset = Number.isFinite(Number(cursor)) ? Number(cursor) : 0;
  const nextItems = items.slice(offset, offset + pageSize);
  const nextOffset = offset + nextItems.length;

  return {
    hasMore: nextOffset < items.length,
    items: nextItems,
    nextCursor: nextOffset < items.length ? nextOffset : null,
  };
}

async function canViewerAccessUserContent(
  admin: ReturnType<typeof createAdminClient>,
  {
    ownerId,
    viewerId,
  }: {
    ownerId: string;
    viewerId: string | null;
  }
) {
  if (!ownerId) {
    return false;
  }

  if (viewerId && viewerId === ownerId) {
    return true;
  }

  const profileResult = await admin.from('profiles').select('is_private').eq('id', ownerId).maybeSingle();

  assertResult(profileResult, 'Profile visibility could not be checked');

  if (!profileResult.data) {
    return false;
  }

  if (profileResult.data.is_private !== true) {
    return true;
  }

  if (!viewerId) {
    return false;
  }

  const followResult = await admin
    .from('follows')
    .select('status')
    .eq('follower_id', viewerId)
    .eq('following_id', ownerId)
    .eq('status', 'accepted')
    .maybeSingle();

  assertResult(followResult, 'Profile visibility could not be checked');
  return Boolean(followResult.data);
}

async function loadListSubjectMap(
  admin: ReturnType<typeof createAdminClient>,
  listIds: string[] = []
): Promise<Map<string, Record<string, unknown>>> {
  const uniqueListIds = [...new Set(listIds.filter(Boolean))];

  if (uniqueListIds.length === 0) {
    return new Map();
  }

  const listsResult = await admin
    .from('lists')
    .select('id,user_id,slug,title,poster_path,payload')
    .in('id', uniqueListIds);

  assertResult(listsResult, 'List context could not be loaded');

  const listRows = (listsResult.data || []) as Record<string, unknown>[];
  const ownerIds = [...new Set(listRows.map((row) => normalizeTrim(row.user_id)).filter(Boolean))];
  const ownerMap = new Map<string, string>();

  if (ownerIds.length > 0) {
    const ownerResult = await admin.from('profiles').select('id,username').in('id', ownerIds);

    assertResult(ownerResult, 'List owners could not be loaded');
    (ownerResult.data || []).forEach((owner) => {
      const row = owner as Record<string, unknown>;
      const id = normalizeTrim(row.id);

      if (!id) {
        return;
      }

      ownerMap.set(id, normalizeTrim(row.username) || id);
    });
  }

  const listMap = new Map<string, Record<string, unknown>>();

  listRows.forEach((row) => {
    const payload = row.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};
    const ownerSnapshot =
      payload.ownerSnapshot && typeof payload.ownerSnapshot === 'object'
        ? (payload.ownerSnapshot as Record<string, unknown>)
        : {};
    const userId = normalizeTrim(row.user_id);
    const listId = normalizeTrim(row.id);
    const ownerUsername = normalizeTrim(ownerSnapshot.username) || ownerMap.get(userId) || userId;
    const slug = normalizeTrim(row.slug || row.id);

    listMap.set(listId, {
      subjectHref: `/account/${ownerUsername}/lists/${slug}`,
      subjectId: listId,
      subjectKey: createListReviewLikeKey(userId, listId),
      subjectOwnerId: userId,
      subjectOwnerUsername: ownerUsername,
      subjectPreviewItems: Array.isArray(payload.previewItems) ? payload.previewItems : [],
      subjectPoster: normalizeTrim(row.poster_path || payload.coverUrl) || null,
      subjectSlug: slug,
      subjectTitle: normalizeTrim(row.title) || 'Untitled List',
      subjectType: 'list',
    });
  });

  return listMap;
}

async function fetchAuthoredReviews(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<Record<string, unknown>[]> {
  const [mediaResult, listResult] = await Promise.all([
    admin
      .from('media_reviews')
      .select(MEDIA_REVIEW_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
    admin
      .from('list_reviews')
      .select(LIST_REVIEW_SELECT)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false }),
  ]);

  assertResult(mediaResult, 'Reviews could not be loaded');
  assertResult(listResult, 'Reviews could not be loaded');

  const mediaRows = (mediaResult.data || []) as Record<string, unknown>[];
  const listRows = (listResult.data || []) as Record<string, unknown>[];
  const listMap = await loadListSubjectMap(admin, listRows.map((row) => normalizeTrim(row.list_id)).filter(Boolean));

  const likeKeys = [
    ...mediaRows.map((row) => normalizeTrim(row.media_key)),
    ...listRows.map((row) => {
      const subject = listMap.get(normalizeTrim(row.list_id));
      return normalizeTrim(subject?.subjectKey);
    }),
  ].filter(Boolean);

  const likesMap = await fetchReviewLikes(admin, likeKeys);

  const mediaReviews = mediaRows.map((row) =>
    normalizeReviewRow(row, {}, likesMap.get(`${normalizeTrim(row.media_key)}:${normalizeTrim(row.user_id)}`) || [])
  );

  const listReviews = listRows.map((row) => {
    const subject = listMap.get(normalizeTrim(row.list_id)) || {
      subjectHref: null,
      subjectId: normalizeTrim(row.list_id),
      subjectKey: createListReviewLikeKey('', normalizeTrim(row.list_id)),
      subjectOwnerId: null,
      subjectOwnerUsername: null,
      subjectPreviewItems: [],
      subjectPoster: null,
      subjectSlug: normalizeTrim(row.list_id),
      subjectTitle: 'Untitled List',
      subjectType: 'list',
    };

    return normalizeReviewRow(
      row,
      subject,
      likesMap.get(`${normalizeTrim(subject.subjectKey)}:${normalizeTrim(row.user_id)}`) || []
    );
  });

  return sortReviewsByUpdatedAtDesc([...mediaReviews, ...listReviews]);
}

async function fetchLikedReviews(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<Record<string, unknown>[]> {
  const likesResult = await admin
    .from('review_likes')
    .select(REVIEW_LIKE_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  assertResult(likesResult, 'Liked reviews could not be loaded');

  const likedRows = (likesResult.data || []) as Record<string, unknown>[];
  const listLikeRows: Record<string, unknown>[] = [];
  const mediaLikeRows: Record<string, unknown>[] = [];

  likedRows.forEach((row) => {
    if (parseListReviewLikeKey(row.media_key)) {
      listLikeRows.push(row);
      return;
    }

    mediaLikeRows.push(row);
  });

  const listContextIds = listLikeRows
    .map((row) => parseListReviewLikeKey(row.media_key)?.listId)
    .filter(Boolean) as string[];

  const listMap = await loadListSubjectMap(admin, listContextIds);
  const mediaReviewMap = new Map<string, Record<string, unknown>>();
  const listReviewMap = new Map<string, Record<string, unknown>>();
  const mediaKeys = [...new Set(mediaLikeRows.map((row) => normalizeTrim(row.media_key)).filter(Boolean))];
  const listIds = [
    ...new Set(listLikeRows.map((row) => parseListReviewLikeKey(row.media_key)?.listId).filter(Boolean)),
  ] as string[];

  for (let index = 0; index < mediaKeys.length; index += 100) {
    const chunk = mediaKeys.slice(index, index + 100);
    const reviewResult = await admin.from('media_reviews').select(MEDIA_REVIEW_SELECT).in('media_key', chunk);

    assertResult(reviewResult, 'Liked reviews could not be loaded');
    (reviewResult.data || []).forEach((row) => {
      const normalized = row as Record<string, unknown>;
      mediaReviewMap.set(`${normalizeTrim(normalized.media_key)}:${normalizeTrim(normalized.user_id)}`, normalized);
    });
  }

  for (let index = 0; index < listIds.length; index += 100) {
    const chunk = listIds.slice(index, index + 100);
    const reviewResult = await admin.from('list_reviews').select(LIST_REVIEW_SELECT).in('list_id', chunk);

    assertResult(reviewResult, 'Liked reviews could not be loaded');
    (reviewResult.data || []).forEach((row) => {
      const normalized = row as Record<string, unknown>;
      listReviewMap.set(`${normalizeTrim(normalized.list_id)}:${normalizeTrim(normalized.user_id)}`, normalized);
    });
  }

  const likeKeys = [...new Set(likedRows.map((row) => normalizeTrim(row.media_key)).filter(Boolean))];
  const likesMap = await fetchReviewLikes(admin, likeKeys);

  const mediaReviews = mediaLikeRows
    .map((likeRow) => {
      const review = mediaReviewMap.get(`${normalizeTrim(likeRow.media_key)}:${normalizeTrim(likeRow.review_user_id)}`);

      if (!review) {
        return null;
      }

      return normalizeReviewRow(
        review,
        {},
        likesMap.get(`${normalizeTrim(likeRow.media_key)}:${normalizeTrim(review.user_id)}`) || []
      );
    })
    .filter(Boolean) as Record<string, unknown>[];

  const listReviews = listLikeRows
    .map((likeRow) => {
      const parsed = parseListReviewLikeKey(likeRow.media_key);

      if (!parsed) {
        return null;
      }

      const review = listReviewMap.get(`${parsed.listId}:${normalizeTrim(likeRow.review_user_id)}`);

      if (!review) {
        return null;
      }

      const subject = listMap.get(parsed.listId) || {
        subjectHref: null,
        subjectId: parsed.listId,
        subjectKey: normalizeTrim(likeRow.media_key),
        subjectOwnerId: parsed.ownerId,
        subjectOwnerUsername: parsed.ownerId,
        subjectPreviewItems: [],
        subjectPoster: null,
        subjectSlug: parsed.listId,
        subjectTitle: 'Untitled List',
        subjectType: 'list',
      };

      return normalizeReviewRow(
        review,
        subject,
        likesMap.get(`${normalizeTrim(likeRow.media_key)}:${normalizeTrim(review.user_id)}`) || []
      );
    })
    .filter(Boolean) as Record<string, unknown>[];

  return sortReviewsByUpdatedAtDesc([...mediaReviews, ...listReviews]);
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ['POST']);
    assertInternalAccess(request);

    const payload = await readJsonBody<AccountReviewsFeedRequest>(request);
    const userId = normalizeTrim(payload.userId);
    const viewerId = normalizeTrim(payload.viewerId) || null;
    const mode = normalizeMode(payload.mode);
    const pageSize = resolvePageSize(payload.pageSize);

    if (!userId) {
      return jsonResponse(200, {
        hasMore: false,
        items: [],
        nextCursor: null,
        ok: true,
      });
    }

    const admin = createAdminClient();
    const canViewProfile = await canViewerAccessUserContent(admin, {
      ownerId: userId,
      viewerId,
    });

    if (!canViewProfile) {
      const error = new Error('This profile is private') as Error & { status?: number };
      error.status = 403;
      throw error;
    }

    const reviews =
      mode === 'liked' ? await fetchLikedReviews(admin, userId) : await fetchAuthoredReviews(admin, userId);

    const paginated = paginateReviewItems(
      dedupeReviews(reviews).filter(isSupportedReviewItem),
      payload.cursor,
      pageSize
    );

    return jsonResponse(200, {
      ...paginated,
      mode,
      ok: true,
      userId,
    });
  } catch (error) {
    return errorResponse(mapErrorToStatus(error), String((error as Error)?.message || 'account-reviews-feed failed'));
  }
});
