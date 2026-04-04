import { NextResponse } from 'next/server';

import { requireAuthenticatedRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';
import { publishUserEvent } from '@/core/services/realtime/user-events.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';
import { getFollowResource } from '@/core/services/browser/browser-data.server';

export const runtime = 'nodejs';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeErrorMessage(error, fallbackMessage) {
  return normalizeValue(error?.message || fallbackMessage);
}

function resolveWriteStatusCode(message) {
  const normalizedMessage = normalizeValue(message).toLowerCase();

  if (
    normalizedMessage.includes('authentication session is required') ||
    normalizedMessage.includes('invalid or expired authentication token') ||
    normalizedMessage.includes('authentication token has been revoked')
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('already been resolved') ||
    normalizedMessage.includes('cannot follow yourself') ||
    normalizedMessage.includes('invalid') ||
    normalizedMessage.includes('required') ||
    normalizedMessage.includes('unsupported')
  ) {
    return 400;
  }

  return 500;
}

function publishFollowChange({ followerId, followingId, reason, status = null }) {
  const payload = {
    followerId,
    followingId,
    reason,
    status,
  };

  publishUserEvent(followerId, 'follows', payload);
  publishUserEvent(followingId, 'follows', payload);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionContext = await readSessionFromRequest(request).catch(() => null);
    const resource = normalizeValue(searchParams.get('resource'));
    const userId = normalizeValue(searchParams.get('userId'));
    const targetId = normalizeValue(searchParams.get('targetId'));
    const status = normalizeValue(searchParams.get('status'));
    const data = await getFollowResource({
      resource,
      strict: true,
      userId,
      targetId,
      viewerId: sessionContext?.userId || null,
      status: status || null,
    });

    return NextResponse.json({ data });
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    return NextResponse.json(
      {
        error: String(error?.message || 'Follow resource could not be loaded'),
      },
      { status }
    );
  }
}

export async function POST(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (action !== 'follow') {
      return NextResponse.json({ error: 'Unsupported follow action' }, { status: 400 });
    }

    const followerId = authContext.userId;
    const followingId = normalizeValue(body?.followingId);

    if (!followingId) {
      return NextResponse.json({ error: 'followingId is required' }, { status: 400 });
    }

    if (followerId === followingId) {
      return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    const result = await invokeInternalEdgeFunction('follow-control', {
      body: {
        action: 'follow',
        actorUserId: followerId,
        targetUserId: followingId,
      },
    });

    publishFollowChange({
      followerId,
      followingId,
      reason: 'follow',
      status: normalizeValue(result?.status) || null,
    });

    return NextResponse.json({
      success: true,
      status: result?.status || null,
    });
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow action failed');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const requesterId = normalizeValue(body?.requesterId);
    const userId = authContext.userId;

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'Unsupported follow action' }, { status: 400 });
    }

    if (!requesterId) {
      return NextResponse.json({ error: 'requesterId is required' }, { status: 400 });
    }

    const result = await invokeInternalEdgeFunction('follow-control', {
      body: {
        action,
        actorUserId: userId,
        requesterId,
      },
    });

    publishFollowChange({
      followerId: requesterId,
      followingId: userId,
      reason: action,
      status: normalizeValue(result?.status) || null,
    });

    return NextResponse.json({
      success: true,
      status: result?.status || null,
    });
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow request could not be updated');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request) {
  try {
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);
    const userId = authContext.userId;

    if (action === 'unfollow' || action === 'cancel-request') {
      const followingId = normalizeValue(body?.followingId);

      if (!followingId) {
        return NextResponse.json({ error: 'followingId is required' }, { status: 400 });
      }

      await invokeInternalEdgeFunction('follow-control', {
        body: {
          action,
          actorUserId: userId,
          targetUserId: followingId,
        },
      });

      publishFollowChange({
        followerId: userId,
        followingId,
        reason: action,
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'remove-follower') {
      const followerId = normalizeValue(body?.followerId);

      if (!followerId) {
        return NextResponse.json({ error: 'followerId is required' }, { status: 400 });
      }

      await invokeInternalEdgeFunction('follow-control', {
        body: {
          action,
          actorUserId: userId,
          requesterId: followerId,
        },
      });

      publishFollowChange({
        followerId,
        followingId: userId,
        reason: action,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported follow action' }, { status: 400 });
  } catch (error) {
    const message = normalizeErrorMessage(error, 'Follow relationship could not be removed');
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : resolveWriteStatusCode(message);

    return NextResponse.json({ error: message }, { status });
  }
}
