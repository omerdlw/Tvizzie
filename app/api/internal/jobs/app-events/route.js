import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

import { drainAppEventQueue } from '@/core/services/jobs/app-event-queue.server';

export const runtime = 'nodejs';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeLimit(value, fallback = 25) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(50, Math.max(1, Math.floor(parsed)));
}

function assertInternalToken(request) {
  const expectedToken = normalizeValue(process.env.INFRA_INTERNAL_TOKEN);
  const providedToken = normalizeValue(request.headers.get('x-infra-internal-token'));

  if (
    !expectedToken ||
    !providedToken ||
    expectedToken.length !== providedToken.length ||
    !timingSafeEqual(Buffer.from(providedToken), Buffer.from(expectedToken))
  ) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
}

export async function POST(request) {
  try {
    assertInternalToken(request);

    const body = await request.json().catch(() => ({}));
    const result = await drainAppEventQueue({
      limit: normalizeLimit(body?.limit, 25),
      visibilityTimeoutSeconds: normalizeLimit(body?.visibilityTimeoutSeconds, 60),
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const status = Number(error?.status);

    return NextResponse.json(
      {
        error: normalizeValue(error?.message) || 'App event worker failed',
      },
      {
        status: Number.isFinite(status) && status >= 400 ? status : 500,
      }
    );
  }
}
