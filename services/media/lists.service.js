'use client'

import { cleanString, normalizeTimestamp } from '@/services/core/data-utils'
import {
  assertMovieMedia,
  buildMediaItemKey,
} from '@/services/core/media-key.service'
import { isMovieMediaType } from '@/lib/media'
import {
  buildPollingSubscriptionKey,
  createPollingSubscription,
} from '@/services/core/polling-subscription.service'
import {
  assertSupabaseResult,
  getSupabaseClient,
} from '@/services/core/supabase-data.service'
import { requestApiJson } from '@/services/core/api-request.service'
import {
  createMediaPayload,
  ensureUserId,
  normalizeMediaPayload,
  paginateByCursor,
  resolveLimitCount,
} from '@/services/core/supabase-media-utils.service'
import { getUserAccount } from '@/services/account/account.service'
import {
  ACTIVITY_EVENT_TYPES,
  fireActivityEvent,
} from '@/services/activity/activity-events.service'
import { buildCanonicalActivityDedupeKey } from '@/lib/activity/canonical-key'
import {
  fireNotificationEvent,
  NOTIFICATION_EVENT_TYPES,
} from '@/services/notifications/notification-events.service'

const LIST_ROW_SELECT = [
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
].join(',')
const LIST_ITEM_PREVIEW_SELECT = ['added_at', 'payload'].join(',')
const INFRA_V2_CLIENT_ENABLED =
  process.env.NEXT_PUBLIC_INFRA_V2_ENABLED === 'true'

function resolveRpcRow(data) {
  if (Array.isArray(data)) {
    return data[0] || null
  }

  if (data && typeof data === 'object') {
    return data
  }

  return null
}

function slugifyListTitle(value) {
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
  }

  return cleanString(value)
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, (match) => trMap[match])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function normalizeListOwnerSnapshot(value = {}, fallbackOwnerId = null) {
  const ownerId = value?.id || fallbackOwnerId || null

  return ownerId
    ? {
        avatarUrl: value?.avatarUrl || null,
        displayName: value?.displayName || value?.username || 'Anonymous User',
        id: ownerId,
        username: value?.username || null,
      }
    : null
}

function normalizeListPreviewItem(value = {}) {
  const normalized = normalizeMediaPayload(value, value)

  if (!normalized.entityId || !isMovieMediaType(normalized.entityType)) {
    return null
  }

  return {
    ...normalized,
    id: normalized.entityId,
  }
}

function validateListTitle(value) {
  const title = cleanString(value)

  if (title.length < 2) {
    throw new Error('List title must be at least 2 characters long')
  }

  return title.slice(0, 80)
}

function validateListDescription(value) {
  return cleanString(value).slice(0, 280)
}

function dedupeListItems(items = []) {
  const uniqueItems = new Map()

  items.forEach((item, index) => {
    const mediaSnapshot = assertMovieMedia(item, 'Lists support movies only')

    if (!mediaSnapshot.entityId || !mediaSnapshot.entityType || !mediaSnapshot.title) {
      return
    }

    const mediaKey = buildMediaItemKey(
      mediaSnapshot.entityType,
      mediaSnapshot.entityId
    )

    if (uniqueItems.has(mediaKey)) {
      return
    }

    uniqueItems.set(mediaKey, {
      ...item,
      entityId: mediaSnapshot.entityId,
      entityType: mediaSnapshot.entityType,
      id: mediaSnapshot.entityId,
      mediaKey,
      position: index + 1,
      title:
        item?.title || item?.original_title || item?.name || item?.original_name,
    })
  })

  return Array.from(uniqueItems.values())
}

async function buildListOwnerSnapshot(userId) {
  const profile = await getUserAccount(userId)

  return normalizeListOwnerSnapshot(
    {
      avatarUrl: profile?.avatarUrl || null,
      displayName: profile?.displayName || profile?.username || 'Anonymous User',
      id: userId,
      username: profile?.username || null,
    },
    userId
  )
}

