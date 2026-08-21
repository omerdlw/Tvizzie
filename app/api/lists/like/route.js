import { NextResponse } from 'next/server';

import { toggleListLike } from '@/domains/account/server/collections';
import { requireSessionRequest } from '@/domains/auth/server/session.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.js';

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const session = await requireSessionRequest(request);
    const body = await request.json().catch(() => ({}));
    const result = await toggleListLike({
      listId: body?.listId,
      ownerId: body?.ownerId,
      userId: session.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return NextResponse.json(
      { error: error?.message || 'List like state could not be updated' },
      { status },
    );
  }
}
