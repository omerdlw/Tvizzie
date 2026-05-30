'use client';

import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/client';
import { normalizeMediaPayload } from '@/core/services/shared/media';
import { LIST_ITEM_PREVIEW_SELECT } from './constants.js';
import { normalizeListPreviewItem } from './shared.js';

export async function syncUserListDerivedState({ userId, listId }) {
  const client = getSupabaseClient();
  const [listResult, countResult, itemsPreviewResult] = await Promise.all([
    client.from('lists').select('id,payload').eq('id', listId).eq('user_id', userId).maybeSingle(),
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
  ]);

  assertSupabaseResult(listResult, 'List could not be loaded');
  assertSupabaseResult(countResult, 'List items could not be counted');
  assertSupabaseResult(itemsPreviewResult, 'List items could not be loaded');

  if (!listResult.data) {
    return [];
  }

  const payload = listResult.data.payload && typeof listResult.data.payload === 'object' ? listResult.data.payload : {};
  const previewItems = (itemsPreviewResult.data || [])
    .map((row) => normalizeMediaPayload(row.payload || {}, row))
    .map(normalizeListPreviewItem)
    .filter(Boolean);

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
    .eq('user_id', userId);

  assertSupabaseResult(updateResult, 'List derived state could not be synced');

  return previewItems;
}