function chunkArray(values = [], size = 50) {
  const chunks = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

function normalizeListRow(row = {}, likesMap = new Map()) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
  const ownerSnapshot = normalizeListOwnerSnapshot(payload.ownerSnapshot || {}, row.user_id)
  const likes = Array.isArray(likesMap.get(row.id))
    ? likesMap.get(row.id)
    : Array.isArray(payload.likes)
      ? payload.likes
      : []

  return {
    coverUrl: payload.coverUrl || row.poster_path || '',
    createdAt: normalizeTimestamp(row.created_at),
    description: row.description || payload.description || '',
    id: row.id,
    itemsCount: Number.isFinite(Number(payload.itemsCount))
      ? Number(payload.itemsCount)
      : 0,
    likes,
    likesCount: Number.isFinite(Number(row.likes_count))
      ? Number(row.likes_count)
      : likes.length,
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
  }
}

async function fetchUserLists(userId, options = {}) {
  if (!userId) {
    return []
  }

  const resolvedLimitCount = resolveLimitCount(options.limitCount, 0, 50) || null
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: resolvedLimitCount,
      limitCount: resolvedLimitCount,
      resource: 'lists',
      userId,
    },
  })

  return Array.isArray(payload?.data) ? payload.data : []
}

async function fetchListById(userId, listId) {
  const payload = await requestApiJson('/api/collections', {
    query: {
      listId,
      resource: 'list-by-id',
      userId,
    },
  })

  return payload?.data || null
}

async function fetchListBySlug(userId, slug) {
  const payload = await requestApiJson('/api/collections', {
    query: {
      resource: 'list-by-slug',
      slug,
      userId,
    },
  })

  return payload?.data || null
}

async function fetchLikedLists(userId, options = {}) {
  if (!userId) {
    return []
  }

  const resolvedLimitCount = resolveLimitCount(options.limitCount, 0, 50) || null
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: resolvedLimitCount,
      limitCount: resolvedLimitCount,
      resource: 'liked-lists',
      userId,
    },
  })

  return Array.isArray(payload?.data) ? payload.data : []
}

async function fetchListItems(userId, listId, options = {}) {
  if (!userId || !listId) {
    return []
  }

  const resolvedLimitCount = resolveLimitCount(options.limitCount, 0, 50) || null
  const payload = await requestApiJson('/api/collections', {
    query: {
      activeTab: options.activeTab || null,
      cursor: options.cursor || null,
      limit: resolvedLimitCount,
      listId,
      limitCount: resolvedLimitCount,
      resource: 'list-items',
      userId,
    },
  })

  return Array.isArray(payload?.data) ? payload.data : []
}

