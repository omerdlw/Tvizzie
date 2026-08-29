import { NextResponse } from 'next/server';

import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.js';
import { requireProtectedSession } from '@/domains/auth/server/session.js';
import { deleteActivityEvents, processActivityEvent } from '@/domains/social/server/activity';
import { normalizeValue } from '@/shared';

export const runtime = 'nodejs';

function resolveStatusCode(message) {
  if (
    message.includes('Authentication session is required') ||
    message.includes('Invalid or expired authentication token') ||
    message.includes('Authentication token has been revoked')
  ) {
    return 401;
  }

  return message.includes('invalid') || message.includes('unsupported') ? 400 : 500;
}

function createErrorResponse(error) {
  const message = normalizeValue(error?.message || 'Activity event failed');
  return NextResponse.json({ error: message }, { status: resolveStatusCode(message) });
}

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireProtectedSession(request);
    const body = await request.json().catch(() => ({}));
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    const result = await processActivityEvent({
      actorUserId: authContext.userId,
      eventType: normalizeValue(body?.eventType),
      payload,
    });

    return NextResponse.json({
      delivered: result?.delivered === true,
      reason: result?.reason || null,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}

export async function DELETE(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireProtectedSession(request);
    const body = await request.json().catch(() => ({}));
    const result = await deleteActivityEvents({
      action: normalizeValue(body?.action),
      actorUserId: authContext.userId,
      listId: normalizeValue(body?.listId),
      subjectId: normalizeValue(body?.subjectId),
      subjectType: normalizeValue(body?.subjectType),
    });

    return NextResponse.json({
      deleted: result?.deleted === true,
      reason: result?.reason || null,
    });
  } catch (error) {
    return createErrorResponse(error);
  }
}
