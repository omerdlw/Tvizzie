import { NextResponse } from 'next/server';

import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';

export async function GET(request) {
  try {
    const { accessContext } = await assertAdminAccessForRequest(request, {
      source: 'admin-access',
    });

    return NextResponse.json(
      {
        allowed: true,
        guard: accessContext,
        ok: true,
      },
      { status: 200 }
    );
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-access',
    });
    return NextResponse.json(payload, { status });
  }
}
