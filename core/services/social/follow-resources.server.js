import 'server-only';

import { createAdminClient } from '@/core/clients/supabase/admin';
import {
  canViewerAccessUserContent,
  createPrivateProfileError,
  getAccountProfileByUserId,
} from '@/core/services/account/account-profile.server';
import { normalizeTimestamp } from '@/core/utils';

const FOLLOW_SELECT = [
  'created_at',
  'follower_avatar_url',
  'follower_display_name',
  'follower_id',
  'follower_username',
  'following_avatar_url',
  'following_display_name',
  'following_id',
  'following_username',
  'responded_at',
  'status',
  'updated_at',
].join(',');

const FOLLOW_STATUSES = Object.freeze({
  ACCEPTED: 'accepted',
  PENDING: 'pending',
  REJECTED: 'rejected',
});

function normalizeValue(value) {
  return String(value || '').trim();
}

function assertResult(result, fallbackMessage) {
  if (result?.error) {
    const error = result.error;
    const message = String(error?.message || '').toLowerCase();

    if (message.includes('fetch failed') || message.includes('socket') || message.includes('connection')) {
      console.error(`[Supabase Connection Error] ${fallbackMessage}:`, error);
      return { data: null, error };
    }

    throw new Error(error.message || fallbackMessage);
  }

  return result;
}

async function withQueryTimeout(
  promise,
  { timeoutMs = 4000, fallbackValue = { data: [], error: null }, label = 'Query' } = {}
) {
  const timeoutPromise = new Promise((resolve) =>
    setTimeout(() => resolve({ ...fallbackValue, timedOut: true, label }), timeoutMs)
  );

  const result = await Promise.race([promise, timeoutPromise]);

  if (result?.timedOut) {
    console.warn(`[Supabase ${label} Timeout] After ${timeoutMs}ms. Returning fallback.`);
    return result;
  }

  return result;
}

async function executeCollectionQuery(
  query,
  { fallbackValue = { data: [], error: null }, label = 'Collection query', strict = false, timeoutMs = 4000 } = {}
) {
  if (strict) {
    return query;
  }

  return withQueryTimeout(query, {
    fallbackValue,
    label,
    timeoutMs,
  });
}

function normalizeFollowRecord(normalizeTimestamp, record = {}, direction = 'followers') {
  const isFollowersDirection = direction === 'followers';
  const userId = isFollowersDirection ? record.follower_id : record.following_id;

  return {
    avatarUrl: isFollowersDirection ? record.follower_avatar_url || null : record.following_avatar_url || null,
    createdAt: normalizeTimestamp(record.created_at),
    displayName: isFollowersDirection ? record.follower_display_name || null : record.following_display_name || null,
    id: userId,
    respondedAt: normalizeTimestamp(record.responded_at),
    status: record.status || FOLLOW_STATUSES.ACCEPTED,
    updatedAt: normalizeTimestamp(record.updated_at),
    userId,
    username: isFollowersDirection ? record.follower_username || null : record.following_username || null,
  };
}

function sortFollowSnapshots(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right?.createdAt ? new Date(right.createdAt).getTime() : 0;

    return rightTime - leftTime;
  });
}

function createEmptyRelationshipState() {
  return {
    canViewPrivateContent: false,
    inboundRelationship: null,
    isInboundRelationshipLoaded: false,
    isOutboundRelationshipLoaded: false,
    inboundStatus: null,
    isPrivateProfile: false,
    isTargetProfileLoaded: false,
    outboundRelationship: null,
    outboundStatus: null,
    showFollowBack: false,
  };
}

