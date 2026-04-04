import { NextResponse } from 'next/server';

import { invokeInternalEdgeFunction } from '@/core/services/shared/supabase-edge-internal.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = normalizeValue(searchParams.get('username'));
    const payload = await invokeInternalEdgeFunction('account-read', {
      body: {
        resource: 'resolve',
        username,
      },
    });
    const userId = payload?.userId || null;

    return NextResponse.json({
      userId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: String(error?.message || 'Username could not be resolved'),
      },
      { status: 500 }
    );
  }
}
