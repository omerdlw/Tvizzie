import { NextResponse } from 'next/server';

import { createAdminClient } from '@/core/clients/supabase/admin';
import { getOrLoadCachedValue } from '@/core/services/shared';
import { normalizeTimestamp } from '@/core/utils';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const COMMUNITY_TYPES = new Set(['all', 'list', 'review']);
const LIST_SELECT = [
  'created_at',
  'description',
  'id',
  'likes_count',
  'payload',
  'poster_path',
  'reviews_count',
  'slug',
  'title',
  'updated_at',
  'user_id',
].join(',');
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
const PROFILE_SELECT = ['avatar_url', 'display_name', 'id', 'is_private', 'username'].join(',');

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeType(value) {
  const normalized = normalizeValue(value).toLowerCase();
  return COMMUNITY_TYPES.has(normalized) ? normalized : 'all';
}

function normalizeLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.max(1, Math.floor(parsed)), MAX_LIMIT);
}

function escapeLikePattern(value) {
  return normalizeValue(value).replace(/[\\%_]/g, (match) => `\\${match}`);
}

function createPattern(query) {
  return `%${escapeLikePattern(query)}%`;
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result;
}

function isPublicProfile(profile) {
  return Boolean(profile?.id) && profile.is_private !== true;
}

function normalizeProfile(profile = {}) {
  if (!profile?.id) {
    return null;
  }

  return {
    avatarUrl: profile.avatar_url || null,
    displayName: profile.display_name || profile.username || 'Anonymous User',
    id: profile.id,
    username: profile.username || null,
  };
}

async function loadPublicProfileMap(admin, ids = []) {
  const uniqueIds = [...new Set(ids.map(normalizeValue).filter(Boolean))];
  const profileMap = new Map();

  if (uniqueIds.length === 0) {
    return profileMap;
  }

  for (let index = 0; index < uniqueIds.length; index += 100) {
    const chunk = uniqueIds.slice(index, index + 100);
    const result = await admin.from('profiles').select(PROFILE_SELECT).in('id', chunk);

    assertResult(result, 'Profiles could not be loaded');

    (result.data || []).forEach((profile) => {
      if (isPublicProfile(profile)) {
        profileMap.set(profile.id, normalizeProfile(profile));
      }
    });
  }

  return profileMap;
}