async function getFollowResourceInternal({
  admin,
  assertResult,
  canViewerAccessUserContent,
  createPrivateProfileError,
  executeCollectionQuery,
  getAccountProfileByUserId,
  normalizeTimestamp,
  normalizeValue,
  resource,
  status = null,
  strict = false,
  targetId = null,
  userId,
  viewerId = null,
}) {
  if (resource === 'followers' || resource === 'following') {
    const normalizedStatus = normalizeValue(status).toLowerCase() || null;
    const canAccessCollection = await canViewerAccessUserContent({
      ownerId: userId,
      viewerId,
    });

    if (!canAccessCollection) {
      throw createPrivateProfileError();
    }

    if (
      normalizedStatus &&
      normalizedStatus !== FOLLOW_STATUSES.ACCEPTED &&
      normalizeValue(viewerId) !== normalizeValue(userId)
    ) {
      const error = new Error('You are not allowed to view this follow collection');
      error.status = 403;
      throw error;
    }

    const direction = resource;
    const baseColumn = direction === 'followers' ? 'following_id' : 'follower_id';
    let query = admin.from('follows').select(FOLLOW_SELECT).eq(baseColumn, userId);

    if (normalizedStatus) {
      query = query.eq('status', normalizedStatus);
    }

    const result = await executeCollectionQuery(query.order('created_at', { ascending: false }), {
      label: `${direction} for user ${userId}`,
      fallbackValue: { data: [], error: null },
      strict,
    });

    if (result?.timedOut) {
      return [];
    }

    assertResult(result, 'Follow collection could not be loaded');

    return sortFollowSnapshots((result.data || []).map((row) => normalizeFollowRecord(normalizeTimestamp, row, direction)));
  }

  if (resource === 'relationship') {
    if (!targetId) {
      return createEmptyRelationshipState();
    }

    const targetProfile = await getAccountProfileByUserId(targetId);
    const runRelationshipQuery = (queryPromise, label) =>
      executeCollectionQuery(queryPromise, {
        fallbackValue: { data: null, error: null },
        label,
        strict,
        timeoutMs: 2500,
      });
    const [outboundResult, inboundResult] = await Promise.all([
      viewerId && viewerId !== targetId
        ? runRelationshipQuery(
            admin
              .from('follows')
              .select(FOLLOW_SELECT)
              .eq('follower_id', viewerId)
              .eq('following_id', targetId)
              .maybeSingle(),
            `Outbound follow check ${viewerId} -> ${targetId}`
          )
        : Promise.resolve({ data: null, error: null }),
      viewerId && viewerId !== targetId
        ? runRelationshipQuery(
            admin
              .from('follows')
              .select(FOLLOW_SELECT)
              .eq('follower_id', targetId)
              .eq('following_id', viewerId)
              .maybeSingle(),
            `Inbound follow check ${targetId} -> ${viewerId}`
          )
        : Promise.resolve({ data: null, error: null }),
    ]);

    assertResult(outboundResult, 'Outbound relationship could not be loaded');
    assertResult(inboundResult, 'Inbound relationship could not be loaded');

    const outboundRelationship = outboundResult.data
      ? normalizeFollowRecord(normalizeTimestamp, outboundResult.data, 'following')
      : null;
    const inboundRelationship = inboundResult.data
      ? normalizeFollowRecord(normalizeTimestamp, inboundResult.data, 'followers')
      : null;
    const outboundStatus = outboundRelationship?.status || null;
    const inboundStatus = inboundRelationship?.status || null;
    const isPrivateProfile = !!targetProfile?.isPrivate;
    const canViewPrivateContent =
      !isPrivateProfile || viewerId === targetId || outboundStatus === FOLLOW_STATUSES.ACCEPTED;

    return {
      canViewPrivateContent,
      inboundRelationship,
      isInboundRelationshipLoaded: true,
      isOutboundRelationshipLoaded: true,
      inboundStatus,
      isPrivateProfile,
      isTargetProfileLoaded: true,
      outboundRelationship,
      outboundStatus,
      showFollowBack: inboundStatus === FOLLOW_STATUSES.ACCEPTED && outboundStatus !== FOLLOW_STATUSES.ACCEPTED,
    };
  }

  throw new Error('Unsupported follow resource');
}

export async function getFollowResource({
  resource,
  userId,
  targetId = null,
  viewerId = null,
  status = null,
  strict = false,
}) {
  const admin = createAdminClient();

  return getFollowResourceInternal({
    admin,
    assertResult,
    canViewerAccessUserContent,
    createPrivateProfileError,
    executeCollectionQuery,
    getAccountProfileByUserId,
    normalizeTimestamp,
    normalizeValue,
    resource,
    status,
    strict,
    targetId,
    userId,
    viewerId,
  });
}
