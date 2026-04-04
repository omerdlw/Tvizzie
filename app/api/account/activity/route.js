import { NextResponse } from 'next/server';

import { requireSessionRequest } from '@/core/auth/servers/session/authenticated-request.server';
import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

function normalizePageSize(value, fallback = 20) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.floor(parsed), 100));
}

export async function GET(request) {
  try {
    const authContext = await requireSessionRequest(request).catch(() => null);
    const { searchParams } = new URL(request.url);
    const result = await invokeInternalEdgeFunction('account-activity-feed', {
      body: {
        cursor: searchParams.get('cursor'),
        pageSize: normalizePageSize(searchParams.get('pageSize'), 20),
        scope: normalizeValue(searchParams.get('scope')) || 'user',
        userId: normalizeValue(searchParams.get('userId')),
        viewerId: authContext?.userId || null,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 500;

    return NextResponse.json(
      {
        error: String(error?.message || 'Activity could not be loaded'),
      },
      { status }
    );
  }
}