async function syncUserListDerivedState({ userId, listId }) {
  const client = getSupabaseClient()
  const [listResult, countResult, itemsPreviewResult] = await Promise.all([
    client
      .from('lists')
      .select('id,payload')
      .eq('id', listId)
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('list_items')
      .select('media_key', {
        count: 'exact',
        head: true,
      })
      .eq('list_id', listId)
      .eq('user_id', userId),
    client
      .from('list_items')
      .select(LIST_ITEM_PREVIEW_SELECT)
      .eq('list_id', listId)
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(5),
  ])

  assertSupabaseResult(listResult, 'List could not be loaded')
  assertSupabaseResult(countResult, 'List items could not be counted')
  assertSupabaseResult(itemsPreviewResult, 'List items could not be loaded')

  if (!listResult.data) {
    return []
  }

  const payload =
    listResult.data.payload && typeof listResult.data.payload === 'object'
      ? listResult.data.payload
      : {}
  const previewItems = (itemsPreviewResult.data || [])
    .map((row) => normalizeMediaPayload(row.payload || {}, row))
    .map(normalizeListPreviewItem)
    .filter(Boolean)

  const updateResult = await client
    .from('lists')
    .update({
      payload: {
        ...payload,
        itemsCount: Number(countResult.count) || 0,
        previewItems,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', userId)

  assertSupabaseResult(updateResult, 'List derived state could not be synced')

  return previewItems
}

function createListPayload({
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
  }
}

export function subscribeToUserLists(userId, callback, options = {}) {
  if (!userId) {
    callback([])
    return () => {}
  }

  return createPollingSubscription(
    () => fetchUserLists(userId, options),
    callback,
    {
      ...options,
      subscriptionKey: buildPollingSubscriptionKey('lists:user', {
        hiddenIntervalMs: options.hiddenIntervalMs ?? null,
        intervalMs: options.intervalMs ?? null,
        limitCount: options.limitCount ?? null,
        userId,
      }),
    }
  )
}

export function subscribeToUserList(userId, listId, callback, options = {}) {
  return createPollingSubscription(
    () => fetchListById(userId, listId),
    callback,
    {
      ...options,
      subscriptionKey: buildPollingSubscriptionKey('lists:item', {
        hiddenIntervalMs: options.hiddenIntervalMs ?? null,
        intervalMs: options.intervalMs ?? null,
        listId,
        userId,
      }),
    }
  )
}

export function subscribeToUserListBySlug(
  userId,
  slug,
  callback,
  options = {}
) {
  return createPollingSubscription(
    () => fetchListBySlug(userId, slug),
    callback,
    {
      ...options,
      subscriptionKey: buildPollingSubscriptionKey('lists:slug', {
        hiddenIntervalMs: options.hiddenIntervalMs ?? null,
        intervalMs: options.intervalMs ?? null,
        slug,
        userId,
      }),
    }
  )
}

export function subscribeToLikedLists(userId, callback, options = {}) {
  if (!userId) {
    callback([])
    return () => {}
  }

  return createPollingSubscription(
    () => fetchLikedLists(userId, options),
    callback,
    {
      ...options,
      subscriptionKey: buildPollingSubscriptionKey('lists:liked', {
        hiddenIntervalMs: options.hiddenIntervalMs ?? null,
        intervalMs: options.intervalMs ?? null,
        userId,
      }),
    }
  )
}

export async function fetchProfileLikedLists({
  cursor = null,
  pageSize = 36,
  userId,
}) {
  if (!userId) {
    return paginateByCursor([], cursor, pageSize)
  }

  if (INFRA_V2_CLIENT_ENABLED) {
    const targetCount = resolveLimitCount(pageSize, 36, 500)
    let currentCursor = cursor || null
    let hasMore = true
    const items = []

    while (hasMore && items.length < targetCount) {
      const batchLimit = Math.min(50, Math.max(1, targetCount - items.length))
      const payload = await requestApiJson('/api/collections', {
        query: {
          activeTab: 'likes',
          cursor: currentCursor,
          limit: batchLimit,
          resource: 'liked-lists',
          userId,
        },
      })

      const batch = Array.isArray(payload?.data) ? payload.data : []
      items.push(...batch)
      hasMore = payload?.pageInfo?.hasMore === true
      currentCursor = payload?.pageInfo?.cursor || null

      if (cursor) {
        break
      }
    }

    return {
      hasMore,
      items,
      nextCursor: hasMore ? currentCursor : null,
    }
  }

  const items = await fetchLikedLists(userId)

  return paginateByCursor(items, cursor, pageSize)
}

export function subscribeToUserListItems(
  userId,
  listId,
  callback,
  options = {}
) {
  return createPollingSubscription(
    () => fetchListItems(userId, listId, options),
    callback,
    {
      ...options,
      subscriptionKey: buildPollingSubscriptionKey('lists:items', {
        hiddenIntervalMs: options.hiddenIntervalMs ?? null,
        intervalMs: options.intervalMs ?? null,
        listId,
        userId,
      }),
    }
  )
}

export async function createUserList({
  userId,
  title,
  description = '',
  coverUrl = '',
}) {
  ensureUserId(userId, 'Authenticated user is required to create a list')

  const validatedTitle = validateListTitle(title)
  const validatedDescription = validateListDescription(description)
  const slug = slugifyListTitle(validatedTitle) || 'list'
  const ownerSnapshot = await buildListOwnerSnapshot(userId)
  const normalizedCoverUrl = cleanString(coverUrl)
  const nowIso = new Date().toISOString()
  const payload = createListPayload({
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    ownerSnapshot,
    previewItems: [],
    slug,
    title: validatedTitle,
  })
  const client = getSupabaseClient()
  const insertResult = await client
    .from('lists')
    .insert({
      user_id: userId,
      slug,
      title: validatedTitle,
      description: validatedDescription,
      poster_path: normalizedCoverUrl,
      likes_count: 0,
      reviews_count: 0,
      payload,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(LIST_ROW_SELECT)
    .single()

  assertSupabaseResult(insertResult, 'List could not be created')

  fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_CREATED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      subjectId: insertResult.data.id,
      subjectType: 'list',
    }),
    listId: insertResult.data.id,
    listSlug: slug,
    listTitle: validatedTitle,
    ownerUsername: ownerSnapshot?.username || null,
    subjectId: insertResult.data.id,
    subjectTitle: validatedTitle,
    subjectType: 'list',
  })

  return normalizeListRow(insertResult.data, new Map())
}

export async function createUserListWithItems({
  userId,
  title,
  description = '',
  coverUrl = '',
  items = [],
}) {
  ensureUserId(userId, 'Authenticated user is required to create a list')

  const validatedTitle = validateListTitle(title)
  const validatedDescription = validateListDescription(description)
  const normalizedItems = dedupeListItems(items)
  const slug = slugifyListTitle(validatedTitle) || 'list'
  const ownerSnapshot = await buildListOwnerSnapshot(userId)
  const normalizedCoverUrl = cleanString(coverUrl)
  const previewItems = normalizedItems
    .slice(0, 5)
    .map(normalizeListPreviewItem)
    .filter(Boolean)
  const nowIso = new Date().toISOString()
  const payload = createListPayload({
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    itemsCount: normalizedItems.length,
    ownerSnapshot,
    previewItems,
    slug,
    title: validatedTitle,
  })
  const client = getSupabaseClient()
  const insertResult = await client
    .from('lists')
    .insert({
      user_id: userId,
      slug,
      title: validatedTitle,
      description: validatedDescription,
      poster_path: normalizedCoverUrl,
      likes_count: 0,
      reviews_count: 0,
      payload,
      created_at: nowIso,
      updated_at: nowIso,
    })
    .select(LIST_ROW_SELECT)
    .single()

  assertSupabaseResult(insertResult, 'List could not be created')

  if (normalizedItems.length > 0) {
    const itemRows = normalizedItems.map((item) => {
      const mediaPayload = createMediaPayload(
        {
          ...item,
          position: item.position,
        },
        userId,
        {
          addedAt: nowIso,
          updatedAt: nowIso,
          position: item.position,
        }
      )

      return {
        list_id: insertResult.data.id,
        user_id: userId,
        media_key: mediaPayload.mediaKey,
        entity_id: mediaPayload.entityId,
        entity_type: mediaPayload.entityType,
        title: mediaPayload.title,
        poster_path: mediaPayload.poster_path,
        backdrop_path: mediaPayload.backdrop_path,
        position: Number.isFinite(Number(item.position))
          ? Number(item.position)
          : null,
        payload: mediaPayload,
        added_at: nowIso,
        updated_at: nowIso,
      }
    })

    const itemInsertResult = await client
      .from('list_items')
      .insert(itemRows)

    assertSupabaseResult(itemInsertResult, 'List items could not be created')

    await syncUserListDerivedState({ userId, listId: insertResult.data.id })
  }

  fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_CREATED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      subjectId: insertResult.data.id,
      subjectType: 'list',
    }),
    listId: insertResult.data.id,
    listSlug: slug,
    listTitle: validatedTitle,
    ownerUsername: ownerSnapshot?.username || null,
    subjectId: insertResult.data.id,
    subjectTitle: validatedTitle,
    subjectType: 'list',
  })

  return fetchListById(userId, insertResult.data.id)
}

