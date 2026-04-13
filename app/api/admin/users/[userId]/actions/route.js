import { NextResponse } from 'next/server';

import { assertCsrfRequest } from '@/core/auth/servers/security/csrf.server';
import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';
import { runAdminUserAction } from '@/core/services/admin/users.server';

function normalizeValue(value) {
  return String(value || '').trim();
}

export async function POST(request, { params }) {
  try {
    await assertAdminAccessForRequest(request, {
      source: 'admin-user-actions',
    });
    assertCsrfRequest(request);

    const resolvedParams = await params;
    const userId = normalizeValue(resolvedParams?.userId);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body?.action).toLowerCase();

    if (!userId) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'userId is required',
          partial: false,
          source: 'admin-user-actions',
        },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'action is required',
          partial: false,
          source: 'admin-user-actions',
        },
        { status: 400 }
      );
    }

    const result = await runAdminUserAction({
      action,
      input: body?.input && typeof body.input === 'object' ? body.input : {},
      userId,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-user-actions',
    });
    return NextResponse.json(payload, { status });
  }
}
