'use client';

import { getSupabaseClient, assertSupabaseResult } from '@/core/services/shared/supabase-data.service';

const POSITION_IN_PAYLOAD_TABLES = new Set(['favorites', 'likes', 'watchlist', 'watched']);

function normalizeValue(value) {
  return String(value || '').trim();
}

function ensureDocRef(docRef) {
  if (!docRef || typeof docRef !== 'object') {
    throw new Error('updateUserMediaPosition requires a valid reference object');
  }

  const table = normalizeValue(docRef.table);

  if (!table) {
    throw new Error('updateUserMediaPosition requires a table reference');
  }

  return {
    id: normalizeValue(docRef.id),
    listId: normalizeValue(docRef.listId),
    table,
    userId: normalizeValue(docRef.userId),
  };
}

async function updateListItemPosition(client, ref, position, updatedAt) {
  const result = await client
    .from('list_items')
    .update({
      position,
      updated_at: updatedAt,
    })
    .eq('user_id', ref.userId)
    .eq('list_id', ref.listId)
    .eq('media_key', ref.id);

  assertSupabaseResult(result, 'List item position could not be updated');
}

async function updatePayloadPosition(client, ref, position, updatedAt) {
  const current = await client
    .from(ref.table)
    .select('payload')
    .eq('user_id', ref.userId)
    .eq('media_key', ref.id)
    .maybeSingle();

  assertSupabaseResult(current, 'Media item could not be loaded');

  const nextPayload = {
    ...(current.data?.payload && typeof current.data.payload === 'object' ? current.data.payload : {}),
    position,
    updatedAt,
  };

  const update = await client
    .from(ref.table)
    .update({
      payload: nextPayload,
      updated_at: updatedAt,
    })
    .eq('user_id', ref.userId)
    .eq('media_key', ref.id);

  assertSupabaseResult(update, 'Media item position could not be updated');
}

export async function updateUserMediaPosition(docRef, position) {
  if (position === undefined || position === null) {
    throw new Error('updateUserMediaPosition requires a position value');
  }

  const ref = ensureDocRef(docRef);

  if (!ref.userId || !ref.id) {
    throw new Error('updateUserMediaPosition requires userId and item id');
  }

  const client = getSupabaseClient();
  const updatedAt = new Date().toISOString();

  if (ref.table === 'list_items') {
    if (!ref.listId) {
      throw new Error('List item reorder requires listId');
    }

    await updateListItemPosition(client, ref, position, updatedAt);
    return { position };
  }

  if (POSITION_IN_PAYLOAD_TABLES.has(ref.table)) {
    await updatePayloadPosition(client, ref, position, updatedAt);
    return { position };
  }

  throw new Error(`Unsupported media position table: ${ref.table}`);
}
