import { NextResponse } from 'next/server';

import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';
import { loadAdminUserDetailPayload } from '@/core/services/admin/users.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function GET(request, { params }) {
  try {
    await assertAdminAccessForRequest(request, {
      source: 'admin-user-detail',
    });

    const resolvedParams = await params;
    const userId = normalizeValue(resolvedParams?.userId);

    if (!userId) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'userId is required',
          partial: false,
          source: 'admin-user-detail',
        },
        { status: 400 }
      );
    }

    const payload = await loadAdminUserDetailPayload({ userId });
    const status = payload.status === 'error' ? 503 : 200;

    return NextResponse.json(payload, { status });
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-user-detail',
    });
    return NextResponse.json(payload, { status });
  }
}
