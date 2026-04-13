import { NextResponse } from 'next/server';

import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';
import { readAdminWindowHoursFromRequest } from '@/core/services/admin/query.server';
import { loadAdminSecurityPayload } from '@/core/services/admin/security.server';

export async function GET(request) {
  try {
    await assertAdminAccessForRequest(request, {
      source: 'admin-security',
    });

    const windowHours = readAdminWindowHoursFromRequest(request);
    const payload = await loadAdminSecurityPayload({ windowHours });
    const status = payload.status === 'error' ? 503 : 200;

    return NextResponse.json(payload, { status });
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-security',
    });
    return NextResponse.json(payload, { status });
  }
}
