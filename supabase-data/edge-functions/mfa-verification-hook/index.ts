import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { jsonResponse } from '../_shared/http.ts';
import { normalizeLower, parseBoolean, parseNumber } from '../_shared/normalize.ts';
import { callUpstash, isUpstashConfigured, sha256Hex } from '../_shared/upstash.ts';
import { readAndVerifyWebhook } from '../_shared/webhook.ts';

type MfaVerificationHookEvent = {
  factor_id?: string;
  factor_type?: string;
  user_id?: string;
  valid?: boolean;
};

const HOOK_SECRET_ENV_NAMES = ['MFA_VERIFICATION_HOOK_SECRET'];

function continueResponse(): Response {
  return jsonResponse(200, {
    decision: 'continue',
  });
}

function rejectResponse(message: string): Response {
  return jsonResponse(200, {
    decision: 'reject',
    message,
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

async function exceededFailureThreshold(event: MfaVerificationHookEvent): Promise<boolean> {
  const maxAttempts = Math.max(0, parseNumber(Deno.env.get('MFA_FAIL_MAX_ATTEMPTS'), 6));

  if (!maxAttempts || !isUpstashConfigured()) {
    return false;
  }

  const userId = normalizeLower(event.user_id);
  const factorId = normalizeLower(event.factor_id);

  if (!userId || !factorId) {
    return false;
  }

  const windowMs = Math.max(1_000, parseNumber(Deno.env.get('MFA_FAIL_WINDOW_MS'), 900_000));
  const keyPrefix =
    normalizeLower(Deno.env.get('MFA_FAIL_KEY_PREFIX')).replace(/[^a-z0-9:_-]/g, '') || 'tvz:mfa:hook:v1';

  const keyHash = await sha256Hex(`${userId}:${factorId}`);
  const now = Date.now();
  const windowBucket = Math.floor(now / windowMs) * windowMs;
  const key = `${keyPrefix}:${keyHash}:${windowBucket}`;
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

  const failOpen = parseBoolean(Deno.env.get('MFA_HOOK_FAIL_OPEN'), true);

  try {
    const verification = await readAndVerifyWebhook<MfaVerificationHookEvent>(request, HOOK_SECRET_ENV_NAMES);

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
        return runtimeErrorResponse('MFA verification checks are unavailable');
      }
    }

    if (!shouldReject) {
      return continueResponse();
    }

    const rejectMessage =
      String(Deno.env.get('MFA_REJECT_MESSAGE') || '').trim() || 'You have exceeded maximum number of MFA attempts.';

    return rejectResponse(rejectMessage);
  } catch (error) {
    if (failOpen) {
      return continueResponse();
    }

    return runtimeErrorResponse(String((error as Error)?.message || 'MFA verification hook failed'));
  }
});
