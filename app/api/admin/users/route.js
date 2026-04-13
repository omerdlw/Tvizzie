import { NextResponse } from 'next/server';

import { assertAdminAccessForRequest } from '@/core/services/admin/access.server';
import { createAdminRouteErrorResponse } from '@/core/services/admin/http.server';
import { loadAdminUsersPayload, readAdminUsersQueryFromRequest } from '@/core/services/admin/users.server';

export async function GET(request) {
  try {
    await assertAdminAccessForRequest(request, {
      source: 'admin-users',
    });

    const query = readAdminUsersQueryFromRequest(request);
    const payload = await loadAdminUsersPayload(query);
    const status = payload.status === 'error' ? 503 : 200;

    return NextResponse.json(payload, { status });
  } catch (error) {
    const { payload, status } = createAdminRouteErrorResponse(error, {
      source: 'admin-users',
    });
    return NextResponse.json(payload, { status });
  }
}
