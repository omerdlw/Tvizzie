import { NextResponse } from 'next/server';

import {
  createAuthenticatedSupabaseClient,
  requireProtectedSession,
} from '@/domains/auth/server/session.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.js';
import { executeReviewWriteAction, resolveWriteStatusCode } from '@/domains/reviews/server/actions';
import { assertRateLimit } from '@/infrastructure/http/server';
import { createAdminClient } from '@/infrastructure/supabase/server';
import { normalizeValue } from '@/shared';

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireProtectedSession(request);
    assertRateLimit(request, {
      key: 'reviews-write',
      limit: 30,
      userId: session.userId,
      windowSeconds: 60,
    });
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const result = await executeReviewWriteAction({
      action,
      admin: createAdminClient(),
      body,
      userClient: createAuthenticatedSupabaseClient(session.accessToken),
      userId: session.userId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const status = Number.isInteger(error?.status)
      ? error.status
      : resolveWriteStatusCode(error?.message);
    return NextResponse.json({ error: error?.message || 'Review write failed' }, { status });
  }
}
