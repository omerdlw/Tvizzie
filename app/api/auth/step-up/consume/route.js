import { NextResponse } from 'next/server';

import { PURPOSES, SECURE_PURPOSES } from '@/domains/auth/utils/constants';
import {
  assertCsrfRequest,
  clearStepUpCookie,
  consumeStepUp,
} from '@/domains/auth/server/security.js';
import { requireProtectedSession } from '@/domains/auth/server/session.js';
import { normalizeValue } from '@/shared';

export async function POST(request) {
  try {
    assertCsrfRequest(request);
    const body = await request.json().catch(() => ({}));
    const purpose = normalizeValue(body?.purpose).toLowerCase();

    if (!SECURE_PURPOSES.has(purpose) || !Object.values(PURPOSES).includes(purpose)) {
      return NextResponse.json({ error: 'Invalid step-up purpose' }, { status: 400 });
    }

    const session = await requireProtectedSession(request, { allowBearerFallback: false });
    await consumeStepUp(request, {
      email: session.email,
      purpose,
      userId: session.userId,
    });

    const response = NextResponse.json({ success: true });
    clearStepUpCookie(response);
    return response;
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 400;
    return NextResponse.json(
      { code: error?.code || null, error: error?.message || 'Step-up verification failed' },
      { status },
    );
  }
}
