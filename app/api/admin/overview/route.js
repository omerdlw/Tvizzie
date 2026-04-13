import { NextResponse } from 'next/server';

import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';
import { readAdminWindowHoursFromRequest } from '@/core/services/admin/query.server';
import { loadAdminOverviewPayload } from '@/core/services/admin/overview.server';

export async function GET(request) {
  try {
    await assertAdminAccessForRequest(request, {
      source: 'admin-overview',
    });

    const windowHours = readAdminWindowHoursFromRequest(request);
    const payload = await loadAdminOverviewPayload({ windowHours });
    const status = payload.status === 'error' ? 503 : 200;

    return NextResponse.json(payload, { status });
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-overview',
    });
    return NextResponse.json(payload, { status });
  }
}