export async function updateUserList({
  userId,
  listId,
  title,
  description = '',
  coverUrl = '',
}) {
  ensureUserId(userId, 'Authenticated user and listId are required to update a list')

  if (!listId) {
    throw new Error('Authenticated user and listId are required to update a list')
  }

  const validatedTitle = validateListTitle(title)
  const validatedDescription = validateListDescription(description)
  const normalizedCoverUrl = cleanString(coverUrl)
  const client = getSupabaseClient()
  const listResult = await client
    .from('lists')
    .select('payload')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle()

  assertSupabaseResult(listResult, 'List could not be loaded')

  if (!listResult.data) {
    throw new Error('List not found')
  }

  const existingPayload =
    listResult.data.payload && typeof listResult.data.payload === 'object'
      ? listResult.data.payload
      : {}
  const ownerSnapshot =
    normalizeListOwnerSnapshot(existingPayload.ownerSnapshot, userId) ||
    (await buildListOwnerSnapshot(userId))
  const nextPayload = {
    ...existingPayload,
    coverUrl: normalizedCoverUrl,
    description: validatedDescription,
    ownerSnapshot,
    slug: slugifyListTitle(validatedTitle) || 'list',
    title: validatedTitle,
  }
  const updateResult = await client
    .from('lists')
    .update({
      title: validatedTitle,
      description: validatedDescription,
      slug: slugifyListTitle(validatedTitle) || 'list',
      poster_path: normalizedCoverUrl,
      payload: nextPayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', userId)

  assertSupabaseResult(updateResult, 'List could not be updated')

  fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_CREATED, {
    dedupeKey: buildCanonicalActivityDedupeKey({
      actorUserId: userId,
      subjectId: listId,
      subjectType: 'list',
    }),
    listId,
    listSlug: nextPayload.slug || listId,
    listTitle: validatedTitle,
    ownerUsername: ownerSnapshot?.username || null,
    subjectId: listId,
    subjectPoster: normalizedCoverUrl || existingPayload.coverUrl || null,
    subjectTitle: validatedTitle,
    subjectType: 'list',
  })

  return fetchListById(userId, listId)
}

export async function deleteUserList({ userId, listId }) {
  ensureUserId(userId, 'Authenticated user and listId are required to delete a list')

  if (!listId) {
    throw new Error('Authenticated user and listId are required to delete a list')
  }

  const client = getSupabaseClient()
  const result = await client
    .from('lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', userId)

  assertSupabaseResult(result, 'List could not be deleted')

  return true
}

export async function getUserListMemberships({ userId, listIds = [], media }) {
  if (!userId || !media || listIds.length === 0) {
    return {}
  }

  const mediaSnapshot = assertMovieMedia(media, 'Lists support movies only')
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId)
  const client = getSupabaseClient()
  const memberships = {}

  for (const ids of chunkArray(listIds, 100)) {
    const result = await client
      .from('list_items')
      .select('list_id')
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .in('list_id', ids)

    assertSupabaseResult(result, 'List memberships could not be loaded')

    const existingSet = new Set((result.data || []).map((row) => row.list_id))

    ids.forEach((id) => {
      memberships[id] = existingSet.has(id)
    })
  }

  return memberships
}

