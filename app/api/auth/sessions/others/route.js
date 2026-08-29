import { NextResponse } from 'next/server';

import { assertCsrfRequest } from '@/domains/auth/server/security.js';
import { requireProtectedSession, revokeRefreshTokens } from '@/domains/auth/server/session.js';
import { recordAuthMetric } from '@/domains/auth/server/security-surfaces.js';

export async function POST(request) {
  try {
    assertCsrfRequest(request);
    const session = await requireProtectedSession(request, { allowBearerFallback: false });

    if (!session.sessionJti) {
      throw new Error('Current session cannot be identified');
    }

    await revokeRefreshTokens(session.userId, {
      currentSessionJti: session.sessionJti,
      reason: 'user-session-revoke',
    });
    await recordAuthMetric({
      eventName: 'session-revoke',
      metadata: { scope: 'others' },
      userId: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 400;
    return NextResponse.json(
      {
        code: error?.code || null,
        error: error?.message || 'Other sessions could not be signed out',
      },
      { status },
    );
  }
}
