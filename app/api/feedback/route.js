import { NextResponse } from 'next/server';

import { readSessionFromRequest } from '@/core/auth/servers/session/session.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

export const runtime = 'nodejs';

const VALID_SCOPES = new Set(['page', 'project']);

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
  if (Number.isFinite(Number(error?.status))) {
    return Number(error.status);
  }

  const message = normalizeValue(error?.message).toLowerCase();

  if (
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('unsupported') ||
    message.includes('fewer')
  ) {
    return 400;
  }

  if (message.includes('authentication')) {
    return 401;
  }

  return 500;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const scope = normalizeValue(body?.scope).toLowerCase();
    const message = normalizeValue(body?.message);

    if (!VALID_SCOPES.has(scope)) {
      return NextResponse.json({ error: 'scope must be page or project' }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'message must be 2000 characters or fewer' }, { status: 400 });
    }

    const sessionContext = await readSessionFromRequest(request).catch(() => null);
    const payload = await invokeInternalEdgeFunction('feedback-control', {
      body: {
        action: 'submit',
        message,
        metadata: {
          referer: normalizeOptionalValue(request.headers.get('referer'), 1024),
          userAgent: normalizeOptionalValue(request.headers.get('user-agent'), 512),
        },
        pageDescription: normalizeOptionalValue(body?.pageDescription, 600),
        pagePath: normalizeOptionalValue(body?.pagePath, 320),
        pageTitle: normalizeOptionalValue(body?.pageTitle, 160),
        scope,
        source: normalizeOptionalValue(body?.source, 80) || 'context-menu',
        userEmail: normalizeOptionalValue(sessionContext?.email, 320),
        userId: normalizeOptionalValue(sessionContext?.userId, 80),
      },
    });

    return NextResponse.json({
      data: payload?.data || null,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: normalizeValue(error?.message || 'Feedback could not be submitted'),
      },
      {
        status: resolveStatusCode(error),
      }
    );
  }
}
