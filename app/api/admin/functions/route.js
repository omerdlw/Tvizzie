import { NextResponse } from 'next/server';

import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { loadAdminFunctionsPayload } from '@/core/services/admin/functions.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';
import { readAdminWindowHoursFromRequest } from '@/core/services/admin/query.server';

export async function GET(request) {
  try {
    await assertAdminAccessForRequest(request, {
      source: 'admin-functions',
    });

    const windowHours = readAdminWindowHoursFromRequest(request);
    const payload = await loadAdminFunctionsPayload({ windowHours });
    const status = payload.status === 'error' ? 503 : 200;

    return NextResponse.json(payload, { status });
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-functions',
    });
    return NextResponse.json(payload, { status });
  }
}