export async function toggleUserListItem({ userId, listId, media }) {
  ensureUserId(
    userId,
    'Authenticated user and listId are required to update list items'
  )

  if (!listId) {
    throw new Error('Authenticated user and listId are required to update list items')
  }

  const mediaSnapshot = assertMovieMedia(media, 'Lists support movies only')
  const mediaKey = buildMediaItemKey(mediaSnapshot.entityType, mediaSnapshot.entityId)
  const nowIso = new Date().toISOString()
  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const mediaPayload = createMediaPayload(media, userId, {
      addedAt: nowIso,
      position: Number.isFinite(Number(media?.position))
        ? Number(media.position)
        : null,
      updatedAt: nowIso,
    })
    const rpcResult = await client.rpc('collection_toggle_list_item_v2', {
      p_backdrop_path: mediaPayload.backdrop_path || null,
      p_entity_id: mediaPayload.entityId || null,
      p_entity_type: mediaPayload.entityType || null,
      p_list_id: listId,
      p_media_key: mediaPayload.mediaKey,
      p_payload: mediaPayload,
      p_position: Number.isFinite(Number(mediaPayload.position))
        ? Number(mediaPayload.position)
        : null,
      p_poster_path: mediaPayload.poster_path || null,
      p_title: mediaPayload.title || null,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'List item could not be updated')

    const rpcRow = resolveRpcRow(rpcResult.data)
    const isInList = rpcRow?.is_in_list === true

    if (!isInList) {
      return {
        isInList: false,
        mediaKey,
      }
    }

    return {
      isInList: true,
      item: {
        ...mediaPayload,
        addedAt: nowIso,
        updatedAt: nowIso,
      },
      mediaKey: mediaPayload.mediaKey,
    }
  }

  const [listResult, itemResult] = await Promise.all([
    client
      .from('lists')
      .select('id,payload')
      .eq('id', listId)
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('list_items')
      .select('media_key')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)
      .maybeSingle(),
  ])

  assertSupabaseResult(listResult, 'List could not be loaded')
  assertSupabaseResult(itemResult, 'List item state could not be loaded')

  if (!listResult.data) {
    throw new Error('List not found')
  }

  const listPayload =
    listResult.data.payload && typeof listResult.data.payload === 'object'
      ? listResult.data.payload
      : {}
  const currentCount = Number(listPayload.itemsCount || 0)
  const nextPosition = currentCount + 1

  if (itemResult.data) {
    const deleteResult = await client
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', userId)
      .eq('media_key', mediaKey)

    assertSupabaseResult(deleteResult, 'List item could not be removed')

    const updateResult = await client
      .from('lists')
      .update({
        payload: {
          ...listPayload,
          itemsCount: Math.max(0, currentCount - 1),
        },
        updated_at: nowIso,
      })
      .eq('id', listId)
      .eq('user_id', userId)

    assertSupabaseResult(updateResult, 'List counters could not be updated')

    await syncUserListDerivedState({ userId, listId })

    return {
      isInList: false,
      mediaKey,
    }
  }

  const mediaPayload = createMediaPayload(media, userId, {
    addedAt: nowIso,
    position: nextPosition,
    updatedAt: nowIso,
  })
  const insertResult = await client
    .from('list_items')
    .insert({
      list_id: listId,
      user_id: userId,
      media_key: mediaPayload.mediaKey,
      entity_id: mediaPayload.entityId,
      entity_type: mediaPayload.entityType,
      title: mediaPayload.title,
      poster_path: mediaPayload.poster_path,
      backdrop_path: mediaPayload.backdrop_path,
      position: Number.isFinite(Number(mediaPayload.position))
        ? Number(mediaPayload.position)
        : null,
      payload: mediaPayload,
      added_at: nowIso,
      updated_at: nowIso,
    })

  assertSupabaseResult(insertResult, 'List item could not be added')

  const updateResult = await client
    .from('lists')
    .update({
      payload: {
        ...listPayload,
        itemsCount: currentCount + 1,
      },
      updated_at: nowIso,
    })
    .eq('id', listId)
    .eq('user_id', userId)

  assertSupabaseResult(updateResult, 'List counters could not be updated')

  await syncUserListDerivedState({ userId, listId })

  return {
    isInList: true,
    item: {
      ...mediaPayload,
      addedAt: nowIso,
      updatedAt: nowIso,
    },
    mediaKey: mediaPayload.mediaKey,
  }
}

