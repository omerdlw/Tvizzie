import 'server-only';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  requireSessionRequest,
  resolveOptionalSessionRequest,
} from '@/domains/auth/server/session.server.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.server.js';
import { ensurePasswordAccountRecord } from '@/domains/auth/server/account.server.js';
import {
  getEditableAccountSnapshotByUserId,
  getAccountProfileByUserId,
  invalidateCachedAccountProfiles,
} from './profile.server';
import { resolveAccountRequestUserId } from './request-target.server';
import { fetchAccountActivityFeedServer } from './feed.server';
import { fetchProfileReviewFeedServer } from '@/domains/reviews/server/review-server.js';
import {
  ACCOUNT_READ_FUNCTION,
  ACCOUNT_WRITE_FUNCTION,
  normalizeAccountDisplayNameSearchValue,
  sanitizeAccountSearchTerm,
  sanitizeUsername,
  validateUsername,
} from '@/domains/account/utils';
import {
  getOrLoadCachedValue,
  invokeInternalEdgeFunction,
} from '@/infrastructure/http/http-server';
import { publishUserEvent } from '@/infrastructure/realtime/user-events.server';
import { normalizeValue } from '@/shared/utils';

export async function handleAccountCollectionsGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const resource = normalizeValue(searchParams.get('resource'));
    const slug = searchParams.get('slug');
    const listId = searchParams.get('listId');
    const limitCount = searchParams.get('limitCount');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const resolvedUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!resolvedUserId && resource !== 'list-by-slug') {
      return NextResponse.json({ data: null, items: [] });
    }

    const media = entityType && entityId ? { entityId, entityType } : null;
    const { getAccountResource, isAccountResource } = await import('./collections.server');
    if (!isAccountResource(resource)) {
      return NextResponse.json({ error: 'Unsupported account resource' }, { status: 400 });
    }

    const data = await getAccountResource({
      limitCount,
      listId,
      media,
      resource,
      slug,
      userId: resolvedUserId,
      viewerId,
    });

    return NextResponse.json({ data, items: Array.isArray(data) ? data : [] });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: String(error?.message || 'Collections could not be loaded') },
      { status },
    );
  }
}

export async function handleAccountActivityGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const pageSize = searchParams.get('pageSize');
    const scope = searchParams.get('scope');
    const sort = searchParams.get('sort');
    const subject = searchParams.get('subject');
    const resolvedUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!resolvedUserId) {
      return NextResponse.json({ hasMore: false, items: [], nextCursor: null, totalCount: 0 });
    }

    const payload = await fetchAccountActivityFeedServer({
      cursor,
      pageSize,
      scope,
      sort,
      subject,
      userId: resolvedUserId,
      viewerId,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: String(error?.message || 'Activity feed could not be loaded') },
      { status },
    );
  }
}

export async function handleAccountProfileGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const targetUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!targetUserId) {
      return NextResponse.json({ profile: null });
    }

    const profile = await getAccountProfileByUserId(targetUserId, { viewerId });
    return NextResponse.json({ profile: profile || null });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: String(error?.message || 'Profile could not be loaded') },
      { status },
    );
  }
}

export async function handleAccountProfilePost(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireSessionRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body.action);

    if (action === 'ensure') {
      const preferredDisplayName = normalizeValue(body.displayName);
      const preferredUsername = body.username ? validateUsername(body.username) : null;
      const avatarUrl = normalizeValue(body.avatarUrl);
      const email = normalizeValue(body.email);

      await ensurePasswordAccountRecord({
        avatarUrl: avatarUrl || null,
        displayName: preferredDisplayName || null,
        email: email || null,
        userId: authContext.userId,
        username: preferredUsername || null,
      });
      invalidateCachedAccountProfiles(authContext.userId);
      const profile = await getAccountProfileByUserId(authContext.userId, {
        viewerId: authContext.userId,
      });

      return NextResponse.json({ profile });
    }

    if (action === 'update') {
      const admin = createAdminClient();
      const updates = {};

      if (body.displayName !== undefined) updates.display_name = normalizeValue(body.displayName);
      if (body.username !== undefined) updates.username = validateUsername(body.username);
      if (body.avatarUrl !== undefined) updates.avatar_url = normalizeValue(body.avatarUrl) || null;
      if (body.bannerUrl !== undefined) updates.banner_url = normalizeValue(body.bannerUrl) || null;
      if (body.description !== undefined) updates.description = normalizeValue(body.description);
      if (body.isPrivate !== undefined) updates.is_private = Boolean(body.isPrivate);

      updates.updated_at = new Date().toISOString();

      const { error } = await admin
        .from('profiles')
        .update(updates)
        .eq('id', authContext.userId)
        .select('id')
        .single();
      if (error) throw new Error(error.message || 'Account update failed');

      invalidateCachedAccountProfiles(authContext.userId);
      const profile = await getAccountProfileByUserId(authContext.userId, {
        viewerId: authContext.userId,
      });
      await publishUserEvent(authContext.userId, 'account:updated', { profile });
      return NextResponse.json({ profile });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: String(error?.message || 'Account action failed') },
      { status },
    );
  }
}

export async function handleAccountResolveGet(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = normalizeValue(searchParams.get('username'));
    if (!username) return NextResponse.json({ userId: null });

    const userId = await getOrLoadCachedValue({
      cacheKey: `account-resolve|username=${username}`,
      enabled: true,
      ttlMs: 1500,
      loader: async () => {
        const payload = await invokeInternalEdgeFunction(ACCOUNT_READ_FUNCTION, {
          body: { resource: 'resolve', username },
        });
        return payload?.userId || null;
      },
    });

    return NextResponse.json({ userId: userId || null });
  } catch (error) {
    return NextResponse.json(
      { error: String(error?.message || 'Username could not be resolved') },
      { status: 500 },
    );
  }
}

export async function handleAccountReviewsGet(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);

    const cursor = searchParams.get('cursor');
    const requestedMode = normalizeValue(searchParams.get('mode'));
    const mode = requestedMode === 'liked' ? 'liked' : 'authored';
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20));
    const resolvedUserId = await resolveAccountRequestUserId({ searchParams });

    if (!resolvedUserId) {
      return NextResponse.json({ hasMore: false, items: [], nextCursor: null, totalCount: 0 });
    }

    const payload = await fetchProfileReviewFeedServer({
      cursor,
      mode,
      pageSize,
      userId: resolvedUserId,
      viewerId,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: String(error?.message || 'Reviews could not be loaded') },
      { status },
    );
  }
}

export async function handleAccountSearchGet(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = sanitizeAccountSearchTerm(searchParams.get('searchTerm'));
    const limitCount = Math.min(50, Math.max(1, Number(searchParams.get('limitCount')) || 10));

    if (!searchTerm) return NextResponse.json({ items: [] });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_private')
      .or(
        `username_lower.ilike.%${searchTerm.toLowerCase()}%,display_name_lower.ilike.%${searchTerm.toLowerCase()}%`,
      )
      .limit(limitCount);

    if (error) throw new Error(error.message || 'Search failed');

    const items = (data || []).map((row) => ({
      avatarUrl: row.avatar_url || null,
      displayName: row.display_name || 'Anonymous User',
      id: row.id,
      isPrivate: Boolean(row.is_private),
      username: row.username,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: String(error?.message || 'Account search failed') },
      { status: 500 },
    );
  }
}
