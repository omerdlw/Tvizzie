import { NextResponse } from 'next/server';

import { assertCsrfRequest } from '@/domains/auth/server/security.js';
import { requireProtectedSession } from '@/domains/auth/server/session.js';
import {
  recordAuthMetric,
  requireHighRiskAal2,
  revokeAuthSession,
} from '@/domains/auth/server/security-surfaces.js';
import { writeAuthAuditLog } from '@/domains/auth/server/audit-log.js';
import { normalizeValue } from '@/shared';

export async function POST(request) {
  try {
    assertCsrfRequest(request);
    const session = await requireProtectedSession(request, { allowBearerFallback: false });
    await requireHighRiskAal2(session);
    const body = await request.json().catch(() => ({}));
    const sessionId = normalizeValue(body?.sessionId);

    const revoked = await revokeAuthSession({
      currentSessionId: session.sessionJti,
      reason: 'user-session-revoke',
      sessionId,
      userId: session.userId,
    });
    if (!revoked) throw new Error('Session was not found or is already revoked');

    await Promise.allSettled([
      recordAuthMetric({
        eventName: 'session-revoke',
        metadata: { scope: 'single' },
        userId: session.userId,
      }),
      writeAuthAuditLog({
        eventType: 'session-revoke',
        metadata: { scope: 'single' },
        request,
        userId: session.userId,
      }),
    ]);

    return NextResponse.json({ revoked: true, sessionId });
  } catch (error) {
    return NextResponse.json(
      { code: error?.code || null, error: error?.message || 'Session could not be revoked' },
      { status: Number.isInteger(error?.status) ? error.status : 400 },
    );
  }
}
