'use client';

import { assertSupabaseResult, getSupabaseClient } from '@/core/services/shared/client';

import { LIST_CONTEXT_SELECT } from './constants.js';
import { buildListSubjectMetadata } from './shared.js';

export async function getListReviewContext(ownerId, listId) {
  if (!ownerId || !listId) {
    return null;
  }

  const client = getSupabaseClient();
  const result = await client
    .from('lists')
    .select(LIST_CONTEXT_SELECT)
    .eq('id', listId)
    .eq('user_id', ownerId)
    .maybeSingle();

  assertSupabaseResult(result, 'List context could not be loaded');

  if (!result.data) {
    return null;
  }

  const payload = result.data.payload && typeof result.data.payload === 'object' ? result.data.payload : {};

  return buildListSubjectMetadata({
    list: {
      coverUrl: payload.coverUrl || result.data.poster_path || '',
      id: result.data.id,
      ownerSnapshot: payload.ownerSnapshot || null,
      previewItems: Array.isArray(payload.previewItems) ? payload.previewItems : [],
      slug: result.data.slug || result.data.id,
      title: result.data.title || 'Untitled List',
    },
    listId: result.data.id,
    ownerId,
    ownerUsername: payload?.ownerSnapshot?.username || null,
  });
}
