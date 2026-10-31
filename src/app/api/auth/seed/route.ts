import { NextResponse, type NextRequest } from "next/server";
import { isSeedLoginEnabled, signInSeedAccount } from "@/features/auth/server";
import { apiErrorResponse } from "@/infrastructure/http/api-error";
import {
  getClientIp,
  rateLimitResponse,
} from "@/infrastructure/security/rate-limiter";
import { assertSameOrigin } from "@/infrastructure/security/same-origin";

export async function POST(request: NextRequest) {
  if (!isSeedLoginEnabled()) return new NextResponse(null, { status: 404 });

  try {
    assertSameOrigin(request);
    const limited = await rateLimitResponse(
      `seed-login:${getClientIp(request)}`,
      20,
    );
    if (limited) return limited;

    const payload = await request.json().catch(() => ({}));
    const userId = await signInSeedAccount(payload?.email);
    return NextResponse.json({ userId });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
