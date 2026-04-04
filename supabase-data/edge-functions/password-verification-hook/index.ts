import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { jsonResponse } from '../_shared/http.ts';
import { normalizeLower, parseBoolean, parseNumber } from '../_shared/normalize.ts';
import { callUpstash, isUpstashConfigured, sha256Hex } from '../_shared/upstash.ts';
import { readAndVerifyWebhook } from '../_shared/webhook.ts';

type PasswordVerificationHookEvent = {
  user_id?: string;
  valid?: boolean;
};

const HOOK_SECRET_ENV_NAMES = ['PASSWORD_VERIFICATION_HOOK_SECRET'];

function continueResponse(): Response {
  return jsonResponse(200, {
    decision: 'continue',
  });
}

function rejectResponse(message: string, shouldLogoutUser: boolean): Response {
  return jsonResponse(200, {
    decision: 'reject',
    message,
    should_logout_user: shouldLogoutUser,
  });
}

function runtimeErrorResponse(message: string): Response {
  return jsonResponse(
    503,
    {
      error: {
        http_code: 503,
        message,
      },
    },
    {
      'retry-after': 'true',
    }
  );
}

async function exceededFailureThreshold(event: PasswordVerificationHookEvent): Promise<boolean> {
  const maxAttempts = Math.max(0, parseNumber(Deno.env.get('PASSWORD_FAIL_MAX_ATTEMPTS'), 10));

  if (!maxAttempts || !isUpstashConfigured()) {
    return false;
  }

  const userId = normalizeLower(event.user_id);

  if (!userId) {
    return false;
  }

  const windowMs = Math.max(1_000, parseNumber(Deno.env.get('PASSWORD_FAIL_WINDOW_MS'), 900_000));
  const keyPrefix =
    normalizeLower(Deno.env.get('PASSWORD_FAIL_KEY_PREFIX')).replace(/[^a-z0-9:_-]/g, '') || 'tvz:password:hook:v1';

  const userHash = await sha256Hex(userId);
  const now = Date.now();
  const windowBucket = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${userHash}:${windowBucket}`;
  const ttlSeconds = Math.max(2, Math.ceil(windowMs / 1000) + 5);

  const count = Number(await callUpstash(['incr', key])) || 0;

  if (count <= 1) {
    await callUpstash(['expire', key, ttlSeconds]);
  }

  return count > maxAttempts;
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: { http_code: 405, message: 'Method not allowed' } });
  }

  const failOpen = parseBoolean(Deno.env.get('PASSWORD_HOOK_FAIL_OPEN'), true);

  try {
    const verification = await readAndVerifyWebhook<PasswordVerificationHookEvent>(request, HOOK_SECRET_ENV_NAMES);

    if (!verification.verified || !verification.event) {
      if (failOpen) {
        return continueResponse();
      }

      return runtimeErrorResponse(verification.error?.message || 'Webhook signature verification failed');
    }

    const event = verification.event;

    if (event.valid === true) {
      return continueResponse();
    }

    let shouldReject = false;

    try {
      shouldReject = await exceededFailureThreshold(event);
    } catch {
      if (!failOpen) {
        return runtimeErrorResponse('Password verification checks are unavailable');
      }
    }

    if (!shouldReject) {
      return continueResponse();
    }

    const rejectMessage =
      String(Deno.env.get('PASSWORD_REJECT_MESSAGE') || '').trim() ||
      'You have exceeded maximum number of password sign-in attempts.';
    const shouldLogoutUser = parseBoolean(Deno.env.get('PASSWORD_REJECT_SHOULD_LOGOUT_USER'), false);

    return rejectResponse(rejectMessage, shouldLogoutUser);
  } catch (error) {
    if (failOpen) {
      return continueResponse();
    }

    return runtimeErrorResponse(String((error as Error)?.message || 'Password verification hook failed'));
  }
});
