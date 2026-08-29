'use server';

import { headers } from 'next/headers';

import { writeAuthAuditLog } from '../audit-log';
import { requireProtectedSession } from '../session';

export async function logAuditServer({ event, metadata } = {}) {
  try {
    const requestHeaders = await headers();
    const request = new Request('https://tvizzie.local/api/auth/audit', {
      headers: new Headers(requestHeaders),
    });
    const session = await requireProtectedSession(request, { allowBearerFallback: false });

    await writeAuthAuditLog({
      email: session.email,
      eventType: event,
      metadata,
      request,
      sessionJti: session.sessionJti,
      userId: session.userId,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'Audit logging failed' };
  }
}