function dedupeByKey(items = [], getKey) {
  const seen = new Set();

  return items.filter((item) => {
    const key = normalizeValue(getKey(item));

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getListHref(row = {}, owner = null) {
  const ownerSlug = owner?.username || row.user_id;
  const listSlug = row.slug || row.id;

  return ownerSlug && listSlug ? `/account/${ownerSlug}/lists/${listSlug}` : null;
}

function normalizePreviewItems(value) {
  return Array.isArray(value) ? value.slice(0, 4) : [];
}

function normalizeListResult(row = {}, owner = null) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};

  return {
    coverUrl: payload.coverUrl || row.poster_path || null,
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || payload.description || '',
    href: getListHref(row, owner),
    id: row.id,
    itemsCount: Number.isFinite(Number(payload.itemsCount)) ? Number(payload.itemsCount) : 0,
    likesCount: Number.isFinite(Number(row.likes_count)) ? Number(row.likes_count) : 0,
    media_type: 'list',
    owner,
    previewItems: normalizePreviewItems(payload.previewItems),
    reviewsCount: Number.isFinite(Number(row.reviews_count)) ? Number(row.reviews_count) : 0,
    slug: row.slug || row.id,
    title: row.title || payload.title || 'Untitled List',
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

async function queryListsByColumn(admin, column, pattern, limit) {
  const result = await admin
    .from('lists')
    .select(LIST_SELECT)
    .ilike(column, pattern)
    .order('updated_at', { ascending: false })
    .limit(limit);

  assertResult(result, 'Lists could not be searched');
  return Array.isArray(result.data) ? result.data : [];
}

async function searchLists(admin, query, limit) {
  const pattern = createPattern(query);
  const [titleRows, descriptionRows] = await Promise.all([
    queryListsByColumn(admin, 'title', pattern, limit),
    queryListsByColumn(admin, 'description', pattern, limit),
  ]);
  const rows = dedupeByKey([...titleRows, ...descriptionRows], (row) => row.id).slice(0, limit);
  const ownerMap = await loadPublicProfileMap(
    admin,
    rows.map((row) => row.user_id)
  );

  return rows.map((row) => normalizeListResult(row, ownerMap.get(row.user_id))).filter((item) => item.owner?.id);
}

function buildMediaReviewHref(subject = {}) {
  if (subject.subjectHref) {
    return subject.subjectHref;
  }

  if (subject.subjectType === 'movie' && subject.subjectId) {
    return `/movie/${subject.subjectId}`;
  }

  return null;
}

function normalizeReviewSubjectFromPayload(payload = {}, row = {}) {
  return {
    href: buildMediaReviewHref(payload),
    id: payload.subjectId || payload.id || row.media_key || row.list_id || null,
    poster: payload.subjectPoster || payload.poster_path || payload.posterPath || null,
    previewItems: normalizePreviewItems(payload.subjectPreviewItems),
    title: payload.subjectTitle || payload.title || 'Untitled',
    type: payload.subjectType || (row.list_id ? 'list' : 'movie'),
  };
}

function normalizeReviewResult(row = {}, { list = null, user = null } = {}) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const subject = list
    ? {
        href: list.href,
        id: list.id,
        poster: list.coverUrl,
        previewItems: list.previewItems,
        title: list.title,
        type: 'list',
      }
    : normalizeReviewSubjectFromPayload(payload, row);
  const reviewKey = row.media_key || (row.list_id ? `list:${row.list_id}` : subject.id);

  return {
    content: row.is_spoiler ? '' : row.content || payload.content || '',
    createdAt: normalizeTimestamp(row.created_at),
    href: subject.href,
    id: `${reviewKey}:${row.user_id}`,
    isSpoiler: row.is_spoiler === true,
    media_type: 'review',
    rating: row.rating === null || row.rating === undefined ? (payload.rating ?? null) : Number(row.rating),
    subject,
    updatedAt: normalizeTimestamp(row.updated_at),
    user,
  };
}

async function searchMediaReviews(admin, query, limit) {
  const result = await admin
    .from('media_reviews')
    .select(MEDIA_REVIEW_SELECT)
    .ilike('content', createPattern(query))
    .order('updated_at', { ascending: false })
    .limit(limit);

  assertResult(result, 'Media reviews could not be searched');

  const rows = Array.isArray(result.data) ? result.data : [];
  const userMap = await loadPublicProfileMap(
    admin,
    rows.map((row) => row.user_id)
  );

  return rows
    .map((row) => normalizeReviewResult(row, { user: userMap.get(row.user_id) }))
    .filter((item) => item.user?.id);
}

async function loadListMap(admin, listIds = []) {
  const uniqueIds = [...new Set(listIds.map(normalizeValue).filter(Boolean))];
  const listMap = new Map();

  if (uniqueIds.length === 0) {
    return listMap;
  }

  const result = await admin.from('lists').select(LIST_SELECT).in('id', uniqueIds);
  assertResult(result, 'List context could not be loaded');

  const rows = Array.isArray(result.data) ? result.data : [];
  const ownerMap = await loadPublicProfileMap(
    admin,
    rows.map((row) => row.user_id)
  );

  rows.forEach((row) => {
    const owner = ownerMap.get(row.user_id);

    if (owner?.id) {
      listMap.set(row.id, normalizeListResult(row, owner));
    }
  });

  return listMap;
}

async function searchListReviews(admin, query, limit) {
  const result = await admin
    .from('list_reviews')
    .select(LIST_REVIEW_SELECT)
    .ilike('content', createPattern(query))
    .order('updated_at', { ascending: false })
    .limit(limit);

  assertResult(result, 'List reviews could not be searched');

  const rows = Array.isArray(result.data) ? result.data : [];
  const [userMap, listMap] = await Promise.all([
    loadPublicProfileMap(
      admin,
      rows.map((row) => row.user_id)
    ),
    loadListMap(
      admin,
      rows.map((row) => row.list_id)
    ),
  ]);

  return rows
    .map((row) => normalizeReviewResult(row, { list: listMap.get(row.list_id), user: userMap.get(row.user_id) }))
    .filter((item) => item.user?.id && item.subject?.href);
}

function sortByUpdatedAt(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime();
    const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime();

    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
}

async function searchCommunity({ limit, query, type }) {
  const admin = createAdminClient();

  if (type === 'list') {
    return {
      lists: await searchLists(admin, query, limit),
      reviews: [],
    };
  }

  if (type === 'review') {
    const [mediaReviews, listReviews] = await Promise.all([
      searchMediaReviews(admin, query, limit),
      searchListReviews(admin, query, limit),
    ]);

    return {
      lists: [],
      reviews: sortByUpdatedAt([...mediaReviews, ...listReviews]).slice(0, limit),
    };
  }

  const [lists, mediaReviews, listReviews] = await Promise.all([
    searchLists(admin, query, limit),
    searchMediaReviews(admin, query, limit),
    searchListReviews(admin, query, limit),
  ]);

  return {
    lists,
    reviews: sortByUpdatedAt([...mediaReviews, ...listReviews]).slice(0, limit),
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = normalizeValue(searchParams.get('q') || searchParams.get('query'));
    const type = normalizeType(searchParams.get('type'));
    const limit = normalizeLimit(searchParams.get('limitCount'));

    if (!query) {
      return NextResponse.json({ items: [], lists: [], reviews: [] });
    }

    const payload = await getOrLoadCachedValue({
      cacheKey: `community-search|type=${type}|query=${query}|limit=${limit}`,
      enabled: true,
      ttlMs: 1500,
      loader: () => searchCommunity({ limit, query, type }),
    });
    const lists = Array.isArray(payload?.lists) ? payload.lists : [];
    const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];

    return NextResponse.json({
      items: [...lists, ...reviews],
      lists,
      reviews,
    });
  } catch (error) {
    console.error('[Community Search API Error]', error);

    return NextResponse.json({ items: [], lists: [], reviews: [] });
  }
}
