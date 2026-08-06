import 'server-only';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/infrastructure/supabase/admin';
import { requireSessionRequest } from '@/domains/auth/server/session.server.js';
import { executeReviewWriteAction } from './reviews-write-actions';
import { normalizeValue } from './reviews-write-shared';

export async function handleReviewsWritePost(request) {
  try {
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
      userId: session.userId,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json({ error: error?.message || 'Review write failed' }, { status });
  }
}
