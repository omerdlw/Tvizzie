import { NextResponse } from 'next/server';

import { assertCsrfRequest } from '@/domains/auth/server/security.js';
import { requireProtectedSession } from '@/domains/auth/server/session.js';
import { recordAuthMetric } from '@/domains/auth/server/security-surfaces.js';
import {
  sendNewDeviceNotification,
  sendPasskeyAddedNotification,
  sendProviderLinkedNotification,
} from '@/domains/auth/server/security-notifications.js';
import { normalizeValue } from '@/shared';

const ALLOWED_EVENTS = new Set([
  'new-device',
  'passkey-added',
  'passkey-removed',
  'passkey-sign-in',
  'provider-linked',
]);

export async function POST(request) {
  try {
    assertCsrfRequest(request);
    const session = await requireProtectedSession(request, { allowBearerFallback: false });
    const body = await request.json().catch(() => ({}));
    const event = normalizeValue(body?.event).toLowerCase();
    if (!ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: 'Unsupported security event' }, { status: 400 });
    }

    const provider = normalizeValue(body?.provider).slice(0, 64);
    const deviceLabel = normalizeValue(body?.deviceLabel).slice(0, 80) || 'this device';
    const notificationArgs = {
      deviceLabel,
      email: session.email,
      fingerprint: session.sessionJti || deviceLabel,
      provider,
      userId: session.userId,
    };

    let notificationSent = false;
    let notificationOutcome = 'success';
    try {
      if (event === 'new-device' || event === 'passkey-sign-in') {
        notificationSent = await sendNewDeviceNotification(notificationArgs);
      }
      if (event === 'passkey-added') {
        notificationSent = await sendPasskeyAddedNotification(notificationArgs);
      }
      if (event === 'provider-linked') {
        notificationSent = await sendProviderLinkedNotification(notificationArgs);
      }
    } catch {
      notificationOutcome = 'notification-failed';
    }

    await recordAuthMetric({
      eventName: event,
      metadata: { provider: provider || null },
      outcome: notificationOutcome,
      provider: provider || null,
      userId: session.userId,
    });

    return NextResponse.json({ notificationSent, success: true });
  } catch (error) {
    return NextResponse.json(
      { code: error?.code || null, error: error?.message || 'Security event failed' },
      { status: Number.isInteger(error?.status) ? error.status : 400 },
    );
  }
}
