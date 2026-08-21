import { NextResponse } from 'next/server';

import {
  ensureAccountProfile,
  getAccountProfileByUserId,
  updateAccountProfile,
} from '@/domains/account/server/profile';
import { resolveAccountRequestUserId } from '@/domains/account/server/request-target';
import {
  requireSessionRequest,
  resolveOptionalSessionRequest,
} from '@/domains/auth/server/session.js';
import { getUserById } from '@/domains/auth/server/admin.js';
import { assertCsrfRequestForCookieSession } from '@/domains/auth/server/security.js';
import { CACHE_CONTROL, cacheControlHeaders } from '@/infrastructure/http/cache-policy.server';
import { normalizeValue } from '@/shared/normalize';

export async function GET(request) {
  try {
    const sessionContext = await resolveOptionalSessionRequest(request);
    const viewerId = sessionContext?.userId || null;
    const { searchParams } = new URL(request.url);
    const targetUserId = await resolveAccountRequestUserId({
      fallbackUserId: viewerId,
      searchParams,
    });

    if (!targetUserId) return NextResponse.json({ profile: null });

    const bypassCache = searchParams.get('fresh') === '1' || searchParams.get('noCache') === '1';
    let profile = await getAccountProfileByUserId(targetUserId, { viewerId, bypassCache });

    if (!profile && viewerId && targetUserId === viewerId) {
      const userEmail = sessionContext?.email || sessionContext?.user?.email || null;
      if (userEmail) {
        const authUser = await getUserById(viewerId).catch(() => null);
        if (authUser) {
          try {
            profile = await ensureAccountProfile({ email: userEmail, userId: viewerId });
          } catch (bootstrapError) {
            console.error(
              'Failed auto-bootstrapping profile in account profile GET:',
              bootstrapError,
            );
          }
        }
      }
    }

    const headers = viewerId
      ? cacheControlHeaders(CACHE_CONTROL.PRIVATE_USER_STATE)
      : cacheControlHeaders(CACHE_CONTROL.PUBLIC_ACCOUNT_RESOLVE);
    return NextResponse.json({ profile: profile || null }, { headers });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    if (status === 403) return NextResponse.json({ profile: null, private: true });

    console.error('Profile could not be loaded:', error);
    return NextResponse.json({ error: 'Profile could not be loaded' }, { status });
  }
}

export async function POST(request) {
  try {
    assertCsrfRequestForCookieSession(request);
    const authContext = await requireSessionRequest(request);
    const body = await request.json().catch(() => ({}));
    const action = normalizeValue(body.action);

    if (action === 'ensure') {
      const profile = await ensureAccountProfile({
        displayName: body.displayName,
        email: body.email,
        userId: authContext.userId,
        username: body.username,
      });
      return NextResponse.json({ profile });
    }

    if (action === 'update') {
      const profile = await updateAccountProfile({
        email: authContext.email,
        input: body,
        userId: authContext.userId,
      });
      return NextResponse.json({ profile });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    console.error('Account action failed:', error);
    return NextResponse.json({ error: 'Account action failed' }, { status });
  }
}
