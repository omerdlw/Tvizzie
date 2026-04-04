import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { assertMethod, errorResponse, jsonResponse, mapErrorToStatus, readJsonBody } from '../_shared/http.ts';
import { assertInternalAccess } from '../_shared/internal.ts';
import { normalizeValue } from '../_shared/normalize.ts';
import { createAdminClient } from '../_shared/supabase.ts';

type FollowAction = 'follow' | 'accept' | 'reject' | 'unfollow' | 'cancel-request' | 'remove-follower';

type FollowControlRequest = {
  action?: FollowAction;
  actorUserId?: string;
  requesterId?: string;
  targetUserId?: string;
};

type ProfileRow = {
  avatar_url: string | null;
  display_name: string | null;
  id: string;
  is_private: boolean | null;
  username: string | null;
};

const FOLLOW_STATUS_PENDING = 'pending';
const FOLLOW_STATUS_ACCEPTED = 'accepted';
const FOLLOW_STATUS_REJECTED = 'rejected';

const NOTIFICATION_FOLLOW_REQUEST = 'FOLLOW_REQUEST';
const NOTIFICATION_FOLLOW_ACCEPTED = 'FOLLOW_ACCEPTED';
const NOTIFICATION_NEW_FOLLOWER = 'NEW_FOLLOWER';

const ACTIVITY_EVENT_FOLLOW_CREATED = 'FOLLOW_CREATED';

function normalizeAction(value: unknown): FollowAction {
  const action = normalizeValue(value).toLowerCase();

  if (
    action === 'follow' ||
    action === 'accept' ||
    action === 'reject' ||
    action === 'unfollow' ||
    action === 'cancel-request' ||
    action === 'remove-follower'
  ) {
    return action;
  }

  throw new Error('Invalid follow action');
}

async function getProfile(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const result = await admin
    .from('profiles')
    .select('avatar_url,display_name,id,is_private,username')
    .eq('id', userId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Profile could not be loaded');
  }

  return (result.data || null) as ProfileRow | null;
}

async function getExistingFollow(admin: ReturnType<typeof createAdminClient>, followerId: string, followingId: string) {
  const result = await admin
    .from('follows')
    .select('created_at,status')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message || 'Follow relationship could not be loaded');
  }

  return result.data || null;
}

async function saveFollowRelationship(
  admin: ReturnType<typeof createAdminClient>,
  {
    followerId,
    followerProfile,
    followingId,
    followingProfile,
    status,
    createdAt,
  }: {
    followerId: string;
    followerProfile: ProfileRow;
    followingId: string;
    followingProfile: ProfileRow;
    status: string;
    createdAt?: string | null;
  }
) {
  const nowIso = new Date().toISOString();
  const existing = await getExistingFollow(admin, followerId, followingId);
  const payload = {
    follower_avatar_url: followerProfile.avatar_url || null,
    follower_display_name: followerProfile.display_name || 'Anonymous User',
    follower_username: followerProfile.username || null,
    following_avatar_url: followingProfile.avatar_url || null,
    following_display_name: followingProfile.display_name || 'Anonymous User',
    following_username: followingProfile.username || null,
    responded_at: status === FOLLOW_STATUS_ACCEPTED || status === FOLLOW_STATUS_REJECTED ? nowIso : null,
    status,
    updated_at: nowIso,
  };

  const result = existing
    ? await admin
        .from('follows')
        .update({
          ...payload,
          created_at: normalizeValue(createdAt || existing.created_at) || nowIso,
        })
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
    : await admin.from('follows').insert({
        ...payload,
        created_at: nowIso,
        follower_id: followerId,
        following_id: followingId,
      });

  if (result.error) {
    throw new Error(result.error.message || 'Follow relationship could not be saved');
  }
}

async function deleteFollowRelationship(
  admin: ReturnType<typeof createAdminClient>,
  followerId: string,
  followingId: string
) {
  const result = await admin.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);

  if (result.error) {
    throw new Error(result.error.message || 'Follow relationship could not be deleted');
  }
}

function resolveActivitySubjectId(payload: Record<string, unknown>) {
  const subject =
    payload.subject && typeof payload.subject === 'object' ? (payload.subject as Record<string, unknown>) : {};
  const nestedPayload =
    payload.payload && typeof payload.payload === 'object' ? (payload.payload as Record<string, unknown>) : {};

  return normalizeValue(subject.id || nestedPayload.subjectId || nestedPayload.followingId);
}

async function deleteFollowActivityEntries(
  admin: ReturnType<typeof createAdminClient>,
  {
    followerId,
    followingId,
  }: {
    followerId: string;
    followingId: string;
  }
) {
  const result = await admin
    .from('activity')
    .select('id,payload')
    .eq('user_id', followerId)
    .eq('event_type', ACTIVITY_EVENT_FOLLOW_CREATED)
    .order('created_at', { ascending: false })
    .limit(50);

  if (result.error) {
    throw new Error(result.error.message || 'Follow activity could not be loaded');
  }

  const activityIds = (result.data || [])
    .filter((row) => {
      const payload = row.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : {};

      return resolveActivitySubjectId(payload) === followingId;
    })
    .map((row) => row.id)
    .filter(Boolean);

  if (activityIds.length === 0) {
    return;
  }

  const deleteResult = await admin.from('activity').delete().in('id', activityIds);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message || 'Follow activity could not be deleted');
  }
}

