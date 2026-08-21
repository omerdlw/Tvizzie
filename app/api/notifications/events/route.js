import { NextResponse } from 'next/server';

import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.js';
import { requireAuthenticatedRequest } from '@/domains/auth/server/session.js';
import { processNotificationEvent } from '@/domains/social/server/notifications';
import { normalizeValue } from '@/shared/normalize';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireAuthenticatedRequest(request);
    const body = await request.json().catch(() => ({}));
    const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    const result = await processNotificationEvent({
      actorUserId: authContext.userId,
      eventType: normalizeValue(body?.eventType),
      payload,
    });

    return NextResponse.json({
      delivered: result?.delivered === true,
      reason: result?.reason || null,
    });
  } catch (error) {
    const message = normalizeValue(error?.message || 'Notification event failed');
    const status = message.includes('Authentication')
      ? 401
      : message.includes('invalid')
        ? 400
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
