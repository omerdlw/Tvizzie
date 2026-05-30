import { normalizeTimestamp } from '@/core/utils/format';
import { cleanString } from '@/core/utils/string';
import { getUserAccount } from '@/core/services/account/account.service';
import { assertMovieMedia, buildMediaItemKey, normalizeMediaPayload } from '@/core/services/shared/media';

import { isMovieMediaType } from '@/core/utils/media';

export function resolveRpcRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (data && typeof data === 'object') {
    return data;
  }

  return null;
}

export function slugifyListTitle(value) {
  const trMap = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
    Ç: 'c',
    Ğ: 'g',
    İ: 'i',
    Ö: 'o',
    Ş: 's',
    Ü: 'u',
  };

  return cleanString(value)
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (match) => trMap[match])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function normalizeListOwnerSnapshot(value = {}, fallbackOwnerId = null) {
  const ownerId = value?.id || fallbackOwnerId || null;

  return ownerId
    ? {
        avatarUrl: value?.avatarUrl || null,
        displayName: value?.displayName || value?.username || 'Anonymous User',
        id: ownerId,
        username: value?.username || null,
      }
    : null;
}

export function normalizeListPreviewItem(value = {}) {
  const normalized = normalizeMediaPayload(value, value);

  if (!normalized.entityId || !isMovieMediaType(normalized.entityType)) {
    return null;
  }

  return {
    ...normalized,
    id: normalized.entityId,
  };
}

export function validateListTitle(value) {
  const title = cleanString(value);

  if (title.length < 2) {
    throw new Error('List title must be at least 2 characters long');
  }

  return title.slice(0, 80);
}

export function validateListDescription(value) {
  return cleanString(value).slice(0, 280);
}

export function dedupeListItems(items = []) {
  const uniqueItems = new Map();

  items.forEach((item, index) => {
    const mediaSnapshot = assertMovieMedia(item, 'Lists support movies only');

    if (!mediaSnapshot.entityId || !mediaSnapshot.entityType || !mediaSnapshot.title) {
      return;
    }

    const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId);

    if (uniqueItems.has(mediaKey)) {
      return;
    }

    uniqueItems.set(mediaKey, {
      ...item,
      entityId: mediaSnapshot.entityId,
      entityType: mediaSnapshot.entityType,
      id: mediaSnapshot.entityId,
      mediaKey,
      position: index + 1,
      title: item?.title || item?.original_title || item?.name || item?.original_name,
    });
  });

  return Array.from(uniqueItems.values());
}

export async function buildListOwnerSnapshot(userId) {
  const profile = await getUserAccount(userId);

  return normalizeListOwnerSnapshot(
    {
      avatarUrl: profile?.avatarUrl || null,
      displayName: profile?.displayName || profile?.username || 'Anonymous User',
      id: userId,
      username: profile?.username || null,
    },
    userId
  );
}

export function chunkArray(values = [], size = 50) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

export function normalizeListRow(row = {}, likesMap = new Map()) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const ownerSnapshot = normalizeListOwnerSnapshot(payload.ownerSnapshot || {}, row.user_id);
  const likes = Array.isArray(likesMap.get(row.id))
    ? likesMap.get(row.id)
    : Array.isArray(payload.likes)
      ? payload.likes
      : [];

  return {
    coverUrl: payload.coverUrl || row.poster_path || '',
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || payload.description || '',
    id: row.id,
    itemsCount: Number.isFinite(Number(payload.itemsCount)) ? Number(payload.itemsCount) : 0,
    likes,
    likesCount: Number.isFinite(Number(row.likes_count)) ? Number(row.likes_count) : likes.length,
    ownerId: row.user_id,
    ownerSnapshot,
    previewItems: Array.isArray(payload.previewItems)
      ? payload.previewItems.map(normalizeListPreviewItem).filter(Boolean)
      : [],
    reviewsCount: Number.isFinite(Number(row.reviews_count))
      ? Number(row.reviews_count)
      : Number(payload.reviewsCount || 0),
    slug: row.slug || payload.slug || row.id,
    title: row.title || payload.title || 'Untitled List',
    updatedAt: normalizeTimestamp(row.updated_at),
  };
}

export function createListPayload({
  coverUrl,
  description,
  ownerSnapshot,
  previewItems = [],
  reviewsCount = 0,
  title,
  slug,
  itemsCount = 0,
}) {
  return {
    coverUrl,
    description,
    itemsCount,
    likes: [],
    ownerSnapshot,
    previewItems,
    reviewsCount,
    slug,
    title,
  };
}
