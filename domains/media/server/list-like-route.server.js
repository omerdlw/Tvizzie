import 'server-only';

import { NextResponse } from 'next/server';

import {
  createAuthenticatedSupabaseClient,
  requireSessionRequest,
} from '@/domains/auth/server/session.server.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.server.js';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { normalizeValue } from '@/shared/utils';

function resolveRpcRow(data) {
  if (Array.isArray(data)) return data[0] || null;
  return data && typeof data === 'object' ? data : null;
}

export async function handleListLikePost(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireSessionRequest(request);
    const body = await request.json().catch(() => ({}));
    const listId = normalizeValue(body?.listId);
    const ownerId = normalizeValue(body?.ownerId);

    if (!listId || !ownerId) {
      return NextResponse.json({ error: 'listId and ownerId are required' }, { status: 400 });
    }

    if (ownerId === session.userId) {
      return NextResponse.json({ error: 'You cannot like your own list' }, { status: 400 });
    }

    const admin = createAdminClient();
    const listResult = await admin
      .from('lists')
      .select('slug,title,payload,poster_path')
      .eq('id', listId)
      .eq('user_id', ownerId)
      .maybeSingle();

    if (listResult.error) {
      throw new Error(listResult.error.message || 'List could not be loaded');
    }
    if (!listResult.data) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const rpcResult = await admin.rpc('collection_toggle_list_like', {
      p_list_id: listId,
      p_owner_id: ownerId,
      p_user_id: session.userId,
    });
    if (rpcResult.error) {
      throw new Error(rpcResult.error.message || 'List like state could not be updated');
    }

    const list = listResult.data;
    return NextResponse.json({
      isNowLiked: resolveRpcRow(rpcResult.data)?.is_liked === true,
      list: {
        ownerUsername: list.payload?.ownerSnapshot?.username || null,
        poster: list.payload?.coverUrl || list.poster_path || null,
        slug: list.slug || listId,
        title: list.title || list.payload?.title || 'Untitled List',
      },
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: error?.message || 'List like state could not be updated' },
      { status },
    );
  }
}
