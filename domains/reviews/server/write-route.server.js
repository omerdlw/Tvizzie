import 'server-only';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import {
  createAuthenticatedSupabaseClient,
  requireSessionRequest,
} from '@/domains/auth/server/session.server.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.server.js';
import { executeReviewWriteAction } from './write-actions.server.js';
import { normalizeValue, resolveWriteStatusCode } from './write-input.server.js';

export async function handleReviewsWritePost(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireSessionRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action);

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await executeReviewWriteAction({
      action,
      admin,
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
