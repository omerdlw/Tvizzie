import 'server-only';

import {
  getAccountResource,
  isAccountResource,
  normalizeListRow,
  toggleListLike as toggleListLikeRecord,
} from '@/domains/account/server/collections';
import { getAccountProfileByUserId } from '@/domains/account/server/profile';
import { createAdminClient } from '@/infrastructure/supabase/server';
import { createMediaPayload } from '@/domains/media/utils/media-payload';
import { buildMediaItemKey } from '@/domains/media/utils/media-key';
import { cleanString } from '@/shared';
import {
  getWatchTrackingResource,
  isWatchTrackingResource,
} from '@/domains/account/server/watch-tracking';

import { createAccountCoreError } from './errors';

const MEDIA_MUTATIONS = new Set([
  'collection_mark_watched',
  'collection_remove_like',
  'collection_remove_watched',
  'collection_remove_watchlist',
  'collection_toggle_like',
  'collection_toggle_list_item',
  'collection_toggle_watchlist',
]);

// List pages are primary data views. Returning an empty array after the
// bounded collection timeout makes a transient Supabase delay look like a
// real empty list, so these reads must be allowed to complete.
const PRIMARY_LIST_READ_RESOURCES = new Set(['lists', 'list-by-id', 'list-by-slug', 'list-items']);

function requireViewerId(viewer) {
  const userId = cleanString(viewer?.id);
  if (!userId) {
    throw createAccountCoreError('AUTHENTICATION_REQUIRED', 'Authentication is required', {
      status: 401,
    });
  }
  return userId;
}

function requireObject(value, code = 'LIBRARY_COMMAND_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createAccountCoreError(code, 'Library command must be an object', { status: 400 });
  }
  return value;
}

function requireListId(value) {
  const listId = cleanString(value);
  if (!listId) {
    throw createAccountCoreError('LIST_ID_REQUIRED', 'List ID is required', { status: 400 });
  }
  return listId;
}

