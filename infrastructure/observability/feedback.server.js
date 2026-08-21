import { NextResponse } from 'next/server';

import { readSessionFromRequest } from '@/domains/auth/server/session.js';
import { assertRateLimit } from '@/infrastructure/http/rate-limiter.server';
import { createAdminClient } from '@/infrastructure/supabase/admin-client.server';

export const runtime = 'nodejs';

const FEEDBACK_SCOPE = 'project';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizeOptionalValue(value, maxLength = 400) {
  const normalizedValue = normalizeValue(value);

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, maxLength);
}

function resolveStatusCode(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('rate limit')) return 429;
  if (message.includes('auth') || message.includes('session')) return 401;
  return error?.status || 500;
}

export async function POST(request) {
  try {
    const session = await readSessionFromRequest(request, { requireSession: false });
    assertRateLimit(request, {
      key: 'feedback-post',
      limit: 10,
      userId: session?.userId || null,
      windowSeconds: 60,
    });
    const body = await request.json().catch(() => ({}));
    const message = normalizeValue(body?.message);

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'message must be 2000 characters or fewer' },
        { status: 400 },
      );
    }

    const sessionContext = await readSessionFromRequest(request).catch(() => null);
    const userId = normalizeOptionalValue(sessionContext?.userId, 80);
    const safeUserId = userId && UUID_PATTERN.test(userId) ? userId : null;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('feedback_submissions')
      .insert({
        message,
        metadata: {
          referer: normalizeOptionalValue(request.headers.get('referer'), 1024),
          userAgent: normalizeOptionalValue(request.headers.get('user-agent'), 512),
        },
        page_description: normalizeOptionalValue(body?.pageDescription, 600),
        page_path: normalizeOptionalValue(body?.pagePath, 320),
        page_title: normalizeOptionalValue(body?.pageTitle, 160),
        scope: FEEDBACK_SCOPE,
        source: normalizeOptionalValue(body?.source, 80) || 'context-menu',
        status: 'new',
        user_email: normalizeOptionalValue(sessionContext?.email, 320),
        user_id: safeUserId,
      })
      .select('id, created_at')
      .single();

    if (error) {
      throw new Error(error.message || 'Feedback could not be stored');
    }

    return NextResponse.json({
      data: {
        createdAt: data?.created_at ?? null,
        id: data?.id ?? null,
      },
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: normalizeValue(error?.message || 'Feedback could not be submitted'),
      },
      {
        status: resolveStatusCode(error),
      },
    );
  }
}
