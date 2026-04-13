import { NextResponse } from 'next/server';

import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { loadAdminDatabasePayload } from '@/core/services/admin/database.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';
import { readAdminWindowHoursFromRequest } from '@/core/services/admin/query.server';

export async function GET(request) {
  try {
    await assertAdminAccessForRequest(request, {
      source: 'admin-database',
    });

    const windowHours = readAdminWindowHoursFromRequest(request);
    const payload = await loadAdminDatabasePayload({ windowHours });
    const status = payload.status === 'error' ? 503 : 200;

    return NextResponse.json(payload, { status });
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-database',
    });
    return NextResponse.json(payload, { status });
  }
}