function slugify(value) {
  return (
    cleanString(value)
      .toLocaleLowerCase('tr-TR')
      .replace(/[ç]/g, 'c')
      .replace(/[ğ]/g, 'g')
      .replace(/[ı]/g, 'i')
      .replace(/[ö]/g, 'o')
      .replace(/[ş]/g, 's')
      .replace(/[ü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'list'
  );
}

function normalizeListInput(input) {
  const source = requireObject(input);
  const title = cleanString(source.title).slice(0, 80);
  if (title.length < 2) {
    throw createAccountCoreError('LIST_TITLE_INVALID', 'List title must be at least 2 characters', {
      status: 400,
    });
  }
  return {
    coverUrl: cleanString(source.coverUrl).slice(0, 2048),
    description: cleanString(source.description).slice(0, 280),
    title,
  };
}

function normalizeMediaRpcParams(operation, rawParams, viewerId) {
  const params = requireObject(rawParams);
  if (!MEDIA_MUTATIONS.has(operation)) {
    throw createAccountCoreError(
      'LIBRARY_MEDIA_OPERATION_UNSUPPORTED',
      'Unsupported media operation',
      {
        status: 400,
      },
    );
  }

  const mediaKey = cleanString(params.p_media_key);
  if (!mediaKey) {
    throw createAccountCoreError('MEDIA_KEY_REQUIRED', 'Media key is required', { status: 400 });
  }

  const base = { p_media_key: mediaKey, p_user_id: viewerId };
  if (operation.startsWith('collection_remove_')) return base;

  const payload = params.p_payload && typeof params.p_payload === 'object' ? params.p_payload : {};
  return {
    ...base,
    ...(operation === 'collection_toggle_list_item'
      ? { p_list_id: requireListId(params.p_list_id), p_position: params.p_position ?? null }
      : {}),
    ...(operation === 'collection_mark_watched'
      ? {
          p_last_watched_at: params.p_last_watched_at || new Date().toISOString(),
          p_source_last_action: cleanString(params.p_source_last_action) || 'watched',
        }
      : {}),
    p_backdrop_path: cleanString(params.p_backdrop_path) || null,
    p_entity_id: cleanString(params.p_entity_id) || null,
    p_entity_type: cleanString(params.p_entity_type).toLowerCase() || null,
    p_payload: payload,
    p_poster_path: cleanString(params.p_poster_path) || null,
    p_title: cleanString(params.p_title) || null,
  };
}

function normalizeDiaryDay(value) {
  const normalized = cleanString(value);
  const timestamp = Date.parse(`${normalized}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
    Number.isNaN(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== normalized
  ) {
    throw createAccountCoreError('WATCHED_ON_INVALID', 'Watch day is invalid', { status: 400 });
  }
  return normalized;
}

function normalizeWatchDiaryInput(input, userId) {
  const source = requireObject(input);
  const media = createMediaPayload(source.media, userId);
  const episode = source.episode && typeof source.episode === 'object' ? source.episode : null;
  const seasonNumber = Number(episode?.seasonNumber ?? episode?.season_number);
  const episodeNumber = Number(episode?.episodeNumber ?? episode?.episode_number);

  if (media.entityType === 'tv') {
    if (
      !Number.isInteger(seasonNumber) ||
      seasonNumber <= 0 ||
      !Number.isInteger(episodeNumber) ||
      episodeNumber <= 0
    ) {
      throw createAccountCoreError(
        'WATCH_DIARY_EPISODE_REQUIRED',
        'Choose a specific TV episode to add it to your diary',
        { status: 400 },
      );
    }
  } else if (episode) {
    throw createAccountCoreError(
      'WATCH_DIARY_ENTRY_KIND_INVALID',
      'Only TV series can have episode diary entries',
      { status: 400 },
    );
  }

  return {
    entryKind: media.entityType === 'tv' ? 'episode' : 'title',
    episodeNumber: media.entityType === 'tv' ? episodeNumber : null,
    episodeTitle:
      media.entityType === 'tv'
        ? cleanString(episode?.episodeTitle || episode?.title || episode?.name).slice(0, 180) ||
          null
        : null,
    hasWatchedBefore: source.hasWatchedBefore === true,
    media,
    seasonNumber: media.entityType === 'tv' ? seasonNumber : null,
    watchedOn: normalizeDiaryDay(source.watchedOn || String(source.watchedAt || '').slice(0, 10)),
  };
}

function requireResult(result, fallback) {
  if (result?.error) throw new Error(result.error.message || fallback);
  return result?.data;
}

function requireWatchDiaryResult(result) {
  const message = result?.error?.message || '';
  if (message.includes('WATCH_DIARY_DATE_BEFORE_LATEST_ENTRY')) {
    throw createAccountCoreError(
      'WATCH_DIARY_DATE_BEFORE_LATEST_ENTRY',
      'A later diary entry already exists for this title.',
      { status: 400 },
    );
  }
  if (message.includes('WATCH_DIARY_TV_EPISODE_REQUIRED')) {
    throw createAccountCoreError(
      'WATCH_DIARY_EPISODE_REQUIRED',
      'Choose a specific TV episode to add it to your diary',
      { status: 400 },
    );
  }
  return requireResult(result, 'Watch diary entry could not be saved');
}

function toOwnerSnapshot(profile, userId) {
  return {
    avatarUrl: profile?.avatarUrl || null,
    displayName: profile?.displayName || profile?.username || 'Anonymous User',
    id: userId,
    username: profile?.username || null,
  };
}

function toListItemRows(items, userId) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).flatMap((item, index) => {
    const payload = createMediaPayload(item, userId, { position: index + 1 });
    if (seen.has(payload.mediaKey)) return [];
    seen.add(payload.mediaKey);
    return [
      {
        backdrop_path: payload.backdrop_path,
        entity_id: payload.entityId,
        entity_type: payload.entityType,
        media_key: payload.mediaKey,
        payload,
        position: index + 1,
        poster_path: payload.poster_path,
        title: payload.title,
      },
    ];
  });
}

export function createAccountLibrary({
  admin = createAdminClient,
  getResource = getAccountResource,
}) {
  return Object.freeze({
    async read({ input = {}, viewer } = {}) {
      const source = requireObject(input, 'LIBRARY_READ_INVALID');
      const isTrackingResource = isWatchTrackingResource(source.resource);
      if (!isAccountResource(source.resource) && !isTrackingResource) {
        throw createAccountCoreError(
          'LIBRARY_RESOURCE_UNSUPPORTED',
          'Unsupported library resource',
          {
            status: 400,
          },
        );
      }
      const viewerId = cleanString(viewer?.id) || null;
      const resourceInput = {
        entityType: source.entityType || null,
        episodeNumber: source.episodeNumber || null,
        fromDate: source.fromDate || null,
        limitCount: source.limitCount || null,
        listId: source.listId || null,
        media: source.media || null,
        resource: source.resource,
        seasonNumber: source.seasonNumber || null,
        slug: source.slug || null,
        toDate: source.toDate || null,
        userId: source.userId || viewerId,
        viewerId,
      };
      const data = isTrackingResource
        ? await getWatchTrackingResource(resourceInput)
        : await getResource({
            ...resourceInput,
            ...(PRIMARY_LIST_READ_RESOURCES.has(source.resource) ? { strict: true } : {}),
          });
      return { data, items: Array.isArray(data) ? data : [] };
    },

    async mutateMedia({ input, viewer } = {}) {
      const source = requireObject(input);
      const userId = requireViewerId(viewer);
      const operation = cleanString(source.operation);
      const result = await admin().rpc(
        operation,
        normalizeMediaRpcParams(operation, source.params, userId),
      );
      return { result: requireResult(result, 'Media collection could not be updated') };
    },

    async logWatch({ input, viewer } = {}) {
      const userId = requireViewerId(viewer);
      const {
        entryKind,
        episodeNumber,
        episodeTitle,
        hasWatchedBefore,
        media,
        seasonNumber,
        watchedOn,
      } = normalizeWatchDiaryInput(input, userId);
      const result = await admin().rpc('watch_diary_create_entry', {
        p_backdrop_path: media.backdrop_path || null,
        p_entry_kind: entryKind,
        p_entity_id: media.entityId,
        p_entity_type: media.entityType,
        p_episode_number: episodeNumber,
        p_episode_title: episodeTitle,
        p_media_key: media.mediaKey,
        p_poster_path: media.poster_path || null,
        p_has_watched_before: hasWatchedBefore,
        p_season_number: seasonNumber,
        p_title: media.title,
        p_user_id: userId,
        p_watched_on: watchedOn,
      });
      return { result: requireWatchDiaryResult(result) };
    },

    async createList({ input, viewer } = {}) {
      const source = requireObject(input);
      const userId = requireViewerId(viewer);
      const fields = normalizeListInput(source);
      const profile = await getAccountProfileByUserId(userId, { viewerId: userId });
      const ownerSnapshot = toOwnerSnapshot(profile, userId);
      const items = toListItemRows(source.items, userId);
      const payload = {
        coverUrl: fields.coverUrl,
        description: fields.description,
        itemsCount: items.length,
        likes: [],
        ownerSnapshot,
        previewItems: items.slice(0, 5).map((item) => item.payload),
        reviewsCount: 0,
        slug: slugify(fields.title),
        title: fields.title,
      };
      const result = await admin().rpc('list_create_with_items_atomic', {
        p_description: fields.description,
        p_items: items,
        p_payload: payload,
        p_poster_path: fields.coverUrl,
        p_slug: payload.slug,
        p_title: fields.title,
        p_user_id: userId,
      });
      const row = Array.isArray(requireResult(result, 'List could not be created'))
        ? result.data[0]
        : result.data;
      return { list: normalizeListRow(row || {}) };
    },

    async updateList({ input, viewer } = {}) {
      const source = requireObject(input);
      const userId = requireViewerId(viewer);
      const listId = requireListId(source.listId);
      const fields = normalizeListInput(source);
      const db = admin();
      const existing = await db
        .from('lists')
        .select('payload')
        .eq('id', listId)
        .eq('user_id', userId)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message || 'List could not be loaded');
      if (!existing.data) {
        throw createAccountCoreError('LIST_NOT_FOUND', 'List was not found', { status: 404 });
      }
      const payload =
        existing.data.payload && typeof existing.data.payload === 'object'
          ? existing.data.payload
          : {};
      const profile = await getAccountProfileByUserId(userId, { viewerId: userId });
      const nextPayload = {
        ...payload,
        coverUrl: fields.coverUrl,
        description: fields.description,
        ownerSnapshot: toOwnerSnapshot(profile, userId),
        slug: slugify(fields.title),
        title: fields.title,
      };
      const updated = await db
        .from('lists')
        .update({
          description: fields.description,
          payload: nextPayload,
          poster_path: fields.coverUrl,
          slug: nextPayload.slug,
          title: fields.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', listId)
        .eq('user_id', userId)
        .select()
        .maybeSingle();
      if (updated.error) throw new Error(updated.error.message || 'List could not be updated');
      return { list: normalizeListRow(updated.data || {}) };
    },

    async deleteList({ input, viewer } = {}) {
      const userId = requireViewerId(viewer);
      const result = await admin().rpc('list_delete_cascade', {
        p_list_id: requireListId(input?.listId),
        p_user_id: userId,
      });
      return { deleted: requireResult(result, 'List could not be deleted') === true };
    },

    async deleteListItems({ input, viewer } = {}) {
      const source = requireObject(input);
      const userId = requireViewerId(viewer);
      const listId = requireListId(source.listId);
      const mediaKeys = Array.isArray(source.mediaKeys)
        ? source.mediaKeys.map((k) => cleanString(k)).filter(Boolean)
        : [];

      if (mediaKeys.length === 0) {
        return { deletedCount: 0 };
      }

      const db = admin();
      const owner = await db
        .from('lists')
        .select('id, payload')
        .eq('id', listId)
        .eq('user_id', userId)
        .maybeSingle();

      if (owner.error) throw new Error(owner.error.message || 'List could not be loaded');
      if (!owner.data)
        throw createAccountCoreError('LIST_NOT_FOUND', 'List was not found', { status: 404 });

      const deleteResult = await db
        .from('list_items')
        .delete()
        .eq('user_id', userId)
        .eq('list_id', listId)
        .in('media_key', mediaKeys);

      if (deleteResult.error) {
        throw new Error(deleteResult.error.message || 'List items could not be deleted');
      }

      const remainingItemsResult = await db
        .from('list_items')
        .select('payload')
        .eq('list_id', listId)
        .eq('user_id', userId)
        .order('position', { ascending: true });

      const remainingItems = remainingItemsResult.data || [];
      const previewItems = remainingItems
        .slice(0, 5)
        .map((row) => row.payload)
        .filter(Boolean);

      const currentPayload =
        owner.data.payload && typeof owner.data.payload === 'object' ? owner.data.payload : {};

      await db
        .from('lists')
        .update({
          payload: {
            ...currentPayload,
            itemsCount: remainingItems.length,
            previewItems,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', listId)
        .eq('user_id', userId);

      return {
        deletedCount: mediaKeys.length,
        remainingCount: remainingItems.length,
        previewItems,
      };
    },

    async toggleListLike({ input, viewer } = {}) {
      const source = requireObject(input);
      const userId = requireViewerId(viewer);
      return toggleListLikeRecord({
        listId: requireListId(source.listId),
        ownerId: requireViewerId({ id: source.ownerId }),
        userId,
      });
    },

    async listMemberships({ input, viewer } = {}) {
      const source = requireObject(input);
      const userId = requireViewerId(viewer);
      const listIds = Array.isArray(source.listIds)
        ? source.listIds.filter(Boolean).slice(0, 100)
        : [];
      if (!listIds.length || !source.media) return { memberships: {} };
      const payload = createMediaPayload(source.media, userId);
      const result = await admin()
        .from('list_items')
        .select('list_id')
        .eq('user_id', userId)
        .eq('media_key', payload.mediaKey)
        .in('list_id', listIds);
      if (result.error)
        throw new Error(result.error.message || 'List memberships could not be loaded');
      const inList = new Set((result.data || []).map((row) => row.list_id));
      return { memberships: Object.fromEntries(listIds.map((id) => [id, inList.has(id)])) };
    },

    async reorderList({ input, viewer } = {}) {
      const source = requireObject(input);
      const userId = requireViewerId(viewer);
      const listId = requireListId(source.listId);
      const items = Array.isArray(source.items) ? source.items : [];
      const db = admin();
      const owner = await db
        .from('lists')
        .select('id')
        .eq('id', listId)
        .eq('user_id', userId)
        .maybeSingle();
      if (owner.error) throw new Error(owner.error.message || 'List could not be loaded');
      if (!owner.data)
        throw createAccountCoreError('LIST_NOT_FOUND', 'List was not found', { status: 404 });
      await Promise.all(
        items.map((item, index) => {
          const entityType = cleanString(
            item?.entityType || item?.entity_type || item?.media_type || 'movie',
          ).toLowerCase();
          const entityId = cleanString(item?.entityId || item?.entity_id || item?.id || '').replace(
            /^(movie|tv)[_-]/,
            '',
          );
          const mediaKey =
            cleanString(item?.mediaKey || item?.media_key) ||
            buildMediaItemKey(entityType, entityId);
          return db
            .from('list_items')
            .update({ position: index + 1, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('list_id', listId)
            .eq('media_key', mediaKey);
        }),
      );
      return { success: true };
    },

    async syncList({ input, viewer } = {}) {
      const userId = requireViewerId(viewer);
      const listId = requireListId(input?.listId);
      const db = admin();
      const [list, items] = await Promise.all([
        db.from('lists').select('payload').eq('id', listId).eq('user_id', userId).maybeSingle(),
        db
          .from('list_items')
          .select('payload')
          .eq('list_id', listId)
          .eq('user_id', userId)
          .order('added_at', { ascending: false }),
      ]);
      if (list.error || items.error)
        throw new Error(
          list.error?.message || items.error?.message || 'List could not be synchronized',
        );
      if (!list.data)
        throw createAccountCoreError('LIST_NOT_FOUND', 'List was not found', { status: 404 });
      const payload =
        list.data.payload && typeof list.data.payload === 'object' ? list.data.payload : {};
      const previewItems = (items.data || [])
        .slice(0, 5)
        .map((row) => row.payload)
        .filter(Boolean);
      const updated = await db
        .from('lists')
        .update({
          payload: { ...payload, itemsCount: (items.data || []).length, previewItems },
          updated_at: new Date().toISOString(),
        })
        .eq('id', listId)
        .eq('user_id', userId);
      if (updated.error) throw new Error(updated.error.message || 'List could not be synchronized');
      return { previewItems };
    },
  });
}

export const accountLibrary = createAccountLibrary({});