async function createAcceptedFollowActivity(
  admin: ReturnType<typeof createAdminClient>,
  {
    actorUserId,
    actorProfile,
    subjectUserId,
    subjectProfile,
  }: {
    actorUserId: string;
    actorProfile: ProfileRow;
    subjectUserId: string;
    subjectProfile: ProfileRow;
  }
) {
  const nowIso = new Date().toISOString();
  const dedupeKey = `follow-created:${subjectUserId}:accepted`;
  const payload = {
    actor: {
      avatarUrl: actorProfile.avatar_url || null,
      displayName: actorProfile.display_name || 'Someone',
      id: actorUserId,
      username: actorProfile.username || null,
    },
    eventType: ACTIVITY_EVENT_FOLLOW_CREATED,
    payload: {
      dedupeKey,
      status: FOLLOW_STATUS_ACCEPTED,
      subjectDisplayName: subjectProfile.display_name || subjectProfile.username || 'Account',
      subjectId: subjectUserId,
      subjectType: 'user',
      subjectUsername: subjectProfile.username || null,
    },
    subject: {
      href: subjectProfile.username ? `/account/${subjectProfile.username}` : null,
      id: subjectUserId,
      ownerId: null,
      ownerUsername: subjectProfile.username || null,
      poster: null,
      slug: null,
      title: subjectProfile.display_name || subjectProfile.username || 'Account',
      type: 'user',
    },
    visibility: actorProfile.is_private === true ? 'followers' : 'public',
  };

  const existing = await admin
    .from('activity')
    .select('id')
    .eq('user_id', actorUserId)
    .eq('dedupe_key', dedupeKey)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message || 'Activity could not be loaded');
  }

  const result = existing.data
    ? await admin
        .from('activity')
        .update({
          dedupe_key: dedupeKey,
          event_type: ACTIVITY_EVENT_FOLLOW_CREATED,
          payload,
          updated_at: nowIso,
        })
        .eq('id', existing.data.id)
    : await admin.from('activity').insert({
        created_at: nowIso,
        dedupe_key: dedupeKey,
        event_type: ACTIVITY_EVENT_FOLLOW_CREATED,
        payload,
        updated_at: nowIso,
        user_id: actorUserId,
      });

  if (result.error) {
    throw new Error(result.error.message || 'Activity could not be saved');
  }

  await admin
    .from('profiles')
    .update({
      last_activity_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', actorUserId);
}

async function createFollowNotification(
  admin: ReturnType<typeof createAdminClient>,
  {
    actorUserId,
    actorProfile,
    recipientUserId,
    eventType,
    href,
    metadata,
  }: {
    actorUserId: string;
    actorProfile: ProfileRow;
    recipientUserId: string;
    eventType: string;
    href: string | null;
    metadata: Record<string, unknown>;
  }
) {
  if (!recipientUserId || recipientUserId === actorUserId) {
    return;
  }

  const nowIso = new Date().toISOString();
  const actor = {
    avatarUrl: actorProfile.avatar_url || null,
    displayName: actorProfile.display_name || 'Someone',
    id: actorUserId,
    username: actorProfile.username || null,
  };

  const result = await admin.from('notifications').insert({
    actor_user_id: actorUserId,
    body: '',
    created_at: nowIso,
    event_type: eventType,
    href,
    metadata: {
      actor,
      payload: metadata,
    },
    read: false,
    title: `${actor.displayName} sent an update`,
    updated_at: nowIso,
    user_id: recipientUserId,
  });

  if (result.error) {
    throw new Error(result.error.message || 'Notification could not be created');
  }
}

async function runFollow(
  admin: ReturnType<typeof createAdminClient>,
  {
    actorUserId,
    targetUserId,
  }: {
    actorUserId: string;
    targetUserId: string;
  }
) {
  if (!targetUserId) {
    throw new Error('targetUserId is required');
  }

  if (actorUserId === targetUserId) {
    throw new Error('You cannot follow yourself');
  }

  const [actorProfile, targetProfile] = await Promise.all([
    getProfile(admin, actorUserId),
    getProfile(admin, targetUserId),
  ]);

  if (!actorProfile || !targetProfile) {
    throw new Error('Account not found');
  }

  const status = targetProfile.is_private === true ? FOLLOW_STATUS_PENDING : FOLLOW_STATUS_ACCEPTED;

  await saveFollowRelationship(admin, {
    followerId: actorUserId,
    followerProfile: actorProfile,
    followingId: targetUserId,
    followingProfile: targetProfile,
    status,
  });

  await createFollowNotification(admin, {
    actorProfile,
    actorUserId,
    eventType: status === FOLLOW_STATUS_PENDING ? NOTIFICATION_FOLLOW_REQUEST : NOTIFICATION_NEW_FOLLOWER,
    href: actorProfile.username ? `/account/${actorProfile.username}` : null,
    metadata: {
      followerId: actorUserId,
      followingId: targetUserId,
      status,
    },
    recipientUserId: targetUserId,
  });

  if (status === FOLLOW_STATUS_ACCEPTED) {
    await createAcceptedFollowActivity(admin, {
      actorProfile,
      actorUserId,
      subjectProfile: targetProfile,
      subjectUserId: targetUserId,
    });
  } else {
    await deleteFollowActivityEntries(admin, {
      followerId: actorUserId,
      followingId: targetUserId,
    });
  }

  return {
    ok: true,
    status,
  };
}

async function runResolveRequest(
  admin: ReturnType<typeof createAdminClient>,
  {
    action,
    actorUserId,
    requesterId,
  }: {
    action: 'accept' | 'reject';
    actorUserId: string;
    requesterId: string;
  }
) {
  const existing = await getExistingFollow(admin, requesterId, actorUserId);

  if (!existing || normalizeValue(existing.status).toLowerCase() !== FOLLOW_STATUS_PENDING) {
    throw new Error('Follow request has already been resolved');
  }

  const [requesterProfile, ownerProfile] = await Promise.all([
    getProfile(admin, requesterId),
    getProfile(admin, actorUserId),
  ]);

  if (!requesterProfile || !ownerProfile) {
    throw new Error('Account not found');
  }

  const status = action === 'accept' ? FOLLOW_STATUS_ACCEPTED : FOLLOW_STATUS_REJECTED;

  await saveFollowRelationship(admin, {
    createdAt: normalizeValue(existing.created_at) || null,
    followerId: requesterId,
    followerProfile: requesterProfile,
    followingId: actorUserId,
    followingProfile: ownerProfile,
    status,
  });

  await deleteFollowActivityEntries(admin, {
    followerId: requesterId,
    followingId: actorUserId,
  });

  if (status === FOLLOW_STATUS_ACCEPTED) {
    await createAcceptedFollowActivity(admin, {
      actorProfile: requesterProfile,
      actorUserId: requesterId,
      subjectProfile: ownerProfile,
      subjectUserId: actorUserId,
    });

    await createFollowNotification(admin, {
      actorProfile: ownerProfile,
      actorUserId,
      eventType: NOTIFICATION_FOLLOW_ACCEPTED,
      href: ownerProfile.username ? `/account/${ownerProfile.username}` : null,
      metadata: {
        acceptorId: actorUserId,
        requesterId,
      },
      recipientUserId: requesterId,
    });
  }

  return {
    ok: true,
    status,
  };
}

async function runDeleteFollow(
  admin: ReturnType<typeof createAdminClient>,
  {
    action,
    actorUserId,
    requesterId,
    targetUserId,
  }: {
    action: 'unfollow' | 'cancel-request' | 'remove-follower';
    actorUserId: string;
    requesterId: string | null;
    targetUserId: string | null;
  }
) {
  if (action === 'remove-follower') {
    const followerId = normalizeValue(requesterId);

    if (!followerId) {
      throw new Error('requesterId is required');
    }

    await deleteFollowRelationship(admin, followerId, actorUserId);

    return {
      ok: true,
      status: 'removed',
    };
  }

  const followingId = normalizeValue(targetUserId);

  if (!followingId) {
    throw new Error('targetUserId is required');
  }

  await deleteFollowRelationship(admin, actorUserId, followingId);

  if (action === 'cancel-request') {
    await deleteFollowActivityEntries(admin, {
      followerId: actorUserId,
      followingId,
    });
  }

  return {
    ok: true,
    status: 'removed',
  };
}

Deno.serve(async (request: Request) => {
  try {
    assertMethod(request, ['POST']);
    assertInternalAccess(request);

    const payload = await readJsonBody<FollowControlRequest>(request);
    const action = normalizeAction(payload.action);
    const actorUserId = normalizeValue(payload.actorUserId);

    if (!actorUserId) {
      throw new Error('actorUserId is required');
    }

    const admin = createAdminClient();

    const result =
      action === 'follow'
        ? await runFollow(admin, {
            actorUserId,
            targetUserId: normalizeValue(payload.targetUserId),
          })
        : action === 'accept' || action === 'reject'
          ? await runResolveRequest(admin, {
              action,
              actorUserId,
              requesterId: normalizeValue(payload.requesterId),
            })
          : await runDeleteFollow(admin, {
              action,
              actorUserId,
              requesterId: normalizeValue(payload.requesterId) || null,
              targetUserId: normalizeValue(payload.targetUserId) || null,
            });

    return jsonResponse(200, result);
  } catch (error) {
    const status = mapErrorToStatus(error);
    const message = normalizeValue((error as Error)?.message) || 'follow-control failed';

    if (status === 405) {
      return errorResponse(405, 'Method not allowed');
    }

    return errorResponse(status, message);
  }
});
