import { NextResponse, type NextRequest } from "next/server";

import {
  isSeedLoginEnabled,
  signInSeedAccount,
} from "@/features/auth/server/seed-login";
import { apiErrorResponse } from "@/infrastructure/http/api-error";
import {
  checkRateLimitAsync,
  createRateLimitExceededResponse,
  getClientIp,
} from "@/infrastructure/security/rate-limiter";
import { assertSameOrigin } from "@/infrastructure/security/url-safety";

export async function POST(request: NextRequest) {
  if (!isSeedLoginEnabled()) return new NextResponse(null, { status: 404 });

  try {
    assertSameOrigin(request);
    const limit = await checkRateLimitAsync(
      `seed-login:${getClientIp(request)}`,
      { limit: 20, windowMs: 60 * 1000 },
    );
    if (!limit.success) return createRateLimitExceededResponse(limit);

    const payload = await request.json().catch(() => ({}));
    const userId = await signInSeedAccount(payload?.email);
    return NextResponse.json({ userId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