export async function toggleListLike({ ownerId, listId, userId }) {
  if (!ownerId || !listId || !userId) {
    throw new Error('ownerId, listId, and userId are required to like a list')
  }

  if (ownerId === userId) {
    throw new Error('You cannot like your own list')
  }

  const client = getSupabaseClient()

  if (INFRA_V2_CLIENT_ENABLED) {
    const listResult = await client
      .from('lists')
      .select('slug,title,payload')
      .eq('id', listId)
      .eq('user_id', ownerId)
      .maybeSingle()

    assertSupabaseResult(listResult, 'List could not be loaded')

    if (!listResult.data) {
      throw new Error('List not found')
    }

    const rpcResult = await client.rpc('collection_toggle_list_like_v2', {
      p_list_id: listId,
      p_owner_id: ownerId,
      p_user_id: userId,
    })

    assertSupabaseResult(rpcResult, 'List like state could not be updated')

    const rpcRow = resolveRpcRow(rpcResult.data)
    const isNowLiked = rpcRow?.is_liked === true

    if (isNowLiked) {
      fireNotificationEvent(NOTIFICATION_EVENT_TYPES.LIST_LIKED, {
        listOwnerId: ownerId,
        listId,
      })

      fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_LIKED, {
        dedupeKey: buildCanonicalActivityDedupeKey({
          actorUserId: userId,
          subjectId: listId,
          subjectType: 'list',
        }),
        listId,
        listSlug: listResult.data.slug || listId,
        listTitle: listResult.data.title || 'Untitled List',
        ownerUsername: listResult.data?.payload?.ownerSnapshot?.username || ownerId,
        subjectId: listId,
        subjectPoster:
          listResult.data?.payload?.coverUrl ||
          listResult.data?.payload?.previewItems?.[0]?.poster_path ||
          null,
        subjectTitle: listResult.data.title || 'Untitled List',
        subjectType: 'list',
      })
    }

    return isNowLiked
  }

  const [listResult, likeResult] = await Promise.all([
    client
      .from('lists')
      .select('likes_count,payload')
      .eq('id', listId)
      .eq('user_id', ownerId)
      .maybeSingle(),
    client
      .from('list_likes')
      .select('list_id, user_id')
      .eq('list_id', listId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  assertSupabaseResult(listResult, 'List could not be loaded')
  assertSupabaseResult(likeResult, 'List like state could not be loaded')

  if (!listResult.data) {
    throw new Error('List not found')
  }

  const listPayload =
    listResult.data.payload && typeof listResult.data.payload === 'object'
      ? listResult.data.payload
      : {}
  const currentLikes = Array.isArray(listPayload.likes) ? listPayload.likes : []
  const hasLiked = Boolean(likeResult.data)
  const isNowLiked = !hasLiked
  const nextLikes = isNowLiked
    ? Array.from(new Set([...currentLikes, userId]))
    : currentLikes.filter((id) => id !== userId)

  if (hasLiked) {
    const deleteResult = await client
      .from('list_likes')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', userId)

    assertSupabaseResult(deleteResult, 'List like could not be removed')
  } else {
    const insertResult = await client
      .from('list_likes')
      .insert({
        list_id: listId,
        user_id: userId,
        created_at: new Date().toISOString(),
      })

    assertSupabaseResult(insertResult, 'List like could not be added')
  }

  const nextLikesCount = Math.max(
    0,
    Number(listResult.data.likes_count || currentLikes.length || 0) +
      (hasLiked ? -1 : 1)
  )
  const updateResult = await client
    .from('lists')
    .update({
      likes_count: nextLikesCount,
      payload: {
        ...listPayload,
        likes: nextLikes,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', ownerId)

  assertSupabaseResult(updateResult, 'List like state could not be updated')

  if (isNowLiked) {
    fireNotificationEvent(NOTIFICATION_EVENT_TYPES.LIST_LIKED, {
      listOwnerId: ownerId,
      listId,
    })

    fireActivityEvent(ACTIVITY_EVENT_TYPES.LIST_LIKED, {
      dedupeKey: buildCanonicalActivityDedupeKey({
        actorUserId: userId,
        subjectId: listId,
        subjectType: 'list',
      }),
      listId,
      listSlug: listResult.data.slug || listId,
      listTitle: listResult.data.title || 'Untitled List',
      ownerUsername: listPayload?.ownerSnapshot?.username || ownerId,
      subjectId: listId,
      subjectPoster:
        listPayload.coverUrl || listPayload?.previewItems?.[0]?.poster_path || null,
      subjectTitle: listResult.data.title || 'Untitled List',
      subjectType: 'list',
    })
  }

  return isNowLiked
}

export async function updateListReviewsCount({ ownerId, listId, delta }) {
  if (!ownerId || !listId || !Number.isFinite(Number(delta))) {
    throw new Error('ownerId, listId, and delta are required')
  }

  const client = getSupabaseClient()
  const listResult = await client
    .from('lists')
    .select('reviews_count')
    .eq('id', listId)
    .eq('user_id', ownerId)
    .maybeSingle()

  assertSupabaseResult(listResult, 'List could not be loaded')

  if (!listResult.data) {
    throw new Error('List not found')
  }

  const nextReviewsCount = Math.max(
    0,
    Number(listResult.data.reviews_count || 0) + Number(delta)
  )
  const updateResult = await client
    .from('lists')
    .update({
      reviews_count: nextReviewsCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId)
    .eq('user_id', ownerId)

  assertSupabaseResult(updateResult, 'List review count could not be updated')
}
